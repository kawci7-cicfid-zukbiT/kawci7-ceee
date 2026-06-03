// ====================================================================
// 🧪 MVTR.JS - ICH Q1A(R2) Compliance Engine
// ====================================================================
// Dependencies: Chart.js, jsPDF, html2canvas
// Pattern: Same as shelflife.js (SL object)
// ====================================================================

// ====================================================================
// 📐 CONSTANTS
// ====================================================================
const R_GAS = 8.314e-3;
const DAYS  = 365;

const ICH_ZONES = [
  { id:'I',    label:'Zone I',       desc:'Temperate',              T:21, RH:45, color:'#2563eb' },
  { id:'II',   label:'Zone II',      desc:'Subtropical/Mediterr.',  T:25, RH:60, color:'#16a34a' },
  { id:'IIIa', label:'Zone IIIa',    desc:'Hot Dry',                T:40, RH:15, color:'#d97706' },
  { id:'IVa',  label:'Zone IVa',     desc:'Hot Humid',              T:40, RH:75, color:'#dc2626' },
  { id:'IVb',  label:'Zone IVb',     desc:'Hot Very Humid (ASEAN)', T:30, RH:75, color:'#7c3aed' },
  { id:'ACC',  label:'Accelerated',  desc:'ICH Accelerated Test',   T:40, RH:75, color:'#0891b2' },
  { id:'INT',  label:'Intermediate', desc:'ICH Intermediate Test',  T:30, RH:65, color:'#db2777' }
];

const MVTR_SHAPE_CONFIGS = {
  flat:     { w:12, h:17, d:0,   lw:'Width (cm)',           lh:'Height (cm)',   ld:'(unused)' },
  standup:  { w:13, h:22, d:4,   lw:'Width (cm)',           lh:'Height (cm)',   ld:'Gusset (cm)' },
  flow:     { w:20, h:12, d:0,   lw:'Fin seal length (cm)', lh:'Web width (cm)',ld:'(unused)' },
  box:      { w:10, h:15, d:5,   lw:'Length (cm)',          lh:'Height (cm)',   ld:'Depth (cm)' },
  cylinder: { w:0,  h:12, d:10,  lw:'(unused)',             lh:'Height (cm)',   ld:'Diameter (cm)' },
  tray:     { w:15, h:10, d:3,   lw:'Length (cm)',          lh:'Width (cm)',    ld:'Depth (cm)' },
  bottle:   null,
  blister:  null
};

