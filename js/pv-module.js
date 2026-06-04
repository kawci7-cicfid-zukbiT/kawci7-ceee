// ====================================================================
// PV-MODULE.JS  —  PV Lifetime: UI + bridge to MoistureEngine v3
// ====================================================================
// Requires: moisture-engine-v3.js (window.MoistureEngine)
//           Chart.js, NASA POWER + Open-Meteo APIs (browser fetch)
//           Site globals: State, DB, destroyChart, chartInstances,
//                         CSS vars --primary --border --bg etc.
// Usage:
//   TABS: add { id:'pv-lifetime', label:'PV Lifetime' }
//   renderContent() switch: case 'pv-lifetime': c.innerHTML = renderPVDegradation(); break;
//   postNavRender():  if(State.tab==='pv-lifetime') PV.init();
// ====================================================================

// ---- Cover presets (WVTR g/m²/day + OTR cc/m²/day at rated conditions) ----
const PV_COVERS = {
  glass: { name:'Glass',                              w:0.0001, o:0.0001 },
  hb:    { name:'High-barrier film (ALD/multilayer)', w:0.001,  o:0.001  },
  mb:    { name:'Medium barrier film',                w:0.05,   o:0.5    },
  bs:    { name:'Standard backsheet',                 w:1.5,    o:50     },
  poly:  { name:'Simple polymer / none',              w:20,     o:500    }
};

// ---- Edge seal presets (D in mm²/year for display; converted /8766 for engine) ----
const PV_EDGES = {
  pibd: { name:'PIB + desiccant',            d:6,   Q:5,    gSeal:2e-8  },
  pib:  { name:'PIB (no desiccant)',         d:15,  Q:0.01, gSeal:2e-8  },
  none: { name:'Common encapsulant at edge', d:120, Q:0,    gSeal:1e-7  }
};

// ---- Major world cities quick-pick ----
const PV_CITIES = [
  ['New York, US',     40.71,-74.01], ['Los Angeles, US', 34.05,-118.24],
  ['Phoenix, US',      33.45,-112.07],['Miami, US',       25.76,-80.19],
  ['Toronto, CA',      43.65,-79.38], ['Mexico City, MX', 19.43,-99.13],
  ['São Paulo, BR',   -23.55,-46.63], ['Buenos Aires, AR',-34.60,-58.38],
  ['London, GB',       51.51,-0.13],  ['Paris, FR',       48.86,2.35],
  ['Madrid, ES',       40.42,-3.70],  ['Rome, IT',        41.90,12.50],
  ['Berlin, DE',       52.52,13.41],  ['Stockholm, SE',   59.33,18.07],
  ['Moscow, RU',       55.76,37.62],  ['Istanbul, TR',    41.01,28.98],
  ['Cairo, EG',        30.04,31.24],  ['Lagos, NG',        6.52,3.38],
  ['Nairobi, KE',      -1.29,36.82],  ['Johannesburg, ZA',-26.20,28.05],
  ['Dubai, AE',        25.20,55.27],  ['Riyadh, SA',      24.71,46.68],
  ['Mumbai, IN',       19.08,72.88],  ['New Delhi, IN',   28.61,77.21],
  ['Singapore, SG',     1.35,103.82], ['Bangkok, TH',     13.76,100.50],
  ['Jakarta, ID',      -6.21,106.85], ['Beijing, CN',     39.90,116.41],
  ['Tokyo, JP',        35.68,139.65], ['Seoul, KR',       37.57,126.98],
  ['Sydney, AU',      -33.87,151.21], ['Melbourne, AU',  -37.81,144.96],
  ['Reykjavík, IS',    64.15,-21.94], ['Nairobi, KE',      -1.29,36.82]
];

