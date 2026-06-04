// ====================================================================
// PV-MODULE.JS  v2  —  PV Lifetime: UI + bridge to MoistureEngine v3
// ====================================================================
(function () {

// ---- Cover presets (WVTR g/m²/day · OTR cc/m²/day at rated conditions) ----
const PV_COVERS = {
  glass: { name:'Glass (impermeable)',                w:0.0001, o:0.0001 },
  hb:    { name:'High-barrier film (ALD/multilayer)', w:0.001,  o:0.001  },
  mb:    { name:'Medium barrier film',                w:0.05,   o:0.5    },
  bs:    { name:'Standard backsheet',                 w:1.5,    o:50     },
  poly:  { name:'Simple polymer / none',              w:20,     o:500    }
};

// ---- Edge seal presets (D mm²/year for display; engine receives /8766) ----
const PV_EDGES = {
  pibd: { name:'PIB + desiccant',            d:6,   Q:5,    gSeal:2e-8 },
  pib:  { name:'PIB (no desiccant)',         d:15,  Q:0.01, gSeal:2e-8 },
  none: { name:'Common encapsulant at edge', d:120, Q:0,    gSeal:1e-7 }
};

// ---- Major world cities ----
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
  _frontSource: 'calc', _backSource: 'calc',
  _lastSim: null, _climate: null, _diurnal: null, _searchTimer: null,
  HORIZON_YR: 40,

  // ------------------------------------------------------------------
  init() {
    this._populateEdges();
    this._populateCities();
    this._populateEncapTypes();
    this.setBarrierSource('front', 'calc');
    this.setBarrierSource('back',  'calc');
  },

  // ------------------------------------------------------------------
  // BARRIER SOURCE  (mirrors ShelfLife SL.setBarrierSource)
  // ------------------------------------------------------------------
  setBarrierSource(which, src) {
    if (!['calc','db','company','manual'].includes(src)) return;
    this['_'+which+'Source'] = src;
    const ids = ['calc','db','company','manual'];
    ids.forEach(k => {
      const btn = document.getElementById('pv-'+which+'-src-'+k);
      if (!btn) return;
      const isActive = (k === src);
      btn.style.background = isActive ? 'var(--primary)' : '';
      btn.style.color       = isActive ? '#fff' : '';
      btn.style.border      = isActive ? 'none' : '';
      // Disable company if not active
      if (k === 'company') {
        const coOk = typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive();
        btn.disabled = !coOk;
        btn.style.opacity = coOk ? '1' : '0.45';
        btn.style.cursor  = coOk ? 'pointer' : 'not-allowed';
      }
    });
    ids.forEach(k => {
      const p = document.getElementById('pv-'+which+'-panel-'+k);
      if (p) p.style.display = (k === src) ? 'block' : 'none';
    });
    if (src === 'db')      this._loadDBLaminates(which);
    if (src === 'company') this._loadCompanyLaminates(which);
    this._updateBarrierSummary(which);
  },

  _loadDBLaminates(which) {
    const sel = document.getElementById('pv-'+which+'-db-pick'); if (!sel) return;
    try {
      const lams = (typeof DB !== 'undefined' && DB.laminates)
        ? DB.laminates.filter(l => !l.mode || l.mode === 'wvtr') : [];
      if (!lams.length) {
        sel.innerHTML = '<option value="">No WVTR laminates saved yet</option>'; return;
      }
      sel.innerHTML = '<option value="">Select a laminate…</option>' +
        lams.map(l => `<option value="${l.id}">${l.name} — ${l.total!=null?l.total.toFixed(4):'?'} g/m²·day</option>`).join('');
    } catch(e) { sel.innerHTML = '<option value="">Error loading</option>'; }
  },

  async _loadCompanyLaminates(which) {
    const sel = document.getElementById('pv-'+which+'-co-pick'); if (!sel) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    try {
      const lams = await loadCompanyLaminates();
      const wvtr = lams.filter(l => l.mode === 'wvtr');
      if (!wvtr.length) {
        sel.innerHTML = '<option value="">No WVTR company laminates</option>'; return;
      }
      sel.innerHTML = '<option value="">Select a laminate…</option>' +
        wvtr.map(l => `<option value="${l._companyLamId}">${l.name} — ${l.total!=null?l.total.toFixed(4):'?'} g/m²·day</option>`).join('');
    } catch(e) { sel.innerHTML = '<option value="">Error loading</option>'; }
  },

  async getBarrierWVTR(which) {
    const src = this['_'+which+'Source'];
    if (src === 'calc') {
      try { return parseFloat(State.calcResult?.total) || 0; } catch(e) { return 0; }
    }
    if (src === 'manual') {
      return parseFloat(document.getElementById('pv-'+which+'-manual-wvtr')?.value) || 0;
    }
    if (src === 'db') {
      const id = document.getElementById('pv-'+which+'-db-pick')?.value;
      if (!id) return 0;
      try { return parseFloat(DB.laminates?.find(l=>String(l.id)===String(id))?.total) || 0; } catch(e) { return 0; }
    }
    if (src === 'company') {
      const id = document.getElementById('pv-'+which+'-co-pick')?.value; if (!id) return 0;
      try {
        const lams = await loadCompanyLaminates();
        return parseFloat(lams?.find(l=>l._companyLamId===id)?.total) || 0;
      } catch(e) { return 0; }
    }
    return 0;
  },

  getBarrierOTR(which) {
    // OTR: manual override or auto-estimated from WVTR via a ratio
    const manEl = document.getElementById('pv-'+which+'-manual-otr');
    if (manEl && manEl.value && parseFloat(manEl.value) > 0) return parseFloat(manEl.value);
    // Auto-estimate: OTR ≈ WVTR × ratio (approximate, polymer-typical)
    return null; // signals "use ratio" in _buildConfig
  },

  _updateBarrierSummary(which) {
    const el = document.getElementById('pv-'+which+'-summary'); if (!el) return;
    const src = this['_'+which+'Source'];
    let label = '';
    if (src === 'calc') {
      try { label = 'From calculator: ' + (parseFloat(State.calcResult?.total)||0).toFixed(4) + ' g/m²·day'; }
      catch(e) { label = 'Calculator (no result yet)'; }
    } else if (src === 'db') {
      label = 'From DB laminate';
    } else if (src === 'company') {
      label = 'From company DB';
    } else {
      const v = document.getElementById('pv-'+which+'-manual-wvtr')?.value;
      label = v ? 'Manual: ' + v + ' g/m²·day' : 'Manual (enter value)';
    }
    el.textContent = label;
  },

  // ------------------------------------------------------------------
  // ENCAPSULANT + EDGE
  // ------------------------------------------------------------------
  _populateEncapTypes() {
    const sel = document.getElementById('pv-encap-type'); if (!sel) return;
    const db = (typeof window.MoistureEngine !== 'undefined' && window.MoistureEngine.ENCAPSULANT_DB)
      ? window.MoistureEngine.ENCAPSULANT_DB : { eva:{name:'EVA'}, poe:{name:'POE'}, tpu:{name:'TPU'}, pvb:{name:'PVB'} };
    sel.innerHTML = Object.entries(db).filter(([k])=>k!=='none')
      .map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
  },

  _populateEdges() {
    const sel = document.getElementById('pv-edge'); if (!sel) return;
    sel.innerHTML = Object.entries(PV_EDGES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
    sel.value = 'pib';
  },

  _populateCities() {
    const sel = document.getElementById('pv-city-quick'); if (!sel) return;
    sel.innerHTML = '<option value="">— Quick pick city —</option>' +
      PV_CITIES.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join('');
  },

  // ------------------------------------------------------------------
  // LOCATION & OFFICIAL CLIMATE
  // ------------------------------------------------------------------
  quickPickCity(idx) {
    if (idx === '') return;
    const c = PV_CITIES[+idx]; if (!c) return;
    this._setLocation(c[0], c[1], c[2]);
  },

  onCitySearchInput(q) {
    clearTimeout(this._searchTimer);
    const box = document.getElementById('pv-city-results');
    if (!q || q.trim().length < 2) { if (box) box.style.display = 'none'; return; }
    this._searchTimer = setTimeout(() => this._geocode(q.trim()), 350);
  },

  async _geocode(q) {
    const box = document.getElementById('pv-city-results'); if (!box) return;
    box.style.display = 'block';
    box.innerHTML = '<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">Searching…</div>';
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
      const j = await r.json();
      const res = j.results || [];
      if (!res.length) { box.innerHTML = '<div style="padding:.5rem;font-size:.78rem;color:var(--text-light)">No results.</div>'; return; }
      box.innerHTML = res.map(r2 => {
        const lbl = [r2.name, r2.admin1, r2.country].filter(Boolean).join(', ');
        return `<div style="padding:.45rem .6rem;cursor:pointer;font-size:.78rem;border-bottom:1px solid var(--border)"
          onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background=''"
          onclick="PV._setLocation('${lbl.replace(/'/g,"\\'")}',${r2.latitude},${r2.longitude})"
          >${lbl} <span style="color:var(--text-light)">(${r2.latitude.toFixed(2)}, ${r2.longitude.toFixed(2)})</span></div>`;
      }).join('');
    } catch(e) {
      box.innerHTML = '<div style="padding:.5rem;font-size:.78rem;color:var(--danger)">Search failed. Use manual coords.</div>';
    }
  },

  useManualCoords() {
    const lat = parseFloat(document.getElementById('pv-lat')?.value);
    const lon = parseFloat(document.getElementById('pv-lon')?.value);
    if (isNaN(lat) || isNaN(lon)) { alert('Enter valid lat/lon.'); return; }
    this._setLocation(`Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`, lat, lon);
  },

  _setLocation(name, lat, lon) {
    this._loc = { name, lat, lon };
    const box = document.getElementById('pv-city-results'); if (box) box.style.display = 'none';
    const li = document.getElementById('pv-lat'), lo = document.getElementById('pv-lon');
    if (li) li.value = lat.toFixed(4); if (lo) lo.value = lon.toFixed(4);
    const nl = document.getElementById('pv-loc-name'); if (nl) nl.textContent = name;
    this.fetchOfficialClimate();
  },

  async fetchOfficialClimate() {
    if (!this._loc) { alert('Select a location first.'); return; }
    const st = document.getElementById('pv-climate-status');
    const setS = (m,c) => { if (st) { st.textContent = m; st.style.color = c || 'var(--text-light)'; } };
    setS('Fetching official climate data (NASA POWER + ERA5)…');
    const { lat, lon } = this._loc;
    let annualT = null, annualRH = null, annualG = null, monthly = [], source = '';

    try {
      const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,RH2M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
      const j = await (await fetch(url)).json();
      const T = j.properties.parameter.T2M, RH = j.properties.parameter.RH2M;
      const G = j.properties.parameter.ALLSKY_SFC_SW_DWN;
      const MS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      monthly = MS.map(m => ({ m, t:T[m], rh:RH[m], g:G?G[m]:null }));
      annualT  = T.ANN  != null ? T.ANN  : monthly.reduce((a,b)=>a+b.t,0)/12;
      annualRH = RH.ANN != null ? RH.ANN : monthly.reduce((a,b)=>a+b.rh,0)/12;
      annualG  = G ? (G.ANN != null ? G.ANN : monthly.reduce((a,b)=>a+(b.g||0),0)/12) : 180;
      source = 'NASA POWER (20-yr MERRA-2 climatology)';
    } catch(e) {}

    try {
      const end = new Date(Date.now() - 10*864e5), start = new Date(end.getTime() - 365*864e5);
      const fmt = d => d.toISOString().slice(0,10);
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${fmt(start)}&end_date=${fmt(end)}&hourly=temperature_2m,relative_humidity_2m&timezone=auto`;
      const j = await (await fetch(url)).json();
      const times = j.hourly.time, Ts = j.hourly.temperature_2m, RHs = j.hourly.relative_humidity_2m;
      const sT = new Array(24).fill(0), sRH = new Array(24).fill(0), cnt = new Array(24).fill(0);
      let gT = 0, gRH = 0, gN = 0;
      for (let i = 0; i < times.length; i++) {
        if (Ts[i] == null || RHs[i] == null) continue;
        const h = parseInt(times[i].slice(11,13), 10);
        sT[h] += Ts[i]; sRH[h] += RHs[i]; cnt[h]++;
        gT += Ts[i]; gRH += RHs[i]; gN++;
      }
      this._diurnal = { hours:[...Array(24).keys()], T:sT.map((v,h)=>cnt[h]?v/cnt[h]:null), RH:sRH.map((v,h)=>cnt[h]?v/cnt[h]:null), source:'ERA5 reanalysis (ECMWF/Copernicus via Open-Meteo)' };
      if (!annualT && gN) { annualT = gT/gN; annualRH = gRH/gN; source = 'ERA5 reanalysis (ECMWF/Copernicus)'; }
    } catch(e) { this._diurnal = null; }

    if (annualT == null) { setS('Could not reach data sources. Enter T and RH manually.', 'var(--danger)'); return; }
    this._climate = { annualT, annualRH, annualG:annualG||180, monthly, source };
    const te = document.getElementById('pv-tamb'), re = document.getElementById('pv-rh');
    if (te) te.value = annualT.toFixed(1); if (re) re.value = annualRH.toFixed(0);
    setS(`✓ ${source}  ·  T ≈ ${annualT.toFixed(1)} °C, RH ≈ ${annualRH.toFixed(0)} %`, 'var(--success)');
  },

  // ------------------------------------------------------------------
  // SIMULATION
  // ------------------------------------------------------------------
  async _buildConfig() {
    const Tair = parseFloat(document.getElementById('pv-tamb')?.value);
    const RH   = parseFloat(document.getElementById('pv-rh')?.value);
    if (isNaN(Tair) || isNaN(RH)) return null;

    const wFront = await this.getBarrierWVTR('front');
    const wBack  = await this.getBarrierWVTR('back');
    const otrRatio = parseFloat(document.getElementById('pv-otr-ratio')?.value) || 300;
    const oFrontManual = parseFloat(document.getElementById('pv-front-manual-otr')?.value);
    const oBackManual  = parseFloat(document.getElementById('pv-back-manual-otr')?.value);
    const oFront = isNaN(oFrontManual) || oFrontManual <= 0 ? wFront * otrRatio : oFrontManual;
    const oBack  = isNaN(oBackManual)  || oBackManual  <= 0 ? wBack  * otrRatio : oBackManual;

    const edgeKey  = document.getElementById('pv-edge')?.value || 'pib';
    const ep       = PV_EDGES[edgeKey];
    const ef       = parseFloat(document.getElementById('pv-edgefactor')?.value) || 6;
    const encType  = document.getElementById('pv-encap-type')?.value || 'eva';
    const encThick = parseFloat(document.getElementById('pv-encap-thick')?.value) || 0.5;
    const L  = Math.max(0.1, parseFloat(document.getElementById('pv-len')?.value) || 1.6);
    const W  = Math.max(0.1, parseFloat(document.getElementById('pv-wid')?.value) || 1.0);
    const G  = this._climate?.annualG || 180;
    const uvF = parseFloat(document.getElementById('pv-uvfrac')?.value) || 0.05;
    const tech = document.getElementById('pv-tech')?.value || 'perovskite';

    return {
      tech,
      front: { wvtr:wFront, Tt:38, RHt:90, otr:oFront, OTt:23, O2t:100 },
      back:  { wvtr:wBack,  Tt:38, RHt:90, otr:oBack,  OTt:23, O2t:100 },
      encap: { type:encType, thickMm:encThick },
      geom:  { L, W },
      edge:  { D:ep.d/8766, Q:ep.Q, gSeal:ep.gSeal, edgeFactor:ef },
      env:   { Tair, RH, G, uvFraction:uvF },
      tDelta: 18,
      horizonH: this.HORIZON_YR * 24 * 365.25,
      steps: 4000
    };
  },

  async calculate() {
    if (typeof window.MoistureEngine === 'undefined') {
      alert('Physics engine (moisture-engine-v3.js) not loaded.'); return;
    }
    const cfg = await this._buildConfig();
    if (!cfg) { alert('Set temperature and RH (fetch official climate or enter manually).'); return; }
    const raw = window.MoistureEngine.simulate(cfg);
    const Y   = 24 * 365.25;
    let acc = 0, n = 0;
    raw.series.forEach(p => { if (p.t <= 25*Y) { acc += p.ret; n++; } });
    const sim = {
      t80: raw.t80 ? raw.t80/Y : null,
      t90: raw.t90 ? raw.t90/Y : null,
      t97: raw.t97 ? raw.t97/Y : null,
      series: raw.series.map(p => ({ ...p, t: p.t/Y })),
      channelFractions: raw.channelFractions,
      Tamb: cfg.env.Tair, Tmod: cfg.env.Tair+18, rhFrac: cfg.env.RH/100,
      L: cfg.geom.L, W: cfg.geom.W,
      wFront: cfg.front.wvtr, wBack: cfg.back.wvtr,
      edgeD: PV_EDGES[document.getElementById('pv-edge')?.value||'pib'].d,
      edgeQ: cfg.edge.Q, yield25: n ? acc/n : 1
    };
    this._lastSim = sim;
    this._renderResult(sim);
  },

  _fmt(v)  { if (v===null) return '>'+this.HORIZON_YR; return v<1?(v*12).toFixed(1).replace(/\.0$/,''):v.toFixed(1); },
  _unit(v) { return v!==null&&v<1?'months':'years'; },
  _sample(series, yr) {
    if (!series||!series.length) return {t:0,ret:1,RHint:0,I:0};
    let b=series[0],bd=Math.abs(series[0].t-yr);
    for (const p of series) { const d=Math.abs(p.t-yr); if (d<bd){bd=d;b=p;} }
    return b;
  },

  _renderResult(sim) {
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('pv-t80', this._fmt(sim.t80)); set('pv-t80u', this._unit(sim.t80));
    set('pv-t90', this._fmt(sim.t90)); set('pv-t90u', this._unit(sim.t90));
    set('pv-t97', this._fmt(sim.t97)); set('pv-t97u', this._unit(sim.t97));
    set('pv-tmod', sim.Tmod.toFixed(0)+' °C');
    set('pv-yield', (sim.yield25*100).toFixed(1)+' %');
    if (sim.channelFractions) {
      const cf = sim.channelFractions;
      set('pv-ch-moisture', cf.moisture); set('pv-ch-oxygen',  cf.oxygen);
      set('pv-ch-thermal',  cf.thermal);  set('pv-ch-uv',      cf.uv);
      const cb = document.getElementById('pv-channels'); if (cb) cb.style.display = 'block';
    }
    const cont = document.getElementById('pv-charts'); if (cont) cont.style.display = 'block';
    requestAnimationFrame(() => setTimeout(() => {
      this._drawRH(sim);
      this._drawPCE(sim);
      this._drawDailyExchange(sim);
      this._drawMonthly();
    }, 80));
  },

  // ------------------------------------------------------------------
  // CHARTS
  // ------------------------------------------------------------------
  _drawRH(sim) {
    if (typeof Chart === 'undefined') return;
    if (typeof destroyChart === 'function') destroyChart('pvRH');
    const ctx = document.getElementById('pvRHChart')?.getContext('2d'); if (!ctx) return;
    const step = Math.max(1, Math.ceil(sim.series.length/400));
    const lab = [], dat = [];
    for (let i = 0; i < sim.series.length; i+=step) {
      lab.push(sim.series[i].t.toFixed(1));
      dat.push((sim.series[i].RHint * 100));
    }
    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvRH = new Chart(ctx, {
      type: 'line',
      data: { labels: lab, datasets: [{
        label: 'Internal RH at cell (%)',
        data: dat, borderColor: '#0f8a8c',
        backgroundColor: 'rgba(15,138,140,0.10)', fill: true,
        tension: 0.3, pointRadius: 0, borderWidth: 2.2
      }] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},
          tooltip:{ callbacks:{ label: c => `Internal RH: ${c.parsed.y.toFixed(1)} %` } } },
        scales:{
          x:{ title:{display:true,text:'Years'}, ticks:{maxTicksLimit:9,font:{size:9}} },
          y:{ min:0, max:100, title:{display:true,text:'Internal RH (%)'},
              ticks:{callback:v=>v+'%',font:{size:9}} }
        }
      }
    });
  },

  _drawPCE(sim) {
    if (typeof Chart === 'undefined') return;
    if (typeof destroyChart === 'function') destroyChart('pvPCE');
    const ctx = document.getElementById('pvPCEChart')?.getContext('2d'); if (!ctx) return;
    const step = Math.max(1, Math.ceil(sim.series.length/400));
    const lab = [], dat = [];
    for (let i = 0; i < sim.series.length; i+=step) {
      lab.push(sim.series[i].t.toFixed(1));
      dat.push(sim.series[i].ret * 100);
    }
    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvPCE = new Chart(ctx, {
      type: 'line',
      data: { labels: lab, datasets: [
        { label:'PCE retention (%)', data:dat, borderColor:'#0a4f63',
          backgroundColor:'rgba(10,79,99,0.10)', fill:true, tension:0.3, pointRadius:0, borderWidth:2.2 },
        { label:'T80 (80%)', data:new Array(lab.length).fill(80), borderColor:'#0f8a8c',
          borderDash:[5,4], borderWidth:1, pointRadius:0, fill:false },
        { label:'T90 (90%)', data:new Array(lab.length).fill(90), borderColor:'#c9971f',
          borderDash:[5,4], borderWidth:1, pointRadius:0, fill:false }
      ] },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},
          tooltip:{ callbacks:{ label: c => `PCE: ${c.parsed.y.toFixed(1)} %` } } },
        scales:{
          x:{ title:{display:true,text:'Years'}, ticks:{maxTicksLimit:9,font:{size:9}} },
          y:{ min:0, max:100, title:{display:true,text:'PCE retention (%)'},
              ticks:{callback:v=>v+'%',font:{size:9}} }
        }
      }
    });
  },

  _drawDailyExchange(sim) {
    if (typeof Chart === 'undefined') return;
    if (typeof destroyChart === 'function') destroyChart('pvDay');
    const ctx = document.getElementById('pvDayChart')?.getContext('2d'); if (!ctx) return;
    const Psat = T => 610.94 * Math.exp((17.625*T)/(T+243.04));
    const prof = this._diurnal && this._diurnal.T.some(v=>v!=null)
      ? this._diurnal
      : { hours:[...Array(24).keys()],
          T:[...Array(24).keys()].map(h=>sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)),
          RH:[...Array(24).keys()].map(h=>Math.min(98,Math.max(10,sim.rhFrac*100-2*(sim.Tamb+5*Math.cos((h-15)/24*2*Math.PI)-sim.Tamb)))),
          source:'Synthetic (from annual mean)' };
    const midPoint = this._sample(sim.series, sim.t80 ? sim.t80/2 : 5);
    const intRH = midPoint.RHint * 100;
    const Kfaces = (sim.wFront + sim.wBack) / (24 * 0.9 * Psat(38));
    const dPref  = 0.9 * Psat(23) * 1000;
    const flux = [], extRH = [];
    for (let h = 0; h < 24; h++) {
      const Th  = prof.T[h]  != null ? prof.T[h]  : sim.Tamb;
      const RHh = prof.RH[h] != null ? prof.RH[h] : sim.rhFrac*100;
      const Tm  = Th + 18;
      const pExt = (RHh/100)*Psat(Tm)*1000, pInt = (intRH/100)*Psat(Tm)*1000;
      flux.push(parseFloat((Kfaces*(pExt-pInt)/dPref).toFixed(4)));
      extRH.push(parseFloat(RHh.toFixed(1)));
    }
    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvDay = new Chart(ctx, {
      type:'line',
      data:{ labels:[...Array(24).keys()].map(h=>h+':00'), datasets:[
        { label:'Net moisture flux  (+ entering / − leaving)',
          data:flux, yAxisID:'y', borderColor:'#0a4f63', borderWidth:2, tension:0.35, pointRadius:0,
          fill:{target:{value:0}},
          segment:{backgroundColor:c=>c.p0.parsed.y>=0?'rgba(15,138,140,0.22)':'rgba(217,98,43,0.20)'},
          backgroundColor:'rgba(15,138,140,0.18)' },
        { label:`External RH — ${prof.source}`,
          data:extRH, yAxisID:'y1', borderColor:'#c9971f', borderWidth:1.5,
          borderDash:[4,3], tension:0.35, pointRadius:0, fill:false }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top',labels:{boxWidth:12,font:{size:9}}} },
        scales:{
          x:{ ticks:{maxTicksLimit:12,font:{size:8}} },
          y:{ title:{display:true,text:'Flux (arbitrary units)'} },
          y1:{ position:'right', min:0, max:100, title:{display:true,text:'RH %'},
               grid:{drawOnChartArea:false} }
        }
      }
    });
  },

  _drawMonthly() {
    if (typeof Chart === 'undefined' || !this._climate?.monthly?.length) return;
    if (typeof destroyChart === 'function') destroyChart('pvMon');
    const ctx = document.getElementById('pvMonChart')?.getContext('2d'); if (!ctx) return;
    const m = this._climate.monthly;
    if (!window.chartInstances) window.chartInstances = {};
    window.chartInstances.pvMon = new Chart(ctx, {
      type:'bar',
      data:{ labels:m.map(x=>x.m), datasets:[
        { label:'Temp (°C)', data:m.map(x=>x.t), backgroundColor:'rgba(217,98,43,0.7)', yAxisID:'y' },
        { label:'RH (%)',    data:m.map(x=>x.rh), backgroundColor:'rgba(15,138,140,0.6)', yAxisID:'y1' }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'top',labels:{boxWidth:12,font:{size:9}}} },
        scales:{ y:{position:'left',title:{display:true,text:'°C'}},
                 y1:{position:'right',min:0,max:100,title:{display:true,text:'RH %'},grid:{drawOnChartArea:false}} } }
    });
  }
};

// ====================================================================
// RENDER
// ====================================================================
function renderPVDegradation() {
  const techOpts = (typeof window.MoistureEngine !== 'undefined')
    ? Object.entries(window.MoistureEngine.PV_TECH_DB).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')
    : '<option value="perovskite">Perovskite</option><option value="cigs">CIGS</option><option value="csi">c-Si</option>';

  const companyActive = typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive();
  const calcWvtr = (() => { try { return State.calcResult?.total != null ? State.calcResult.total.toFixed(4)+' g/m²·day' : 'No result yet'; } catch(e){ return 'No result yet'; } })();
  const lamName  = (() => { try { return State.laminateName || ''; } catch(e){ return ''; } })();

  function barrierBlock(which, label) {
    return `
    <div class="pv-s">
      <div class="pv-h" style="color:var(--warning)">▼ ${label}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:.4rem;margin-bottom:.6rem">
        <button id="pv-${which}-src-calc"    class="btn btn-sm" onclick="PV.setBarrierSource('${which}','calc')"    style="font-size:.72rem;background:var(--primary);color:#fff;border:none">Calculator</button>
        <button id="pv-${which}-src-db"      class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','db')"      style="font-size:.72rem">Community DB</button>
        <button id="pv-${which}-src-company" class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','company')" style="font-size:.72rem${companyActive?'':';opacity:.45;cursor:not-allowed'}" ${companyActive?'':'disabled'}>Company DB</button>
        <button id="pv-${which}-src-manual"  class="btn btn-sm btn-outline" onclick="PV.setBarrierSource('${which}','manual')"  style="font-size:.72rem">Manual</button>
      </div>
      <div id="pv-${which}-panel-calc">
        <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:.55rem .7rem;font-size:.75rem">
          <div style="font-weight:700;margin-bottom:.1rem">${lamName||'Current calculator result'}</div>
          <div style="display:flex;justify-content:space-between"><span>Active WVTR:</span><strong style="color:var(--primary)">${calcWvtr}</strong></div>
        </div>
      </div>
      <div id="pv-${which}-panel-db" style="display:none">
        <div class="form-group" style="margin:0"><label style="font-size:.74rem">Select from Community DB (WVTR laminates)</label>
        <select class="form-input" id="pv-${which}-db-pick" style="font-size:.78rem" onchange="PV._updateBarrierSummary('${which}')"><option value="">Loading…</option></select></div>
      </div>
      <div id="pv-${which}-panel-company" style="display:none">
        <div class="form-group" style="margin:0"><label style="font-size:.74rem">Select from Company DB</label>
        <select class="form-input" id="pv-${which}-co-pick" style="font-size:.78rem" onchange="PV._updateBarrierSummary('${which}')"><option value="">Loading…</option></select></div>
      </div>
      <div id="pv-${which}-panel-manual" style="display:none">
        <div class="form-group" style="margin:0"><label style="font-size:.74rem">WVTR value (g/m²·day)</label>
        <input type="number" id="pv-${which}-manual-wvtr" class="form-input" step="any" placeholder="e.g. 0.001" oninput="PV._updateBarrierSummary('${which}')"></div>
      </div>
      <div style="margin-top:.5rem;background:var(--primary-light);border-radius:5px;padding:.35rem .6rem;font-size:.72rem;display:flex;justify-content:space-between">
        <span style="font-weight:600">Active WVTR source:</span>
        <span id="pv-${which}-summary" style="color:var(--primary)">—</span>
      </div>
      <div style="margin-top:.5rem">
        <label style="font-size:.72rem;font-weight:600;color:var(--text-light)">OTR — manual override (leave blank to auto-estimate from WVTR)</label>
        <input type="number" id="pv-${which}-manual-otr" class="form-input" step="any" placeholder="cc/m²·day  (blank = WVTR × ratio)">
      </div>
    </div>`;
  }

  return `
  <style>
    #pvroot .pv-s{padding:1rem;border-bottom:1px solid var(--border)}
    #pvroot .pv-h{display:flex;align-items:center;gap:.5rem;margin-bottom:.55rem;font-weight:600;font-size:.85rem;color:var(--primary)}
    #pvroot .ro{border:1px solid var(--border);border-radius:8px;padding:.8rem;background:#fff;position:relative;overflow:hidden}
    #pvroot .ro::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--primary)}
    #pvroot .ro.t90::before{background:var(--warning)}
    #pvroot .ro.t97::before{background:#d9622b}
    #pvroot .ro .k{font-size:.7rem;letter-spacing:.08em;color:var(--text-light);text-transform:uppercase;font-weight:600}
    #pvroot .ro .v{font-size:1.75rem;font-weight:800;line-height:1;margin-top:.3rem;color:var(--primary)}
    #pvroot .ro .u{font-size:.7rem;color:var(--text-light)}
    #pvroot .ch-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;margin-top:.6rem}
    #pvroot .ch{font-size:.73rem;text-align:center;padding:.4rem .3rem;background:var(--bg);border-radius:4px}
    #pvroot .ch .cv{font-weight:700;font-size:.92rem;margin-top:.15rem}
    #pvroot canvas{display:block;width:100%}
  </style>

  <div id="pvroot" class="grid grid-2" style="gap:1.2rem;align-items:start">

    <!-- ===== INPUT ===== -->
    <div class="card" style="padding:0">
      <div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1rem">PV Module Lifetime Simulator</h2>
        <div style="font-size:.72rem;color:var(--text-light);margin-top:.2rem">
          Moisture ingress through the encapsulation stack · multi-channel degradation · official climate data
        </div>
      </div>

      <!-- 1. LOCATION -->
      <div class="pv-s">
        <div class="pv-h">▼ 1. Installation location</div>
        <div class="form-group" style="margin:0;position:relative">
          <label>Search any city worldwide</label>
          <input type="text" class="form-input" placeholder="Type city name…" autocomplete="off" oninput="PV.onCitySearchInput(this.value)">
          <div id="pv-city-results" style="display:none;position:absolute;z-index:20;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:200px;overflow:auto;margin-top:2px"></div>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
          <div class="form-group" style="margin:0"><label>Quick pick</label><select class="form-input" id="pv-city-quick" onchange="PV.quickPickCity(this.value)"></select></div>
          <div></div>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.4rem">
          <div class="form-group" style="margin:0"><label>Latitude</label><input type="number" id="pv-lat" class="form-input" step=".0001" placeholder="e.g. 41.90"></div>
          <div class="form-group" style="margin:0"><label>Longitude</label><input type="number" id="pv-lon" class="form-input" step=".0001" placeholder="e.g. 12.50"></div>
        </div>
        <button class="btn btn-sm btn-outline btn-full" style="margin-top:.5rem;font-size:.78rem" onclick="PV.useManualCoords()">Use coordinates &amp; fetch official data</button>
        <div style="margin-top:.55rem;background:var(--primary-light);border-radius:6px;padding:.5rem .7rem;font-size:.75rem">
          <div style="font-weight:700" id="pv-loc-name">No location selected</div>
          <div id="pv-climate-status" style="color:var(--text-light);margin-top:.15rem">Pick a location to load NASA POWER + ERA5 data.</div>
        </div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
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
      ${barrierBlock('front', '3. Front cover — WVTR barrier')}

      <!-- 4. BACK BARRIER -->
      ${barrierBlock('back', '4. Back cover / backsheet — WVTR barrier')}

      <!-- 5. OTR RATIO -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--text-light)">▼ OTR auto-estimate</div>
        <div style="font-size:.73rem;color:var(--text-light);margin-bottom:.5rem">When no manual OTR is set, OTR is estimated as WVTR × ratio. Typical range for polymer barriers: 200–500.</div>
        <div class="form-group" style="margin:0"><label>WVTR → OTR ratio</label><input type="number" id="pv-otr-ratio" class="form-input" value="300" step="10" min="10"></div>
      </div>

      <!-- 6. ENCAPSULANT (GAB isotherm) -->
      <div class="pv-s">
        <div class="pv-h" style="color:var(--purple)">▼ 5. Encapsulant (GAB sorption isotherm)</div>
        <div class="grid grid-2" style="gap:.5rem">
          <div class="form-group" style="margin:0"><label>Type</label><select id="pv-encap-type" class="form-input"></select></div>
          <div class="form-group" style="margin:0"><label>Thickness per side (mm)</label><input type="number" id="pv-encap-thick" class="form-input" value="0.5" step=".1" min=".1"></div>
        </div>
      </div>

      <!-- 7. EDGE SEAL + GEOMETRY -->
      <div class="pv-s">
        <div class="pv-h">▼ 6. Edge seal &amp; module geometry</div>
        <div class="form-group" style="margin:0"><label>Edge seal type</label><select id="pv-edge" class="form-input"></select></div>
        <div class="grid grid-2" style="gap:.5rem;margin-top:.5rem">
          <div class="form-group" style="margin:0"><label>Edge factor <span style="font-size:.65rem">(lit. 2–20)</span></label><input type="number" id="pv-edgefactor" class="form-input" value="6" step=".5"></div>
          <div class="form-group" style="margin:0"><label>UV fraction</label><input type="number" id="pv-uvfrac" class="form-input" value="0.05" step=".01"></div>
          <div class="form-group" style="margin:0"><label>Length (m)</label><input type="number" id="pv-len" class="form-input" value="1.6" step=".1"></div>
          <div class="form-group" style="margin:0"><label>Width (m)</label><input type="number" id="pv-wid" class="form-input" value="1.0" step=".1"></div>
        </div>
      </div>

      <!-- CALCULATE -->
      <div style="padding:1rem">
        <button class="btn btn-danger btn-full" onclick="PV.calculate()" style="padding:.8rem;font-size:.9rem">▶ Run Simulation</button>
      </div>
    </div>

    <!-- ===== RESULTS ===== -->
    <div style="position:sticky;top:1rem">
      <div class="card">
        <!-- What does this tool show? -->
        <div style="background:var(--primary-light);border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.8rem;line-height:1.55">
          <strong style="display:block;margin-bottom:.2rem">What this simulator shows</strong>
          <span style="color:var(--text-light)">
            <span style="color:var(--primary);font-weight:600">Chart 1</span> — how much moisture (internal RH) actually reaches the solar cells through the encapsulation.<br>
            <span style="color:#0a4f63;font-weight:600">Chart 2</span> — the resulting power loss: PCE retention (%) over the module's life, and when it crosses T80/T90/T97.
          </span>
        </div>

        <!-- T80/90/97 -->
        <div class="grid grid-3" style="gap:.7rem">
          <div class="ro t80"><div class="k">T80</div><div class="v" id="pv-t80">–</div><div class="u"><span id="pv-t80u">years</span><br>80% of initial power</div></div>
          <div class="ro t90"><div class="k">T90</div><div class="v" id="pv-t90">–</div><div class="u"><span id="pv-t90u">years</span><br>90% of initial power</div></div>
          <div class="ro t97"><div class="k">T97</div><div class="v" id="pv-t97">–</div><div class="u"><span id="pv-t97u">years</span><br>97% of initial power</div></div>
        </div>

        <!-- Channel fractions -->
        <div id="pv-channels" style="display:none;margin-top:.8rem">
          <div style="font-size:.7rem;color:var(--text-light);font-weight:600;margin-bottom:.3rem">Degradation driver breakdown</div>
          <div class="ch-grid">
            <div class="ch"><div style="color:var(--primary)">Moisture</div><div class="cv" id="pv-ch-moisture">–</div></div>
            <div class="ch"><div style="color:var(--warning)">Oxygen</div><div class="cv" id="pv-ch-oxygen">–</div></div>
            <div class="ch"><div style="color:#d9622b">Thermal</div><div class="cv" id="pv-ch-thermal">–</div></div>
            <div class="ch"><div style="color:#8b5cf6">UV</div><div class="cv" id="pv-ch-uv">–</div></div>
          </div>
        </div>

        <div class="grid grid-2" style="gap:.6rem;margin-top:.8rem;font-size:.8rem">
          <div><div style="color:var(--text-light);font-size:.7rem">Operating module T</div><strong id="pv-tmod">–</strong></div>
          <div><div style="color:var(--text-light);font-size:.7rem">Mean PCE yield (25 yr)</div><strong id="pv-yield">–</strong></div>
        </div>
      </div>

      <div id="pv-charts" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.2rem">Moisture reaching the cell plane</h3>
          <div style="font-size:.72rem;color:var(--text-light);margin-bottom:.4rem">How much humidity (internal RH %) builds up inside the encapsulation and at the cell surface over time.</div>
          <div style="height:230px"><canvas id="pvRHChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.2rem">Power output degradation</h3>
          <div style="font-size:.72rem;color:var(--text-light);margin-bottom:.4rem">PCE retention (%) relative to initial power. T80 = industry standard end-of-life criterion (IEC 61215 damp-heat).</div>
          <div style="height:230px"><canvas id="pvPCEChart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.2rem">Daily moisture exchange — the module "breathes"</h3>
          <div style="font-size:.72rem;color:var(--text-light);margin-bottom:.4rem">On cool humid nights moisture flows <em>into</em> the module (teal). On hot dry afternoons the driving force reverses and moisture flows <em>out</em> (amber). Steady-state models miss this entirely.</div>
          <div style="height:220px"><canvas id="pvDayChart"></canvas></div>
        </div>
        <div class="card">
          <h3 style="font-size:.9rem;font-weight:600;margin-bottom:.4rem">Monthly climate — NASA POWER official data</h3>
          <div style="height:190px"><canvas id="pvMonChart"></canvas></div>
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
<div style="padding:1.4rem 1.6rem">
<h2 style="font-family:Georgia,serif;font-size:1.25rem;border-bottom:1px solid var(--border);padding-bottom:.6rem;margin-bottom:1.2rem">
How the simulation works
</h2>
<div style="font-size:.93rem;line-height:1.8;color:#334155;font-family:Georgia,serif">

<p>A photovoltaic module is not hermetically sealed. Its front sheet, back sheet and edge seal form a system of distributed resistances that water vapour — and, for sensitive cell types, oxygen — can cross over time. The goal of this simulator is to answer two related questions at once: how much moisture actually reaches the active cell layer, and what does that mean for the module's power output over its lifetime?</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">From a WVTR number to a physical permeance</h3>
<p>The WVTR value stamped on a datasheet is not a fundamental material constant — it depends on the temperature, the relative humidity, the film thickness and the test method used. A barrier rated 0.01 g/m²/day at 38 °C/90 % RH behaves very differently at 25 °C/60 % RH field conditions. The engine therefore first converts each barrier value into a true permeance K = WVTR / Δp(test conditions), where Δp is the water vapour partial pressure difference at the test. It then re-evaluates K at the actual service temperature using an Arrhenius correction, so that the simulation reflects what the barrier actually does on the rooftop rather than in a test chamber.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">Moisture inventory and the GAB sorption isotherm</h3>
<p>Once water enters the laminate, it is not free vapour — it is absorbed by the encapsulant polymer. EVA, POE, TPU and PVB each have a characteristic sorption curve. The engine tracks the accumulated water mass I [g/m²] as a state variable and converts it to the true internal relative humidity (the physical quantity that the cell experiences) via the GAB (Guggenheimer–Anderson–de Boer) isotherm — the same equation used in this app's shelf-life module for food packaging. This approach correctly captures the self-limiting nature of moisture ingress: as the encapsulant absorbs water and its internal humidity rises, the driving force for further ingress falls, eventually reaching equilibrium. Simple models that assume a constant flux get this badly wrong.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">Edge ingress and the desiccant breakthrough</h3>
<p>In glass–glass modules the faces are essentially impermeable and the dominant moisture pathway is lateral: diffusion inward along the edge encapsulant or PIB seal. The engine models a diffusion front that advances as √(D·t), where D is the lateral diffusivity of the edge material. Where a desiccant strip is present, it absorbs the leading moisture and delays the breakthrough by a time that depends on its capacity Q [g/m of perimeter]. Once saturated, the desiccant no longer protects the cell and ingress accelerates. This breakthrough-time behaviour is experimentally documented and is the key design parameter of high-performance edge seal systems such as B-Dry.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">Why the module "breathes" during the day</h3>
<p>The direction of moisture flux at any moment is governed by the vapour pressure difference between the outside air and the module interior. Vapour pressure rises steeply with temperature. During a hot afternoon the module surface may be 30–40 °C hotter than the ambient air; at the same external relative humidity, this raises the saturation pressure inside the module to the point where the net flux reverses — moisture can actually leave the module during the hottest part of the day, only to re-enter after sunset when the module cools. Steady-state models that use an annual average temperature miss this diurnal cycling entirely. The daily exchange chart shows this breathing using hourly temperature and humidity data from the ERA5 reanalysis (ECMWF / Copernicus).</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">Multi-channel degradation and the oxygen dimension</h3>
<p>The internal relative humidity is the physical cause; power loss is the consequence. The engine maps internal RH (and, for perovskite and organic cells, cumulative oxygen exposure) to a degradation dose via an Arrhenius kinetic model. Four independent channels contribute: moisture-driven chemistry, thermal ageing, UV photo-oxidation and, for perovskite specifically, superoxide formation driven by the combined action of moisture and light. The sum of all channels determines the PCE retention curve and the lifetime thresholds T80, T90 and T97 — the fraction of original power retained after the module crosses 80 %, 90 % or 97 % of its initial output. These are the metrics used in the IEC 61215 damp-heat qualification test and in commercial warranty contracts. The WVTR + OTR combination in a single lifetime model is the core differentiator of this tool: no publicly available platform couples both permeant gases to a degradation prediction for all major cell technologies.</p>

<h3 style="font-family:sans-serif;font-size:1rem;color:var(--primary-dark);margin-top:1.4rem;font-weight:700">Official climate data and cell sensitivities</h3>
<p>Climate inputs come from two authoritative sources. Long-term monthly means (temperature, relative humidity, solar irradiance) are retrieved from the NASA POWER system (NASA Langley Research Center, 20-year MERRA-2 climatology). The diurnal profile used for the breathing chart is derived from ERA5 hourly reanalysis data (European Centre for Medium-Range Weather Forecasts / Copernicus Climate Change Service), accessed via the Open-Meteo archive. Cell degradation sensitivities are anchored to peer-reviewed aging data: perovskite coefficients calibrated against Tsuji et al. 2024 (Materials, 17, 3002) and Mariotti 2025; CIGS against Coyle 2013 (Prog. PV) which established the BET-type moisture kinetics and damp-heat acceleration factors of 15–50×; crystalline silicon against the Jordan & Kurtz 2016 compendium of field degradation rates (median 0.5–0.6 % / year). All sensitivity values are editable — the benchmark table in the engine is the calibration tool.</p>

<div style="margin-top:1.5rem;padding:.85rem 1rem;background:var(--bg);border-radius:8px;font-size:.82rem;color:var(--text-light);border-left:3px solid var(--warning);font-family:sans-serif;line-height:1.6">
<strong>Disclaimer.</strong> The degradation kinetic coefficients are screening-grade values calibrated against published data and are intended for comparative analysis and concept screening. They must be re-fitted on measured damp-heat or ISOS test data for the specific encapsulation system and cell composition before any decision-grade use, product warranty or certification claim.
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
