// ====================================================================
// PV-MODULE.JS  v3  —  PV Lifetime: UI + bridge to MoistureEngine v3
// ====================================================================
(function () {

// ---- Edge seal presets (D mm²/year; engine gets /8766 = mm²/h) ----
const PV_EDGES = {
  pibd: { name:'PIB + desiccant',            d:6,   Q:5,    gSeal:2e-8 },
  pib:  { name:'PIB (no desiccant)',         d:15,  Q:0.01, gSeal:2e-8 },
  none: { name:'Common encapsulant at edge', d:120, Q:0,    gSeal:1e-7 }
};

const PV_CITIES = [
  ['New York, US',40.71,-74.01],['Los Angeles, US',34.05,-118.24],
  ['Phoenix, US',33.45,-112.07],['Miami, US',25.76,-80.19],
  ['Toronto, CA',43.65,-79.38],['Mexico City, MX',19.43,-99.13],
  ['São Paulo, BR',-23.55,-46.63],['Buenos Aires, AR',-34.60,-58.38],
  ['London, GB',51.51,-0.13],['Paris, FR',48.86,2.35],
  ['Madrid, ES',40.42,-3.70],['Rome, IT',41.90,12.50],
  ['Berlin, DE',52.52,13.41],['Stockholm, SE',59.33,18.07],
  ['Moscow, RU',55.76,37.62],['Istanbul, TR',41.01,28.98],
  ['Cairo, EG',30.04,31.24],['Lagos, NG',6.52,3.38],
  ['Dubai, AE',25.20,55.27],['Riyadh, SA',24.71,46.68],
  ['Mumbai, IN',19.08,72.88],['New Delhi, IN',28.61,77.21],
  ['Singapore, SG',1.35,103.82],['Bangkok, TH',13.76,100.50],
  ['Beijing, CN',39.90,116.41],['Tokyo, JP',35.68,139.65],
  ['Seoul, KR',37.57,126.98],['Sydney, AU',-33.87,151.21],
  ['Melbourne, AU',-37.81,144.96],['Reykjavík, IS',64.15,-21.94]
];

// ====================================================================
const PV = {
  // ---- internal state ----
  _frontSource: 'calc', _backSource: 'calc',
  _frontCached: { wvtr:0, tt:38, rht:90 },
  _backCached:  { wvtr:0, tt:38, rht:90 },
  _encapType: 'eva',
  _lastSim: null, _climate: null, _diurnal: null, _searchTimer: null,
  HORIZON_YR: 40,

  // ------------------------------------------------------------------
  init() {
    this._populateEdges();
    this._populateCities();
    this.setBarrierSource('front', 'calc');
    this.setBarrierSource('back',  'calc');
    this.setEncapType('eva');
  },

  // ------------------------------------------------------------------
  // ENCAPSULANT  (button group instead of dropdown)
  // ------------------------------------------------------------------
  setEncapType(type) {
    this._encapType = type;
    const db = window.MoistureEngine?.ENCAPSULANT_DB || {};
    ['eva','poe','tpu','pvb'].forEach(k => {
      const btn = document.getElementById('pv-encap-'+k);
      if (!btn) return;
      const on = k === type;
      btn.style.cssText = on
        ? 'background:var(--primary);color:#fff;border:none;font-size:.75rem'
        : 'font-size:.75rem';
    });
    const e = db[type];
    const info = document.getElementById('pv-encap-info');
    if (info) info.textContent = e ? e.note||'' : '';
  },

  // ------------------------------------------------------------------
  // BARRIER SOURCE  (mirrors ShelfLife exactly)
  // ------------------------------------------------------------------
  setBarrierSource(which, src) {
    this['_'+which+'Source'] = src;
    const keys = ['calc','db','company','manual'];
    const coOk = typeof CompanyState !== 'undefined' && CompanyState.isActive?.();
    keys.forEach(k => {
      const btn = document.getElementById('pv-'+which+'-src-'+k);
      if (!btn) return;
      const on = k === src;
      btn.style.cssText = on
        ? 'background:var(--primary);color:#fff;border:none;font-size:.72rem'
        : 'font-size:.72rem';
      if (k === 'company') {
        btn.disabled = !coOk;
        btn.style.opacity = coOk ? '1' : '0.4';
        btn.style.cursor  = coOk ? 'pointer' : 'not-allowed';
      }
    });
    keys.forEach(k => {
      const p = document.getElementById('pv-'+which+'-panel-'+k);
      if (p) p.style.display = k === src ? 'block' : 'none';
    });
    if (src === 'db')      this._loadDBLams(which);
    if (src === 'company') this._loadCoLams(which);
    this._refreshSummary(which);
  },

  // ---- populate DB laminates dropdown ----
  _loadDBLams(which) {
    const sel = document.getElementById('pv-'+which+'-db-pick'); if (!sel) return;
    try {
      const lams = (typeof DB!=='undefined' ? (DB.laminates||[]) : [])
        .filter(l => !l.mode || l.mode === 'wvtr');
      sel.innerHTML = lams.length
        ? '<option value="">Select saved laminate…</option>' +
          lams.map(l=>`<option value="${l.id}">${l.name} — ${(l.total||0).toFixed(4)} g/m²·day @ ${l.temperature||38}°C/${l.humidity||90}%</option>`).join('')
        : '<option value="">No WVTR laminates saved yet</option>';
    } catch(e) { sel.innerHTML='<option value="">Error loading</option>'; }
  },

  async _loadCoLams(which) {
    const sel = document.getElementById('pv-'+which+'-co-pick'); if (!sel) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
      const lams = (await loadCompanyLaminates()).filter(l=>l.mode==='wvtr');
      sel.innerHTML = lams.length
        ? '<option value="">Select company laminate…</option>' +
          lams.map(l=>`<option value="${l._companyLamId}">${l.name} — ${(l.total||0).toFixed(4)} g/m²·day @ ${l.temperature||38}°C/${l.humidity||90}%</option>`).join('')
        : '<option value="">No WVTR company laminates</option>';
    } catch(e) { sel.innerHTML='<option value="">Error</option>'; }
  },

  // ---- called when user picks a laminate from DB/company ----
  // Caches the WVTR value AND the test conditions already in the laminate
  onDBPick(which, val) {
    if (!val) return;
    try {
      const lam = (DB.laminates||[]).find(l=>String(l.id)===String(val));
      if (lam) this['_'+which+'Cached'] = { wvtr:parseFloat(lam.total)||0, tt:lam.temperature||38, rht:lam.humidity||90 };
    } catch(e) {}
    this._refreshSummary(which);
  },

  async onCoPick(which, val) {
    if (!val) return;
    try {
      const lam = (await loadCompanyLaminates())?.find(l=>l._companyLamId===val);
      if (lam) this['_'+which+'Cached'] = { wvtr:parseFloat(lam.total)||0, tt:lam.temperature||38, rht:lam.humidity||90 };
    } catch(e) {}
    this._refreshSummary(which);
  },

  // ---- read barrier params (synchronous — async resolved by caching) ----
  _barrierParams(which) {
    const src = this['_'+which+'Source'];
    const otrRatio = parseFloat(document.getElementById('pv-otr-ratio')?.value)||300;
    const $ = id => document.getElementById(id);

    let wvtr=0, tt=38, rht=90, otr=0, ott=23, o2t=100;

    if (src === 'calc') {
      try { wvtr = parseFloat(State.calcResult?.total)||0; } catch(e) {}
      try { tt = State.selCond?.temperature||38; rht = State.selCond?.humidity||90; } catch(e) {}
    } else if (src === 'manual') {
      wvtr = parseFloat($('pv-'+which+'-m-wvtr')?.value)||0;
      tt   = parseFloat($('pv-'+which+'-m-tt')?.value)||38;
      rht  = parseFloat($('pv-'+which+'-m-rh')?.value)||90;
      const manOtr = parseFloat($('pv-'+which+'-m-otr')?.value)||0;
      if (manOtr > 0) {
        otr = manOtr;
        ott = parseFloat($('pv-'+which+'-m-ott')?.value)||23;
        o2t = parseFloat($('pv-'+which+'-m-o2')?.value)||100;
      }
    } else {
      const c = this['_'+which+'Cached']||{};
      wvtr = c.wvtr||0; tt = c.tt||38; rht = c.rht||90;
    }

    if (otr === 0) otr = wvtr * otrRatio;  // auto-estimate
    return { wvtr, tt, rht, otr, ott, o2t };
  },

  _refreshSummary(which) {
    const el = document.getElementById('pv-'+which+'-sum'); if (!el) return;
    const p = this._barrierParams(which);
    const srcLabel = {calc:'Calculator',db:'Community DB',company:'Company DB',manual:'Manual'}[this['_'+which+'Source']]||'';
    el.innerHTML = p.wvtr > 0
      ? `<b>${p.wvtr.toFixed(4)}</b> g/m²·day @ ${p.tt}°C/${p.rht}%RH  ·  OTR ~${p.otr.toFixed(2)} cc/m²·day  <span style="color:var(--text-light)">[${srcLabel}]</span>`
      : `<span style="color:var(--danger)">No value — select a laminate or enter manually</span>`;
  },

  // ------------------------------------------------------------------
  // EDGE + CITIES
  // ------------------------------------------------------------------
  _populateEdges() {
    const sel = document.getElementById('pv-edge'); if (!sel) return;
    sel.innerHTML = Object.entries(PV_EDGES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
    sel.value = 'pib';
  },
  _populateCities() {
    const sel = document.getElementById('pv-city-quick'); if (!sel) return;
    sel.innerHTML = '<option value="">— Quick pick —</option>'
      + PV_CITIES.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join('');
  },

  // ------------------------------------------------------------------
  // LOCATION & OFFICIAL CLIMATE
  // ------------------------------------------------------------------
  quickPickCity(idx) {
    const c = PV_CITIES[+idx]; if (!c) return;
    this._setLocation(c[0], c[1], c[2]);
  },

  onCitySearchInput(q) {
    clearTimeout(this._searchTimer);
    const box = document.getElementById('pv-city-results');
    if (!q || q.trim().length < 2) { if (box) box.style.display='none'; return; }
    this._searchTimer = setTimeout(()=>this._geocode(q.trim()), 350);
  },

  async _geocode(q) {
    const box = document.getElementById('pv-city-results'); if (!box) return;
    box.style.display='block';
    box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">Searching…</div>';
    try {
      const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`)).json();
      const res = j.results||[];
      if (!res.length) { box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">No results.</div>'; return; }
      box.innerHTML = res.map(r=>{
        const lbl=[r.name,r.admin1,r.country].filter(Boolean).join(', ');
        return `<div style="padding:.45rem .6rem;cursor:pointer;font-size:.78rem;border-bottom:1px solid var(--border)"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
          onclick="PV._setLocation('${lbl.replace(/'/g,"\\'")}',${r.latitude},${r.longitude})"
          >${lbl} <span style="color:var(--text-light)">(${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)})</span></div>`;
      }).join('');
    } catch(e) { box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--danger)">Search failed. Use manual coords.</div>'; }
  },

  useManualCoords() {
    const lat=parseFloat(document.getElementById('pv-lat')?.value);
    const lon=parseFloat(document.getElementById('pv-lon')?.value);
    if (isNaN(lat)||isNaN(lon)) { alert('Enter valid lat/lon.'); return; }
    this._setLocation(`Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`, lat, lon);
  },

  _setLocation(name, lat, lon) {
    this._loc = {name,lat,lon};
    const box=document.getElementById('pv-city-results'); if (box) box.style.display='none';
    const li=document.getElementById('pv-lat'),lo=document.getElementById('pv-lon');
    if (li) li.value=lat.toFixed(4); if (lo) lo.value=lon.toFixed(4);
    const nl=document.getElementById('pv-loc-name'); if (nl) nl.textContent=name;
    this.fetchOfficialClimate();
  },

  async fetchOfficialClimate() {
    if (!this._loc) { alert('Select a location first.'); return; }
    const st=document.getElementById('pv-climate-status');
    const setS=(m,c)=>{ if(st){st.textContent=m; st.style.color=c||'var(--text-light)';} };
    setS('Fetching NASA POWER + ERA5 official data…');
    const {lat,lon}=this._loc;
    let annualT=null,annualRH=null,annualG=null,monthly=[],source='';
    try {
      const j=await(await fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`)).json();
      const T=j.properties.parameter.T2M,RH=j.properties.parameter.RH2M,G=j.properties.parameter.ALLSKY_SFC_SW_DWN;
      const MS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      monthly=MS.map(m=>({m,t:T[m],rh:RH[m],g:G?G[m]:null}));
      annualT  = T.ANN !=null?T.ANN :monthly.reduce((a,b)=>a+b.t,0)/12;
      annualRH = RH.ANN!=null?RH.ANN:monthly.reduce((a,b)=>a+b.rh,0)/12;
      annualG  = G?(G.ANN!=null?G.ANN:monthly.reduce((a,b)=>a+(b.g||0),0)/12):180;
      source='NASA POWER (20-yr MERRA-2 climatology)';
    } catch(e){}
    try {
      const end=new Date(Date.now()-10*864e5),start=new Date(end.getTime()-365*864e5);
      const fmt=d=>d.toISOString().slice(0,10);
      const j=await(await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`)).json();
      const times=j.hourly.time,Ts=j.hourly.temperature_2m,RHs=j.hourly.relative_humidity_2m;
      const sT=new Array(24).fill(0),sRH=new Array(24).fill(0),cnt=new Array(24).fill(0);
      let gT=0,gRH=0,gN=0;
      for (let i=0;i<times.length;i++){
        if(Ts[i]==null||RHs[i]==null)continue;
        const h=parseInt(times[i].slice(11,13),10);
        sT[h]+=Ts[i];sRH[h]+=RHs[i];cnt[h]++;gT+=Ts[i];gRH+=RHs[i];gN++;
      }
      this._diurnal={hours:[...Array(24).keys()],T:sT.map((v,h)=>cnt[h]?v/cnt[h]:null),RH:sRH.map((v,h)=>cnt[h]?v/cnt[h]:null),source:'ERA5 (ECMWF/Copernicus via Open-Meteo)'};
      if(!annualT&&gN){annualT=gT/gN;annualRH=gRH/gN;source='ERA5 reanalysis';}
    } catch(e){this._diurnal=null;}
    if(annualT==null){setS('Could not reach data sources. Enter T and RH manually.','var(--danger)');return;}
    this._climate={annualT,annualRH,annualG:annualG||180,monthly,source};
    const te=document.getElementById('pv-tamb'),re=document.getElementById('pv-rh');
    if(te)te.value=annualT.toFixed(1); if(re)re.value=annualRH.toFixed(0);
    setS(`✓ ${source}  ·  T ≈ ${annualT.toFixed(1)} °C, RH ≈ ${annualRH.toFixed(0)} %`,'var(--success)');
  },

  // ------------------------------------------------------------------
  // SIMULATION BRIDGE → window.MoistureEngine
  // ------------------------------------------------------------------
  _buildConfig() {
    const Tair=parseFloat(document.getElementById('pv-tamb')?.value);
    const RH=parseFloat(document.getElementById('pv-rh')?.value);
    if(isNaN(Tair)||isNaN(RH)) return null;

    const f=this._barrierParams('front'), b=this._barrierParams('back');
    if(!f.wvtr&&!b.wvtr){alert('Set at least one barrier value.');return null;}

    const edgeKey=document.getElementById('pv-edge')?.value||'pib';
    const ep=PV_EDGES[edgeKey];
    const ef=parseFloat(document.getElementById('pv-edgefactor')?.value)||6;
    const L=Math.max(0.1,parseFloat(document.getElementById('pv-len')?.value)||1.6);
    const W=Math.max(0.1,parseFloat(document.getElementById('pv-wid')?.value)||1.0);
    const G=this._climate?.annualG||180;
    const uvF=parseFloat(document.getElementById('pv-uvfrac')?.value)||0.05;

    // Encapsulant thickness (single value for both sides in this simplified model)
    const encThick=parseFloat(document.getElementById('pv-encap-thick')?.value)||0.5;

    return {
      tech: document.getElementById('pv-tech')?.value||'perovskite',
      front:{ wvtr:f.wvtr, Tt:f.tt, RHt:f.rht, otr:f.otr, OTt:f.ott, O2t:f.o2t },
      back: { wvtr:b.wvtr, Tt:b.tt, RHt:b.rht, otr:b.otr, OTt:b.ott, O2t:b.o2t },
      encap:{ type:this._encapType, thickMm:encThick },
      geom: { L, W },
      edge: { D:ep.d/8766, Q:ep.Q, gSeal:ep.gSeal, edgeFactor:ef },
      env:  { Tair, RH, G, uvFraction:uvF },
      tDelta:18, horizonH:this.HORIZON_YR*24*365.25, steps:4000
    };
  },

  calculate() {
    if(typeof window.MoistureEngine==='undefined'){alert('Physics engine not loaded.');return;}
    const cfg=this._buildConfig(); if(!cfg) return;
    let raw;
    try { raw=window.MoistureEngine.simulate(cfg); }
    catch(e){ alert('Simulation error: '+e.message); return; }
    const Y=24*365.25;
    let acc=0,n=0;
    raw.series.forEach(p=>{if(p.t<=25*Y){acc+=p.ret;n++;}});
    const sim={
      t80:raw.t80?raw.t80/Y:null, t90:raw.t90?raw.t90/Y:null, t97:raw.t97?raw.t97/Y:null,
      series:raw.series.map(p=>({...p,t:p.t/Y})),
      channelFractions:raw.channelFractions,
      Tamb:cfg.env.Tair, Tmod:cfg.env.Tair+18, rhFrac:cfg.env.RH/100,
      wFront:cfg.front.wvtr, wBack:cfg.back.wvtr,
      edgeD:PV_EDGES[document.getElementById('pv-edge')?.value||'pib'].d,
      edgeQ:cfg.edge.Q, yield25:n?acc/n:1
    };
    this._lastSim=sim;
    this._renderResult(sim);
  },

  // ------------------------------------------------------------------
  _fmt(v){ return v===null?'>'+this.HORIZON_YR:v<1?(v*12).toFixed(1).replace(/\.0$/,''):v.toFixed(1); },
  _unit(v){ return v!==null&&v<1?'months':'years'; },
  _sample(s,yr){ if(!s||!s.length)return{t:0,ret:1,RHint:0,I:0}; let b=s[0],d=Math.abs(s[0].t-yr); for(const p of s){const dd=Math.abs(p.t-yr);if(dd<d){d=dd;b=p;}}return b; },

  _renderResult(sim) {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('pv-t80',this._fmt(sim.t80)); set('pv-t80u',this._unit(sim.t80));
    set('pv-t90',this._fmt(sim.t90)); set('pv-t90u',this._unit(sim.t90));
    set('pv-t97',this._fmt(sim.t97)); set('pv-t97u',this._unit(sim.t97));
    set('pv-tmod',sim.Tmod.toFixed(0)+' °C'); set('pv-yield',(sim.yield25*100).toFixed(1)+' %');
    if(sim.channelFractions){
      const cf=sim.channelFractions;
      set('pv-ch-m',cf.moisture); set('pv-ch-o',cf.oxygen);
      set('pv-ch-t',cf.thermal);  set('pv-ch-u',cf.uv);
      const cb=document.getElementById('pv-channels'); if(cb) cb.style.display='block';
    }
    const cont=document.getElementById('pv-charts'); if(cont) cont.style.display='block';
    requestAnimationFrame(()=>setTimeout(()=>{
      this._drawRH(sim); this._drawPCE(sim);
      this._drawDailyExchange(sim); this._drawMonthly();
    },80));
  },

  // ------------------------------------------------------------------
  // CHARTS
  // ------------------------------------------------------------------
  _drawRH(sim) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvRH');
    const ctx=document.getElementById('pvRHChart')?.getContext('2d'); if(!ctx) return;
    const step=Math.max(1,Math.ceil(sim.series.length/400));
    const lab=[],dat=[];
    for(let i=0;i<sim.series.length;i+=step){lab.push(sim.series[i].t.toFixed(1));dat.push(+(sim.series[i].RHint*100).toFixed(2));}
    if(!window.chartInstances) window.chartInstances={};
    window.chartInstances.pvRH=new Chart(ctx,{type:'line',
      data:{labels:lab,datasets:[{label:'Internal RH at cell (%)',data:dat,borderColor:'#0f8a8c',backgroundColor:'rgba(15,138,140,0.10)',fill:true,tension:0.3,pointRadius:0,borderWidth:2.2}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},tooltip:{callbacks:{label:c=>`Internal RH: ${c.parsed.y.toFixed(1)} %`}}},
        scales:{x:{title:{display:true,text:'Years'},ticks:{maxTicksLimit:9,font:{size:9}}},
                y:{min:0,max:100,title:{display:true,text:'Internal RH (%)'},ticks:{callback:v=>v+'%',font:{size:9}}}}}});
  },

  _drawPCE(sim) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvPCE');
    const ctx=document.getElementById('pvPCEChart')?.getContext('2d'); if(!ctx) return;
    const step=Math.max(1,Math.ceil(sim.series.length/400));
    const lab=[],dat=[];
    for(let i=0;i<sim.series.length;i+=step){lab.push(sim.series[i].t.toFixed(1));dat.push(+(sim.series[i].ret*100).toFixed(2));}
    if(!window.chartInstances) window.chartInstances={};
    window.chartInstances.pvPCE=new Chart(ctx,{type:'line',
      data:{labels:lab,datasets:[
        {label:'PCE retention (%)',data:dat,borderColor:'#0a4f63',backgroundColor:'rgba(10,79,99,0.10)',fill:true,tension:0.3,pointRadius:0,borderWidth:2.2},
        {label:'T80 (80%)',data:new Array(lab.length).fill(80),borderColor:'#0f8a8c',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false},
        {label:'T90 (90%)',data:new Array(lab.length).fill(90),borderColor:'#c9971f',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},tooltip:{callbacks:{label:c=>`PCE: ${c.parsed.y.toFixed(1)} %`}}},
        scales:{x:{title:{display:true,text:'Years'},ticks:{maxTicksLimit:9,font:{size:9}}},
                y:{min:0,max:100,title:{display:true,text:'PCE retention (%)'},ticks:{callback:v=>v+'%',font:{size:9}}}}}});
  },

  _drawDailyExchange(sim) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvDay');
    const ctx=document.getElementById('pvDayChart')?.getContext('2d'); if(!ctx) return;
    const Psat=T=>610.94*Math.exp((17.625*T)/(T+243.04));
    const prof=this._diurnal&&this._diurnal.T.some(v=>v!=null)?this._diurnal:{
      hours:[...Array(24).keys()],
      T:[...Array(24).keys()].map(h=>sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)),
      RH:[...Array(24).keys()].map(h=>Math.min(98,Math.max(10,sim.rhFrac*100-2*(sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)-sim.Tamb)))),
      source:'Synthetic (annual mean)'};
    const mid=this._sample(sim.series,sim.t80?sim.t80/2:5);
    const intRH=mid.RHint*100;
    const Kfaces=(sim.wFront+sim.wBack)/(24*0.9*Psat(38));
    const dPref=0.9*Psat(23)*1000;
    const flux=[],extRH=[];
    for(let h=0;h<24;h++){
      const Th=prof.T[h]??sim.Tamb, RHh=prof.RH[h]??(sim.rhFrac*100), Tm=Th+18;
      flux.push(+((Kfaces*((RHh/100)*Psat(Tm)*1000-(intRH/100)*Psat(Tm)*1000)/dPref)).toFixed(4));
      extRH.push(+RHh.toFixed(1));
    }
    if(!window.chartInstances)window.chartInstances={};
    window.chartInstances.pvDay=new Chart(ctx,{type:'line',
      data:{labels:[...Array(24).keys()].map(h=>h+':00'),datasets:[
        {label:'Net moisture flux  (+ in / − out)',data:flux,yAxisID:'y',borderColor:'#0a4f63',borderWidth:2,tension:0.35,pointRadius:0,fill:{target:{value:0}},segment:{backgroundColor:c=>c.p0.parsed.y>=0?'rgba(15,138,140,0.22)':'rgba(217,98,43,0.20)'},backgroundColor:'rgba(15,138,140,0.18)'},
        {label:`External RH — ${prof.source}`,data:extRH,yAxisID:'y1',borderColor:'#c9971f',borderWidth:1.5,borderDash:[4,3],tension:0.35,pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:9}}}},
        scales:{x:{ticks:{maxTicksLimit:12,font:{size:8}}},y:{title:{display:true,text:'Flux (a.u.)'}},y1:{position:'right',min:0,max:100,title:{display:true,text:'RH %'},grid:{drawOnChartArea:false}}}}});
  },

  _drawMonthly() {
    if(typeof Chart==='undefined'||!this._climate?.monthly?.length) return;
    if(typeof destroyChart==='function') destroyChart('pvMon');
    const ctx=document.getElementById('pvMonChart')?.getContext('2d'); if(!ctx) return;
    const m=this._climate.monthly;
    if(!window.chartInstances)window.chartInstances={};
    window.chartInstances.pvMon=new Chart(ctx,{type:'bar',
      data:{labels:m.map(x=>x.m),datasets:[
        {label:'Temp (°C)',data:m.map(x=>x.t),backgroundColor:'rgba(217,98,43,0.7)',yAxisID:'y'},
        {label:'RH (%)',data:m.map(x=>x.rh),backgroundColor:'rgba(15,138,140,0.6)',yAxisID:'y1'}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:9}}}},
        scales:{y:{position:'left',title:{display:true,text:'°C'}},y1:{position:'right',min:0,max:100,title:{display:true,text:'RH %'},grid:{drawOnChartArea:false}}}}});
  }
};

// ====================================================================
// RENDER
// ====================================================================
function renderPVDegradation() {
  const techOpts = typeof window.MoistureEngine!=='undefined'
    ? Object.entries(window.MoistureEngine.PV_TECH_DB).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')
    : '<option value="perovskite">Perovskite</option><option value="cigs">CIGS</option><option value="csi">c-Si</option>';
  const coOk = typeof CompanyState!=='undefined' && CompanyState.isActive?.();
  const calcWvtr = (()=>{ try{ return State.calcResult?.total!=null?State.calcResult.total.toFixed(4)+' g/m²·day':'No result yet'; }catch(e){return 'No result yet';} })();
  const lamName  = (()=>{ try{ return State.laminateName||''; }catch(e){return '';} })();
  const calcCond = (()=>{ try{ return State.selCond?`@ ${State.selCond.temperature}°C/${State.selCond.humidity}%RH`:''; }catch(e){return '';} })();

  // ---- reusable barrier block ----
  function barrierBlock(which, icon, title) {
    const disabledCo = coOk?'':'disabled style="opacity:.4;cursor:not-allowed"';
    return `
    <div class="pv-s">
      <div class="pv-h">${icon} ${title}</div>
      <!-- source buttons (style matches ShelfLife) -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:.35rem;margin-bottom:.55rem">
        <button id="pv-${which}-src-calc"    class="btn btn-sm" onclick="PV.setBarrierSource('${which}','calc')"    style="font-size:.72rem;background:var(--primary);color:#fff;border:none">From Calculator</button>
        <button id="pv-${which}-src-db"      class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','db')"      style="font-size:.72rem">Community DB</button>
        <button id="pv-${which}-src-company" class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','company')" style="font-size:.72rem" ${disabledCo}>Company DB</button>
        <button id="pv-${which}-src-manual"  class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','manual')"  style="font-size:.72rem">Manual</button>
      </div>

      <!-- from calculator -->
      <div id="pv-${which}-panel-calc">
        <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:.55rem .7rem;font-size:.75rem">
          <div style="font-weight:700">${lamName||'Current calculator result'}</div>
          <div style="display:flex;justify-content:space-between;margin-top:.2rem">
            <span>WVTR ${calcCond}</span>
            <strong style="color:var(--primary)">${calcWvtr}</strong>
          </div>
        </div>
      </div>

      <!-- from community DB -->
      <div id="pv-${which}-panel-db" style="display:none">
        <select class="form-input" id="pv-${which}-db-pick" style="font-size:.78rem"
          onchange="PV.onDBPick('${which}',this.value)"><option value="">Loading…</option></select>
      </div>

      <!-- from company DB -->
      <div id="pv-${which}-panel-company" style="display:none">
        <select class="form-input" id="pv-${which}-co-pick" style="font-size:.78rem"
          onchange="PV.onCoPick('${which}',this.value)"><option value="">Loading…</option></select>
      </div>

      <!-- manual — includes test conditions (physically required) -->
      <div id="pv-${which}-panel-manual" style="display:none">
        <div style="font-size:.7rem;font-weight:600;color:var(--text-light);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.05em">WVTR — with test conditions</div>
        <div class="grid grid-3" style="gap:.35rem;margin-bottom:.35rem">
          <div class="form-group" style="margin:0"><label>WVTR (g/m²·day)</label><input type="number" id="pv-${which}-m-wvtr" class="form-input" step="any" placeholder="e.g. 0.001" oninput="PV._refreshSummary('${which}')"></div>
          <div class="form-group" style="margin:0"><label>Test T (°C)</label><input type="number" id="pv-${which}-m-tt" class="form-input" value="38" step="1" oninput="PV._refreshSummary('${which}')"></div>
          <div class="form-group" style="margin:0"><label>Test RH (%)</label><input type="number" id="pv-${which}-m-rh" class="form-input" value="90" step="1" oninput="PV._refreshSummary('${which}')"></div>
        </div>
        <div style="font-size:.7rem;font-weight:600;color:var(--text-light);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.05em">OTR — optional (leave blank to auto-estimate)</div>
        <div class="grid grid-3" style="gap:.35rem">
          <div class="form-group" style="margin:0"><label>OTR (cc/m²·day)</label><input type="number" id="pv-${which}-m-otr" class="form-input" step="any" placeholder="blank = auto" oninput="PV._refreshSummary('${which}')"></div>
          <div class="form-group" style="margin:0"><label>Test T (°C)</label><input type="number" id="pv-${which}-m-ott" class="form-input" value="23" step="1"></div>
          <div class="form-group" style="margin:0"><label>O₂ fraction (%)</label><input type="number" id="pv-${which}-m-o2" class="form-input" value="100" step="1"></div>
        </div>
      </div>

      <!-- active summary -->
      <div style="margin-top:.5rem;background:var(--primary-light);border-radius:5px;padding:.35rem .7rem;font-size:.72rem">
        <span id="pv-${which}-sum">—</span>
      </div>
    </div>`;
  }

  return `
  <style>
    #pvroot .pv-s{padding:.9rem 1rem;border-bottom:1px solid var(--border)}
    #pvroot .pv-h{display:flex;align-items:center;gap:.4rem;margin-bottom:.5rem;font-weight:600;font-size:.84rem;color:var(--primary)}
    #pvroot .ro{border:1px solid var(--border);border-radius:8px;padding:.75rem;background:#fff;position:relative;overflow:hidden}
    #pvroot .ro::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--primary)}
    #pvroot .ro.t90::before{background:var(--warning)}
    #pvroot .ro.t97::before{background:#d9622b}
    #pvroot .ro .k{font-size:.68rem;letter-spacing:.07em;color:var(--text-light);text-transform:uppercase;font-weight:600}
    #pvroot .ro .v{font-size:1.65rem;font-weight:800;line-height:1;margin:.25rem 0 .1rem;color:var(--primary)}
    #pvroot .ro .u{font-size:.68rem;color:var(--text-light);line-height:1.3}
    #pvroot .ch4{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-top:.6rem}
    #pvroot .ch{font-size:.72rem;text-align:center;padding:.4rem .2rem;background:var(--bg);border-radius:4px}
    #pvroot .ch .cv{font-weight:700;font-size:.9rem;margin-top:.15rem}
    #pvroot canvas{display:block;width:100%}
    #pv-city-results a:hover{background:var(--bg)}
  </style>

  <div id="pvroot" class="grid grid-2" style="gap:1.2rem;align-items:start">

    <!-- ===== INPUT PANEL ===== -->
    <div class="card" style="padding:0">
      <div style="padding:.9rem 1rem;background:var(--bg);border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:.95rem">PV Module Lifetime Simulator</h2>
        <div style="font-size:.7rem;color:var(--text-light);margin-top:.15rem">Moisture + O₂ ingress through the encapsulation stack · multi-channel degradation · official climate</div>
      </div>

      <!-- 1. LOCATION -->
      <div class="pv-s">
        <div class="pv-h">▼ 1. Location</div>
        <div class="form-group" style="margin:0;position:relative">
          <label>Search worldwide</label>
          <input type="text" class="form-input" placeholder="Type city…" autocomplete="off" oninput="PV.onCitySearchInput(this.value)">
          <div id="pv-city-results" style="display:none;position:absolute;z-index:20;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:200px;overflow:auto;margin-top:2px"></div>
        </div>
        <div class="grid grid-2" style="gap:.4rem;margin-top:.4rem">
          <div class="form-group" style="margin:0"><label>Quick pick</label><select class="form-input" id="pv-city-quick" onchange="PV.quickPickCity(this.value)"></select></div>
          <div></div>
        </div>
        <div class="grid grid-2" style="gap:.4rem;margin-top:.4rem">
          <div class="form-group" style="margin:0"><label>Latitude</label><input type="number" id="pv-lat" class="form-input" step=".0001" placeholder="e.g. 41.90"></div>
          <div class="form-group" style="margin:0"><label>Longitude</label><input type="number" id="pv-lon" class="form-input" step=".0001" placeholder="e.g. 12.50"></div>
        </div>
        <button class="btn btn-sm btn-outline btn-full" style="margin-top:.4rem;font-size:.76rem" onclick="PV.useManualCoords()">Use coordinates &amp; fetch official data</button>
        <div style="margin-top:.45rem;background:var(--primary-light);border-radius:6px;padding:.45rem .65rem;font-size:.74rem">
          <div style="font-weight:700" id="pv-loc-name">No location selected</div>
          <div id="pv-climate-status" style="color:var(--text-light);margin-top:.1rem">Pick a location to load NASA POWER + ERA5 data.</div>
        </div>
        <div class="grid grid-2" style="gap:.4rem;margin-top:.4rem">
          <div class="form-group" style="margin:0"><label>Annual mean T (°C)</label><input type="number" id="pv-tamb" class="form-input" value="20" step=".5"></div>
          <div class="form-group" style="margin:0"><label>Annual mean RH (%)</label><input type="number" id="pv-rh" class="form-input" value="70" step="1"></div>
        </div>
      </div>

      <!-- 2. CELL TECHNOLOGY -->
      <div class="pv-s">
        <div class="pv-h">▼ 2. Cell technology</div>
        <select id="pv-tech" class="form-input">${techOpts}</select>
      </div>

      <!-- 3. FRONT BARRIER -->
      ${barrierBlock('front','▼','3. Front cover — WVTR / OTR barrier')}

      <!-- 4. ENCAPSULANT  (button group) -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--purple)">▼ 4. Encapsulant (GAB sorption isotherm)</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem;margin-bottom:.5rem">
          <button id="pv-encap-eva" class="btn btn-sm" onclick="PV.setEncapType('eva')" style="font-size:.75rem;background:var(--primary);color:#fff;border:none">EVA</button>
          <button id="pv-encap-poe" class="btn btn-sm btn-outline" onclick="PV.setEncapType('poe')" style="font-size:.75rem">POE</button>
          <button id="pv-encap-tpu" class="btn btn-sm btn-outline" onclick="PV.setEncapType('tpu')" style="font-size:.75rem">TPU</button>
          <button id="pv-encap-pvb" class="btn btn-sm btn-outline" onclick="PV.setEncapType('pvb')" style="font-size:.75rem">PVB</button>
        </div>
        <div id="pv-encap-info" style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem;min-height:.9rem"></div>
        <div class="form-group" style="margin:0"><label>Thickness per side (mm)</label><input type="number" id="pv-encap-thick" class="form-input" value="0.5" step=".1" min=".1"></div>
      </div>

      <!-- 5. BACK BARRIER -->
      ${barrierBlock('back','▼','5. Back cover / backsheet — WVTR / OTR barrier')}

      <!-- 6. OTR RATIO (shown when at least one source is not manual) -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--text-light)">▼ OTR auto-estimate ratio</div>
        <div style="font-size:.72rem;color:var(--text-light);margin-bottom:.4rem">When OTR is not entered manually, it is estimated as WVTR × ratio. Typical for polymers: 200–500.</div>
        <div class="form-group" style="margin:0"><label>WVTR → OTR ratio</label><input type="number" id="pv-otr-ratio" class="form-input" value="300" step="10" min="10"></div>
      </div>

      <!-- 7. EDGE + GEOMETRY -->
      <div class="pv-s">
        <div class="pv-h">▼ 6. Edge seal &amp; geometry</div>
        <div class="form-group" style="margin:0"><label>Edge seal type</label><select id="pv-edge" class="form-input"></select></div>
        <div class="grid grid-2" style="gap:.4rem;margin-top:.4rem">
          <div class="form-group" style="margin:0"><label>Edge factor <span style="font-size:.65rem">(2–20)</span></label><input type="number" id="pv-edgefactor" class="form-input" value="6" step=".5"></div>
          <div class="form-group" style="margin:0"><label>UV fraction of G</label><input type="number" id="pv-uvfrac" class="form-input" value="0.05" step=".01"></div>
          <div class="form-group" style="margin:0"><label>Length (m)</label><input type="number" id="pv-len" class="form-input" value="1.6" step=".1"></div>
          <div class="form-group" style="margin:0"><label>Width (m)</label><input type="number" id="pv-wid" class="form-input" value="1.0" step=".1"></div>
        </div>
      </div>

      <!-- CALCULATE -->
      <div style="padding:.9rem 1rem">
        <button class="btn btn-danger btn-full" onclick="PV.calculate()" style="padding:.75rem;font-size:.9rem">▶ Run Simulation</button>
      </div>
    </div>

    <!-- ===== RESULTS PANEL ===== -->
    <div style="position:sticky;top:1rem">
      <div class="card">
        <!-- Explanation of what this tool shows -->
        <div style="background:var(--primary-light);border-radius:8px;padding:.65rem .9rem;margin-bottom:.9rem;font-size:.78rem;line-height:1.55;color:var(--text)">
          <strong style="display:block;margin-bottom:.2rem">Two questions, two charts</strong>
          <span style="color:var(--text-light)">
            <span style="color:var(--primary);font-weight:600">Chart 1</span> — <b>how much moisture reaches the cells</b>: internal RH (%) at the cell plane over time.<br>
            <span style="color:#0a4f63;font-weight:600">Chart 2</span> — <b>the power loss</b>: PCE retention (%) and when T80/T90/T97 is crossed.
          </span>
        </div>

        <!-- T80/90/97 -->
        <div class="grid grid-3" style="gap:.65rem">
          <div class="ro t80"><div class="k">T80</div><div class="v" id="pv-t80">–</div><div class="u"><span id="pv-t80u">years</span><br>80% initial power</div></div>
          <div class="ro t90"><div class="k">T90</div><div class="v" id="pv-t90">–</div><div class="u"><span id="pv-t90u">years</span><br>90% initial power</div></div>
          <div class="ro t97"><div class="k">T97</div><div class="v" id="pv-t97">–</div><div class="u"><span id="pv-t97u">years</span><br>97% initial power</div></div>
        </div>

        <!-- Channel breakdown -->
        <div id="pv-channels" style="display:none;margin-top:.7rem">
          <div style="font-size:.68rem;color:var(--text-light);font-weight:600;margin-bottom:.25rem">Degradation driver breakdown</div>
          <div class="ch4">
            <div class="ch"><div style="color:var(--primary)">Moisture</div><div class="cv" id="pv-ch-m">–</div></div>
            <div class="ch"><div style="color:var(--warning)">Oxygen</div><div class="cv" id="pv-ch-o">–</div></div>
            <div class="ch"><div style="color:#d9622b">Thermal</div><div class="cv" id="pv-ch-t">–</div></div>
            <div class="ch"><div style="color:#8b5cf6">UV</div><div class="cv" id="pv-ch-u">–</div></div>
          </div>
        </div>

        <div class="grid grid-2" style="gap:.5rem;margin-top:.7rem;font-size:.78rem">
          <div><div style="color:var(--text-light);font-size:.68rem">Operating module T</div><strong id="pv-tmod">–</strong></div>
          <div><div style="color:var(--text-light);font-size:.68rem">Mean PCE yield (25 yr)</div><strong id="pv-yield">–</strong></div>
        </div>
      </div>

      <!-- Charts -->
      <div id="pv-charts" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.15rem">Moisture reaching the cell plane (internal RH)</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">How much humidity accumulates inside the encapsulation — the physical cause of degradation.</div>
          <div style="height:220px"><canvas id="pvRHChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.15rem">Power output degradation (PCE retention)</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">What % of initial power the module delivers over time, and when it crosses industry lifetime thresholds.</div>
          <div style="height:220px"><canvas id="pvPCEChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.15rem">Daily moisture exchange — the module breathes</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">Teal = moisture entering (cool/humid hours) · Amber = moisture leaving (hot/dry hours). Invisible to steady-state models.</div>
          <div style="height:210px"><canvas id="pvDayChart"></canvas></div>
        </div>
        <div class="card">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.4rem">Monthly climate — NASA POWER official data</h3>
          <div style="height:185px"><canvas id="pvMonChart"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  ${renderPVMethodology()}

  <script>
    if (typeof PV !== 'undefined') setTimeout(function(){ PV.init(); }, 80);
  </script>`;
}

// ====================================================================
function renderPVMethodology() {
  return `