// ====================================================================
const PV = {
  _loc:null, _climate:null, _diurnal:null, _lastSim:null, _searchTimer:null,
  HORIZON_YR: 40,

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------
  init() {
    this._populateCovers('front','glass');
    this._populateCovers('back','bs');
    this._populateEdges();
    this._populateCities();
    this.onCoverChange();
  },

  _laminateOptions() {
    let db='', calc='';
    try {
      const lams = (typeof DB!=='undefined' && DB.laminates) ? DB.laminates.filter(l=>!l.mode||l.mode==='wvtr') : [];
      if(lams.length) {
        db = '<optgroup label="My database (WVTR laminates)">'
           + lams.map(l=>`<option value="db:${l.id}">${l.name} — ${l.total!=null?l.total.toFixed(4):'?'} g/m²·day</option>`).join('')
           + '</optgroup>';
      }
    } catch(e){}
    try {
      if(typeof State!=='undefined' && State.calcResult && State.mode==='wvtr' && State.calcResult.total!=null)
        calc = `<optgroup label="Calculator"><option value="calc">Current result — ${State.calcResult.total.toFixed(4)} g/m²·day</option></optgroup>`;
    } catch(e){}
    return db + calc;
  },

  _populateCovers(which, def) {
    const sel = document.getElementById('pv-'+which); if(!sel) return;
    const presets = Object.entries(PV_COVERS).map(([k,v])=>
      `<option value="pre:${k}">${v.name} — W:${v.w} / O:${v.o}</option>`).join('');
    sel.innerHTML = `<optgroup label="Presets">${presets}</optgroup>`
      + this._laminateOptions() + '<option value="manual">Manual…</option>';
    sel.value = 'pre:'+def;
  },

  _populateEdges() {
    const sel = document.getElementById('pv-edge'); if(!sel) return;
    sel.innerHTML = Object.entries(PV_EDGES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
    sel.value = 'pib';
  },

  _populateCities() {
    const sel = document.getElementById('pv-city-quick'); if(!sel) return;
    sel.innerHTML = '<option value="">— Quick pick —</option>'
      + PV_CITIES.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join('');
  },

  // ------------------------------------------------------------------
  // BARRIER VALUES
  // ------------------------------------------------------------------
  onCoverChange() {
    ['front','back'].forEach(w=>{
      const sel=document.getElementById('pv-'+w);
      const man=document.getElementById('pv-'+w+'-manual');
      if(sel&&man) man.style.display = sel.value==='manual'?'block':'none';
    });
    this._updateBarrierSummary();
  },

  _getBarrierVal(which, prop) { // prop = 'w' (WVTR) or 'o' (OTR)
    const sel = document.getElementById('pv-'+which); if(!sel) return 0;
    const v = sel.value;
    if(v==='manual') return parseFloat(document.getElementById('pv-'+which+'-manual')?.value)||0;
    if(v==='calc') { try{ return parseFloat(State.calcResult?.total)||0; }catch(e){return 0;} }
    if(v.startsWith('pre:')) return PV_COVERS[v.slice(4)]?.[prop] ?? 0;
    if(v.startsWith('db:')) {
      try{
        const id=v.slice(3), lam=DB.laminates?.find(l=>String(l.id)===String(id));
        return parseFloat(lam?.total)||0; // DB laminates only store WVTR
      }catch(e){return 0;}
    }
    return 0;
  },

  _updateBarrierSummary() {
    const el = document.getElementById('pv-barrier-summary');
    if(el) el.textContent =
      `Front  WVTR ${this._getBarrierVal('front','w')}  ·  OTR ${this._getBarrierVal('front','o')}  |  `+
      `Back  WVTR ${this._getBarrierVal('back','w')}  ·  OTR ${this._getBarrierVal('back','o')}`;
  },

  // ------------------------------------------------------------------
  // LOCATION & OFFICIAL CLIMATE  (NASA POWER + ERA5 via Open-Meteo)
  // ------------------------------------------------------------------
  _renderCityQuickList() { this._populateCities(); },

  quickPickCity(idx) {
    if(idx==='') return;
    const c=PV_CITIES[+idx]; if(!c) return;
    this._setLocation(c[0],c[1],c[2]);
  },

  onCitySearchInput(q) {
    clearTimeout(this._searchTimer);
    const box=document.getElementById('pv-city-results');
    if(!q||q.trim().length<2){if(box)box.style.display='none';return;}
    this._searchTimer = setTimeout(()=>this._geocode(q.trim()), 350);
  },

  async _geocode(q) {
    const box=document.getElementById('pv-city-results'); if(!box) return;
    box.style.display='block';
    box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">Searching…</div>';
    try {
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
      const j=await r.json();
      const res=j.results||[];
      if(!res.length){box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">No results.</div>';return;}
      box.innerHTML = res.map(r2=>{
        const lbl=[r2.name,r2.admin1,r2.country].filter(Boolean).join(', ');
        return `<div style="padding:.45rem .6rem;cursor:pointer;font-size:.78rem;border-bottom:1px solid var(--border)"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
          onclick="PV._setLocation('${lbl.replace(/'/g,"\\'")}',${r2.latitude},${r2.longitude})"
          >${lbl} <span style="color:var(--text-light)">(${r2.latitude.toFixed(2)}, ${r2.longitude.toFixed(2)})</span></div>`;
      }).join('');
    } catch(e) {
      box.innerHTML='<div style="padding:.5rem;font-size:.78rem;color:var(--danger)">Search failed (network). Use manual coords.</div>';
    }
  },

  useManualCoords() {
    const lat=parseFloat(document.getElementById('pv-lat')?.value);
    const lon=parseFloat(document.getElementById('pv-lon')?.value);
    if(isNaN(lat)||isNaN(lon)){alert('Enter valid lat/lon.');return;}
    this._setLocation(`Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`,lat,lon);
  },

  _setLocation(name,lat,lon) {
    this._loc={name,lat,lon};
    const box=document.getElementById('pv-city-results'); if(box) box.style.display='none';
    const li=document.getElementById('pv-lat'),lo=document.getElementById('pv-lon');
    if(li) li.value=lat.toFixed(4); if(lo) lo.value=lon.toFixed(4);
    const nl=document.getElementById('pv-loc-name'); if(nl) nl.textContent=name;
    this.fetchOfficialClimate();
  },

  async fetchOfficialClimate() {
    if(!this._loc){alert('Select a location first.');return;}
    const st=document.getElementById('pv-climate-status');
    const setS=(m,c)=>{if(st){st.textContent=m;st.style.color=c||'var(--text-light)';}};
    setS('Fetching official climate data…');
    const {lat,lon}=this._loc;
    let annualT=null,annualRH=null,annualG=null,monthly=[],source='';

    // 1) NASA POWER climatology (official NASA Langley, 20-yr MERRA-2)
    try {
      const url=`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
      const j=await (await fetch(url)).json();
      const T=j.properties.parameter.T2M, RH=j.properties.parameter.RH2M;
      const G=j.properties.parameter.ALLSKY_SFC_SW_DWN;
      const MS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      monthly=MS.map(m=>({m,t:T[m],rh:RH[m],g:G?G[m]:null}));
      annualT=T.ANN??monthly.reduce((a,b)=>a+b.t,0)/12;
      annualRH=RH.ANN??monthly.reduce((a,b)=>a+b.rh,0)/12;
      annualG=G?(G.ANN??monthly.reduce((a,b)=>a+(b.g||0),0)/12):180;
      source='NASA POWER (20-yr MERRA-2 climatology)';
    } catch(e){source='';}

    // 2) ERA5 hourly diurnal cycle (ECMWF/Copernicus via Open-Meteo)
    try {
      const end=new Date(Date.now()-10*864e5), start=new Date(end.getTime()-365*864e5);
      const fmt=d=>d.toISOString().slice(0,10);
      const url=`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`;
      const j=await (await fetch(url)).json();
      const times=j.hourly.time,Ts=j.hourly.temperature_2m,RHs=j.hourly.relative_humidity_2m;
      const sT=new Array(24).fill(0),sRH=new Array(24).fill(0),cnt=new Array(24).fill(0);
      let gT=0,gRH=0,gN=0;
      for(let i=0;i<times.length;i++){
        if(Ts[i]==null||RHs[i]==null)continue;
        const h=parseInt(times[i].slice(11,13),10);
        sT[h]+=Ts[i];sRH[h]+=RHs[i];cnt[h]++;gT+=Ts[i];gRH+=RHs[i];gN++;
      }
      this._diurnal={hours:[...Array(24).keys()],T:sT.map((v,h)=>cnt[h]?v/cnt[h]:null),RH:sRH.map((v,h)=>cnt[h]?v/cnt[h]:null),source:'ERA5 (ECMWF/Copernicus via Open-Meteo)'};
      if(!annualT&&gN){annualT=gT/gN;annualRH=gRH/gN;source='ERA5 reanalysis (ECMWF/Copernicus)';}
    } catch(e){this._diurnal=null;}

    if(annualT==null){setS('Could not reach data sources. Enter T and RH manually.','var(--danger)');return;}
    this._climate={annualT,annualRH,annualG:annualG||180,monthly,source};
    const te=document.getElementById('pv-tamb'),re=document.getElementById('pv-rh');
    if(te) te.value=annualT.toFixed(1); if(re) re.value=annualRH.toFixed(0);
    setS(`✓ ${source}  ·  T ≈ ${annualT.toFixed(1)} °C, RH ≈ ${annualRH.toFixed(0)} %`,'var(--success)');
  },

  // ------------------------------------------------------------------
  // SIMULATION BRIDGE  →  window.MoistureEngine
  // ------------------------------------------------------------------
  _buildConfig() {
    const Tair=parseFloat(document.getElementById('pv-tamb')?.value);
    const RH=parseFloat(document.getElementById('pv-rh')?.value);
    if(isNaN(Tair)||isNaN(RH)) return null;
    const wF=this._getBarrierVal('front','w'), oF=this._getBarrierVal('front','o');
    const wB=this._getBarrierVal('back','w'),  oB=this._getBarrierVal('back','o');
    const edgeKey=document.getElementById('pv-edge')?.value||'pib';
    const ep=PV_EDGES[edgeKey];
    const ef=parseFloat(document.getElementById('pv-edgefactor')?.value)||6;
    const encType=document.getElementById('pv-encap-type')?.value||'eva';
    const encThick=parseFloat(document.getElementById('pv-encap-thick')?.value)||0.5;
    const L=Math.max(0.1,parseFloat(document.getElementById('pv-len')?.value)||1.6);
    const W=Math.max(0.1,parseFloat(document.getElementById('pv-wid')?.value)||1.0);
    const G=this._climate?.annualG||180;
    const uvF=parseFloat(document.getElementById('pv-uvfrac')?.value)||0.05;
    const techKey=document.getElementById('pv-tech')?.value||'perovskite';
    return {
      tech:techKey,
      front:{ wvtr:wF, Tt:38, RHt:90, otr:oF, OTt:23, O2t:100 },
      back: { wvtr:wB, Tt:38, RHt:90, otr:oB, OTt:23, O2t:100 },
      encap:{ type:encType, thickMm:encThick },
      geom: { L, W },
      edge: { D:ep.d/8766, Q:ep.Q, gSeal:ep.gSeal, edgeFactor:ef }, // D: mm²/yr→mm²/h
      env:  { Tair, RH, G, uvFraction:uvF },
      tDelta:18,
      horizonH:this.HORIZON_YR*24*365.25,
      steps:4000
    };
  },

  simulate() {
    if(typeof window.MoistureEngine==='undefined'){
      console.error('MoistureEngine not loaded — add moisture-engine-v3.js before pv-module.js'); return null;
    }
    const cfg=this._buildConfig(); if(!cfg) return null;
    const raw=window.MoistureEngine.simulate(cfg);
    const Y=24*365.25;
    let acc=0,n=0;
    raw.series.forEach(p=>{ if(p.t<=25*Y){acc+=p.ret;n++;} });
    const series=raw.series.map(p=>({...p, t:p.t/Y}));
    return {
      t80:raw.t80?raw.t80/Y:null, t90:raw.t90?raw.t90/Y:null, t97:raw.t97?raw.t97/Y:null,
      series, tBreak:raw.tBreak?raw.tBreak/Y:null,
      channelFractions:raw.channelFractions,
      Tamb:cfg.env.Tair, Tmod:cfg.env.Tair+18, rhFrac:cfg.env.RH/100,
      L:cfg.geom.L, W:cfg.geom.W, wFront:cfg.front.wvtr, wBack:cfg.back.wvtr,
      edgeD:PV_EDGES[document.getElementById('pv-edge')?.value||'pib'].d, // mm²/yr for map
      edgeQ:cfg.edge.Q, sealW:parseFloat(document.getElementById('pv-seal')?.value)||8,
      yield25:n?acc/n:1
    };
  },

  // ------------------------------------------------------------------
  // CALCULATE & RENDER
  // ------------------------------------------------------------------
  calculate() {
    const sim=this.simulate();
    if(!sim){alert('Set temperature and RH (fetch official data or enter manually).');return;}
    this._lastSim=sim;
    this._renderResult(sim);
  },

  onYearChange() {
    if(!this._lastSim) return;
    const sim=this._lastSim;
    const yr=parseFloat(document.getElementById('pv-year')?.value||10);
    const p=this._sample(sim.series,yr);
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('pv-rhcell',(p.RHint*100).toFixed(0)+' %');
    const yv=document.getElementById('pv-year-val'); if(yv) yv.textContent=yr.toFixed(yr%1?1:0)+' yr';
    this._drawDegradation(sim,yr);
    this._drawDailyExchange(sim,yr);
    this._drawMap(sim,yr);
  },

  _fmt(v){ if(v===null) return '>'+this.HORIZON_YR; return v<1?(v*12).toFixed(1).replace(/\.0$/,''):v.toFixed(1); },
  _unit(v){ return v!==null&&v<1?'months':'years'; },
  _sample(series,yr){ if(!series||!series.length) return{t:0,ret:1,RHint:0,I:0}; let b=series[0],bd=Math.abs(series[0].t-yr); for(const p of series){const d=Math.abs(p.t-yr);if(d<bd){bd=d;b=p;}} return b; },

  _renderResult(sim) {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('pv-t80',this._fmt(sim.t80)); set('pv-t80u',this._unit(sim.t80));
    set('pv-t90',this._fmt(sim.t90)); set('pv-t90u',this._unit(sim.t90));
    set('pv-t97',this._fmt(sim.t97)); set('pv-t97u',this._unit(sim.t97));

    // channel fractions
    if(sim.channelFractions) {
      const cf=sim.channelFractions;
      set('pv-ch-moisture',cf.moisture); set('pv-ch-oxygen',cf.oxygen);
      set('pv-ch-thermal',cf.thermal);   set('pv-ch-uv',cf.uv);
      const cbox=document.getElementById('pv-channels'); if(cbox) cbox.style.display='block';
    }

    const cont=document.getElementById('pv-charts'); if(cont) cont.style.display='block';
    const yr=parseFloat(document.getElementById('pv-year')?.value||10);
    const p=this._sample(sim.series,yr);
    set('pv-rhcell',(p.RHint*100).toFixed(0)+' %');
    set('pv-tmod',sim.Tmod.toFixed(0)+' °C');
    set('pv-yield',(sim.yield25*100).toFixed(1)+' %');
    const yv=document.getElementById('pv-year-val'); if(yv) yv.textContent=yr.toFixed(yr%1?1:0)+' yr';
    requestAnimationFrame(()=>setTimeout(()=>{
      this._drawDegradation(sim,yr);
      this._drawDailyExchange(sim,yr);
      this._drawMonthly();
      this._drawMap(sim,yr);
    },80));
  },

  // ------------------------------------------------------------------
  // CHARTS
  // ------------------------------------------------------------------
  _drawDegradation(sim,yr) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvDeg');
    const ctx=document.getElementById('pvDegChart')?.getContext('2d'); if(!ctx) return;
    const step=Math.max(1,Math.ceil(sim.series.length/400));
    const lab=[],dat=[];
    for(let i=0;i<sim.series.length;i+=step){lab.push(sim.series[i].t.toFixed(1));dat.push(sim.series[i].ret*100);}
    if(!window.chartInstances) window.chartInstances={};
    window.chartInstances.pvDeg=new Chart(ctx,{
      type:'line',
      data:{labels:lab,datasets:[
        {label:'PCE retention (%)',data:dat,borderColor:'#0a4f63',backgroundColor:'rgba(15,138,140,0.12)',fill:true,tension:0.3,pointRadius:0,borderWidth:2.4},
        {label:'T80',data:new Array(lab.length).fill(80),borderColor:'#0f8a8c',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false},
        {label:'T90',data:new Array(lab.length).fill(90),borderColor:'#c9971f',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}}},
        scales:{x:{title:{display:true,text:'Years'},ticks:{maxTicksLimit:9,font:{size:9}}},
                y:{min:0,max:100,title:{display:true,text:'Retention %'},ticks:{callback:v=>v+'%',font:{size:9}}}}}
    });
  },

  _drawDailyExchange(sim,yr) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvDay');
    const ctx=document.getElementById('pvDayChart')?.getContext('2d'); if(!ctx) return;
    const Psat=T=>610.94*Math.exp((17.625*T)/(T+243.04));
    const prof=this._diurnal&&this._diurnal.T.some(v=>v!=null)?this._diurnal:{hours:[...Array(24).keys()],T:[...Array(24).keys()].map(h=>sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)),RH:[...Array(24).keys()].map(h=>Math.min(98,Math.max(10,sim.rhFrac*100-2.2*(sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)-sim.Tamb)))),source:'Synthetic'};
    const p=this._sample(sim.series,yr);
    const intRH=p.RHint*100;
    const Kfaces=(sim.wFront+sim.wBack)/(24*(0.9*Psat(38))); // rough permeance
    const dPref=0.9*Psat(23)*1000;
    const flux=[],extRH=[];
    for(let h=0;h<24;h++){
      const Th=prof.T[h]??sim.Tamb, RHh=prof.RH[h]??(sim.rhFrac*100);
      const Tm=Th+18;
      const pExt=(RHh/100)*Psat(Tm)*1000, pInt=(intRH/100)*Psat(Tm)*1000;
      flux.push(parseFloat((Kfaces*(pExt-pInt)/dPref).toFixed(4)));
      extRH.push(parseFloat(RHh.toFixed(1)));
    }
    if(!window.chartInstances) window.chartInstances={};
    window.chartInstances.pvDay=new Chart(ctx,{
      type:'line',
      data:{labels:[...Array(24).keys()].map(h=>h+':00'),datasets:[
        {label:'Net moisture flux  (+in / −out)',data:flux,yAxisID:'y',borderColor:'#0a4f63',borderWidth:2,tension:0.35,pointRadius:0,
         fill:{target:{value:0}},segment:{backgroundColor:c=>c.p0.parsed.y>=0?'rgba(15,138,140,0.22)':'rgba(217,98,43,0.20)'},backgroundColor:'rgba(15,138,140,0.18)'},
        {label:`External RH (%)  — ${prof.source}`,data:extRH,yAxisID:'y1',borderColor:'#c9971f',borderWidth:1.5,borderDash:[4,3],tension:0.35,pointRadius:0,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:9}}}},
        scales:{x:{ticks:{maxTicksLimit:12,font:{size:8}}},
                y:{title:{display:true,text:'Flux (a.u.)'}},
                y1:{position:'right',min:0,max:100,title:{display:true,text:'RH %'},grid:{drawOnChartArea:false}}}}
    });
  },

  _drawMonthly() {
    if(typeof Chart==='undefined'||!this._climate?.monthly?.length) return;
    if(typeof destroyChart==='function') destroyChart('pvMon');
    const ctx=document.getElementById('pvMonChart')?.getContext('2d'); if(!ctx) return;
    const m=this._climate.monthly;
    if(!window.chartInstances) window.chartInstances={};
    window.chartInstances.pvMon=new Chart(ctx,{
      type:'bar',
      data:{labels:m.map(x=>x.m),datasets:[
        {label:'Temp (°C)',data:m.map(x=>x.t),backgroundColor:'rgba(217,98,43,0.7)',yAxisID:'y'},
        {label:'RH (%)',data:m.map(x=>x.rh),backgroundColor:'rgba(15,138,140,0.6)',yAxisID:'y1'}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:9}}}},
        scales:{y:{position:'left',title:{display:true,text:'°C'}},
                y1:{position:'right',min:0,max:100,title:{display:true,text:'RH %'},grid:{drawOnChartArea:false}}}}
    });
  },

  _colorFor(x){ x=Math.min(1,Math.max(0,x)); const s=[[0,[240,236,224]],[0.5,[15,138,140]],[1,[10,57,79]]]; let a=s[0],b=s[2]; for(let i=0;i<2;i++)if(x>=s[i][0]&&x<=s[i+1][0]){a=s[i];b=s[i+1];break;} const f=(x-a[0])/((b[0]-a[0])||1); return `rgb(${Math.round(a[1][0]+(b[1][0]-a[1][0])*f)},${Math.round(a[1][1]+(b[1][1]-a[1][1])*f)},${Math.round(a[1][2]+(b[1][2]-a[1][2])*f)})`; },

  _drawMap(sim,yr) {
    const cv=document.getElementById('pvMapCanvas'); if(!cv) return;
    const dpr=window.devicePixelRatio||1, cw=cv.clientWidth||360, ch=220;
    cv.width=cw*dpr; cv.height=ch*dpr;
    const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cw,ch);
    const pad=10, asp=sim.L/sim.W;
    let dw=cw-2*pad, dh=dw/asp; if(dh>ch-2*pad){dh=ch-2*pad;dw=dh*asp;}
    const ox=(cw-dw)/2, oy=(ch-dh)/2;
    const p=this._sample(sim.series,yr);
    // Edge front in metres (D in mm²/yr)
    const lag=sim.edgeQ>0?5:0;
    const frontM=Math.max(0,Math.sqrt(sim.edgeD*Math.max(yr-lag,0)))/1000;
    const cols=70, rows=Math.max(8,Math.round(cols/asp));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const fx=((c+0.5)/cols)*sim.L, fy=((r+0.5)/rows)*sim.W;
      const dEdge=Math.min(fx,sim.L-fx,fy,sim.W-fy);
      let lE=0; if(frontM>0&&dEdge<frontM) lE=1-dEdge/frontM;
      const wet=sim.rhFrac*(1-(1-p.RHint/sim.rhFrac)*(1-lE));
      ctx.fillStyle=this._colorFor(wet);
      ctx.fillRect(ox+c*(dw/cols),oy+r*(dh/rows),dw/cols+0.6,dh/rows+0.6);
    }
    ctx.strokeStyle='#16211d'; ctx.lineWidth=1.5; ctx.strokeRect(ox,oy,dw,dh);
    ctx.fillStyle='#5a665f'; ctx.font='10px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(`${sim.L.toFixed(2)} × ${sim.W.toFixed(2)} m`, ox, oy+dh+5);
  }
};

// ====================================================================
// RENDER
// ====================================================================
function renderPVDegradation() {
  const techOpts = typeof window.MoistureEngine!=='undefined'
    ? Object.entries(window.MoistureEngine.PV_TECH_DB).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')
    : '<option value="perovskite">Perovskite</option><option value="cigs">CIGS</option><option value="csi">c-Si</option>';
  const encOpts = typeof window.MoistureEngine!=='undefined' && window.MoistureEngine.ENCAPSULANT_DB
    ? Object.entries(window.MoistureEngine.ENCAPSULANT_DB).filter(([k])=>k!=='none').map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')
    : '<option value="eva">EVA</option><option value="poe">POE</option><option value="tpu">TPU</option><option value="pvb">PVB</option>';

  return `
  <style>
    #pvroot .pv-s{padding:1rem;border-bottom:1px solid var(--border)}
    #pvroot .pv-h{display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;color:var(--primary);font-weight:600;font-size:.85rem}
    #pvroot .ro{border:1px solid var(--border);border-radius:8px;padding:.8rem;background:#fff;position:relative;overflow:hidden}
    #pvroot .ro::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--primary)}
    #pvroot .ro.t90::before{background:var(--warning)}
    #pvroot .ro.t97::before{background:#d9622b}
    #pvroot .ro .k{font-size:.7rem;letter-spacing:.08em;color:var(--text-light);text-transform:uppercase;font-weight:600}
    #pvroot .ro .v{font-size:1.8rem;font-weight:800;line-height:1;margin-top:.3rem;color:var(--primary)}
    #pvroot .ro .u{font-size:.7rem;color:var(--text-light)}
    #pvroot .ch-row{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-top:.6rem}
    #pvroot .ch{font-size:.75rem;text-align:center;padding:.4rem;background:var(--bg);border-radius:4px}
    #pvroot .ch .cv{font-weight:700;font-size:.95rem}
    #pvroot canvas{display:block;width:100%}
  </style>

  <div id="pvroot" class="grid grid-2" style="gap:1.2rem;align-items:start">

    <!-- ===== INPUT ===== -->
    <div class="card" style="padding:0">
      <div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1rem">PV Module Lifetime Simulator</h2>
        <div style="font-size:.72rem;color:var(--text-light);margin-top:.2rem">
          Moisture &amp; O₂ ingress · GAB isotherm · multi-channel degradation · official climate data
        </div>
      </div>

      <!-- 1. LOCATION -->
      <div class="pv-s">
        <div class="pv-h">▼ 1. Location &amp; official climate</div>
        <div class="form-group" style="margin:0;position:relative">
          <label>Search any city worldwide</label>
          <input type="text" class="form-input" placeholder="Type city name…" autocomplete="off"
            oninput="PV.onCitySearchInput(this.value)">
          <div id="pv-city-results" style="display:none;position:absolute;z-index:20;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:200px;overflow:auto;margin-top:2px"></div>
        </div>
        <div class="form-group" style="margin:.5rem 0 0">
          <label>Quick pick</label>
          <select class="form-input" id="pv-city-quick" onchange="PV.quickPickCity(this.value)"></select>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
          <div class="form-group" style="margin:0"><label>Latitude</label><input type="number" id="pv-lat" class="form-input" step=".0001" placeholder="e.g. 41.90"></div>
          <div class="form-group" style="margin:0"><label>Longitude</label><input type="number" id="pv-lon" class="form-input" step=".0001" placeholder="e.g. 12.50"></div>
        </div>
        <button class="btn btn-sm btn-outline btn-full" style="margin-top:.5rem;font-size:.78rem" onclick="PV.useManualCoords()">Use coordinates &amp; fetch official data</button>
        <div style="margin-top:.6rem;background:var(--primary-light);border-radius:6px;padding:.5rem .7rem;font-size:.75rem">
          <div style="font-weight:700" id="pv-loc-name">No location selected</div>
          <div id="pv-climate-status" style="color:var(--text-light);margin-top:.2rem">Pick a location to load NASA POWER + ERA5 data.</div>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
          <div class="form-group" style="margin:0"><label>Mean air T (°C)</label><input type="number" id="pv-tamb" class="form-input" value="20" step=".5"></div>
          <div class="form-group" style="margin:0"><label>Mean RH (%)</label><input type="number" id="pv-rh" class="form-input" value="70" step="1"></div>
        </div>
      </div>

      <!-- 2. CELL TECHNOLOGY -->
      <div class="pv-s">
        <div class="pv-h">▼ 2. Cell technology</div>
        <div class="form-group" style="margin:0">
          <label>Cell type</label>
          <select id="pv-tech" class="form-input">${techOpts}</select>
        </div>
      </div>

      <!-- 3. ENCAPSULATION -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--warning)">▼ 3. Encapsulation stack</div>
        <div class="form-group" style="margin:0">
          <label>Front cover <span style="font-size:.68rem;color:var(--text-light)">(WVTR · OTR — from presets or your DB)</span></label>
          <select id="pv-front" class="form-input" onchange="PV.onCoverChange()"></select>
          <div id="pv-front-manual" style="display:none;margin-top:.4rem"><input type="number" id="pv-front-manual-val" class="form-input" placeholder="WVTR g/m²·day" step="any" oninput="PV._updateBarrierSummary()"></div>
        </div>
        <div class="form-group" style="margin:.5rem 0 0">
          <label>Back cover <span style="font-size:.68rem;color:var(--text-light)">(WVTR · OTR)</span></label>
          <select id="pv-back" class="form-input" onchange="PV.onCoverChange()"></select>
          <div id="pv-back-manual" style="display:none;margin-top:.4rem"><input type="number" id="pv-back-manual-val" class="form-input" placeholder="WVTR g/m²·day" step="any" oninput="PV._updateBarrierSummary()"></div>
        </div>
        <div class="form-group" style="margin:.5rem 0 0">
          <label>Edge seal</label>
          <select id="pv-edge" class="form-input"></select>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
          <div class="form-group" style="margin:0">
            <label>Edge factor <span style="font-size:.68rem;color:var(--text-light)">(lit. range 2–20)</span></label>
            <input type="number" id="pv-edgefactor" class="form-input" value="6" step="0.5" min="1" max="50">
          </div>
          <div class="form-group" style="margin:0">
            <label>UV fraction <span style="font-size:.68rem;color:var(--text-light)">(UV/total irr.)</span></label>
            <input type="number" id="pv-uvfrac" class="form-input" value="0.05" step=".01" min=".01" max=".15">
          </div>
        </div>
        <div style="margin-top:.5rem;background:var(--primary-light);border-radius:6px;padding:.4rem .7rem;font-size:.7rem">
          <span style="font-weight:600">Active barrier: </span>
          <span id="pv-barrier-summary" style="color:var(--primary)">—</span>
        </div>
      </div>

      <!-- 4. ENCAPSULANT (for GAB isotherm) -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--purple)">▼ 4. Encapsulant (GAB isotherm)</div>
        <div class="grid grid-2" style="gap:.5rem">
          <div class="form-group" style="margin:0">
            <label>Type</label>
            <select id="pv-encap-type" class="form-input">${encOpts}</select>
          </div>
          <div class="form-group" style="margin:0">
            <label>Thickness <span style="font-size:.68rem;color:var(--text-light)">mm/side</span></label>
            <input type="number" id="pv-encap-thick" class="form-input" value="0.5" step=".1" min=".1">
          </div>
        </div>
      </div>

      <!-- 5. GEOMETRY -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--primary)">▼ 5. Module geometry</div>
        <div class="grid grid-2" style="gap:.5rem">
          <div class="form-group" style="margin:0"><label>Length (m)</label><input type="number" id="pv-len" class="form-input" value="1.6" step=".1"></div>
          <div class="form-group" style="margin:0"><label>Width (m)</label><input type="number" id="pv-wid" class="form-input" value="1.0" step=".1"></div>
          <div class="form-group" style="margin:0"><label>Edge seal width (mm)</label><input type="number" id="pv-seal" class="form-input" value="8" step="1"></div>
        </div>
      </div>

      <!-- 6. CALCULATE -->
      <div style="padding:1rem">
        <button class="btn btn-danger btn-full" onclick="PV.calculate()" style="padding:.8rem;font-size:.9rem">▶ Calculate Lifetime</button>
      </div>
    </div>

    <!-- ===== RESULTS ===== -->
    <div style="position:sticky;top:1rem;height:fit-content">

      <!-- T80/90/97 -->
      <div class="card">
        <div class="grid grid-3" style="gap:.7rem">
          <div class="ro t80"><div class="k">T80</div><div class="v" id="pv-t80">–</div><div class="u"><span id="pv-t80u">years</span> → 80% PCE</div></div>
          <div class="ro t90"><div class="k">T90</div><div class="v" id="pv-t90">–</div><div class="u"><span id="pv-t90u">years</span> → 90% PCE</div></div>
          <div class="ro t97"><div class="k">T97</div><div class="v" id="pv-t97">–</div><div class="u"><span id="pv-t97u">years</span> → 97% PCE</div></div>
        </div>

        <!-- Channel fractions (multi-channel breakdown) -->
        <div id="pv-channels" style="display:none;margin-top:.8rem">
          <div style="font-size:.7rem;color:var(--text-light);font-weight:600;margin-bottom:.3rem">Degradation channels</div>
          <div class="ch-row">
            <div class="ch"><div style="color:var(--primary)">Moisture</div><div class="cv" id="pv-ch-moisture">–</div></div>
            <div class="ch"><div style="color:var(--warning)">O₂</div><div class="cv" id="pv-ch-oxygen">–</div></div>
            <div class="ch"><div style="color:#d9622b">Thermal</div><div class="cv" id="pv-ch-thermal">–</div></div>
            <div class="ch"><div style="color:#8b5cf6">UV</div><div class="cv" id="pv-ch-uv">–</div></div>
          </div>
        </div>

        <div class="grid grid-3" style="gap:.7rem;margin-top:.8rem;font-size:.8rem">
          <div><div style="color:var(--text-light);font-size:.7rem">RH at cell (yr sel.)</div><strong id="pv-rhcell">–</strong></div>
          <div><div style="color:var(--text-light);font-size:.7rem">Module temp</div><strong id="pv-tmod">–</strong></div>
          <div><div style="color:var(--text-light);font-size:.7rem">Yield (25 yr)</div><strong id="pv-yield">–</strong></div>
        </div>
      </div>

      <!-- Charts -->
      <div id="pv-charts" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.4rem">PCE retention over time</h3>
          <div style="height:240px"><canvas id="pvDegChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.15rem">Daily moisture exchange (in / out)</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">Teal = humidity entering · Amber = humidity leaving the module</div>
          <div style="height:230px"><canvas id="pvDayChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.4rem">Monthly climate — NASA POWER official</h3>
          <div style="height:200px"><canvas id="pvMonChart"></canvas></div>
        </div>
        <div class="card">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.4rem">Moisture map at cell plane</h3>
          <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.5rem">
            <span style="font-size:.75rem;color:var(--text-light)">Year</span>
            <input type="range" id="pv-year" min="0" max="40" value="10" step=".5"
              style="flex:1;accent-color:var(--primary)" oninput="PV.onYearChange()">
            <strong id="pv-year-val" style="font-size:.8rem;color:var(--primary);min-width:50px;text-align:right">10 yr</strong>
          </div>
          <canvas id="pvMapCanvas" style="width:100%;display:block"></canvas>
        </div>
      </div>
    </div>
  </div>

  ${renderPVMethodology()}

  <script>
    if(typeof PV!=='undefined') setTimeout(function(){PV.init();},60);
  </script>`;
}

// ====================================================================
function renderPVMethodology() {
return `
<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary)">
<div style="padding:1.2rem 1.5rem">
<h2 style="font-family:Georgia,serif;font-size:1.25rem;border-bottom:1px solid var(--border);padding-bottom:.5rem;margin-bottom:1rem">
How the lifetime model works
</h2>
<div style="font-size:.92rem;line-height:1.75;color:#334155;font-family:Georgia,serif">

<p>Next-generation cells — perovskite, CIGS, CdTe, OPV — degrade when water vapour and oxygen reach the active layer. The engine combines the WVTR/OTR permeance values from your calculator with cell-specific degradation kinetics to predict service life.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">Three ingress pathways</h3>
<div style="background:#f8fafc;padding:.9rem;border-radius:6px;font-family:monospace;font-size:.85rem;border:1px dashed var(--border);margin:.75rem 0">
Faces (1-D): permeance K = WVTR/Δp(test) × Arrhenius(T)<br>
Edge (2-D):  front x(t) = √(D·t)  after desiccant capacity Q is consumed<br>
Combined RH at cell via GAB sorption isotherm (not a simple linear buffer)
</div>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">WVTR is not fundamental</h3>
<p>A rated value of 0.01 g/m²/day at 38 °C/90 % RH is not the same as 0.01 at 25 °C/60 % RH. The engine converts each barrier to a permeance K = WVTR/Δp(test conditions) and re-evaluates it at the actual service temperature and humidity using an Arrhenius correction.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">Moisture inventory + GAB isotherm</h3>
<p>Internal RH is derived from a mass balance: dI/dt = J_in − J_out (g/m²/h). The accumulated water I is converted to internal RH via the GAB sorption isotherm of the encapsulant (EVA, POE, TPU, PVB each have different absorption characteristics). This is the same equation used in the Shelf Life module for food packaging.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">The O₂ channel — the killer combination</h3>
<p>Perovskite and OPV degrade from both moisture and oxygen. The engine adds an OTR-driven degradation channel alongside moisture, thermal, and UV. A module with a good WVTR barrier but a poor OTR barrier can see T80 drop by up to 10× — a scenario invisible to WVTR-only tools.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">Official weather data</h3>
<p style="margin-left:1rem;color:var(--text-light);font-family:sans-serif;font-size:.85rem">
• NASA POWER (NASA Langley) — 20-year MERRA-2 climatology: monthly T, RH, irradiance.<br>
• ERA5 reanalysis (ECMWF/Copernicus via Open-Meteo) — hourly T and RH averaged per hour-of-day → diurnal breathing cycle.<br>
• Geocoding: Open-Meteo global search (any city worldwide).
</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.25rem">Cell sensitivities — anchored to literature</h3>
<p style="margin-left:1rem;color:var(--text-light);font-family:sans-serif;font-size:.85rem">
• Perovskite: Tsuji 2024 (Materials 17, 3002) — bare T80 16–125 h; well-encapsulated T80 > 5000 h.<br>
• CIGS: Coyle 2013 (Prog. PV) — life prediction model; BET moisture kinetics; damp-heat/Miami accel. 15–50×.<br>
• c-Si: Jordan &amp; Kurtz 2016 (Compendium, Prog. PV 24) — median 0.5–0.6 %/yr field degradation.
</p>

<div style="margin-top:1.5rem;padding:.8rem;background:var(--bg);border-radius:6px;font-size:.82rem;color:var(--text-light);border-left:3px solid var(--warning);font-family:sans-serif">
<strong>Model disclaimer.</strong> Degradation coefficients are illustrative screening values calibrated against published data and must be re-fitted on measured damp-heat / ISOS results before any decision-grade use. This module is intended for R&amp;D concept comparison, not product certification.
</div>

</div>
</div>
</div>`;
}

// ---- browser export ----
if(typeof window!=='undefined'){
  window.PV=PV;
  window.renderPVDegradation=renderPVDegradation;
  window.renderPVMethodology=renderPVMethodology;
}// Solve GAB for water activity aw given moisture content M [g/g]; bisection
function solveGAB(M, gab) {
  if (!gab || M <= 0) return 0;
  let lo = 0.001, hi = 0.999;
  for (let i = 0; i < 60; i++) {
    const aw = (lo + hi) / 2;
    const denom = (1 - gab.K * aw) * (1 - gab.K * aw + gab.C * gab.K * aw);
    if (denom <= 0) break;
    const Mc = gab.Mm * gab.C * gab.K * aw / denom;
    (Mc < M) ? (lo = aw) : (hi = aw);
  }
  return (lo + hi) / 2;
}

// encapsulant mass per m² (g/m²) from thickness (mm) and type
function encMass(type, thickMm) {
  const e = ENCAPSULANT_DB[type] || ENCAPSULANT_DB.eva;
  return e.rho * thickMm;          // ρ [g/m³ * mm → 1000 * g/cm³ * mm/10] = ρ[g/cm³]*100*mm = ρ*thickMm*1000/10 ... 
  // Actually: rho [g/cm³], thick [mm] → mass = rho [g/cm³] * thick [mm] * 0.1 [cm/mm] * 10000 [cm²/m²] = rho*thick*1000 [g/m²]
}
// Fix: rho in g/cm³, thick in mm
function encMassG(type, thickMm) {
  const e = ENCAPSULANT_DB[type] || ENCAPSULANT_DB.eva;
  return e.rho * thickMm * 100;    // g/cm³ × mm × (10mm/cm) × (1cm²/(100mm²)) × 10000mm²/m² = rho*thickMm*100
}

// ================================================================
// BARRIER — WVTR or OTR — normalised to permeance
// ================================================================
// val: barrier value at test conditions
//   WVTR: g/m²/day @(Ttest°C, RHtest%RH)  — standard 38°C/90%RH
//   OTR:  cc/m²/day @(Ttest°C, 100%O2)    — standard ASTM D3985 23°C/100%O2
function makeBarrier(val, Ttest, RHorO2frac, EaPerm, type) {
  EaPerm = EaPerm != null ? EaPerm : (type === 'otr' ? 30000 : 30000);
  const isOTR = (type === 'otr');
  const pTest = isOTR
    ? (RHorO2frac / 100) * P_ATM           // e.g. 100% O2 -> 101325 Pa
    : (RHorO2frac / 100) * Psat(Ttest);    // water vapour partial pressure at test
  const K_day = val / Math.max(pTest, 1e-9);   // g/(m²·day·Pa) or cc/(m²·day·Pa)
  const K_h   = K_day / 24;
  return {
    val, Ttest, EaPerm, type: type||'wvtr',
    K(T) { return K_h * Math.exp(-EaPerm / R * (1/(T+273.15) - 1/(Ttest+273.15))); }
  };
}

// ================================================================
// (2) CELL TECHNOLOGY DATABASE
// ================================================================
// k_m : moisture degradation [/h at RH=1, Tref]
// k_o2: oxidative degradation [/h per (cc/m²/h) of O2 flux]; for O2+H2O synergy
// k_syn: synergistic H2O×O2 factor [/h per (RH_int × J_O2_normalised)]
// k_t : thermal degradation [/h at Tref, no moisture/O2]
// k_uv: UV degradation [/h per unit (G_UV/1000)]  — G_UV = G × uvFraction
// Sources cited. All values screening-grade; refit using benchmark() → fitTech().
const PV_TECH_DB = {
  perovskite: {
    name:"Perovskite", k_m:3.6e-4, Ea_m:40000,
    k_o2:8e-7, Ea_o2:35000, k_syn:2e-9,
    k_t:2.2e-7, Ea_t:80000, k_uv:6e-6,
    source:"Tsuji 2024 (Materials 17,3002); Mariotti 2025 (WVTR 0.005→4200h DH); " +
           "Jeong/Emery 2024 (Nat.Commun, RSC EES): pass IEC 61215 DH 1000h encapsulated. " +
           "O2 channel: perovskite superoxide formation (Aristidou 2017 Nat.Commun)."
  },
  opv: {
    name:"Organic (OPV)", k_m:1.8e-4, Ea_m:38000,
    k_o2:4e-6, Ea_o2:32000, k_syn:6e-9,
    k_t:1.5e-7, Ea_t:70000, k_uv:2.2e-5,
    source:"Kettle 2022 (Prog.PV 30): moisture+O2+UV all critical for OPV; " +
           "k_uv elevated because photobleaching is a major degradation mode."
  },
  cigs: {
    name:"CIGS", k_m:7e-5, Ea_m:55000,
    k_o2:3e-7, Ea_o2:40000, k_syn:5e-10,
    k_t:8e-8, Ea_t:70000, k_uv:3e-6,
    source:"Coyle 2013 (Prog.PV, Life Prediction CIGS): moisture-ingress kinetics, DH/Miami accel 15-50x. " +
           "Shell minimodules >50% loss 168h bare (Kempe docs); ALD 3% loss 1000h; B-Dry >3000h."
  },
  cdte: {
    name:"CdTe", k_m:6e-5, Ea_m:60000,
    k_o2:8e-8, Ea_o2:40000, k_syn:1e-10,
    k_t:7e-8, Ea_t:70000, k_uv:3e-6,
    source:"Kettle 2022; DH study: frameless CdTe + edge sealant ~98% at 2000h (lag-time property)."
  },
  csi: {
    name:"Crystalline Silicon", k_m:2.8e-7, Ea_m:60000,
    k_o2:5e-9, Ea_o2:40000, k_syn:1e-11,
    k_t:8e-8, Ea_t:60000, k_uv:2.5e-5,
    source:"Jordan & Kurtz 2016 (Compendium, Prog.PV 24): x-Si median 0.5-0.6%/yr, mean 0.7-0.8%/yr. " +
           "O2 and moisture act indirectly (corrosion/PID/delamination)."
  }
};

// ================================================================
// BENCHMARKS — cited reference points for calibration
// ================================================================
const Y = 24 * 365.25;

const BENCHMARKS = [
  { id:"Perovskite, bare, DH 85/85 (dark)", tech:"perovskite",
    front:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100}, back:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100},
    encap:{type:"none",thickMm:0.01}, edge:{D:200,Q:0,gSeal:2e-7,edgeFactor:5},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:600, steps:3000, obsT80h:60, observed:"T80 ~16-125h (Tsuji 2024)" },

  { id:"Perovskite, encapsulated glass+PIB+desiccant, DH 85/85", tech:"perovskite",
    front:{wvtr:0.001,Tt:38,RHt:90, otr:0.05,OTt:23,O2t:100}, back:{wvtr:0.001,Tt:38,RHt:90, otr:0.05,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:6,Q:5,gSeal:2e-8,edgeFactor:6},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:10000, steps:4000, obsT80h:4000, observed:"T80 >1000-5000h (Tsuji/Emery 2024)" },

  { id:"CIGS, bare cells, 85C/100%RH", tech:"cigs",
    front:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100}, back:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100},
    encap:{type:"none",thickMm:0.01}, edge:{D:200,Q:0,gSeal:2e-7,edgeFactor:5},
    env:{Tair:85,RH:100,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:600, steps:3000, obsT80h:90, observed:">50% loss at 168h (Kempe/Shell)" },

  { id:"CIGS, glass-glass + ALD + desiccant edge, DH", tech:"cigs",
    front:{wvtr:0.001,Tt:38,RHt:90, otr:0.01,OTt:23,O2t:100}, back:{wvtr:0.0001,Tt:38,RHt:90, otr:0.001,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:6,Q:6,gSeal:2e-8,edgeFactor:6},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:9*Y, steps:4000, obsT80h:2*Y, observed:"~3% loss at 1000h (Coyle 2013)" },

  { id:"c-Si field, moderate climate, glass-backsheet", tech:"csi",
    front:{wvtr:0.0001,Tt:38,RHt:90, otr:0.001,OTt:23,O2t:100}, back:{wvtr:1.5,Tt:38,RHt:90, otr:100,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:120,Q:0.5,gSeal:1e-7,edgeFactor:5},
    env:{Tair:20,RH:65,G:180,uvFraction:0.05}, tDelta:18, sorbC:null,
    horizonH:45*Y, steps:5000, obsT80h:40*Y, observed:"0.5%/yr median → T80 ~40yr (Jordan & Kurtz 2016)" }
];

// ================================================================
// MAIN SIMULATION  (moisture inventory + GAB + OTR + multi-channel)
// ================================================================
function simulate(cfg) {
  const tech = PV_TECH_DB[cfg.tech];
  if (!tech) throw new Error("Unknown tech: " + cfg.tech);
  const env  = cfg.env, edge = cfg.edge;
  const tDelta = cfg.tDelta != null ? cfg.tDelta : 18;

  // encapsulant sorption setup (GAB)
  const encType  = cfg.encap ? cfg.encap.type  : "eva";
  const encThick = cfg.encap ? cfg.encap.thickMm : 0.5;
  const enc = ENCAPSULANT_DB[encType] || ENCAPSULANT_DB.eva;
  const mEnc = encMassG(encType, encThick); // g/m² of encapsulant per layer (one side)
  const mEncTotal = 2 * mEnc;              // front + back encapsulant

  // barriers
  const fW = cfg.front, bW = cfg.back;
  const frontW = makeBarrier(fW.wvtr, fW.Tt, fW.RHt, fW.Ea, 'wvtr');
  const backW  = makeBarrier(bW.wvtr, bW.Tt, bW.RHt, bW.Ea, 'wvtr');
  const frontO = makeBarrier(fW.otr  || 0.01, fW.OTt||23, fW.O2t||100, fW.EaO, 'otr');
  const backO  = makeBarrier(bW.otr  || 0.01, bW.OTt||23, bW.O2t||100, bW.EaO, 'otr');

  const uvFrac = env.uvFraction != null ? env.uvFraction : 0.05;
  // uvFraction: fraction of total G that is UV-A/B. Default 0.05 (≈UV band).
  // For per-location precision use NASA POWER ALLSKY_SFC_UV_A [W/m²] directly.

  const Tmod = env.Tair + tDelta;
  const TmodK = Tmod + 273.15;
  const KwFaces = frontW.K(Tmod) + backW.K(Tmod);   // g/(m²·h·Pa)
  const KoFaces = frontO.K(Tmod) + backO.K(Tmod);   // cc/(m²·h·Pa)

  const pExtW = (env.RH / 100) * Psat(env.Tair);    // external water vapour (Pa)
  // O2: constant driving force (atmospheric air, O2 consumed fast by cell → int≈0)
  const JO2_service = KoFaces * PO2_EXT;             // cc/(m²·h) steady-state O2 flux

  // degradation Arrhenius factors
  const arrM  = Math.exp(-tech.Ea_m  / R * (1/TmodK - 1/T_REF));
  const arrO2 = Math.exp(-(tech.Ea_o2||35000) / R * (1/TmodK - 1/T_REF));
  const arrT  = Math.exp(-tech.Ea_t  / R * (1/TmodK - 1/T_REF));
  const G_UV  = (env.G || 0) * uvFrac;

  // (4) edgeFactor — named, citable
  // Justification: post-breakthrough, moisture diffuses through the partially-
  // degraded edge encapsulant, which has higher effective permeance than the
  // face laminate (lateral diffusion path, lower activation energy, possible
  // delamination). Literature: Kempe 2018 Prog.PV; Coyle 2013 Prog.PV.
  // Default 6; adjust via cfg.edge.edgeFactor. Typical literature range: 2–20.
  const edgeFactor = edge.edgeFactor != null ? edge.edgeFactor : 6;

  const L = (cfg.geom && cfg.geom.L) ? cfg.geom.L : 1.6;
  const W = (cfg.geom && cfg.geom.W) ? cfg.geom.W : 1.0;
  const horizonH = cfg.horizonH, steps = cfg.steps || 4000;
  const dt = horizonH / steps;

  let I = 0, dose = 0, edgeCumW = 0, breakthrough = false, tBreak = null;
  const series = [];
  let t80=null, t90=null, t97=null;

  for (let s = 0; s <= steps; s++) {
    const t = s * dt;

    // (1) GAB sorption: convert I [g/m²] to internal RH fraction
    const Mdry = mEncTotal > 0 ? I / mEncTotal : 1;     // g water / g dry encapsulant
    let RHint = solveGAB(Mdry, enc);
    RHint = Math.min(RHint, env.RH / 100);              // can't exceed source

    const pIntW = RHint * Psat(Tmod);

    // face flux (signed)
    const Jface = KwFaces * (pExtW - pIntW);            // g/(m²·h)

    // edge breakthrough + (4) edgeFactor
    if (!breakthrough) {
      const qSeal = (edge.gSeal != null ? edge.gSeal : 2e-8) * Math.max(pExtW - pIntW, 0);
      edgeCumW += qSeal * dt;
      if (edge.Q != null && edge.Q > 0 && edgeCumW >= edge.Q) { breakthrough = true; tBreak = t; }
      if (edge.Q === 0) { breakthrough = true; tBreak = 0; }
    }
    let Jedge = 0;
    if (breakthrough) {
      const frontMM = Math.sqrt(edge.D * Math.max(t - (tBreak||0), 0));
      const innerL = Math.max(0, L*1000 - 2*frontMM), innerW = Math.max(0, W*1000 - 2*frontMM);
      const aEdge = 1 - (innerL * innerW) / (L*1000 * W*1000);
      Jedge = aEdge * KwFaces * edgeFactor * (pExtW - pIntW);
    }

    I = Math.max(0, I + (Jface + Jedge) * dt);

    // degradation channels
    const rM   = tech.k_m   * RHint * arrM;
    const rO2  = tech.k_o2  * JO2_service * arrO2;     // proportional to O2 flux (cc/m²/h)
    const rSyn = (tech.k_syn||0) * RHint * JO2_service; // H2O × O2 synergy
    const rT   = tech.k_t   * arrT;
    const rUV  = tech.k_uv  * (G_UV / 1000);
    const ret = Math.exp(-dose);          // compute BEFORE this step's addition
    if (s % Math.max(1, Math.ceil(steps/400)) === 0) series.push({t, ret, RHint, I});
    if (t80  === null && ret <= 0.80) t80  = t;
    if (t90  === null && ret <= 0.90) t90  = t;
    if (t97  === null && ret <= 0.97) t97  = t;

    dose += (rM + rO2 + rSyn + rT + rUV) * dt;
  }
  // channel breakdown at T80
  const arrMr  = tech.k_m * 0.65 * arrM;  // 0.65 = representative avg RH_int
  const arrO2r = tech.k_o2  * JO2_service * arrO2;
  const rTr    = tech.k_t   * arrT;
  const rUVr   = tech.k_uv  * (G_UV / 1000);
  const totR   = arrMr + arrO2r + rTr + rUVr;
  return {
    t80, t90, t97, series, tBreak,
    channelFractions: totR > 0 ? {
      moisture: (arrMr/totR*100).toFixed(1)+'%',
      oxygen:   (arrO2r/totR*100).toFixed(1)+'%',
      thermal:  (rTr/totR*100).toFixed(1)+'%',
      uv:       (rUVr/totR*100).toFixed(1)+'%'
    } : null
  };
}

function interp(series, tNow, dose, thr) {
  const need = -Math.log(thr);
  const n = series.length;
  if (n < 2) return tNow;
  const prev = series[n-2], curr = series[n-1];
  if (!prev) return tNow;
  const f = (dose - (-Math.log(prev.ret))) / ((-Math.log(curr.ret)) - (-Math.log(prev.ret)) || 1);
  return prev.t + f * (curr.t - prev.t);
}

// ================================================================
// BENCHMARK  — compare model vs literature
// ================================================================
function benchmark() {
  return BENCHMARKS.map(b => {
    const r = simulate(b);
    const toYr = h => h==null ? ">horizon" : h >= Y ? (h/Y).toFixed(1)+"yr" : Math.round(h)+"h";
    const ratio = (r.t80 && b.obsT80h) ? (r.t80/b.obsT80h).toFixed(2)+"x" : "—";
    return { case:b.id, tech:b.tech, predicted:toYr(r.t80), reference:toYr(b.obsT80h),
             ratio, channels:r.channelFractions, source:b.observed };
  });
}

// ================================================================
// (5) AUTO-FIT  — Nelder-Mead minimisation over [log k_m, log k_t, log k_uv]
// ================================================================
// fitTech('perovskite', benchmarks)  →  { k_m, k_t, k_uv, rmse }
function nelderMead(f, x0, opts) {
  const n = x0.length, alpha=1, gamma=2, rho=0.5, sigma=0.5;
  const imax = (opts && opts.imax) || 800, tol = (opts && opts.tol) || 1e-7;
  let s = [x0, ...x0.map((v,i) => x0.map((u,j) => j===i ? u+0.5 : u))];
  const fv = s.map(f);
  for (let it = 0; it < imax; it++) {
    const ord = [...Array(n+1).keys()].sort((a,b)=>fv[a]-fv[b]);
    s = ord.map(i=>s[i]); for (let i=0;i<=n;i++) fv[i]=fv[ord[i]];
    if (fv[n]-fv[0]<tol) break;
    const c = Array(n).fill(0); for (let i=0;i<n;i++) for (let j=0;j<n;j++) c[j]+=s[i][j]/n;
    const xr = c.map((v,j)=>v+alpha*(v-s[n][j])), fr=f(xr);
    if (fr<fv[0]) { const xe=c.map((v,j)=>v+gamma*(xr[j]-v)),fe=f(xe); if(fe<fr){s[n]=xe;fv[n]=fe;}else{s[n]=xr;fv[n]=fr;} }
    else if (fr<fv[n-1]) { s[n]=xr; fv[n]=fr; }
    else { const xc=c.map((v,j)=>v+rho*(s[n][j]-v)),fc=f(xc);
      if(fc<fv[n]){s[n]=xc;fv[n]=fc;}else{s=s.map((xi,i)=>i?s[0].map((v,j)=>v+sigma*(xi[j]-v)):xi);for(let i=1;i<=n;i++)fv[i]=f(s[i]);} }
  }
  return s[0];
}

function fitTech(techKey, benchmarksSubset, quiet) {
  const params0 = [Math.log(PV_TECH_DB[techKey].k_m),
                   Math.log(PV_TECH_DB[techKey].k_t),
                   Math.log(PV_TECH_DB[techKey].k_uv)];
  const bms = (benchmarksSubset || BENCHMARKS).filter(b => b.tech === techKey && b.obsT80h);
  if (!bms.length) return null;
  const err = (lp) => {
    const techCopy = Object.assign({}, PV_TECH_DB[techKey],
      { k_m: Math.exp(lp[0]), k_t: Math.exp(lp[1]), k_uv: Math.exp(lp[2]) });
    const origTech = PV_TECH_DB[techKey];
    PV_TECH_DB[techKey] = techCopy;
    let e = 0;
    for (const b of bms) {
      const r = simulate(b);
      const pred = r.t80 || b.horizonH * 2;
      e += Math.pow(Math.log(pred / b.obsT80h), 2);
    }
    PV_TECH_DB[techKey] = origTech;
    return e;
  };
  const best = nelderMead(err, params0, { imax: 600 });
  const fitted = { k_m: Math.exp(best[0]), k_t: Math.exp(best[1]), k_uv: Math.exp(best[2]) };
  if (!quiet) {
    console.log(`fitTech(${techKey}):  k_m=${fitted.k_m.toExponential(2)}`+
      `  k_t=${fitted.k_t.toExponential(2)}  k_uv=${fitted.k_uv.toExponential(2)}`);
  }
  return fitted;
}

// ================================================================
// EXPORTS
// ================================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Psat, makeBarrier, solveGAB, ENCAPSULANT_DB, PV_TECH_DB, BENCHMARKS,
                     simulate, benchmark, fitTech, nelderMead };
}
if (typeof window !== "undefined") {
  window.MoistureEngine = { Psat, makeBarrier, solveGAB, ENCAPSULANT_DB, PV_TECH_DB, BENCHMARKS,
                            simulate, benchmark, fitTech, nelderMead };
}

// ================================================================
// NODE SELF-TEST  — demonstrable & citable
// ================================================================
if (typeof require !== "undefined" && require.main === module) {
  console.log("MOISTURE-ENGINE v3  |  WVTR + OTR + Lifetime  |  GAB isotherm + multi-channel\n");
  console.log("=".repeat(88));
  console.log("BENCHMARK vs ACADEMIC AGING DATA\n");
  for (const row of benchmark()) {
    console.log(`• ${row.case}`);
    console.log(`  Tech: ${row.tech}   |   Predicted T80: ${row.predicted}   |   Reference: ${row.reference}   |   ratio: ${row.ratio}`);
    if (row.channels) {
      const c = row.channels;
      console.log(`  Channels @ early-time: moisture ${c.moisture}  oxygen ${c.oxygen}  thermal ${c.thermal}  UV ${c.uv}`);
    }
    console.log(`  Source: ${row.source}`);
    console.log();
  }
  console.log("=".repeat(88));
  console.log("\nOTR DEMO — same perovskite encapsulated module but with bad OTR barrier:\n");
  const otrDemo = Object.assign({}, BENCHMARKS[1], {
    id:"Perovskite, glass + high-OTR film (bad O2 barrier)",
    front: Object.assign({}, BENCHMARKS[1].front, { otr:300, OTt:23, O2t:100 }),
    back:  Object.assign({}, BENCHMARKS[1].back,  { otr:500, OTt:23, O2t:100 })
  });
  const d = simulate(otrDemo);
  const Y2 = 24*365.25;
  const toYr = h => h==null?"—":h>=Y2?(h/Y2).toFixed(1)+"yr":Math.round(h)+"h";
  console.log(`  T80 with poor OTR: ${toYr(d.t80)}`);
  console.log(`  T80 with good OTR (from benchmark): ${toYr(simulate(BENCHMARKS[1]).t80)}`);
  if (d.channelFractions) console.log(`  Channels: moisture ${d.channelFractions.moisture}  O2 ${d.channelFractions.oxygen}  thermal ${d.channelFractions.thermal}  UV ${d.channelFractions.uv}`);
  console.log("\nAuto-fit perovskite k values on benchmarks:\n");
  fitTech('perovskite');
}
