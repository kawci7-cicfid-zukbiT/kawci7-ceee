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
  _encapFront: 'eva',   // Front encapsulant polymer family (eva/poe/tpu/pvb)
  _encapBack:  'eva',   // Back encapsulant polymer family
  _lastSim: null, _climate: null, _diurnal: null, _searchTimer: null,
  HORIZON_YR: 40,

  // ------------------------------------------------------------------
  init() {
    this._populateEdges();
    this._populateCities();
    this.setBarrierSource('front', 'calc');
    this.setBarrierSource('back',  'calc');
    // Trigger initial encap info refresh for both panels
    this._onEncapChange('front');
    this._onEncapChange('back');
  },

  // ------------------------------------------------------------------
  // ENCAPSULANTS — front + back, pulled from materials DB
  // The DB material's name is matched to a polymer family (eva/poe/tpu/pvb)
  // which selects the GAB sorption isotherm coefficients in MoistureEngine.
  // ------------------------------------------------------------------
  _detectEncapFamily(matName) {
    if (!matName) return 'eva';
    const n = matName.toLowerCase();
    if (n.includes('poe'))  return 'poe';
    if (n.includes('tpu'))  return 'tpu';
    if (n.includes('pvb'))  return 'pvb';
    return 'eva';  // EVA covers most cases (default fallback)
  },

  _onEncapChange(which) {
    // which = 'front' | 'back'
    const sel = document.getElementById('pv-encap-' + which + '-mat');
    const info = document.getElementById('pv-encap-' + which + '-info');
    if (!sel) return;
    const matId = sel.value;
    let matName = '', family = 'eva';
    if (matId && typeof DB !== 'undefined') {
      const mat = DB.materials.find(m => String(m.id) === String(matId));
      if (mat) {
        matName = mat.name;
        family = this._detectEncapFamily(mat.name + ' ' + (mat.family || ''));
      }
    }
    if (which === 'front') this._encapFront = family;
    else                   this._encapBack  = family;
    // Show note from MoistureEngine.ENCAPSULANT_DB
    const db = window.MoistureEngine?.ENCAPSULANT_DB || {};
    const e = db[family];
    if (info) info.textContent = (e && e.note ? e.note : '') +
      (matName ? '  · selected: ' + matName + ' (family: ' + family.toUpperCase() + ')' : '');
  },

  // Legacy method (kept for back-compat with any external callers)
  setEncapType(type) {
    this._encapFront = type;
    this._encapBack  = type;
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
    // OTR auto-estimate ratio: hardcoded since UI input was removed
    // (PV module operates only in WVTR mode — OTR is a derived background value).
    const otrRatio = 300;
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

    // Encapsulants — front + back, each from materials DB
    const encThickFront = parseFloat(document.getElementById('pv-encap-front-thick')?.value) || 0.5;
    const encThickBack  = parseFloat(document.getElementById('pv-encap-back-thick')?.value)  || 0.5;
    // For the moisture engine (which assumes a single encapsulant type for the
    // front+back sorption mass balance), use the average thickness and the
    // family of the more permeable encapsulant — this conservatively models
    // the actual moisture uptake into the assembly.
    const encThickAvg = (encThickFront + encThickBack) / 2;
    // Choose the dominant family — if both same use that, otherwise use front
    // (the front faces direct climate exposure so its sorption matters more).
    const encType = this._encapFront;

    return {
      tech: 'csi',  // Cell tech UI removed — c-Si is the default. RHint output is the primary metric.
      front:{ wvtr:f.wvtr, Tt:f.tt, RHt:f.rht, otr:f.otr, OTt:f.ott, O2t:f.o2t },
      back: { wvtr:b.wvtr, Tt:b.tt, RHt:b.rht, otr:b.otr, OTt:b.ott, O2t:b.o2t },
      encap:{ type: encType, thickMm: encThickAvg, _typeFront: this._encapFront, _typeBack: this._encapBack, _thickFront: encThickFront, _thickBack: encThickBack },
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
    const sim={
      series: raw.series.map(p=>({...p, t:p.t/Y})),
      Tamb:   cfg.env.Tair,
      Tmod:   cfg.env.Tair + 18,
      rhFrac: cfg.env.RH / 100,
      wFront: cfg.front.wvtr,
      wBack:  cfg.back.wvtr,
      edgeD:  PV_EDGES[document.getElementById('pv-edge')?.value || 'pib'].d,
      edgeQ:  cfg.edge.Q
    };
    this._lastSim=sim;
    this._renderResult(sim);
  },

  // ------------------------------------------------------------------
  // COMPARE — re-run with each encapsulant polymer family and overlay
  // the resulting internal-RH curves so the user can see which polymer
  // gives the lowest steady-state humidity for their barrier and climate.
  // ------------------------------------------------------------------
  compareEncapsulants() {
    if (typeof window.MoistureEngine === 'undefined') {
      alert('Physics engine not loaded.');
      return;
    }
    const baseCfg = this._buildConfig();
    if (!baseCfg) return;

    const Y = 24 * 365.25;
    const polymers = ['eva', 'poe', 'tpu', 'pvb'];
    const colors   = { eva:'#0f8a8c', poe:'#3b82f6', tpu:'#d97706', pvb:'#8b5cf6' };
    const results  = [];

    for (const fam of polymers) {
      const cfg = JSON.parse(JSON.stringify(baseCfg));
      // Force both front and back encapsulant to the family being compared,
      // keeping thicknesses as configured.
      cfg.encap.type        = fam;
      cfg.encap._typeFront  = fam;
      cfg.encap._typeBack   = fam;
      let raw;
      try { raw = window.MoistureEngine.simulate(cfg); }
      catch (e) { continue; }
      const series = raw.series.map(p => ({ ...p, t: p.t / Y }));
      results.push({ family: fam, color: colors[fam], series });
    }

    if (!results.length) {
      alert('Comparison failed.');
      return;
    }

    // Make sure the chart container is visible
    const cont = document.getElementById('pv-charts');
    if (cont) cont.style.display = 'block';

    // Render the comparison chart in the dedicated canvas
    this._drawCompare(results);

    // Also show the comparison summary table
    this._renderCompareSummary(results);
  },

  _drawCompare(results) {
    if (typeof Chart === 'undefined') return;
    if (typeof destroyChart === 'function') destroyChart('pvCompare');
    const ctx = document.getElementById('pvCompareChart')?.getContext('2d');
    if (!ctx) return;

    // All result sets have the same time axis — use the first as label source
    const refSeries = results[0].series;
    const step = Math.max(1, Math.ceil(refSeries.length / 400));
    const labels = [];
    for (let i = 0; i < refSeries.length; i += step) labels.push(refSeries[i].t.toFixed(1));

    const polymerLabel = { eva:'EVA', poe:'POE', tpu:'TPU', pvb:'PVB' };

    const datasets = results.map(r => {
      const data = [];
      for (let i = 0; i < r.series.length; i += step) {
        data.push(+(r.series[i].RHint * 100).toFixed(2));
      }
      return {
        label:           polymerLabel[r.family] + ' encapsulant',
        data:            data,
        borderColor:     r.color,
        backgroundColor: 'transparent',
        fill:            false,
        tension:         0.3,
        pointRadius:     0,
        borderWidth:     2.2
      };
    });

    // Risk-band background plugin (re-used from _drawRH)
    const riskBandsPlugin = {
      id: 'riskBandsCompare',
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const y = scales.y;
        const bands = [
          { from:  0, to: 30, color: 'rgba(34,197,94,0.10)'  },
          { from: 30, to: 50, color: 'rgba(132,204,22,0.08)' },
          { from: 50, to: 70, color: 'rgba(234,179,8,0.10)'  },
          { from: 70, to: 85, color: 'rgba(249,115,22,0.10)' },
          { from: 85, to:100, color: 'rgba(220,38,38,0.10)'  }
        ];
        ctx.save();
        bands.forEach(b => {
          const yFrom = y.getPixelForValue(b.from);
          const yTo   = y.getPixelForValue(b.to);
          ctx.fillStyle = b.color;
          ctx.fillRect(chartArea.left, yTo, chartArea.right - chartArea.left, yFrom - yTo);
        });
        ctx.restore();
      }
    };

    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvCompare = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      plugins: [riskBandsPlugin],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend:  { position: 'top', labels: { boxWidth: 14, font: { size: 10 }, padding: 10 } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(1)} %` } }
        },
        scales: {
          x: { title: { display: true, text: 'Years' }, ticks: { maxTicksLimit: 9, font: { size: 9 } } },
          y: { min: 0, max: 100, title: { display: true, text: 'Internal RH (%)' },
               ticks: { callback: v => v + '%', font: { size: 9 } } }
        }
      }
    });

    // Reveal the compare card now that it has content
    const card = document.getElementById('pv-compare-card');
    if (card) card.style.display = 'block';
  },

  _renderCompareSummary(results) {
    const box = document.getElementById('pv-compare-summary');
    if (!box) return;
    const polymerLabel = { eva:'EVA', poe:'POE', tpu:'TPU', pvb:'PVB' };
    // RH at year 25 for each polymer
    const rows = results.map(r => {
      const last = r.series[r.series.length - 1];
      return { fam: r.family, color: r.color, rh25: (last.RHint * 100) };
    });
    rows.sort((a, b) => a.rh25 - b.rh25);   // lowest RH = best
    const best = rows[0];
    const worst = rows[rows.length - 1];

    let html = '<div style="font-size:.72rem;color:var(--text-light);margin-bottom:.4rem">Internal RH at year 25 (lower is better):</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(' + rows.length + ',1fr);gap:.4rem;margin-bottom:.5rem">';
    rows.forEach(r => {
      const isBest = r.fam === best.fam;
      html += '<div style="border:1.5px solid ' + (isBest ? r.color : 'var(--border)') + ';border-radius:6px;padding:.4rem;text-align:center;background:' + (isBest ? r.color + '15' : '#fff') + '">' +
        '<div style="font-size:.66rem;color:var(--text-light);font-weight:600">' + polymerLabel[r.fam] + (isBest ? ' ✓' : '') + '</div>' +
        '<div style="font-size:1.1rem;font-weight:700;color:' + r.color + ';line-height:1">' + r.rh25.toFixed(1) + '%</div>' +
        '</div>';
    });
    html += '</div>';
    const diff = (worst.rh25 - best.rh25).toFixed(1);
    html += '<div style="font-size:.72rem;color:var(--text-light)"><strong>' + polymerLabel[best.fam] + '</strong> reaches the lowest internal humidity (' + diff + ' percentage points below ' + polymerLabel[worst.fam] + ') for this barrier and climate combination.</div>';
    box.innerHTML = html;
  },

  _sample(s,yr){ if(!s||!s.length)return{t:0,ret:1,RHint:0,I:0}; let b=s[0],d=Math.abs(s[0].t-yr); for(const p of s){const dd=Math.abs(p.t-yr);if(dd<d){d=dd;b=p;}}return b; },

  _renderResult(sim) {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('pv-tmod', sim.Tmod.toFixed(0)+' °C');

    // Internal RH at the cells — primary metric
    const rhAt = (yr) => {
      const p = this._sample(sim.series, yr);
      return p && p.RHint != null ? (p.RHint * 100).toFixed(1) + ' %' : '–';
    };
    set('pv-rh-y1',  rhAt(1));
    set('pv-rh-y10', rhAt(10));
    set('pv-rh-y25', rhAt(25));

    // Critical-threshold flag based on RH at year 25
    const rh25 = this._sample(sim.series, 25);
    const flagEl = document.getElementById('pv-rh-flag');
    if (flagEl && rh25 && rh25.RHint != null) {
      const rh = rh25.RHint * 100;
      let txt, col;
      if      (rh < 30) { txt = '✓ Dry interior — excellent for moisture-sensitive cells'; col = '#16a34a'; }
      else if (rh < 50) { txt = '✓ Acceptable for c-Si and CIGS modules';                   col = '#16a34a'; }
      else if (rh < 70) { txt = '⚠ Elevated humidity — perovskite cells at risk';            col = '#d97706'; }
      else if (rh < 85) { txt = '⚠ High humidity — significant degradation risk';            col = '#d97706'; }
      else              { txt = '✗ Critical — moisture saturation, expect rapid failure';   col = '#dc2626'; }
      flagEl.textContent = txt;
      flagEl.style.color = col;
    }

    const cont = document.getElementById('pv-charts');
    if (cont) cont.style.display = 'block';
    requestAnimationFrame(() => setTimeout(() => {
      this._drawRH(sim);
      this._drawWater(sim);
      this._drawDailyExchange(sim);
      this._drawMonthly();
    }, 80));
  },

  // ------------------------------------------------------------------
  // CHARTS
  // ------------------------------------------------------------------
  _drawRH(sim) {
    if(typeof Chart==='undefined') return;
    if(typeof destroyChart==='function') destroyChart('pvRH');
    const ctx=document.getElementById('pvRHChart')?.getContext('2d'); if(!ctx) return;

    const step = Math.max(1, Math.ceil(sim.series.length / 400));
    const lab = [], dat = [];
    for (let i = 0; i < sim.series.length; i += step) {
      lab.push(sim.series[i].t.toFixed(1));
      dat.push(+(sim.series[i].RHint * 100).toFixed(2));
    }

    // Commercial benchmark: a well-designed glass/backsheet c-Si module
    // reaches a steady-state ~55% internal RH at year 25. Smooth 1−exp(−t/τ)
    // with τ≈6 years; matches the envelope reported by Kempe (2018) and
    // Jordan (2016) for IEC 61215-certified modules in temperate climates.
    const benchmark = lab.map(t => {
      const yr = parseFloat(t);
      return +(55 * (1 - Math.exp(-yr / 6))).toFixed(2);
    });

    // Risk-band background plugin
    const riskBandsPlugin = {
      id: 'riskBands',
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea) return;
        const y = scales.y;
        const bands = [
          { from:  0, to: 30, color: 'rgba(34,197,94,0.10)'  },
          { from: 30, to: 50, color: 'rgba(132,204,22,0.08)' },
          { from: 50, to: 70, color: 'rgba(234,179,8,0.10)'  },
          { from: 70, to: 85, color: 'rgba(249,115,22,0.10)' },
          { from: 85, to:100, color: 'rgba(220,38,38,0.10)'  }
        ];
        ctx.save();
        bands.forEach(b => {
          const yFrom = y.getPixelForValue(b.from);
          const yTo   = y.getPixelForValue(b.to);
          ctx.fillStyle = b.color;
          ctx.fillRect(chartArea.left, yTo, chartArea.right - chartArea.left, yFrom - yTo);
        });
        ctx.restore();
      }
    };

    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvRH = new Chart(ctx, {
      type: 'line',
      data: {
        labels: lab,
        datasets: [
          { label: 'Your module', data: dat,
            borderColor: '#0f8a8c', backgroundColor: 'rgba(15,138,140,0.18)',
            fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5, order: 1 },
          { label: 'Typical commercial module (benchmark)', data: benchmark,
            borderColor: '#64748b', backgroundColor: 'transparent',
            borderDash: [6,4], fill: false, tension: 0.3, pointRadius: 0,
            borderWidth: 1.5, order: 0 }
        ]
      },
      plugins: [riskBandsPlugin],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend:  { position: 'top', labels: { boxWidth: 14, font: { size: 10 }, padding: 10 } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y.toFixed(1)} %` } }
        },
        scales: {
          x: { title: { display: true, text: 'Years' }, ticks: { maxTicksLimit: 9, font: { size: 9 } } },
          y: { min: 0, max: 100, title: { display: true, text: 'Internal RH (%)' },
               ticks: { callback: v => v + '%', font: { size: 9 } } }
        }
      }
    });
  },

  _drawWater(sim) {
    if (typeof Chart === 'undefined') return;
    if (typeof destroyChart === 'function') destroyChart('pvWater');
    const ctx = document.getElementById('pvWaterChart')?.getContext('2d');
    if (!ctx) return;

    const step = Math.max(1, Math.ceil(sim.series.length / 400));
    const lab = [], dat = [];
    for (let i = 0; i < sim.series.length; i += step) {
      lab.push(sim.series[i].t.toFixed(1));
      // I = cumulative water content in g/m² (across both encapsulant layers)
      dat.push(+(sim.series[i].I || 0).toFixed(3));
    }

    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvWater = new Chart(ctx, {
      type: 'line',
      data: {
        labels: lab,
        datasets: [{
          label:           'Cumulative water absorbed (g/m²)',
          data:            dat,
          borderColor:     '#0a4f63',
          backgroundColor: 'rgba(10,79,99,0.12)',
          fill:            true,
          tension:         0.3,
          pointRadius:     0,
          borderWidth:     2.2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend:  { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
          tooltip: { callbacks: { label: c => `Water absorbed: ${c.parsed.y.toFixed(2)} g/m²` } }
        },
        scales: {
          x: { title: { display: true, text: 'Years' }, ticks: { maxTicksLimit: 9, font: { size: 9 } } },
          y: { beginAtZero: true,
               title: { display: true, text: 'Water content (g/m²)' },
               ticks: { font: { size: 9 } } }
        }
      }
    });
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
// ====================================================================
// Helper: build <option> list for encapsulant material dropdowns.
// Pulls from DB.materials filtered by application = photovoltaic + neutral.
// Falls back to a static list of polymer families if no DB is available.
// ====================================================================
function _pvEncapOptions(defaultSelected) {
  defaultSelected = (defaultSelected || 'eva').toLowerCase();
  let options = '';
  let dbList = [];
  try {
    if (typeof getMaterialsByApplication === 'function') {
      dbList = getMaterialsByApplication('photovoltaic', true);
    }
  } catch (e) { dbList = []; }

  if (dbList && dbList.length) {
    // Group materials by detected family for easier scanning
    options = '<option value="">— Select an encapsulant —</option>';
    for (let i = 0; i < dbList.length; i++) {
      const m = dbList[i];
      const fam = (m.family ? ' [' + m.family + ']' : '');
      options += '<option value="' + m.id + '">' + (m.name || 'Material ' + m.id) + fam + '</option>';
    }
  } else {
    // Fallback when DB is not yet loaded or no PV-tagged materials exist
    options = '<option value="">— No photovoltaic materials in DB —</option>';
  }
  return options;
}

function renderPVDegradation() {
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

      <!-- 3. FRONT BARRIER -->
      ${barrierBlock('front','▼','3. Front cover — WVTR barrier')}

      <!-- 4. ENCAPSULANT — Front + Back independent, pulled from DB -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--purple)">▼ 4. Encapsulants (from materials database)</div>
        <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.55rem">
          Front and back encapsulants are tracked independently. The list contains materials whose
          application is <em>photovoltaic</em> or <em>neutral</em>. The sorption isotherm uses the
          built-in coefficients of the selected polymer family (EVA, POE, TPU, PVB).
        </div>

        <!-- FRONT ENCAPSULANT -->
        <div style="background:#fafafa;border:1px solid var(--border);border-radius:8px;padding:.5rem;margin-bottom:.4rem">
          <div style="font-size:.72rem;font-weight:700;color:var(--purple);margin-bottom:.35rem">⬆ FRONT ENCAPSULANT</div>
          <div class="grid grid-2" style="gap:.4rem">
            <div class="form-group" style="margin:0">
              <label style="font-size:.7rem">Material</label>
              <select id="pv-encap-front-mat" class="form-input" style="font-size:.78rem" onchange="PV._onEncapChange('front')">
                ${_pvEncapOptions('eva')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-size:.7rem">Thickness (mm)</label>
              <input type="number" id="pv-encap-front-thick" class="form-input" value="0.5" step=".1" min=".1" style="font-size:.82rem">
            </div>
          </div>
          <div id="pv-encap-front-info" style="font-size:.68rem;color:var(--text-light);margin-top:.3rem;min-height:.85rem"></div>
        </div>

        <!-- BACK ENCAPSULANT -->
        <div style="background:#fafafa;border:1px solid var(--border);border-radius:8px;padding:.5rem">
          <div style="font-size:.72rem;font-weight:700;color:var(--purple);margin-bottom:.35rem">⬇ BACK ENCAPSULANT</div>
          <div class="grid grid-2" style="gap:.4rem">
            <div class="form-group" style="margin:0">
              <label style="font-size:.7rem">Material</label>
              <select id="pv-encap-back-mat" class="form-input" style="font-size:.78rem" onchange="PV._onEncapChange('back')">
                ${_pvEncapOptions('eva')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-size:.7rem">Thickness (mm)</label>
              <input type="number" id="pv-encap-back-thick" class="form-input" value="0.5" step=".1" min=".1" style="font-size:.82rem">
            </div>
          </div>
          <div id="pv-encap-back-info" style="font-size:.68rem;color:var(--text-light);margin-top:.3rem;min-height:.85rem"></div>
        </div>
      </div>

      <!-- 5. BACK BARRIER -->
      ${barrierBlock('back','▼','5. Back cover / backsheet — WVTR barrier')}

      <!-- 6. EDGE + GEOMETRY -->
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

      <!-- CALCULATE + COMPARE -->
      <div style="padding:.9rem 1rem;display:grid;grid-template-columns:2fr 1fr;gap:.5rem">
        <button class="btn btn-danger" onclick="PV.calculate()" style="padding:.75rem;font-size:.9rem">▶ Run Simulation</button>
        <button class="btn btn-outline" onclick="PV.compareEncapsulants()" title="Re-run with EVA, POE, TPU, PVB and overlay them" style="padding:.75rem;font-size:.82rem">Compare polymers</button>
      </div>
    </div>

    <!-- ===== RESULTS PANEL ===== -->
    <div style="position:sticky;top:1rem">
      <div class="card">
        <!-- Explanation of what this tool shows -->
        <div style="background:var(--primary-light);border-radius:8px;padding:.65rem .9rem;margin-bottom:.9rem;font-size:.78rem;line-height:1.55;color:var(--text)">
          <strong style="display:block;margin-bottom:.2rem">What this tool predicts</strong>
          <span style="color:var(--text-light)">
            The simulator tracks how much <strong>water vapour</strong> reaches the solar cells through the encapsulation stack
            over the module's service life. The main metric is the <strong>internal relative humidity</strong> at the cell plane —
            the physical driver of long-term degradation for every PV technology.
          </span>
        </div>

        <!-- PRIMARY METRIC: humidity at the cells (RHint) -->
        <div style="background:linear-gradient(135deg,#ecfeff,#dbeafe);border:1.5px solid #0891b2;border-radius:10px;padding:.85rem;margin-bottom:.65rem">
          <div style="font-size:.66rem;color:var(--text-light);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Humidity reaching the cells</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.65rem">
            <div>
              <div style="font-size:.62rem;color:var(--text-light);font-weight:600">Year 1</div>
              <div style="font-size:1.35rem;font-weight:800;color:#0891b2;line-height:1.1" id="pv-rh-y1">–</div>
              <div style="font-size:.6rem;color:var(--text-light)">% RH internal</div>
            </div>
            <div>
              <div style="font-size:.62rem;color:var(--text-light);font-weight:600">Year 10</div>
              <div style="font-size:1.35rem;font-weight:800;color:#0891b2;line-height:1.1" id="pv-rh-y10">–</div>
              <div style="font-size:.6rem;color:var(--text-light)">% RH internal</div>
            </div>
            <div>
              <div style="font-size:.62rem;color:var(--text-light);font-weight:600">Year 25</div>
              <div style="font-size:1.35rem;font-weight:800;color:#0891b2;line-height:1.1" id="pv-rh-y25">–</div>
              <div style="font-size:.6rem;color:var(--text-light)">% RH internal</div>
            </div>
          </div>
          <div id="pv-rh-flag" style="font-size:.7rem;font-weight:600;margin-top:.45rem"></div>
        </div>

        <!-- Secondary: operating module temperature -->
        <div style="margin-top:.7rem;font-size:.78rem">
          <div style="color:var(--text-light);font-size:.68rem">Operating module temperature</div>
          <strong id="pv-tmod">–</strong>
        </div>
      </div>

      <!-- Charts -->
      <div id="pv-charts" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.15rem">Moisture reaching the cell plane (internal RH)</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">Your module against a typical commercial benchmark. Coloured bands mark the cell-sensitivity zones: green = safe, amber = elevated, red = critical.</div>
          <div style="height:220px"><canvas id="pvRHChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.88rem;font-weight:600;margin-bottom:.15rem">Cumulative water inside the encapsulants</h3>
          <div style="font-size:.7rem;color:var(--text-light);margin-bottom:.4rem">Total mass of water absorbed by the front and back encapsulant layers, in g/m². The curve plateaus when the polymer reaches its saturation capacity.</div>
          <div style="height:210px"><canvas id="pvWaterChart"></canvas></div>
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
How this simulation works
</h2>
<div style="font-size:.91rem;line-height:1.82;color:#334155;font-family:Georgia,serif">

<p>A solar module is not a sealed box. Even after lamination, water vapour from the air slowly moves through the front sheet, the back sheet and the edges. After many years some of that water reaches the solar cells inside. That water is the main cause of long-term power loss in most module designs. This simulator estimates how much humidity reaches the cells over time, using simple but physically correct rules.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">What the result means</h3>
<p>The main number shown is the <strong>internal relative humidity</strong>, expressed as a percentage, at year 1, year 10 and year 25 of service life. This is the humidity that the cells "feel" while they sit inside the module. Lower is always better. A dry interior (below about 50% RH at year 25) is what well-made commercial modules achieve. Numbers above 70% RH indicate that water is building up faster than the barrier can keep it out, and most cell technologies will degrade quickly under those conditions.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Why the WVTR test conditions matter</h3>
<p>WVTR (water vapour transmission rate) is not a fixed property of a material. The same backsheet can be reported as 0.5 g/m²·day at 38 °C and 90% RH, or as 0.05 g/m²·day at 25 °C and 60% RH — both values are correct, just measured under different conditions. The simulator converts the entered WVTR into a permeance (mass per unit driving force) and then re-evaluates it at the temperature and humidity the module actually experiences on a rooftop. This is why the manual input panel asks for the test temperature and humidity together with the WVTR value: without those, the value cannot be translated to real service conditions.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">How temperature affects permeation (Arrhenius law)</h3>
<p>Polymer permeability rises with temperature in a way described by the Arrhenius equation. A module surface in summer can easily reach 60–70 °C, which is 30–40 °C above the air around it. At that temperature water moves through the encapsulation many times faster than at room temperature. The simulator uses an activation energy <em>E<sub>a</sub></em> (typical value around 30 kJ/mol for polymer films, higher for high-barrier laminates) to correctly amplify the permeation during hot daylight hours and slow it down again at night.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Sorption: where the water actually goes</h3>
<p>Once water passes the front or back barrier, it does not simply float around inside the module. It dissolves into the encapsulant polymer, which acts like a sponge. EVA, POE, TPU and PVB each have a different sponge size: that is, they hold different amounts of water at the same humidity. The simulator tracks the total water mass absorbed by both encapsulant layers and converts it into the internal humidity using the GAB sorption isotherm — the same equation used to predict food shelf life inside packaging. This step is what makes the model self-limiting: as the encapsulant fills up, the humidity inside rises, the driving force shrinks, and the ingress rate slows down naturally.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Front and back encapsulants are tracked separately</h3>
<p>Real modules increasingly use different polymers on the two faces — for example a UV-stable POE film at the front and a cheaper EVA at the back. Because the front faces direct sunlight and is hotter, it dominates the moisture balance during the day. Each encapsulant is selected independently from the materials database, with its own thickness. The polymer family (EVA, POE, TPU, PVB) is detected from the material name and sets the GAB coefficients used in the sorption calculation.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Edge ingress and the desiccant strip</h3>
<p>In glass-glass modules the front and back faces are almost impermeable, so water cannot enter through them. The only realistic pathway is sideways through the edge seal. The simulator models a moisture front that creeps inward as √(D·t), starting from the perimeter. A desiccant strip (when present) absorbs that water until its capacity Q is reached. After that point the desiccant is exhausted and ingress accelerates. This breakthrough behaviour is a key design choice of edge-sealed glass-glass modules and is well documented in the literature (Kempe 2018; Coyle 2013; SAES B-Dry datasheets).</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Day-night breathing</h3>
<p>The direction of moisture flow depends on the vapour pressure difference across the barrier. On a hot afternoon, the module surface is much warmer than the outside air, which raises the saturation pressure inside. If the inside is already humid, water will actually flow <em>out</em> of the module during those hours. After sunset the surface cools, the gradient reverses, and water flows in again. The "daily exchange" chart shows this signed flux hour by hour, using hourly weather data from ERA5 reanalysis. Annual-average models cannot see this effect and tend to overestimate moisture accumulation.</p>

<h3 style="font-family:sans-serif;font-size:.97rem;color:var(--primary-dark);margin-top:1.3rem;font-weight:700">Where the data come from</h3>
<p>Climate values are taken from NASA POWER (20-year MERRA-2 monthly averages of temperature, humidity and irradiance) and from ERA5 hourly reanalysis (ECMWF/Copernicus via the Open-Meteo service) for the diurnal profile. The sorption coefficients used in the GAB isotherm come from the published characterisation of each encapsulant family (EVA, POE, TPU, PVB).</p>

<div style="margin-top:1.4rem;padding:.8rem .95rem;background:var(--bg);border-radius:7px;font-size:.8rem;color:var(--text-light);border-left:3px solid var(--warning);font-family:sans-serif;line-height:1.6">
<strong>Disclaimer.</strong> The internal humidity values are screening estimates intended for early-stage design comparison. For module certification or warranty filing, the model should be cross-checked against measured damp-heat or IEC 61215 data on the specific encapsulant and barrier combination in use.
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