<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary)">
<div style="padding:1.3rem 1.5rem">
<h2 style="font-family:Georgia,serif;font-size:1.2rem;border-bottom:1px solid var(--border);padding-bottom:.55rem;margin-bottom:1.1rem">
How the simulation works
</h2>
<div style="font-size:.91rem;line-height:1.82;color:#334155;font-family:Georgia,serif">

<p>A photovoltaic module is not hermetically sealed. Its front sheet, back sheet and edge seal form a system of distributed resistances through which water vapour — and, for sensitive cell technologies, oxygen — permeates over time. The simulator couples the permeation physics of the encapsulation stack to the degradation kinetics of the chosen cell type, answering two distinct questions simultaneously: how much moisture physically reaches the active layer, and what is the resulting loss of power output over the module's service life.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Why test conditions matter for WVTR</h3>
<p>WVTR is not a fundamental material constant — it is a measurement that depends on the temperature, relative humidity, film thickness and test method used. A barrier rated 0.01 g/m²·day at 38 °C/90 % RH will behave entirely differently at 25 °C/60 % RH. The engine converts each barrier value into a physical permeance K = WVTR / Δp(test), where Δp is the water vapour partial pressure difference at the stated test conditions. It then re-evaluates K at the actual service temperature using an Arrhenius correction, so that the simulation reflects real rooftop conditions rather than laboratory test conditions. This is why the manual entry panel asks for the test temperature and humidity alongside the value itself.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Moisture inventory and the GAB sorption isotherm</h3>
<p>Once water enters the laminate, it is absorbed by the encapsulant polymer rather than remaining as free vapour. EVA, POE, TPU and PVB each have a different sorption capacity and shape of uptake curve. The engine tracks the accumulated water content I [g/m²] as the simulation's state variable and converts it into the true internal relative humidity via the GAB (Guggenheimer–Anderson–de Boer) sorption isotherm — the same equation used in the shelf-life module for food packaging. This correctly models the self-limiting character of moisture ingress: as the polymer saturates and the internal humidity rises, the driving force falls and the ingress rate decreases.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Edge ingress and desiccant breakthrough</h3>
<p>In glass–glass modules the face barriers are nearly impermeable and the dominant pathway is lateral ingress along the edge encapsulant or PIB seal. The engine models an inward-advancing diffusion front (√(D·t)) which is initially held back by the desiccant strip. Once the desiccant's capacity Q [g/m of perimeter] is exhausted, the breakthrough occurs and ingress accelerates. This saturation behaviour is the key design variable of advanced edge seal systems and is experimentally well documented (Kempe 2018, Coyle 2013, SAES B-Dry characterisation).</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Diurnal breathing and the daily exchange chart</h3>
<p>Moisture flux direction is governed by the vapour pressure gradient across the barrier. During hot afternoons the module surface can be 25–40 °C above ambient; at the same external relative humidity, this raises the saturation pressure inside and the net flux reverses — moisture leaves the module. After sunset the module cools, the gradient inverts, and moisture re-enters. Steady-state models that use only annual averages miss this entirely. The daily exchange chart plots the signed net flux derived from ERA5 hourly reanalysis, clearly distinguishing the hours when moisture flows in (teal shading) from the hours when it flows out (amber).</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Multi-channel degradation and the WVTR + OTR combination</h3>
<p>The internal RH is the cause; the power loss is the consequence. Four degradation channels contribute independently: moisture-driven chemistry, thermal ageing, UV photo-oxidation, and — specifically for perovskite and organic cells — oxygen-induced superoxide formation under illumination. The OTR of the barrier determines how quickly oxygen reaches the cell and therefore the magnitude of the oxygen channel. No publicly available tool couples WVTR, OTR and lifetime prediction in a single model for multiple cell technologies; this is the core differentiator of this simulator. The T80, T90 and T97 lifetime thresholds follow the IEC 61215 damp-heat convention (the standard used in module certification) and map directly onto typical commercial warranty formulations.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Data sources and calibration</h3>
<p>Climate is sourced from NASA POWER (NASA Langley, 20-year MERRA-2 climatology for monthly T, RH and irradiance) and ERA5 reanalysis (ECMWF/Copernicus via Open-Meteo, hourly profile for the diurnal chart). Degradation sensitivities are calibrated against Tsuji et al. 2024 for perovskite, Coyle 2013 for CIGS, and Jordan &amp; Kurtz 2016 for crystalline silicon. All coefficients are editable and the benchmark comparison function in the physics engine is the calibration tool for fitting to your own measured damp-heat data.</p>

<div style="margin-top:1.4rem;padding:.8rem .95rem;background:var(--bg);border-radius:7px;font-size:.8rem;color:var(--text-light);border-left:3px solid var(--warning);font-family:sans-serif;line-height:1.6">
<strong>Disclaimer.</strong> Degradation coefficients are screening-grade values for comparative analysis and concept development. Before any certification, warranty or investment decision, they must be re-fitted against measured damp-heat / ISOS test data for the specific cell composition and encapsulation system.
</div>
</div>
</div>
</div>`;
}

// ---- exports ----
window.PV = PV;
window.renderPVDegradation = renderPVDegradation;
window.renderPVMethodology = renderPVMethodology;

})();
