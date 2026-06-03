// ====================================================================
// 🧪 MVTR.JS - ICH Q1A(R2) Compliance Engine  
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
  flat:     { w:12, h:17, d:0,   lw:'Width L (cm)',           lh:'Height H (cm)',   ld:'Depth / Diameter (cm)' },
  standup:  { w:13, h:22, d:0,   lw:'Width L (cm)',           lh:'Height H (cm)',   ld:'Gusset / Depth (cm)' },
  flow:     { w:20, h:12, d:0,   lw:'Fin Seal Length (cm)',   lh:'Web Width (cm)',  ld:'—' },
  box:      { w:10, h:15, d:5,   lw:'Length (cm)',            lh:'Height (cm)',     ld:'Depth (cm)' },
  cylinder: { w:0,  h:12, d:10,  lw:'—',                      lh:'Height (cm)',     ld:'Diameter (cm)' },
  tray:     { w:15, h:10, d:3,   lw:'Length (cm)',            lh:'Width (cm)',      ld:'Depth (cm)' },
  bottle:   null,
  blister:  null
};

const MVTR = {
  _activeSource: 'calc',
  _manualOverride: false,
  _currentShape: 'flat',
  _results: null,
  _scenarios: [],
  _charts: {},
  _companyLinked: false,

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
        if (saved.Tref)        document.getElementById('mvtr-tref').value  = saved.Tref;
        if (saved.RHref)       document.getElementById('mvtr-rhref').value = saved.RHref;
        if (saved.Ea != null)  document.getElementById('mvtr-ea').value    = saved.Ea;
        if (saved.Mcrit)       document.getElementById('mvtr-crit').value  = saved.Mcrit;
        if (saved.shelf_years) document.getElementById('mvtr-years').value = saved.shelf_years;
      }
    } catch(e){}

    // Listen for storage events
    window.addEventListener('storage', (e) => {
      if (e.key === 'mvtr_calc_result') {
        console.log('🔄 Storage event detected:', e.newValue);
        this.refreshCalcPanel();
      }
    });

    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📄 Page visible, refreshing...');
        this.refreshCalcPanel();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this._results) try { localStorage.setItem('mvtr_last_params', JSON.stringify(this._results.params)); } catch(e){}
    });
  },

  refreshCalcPanel() {
    try {
      const saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
      console.log('🔍 refreshCalcPanel - localStorage data:', saved);
      
      if (saved && saved.total > 0) {
        const nameEl   = document.getElementById('mvtr-lam-name');
        const structEl = document.getElementById('mvtr-lam-struct');
        const rateEl   = document.getElementById('mvtr-lam-rate');
        if (nameEl)   nameEl.textContent  = saved.laminateName || 'Laminate from Calculator';
        if (structEl) structEl.textContent = saved.structure    || '';
        if (rateEl)   rateEl.textContent   = saved.total.toFixed(5) + ' g/m²/day';
        this._updateRateSummary(saved.total.toFixed(5));
        console.log('✅ Loaded from Calculator:', saved.total);
      } else {
        const n = document.getElementById('mvtr-lam-name');
        const s = document.getElementById('mvtr-lam-struct');
        const r = document.getElementById('mvtr-lam-rate');
        if (n) n.textContent = 'No laminate loaded';
        if (s) s.textContent = 'Run a calculation in the Calculator tab first.';
        if (r) r.textContent = '—';
        this._updateRateSummary('-');
      }
    } catch(e){
      console.error('❌ refreshCalcPanel error:', e);
    }
    this.updateBanner();
  },

  _updateRateSummary(rateStr) {
    const el = document.getElementById('mvtr-active-rate');
    if (el) el.textContent = rateStr + ' g/m²/day';
  },

  setSource(s) {
    if (s === 'co' && !this._companyLinked) {
      alert('Company Database is locked.');
      return;
    }
    this._activeSource = s;
    
    ['calc','db','co'].forEach(key => {
      const btn = document.getElementById('mvtr-src-btn-' + key);
      if (!btn) return;
      if (key === s) {
        btn.className = 'btn btn-sm';
        btn.style.cssText = 'background:var(--primary);color:#fff;border:none;font-size:0.75rem';
      } else {
        btn.className = 'btn btn-sm btn-outline';
        btn.style.cssText = 'font-size:0.75rem';
      }
    });
    
    ['calc','db','co'].forEach(p => {
      const panel = document.getElementById('mvtr-panel-' + p);
      if (panel) panel.style.display = p === s ? 'block' : 'none';
    });
    
    if (s === 'calc') this.refreshCalcPanel();
    else this.updateBanner();
  },

  unlockCompany() {
    alert('Connect to your company to unlock.');
  },

  toggleManual(on) {
    this._manualOverride = on;
    const panel = document.getElementById('mvtr-panel-manual');
    if (panel) panel.style.display = on ? 'block' : 'none';
    
    ['calc','db','co'].forEach(key => {
      const btn = document.getElementById('mvtr-src-btn-' + key);
      if (!btn) return;
      btn.disabled = on;
      btn.style.opacity = on ? '0.35' : '1';
      btn.style.cursor = on ? 'not-allowed' : 'pointer';
    });
    
    ['calc','db','co'].forEach(p => {
      const el = document.getElementById('mvtr-panel-' + p);
      if (el) el.style.display = on ? 'none' : (p === this._activeSource ? 'block' : 'none');
    });
    
    if (on) this.onManualChange();
    else this.setSource(this._activeSource);
  },

  onDBPick(val) {
    if (!val) return;
    const [w, t, rh] = val.split('|').map(Number);
    document.getElementById('mvtr-tref').value  = t;
    document.getElementById('mvtr-rhref').value = rh;
    this.updateBanner();
  },

  onManualChange() { 
    const rate = parseFloat(document.getElementById('mvtr-rate-manual')?.value) || 0;
    this._updateRateSummary(rate > 0 ? rate.toFixed(5) : '-');
    this.updateBanner(); 
  },

  getActiveRate() {
    if (this._manualOverride) {
      const v = parseFloat(document.getElementById('mvtr-rate-manual')?.value);
      return isNaN(v) ? null : v;
    }
    if (this._activeSource === 'db') {
      const v = document.getElementById('mvtr-db-pick')?.value;
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
    const el = document.getElementById('mvtr-active-rate');
    if (el) el.textContent = r != null ? r.toFixed(5) + ' g/m²/day' : '— g/m²/day';
  },

  togglePkgMode() {
    const mode = document.querySelector('input[name="mvtr-pkg-mode"]:checked')?.value || 'shape';
    const geom = document.getElementById('mvtr-geom-selector');
    const man  = document.getElementById('mvtr-manual-area');
    if (geom) geom.style.display = mode === 'shape'  ? 'grid' : 'none';
    if (man)  man.style.display  = mode === 'manual' ? 'block' : 'none';
    this.calcArea();
  },

  onShapeChange() {
    const shape = document.getElementById('mvtr-shape').value;
    this._currentShape = shape;
    const isBottle  = shape === 'bottle';
    const isBlister = shape === 'blister';
    const std = document.getElementById('mvtr-dims-std');
    const bot = document.getElementById('mvtr-dims-bottle');
    const bli = document.getElementById('mvtr-dims-blister');
    if (std) std.style.display = (!isBottle && !isBlister) ? 'grid' : 'none';
    if (bot) bot.style.display = isBottle  ? 'grid' : 'none';
    if (bli) bli.style.display = isBlister ? 'grid' : 'none';
    const cfg = MVTR_SHAPE_CONFIGS[shape];
    if (cfg) {
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      const lbl = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
      set('mvtr-w', cfg.w); set('mvtr-h', cfg.h); set('mvtr-d', cfg.d);
      lbl('mvtr-lbl-w', cfg.lw); lbl('mvtr-lbl-h', cfg.lh); lbl('mvtr-lbl-d', cfg.ld);
    }
    this.calcArea();
  },

  calcArea() {
    const mode = document.querySelector('input[name="mvtr-pkg-mode"]:checked')?.value || 'shape';
    let area = 0;
    if (mode === 'manual') {
      area = parseFloat(document.getElementById('mvtr-area-man')?.value) || 0;
    } else {
      const shape  = document.getElementById('mvtr-shape')?.value || 'flat';
      this._currentShape = shape;
      const margin = parseFloat(document.getElementById('mvtr-margin')?.value) || 0;
      if (shape === 'bottle') {
        const Rb = parseFloat(document.getElementById('mvtr-bt-br')?.value) || 3.5;
        const Hb = parseFloat(document.getElementById('mvtr-bt-bh')?.value) || 16;
        const Rn = parseFloat(document.getElementById('mvtr-bt-nr')?.value) || 1.2;
        const Hn = parseFloat(document.getElementById('mvtr-bt-nh')?.value) || 4;
        const Hs = parseFloat(document.getElementById('mvtr-bt-sh')?.value) || 2.5;
        const mf = 1 + margin / 100;
        const bodyLat = 2 * Math.PI * Rb * Hb;
        const neckLat = 2 * Math.PI * Rn * Hn;
        const slant   = Math.sqrt((Rb - Rn)**2 + Hs**2);
        const shoulder = Math.PI * (Rb + Rn) * slant;
        const bottom  = Math.PI * Rb**2;
        area = (bodyLat + neckLat + shoulder + bottom) * mf / 10000;
      } else if (shape === 'blister') {
        const count = parseFloat(document.getElementById('mvtr-bl-count')?.value) || 10;
        const ca    = parseFloat(document.getElementById('mvtr-bl-area')?.value)  || 1.5;
        area = count * ca / 10000;
      } else {
        const w = parseFloat(document.getElementById('mvtr-w')?.value) || 0;
        const h = parseFloat(document.getElementById('mvtr-h')?.value) || 0;
        const d = parseFloat(document.getElementById('mvtr-d')?.value) || 0;
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
    const display = document.getElementById('mvtr-area-display');
    const hidden  = document.getElementById('mvtr-area');
    if (display) display.textContent = area.toFixed(4) + ' m²';
    if (hidden)  hidden.value = area.toFixed(5);
  },

  updateManualArea() {
    const v = document.getElementById('mvtr-area-man')?.value || '0';
    const display = document.getElementById('mvtr-area-display');
    const hidden  = document.getElementById('mvtr-area');
    if (display) display.textContent = v + ' m²';
    if (hidden)  hidden.value = v;
  },

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

  validate() {
    const checks = [
      { id:'mvtr-tref',  fg:'mvtr-fg-tref',  min:-50, max:100 },
      { id:'mvtr-rhref', fg:'mvtr-fg-rhref', min:0,   max:100 },
      { id:'mvtr-ea',    fg:'mvtr-fg-ea',    min:0,   max:150 },
      { id:'mvtr-crit',  fg:'mvtr-fg-crit',  min:0.001 },
      { id:'mvtr-years', fg:'mvtr-fg-years', min:0.5, max:10 }
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

  calculate() {
    const rate = this.getActiveRate();
    if (!rate || rate <= 0) { alert('No valid WVTR. Select a source or enter manually.'); return; }
    if (!this.validate()) return;
    const params = {
      wRef:        rate,
      Tref:        parseFloat(document.getElementById('mvtr-tref').value),
      RHref:       parseFloat(document.getElementById('mvtr-rhref').value),
      Ea:          parseFloat(document.getElementById('mvtr-ea').value) || 0,
      area:        parseFloat(document.getElementById('mvtr-area').value),
      Mcrit:       parseFloat(document.getElementById('mvtr-crit').value),
      shelf_years: parseFloat(document.getElementById('mvtr-years').value),
      shelfDays:   parseFloat(document.getElementById('mvtr-years').value) * DAYS,
      label:       document.getElementById('mvtr-label').value || 'Scenario',
      source:      this._activeSource
    };
    this._results = { params, zones: this.runCalc(params), ts: new Date().toISOString() };
    const det = document.getElementById('mvtr-detailed');
    if (det) det.style.display = 'block';
    this.updateKPIs();
    this.updateQuick();
    this.renderOverview();
    this.renderTables();
    this.renderCharts();
    this.renderScenariosList();
    if (det) det.scrollIntoView({ behavior:'smooth', block:'start' });
  },

  updateKPIs() {
    const zs = this._results.zones;
    const pass = zs.filter(r => r.pass).length, tot = zs.length;
    const pct  = Math.round(pass / tot * 100);
    const zCard = document.getElementById('mvtr-kpi-zones');
    document.getElementById('mvtr-kv-zones').textContent = pass + '/' + tot;
    document.getElementById('mvtr-ks-zones').textContent = pct + '% compliant';
    if (zCard) zCard.className = 'kpi ' + (pass === tot ? 'green' : pass === 0 ? 'danger' : 'warning');

    const maxAnn = Math.max(...zs.map(r => r.annual));
    document.getElementById('mvtr-kv-ingress').textContent = maxAnn.toFixed(3) + ' mg';
    document.getElementById('mvtr-ks-ingress').textContent = zs.find(r => r.annual === maxAnn).zone.label;

    const minSaf = Math.min(...zs.map(r => 100 - r.pct));
    const sCard = document.getElementById('mvtr-kpi-safety');
    document.getElementById('mvtr-kv-safety').textContent = minSaf.toFixed(1) + '%';
    if (sCard) sCard.className = 'kpi ' + (minSaf > 20 ? 'green' : minSaf > 0 ? 'warning' : 'danger');

    const avgArr = zs.reduce((s, r) => s + r.arrF, 0) / zs.length;
    document.getElementById('mvtr-kv-arr').textContent = avgArr.toFixed(2) + 'x';

    const bar = document.getElementById('mvtr-kpi-bar');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'progress-fill ' + (pct === 100 ? 'green' : pct >= 50 ? 'warning' : 'danger');
    }
    const st = document.getElementById('mvtr-kpi-status');
    if (st) st.textContent = pct === 100 ? 'All zones compliant' : pct === 0 ? 'No zones compliant' : 'Partial compliance';
    const pp = document.getElementById('mvtr-kpi-pct');
    if (pp) pp.textContent = pct + '%';
  },

  updateQuick() {
    const pass = this._results.zones.filter(r => r.pass).length, tot = this._results.zones.length;
    const clr = pass === tot ? 'var(--success)' : pass === 0 ? 'var(--danger)' : 'var(--warning)';
    const el = document.getElementById('mvtr-quick-results');
    if (el) el.innerHTML =
      '<div style="color:' + clr + ';font-weight:700;font-size:1.05rem">' +
      (pass === tot ? 'All zones compliant' : pass === 0 ? 'No zones compliant' : pass + '/' + tot + ' zones compliant') +
      '</div><div style="margin-top:.3rem;font-size:.85rem;color:var(--text-light)">See tabs below for detail</div>';
  },

  renderOverview() {
    const zs = this._results.zones;
    const tbody = document.querySelector('#mvtr-tbl-summary tbody');
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
    const tbody = document.querySelector('#mvtr-tbl-detailed tbody');
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

    const pp = document.getElementById('mvtr-params-panel');
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
    const ctx = document.getElementById('mvtr-ch-overview')?.getContext('2d');
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
    const ctx = document.getElementById('mvtr-ch-factors')?.getContext('2d');
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
    const el = document.getElementById('mvtr-factors-sum');
    if (el) el.innerHTML = 'avg F_T = <strong>' + avgArr + '</strong> | avg F_RH = <strong>' + avgRH + '</strong> | Eₐ = ' + this._results.params.Ea + ' kJ/mol';
  },

  renderWVTRChart() {
    this._dc('wvtr');
    const zs = this._results.zones;
    const ctx = document.getElementById('mvtr-ch-wvtr')?.getContext('2d');
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
    const ctx = document.getElementById('mvtr-ch-trh')?.getContext('2d');
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
    const ctx = document.getElementById('mvtr-ch-ttl')?.getContext('2d');
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

  saveScenario() {
    if (!this._results) { alert('Run a calculation first.'); return; }
    this._scenarios.push({ id: Date.now(), name: this._results.params.label, params: this._results.params, zones: this._results.zones, ts: this._results.ts });
    try { localStorage.setItem('mvtr_sce', JSON.stringify(this._scenarios)); } catch(e){}
    this.renderScenariosList();
  },

  renderScenariosList() {
    const compEl = document.getElementById('mvtr-sce-comp-list');
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
    document.getElementById('mvtr-tref').value  = s.params.Tref;
    document.getElementById('mvtr-rhref').value = s.params.RHref;
    document.getElementById('mvtr-ea').value    = s.params.Ea;
    document.getElementById('mvtr-crit').value  = s.params.Mcrit;
    document.getElementById('mvtr-years').value = s.params.shelf_years;
    document.getElementById('mvtr-label').value = s.params.label;
    document.getElementById('mvtr-manual-toggle').checked = true;
    this.toggleManual(true);
    document.getElementById('mvtr-rate-manual').value = s.params.wRef;
    this.updateBanner();
    this.calculate();
  },

  updateScenarioComparison() {
    const bodyEl = document.getElementById('mvtr-sce-body');
    const hdrEl  = document.getElementById('mvtr-sce-hdr');
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
    const ctx = document.getElementById('mvtr-ch-sce')?.getContext('2d');
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

  runSensEA() {
    if (!this._results) return;
    const min = parseFloat(document.getElementById('mvtr-s-ea-min').value) || 20;
    const max = parseFloat(document.getElementById('mvtr-s-ea-max').value) || 65;
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
    const ctx = document.getElementById('mvtr-ch-sea')?.getContext('2d');
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
    const min = parseFloat(document.getElementById('mvtr-s-wvtr-min').value) || 0.1;
    const max = parseFloat(document.getElementById('mvtr-s-wvtr-max').value) || 3.0;
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
    const ctx = document.getElementById('mvtr-ch-swvtr')?.getContext('2d');
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

  switchTab(name, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
    if (event) event.target.classList.add('active');
    const tc = document.getElementById('mvtr-tab-' + name);
    if (tc) tc.classList.add('active');
    if (name === 'sensitivity' && this._results) { setTimeout(() => { this.runSensEA(); this.runSensWVTR(); }, 80); }
    if (name === 'charts' && this._results) { setTimeout(() => Object.values(this._charts).forEach(c => { try { c.resize(); } catch(e){} }), 80); }
  },

  resetForm() {
    if (!confirm('Reset to defaults?')) return;
    document.getElementById('mvtr-tref').value  = 38;
    document.getElementById('mvtr-rhref').value = 90;
    document.getElementById('mvtr-ea').value    = 35;
    document.getElementById('mvtr-crit').value  = 2.0;
    document.getElementById('mvtr-years').value = 2;
    document.getElementById('mvtr-label').value = 'Base Scenario';
    document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('invalid'));
    document.getElementById('mvtr-manual-toggle').checked = false;
    this.toggleManual(false);
    this.updateBanner();
  },

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

  async exportPDF() {
    if (!this._results) { alert('No data to export. Run a calculation first.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('PDF library missing. Reload page.'); return; }
    if (typeof html2canvas === 'undefined') { alert('html2canvas library missing. Reload page.'); return; }

    const btn = document.getElementById('mvtr-btn-pdf');
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

      const chartConfigs = [
        { id:'mvtr-ch-overview', title:'Annual Ingress by Zone',         desc:'Total moisture ingress per ICH zone with compliance limit threshold.' },
        { id:'mvtr-ch-factors',  title:'Correction Factors (F_T, F_RH)', desc:'Arrhenius thermal factor and RH driving force across climatic zones.' },
        { id:'mvtr-ch-wvtr',     title:'WVTR: Reference vs Effective',   desc:'Comparison of measured reference WVTR against zone-corrected effective values.' },
        { id:'mvtr-ch-trh',      title:'Zone Map (Temperature vs RH)',   desc:'ICH climatic zones plotted on temperature-humidity coordinate system.' },
        { id:'mvtr-ch-ttl',      title:'Years to Critical Limit',        desc:'Time until cumulative moisture ingress reaches M_crit per zone.' },
        { id:'mvtr-ch-sce',      title:'Scenario Comparison',            desc:'Total ingress comparison across saved scenarios for all ICH zones.' },
        { id:'mvtr-ch-sea',      title:'Sensitivity: Activation Energy', desc:'Impact of Ea variation on max ingress and zone compliance.' },
        { id:'mvtr-ch-swvtr',    title:'Sensitivity: WVTR',              desc:'Impact of WVTR variation on max ingress and zone compliance.' }
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

      newPage();
      sectionTitle('Important Disclaimer & Model Limitations', C.red);
      [
        { title:'For Research & Development Use Only', body:'This report and the underlying calculations are intended exclusively for internal R&D screening, packaging concept development, and educational purposes.' },
        { title:'Laboratory Validation Required', body:'All predictive model outputs require independent validation through accredited laboratory testing. Relevant standards include: ASTM F1249 / ISO 15106-3 (Water Vapor Transmission), ICH Q1A(R2) (Stability Testing).' },
        { title:'Model Assumptions & Known Limitations', body:'The model assumes: (1) steady-state gas permeation through defect-free films; (2) linear superposition of Arrhenius and RH correction factors; (3) uniform, constant storage conditions; (4) no seal degradation, pinholes, or mechanical damage.' },
        { title:'Regulatory Compliance', body:'This tool does not constitute regulatory advice. Commercial shelf-life declarations must comply with applicable regulations including FDA 21 CFR, EU guidelines, ICH Q1A(R2).' }
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
  console.log('💾 saveCalcResult called with:', result);
  try { 
    localStorage.setItem('mvtr_calc_result', JSON.stringify(result));
    console.log('✅ Saved to localStorage. Key: mvtr_calc_result');
    // Trigger a storage event manually for same-page updates
    window.dispatchEvent(new Event('storage'));
  } catch(e){
    console.error('❌ Error saving to localStorage:', e);
  }
  if (typeof MVTR !== 'undefined') MVTR.refreshCalcPanel();
};

function renderMVTR() {
  return `
<div style="display:grid;grid-template-columns:1fr 350px;gap:1.2rem;align-items:start">
  
  <div class="card" style="padding:0">
    
    <div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">
      <h2 style="margin:0;font-size:1rem;display:flex;align-items:center;gap:0.4rem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        ICH Q1A(R2) MVTR Compliance Engine
      </h2>
    </div>

    <!-- STEP 1 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;color:var(--primary);font-weight:600;font-size:0.85rem">
        ▼ 1. Barrier Rate Source
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.75rem">
        <button id="mvtr-src-btn-calc" class="btn btn-sm" onclick="MVTR.setSource('calc')" 
          style="font-size:0.75rem;background:var(--primary);color:#fff;border:none">From Calculator</button>
        <button id="mvtr-src-btn-db" class="btn btn-sm btn-outline" onclick="MVTR.setSource('db')" 
          style="font-size:0.75rem">From Community DB</button>
        <button id="mvtr-src-btn-co" class="btn btn-sm btn-outline" onclick="MVTR.setSource('co')" 
          style="font-size:0.75rem;opacity:0.5;cursor:not-allowed" disabled>From Company DB 🔒</button>
      </div>

      <div id="mvtr-panel-calc">
        <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:0.6rem;font-size:0.75rem">
          <div style="font-weight:700;margin-bottom:0.15rem" id="mvtr-lam-name">No laminate loaded</div>
          <div style="color:var(--text-light);word-break:break-word;margin-bottom:0.3rem;min-height:1.2em" id="mvtr-lam-struct">Run a calculation in the Calculator tab first.</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>Calculated WVTR:</span>
            <strong style="color:var(--primary)" id="mvtr-lam-rate">—</strong>
          </div>
        </div>
      </div>

      <div id="mvtr-panel-db" style="display:none">
        <div style="margin:0">
          <label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">Select from Community Database</label>
          <select id="mvtr-db-pick" onchange="MVTR.onDBPick(this.value)" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
            <option value="">— Select a validated laminate —</option>
            <optgroup label="Pharmaceutical Grade">
              <option value="0.002|38|90">PET 12µm / Al 9µm / LDPE 60µm — 0.002 g/m²·day</option>
              <option value="0.01|38|90">OPA 15µm / Al 12µm / LLDPE 80µm — 0.010 g/m²·day</option>
              <option value="0.05|38|90">PET 12µm / EVOH 12µm / PP 50µm — 0.050 g/m²·day</option>
            </optgroup>
            <optgroup label="Food Grade">
              <option value="0.5|38|90">OPP 20µm / LDPE 40µm — 0.500 g/m²·day</option>
              <option value="1.0|38|90">PET 12µm / LDPE 60µm — 1.000 g/m²·day</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div id="mvtr-panel-co" style="display:none">
        <div style="font-size:0.75rem;color:var(--text-light);padding:0.4rem 0">
          Join a company to access company laminates.
        </div>
      </div>

      <div style="margin-top:0.8rem;padding-top:0.6rem;border-top:1px dashed var(--border)">
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.75rem;color:var(--text-light)">
          <input type="checkbox" id="mvtr-manual-toggle" onchange="MVTR.toggleManual(this.checked)">
          Override with manual WVTR value
        </label>
      </div>

      <div id="mvtr-panel-manual" style="display:none;margin-top:0.5rem;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:0.6rem">
        <div style="font-size:0.72rem;font-weight:600;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">Manual input</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
          <div style="margin:0">
            <label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">WVTR Value (g/m²/day)</label>
            <input type="number" id="mvtr-rate-manual" value="1.0" step="0.001" oninput="MVTR.onManualChange()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          </div>
          <div style="margin:0">
            <label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">Test Temperature (°C)</label>
            <input type="number" id="mvtr-rate-temp" value="38" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          </div>
          <div style="margin:0;grid-column:1/-1">
            <label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">Test Humidity (%RH)</label>
            <input type="number" id="mvtr-rate-hum" value="90" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          </div>
        </div>
      </div>

      <div style="margin-top:0.8rem;background:var(--primary-light);border-radius:6px;padding:0.5rem 0.75rem;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.75rem;font-weight:600">Active WVTR:</span>
        <strong id="mvtr-active-rate" style="color:var(--primary);font-size:0.9rem">— g/m²/day</strong>
      </div>
    </div>

    <!-- STEP 2 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
        ▼ 2. Thermal Acceleration
      </div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">
        <div style="margin:0" id="mvtr-fg-ea">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Activation Energy Eₐ (kJ/mol)</label>
          <div style="display:flex;gap:0.4rem;align-items:center">
            <input type="number" id="mvtr-ea" value="35" step="1" min="0" max="150" style="flex:1;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          </div>
          <div style="font-size:0.7rem;color:var(--text-light);margin-top:0.25rem">LDPE/PP ≈ 30–40 · EVOH ≈ 50–65 · Al foil ≈ 0</div>
          <div style="font-size:0.7rem;color:var(--danger);margin-top:0.15rem">0–150 kJ/mol</div>
        </div>
      </div>
    </div>

    <!-- STEP 3 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--warning);font-weight:600;font-size:0.85rem">
        ▼ 3. Packaging Dimensions
      </div>
      <div style="margin-bottom:0.5rem">
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.8rem;font-weight:500;margin-bottom:0.25rem">
          <input type="radio" name="mvtr-pkg-mode" value="shape" checked onchange="MVTR.togglePkgMode()">
          Calculate from shape
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.8rem;font-weight:500">
          <input type="radio" name="mvtr-pkg-mode" value="manual" onchange="MVTR.togglePkgMode()">
          Enter area manually
        </label>
      </div>
      
      <div id="mvtr-geom-selector" style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-top:0.5rem">
        <div style="margin:0">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Shape Type</label>
          <select id="mvtr-shape" onchange="MVTR.onShapeChange()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
            <option value="flat">Flat Pouch</option>
            <option value="standup">Stand-Up Pouch</option>
            <option value="flow">Flow Pack</option>
            <option value="box">Rectangular Box</option>
            <option value="cylinder">Cylindrical Jar</option>
            <option value="tray">Tray with Lid</option>
            <option value="bottle">Bottle</option>
            <option value="blister">Blister Pack</option>
          </select>
        </div>
        <div style="margin:0">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Welding Margin (cm)</label>
          <input type="number" id="mvtr-margin" value="1.5" step="0.5" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
        </div>
      </div>
      
      <div id="mvtr-dims-std" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:0.4rem;margin-top:0.4rem">
        <div style="margin:0">
          <label id="mvtr-lbl-w" style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Width L (cm)</label>
          <input type="number" id="mvtr-w" value="12" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
        </div>
        <div style="margin:0">
          <label id="mvtr-lbl-h" style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Height H (cm)</label>
          <input type="number" id="mvtr-h" value="17" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
        </div>
        <div style="margin:0">
          <label id="mvtr-lbl-d" style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Depth / Diameter (cm)</label>
          <input type="number" id="mvtr-d" value="0" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
        </div>
      </div>
      
      <div id="mvtr-dims-bottle" style="display:none;grid-template-columns:repeat(2, 1fr);gap:0.4rem;margin-top:0.4rem">
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Body Radius (cm)</label><input type="number" id="mvtr-bt-br" value="3.5" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Body Height (cm)</label><input type="number" id="mvtr-bt-bh" value="16" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Neck Radius (cm)</label><input type="number" id="mvtr-bt-nr" value="1.2" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Neck Height (cm)</label><input type="number" id="mvtr-bt-nh" value="4" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        <div style="margin:0;grid-column:1/-1"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Shoulder Height (cm)</label><input type="number" id="mvtr-bt-sh" value="2.5" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
      </div>
      
      <div id="mvtr-dims-blister" style="display:none;grid-template-columns:repeat(2, 1fr);gap:0.4rem;margin-top:0.4rem">
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Cavities per strip</label><input type="number" id="mvtr-bl-count" value="10" step="1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        <div style="margin:0"><label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Cavity Area (cm²)</label><input type="number" id="mvtr-bl-area" value="1.5" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
      </div>
      
      <div id="mvtr-manual-area" style="display:none;margin-top:0.5rem">
        <div style="margin:0">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Total Surface Area (m²)</label>
          <input type="number" id="mvtr-area-man" value="0.0408" step="0.001" oninput="MVTR.updateManualArea()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
        </div>
      </div>
      
      <div style="margin-top:0.5rem;display:flex;justify-content:space-between;align-items:center;background:var(--primary-light);padding:0.6rem 0.8rem;border-radius:6px">
        <span style="font-size:0.8rem;font-weight:600">→ Effective Area:</span>
        <strong id="mvtr-area-display" style="color:var(--primary);font-size:0.95rem">0.0408 m²</strong>
      </div>
      <input type="hidden" id="mvtr-area" value="0.0408">
    </div>

    <!-- STEP 4 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--purple);font-weight:600;font-size:0.85rem">
        ▼ 4. Product & Compliance
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div style="margin:0" id="mvtr-fg-crit">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Critical Moisture Gain (mg/package)</label>
          <div style="display:flex;gap:0.4rem;align-items:center">
            <input type="number" id="mvtr-crit" value="2.0" step="0.1" min="0.01" style="flex:1;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
            <span style="font-size:0.85rem;color:var(--text-light);font-weight:600;white-space:nowrap">mg</span>
          </div>
          <div style="font-size:0.7rem;color:var(--text-light);margin-top:0.25rem">Max permissible moisture uptake before product failure.</div>
          <div style="font-size:0.7rem;color:var(--danger);margin-top:0.15rem">Must be > 0</div>
        </div>
        <div style="margin:0" id="mvtr-fg-years">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Target Shelf Life (years)</label>
          <div style="display:flex;gap:0.4rem;align-items:center">
            <input type="number" id="mvtr-years" value="2" step="0.5" min="0.5" max="10" style="flex:1;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
            <span style="font-size:0.85rem;color:var(--text-light);font-weight:600;white-space:nowrap">yr</span>
          </div>
          <div style="font-size:0.7rem;color:var(--danger);margin-top:0.15rem">0.5–10 yr</div>
        </div>
      </div>
      <div style="margin:0;margin-top:0.5rem">
        <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Scenario Label</label>
        <input type="text" id="mvtr-label" value="Base Scenario" placeholder="e.g. Formulation A" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
      </div>
    </div>

    <!-- STEP 5 -->
    <div style="padding:1rem">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
        ▼ 5. Reference Test Conditions
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div style="margin:0" id="mvtr-fg-tref">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Reference Temperature (°C)</label>
          <input type="number" id="mvtr-tref" value="38" step="0.5" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          <div style="font-size:0.7rem;color:var(--danger);margin-top:0.15rem">Valid range: −50 to 100°C</div>
        </div>
        <div style="margin:0" id="mvtr-fg-rhref">
          <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:0.25rem">Reference RH (%)</label>
          <input type="number" id="mvtr-rhref" value="90" step="1" min="0" max="100" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem">
          <div style="font-size:0.7rem;color:var(--danger);margin-top:0.15rem">0–100%</div>
        </div>
      </div>
      
      <button class="btn btn-danger btn-full" onclick="MVTR.calculate()" style="margin-top:1rem;padding:0.8rem;font-size:0.9rem;width:100%">
        ▶ Calculate ICH Compliance
      </button>
      
      <div style="display:flex;gap:0.4rem;margin-top:0.6rem;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="MVTR.resetForm()">Reset</button>
        <button class="btn btn-success btn-sm" onclick="MVTR.saveScenario()">Save Scenario</button>
        <button class="btn btn-outline btn-sm" onclick="MVTR.exportCSV()">CSV</button>
        <button class="btn btn-outline btn-sm" id="mvtr-btn-pdf" onclick="MVTR.exportPDF()">PDF Report</button>
      </div>
    </div>
  </div>

  <!-- RESULTS -->
  <div style="position:sticky;top:1rem;height:fit-content">
    <div class="card" style="margin-bottom:0.9rem">
      <h2 style="margin:0 0 0.75rem 0;font-size:1rem">KPI Dashboard</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div class="kpi blue" id="mvtr-kpi-zones" style="padding:0.6rem;border-radius:6px;background:var(--primary-light)">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.2rem">Compliant ICH Zones</div>
          <div style="font-size:1.1rem;font-weight:700" id="mvtr-kv-zones">—</div>
          <div style="font-size:0.65rem;color:var(--text-light)" id="mvtr-ks-zones">Awaiting calculation</div>
        </div>
        <div class="kpi warning" id="mvtr-kpi-ingress" style="padding:0.6rem;border-radius:6px;background:var(--warning-light)">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.2rem">Max Annual Ingress</div>
          <div style="font-size:1.1rem;font-weight:700" id="mvtr-kv-ingress">—</div>
          <div style="font-size:0.65rem;color:var(--text-light)" id="mvtr-ks-ingress">Most critical zone</div>
        </div>
        <div class="kpi gray" id="mvtr-kpi-safety" style="padding:0.6rem;border-radius:6px;background:var(--bg)">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.2rem">Min Safety Margin</div>
          <div style="font-size:1.1rem;font-weight:700" id="mvtr-kv-safety">—</div>
          <div style="font-size:0.65rem;color:var(--text-light)">vs critical limit</div>
        </div>
        <div class="kpi gray" id="mvtr-kpi-arr" style="padding:0.6rem;border-radius:6px;background:var(--bg)">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.2rem">Avg Arrhenius Factor</div>
          <div style="font-size:1.1rem;font-weight:700" id="mvtr-kv-arr">—</div>
          <div style="font-size:0.65rem;color:var(--text-light)">Thermal acceleration</div>
        </div>
      </div>
      <div style="margin-top:0.85rem">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem">
          <span id="mvtr-kpi-status" style="color:var(--text-light)">Waiting for calculation…</span>
          <span id="mvtr-kpi-pct" style="font-weight:700">—</span>
        </div>
        <div style="width:100%;height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
          <div class="progress-fill blue" id="mvtr-kpi-bar" style="width:0%;height:100%;background:var(--primary);transition:width 0.3s ease"></div>
        </div>
      </div>
    </div>
    <div class="card">
      <h2 style="margin:0 0 0.5rem 0;font-size:1rem">Quick Results</h2>
      <div id="mvtr-quick-results" style="font-size:0.9rem;color:var(--text-light);text-align:center;padding:1rem 0">
        Configure parameters and click <strong>Calculate ICH Compliance</strong>.
      </div>
    </div>
  </div>
</div>

<div id="mvtr-detailed" style="display:none;margin-top:1.2rem">
  <div class="tabs">
    <button class="tab active" onclick="MVTR.switchTab('overview',event)">Overview</button>
    <button class="tab" onclick="MVTR.switchTab('tables',event)">Full Tables</button>
    <button class="tab" onclick="MVTR.switchTab('charts',event)">Charts</button>
    <button class="tab" onclick="MVTR.switchTab('scenarios',event)">Scenarios</button>
    <button class="tab" onclick="MVTR.switchTab('sensitivity',event)">Sensitivity</button>
  </div>

  <div id="mvtr-tab-overview" class="tab-pane active">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Annual Ingress by Zone</h2><div style="height:280px"><canvas id="mvtr-ch-overview"></canvas></div></div>
      <div class="card">
        <h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Correction Factors</h2>
        <div style="height:200px"><canvas id="mvtr-ch-factors"></canvas></div>
        <div id="mvtr-factors-sum" style="margin-top:0.6rem;font-size:0.85rem;color:var(--text-light)"></div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Summary by ICH Zone</h2>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.85rem" id="mvtr-tbl-summary">
        <thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)"><th style="padding:0.6rem;text-align:left">Zone</th><th style="padding:0.6rem;text-align:left">Conditions</th><th style="padding:0.6rem;text-align:left">Eff. WVTR</th><th style="padding:0.6rem;text-align:left">Annual Ingress</th><th style="padding:0.6rem;text-align:left">Total (SL)</th><th style="padding:0.6rem;text-align:left">% Limit</th><th style="padding:0.6rem;text-align:left">Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
  </div>

  <div id="mvtr-tab-tables" class="tab-pane">
    <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Complete Calculation Table</h2>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.8rem" id="mvtr-tbl-detailed">
        <thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)"><th style="padding:0.5rem;text-align:left">Zone</th><th style="padding:0.5rem;text-align:left">T°C</th><th style="padding:0.5rem;text-align:left">RH%</th><th style="padding:0.5rem;text-align:left">WVTR ref</th><th style="padding:0.5rem;text-align:left">F_T</th><th style="padding:0.5rem;text-align:left">F_RH</th><th style="padding:0.5rem;text-align:left">WVTR eff</th><th style="padding:0.5rem;text-align:left">Area m²</th><th style="padding:0.5rem;text-align:left">Daily mg</th><th style="padding:0.5rem;text-align:left">Annual mg</th><th style="padding:0.5rem;text-align:left">Total mg</th><th style="padding:0.5rem;text-align:left">% Limit</th><th style="padding:0.5rem;text-align:left">Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div class="card" style="margin-top:1rem"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Active Parameters</h2><div id="mvtr-params-panel" style="font-size:0.88rem;line-height:1.9;font-family:'Courier New',monospace"></div></div>
  </div>

  <div id="mvtr-tab-charts" class="tab-pane">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">WVTR: Reference vs Effective</h2><div style="height:280px"><canvas id="mvtr-ch-wvtr"></canvas></div></div>
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Zone Map (T vs RH)</h2><div style="height:280px"><canvas id="mvtr-ch-trh"></canvas></div></div>
      <div class="card" style="grid-column:1/-1"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Years to Critical Limit</h2><div style="height:280px"><canvas id="mvtr-ch-ttl"></canvas></div></div>
    </div>
  </div>

  <div id="mvtr-tab-scenarios" class="tab-pane">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card"><div id="mvtr-sce-comp-list"></div></div>
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Comparison Chart</h2><div style="height:280px"><canvas id="mvtr-ch-sce"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:1rem"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Comparison Table</h2>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.85rem" id="mvtr-tbl-sce">
        <thead><tr style="background:var(--bg);border-bottom:2px solid var(--border)" id="mvtr-sce-hdr"><th style="padding:0.6rem;text-align:left">Parameter</th></tr></thead>
        <tbody id="mvtr-sce-body"></tbody>
      </table></div>
    </div>
  </div>

  <div id="mvtr-tab-sensitivity" class="tab-pane">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Sensitivity: Eₐ</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;align-items:end;margin-bottom:0.5rem">
          <div style="margin:0"><label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">Eₐ min (kJ/mol)</label><input type="number" id="mvtr-s-ea-min" value="20" step="5" oninput="MVTR.runSensEA()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
          <div style="margin:0"><label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">Eₐ max (kJ/mol)</label><input type="number" id="mvtr-s-ea-max" value="65" step="5" oninput="MVTR.runSensEA()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        </div>
        <div style="height:280px"><canvas id="mvtr-ch-sea"></canvas></div>
      </div>
      <div class="card"><h2 style="margin:0 0 0.75rem 0;font-size:0.95rem">Sensitivity: WVTR</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;align-items:end;margin-bottom:0.5rem">
          <div style="margin:0"><label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">WVTR min (g/m²/d)</label><input type="number" id="mvtr-s-wvtr-min" value="0.1" step="0.1" oninput="MVTR.runSensWVTR()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
          <div style="margin:0"><label style="font-size:0.75rem;font-weight:600;display:block;margin-bottom:0.25rem">WVTR max (g/m²/d)</label><input type="number" id="mvtr-s-wvtr-max" value="3.0" step="0.1" oninput="MVTR.runSensWVTR()" style="width:100%;padding:0.5rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.85rem"></div>
        </div>
        <div style="height:280px"><canvas id="mvtr-ch-swvtr"></canvas></div>
      </div>
    </div>
  </div>
</div>

<div class="disclaimer" style="margin-top:1.5rem;padding:1rem;background:var(--warning-light);border-left:4px solid var(--warning);border-radius:6px">
  <h3 style="margin:0 0 0.5rem 0;font-size:0.95rem;color:var(--warning)">⚠ Regulatory Disclaimer & Model Limitations</h3>
  <div style="font-size:0.85rem;line-height:1.6;color:var(--text)"><strong>For R&D screening and concept development only.</strong> This tool assists packaging engineers during early material selection. It produces predictive estimates from mathematical models and does not replace regulatory stability testing.</div>
  <div style="font-size:0.85rem;line-height:1.6;color:var(--text);margin-top:0.4rem"><strong>Real-time and accelerated stability studies are mandatory.</strong> Commercial shelf-life claims submitted to FDA, EMA, PMDA, ANVISA, or any national authority must be supported by experimental data from accredited stability chambers, in full compliance with ICH Q1A(R2) and applicable local regulations.</div>
  <div style="font-size:0.85rem;line-height:1.6;color:var(--text);margin-top:0.4rem"><strong>Model assumptions:</strong> (1) Steady-state permeation through a defect-free uniform film. (2) Linear superposition of Arrhenius and RH correction factors. (3) No seal permeation, pinholes, or mechanical damage. (4) Constant storage conditions throughout shelf life. (5) Negligible back-diffusion as internal moisture approaches external humidity. Real systems may deviate significantly from these idealised conditions.</div>
  <div style="font-size:0.85rem;line-height:1.6;color:var(--text);margin-top:0.4rem"><strong>Source data quality determines output reliability.</strong> When using the Calculator source, accuracy depends on the material database entries. When entering values manually, the user is solely responsible for ensuring the measurement was performed under the stated reference conditions per ASTM F1249 or ISO 15106.</div>
</div>

${renderMVTRMethodology()}
`;
}

function renderMVTRMethodology() {
  return `
<div class="methodology-card" style="margin-top:1.5rem;padding:1.2rem;background:#fff;border:1px solid var(--border);border-radius:8px">
  <div>
    <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.2rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem">Mechanics of MVTR Analysis & ICH Q1A(R2) Compliance</h2>
    <div style="font-size:0.9rem; line-height:1.7; color:#334155; font-family:Georgia, 'Times New Roman', serif">
      <p>The Moisture Vapor Transmission Rate (MVTR, also written WVTR) is the steady-state flux of water vapor through a unit area of packaging film under defined conditions of temperature and relative humidity.</p>
      
      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1rem; color:var(--primary-dark); margin-top:1.2rem; font-weight:700">The ICH Climatic Zone Framework</h3>
      <p>The International Council for Harmonisation (ICH) codified the global climatic landscape into zones representing mean kinetic temperature and relative humidity conditions.</p>
      <div style="background:var(--primary-light); padding:0.7rem 0.9rem; border-radius:6px; border-left:3px solid var(--primary); margin:0.8rem 0; font-family:sans-serif; font-size:0.85rem">
        <strong>Zone Definitions (ICH Q1A(R2) / WHO TRS No. 863):</strong><br>
        Zone I (21°C / 45% RH): Temperate<br>
        Zone II (25°C / 60% RH): Subtropical / Mediterranean<br>
        Zone IIIa (40°C / 15% RH): Hot/Dry<br>
        Zone IVa (40°C / 75% RH): Hot/Humid<br>
        Zone IVb (30°C / 75% RH): Hot/Very Humid (ASEAN)<br>
        Accelerated (40°C / 75% RH): ICH stress testing<br>
        Intermediate (30°C / 65% RH): ICH bridging condition
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1rem; color:var(--primary-dark); margin-top:1.2rem; font-weight:700">Arrhenius Temperature Correction</h3>
      <div style="background:#f8fafc; padding:0.9rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:0.8rem 0; color:#0f172a">F_T = exp [ (Eₐ / R) × (1/T_ref − 1/T_target) ]</div>
      
      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1rem; color:var(--primary-dark); margin-top:1.2rem; font-weight:700">Relative Humidity Driving Force</h3>
      <div style="background:#f8fafc; padding:0.9rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:0.8rem 0; color:#0f172a">F_RH = RH_target / RH_ref<br>WVTR_eff = WVTR_ref × F_T × F_RH</div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1rem; color:var(--primary-dark); margin-top:1.2rem; font-weight:700">Cumulative Ingress and Compliance</h3>
      <div style="background:#f8fafc; padding:0.9rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:0.8rem 0; color:#0f172a">Ingress_daily (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000<br>Ingress_total (mg) = Ingress_daily × t_shelf (days)<br>Compliance: Ingress_total ≤ M_crit</div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1rem; color:var(--primary-dark); margin-top:1.2rem; font-weight:700">Alignment with Standards</h3>
      <p style="margin-left:1rem; color:var(--text-light); font-size:0.85rem; font-family:sans-serif">
        • <strong>ASTM F1249-20</strong>: WVTR through plastic film<br>
        • <strong>ISO 15106-3:2003</strong>: Water vapour transmission rate<br>
        • <strong>ICH Q1A(R2) (2003)</strong>: Stability Testing<br>
        • <strong>WHO TRS No. 863 (1996)</strong>: Climatic zone classification
      </p>
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