// ====================================================================
// 📦 MVTR OBJECT - All ICH compliance logic
// ====================================================================
const MVTR = {
  // Internal state
  _activeSource: 'calc',
  _manualOverride: false,
  _currentShape: 'flat',
  _results: null,
  _scenarios: [],
  _charts: {},
  _companyLinked: false,

  // ------------------------------------------------------------------
  // 🔧 INIT
  // ------------------------------------------------------------------
  init() {
    try { this._scenarios = JSON.parse(localStorage.getItem('mvtr_sce') || '[]'); } catch(e) { this._scenarios = []; }

    if (this._scenarios.length === 0) {
      const ex1 = { wRef:0.5, Tref:38, RHref:90, Ea:35, area:0.0408, Mcrit:2.0, shelf_years:2, shelfDays:730, label:'Blister Pack - Low WVTR', source:'db' };
      const ex2 = { wRef:1.5, Tref:38, RHref:90, Ea:40, area:0.0850, Mcrit:5.0, shelf_years:3, shelfDays:1095, label:'Pouch - Medium WVTR', source:'db' };
      this._scenarios.push({ id: Date.now()-2000, name: ex1.label, params: ex1, zones: this.runCalc(ex1), ts: new Date().toISOString() });
      this._scenarios.push({ id: Date.now()-1000, name: ex2.label, params: ex2, zones: this.runCalc(ex2), ts: new Date().toISOString() });
      try { localStorage.setItem('mvtr_sce', JSON.stringify(this._scenarios)); } catch(e){}
    }

    this.renderScenariosList();
    this.refreshCalcPanel();

    try {
      const saved = JSON.parse(localStorage.getItem('mvtr_last_params') || 'null');
      if (saved) {
        if (saved.Tref)        document.getElementById('ph-tref').value  = saved.Tref;
        if (saved.RHref)       document.getElementById('ph-rhref').value = saved.RHref;
        if (saved.Ea != null)  document.getElementById('ph-ea').value    = saved.Ea;
        if (saved.Mcrit)       document.getElementById('ph-crit').value  = saved.Mcrit;
        if (saved.shelf_years) document.getElementById('ph-years').value = saved.shelf_years;
      }
    } catch(e){}

    // beforeunload
    window.addEventListener('beforeunload', () => {
      if (this._results) try { localStorage.setItem('mvtr_last_params', JSON.stringify(this._results.params)); } catch(e){}
    });
  },

  // ------------------------------------------------------------------
  // 🔀 CALCULATOR ↔ COMPLIANCE BRIDGE (localStorage)
  // ------------------------------------------------------------------

  refreshCalcPanel() {
    try {
      const saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
      if (saved && saved.total > 0) {
        const nameEl   = document.getElementById('lam-name');
        const structEl = document.getElementById('lam-struct');
        const rateEl   = document.getElementById('lam-rate');
        if (nameEl)   nameEl.textContent  = saved.laminateName || 'Laminate from Calculator';
        if (structEl) structEl.textContent = saved.structure    || '';
        if (rateEl)   rateEl.textContent   = saved.total.toFixed(5) + ' g/m²/day';
        const tEl  = document.getElementById('ph-tref');
        const rhEl = document.getElementById('ph-rhref');
        if (saved.tRef  && tEl)  tEl.value  = saved.tRef;
        if (saved.rhRef && rhEl) rhEl.value = saved.rhRef;
      } else {
        const n = document.getElementById('lam-name');
        const s = document.getElementById('lam-struct');
        const r = document.getElementById('lam-rate');
        if (n) n.textContent = 'No laminate loaded';
        if (s) s.textContent = 'Run a calculation in the Calculator tab first, then return here.';
        if (r) r.textContent = '—';
      }
    } catch(e){}
    this.updateBanner();
  },

  // ------------------------------------------------------------------
  // 🔀 SOURCE SELECTION
  // ------------------------------------------------------------------

  setSource(s) {
    if (s === 'co' && !this._companyLinked) {
      alert('Company Database is locked.\n\nConnect to your organisation to unlock proprietary laminate data.');
      return;
    }
    this._activeSource = s;
    ['calc','db','co'].forEach(k => {
      const btn   = document.getElementById('src-' + k);
      const panel = document.getElementById('panel-' + k);
      if (btn)   btn.classList.toggle('active', k === s);
      if (panel) panel.style.display = k === s ? 'block' : 'none';
    });
    if (s === 'calc') this.refreshCalcPanel();
    else this.updateBanner();
  },

  unlockCompany() {
    alert('To unlock the Company Database:\n\n1. Go to the main app Settings\n2. Navigate to "Company" section\n3. Join an existing company with an invite code, or create a new company workspace\n4. Your organisation\'s laminates will then appear here automatically\n\nThis feature requires an active company membership.');
  },

  toggleManual(on) {
    this._manualOverride = on;
    const panel = document.getElementById('panel-manual');
    if (panel) panel.style.display = on ? 'block' : 'none';
    this.updateBanner();
  },

  onDBPick(val) {
    if (!val) return;
    const [w, t, rh] = val.split('|').map(Number);
    document.getElementById('ph-tref').value  = t;
    document.getElementById('ph-rhref').value = rh;
    this.updateBanner();
  },

  onManualChange() { this.updateBanner(); },

  getActiveRate() {
    if (this._manualOverride) {
      const v = parseFloat(document.getElementById('man-wvtr')?.value);
      return isNaN(v) ? null : v;
    }
    if (this._activeSource === 'db') {
      const v = document.getElementById('db-pick')?.value;
      return v ? parseFloat(v.split('|')[0]) : null;
    }
    if (this._activeSource === 'calc') {
      try {
        const saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
        if (saved && saved.total > 0) return saved.total;
      } catch(e){}
      return null;
    }
    return null;
  },

  updateBanner() {
    const r = this.getActiveRate();
    const el = document.getElementById('active-wvtr');
    if (el) el.textContent = r != null ? r.toFixed(5) + ' g/m²/day' : '— g/m²/day';
  },

  // ------------------------------------------------------------------
  // 📐 PACKAGING GEOMETRY
  // ------------------------------------------------------------------

  togglePkgMode() {
    const mode = document.querySelector('input[name="pkg-mode"]:checked')?.value || 'shape';
    const geom = document.getElementById('geom-selector');
    const man  = document.getElementById('manual-area');
    if (geom) geom.style.display = mode === 'shape'  ? 'block' : 'none';
    if (man)  man.style.display  = mode === 'manual' ? 'block' : 'none';
    this.calcArea();
  },

  onShapeChange() {
    const shape = document.getElementById('sl-shape').value;
    this._currentShape = shape;
    const isBottle  = shape === 'bottle';
    const isBlister = shape === 'blister';
    const std = document.getElementById('dims-std');
    const bot = document.getElementById('dims-bottle');
    const bli = document.getElementById('dims-blister');
    if (std) std.style.display = (!isBottle && !isBlister) ? 'block' : 'none';
    if (bot) bot.style.display = isBottle  ? 'block' : 'none';
    if (bli) bli.style.display = isBlister ? 'block' : 'none';
    const cfg = MVTR_SHAPE_CONFIGS[shape];
    if (cfg) {
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      const lbl = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
      set('sl-w', cfg.w); set('sl-h', cfg.h); set('sl-d', cfg.d);
      lbl('lbl-w', cfg.lw); lbl('lbl-h', cfg.lh); lbl('lbl-d', cfg.ld);
    }
    this.calcArea();
  },

  calcArea() {
    const mode = document.querySelector('input[name="pkg-mode"]:checked')?.value || 'shape';
    let area = 0;
    if (mode === 'manual') {
      area = parseFloat(document.getElementById('sl-area-man')?.value) || 0;
    } else {
      const shape  = document.getElementById('sl-shape')?.value || 'flat';
      this._currentShape = shape;
      const margin = parseFloat(document.getElementById('sl-margin')?.value) || 0;
      if (shape === 'bottle') {
        const Rb = parseFloat(document.getElementById('bt-br')?.value) || 3.5;
        const Hb = parseFloat(document.getElementById('bt-bh')?.value) || 16;
        const Rn = parseFloat(document.getElementById('bt-nr')?.value) || 1.2;
        const Hn = parseFloat(document.getElementById('bt-nh')?.value) || 4;
        const Hs = parseFloat(document.getElementById('bt-sh')?.value) || 2.5;
        const mf = 1 + margin / 100;
        const bodyLat = 2 * Math.PI * Rb * Hb;
        const neckLat = 2 * Math.PI * Rn * Hn;
        const slant   = Math.sqrt((Rb - Rn)**2 + Hs**2);
        const shoulder = Math.PI * (Rb + Rn) * slant;
        const bottom  = Math.PI * Rb**2;
        area = (bodyLat + neckLat + shoulder + bottom) * mf / 10000;
      } else if (shape === 'blister') {
        const count = parseFloat(document.getElementById('bl-count')?.value) || 10;
        const ca    = parseFloat(document.getElementById('bl-area')?.value)  || 1.5;
        area = count * ca / 10000;
      } else {
        const w = parseFloat(document.getElementById('sl-w')?.value) || 0;
        const h = parseFloat(document.getElementById('sl-h')?.value) || 0;
        const d = parseFloat(document.getElementById('sl-d')?.value) || 0;
        const wT = w + margin * 2, hT = h + margin * 2, dT = d + margin * 2;
        let cm2 = 0;
        switch(shape) {
          case 'flat':     cm2 = 2 * wT * hT; break;
          case 'standup':  cm2 = 2 * wT * hT * 1.3; break;
          case 'flow':     cm2 = wT * hT * 2.2; break;
          case 'box':      cm2 = 2 * (wT * hT + wT * dT + hT * dT); break;
          case 'cylinder': cm2 = 2 * Math.PI * (dT / 2) * (dT / 2 + hT); break;
          case 'tray':     cm2 = (wT * hT) + 2 * (wT * dT) + 2 * (hT * dT); break;
          default:         cm2 = 2 * wT * hT;
        }
        area = cm2 / 10000;
      }
    }
    const display = document.getElementById('area-display');
    const hidden  = document.getElementById('sl-area');
    if (display) display.textContent = area.toFixed(4) + ' m²';
    if (hidden)  hidden.value = area.toFixed(5);
  },

  updateManualArea() {
    const v = document.getElementById('sl-area-man')?.value || '0';
    const display = document.getElementById('area-display');
    const hidden  = document.getElementById('sl-area');
    if (display) display.textContent = v + ' m²';
    if (hidden)  hidden.value = v;
  },

  // ------------------------------------------------------------------
  // 🧮 MATHEMATICAL CORE
  // ------------------------------------------------------------------

  calcWVTR(wRef, Ea, Tref, RHref, Ttgt, RHtgt) {
    const Tr = Tref + 273.15, Tt = Ttgt + 273.15;
    const arrF = Ea > 0 ? Math.exp((Ea / R_GAS) * (1/Tr - 1/Tt)) : 1;
    const rhF  = RHref > 0 ? RHtgt / RHref : 1;
    return { eff: wRef * arrF * rhF, arrF, rhF };
  },

  runCalc(params) {
    const A = params.area, T = params.shelfDays;
    return ICH_ZONES.map(z => {
      const c = this.calcWVTR(params.wRef, params.Ea, params.Tref, params.RHref, z.T, z.RH);
      const daily  = c.eff * A * 1000;
      const annual = daily * DAYS;
      const total  = daily * T;
      const pct    = total / params.Mcrit * 100;
      return {
        zone: z, wRef: params.wRef, eff: c.eff, arrF: c.arrF, rhF: c.rhF,
        area: A, daily, annual, total, pct,
        pass: total <= params.Mcrit,
        yearsToLimit: (params.Mcrit / daily) / DAYS
      };
    });
  },

  // ------------------------------------------------------------------
  // ✅ VALIDATION
  // ------------------------------------------------------------------

  validate() {
    const checks = [
      { id:'ph-tref',  fg:'fg-tref',  min:-50, max:100 },
      { id:'ph-rhref', fg:'fg-rhref', min:0,   max:100 },
      { id:'ph-ea',    fg:'fg-ea',    min:0,   max:150 },
      { id:'ph-crit',  fg:'fg-crit',  min:0.001 },
      { id:'ph-years', fg:'fg-years', min:0.5, max:10 }
    ];
    let ok = true;
    checks.forEach(c => {
      const el = document.getElementById(c.id);
      const fg = document.getElementById(c.fg);
      const v  = parseFloat(el?.value);
      const fail = isNaN(v) || v < c.min || (c.max != null && v > c.max);
      if (fg) fg.classList.toggle('invalid', fail);
      if (fail) ok = false;
    });
    return ok;
  },

  // ------------------------------------------------------------------
  // 🎯 MAIN CALCULATION
  // ------------------------------------------------------------------

  calculate() {
    const rate = this.getActiveRate();
    if (!rate || rate <= 0) { alert('No valid WVTR. Select a source or enter a value manually.'); return; }
    if (!this.validate()) return;
    const params = {
      wRef:        rate,
      Tref:        parseFloat(document.getElementById('ph-tref').value),
      RHref:       parseFloat(document.getElementById('ph-rhref').value),
      Ea:          parseFloat(document.getElementById('ph-ea').value) || 0,
      area:        parseFloat(document.getElementById('sl-area').value),
      Mcrit:       parseFloat(document.getElementById('ph-crit').value),
      shelf_years: parseFloat(document.getElementById('ph-years').value),
      shelfDays:   parseFloat(document.getElementById('ph-years').value) * DAYS,
      label:       document.getElementById('sce-label').value || 'Scenario',
      source:      this._activeSource
    };
    this._results = { params, zones: this.runCalc(params), ts: new Date().toISOString() };
    const det = document.getElementById('detailed');
    if (det) det.style.display = 'block';
    this.updateKPIs();
    this.updateQuick();
    this.renderOverview();
    this.renderTables();
    this.renderCharts();
    this.renderScenariosList();
    if (det) det.scrollIntoView({ behavior:'smooth', block:'start' });
  },

  // ------------------------------------------------------------------
  // 📊 KPI DASHBOARD
  // ------------------------------------------------------------------

  updateKPIs() {
    const zs = this._results.zones;
    const pass = zs.filter(r => r.pass).length, tot = zs.length;
    const pct  = Math.round(pass / tot * 100);
    const zCard = document.getElementById('kpi-zones');
    document.getElementById('kv-zones').textContent = pass + '/' + tot;
    document.getElementById('ks-zones').textContent = pct + '% compliant';
    if (zCard) zCard.className = 'kpi ' + (pass === tot ? 'green' : pass === 0 ? 'danger' : 'warning');

    const maxAnn = Math.max(...zs.map(r => r.annual));
    document.getElementById('kv-ingress').textContent = maxAnn.toFixed(3) + ' mg';
    document.getElementById('ks-ingress').textContent = zs.find(r => r.annual === maxAnn).zone.label;

    const minSaf = Math.min(...zs.map(r => 100 - r.pct));
    const sCard = document.getElementById('kpi-safety');
    document.getElementById('kv-safety').textContent = minSaf.toFixed(1) + '%';
    if (sCard) sCard.className = 'kpi ' + (minSaf > 20 ? 'green' : minSaf > 0 ? 'warning' : 'danger');

    const avgArr = zs.reduce((s, r) => s + r.arrF, 0) / zs.length;
    document.getElementById('kv-arr').textContent = avgArr.toFixed(2) + 'x';

    const bar = document.getElementById('kpi-bar');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'progress-fill ' + (pct === 100 ? 'green' : pct >= 50 ? 'warning' : 'danger');
    }
    const st = document.getElementById('kpi-status');
    if (st) st.textContent = pct === 100 ? 'All zones compliant' : pct === 0 ? 'No zones compliant' : 'Partial compliance';
    const pp = document.getElementById('kpi-pct');
    if (pp) pp.textContent = pct + '%';
  },

  updateQuick() {
    const pass = this._results.zones.filter(r => r.pass).length, tot = this._results.zones.length;
    const clr = pass === tot ? 'var(--success)' : pass === 0 ? 'var(--danger)' : 'var(--warning)';
    const el = document.getElementById('quick-results');
    if (el) el.innerHTML =
      '<div style="color:' + clr + ';font-weight:700;font-size:1.05rem">' +
      (pass === tot ? 'All zones compliant' : pass === 0 ? 'No zones compliant' : pass + '/' + tot + ' zones compliant') +
      '</div><div style="margin-top:.3rem;font-size:.85rem;color:var(--text-light)">See tabs below for detail</div>';
  },

  // ------------------------------------------------------------------
  // 📊 TABLE RENDERING
  // ------------------------------------------------------------------

  renderOverview() {
    const zs = this._results.zones;
    const tbody = document.querySelector('#tbl-summary tbody');
    if (tbody) tbody.innerHTML = zs.map(r =>
      '<tr style="' + (r.pass ? 'background:var(--success-light)' : 'background:var(--danger-light)') + '">' +
      '<td><strong>' + r.zone.label + '</strong></td>' +
      '<td>' + r.zone.T + '°C / ' + r.zone.RH + '%<br><small style="color:var(--text-light)">' + r.zone.desc + '</small></td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.eff.toFixed(5) + ' g/m²/d</td>' +
      '<td>' + r.annual.toFixed(4) + ' mg</td>' +
      '<td><strong>' + r.total.toFixed(4) + ' mg</strong></td>' +
      '<td>' + r.pct.toFixed(1) + '%</td>' +
      '<td>' + (r.pass ? '<span class="pill pill-pass">PASS</span>' : '<span class="pill pill-fail">FAIL</span>') + '</td>' +
      '</tr>'
    ).join('');
    this.renderOverviewChart();
    this.renderFactorsChart();
  },

  renderTables() {
    const zs = this._results.zones, p = this._results.params;
    const tbody = document.querySelector('#tbl-detailed tbody');
    if (tbody) tbody.innerHTML = zs.map((r, i) =>
      '<tr style="' + (i % 2 ? 'background:#fafcff' : '') + '">' +
      '<td><strong>' + r.zone.label + '</strong></td>' +
      '<td>' + r.zone.T + '</td><td>' + r.zone.RH + '</td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.wRef.toFixed(5) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.arrF.toFixed(4) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.rhF.toFixed(4) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace"><strong>' + r.eff.toFixed(5) + '</strong></td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.area.toFixed(5) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.daily.toFixed(5) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace">' + r.annual.toFixed(4) + '</td>' +
      '<td style="font-family:\'Courier New\',monospace"><strong>' + r.total.toFixed(4) + '</strong></td>' +
      '<td>' + r.pct.toFixed(1) + '%</td>' +
      '<td>' + (r.pass ? '<span class="pill pill-pass">PASS</span>' : '<span class="pill pill-fail">FAIL</span>') + '</td>' +
      '</tr>'
    ).join('');

    const pp = document.getElementById('params-panel');
    if (pp) pp.innerHTML = [
      ['WVTR ref',   p.wRef.toFixed(5) + ' g/m²/day'],
      ['T_ref',      p.Tref + '°C = ' + (p.Tref + 273.15).toFixed(2) + ' K'],
      ['RH_ref',     p.RHref + '%'],
      ['Eₐ',        p.Ea + ' kJ/mol'],
      ['R',          R_GAS + ' kJ/(mol·K)'],
      ['Area',       (p.area * 10000).toFixed(2) + ' cm² = ' + p.area.toFixed(5) + ' m²'],
      ['Shelf life', p.shelf_years + ' yr = ' + p.shelfDays.toFixed(0) + ' days'],
      ['M_crit',     p.Mcrit + ' mg'],
      ['Source',     p.source.toUpperCase()]
    ].map(([k, v]) =>
      '<div style="display:flex;justify-content:space-between;padding:.12rem 0;border-bottom:1px solid var(--border)">' +
      '<span style="color:var(--text-light)">' + k + ':</span><strong>' + v + '</strong></div>'
    ).join('');
  },

  // ------------------------------------------------------------------
  // 📈 CHART RENDERING
  // ------------------------------------------------------------------

  renderCharts() {
    this.renderOverviewChart();
    this.renderFactorsChart();
    this.renderWVTRChart();
    this.renderTRHChart();
    this.renderTTLChart();
  },

  _dc(key) {
    if (this._charts[key]) { this._charts[key].destroy(); delete this._charts[key]; }
  },

  _baseOpts(yLabel, legend) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: legend, position:'top', labels: { font: { size:10 }, boxWidth:10 } } },
      scales: { y: { beginAtZero: true, title: { display: true, text: yLabel, font: { size:10 } } } }
    };
  },

  renderOverviewChart() {
    this._dc('ov');
    const zs = this._results.zones;
    const ctx = document.getElementById('ch-overview')?.getContext('2d');
    if (!ctx) return;
    this._charts.ov = new Chart(ctx, {
      type:'bar',
      data: {
        labels: zs.map(r => r.zone.label),
        datasets: [
          {
            label:'Annual Ingress (mg)', data: zs.map(r => r.annual),
            backgroundColor: zs.map(r => r.zone.color + 'b3'),
            borderColor: zs.map(r => r.zone.color), borderWidth:1.5, borderRadius:4
          },
          {
            label:'Limit (mg/yr)',
            data: zs.map(() => this._results.params.Mcrit / this._results.params.shelf_years),
            type:'line', borderColor:'#d97706', borderWidth:2, borderDash:[5,4], pointRadius:0, fill:false
          }
        ]
      },
      options: this._baseOpts('mg', true)
    });
  },

  renderFactorsChart() {
    this._dc('fac');
    const zs = this._results.zones;
    const ctx = document.getElementById('ch-factors')?.getContext('2d');
    if (!ctx) return;
    this._charts.fac = new Chart(ctx, {
      type:'radar',
      data: {
        labels: zs.map(r => r.zone.label),
        datasets: [
          { label:'F_T (Arrhenius)', data: zs.map(r => r.arrF), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.15)', borderWidth:2 },
          { label:'F_RH',            data: zs.map(r => r.rhF),  borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,.15)',  borderWidth:2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position:'top', labels: { font: { size:10 }, boxWidth:10 } } },
        scales: { r: { beginAtZero: false, ticks: { font: { size:9 } } } }
      }
    });
    const avgArr = (zs.reduce((s, r) => s + r.arrF, 0) / zs.length).toFixed(3);
    const avgRH  = (zs.reduce((s, r) => s + r.rhF,  0) / zs.length).toFixed(3);
    const el = document.getElementById('factors-sum');
    if (el) el.innerHTML = 'avg F_T = <strong>' + avgArr + '</strong> | avg F_RH = <strong>' + avgRH + '</strong> | Eₐ = ' + this._results.params.Ea + ' kJ/mol';
  },

  renderWVTRChart() {
    this._dc('wvtr');
    const zs = this._results.zones;
    const ctx = document.getElementById('ch-wvtr')?.getContext('2d');
    if (!ctx) return;
    this._charts.wvtr = new Chart(ctx, {
      type:'bar',
      data: {
        labels: zs.map(r => r.zone.label),
        datasets: [
          { label:'Ref WVTR',  data: zs.map(() => this._results.params.wRef), backgroundColor:'rgba(100,116,139,.4)', borderRadius:3 },
          { label:'Eff WVTR',  data: zs.map(r => r.eff), backgroundColor: zs.map(r => r.zone.color + 'b3'), borderColor: zs.map(r => r.zone.color), borderWidth:1.5, borderRadius:3 }
        ]
      },
      options: this._baseOpts('g/m²/day', true)
    });
  },

  renderTRHChart() {
    this._dc('trh');
    const zs = this._results.zones;
    const ctx = document.getElementById('ch-trh')?.getContext('2d');
    if (!ctx) return;
    this._charts.trh = new Chart(ctx, {
      type:'scatter',
      data: {
        datasets: zs.map(r => ({
          label: r.zone.label,
          data: [{ x: r.zone.T, y: r.zone.RH }],
          backgroundColor: r.zone.color,
          borderColor: r.zone.color,
          borderWidth: 2, pointRadius: 10, pointHoverRadius: 12
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position:'top', labels: { font: { size:9 }, boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const r = zs[c.datasetIndex];
                return [r.zone.label + ': ' + r.zone.T + '°C / ' + r.zone.RH + '% RH', 'WVTR_eff: ' + r.eff.toFixed(5)];
              }
            }
          }
        },
        scales: {
          x: { title: { display:true, text:'Temperature (°C)', font:{ size:10 } }, grid: { color:'rgba(0,0,0,0.05)' } },
          y: { title: { display:true, text:'RH (%)',            font:{ size:10 } }, grid: { color:'rgba(0,0,0,0.05)' } }
        }
      }
    });
  },

  renderTTLChart() {
    this._dc('ttl');
    const zs = this._results.zones, yr = this._results.params.shelf_years;
    const ctx = document.getElementById('ch-ttl')?.getContext('2d');
    if (!ctx) return;
    this._charts.ttl = new Chart(ctx, {
      type:'bar',
      data: {
        labels: zs.map(r => r.zone.label),
        datasets: [{
          label:'Years to M_crit',
          data: zs.map(r => r.yearsToLimit),
          backgroundColor: zs.map(r => r.yearsToLimit >= yr ? 'rgba(22,163,74,.7)' : r.yearsToLimit >= yr * 0.5 ? 'rgba(217,119,6,.7)' : 'rgba(220,38,38,.7)'),
          borderColor: zs.map(r => r.yearsToLimit >= yr ? '#16a34a' : r.yearsToLimit >= yr * 0.5 ? '#d97706' : '#dc2626'),
          borderWidth: 1.5, borderRadius: 4
        }]
      },
      options: this._baseOpts('Years', false)
    });
  },

  // ------------------------------------------------------------------
  // 💾 SCENARIOS
  // ------------------------------------------------------------------

  saveScenario() {
    if (!this._results) { alert('Run a calculation first.'); return; }
    this._scenarios.push({ id: Date.now(), name: this._results.params.label, params: this._results.params, zones: this._results.zones, ts: this._results.ts });
    try { localStorage.setItem('mvtr_sce', JSON.stringify(this._scenarios)); } catch(e){}
    this.renderScenariosList();
  },

  renderScenariosList() {
    const compEl = document.getElementById('sce-comp-list');
    if (!compEl) return;
    if (this._scenarios.length === 0) {
      compEl.innerHTML = '<p style="font-size:.88rem;color:var(--text-light);text-align:center;padding:.75rem 0">No saved scenarios yet.</p>';
      this.updateScenarioComparison();
      return;
    }
    compEl.innerHTML = this._scenarios.map(s =>
      '<div class="scenario-card">' +
      '<div class="sce-hdr"><div class="sce-name">' + s.name + '</div>' +
      '<button class="sce-del" onclick="MVTR.deleteScenario(' + s.id + ')">×</button></div>' +
      '<div style="font-size:.88rem;color:var(--text-light);margin-bottom:.4rem">' +
      'WVTR ' + s.params.wRef.toFixed(4) + ' · Eₐ ' + s.params.Ea + ' · ' + s.params.shelf_years + 'yr</div>' +
      '<button class="btn btn-primary btn-sm btn-full" onclick="MVTR.loadScenario(' + s.id + ')">Load</button></div>'
    ).join('');
    this.updateScenarioComparison();
  },

  deleteScenario(id) {
    if (!confirm('Delete this scenario?')) return;
    this._scenarios = this._scenarios.filter(s => s.id !== id);
    try { localStorage.setItem('mvtr_sce', JSON.stringify(this._scenarios)); } catch(e){}
    this.renderScenariosList();
  },

  loadScenario(id) {
    const s = this._scenarios.find(x => x.id === id);
    if (!s) return;
    document.getElementById('ph-tref').value  = s.params.Tref;
    document.getElementById('ph-rhref').value = s.params.RHref;
    document.getElementById('ph-ea').value    = s.params.Ea;
    document.getElementById('ph-crit').value  = s.params.Mcrit;
    document.getElementById('ph-years').value = s.params.shelf_years;
    document.getElementById('sce-label').value = s.params.label;
    document.getElementById('manual-toggle').checked = true;
    this.toggleManual(true);
    document.getElementById('man-wvtr').value = s.params.wRef;
    document.getElementById('man-t').value    = s.params.Tref;
    document.getElementById('man-rh').value   = s.params.RHref;
    this.updateBanner();
    this.calculate();
  },

  updateScenarioComparison() {
    const bodyEl = document.getElementById('sce-body');
    const hdrEl  = document.getElementById('sce-hdr');
    if (!bodyEl || !hdrEl) return;
    if (this._scenarios.length < 2) {
      bodyEl.innerHTML = '<tr><td colspan="' + (this._scenarios.length + 1) + '" style="text-align:center;color:var(--text-light)">Save at least 2 scenarios to compare.</td></tr>';
      this._dc('sce');
      return;
    }
    hdrEl.innerHTML = '<th>Parameter</th>' + this._scenarios.map(s => '<th>' + s.name + '</th>').join('');
    const rows = [
      { k:'wRef',        l:'Reference WVTR',    u:' g/m²/d' },
      { k:'Tref',        l:'Test Temperature',   u:'°C' },
      { k:'RHref',       l:'Test RH',            u:'%' },
      { k:'Ea',          l:'Activation Energy',   u:' kJ/mol' },
      { k:'area',        l:'Surface Area',        u:' m²' },
      { k:'Mcrit',       l:'Critical Limit',      u:' mg' },
      { k:'shelf_years', l:'Shelf Life',           u:' yr' },
      { k:'_pass',       l:'Compliant Zones',      u:'/7', calc: s => s.zones.filter(r => r.pass).length }
    ];
    bodyEl.innerHTML = rows.map(r =>
      '<tr><td><strong>' + r.l + '</strong></td>' +
      this._scenarios.map(s =>
        '<td style="font-family:\'Courier New\',monospace">' + (r.calc ? r.calc(s) : s.params[r.k]) + r.u + '</td>'
      ).join('') + '</tr>'
    ).join('');
    this.renderScenarioComparisonChart();
  },

  renderScenarioComparisonChart() {
    this._dc('sce');
    if (this._scenarios.length < 2) return;
    const ctx = document.getElementById('ch-sce')?.getContext('2d');
    if (!ctx) return;
    this._charts.sce = new Chart(ctx, {
      type:'bar',
      data: {
        labels: ICH_ZONES.map(z => z.label),
        datasets: this._scenarios.map(s => ({
          label: s.name,
          data: ICH_ZONES.map(z => { const r = s.zones.find(x => x.zone.id === z.id); return r ? r.total : 0; }),
          backgroundColor: ICH_ZONES.map(z => z.color + '99'),
          borderColor: ICH_ZONES.map(z => z.color),
          borderWidth: 1.5, borderRadius: 3
        }))
      },
      options: this._baseOpts('Total Ingress (mg)', true)
    });
  },

  // ------------------------------------------------------------------
  // 🔬 SENSITIVITY
  // ------------------------------------------------------------------

  runSensEA() {
    if (!this._results) return;
    const min = parseFloat(document.getElementById('s-ea-min').value) || 20;
    const max = parseFloat(document.getElementById('s-ea-max').value) || 65;
    const steps = 8, step = (max - min) / (steps - 1);
    const vals = [], maxIngs = [], passCnts = [];
    for (let i = 0; i < steps; i++) {
      const ea = min + step * i;
      vals.push(ea);
      const r = this.runCalc({ ...this._results.params, Ea: ea });
      maxIngs.push(Math.max(...r.map(x => x.total)));
      passCnts.push(r.filter(x => x.pass).length);
    }
    this._dc('sea');
    const ctx = document.getElementById('ch-sea')?.getContext('2d');
    if (!ctx) return;
    this._charts.sea = new Chart(ctx, {
      type:'line',
      data: {
        labels: vals.map(v => v.toFixed(1) + ' kJ/mol'),
        datasets: [
          { label:'Max Ingress (mg)', data: maxIngs, borderColor:'#1a56db', fill:true, backgroundColor:'rgba(26,86,219,0.08)', yAxisID:'y', tension:0.4 },
          { label:'Compliant Zones',  data: passCnts, borderColor:'#0e9f6e', fill:true, backgroundColor:'rgba(14,159,110,0.08)', yAxisID:'y1', tension:0.4 }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false, interaction:{ mode:'index', intersect:false },
        plugins: { legend: { position:'top', labels: { font:{ size:10 }, boxWidth:10 } } },
        scales: {
          y:  { position:'left',  title: { display:true, text:'Ingress (mg)', font:{ size:10 } } },
          y1: { position:'right', min:0, max:7, title: { display:true, text:'Zones', font:{ size:10 } }, grid: { drawOnChartArea:false } }
        }
      }
    });
  },

  runSensWVTR() {
    if (!this._results) return;
    const min = parseFloat(document.getElementById('s-wvtr-min').value) || 0.1;
    const max = parseFloat(document.getElementById('s-wvtr-max').value) || 3.0;
    const steps = 8, step = (max - min) / (steps - 1);
    const vals = [], maxIngs = [], passCnts = [];
    for (let i = 0; i < steps; i++) {
      const w = min + step * i;
      vals.push(w);
      const r = this.runCalc({ ...this._results.params, wRef: w });
      maxIngs.push(Math.max(...r.map(x => x.total)));
      passCnts.push(r.filter(x => x.pass).length);
    }
    this._dc('swvtr');
    const ctx = document.getElementById('ch-swvtr')?.getContext('2d');
    if (!ctx) return;
    this._charts.swvtr = new Chart(ctx, {
      type:'line',
      data: {
        labels: vals.map(v => v.toFixed(2) + ' g/m²/d'),
        datasets: [
          { label:'Max Ingress (mg)', data: maxIngs, borderColor:'#e02424', fill:true, backgroundColor:'rgba(224,36,36,0.08)', yAxisID:'y', tension:0.4 },
          { label:'Compliant Zones',  data: passCnts, borderColor:'#0e9f6e', fill:true, backgroundColor:'rgba(14,159,110,0.08)', yAxisID:'y1', tension:0.4 }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false, interaction:{ mode:'index', intersect:false },
        plugins: { legend: { position:'top', labels: { font:{ size:10 }, boxWidth:10 } } },
        scales: {
          y:  { position:'left',  title: { display:true, text:'Ingress (mg)', font:{ size:10 } } },
          y1: { position:'right', min:0, max:7, title: { display:true, text:'Zones', font:{ size:10 } }, grid: { drawOnChartArea:false } }
        }
      }
    });
  },

  // ------------------------------------------------------------------
  // 📋 TABS
  // ------------------------------------------------------------------

  switchTab(name, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
    if (event) event.target.classList.add('active');
    const tc = document.getElementById('tab-' + name);
    if (tc) tc.classList.add('active');
    if (name === 'sensitivity' && this._results) { setTimeout(() => { this.runSensEA(); this.runSensWVTR(); }, 80); }
    if (name === 'charts' && this._results) { setTimeout(() => Object.values(this._charts).forEach(c => { try { c.resize(); } catch(e){} }), 80); }
  },

  // ------------------------------------------------------------------
  // 🔄 RESET
  // ------------------------------------------------------------------

  resetForm() {
    if (!confirm('Reset to defaults?')) return;
    document.getElementById('ph-tref').value  = 38;
    document.getElementById('ph-rhref').value = 90;
    document.getElementById('ph-ea').value    = 35;
    document.getElementById('ph-crit').value  = 2.0;
    document.getElementById('ph-years').value = 2;
    document.getElementById('sce-label').value = 'Base Scenario';
    document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('invalid'));
    document.getElementById('manual-toggle').checked = false;
    this.toggleManual(false);
    this.updateBanner();
  },

  // ------------------------------------------------------------------
  // 📥 EXPORT CSV
  // ------------------------------------------------------------------

  exportCSV() {
    if (!this._results) { alert('No data to export.'); return; }
    const p = this._results.params, res = this._results.zones;
    let csv = 'MVTR / ICH Q1A(R2) Analysis Report\n';
    csv += 'Generated:,' + new Date().toISOString() + '\nScenario:,' + p.label + '\n\n';
    csv += 'Parameters\n';
    csv += 'Reference WVTR,' + p.wRef.toFixed(5) + ',g/m²/day\n';
    csv += 'Reference Temperature,' + p.Tref + ',°C\n';
    csv += 'Reference RH,' + p.RHref + ',%\n';
    csv += 'Activation Energy (Ea),' + p.Ea + ',kJ/mol\n';
    csv += 'Surface Area,' + (p.area * 10000).toFixed(2) + ',cm²\n';
    csv += 'Surface Area,' + p.area.toFixed(5) + ',m²\n';
    csv += 'Critical Limit,' + p.Mcrit + ',mg\n';
    csv += 'Shelf Life,' + p.shelf_years + ',years\n\n';
    csv += 'Zone,T(°C),RH(%),WVTR_ref,F_T,F_RH,WVTR_eff,Daily(mg),Annual(mg),Total(mg),%Limit,Status\n';
    res.forEach(r => {
      csv += r.zone.label + ',' + r.zone.T + ',' + r.zone.RH + ',' + r.wRef.toFixed(5) + ',';
      csv += r.arrF.toFixed(4) + ',' + r.rhF.toFixed(4) + ',' + r.eff.toFixed(5) + ',';
      csv += r.daily.toFixed(5) + ',' + r.annual.toFixed(4) + ',' + r.total.toFixed(4) + ',' + r.pct.toFixed(1) + '%,' + (r.pass ? 'PASS' : 'FAIL') + '\n';
    });
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'MVTR_Report_' + new Date().toISOString().slice(0,10) + '.csv' });
    a.click();
  },

  // ------------------------------------------------------------------
  // 📄 EXPORT PDF
  // ------------------------------------------------------------------

  async exportPDF() {
    if (!this._results) { alert('No data to export. Run a calculation first.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('PDF library missing. Reload page.'); return; }
    if (typeof html2canvas === 'undefined') { alert('html2canvas library missing. Reload page.'); return; }

    const btn = document.getElementById('btn-pdf');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

    try {
      const { jsPDF } = window.jspdf;
      const p = this._results.params, res = this._results.zones;
      const pass = res.filter(r => r.pass).length, tot = res.length;
      const allPass = pass === tot;
      const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
      const genISO  = new Date().toISOString().slice(0, 10);

      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4', compress:true });
      const PW = 210, PH = 297, ML = 15, MR = 15, CW = PW - ML - MR;
      const C = {
        blue:[37,99,235], blueDark:[30,64,175], blueLight:[239,246,255],
        green:[22,163,74], greenL:[240,253,244],
        amber:[217,119,6], amberL:[255,251,235],
        red:[220,38,38], redL:[254,242,242],
        slate:[71,85,105], slateL:[248,250,252],
        border:[226,232,240], white:[255,255,255], black:[15,23,42]
      };
      let y = 0, pageNum = 0;
      const safe = s => String(s || '').replace(/[^\x20-\x7E]/g, '');

      const drawFooter = () => {
        pdf.setFillColor(...C.blueDark);
        pdf.rect(0, PH - 10, PW, 10, 'F');
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.white);
        pdf.text('MVTR / ICH Q1A(R2) Compliance Report  |  For R&D use only  |  ASTM F1249 / ISO 15106', ML, PH - 3.5);
        pdf.text('Page ' + pdf.internal.getNumberOfPages(), PW - MR, PH - 3.5, { align:'right' });
        pdf.setTextColor(...C.black);
      };
      const newPage = () => { if (pageNum > 0) drawFooter(); pdf.addPage(); pageNum++; y = ML; };
      const sectionTitle = (title, color) => {
        color = color || C.blue;
        y += 4;
        pdf.setFillColor(...color); pdf.rect(ML, y, 3, 6, 'F');
        pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...color);
        pdf.text(safe(title), ML + 5, y + 4.5);
        pdf.setTextColor(...C.black); y += 10;
        pdf.setDrawColor(...C.border); pdf.setLineWidth(0.3);
        pdf.line(ML, y - 2, PW - MR, y - 2); y += 2;
      };
      const kpiBox = (x, bw, bh, label, value, unit2, color, colorL) => {
        pdf.setFillColor(...colorL); pdf.setDrawColor(...color); pdf.setLineWidth(0.4);
        pdf.roundedRect(x, y, bw, bh, 2, 2, 'FD');
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.slate);
        pdf.text(safe(label), x + bw/2, y + 5, { align:'center' });
        pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...color);
        pdf.text(safe(value), x + bw/2, y + 13, { align:'center' });
        pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.slate);
        pdf.text(safe(unit2), x + bw/2, y + 18, { align:'center' });
        pdf.setTextColor(...C.black);
      };
      const tableHeader = (cols, x, colWidths, rowH) => {
        rowH = rowH || 7;
        pdf.setFillColor(...C.blue);
        let cx = x; cols.forEach((col, i) => { pdf.rect(cx, y, colWidths[i], rowH, 'F'); cx += colWidths[i]; });
        pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
        cx = x; cols.forEach((col, i) => { pdf.text(safe(col), cx + 2, y + 4.8); cx += colWidths[i]; });
        pdf.setTextColor(...C.black); y += rowH;
      };
      const tableRow = (cells, x, colWidths, rowH, bgColor, statusCol) => {
        rowH = rowH || 6.5; statusCol = statusCol === undefined ? -1 : statusCol;
        if (bgColor) { pdf.setFillColor(...bgColor); let cx2 = x; colWidths.forEach(w => { pdf.rect(cx2, y, w, rowH, 'F'); cx2 += w; }); }
        pdf.setDrawColor(...C.border); pdf.setLineWidth(0.2);
        let cx = x;
        colWidths.forEach((w, i) => {
          pdf.rect(cx, y, w, rowH, 'S');
          pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal');
          if (statusCol === i) {
            const isPass = cells[i] === 'PASS';
            pdf.setTextColor(...(isPass ? C.green : C.red));
            pdf.setFont('helvetica', 'bold');
          } else { pdf.setTextColor(...C.black); }
          pdf.text(safe(cells[i] || '—'), cx + 2, y + 4.5);
          cx += w;
        });
        pdf.setTextColor(...C.black); y += rowH;
      };

      // PAGE 1 — COVER
      pageNum++;
      pdf.setFillColor(...C.blueDark); pdf.rect(0, 0, PW, 55, 'F');
      pdf.setFillColor(...C.blue); pdf.rect(0, 40, PW, 18, 'F');
      pdf.setFontSize(22); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
      pdf.text('MVTR Compliance Report', ML, 22);
      pdf.setFontSize(11); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(186, 210, 255);
      pdf.text(safe('ICH Q1A(R2) — ' + p.label), ML, 32);

      const badgeColor = allPass ? C.green : (pass === 0 ? C.red : C.amber);
      const badgeText  = allPass ? 'COMPLIANT' : (pass === 0 ? 'NON-COMPLIANT' : 'PARTIAL');
      pdf.setFillColor(...badgeColor); pdf.roundedRect(PW - MR - 42, 8, 42, 10, 2, 2, 'F');
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
      pdf.text(badgeText, PW - MR - 21, 14.5, { align:'center' });

      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.white);
      pdf.text('Generated: ' + genDate + '  |  Source: ' + p.source.toUpperCase() + '  |  ' + pass + '/' + tot + ' zones pass', ML, 50);
      pdf.setTextColor(...C.black);

      y = 65;
      const kpiW = (CW - 9) / 4, kpiH = 22;
      const minSaf = Math.min(...res.map(r => 100 - r.pct)).toFixed(1);
      const avgArr = (res.reduce((s, r) => s + r.arrF, 0) / res.length).toFixed(3);
      kpiBox(ML,            kpiW, kpiH, 'COMPLIANT ZONES', pass + '/' + tot, allPass ? 'All pass' : 'Partial', allPass ? C.green : C.amber, allPass ? C.greenL : C.amberL);
      kpiBox(ML+kpiW+3,     kpiW, kpiH, 'SAFETY MARGIN',  minSaf + '%',     'vs M_crit', parseFloat(minSaf) > 20 ? C.green : C.red, parseFloat(minSaf) > 20 ? C.greenL : C.redL);
      kpiBox(ML+kpiW*2+6,   kpiW, kpiH, 'SURFACE AREA',   p.area.toFixed(4), 'm2', C.blue, C.blueLight);
      kpiBox(ML+kpiW*3+9,   kpiW, kpiH, 'AVG F_T',        avgArr + 'x',     'Arrhenius', C.slate, C.slateL);
      y += kpiH + 8;

      sectionTitle('Input Parameters');
      const pCols = ['Parameter', 'Value', 'Parameter', 'Value'];
      const pW    = [45, 35, 45, 35];
      tableHeader(pCols, ML, pW);
      [
        ['Reference WVTR',     p.wRef.toFixed(5) + ' g/m2/day',  'Reference Temp',    p.Tref + ' C (' + (p.Tref+273.15).toFixed(2) + ' K)'],
        ['Reference RH',       p.RHref + ' %',                    'Activation Energy', p.Ea + ' kJ/mol'],
        ['Surface Area',       (p.area*10000).toFixed(2) + ' cm2 (' + p.area.toFixed(5) + ' m2)', 'Critical Limit', p.Mcrit + ' mg'],
        ['Shelf Life',         p.shelf_years + ' years (' + p.shelfDays.toFixed(0) + ' days)', 'Source', p.source.toUpperCase()]
      ].forEach((row, idx) => { tableRow(row, ML, pW, 6.5, idx % 2 === 0 ? C.slateL : C.white); });
      y += 4;

      if (y > PH - 90) newPage();
      sectionTitle('Results by ICH Climatic Zone');
      const rCols = ['Zone', 'T (C)', 'RH (%)', 'WVTR eff', 'Annual (mg)', 'Total (mg)', '% Limit', 'Status'];
      const rW    = [24, 14, 14, 26, 24, 24, 18, 18];
      tableHeader(rCols, ML, rW);
      res.forEach((r, idx) => {
        tableRow([
          r.zone.label, String(r.zone.T), String(r.zone.RH),
          r.eff.toFixed(5), r.annual.toFixed(3), r.total.toFixed(3),
          r.pct.toFixed(1) + '%', r.pass ? 'PASS' : 'FAIL'
        ], ML, rW, 6.5, idx % 2 === 0 ? C.slateL : C.white, 7);
      });
      y += 4;

      if (y > PH - 60) newPage();
      sectionTitle('Methodology Summary');
      [
        'MVTR compliance is evaluated across 7 ICH climatic zones using Arrhenius thermal correction',
        'and linear RH driving force. The model assumes steady-state permeation through a defect-free',
        'film with constant storage conditions. Compliance criterion: total ingress <= M_crit over shelf life.',
        'F_T = exp[(Ea/R) x (1/Tref - 1/Ttgt)]  |  F_RH = RHtgt / RHref  |  WVTR_eff = WVTR_ref x F_T x F_RH'
      ].forEach(line => {
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.slate);
        pdf.text(safe(line), ML, y); y += 5;
      });
      pdf.setTextColor(...C.black); y += 3;
      drawFooter();

      // CHARTS PAGES
      const chartConfigs = [
        { id:'ch-overview', title:'Annual Ingress by Zone',         desc:'Total moisture ingress per ICH zone with compliance limit threshold.' },
        { id:'ch-factors',  title:'Correction Factors (F_T, F_RH)', desc:'Arrhenius thermal factor and RH driving force across climatic zones.' },
        { id:'ch-wvtr',     title:'WVTR: Reference vs Effective',   desc:'Comparison of measured reference WVTR against zone-corrected effective values.' },
        { id:'ch-trh',      title:'Zone Map (Temperature vs RH)',   desc:'ICH climatic zones plotted on temperature-humidity coordinate system.' },
        { id:'ch-ttl',      title:'Years to Critical Limit',        desc:'Time until cumulative moisture ingress reaches M_crit per zone.' },
        { id:'ch-sce',      title:'Scenario Comparison',            desc:'Total ingress comparison across saved scenarios for all ICH zones.' },
        { id:'ch-sea',      title:'Sensitivity: Activation Energy', desc:'Impact of Ea variation on max ingress and zone compliance.' },
        { id:'ch-swvtr',    title:'Sensitivity: WVTR',              desc:'Impact of WVTR variation on max ingress and zone compliance.' }
      ];
      const availableCharts = chartConfigs.filter(cfg => { const c = document.getElementById(cfg.id); return c && c.width > 0 && c.height > 0; });

      for (let i = 0; i < availableCharts.length; i += 2) {
        newPage();
        const pair = availableCharts.slice(i, i + 2);
        const chartHeight = (PH - y - 35) / 2;
        for (let idx = 0; idx < pair.length; idx++) {
          const cfg = pair[idx];
          const canvas = document.getElementById(cfg.id);
          if (!canvas) continue;
          if (idx > 0) y += 5;
          pdf.setFillColor(...C.blue); pdf.rect(ML, y, 3, 5, 'F');
          pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.blue);
          pdf.text(safe(cfg.title), ML + 5, y + 3.8); pdf.setTextColor(...C.black); y += 8;
          pdf.setFillColor(...C.slateL); pdf.setDrawColor(...C.border); pdf.setLineWidth(0.3);
          pdf.roundedRect(ML, y, CW, 7, 1, 1, 'FD');
          pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.slate);
          pdf.text(safe(cfg.desc), ML + 3, y + 4.5); pdf.setTextColor(...C.black); y += 9;
          try {
            const cc  = await html2canvas(canvas, { scale: 2.5, useCORS: true, backgroundColor:'#ffffff', logging: false });
            const img = cc.toDataURL('image/png');
            const maxH = chartHeight - 20;
            const h   = Math.min(CW * (cc.height / cc.width), maxH);
            pdf.setFillColor(...C.white); pdf.setDrawColor(...C.border); pdf.setLineWidth(0.4);
            pdf.roundedRect(ML - 1, y - 1, CW + 2, h + 2, 2, 2, 'FD');
            pdf.addImage(img, 'PNG', ML, y, CW, h); y += h + 3;
          } catch(e) {
            pdf.setFontSize(8); pdf.setTextColor(...C.slate);
            pdf.text('Chart not available for this configuration.', ML, y + 5);
            pdf.setTextColor(...C.black); y += 15;
          }
        }
      }

      // DISCLAIMER PAGE
      newPage();
      sectionTitle('Important Disclaimer & Model Limitations', C.red);
      [
        { title:'For Research & Development Use Only', body:'This report and the underlying calculations are intended exclusively for internal R&D screening, packaging concept development, and educational purposes. Results must not be used as the sole basis for commercial shelf-life labeling, regulatory submissions, or product safety declarations.' },
        { title:'Laboratory Validation Required', body:'All predictive model outputs require independent validation through accredited laboratory testing. Relevant standards include: ASTM F1249 / ISO 15106-3 (Water Vapor Transmission), ICH Q1A(R2) (Stability Testing), and WHO TRS No. 863 (Climatic Zone Classification).' },
        { title:'Model Assumptions & Known Limitations', body:'The model assumes: (1) steady-state gas permeation through defect-free films; (2) linear superposition of Arrhenius and RH correction factors; (3) uniform, constant storage conditions; (4) no seal degradation, pinholes, or mechanical damage; (5) negligible back-diffusion. Real-world performance may deviate significantly due to package geometry, seal integrity, humidity cycling, and supply chain variability.' },
        { title:'Regulatory Compliance', body:'This tool does not constitute regulatory advice. Commercial shelf-life declarations must comply with applicable regulations including FDA 21 CFR, EU guidelines, ICH Q1A(R2), and any applicable sector-specific guidelines. Consult a qualified regulatory specialist before product launch.' }
      ].forEach(sec => {
        if (y > PH - 45) newPage();
        pdf.setFillColor(...C.redL); pdf.setDrawColor(...C.red); pdf.setLineWidth(0.3);
        pdf.roundedRect(ML, y, CW, 7, 1, 1, 'FD');
        pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.red);
        pdf.text(safe(sec.title), ML + 3, y + 4.8); pdf.setTextColor(...C.black); y += 9;
        const bodyLines = pdf.splitTextToSize(safe(sec.body), CW - 4);
        pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...C.slate);
        bodyLines.forEach(line => { if (y > PH - 20) newPage(); pdf.text(line, ML + 2, y); y += 4.5; });
        pdf.setTextColor(...C.black); y += 5;
      });

      if (y > PH - 25) newPage();
      pdf.setFillColor(...C.blueDark); pdf.roundedRect(ML, y, CW, 14, 2, 2, 'F');
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...C.white);
      pdf.text('Report generated on ' + genDate + '  |  MVTR / ICH Q1A(R2) Compliance Tool', ML + CW/2, y + 5.5, { align:'center' });
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(186, 210, 255);
      pdf.text('Methodology aligned with ASTM F1249, ISO 15106-3, ICH Q1A(R2), WHO TRS No. 863', ML + CW/2, y + 10.5, { align:'center' });
      pdf.setTextColor(...C.black);
      drawFooter();

      const safeName = p.label.replace(/[^a-z0-9]+/gi, '_').slice(0, 30) || 'Report';
      pdf.save('MVTR_Report_' + safeName + '_' + genISO + '.pdf');
    } catch(error) {
      console.error('PDF export failed:', error);
      alert('PDF generation failed: ' + error.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'PDF Report'; }
    }
  }
};

// Global bridge for Calculator → Compliance
window.saveCalcResult = function(result) {
  try { localStorage.setItem('mvtr_calc_result', JSON.stringify(result)); } catch(e){}
  MVTR.refreshCalcPanel();
};


// ====================================================================
// 📋 RENDER FUNCTIONS
// ====================================================================

function renderMVTR() {
  return `
<div class="grid grid-2" style="align-items:start">

  <div class="card" style="padding:0">
    <div class="step-block">
      <div class="step-label blue">1. WVTR Rate Source</div>
      <div class="src-group">
        <button class="src-btn active" id="src-calc" onclick="MVTR.setSource('calc')">From Calculator</button>
        <button class="src-btn" id="src-db" onclick="MVTR.setSource('db')">Community DB</button>
        <button class="src-btn" id="src-co" onclick="MVTR.setSource('co')" disabled title="Connect to a company first">Company DB &#x1f512;</button>
      </div>
      <div id="panel-calc">
        <div class="source-panel">
          <div class="sp-name" id="lam-name">No laminate loaded</div>
          <div class="sp-struct" id="lam-struct">Run a calculation in the Calculator tab first, then return here.</div>
          <div class="sp-row"><span>Calculated WVTR:</span><span class="sp-val" id="lam-rate">—</span></div>
        </div>
        <div class="alert alert-info" style="margin-top:.45rem">
          <span>When the Calculator produces a result it automatically populates this field.</span>
        </div>
      </div>
      <div id="panel-db" style="display:none">
        <div class="form-group" style="margin:0">
          <label>Select from Community Database</label>
          <select class="form-input" id="db-pick" onchange="MVTR.onDBPick(this.value)">
            <option value="">— Select a validated laminate —</option>
            <optgroup label="Pharmaceutical Grade">
              <option value="0.002|38|90">PET 12µm / Al 9µm / LDPE 60µm — 0.002 g/m²·day</option>
              <option value="0.01|38|90">OPA 15µm / Al 12µm / LLDPE 80µm — 0.010 g/m²·day</option>
              <option value="0.05|38|90">PET 12µm / EVOH 12µm / PP 50µm — 0.050 g/m²·day</option>
              <option value="0.001|38|90">PVDC 40µm / OPA 15µm / Al 9µm / LDPE 50µm — 0.001 g/m²·day</option>
            </optgroup>
            <optgroup label="Food Grade">
              <option value="0.5|38|90">OPP 20µm / LDPE 40µm — 0.500 g/m²·day</option>
              <option value="1.0|38|90">PET 12µm / LDPE 60µm — 1.000 g/m²·day</option>
              <option value="2.5|38|90">OPP 20µm / Met.OPP 20µm — 2.500 g/m²·day</option>
              <option value="0.2|38|90">PET 12µm / EVOH 6µm / LLDPE 70µm — 0.200 g/m²·day</option>
            </optgroup>
          </select>
          <div class="hint">All values at 38°C / 90% RH (ASTM F1249) unless noted.</div>
        </div>
      </div>
      <div id="panel-co" style="display:none">
        <div class="company-locked">
          <div class="lock-icon">&#x1f512;</div>
          <div class="lock-title">Company Database Locked</div>
          <div class="lock-desc">Access to your organisation's proprietary laminate database requires an active company membership. Connect to your company to unlock custom materials and validated WVTR data.</div>
          <button class="lock-btn" onclick="MVTR.unlockCompany()">Connect to Company</button>
        </div>
      </div>
      <div style="margin-top:.65rem;padding-top:.5rem;border-top:1px dashed var(--border)">
        <label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;font-size:.85rem;color:var(--text-light);font-weight:600">
          <input type="checkbox" id="manual-toggle" onchange="MVTR.toggleManual(this.checked)">
          Override with manual WVTR value
        </label>
      </div>
      <div id="panel-manual" style="display:none;margin-top:.5rem;background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:.65rem">
        <div class="alert alert-warning" style="margin:0 0 .5rem 0">
          <span>Ensure the value matches the reference conditions below.</span>
        </div>
        <div class="grid grid-3" style="gap:.4rem">
          <div class="form-group" style="margin:0"><label>WVTR (g/m²/day)</label><input type="number" id="man-wvtr" class="form-input" value="1.0" step=".001" oninput="MVTR.onManualChange()"></div>
          <div class="form-group" style="margin:0"><label>Test T (°C)</label><input type="number" id="man-t" class="form-input" value="38" step=".5" oninput="MVTR.onManualChange()"></div>
          <div class="form-group" style="margin:0"><label>Test RH (%)</label><input type="number" id="man-rh" class="form-input" value="90" step="1" oninput="MVTR.onManualChange()"></div>
        </div>
      </div>
      <div class="rate-banner">
        <span class="rb-label">Active WVTR:</span>
        <span class="rb-val" id="active-wvtr">— g/m²/day</span>
      </div>
    </div>

    <div class="step-block">
      <div class="step-label warning">2. Reference Conditions & Thermal Correction</div>
      <div class="grid grid-2" style="gap:.5rem">
        <div class="form-group" style="margin:0" id="fg-tref">
          <label>Reference Temperature (°C)</label>
          <input type="number" id="ph-tref" class="form-input" value="38" step=".5">
          <div class="err">Valid range: −50 to 100°C</div>
        </div>
        <div class="form-group" style="margin:0" id="fg-rhref">
          <label>Reference RH (%)</label>
          <input type="number" id="ph-rhref" class="form-input" value="90" step="1" min="0" max="100">
          <div class="err">0–100%</div>
        </div>
      </div>
      <div class="form-group" style="margin-top:.5rem;margin-bottom:0" id="fg-ea">
        <label>Activation Energy Eₐ (kJ/mol) — set 0 to disable Arrhenius</label>
        <div class="input-row">
          <input type="number" id="ph-ea" class="form-input" value="35" step="1" min="0" max="150">
          <span class="input-unit">kJ/mol</span>
        </div>
        <div class="hint">LDPE/PP ≈ 30–40 · EVOH ≈ 50–65 · Nylon ≈ 40–55 · Al foil ≈ 0</div>
        <div class="err">0–150 kJ/mol</div>
      </div>
    </div>

    <div class="step-block">
      <div class="step-label purple">3. Packaging Geometry</div>
      <div class="pkg-mode-row">
        <label><input type="radio" name="pkg-mode" value="shape" checked onchange="MVTR.togglePkgMode()"> Calculate from shape</label>
        <label><input type="radio" name="pkg-mode" value="manual" onchange="MVTR.togglePkgMode()"> Enter area manually</label>
      </div>
      <div id="geom-selector">
        <div class="form-group" style="margin:0 0 .4rem">
          <label>Package / Container Type</label>
          <select class="form-input" id="sl-shape" onchange="MVTR.onShapeChange()">
            <option value="flat">Flat Pouch</option>
            <option value="standup">Stand-Up Pouch</option>
            <option value="flow">Flow Pack / Pillow Bag</option>
            <option value="box">Rectangular Box / Carton</option>
            <option value="cylinder">Cylindrical Jar / Canister</option>
            <option value="tray">Tray with Lid</option>
            <option value="bottle">Bottle (body + shoulder + neck)</option>
            <option value="blister">Blister Pack (cavity lid area only)</option>
          </select>
        </div>
        <div id="dims-std" class="dims-block">
          <div class="grid grid-3" style="gap:.4rem">
            <div class="form-group" style="margin:0"><label id="lbl-w">Width (cm)</label><input type="number" id="sl-w" class="form-input" value="12" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label id="lbl-h">Height (cm)</label><input type="number" id="sl-h" class="form-input" value="17" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label id="lbl-d">Depth / Gusset (cm)</label><input type="number" id="sl-d" class="form-input" value="0" step=".1" oninput="MVTR.calcArea()"></div>
          </div>
          <div class="form-group" style="margin:.4rem 0 0"><label>Weld / Seal Margin (cm)</label><input type="number" id="sl-margin" class="form-input" value="1.5" step=".5" oninput="MVTR.calcArea()"></div>
        </div>
        <div id="dims-blister" class="dims-block" style="display:none">
          <div class="grid grid-2" style="gap:.4rem">
            <div class="form-group" style="margin:0"><label>Cavities per strip</label><input type="number" id="bl-count" class="form-input" value="10" step="1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Cavity Area (cm²)</label><input type="number" id="bl-area" class="form-input" value="1.5" step=".1" oninput="MVTR.calcArea()"></div>
          </div>
          <div class="hint">Exposed area = cavities × cavity area. Lid film only.</div>
        </div>
        <div id="dims-bottle" class="dims-block" style="display:none">
          <div class="grid grid-2" style="gap:.4rem">
            <div class="form-group" style="margin:0"><label>Body radius (cm)</label><input type="number" id="bt-br" class="form-input" value="3.5" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Body height (cm)</label><input type="number" id="bt-bh" class="form-input" value="16" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Neck radius (cm)</label><input type="number" id="bt-nr" class="form-input" value="1.2" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Neck height (cm)</label><input type="number" id="bt-nh" class="form-input" value="4" step=".1" oninput="MVTR.calcArea()"></div>
            <div class="form-group" style="margin:0;grid-column:1/-1"><label>Shoulder height (cm)</label><input type="number" id="bt-sh" class="form-input" value="2.5" step=".1" oninput="MVTR.calcArea()"></div>
          </div>
        </div>
      </div>
      <div id="manual-area" style="display:none">
        <div class="form-group" style="margin:0"><label>Total Surface Area (m²)</label><input type="number" id="sl-area-man" class="form-input" value="0.0408" step=".001" oninput="MVTR.updateManualArea()"></div>
      </div>
      <div class="area-result">
        <span>Effective surface area:</span>
        <strong id="area-display">0.0408 m²</strong>
      </div>
      <input type="hidden" id="sl-area" value="0.0408">
    </div>

    <div class="step-block">
      <div class="step-label" style="color:var(--purple)">4. Product & Compliance Limit</div>
      <div class="grid grid-2" style="gap:.5rem">
        <div class="form-group" style="margin:0" id="fg-crit">
          <label>Critical Moisture Gain (mg/package)</label>
          <div class="input-row"><input type="number" id="ph-crit" class="form-input" value="2.0" step=".1" min=".01"><span class="input-unit">mg</span></div>
          <div class="hint">Max permissible moisture uptake before product failure.</div>
          <div class="err">Must be > 0</div>
        </div>
        <div class="form-group" style="margin:0" id="fg-years">
          <label>Target Shelf Life (years)</label>
          <div class="input-row"><input type="number" id="ph-years" class="form-input" value="2" step=".5" min=".5" max="10"><span class="input-unit">yr</span></div>
          <div class="err">0.5–10 yr</div>
        </div>
      </div>
      <div class="form-group" style="margin-top:.5rem;margin-bottom:0">
        <label>Scenario Label</label>
        <input type="text" id="sce-label" class="form-input" value="Base Scenario" placeholder="e.g. Formulation A">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="MVTR.calculate()">Calculate ICH Compliance</button>
        <button class="btn btn-outline btn-sm" onclick="MVTR.resetForm()">Reset</button>
      </div>
    </div>

    <div class="step-block" style="border-bottom:none">
      <div class="step-label green">5. Save & Export</div>
      <div class="btn-group" style="margin-top:0">
        <button class="btn btn-success btn-sm" onclick="MVTR.saveScenario()">Save Scenario</button>
        <button class="btn btn-outline btn-sm" onclick="MVTR.exportCSV()">CSV</button>
        <button class="btn btn-outline btn-sm" id="btn-pdf" onclick="MVTR.exportPDF()">PDF Report</button>
      </div>
    </div>
  </div>

  <div class="sticky-col">
    <div class="card" style="margin-bottom:.9rem">
      <h2>KPI Dashboard</h2>
      <div class="kpi-grid">
        <div class="kpi blue" id="kpi-zones">
          <div class="kpi-label">Compliant ICH Zones</div>
          <div class="kpi-val" id="kv-zones">—</div>
          <div class="kpi-sub" id="ks-zones">Awaiting calculation</div>
        </div>
        <div class="kpi warning" id="kpi-ingress">
          <div class="kpi-label">Max Annual Ingress</div>
          <div class="kpi-val" id="kv-ingress">—</div>
          <div class="kpi-sub" id="ks-ingress">Most critical zone</div>
        </div>
        <div class="kpi gray" id="kpi-safety">
          <div class="kpi-label">Min Safety Margin</div>
          <div class="kpi-val" id="kv-safety">—</div>
          <div class="kpi-sub">vs critical limit</div>
        </div>
        <div class="kpi gray" id="kpi-arr">
          <div class="kpi-label">Avg Arrhenius Factor</div>
          <div class="kpi-val" id="kv-arr">—</div>
          <div class="kpi-sub">Thermal acceleration</div>
        </div>
      </div>
      <div style="margin-top:.85rem">
        <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:.25rem">
          <span id="kpi-status" style="color:var(--text-light)">Waiting for calculation…</span>
          <span id="kpi-pct" style="font-weight:700">—</span>
        </div>
        <div class="progress-bar"><div class="progress-fill blue" id="kpi-bar" style="width:0%"></div></div>
      </div>
    </div>
    <div class="card">
      <h2>Quick Results</h2>
      <div id="quick-results" style="font-size:.9rem;color:var(--text-light);text-align:center;padding:1rem 0">
        Configure parameters and click <strong>Calculate ICH Compliance</strong>.
      </div>
    </div>
  </div>
</div>

<div id="detailed" style="display:none;margin-top:1.2rem">
  <div class="tabs">
    <button class="tab active" onclick="MVTR.switchTab('overview',event)">Overview</button>
    <button class="tab" onclick="MVTR.switchTab('tables',event)">Full Tables</button>
    <button class="tab" onclick="MVTR.switchTab('charts',event)">Charts</button>
    <button class="tab" onclick="MVTR.switchTab('scenarios',event)">Scenarios</button>
    <button class="tab" onclick="MVTR.switchTab('sensitivity',event)">Sensitivity</button>
  </div>

  <div id="tab-overview" class="tab-pane active">
    <div class="grid grid-2">
      <div class="card"><h2>Annual Ingress by Zone</h2><div class="chart-wrap"><canvas id="ch-overview"></canvas></div></div>
      <div class="card">
        <h2>Correction Factors</h2>
        <div class="chart-wrap sm"><canvas id="ch-factors"></canvas></div>
        <div id="factors-sum" style="margin-top:.6rem;font-size:.85rem;color:var(--text-light)"></div>
      </div>
    </div>
    <div class="card"><h2>Summary by ICH Zone</h2>
      <div class="tbl-wrap"><table class="data-table" id="tbl-summary">
        <thead><tr><th>Zone</th><th>Conditions</th><th>Eff. WVTR</th><th>Annual Ingress</th><th>Total (SL)</th><th>% Limit</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
  </div>

  <div id="tab-tables" class="tab-pane">
    <div class="card"><h2>Complete Calculation Table</h2>
      <div class="tbl-wrap"><table class="data-table" id="tbl-detailed">
        <thead><tr><th>Zone</th><th>T°C</th><th>RH%</th><th>WVTR ref</th><th>F_T</th><th>F_RH</th><th>WVTR eff</th><th>Area m²</th><th>Daily mg</th><th>Annual mg</th><th>Total mg</th><th>% Limit</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div class="card"><h2>Active Parameters</h2><div id="params-panel" style="font-size:.88rem;line-height:1.9;font-family:'Courier New',monospace"></div></div>
  </div>

  <div id="tab-charts" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><h2>WVTR: Reference vs Effective</h2><div class="chart-wrap"><canvas id="ch-wvtr"></canvas></div></div>
      <div class="card"><h2>Zone Map (T vs RH)</h2><div class="chart-wrap"><canvas id="ch-trh"></canvas></div></div>
      <div class="card"><h2>Years to Critical Limit</h2><div class="chart-wrap"><canvas id="ch-ttl"></canvas></div></div>
    </div>
  </div>

  <div id="tab-scenarios" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><div id="sce-comp-list"></div></div>
      <div class="card"><h2>Comparison Chart</h2><div class="chart-wrap"><canvas id="ch-sce"></canvas></div></div>
    </div>
    <div class="card"><h2>Comparison Table</h2>
      <div class="tbl-wrap"><table class="data-table" id="tbl-sce">
        <thead><tr id="sce-hdr"><th>Parameter</th></tr></thead>
        <tbody id="sce-body"></tbody>
      </table></div>
    </div>
  </div>

  <div id="tab-sensitivity" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><h2>Sensitivity: Eₐ</h2>
        <div class="grid grid-2" style="gap:.4rem;align-items:end">
          <div class="form-group" style="margin:0"><label>Eₐ min (kJ/mol)</label><input type="number" id="s-ea-min" class="form-input" value="20" step="5" oninput="MVTR.runSensEA()"></div>
          <div class="form-group" style="margin:0"><label>Eₐ max (kJ/mol)</label><input type="number" id="s-ea-max" class="form-input" value="65" step="5" oninput="MVTR.runSensEA()"></div>
        </div>
        <div class="chart-wrap"><canvas id="ch-sea"></canvas></div>
      </div>
      <div class="card"><h2>Sensitivity: WVTR</h2>
        <div class="grid grid-2" style="gap:.4rem;align-items:end">
          <div class="form-group" style="margin:0"><label>WVTR min (g/m²/d)</label><input type="number" id="s-wvtr-min" class="form-input" value="0.1" step=".1" oninput="MVTR.runSensWVTR()"></div>
          <div class="form-group" style="margin:0"><label>WVTR max (g/m²/d)</label><input type="number" id="s-wvtr-max" class="form-input" value="3.0" step=".1" oninput="MVTR.runSensWVTR()"></div>
        </div>
        <div class="chart-wrap"><canvas id="ch-swvtr"></canvas></div>
      </div>
    </div>
  </div>
</div>

<div class="disclaimer">
  <h3>⚠ Regulatory Disclaimer & Model Limitations</h3>
  <div class="disc-item"><strong>For R&D screening and concept development only.</strong> This tool assists packaging engineers during early material selection. It produces predictive estimates from mathematical models and does not replace regulatory stability testing.</div>
  <div class="disc-item"><strong>Real-time and accelerated stability studies are mandatory.</strong> Commercial shelf-life claims submitted to FDA, EMA, PMDA, ANVISA, or any national authority must be supported by experimental data from accredited stability chambers, in full compliance with ICH Q1A(R2) and applicable local regulations.</div>
  <div class="disc-item"><strong>Model assumptions:</strong> (1) Steady-state permeation through a defect-free uniform film. (2) Linear superposition of Arrhenius and RH correction factors. (3) No seal permeation, pinholes, or mechanical damage. (4) Constant storage conditions throughout shelf life. (5) Negligible back-diffusion as internal moisture approaches external humidity. Real systems may deviate significantly from these idealised conditions.</div>
  <div class="disc-item"><strong>Source data quality determines output reliability.</strong> When using the Calculator source, accuracy depends on the material database entries. When entering values manually, the user is solely responsible for ensuring the measurement was performed under the stated reference conditions per ASTM F1249 or ISO 15106.</div>
</div>

${renderMVTRMethodology()}
`;
}


// ====================================================================
// 📖 METHODOLOGY
// ====================================================================

function renderMVTRMethodology() {
  return `
<div class="methodology-card">
  <div class="mc-inner">
    <h2>Mechanics of MVTR Analysis & ICH Q1A(R2) Compliance</h2>
    <div class="mc-body">
      <p>The Moisture Vapor Transmission Rate (MVTR, also written WVTR) is the steady-state flux of water vapor through a unit area of packaging film under defined conditions of temperature and relative humidity. In pharmaceutical packaging science, quantifying this rate and projecting its cumulative effect over the product's intended shelf life is not optional. It is the foundation upon which stability assessments under ICH Q1A(R2) are built. This system implements the full analytical chain from measured barrier values through zone-specific thermal and humidity corrections to compliance predictions against a user-defined critical limit.</p>

      <h3> The ICH Climatic Zone Framework</h3>
      <p>The International Council for Harmonisation (ICH) codified the global climatic landscape into five zones, each representing the mean kinetic temperature and relative humidity conditions a pharmaceutical product encounters during its commercial life in that region. These are not arbitrary categories. They encode real thermodynamic stress that packaging must survive.</p>
      <div class="callout blue">
        <strong>Zone Definitions (ICH Q1A(R2) / WHO Technical Report Series No. 863):</strong><br>
        Zone I (21°C / 45% RH): Temperate, Europe, Canada, Russia<br>
        Zone II (25°C / 60% RH): Subtropical / Mediterranean, USA, Japan<br>
        Zone IIIa (40°C / 15% RH): Hot/Dry, Middle East, arid Africa<br>
        Zone IVa (40°C / 75% RH): Hot/Humid, South-East Asia, tropical regions<br>
        Zone IVb (30°C / 75% RH): Hot/Very Humid (ASEAN harmonised protocol)<br>
        Accelerated (40°C / 75% RH): ICH Q1A(R2) stress testing, Section 2.1.2<br>
        Intermediate (30°C / 65% RH): ICH Q1A(R2) bridging condition
      </div>

      <h3> Arrhenius Temperature Correction</h3>
      <p>Water vapor permeation through a polymer film is a thermally activated diffusion process. As temperature rises, polymer chain segmental mobility increases, free volume grows, and the diffusion coefficient of water molecules through the matrix accelerates exponentially. This relationship is described by the Arrhenius equation:</p>
      <div class="formula-block">F_T = exp [ (Eₐ / R) × (1/T_ref − 1/T_target) ]<br><br>Eₐ = activation energy of permeation (kJ/mol)<br>R = 8.314 × 10⁻³ kJ/(mol·K) · T in Kelvin</div>
      <p>When F_T &gt; 1 the target zone is hotter than the reference and permeation is accelerated. F_T &lt; 1 means the zone is cooler and the film performs better than its measured value. Setting Eₐ = 0 treats WVTR as temperature-independent, which is appropriate only when no activation energy data exists.</p>
      <div class="callout warning">
        <strong>Literature Eₐ guidance:</strong> Polyolefins (LDPE, PP) ≈ 28–42 kJ/mol. Polar films (EVOH, Nylon) ≈ 45–70 kJ/mol due to stronger hydrogen-bonding with water. Aluminium foil laminates: near zero when foil is intact, because transport occurs through defects (pinholes, seals), not through the metal lattice itself. Metallised films fall between 10–30 kJ/mol depending on metallisation quality.
      </div>

      <h3> Relative Humidity Driving Force</h3>
      <p>Permeation is driven by the partial pressure differential of water vapour across the film. At the same temperature, the ratio of partial pressures simplifies to the ratio of relative humidities, giving a linear first-order correction:</p>
      <div class="formula-block">F_RH = RH_target / RH_ref<br>WVTR_eff = WVTR_ref × F_T × F_RH</div>
      <p>This linear approximation holds well for non-hygroscopic films (polyolefins, PET). For hygroscopic films (EVOH, Nylon, regenerated cellulose), the diffusion coefficient increases non-linearly with humidity. In those cases an exponential beta-correction should be applied. See the hygroscopic correction module in the WVTR/OTR Calculator. The Community DB laminates listed in Step 1 have been validated to contain hygroscopic-grade corrections where applicable.</p>

      <h3> Cumulative Ingress and Compliance Evaluation</h3>
      <p>Once the effective WVTR is established for each ICH zone, cumulative ingress over the shelf life follows from a steady-state linear model:</p>
      <div class="formula-block">Ingress_daily (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000<br>Ingress_total (mg) = Ingress_daily × t_shelf (days)<br>Compliance: Ingress_total ≤ M_crit</div>
      <div class="callout success">
        <strong>Worked example (pharmaceutical blister pack):</strong> WVTR_ref = 1.0 g/m²/day at 38°C/90%RH, Eₐ = 35 kJ/mol, cavity area = 2 cm². Zone IVa (40°C/75%RH): F_T = exp[(35/0.008314)×(1/311.15 − 1/313.15)] = 1.088; F_RH = 75/90 = 0.833; WVTR_eff = 0.907 g/m²/day. Daily ingress = 0.907 × 0.0002 × 1000 = 0.000181 mg. Over 2 years (730 days) = 0.133 mg, well within a 2.0 mg M_crit.
      </div>
      <p>The critical moisture limit M_crit must be established through independent product characterisation. Moisture sorption isotherm testing (ISO 18787, DVS method) combined with accelerated degradation experiments identifies the threshold beyond which physicochemical or microbiological failure initiates.</p>

      <h3> Packaging Geometry & Exposed Area</h3>
      <p>The surface area A is the single geometric parameter coupling the barrier value to the mass of water entering the package. For blister packs, only the polymer lid foil area over the cavity is moisture-active. The aluminium base contributes negligibly. For pouches and bags, both faces and any gusset area contribute. Bottles require numerical integration over the body, shoulder, and neck surfaces, which this tool performs automatically when the "Bottle" shape is selected. Seal areas and induction-welded surfaces are excluded by default and should be accounted for separately if seal permeation is a known concern for the laminate in question.</p>

      <h3>Safety Margin and Sensitivity Analysis</h3>
      <p>A compliance pass is a necessary but not sufficient condition for robust packaging. The safety margin, defined as the fraction of M_crit not consumed at end of shelf life, quantifies engineering headroom against real-world variability: batch-to-batch WVTR variation (±15–25% is typical for commercial films), seal integrity degradation during distribution, cyclic humidity in transit, and measurement uncertainty in the reference WVTR. A margin below 20% warrants a design review. The sensitivity analysis identifies which input parameters have the greatest leverage on the compliance outcome, directing experimental validation effort efficiently.</p>

      <h3> Alignment with International Standards</h3>
      <div class="mc-refs">
        • <strong>ASTM F1249-20</strong>: WVTR through plastic film and sheeting, modulated infrared sensor method<br>
        • <strong>ISO 15106-3:2003</strong>: Water vapour transmission rate, electrolytic detection sensor method<br>
        • <strong>ICH Q1A(R2) (2003)</strong>: Stability Testing of New Drug Substances and Pharmaceutical Products<br>
        • <strong>WHO TRS No. 863 (1996)</strong>: Climatic zone classification for global stability testing<br>
        • <strong>ASTM E1641</strong>: Decomposition kinetics by thermogravimetry (Arrhenius parameter determination)<br>
        • <strong>ISO 18787:2017</strong>: Determination of water activity in food and food products
      </div>
    </div>
  </div>
</div>
`;
}
window.renderPharmaMvtr = function() {
  var c = document.getElementById('app-content');
  if (c) c.innerHTML = renderMVTR();
  setTimeout(function() { MVTR.init(); }, 100);
};
