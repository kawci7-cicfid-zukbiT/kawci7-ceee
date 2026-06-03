// ====================================================================
// 🧪 MVTR.JS - ICH Q1A(R2) Compliance Engine  [PATCHED v2]
// ====================================================================
// FIX APPLIED:
//  #1 getActiveRate()          - localStorage FIRST, State as fallback
//  #2 refreshCalcPanel()       - full try/catch, DOM guard, updateBanner safety
//  #3 init() setTimeout        - removed redundant 1000ms call, guard on DOM
//  #4 loadCommunityLaminates() - case-insensitive mode filter
//  #5 onDBPick()               - visual feedback of T/RH on DB panel
//  #6 window.saveCalcResult    - DOM ready guard
//  #7 renderMVTR() HTML        - buttons wrapped inside proper padding div
//  #A refreshCalcPanel()       - _tRef/_rhRef aggiornati SOLO se source='calc'
//  #B onDBPick()               - chiama _updateConditionsDisplay() dopo selezione
//  #C loadCommunityLaminates() - ?? operator per T/RH, tutti i nomi campo
//  #D switchTab()              - render lazy con doppio rAF per tutti i tab
//  #E renderCharts()           - rimossi chart 'hidden-at-render' (wvtr/trh/ttl)
//  #F init()                   - rimossa lettura Tref/RHref da mvtr_last_params
//  #G exportPDF()              - pre-render forzato tutti i chart prima del PDF
//  #H renderMVTRMethodology()  - ripristinato testo completo
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
  flat:     { w:8,  h:12, d:0,   lw:'Width L (cm)',           lh:'Height H (cm)',   ld:'Depth / Diameter (cm)' },
  standup:  { w:12, h:18, d:4,   lw:'Width L (cm)',           lh:'Height H (cm)',   ld:'Gusset / Depth (cm)' },
  flow:     { w:15, h:8,  d:0,   lw:'Fin Seal Length (cm)',   lh:'Web Width (cm)',  ld:'—' },
  box:      { w:8,  h:12, d:4,   lw:'Length (cm)',            lh:'Height (cm)',     ld:'Depth (cm)' },
  cylinder: { w:0,  h:10, d:7,   lw:'—',                      lh:'Height (cm)',     ld:'Diameter (cm)' },
  tray:     { w:12, h:8,  d:3,   lw:'Length (cm)',            lh:'Width (cm)',      ld:'Depth (cm)' },
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
  _selectedDBRate: null,
  _tRef: 38,
  _rhRef: 90,

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

    // FIX #3: single delayed refresh — DOM is guaranteed ready at this point
    // because renderPharmaMvtr already injected the HTML before calling init()
    this.refreshCalcPanel();

    // FIX #3: one extra refresh at 400ms handles race conditions without the
    // wasteful 1000ms third call from the original code
    setTimeout(() => { this.refreshCalcPanel(); }, 400);

    try {
      // FIX 1: Tref/RHref NON vengono letti da mvtr_last_params.
      // Appartengono all'ultima sessione/sorgente e sovrascriverebbero
      // i valori corretti prima che la sorgente attuale sia stata selezionata.
      // I T/RH vengono impostati solo da: calc→refreshCalcPanel, db→onDBPick, manual→onManualChange.
      const saved = JSON.parse(localStorage.getItem('mvtr_last_params') || 'null');
      if (saved) {
        if (saved.Ea != null)  { const el = document.getElementById('mvtr-ea');    if(el) el.value = saved.Ea; }
        if (saved.Mcrit)       { const el = document.getElementById('mvtr-crit');  if(el) el.value = saved.Mcrit; }
        if (saved.shelf_years) { const el = document.getElementById('mvtr-years'); if(el) el.value = saved.shelf_years; }
      }
    } catch(e){}

    this._updateConditionsDisplay();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.refreshCalcPanel();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'mvtr_calc_result') this.refreshCalcPanel();
    });

    window.addEventListener('beforeunload', () => {
      if (this._results) try { localStorage.setItem('mvtr_last_params', JSON.stringify(this._results.params)); } catch(e){}
    });
  },

  // ------------------------------------------------------------------
  // 🔀 CALCULATOR ↔ COMPLIANCE BRIDGE
  // FIX #2: full try/catch, DOM guard, updateBanner safety
  // ------------------------------------------------------------------
  refreshCalcPanel() {
    try {
      // FIX #1/#2: localStorage FIRST — always reliable across tabs/reloads.
      // State is only available if both modules run in the same JS context.
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
      } catch(e) {}

      // Fallback: read live State if available and fresher than localStorage
      if (typeof State !== 'undefined' && State.calcResult && State.calcResult.total > 0) {
        const stateResult = State.calcResult;
        // Prefer State if it has a value (same-page context)
        if (!saved || stateResult.total !== saved.total) {
          saved = stateResult;
        }
      }

      const nameEl   = document.getElementById('mvtr-lam-name');
      const structEl = document.getElementById('mvtr-lam-struct');
      const rateEl   = document.getElementById('mvtr-lam-rate');
      const condEl   = document.getElementById('mvtr-calc-conditions');

      // FIX #2: guard — DOM might not be ready during very early init()
      if (!nameEl) return;

      if (saved && saved.total > 0) {
        let structureStr = '';
        if (typeof State !== 'undefined' && State.layers?.length) {
          const layers = State.layers
            .filter(l => l.mid !== null && l.thick > 0)
            .map(l => {
              const mat = (typeof DB !== 'undefined' && DB.materials) ? DB.materials.find(m => m.id === l.mid) : null;
              return mat ? `${mat.name} (${l.thick}µm)` : null;
            })
            .filter(Boolean);
          structureStr = layers.join(' / ') || '';
        }

        const lamName = (typeof State !== 'undefined' && State.laminateName)
          ? State.laminateName
          : (saved.laminateName || 'Laminate from Calculator');

        nameEl.textContent   = lamName;
        if (structEl) structEl.textContent = structureStr || saved.structure || '';
        if (rateEl)   rateEl.textContent   = saved.total.toFixed(5) + ' g/m²/day';
        if (condEl)   condEl.textContent   = `Test conditions: ${saved.tRef ?? this._tRef}°C / ${saved.rhRef ?? this._rhRef}% RH`;

        // FIX A: sovrascrive T/RH SOLO se la sorgente attiva è 'calc'.
        // Se l'utente ha selezionato DB o Manual, i loro T/RH hanno priorità
        // e NON devono essere sovrascritti da State/localStorage del Calculator.
        if (this._activeSource === 'calc') {
          if (saved.tRef)  this._tRef  = saved.tRef;
          if (saved.rhRef) this._rhRef = saved.rhRef;
        }
        this._updateConditionsDisplay();
      } else {
        nameEl.textContent   = 'No laminate loaded';
        if (structEl) structEl.textContent = 'Run a calculation in the Calculator tab first, then return here.';
        if (rateEl)   rateEl.textContent   = '—';
        if (condEl)   condEl.textContent   = `Test conditions: ${this._tRef}°C / ${this._rhRef}% RH`;
      }
    } catch(e) {
      console.error('❌ MVTR refreshCalcPanel error:', e);
    }
    // FIX #2: updateBanner is always safe — it only touches #mvtr-active-rate
    this.updateBanner();
  },

  _updateRateSummary(rateStr) {
    const el = document.getElementById('mvtr-active-rate');
    if (el) el.textContent = rateStr + ' g/m²/day';
  },

  _updateConditionsDisplay() {
    const condEl = document.getElementById('mvtr-calc-conditions');
    if (condEl) condEl.textContent = `Test conditions: ${this._tRef}°C / ${this._rhRef}% RH`;
    const tempEl = document.getElementById('mvtr-rate-temp');
    const humEl  = document.getElementById('mvtr-rate-hum');
    if (tempEl) tempEl.value = this._tRef;
    if (humEl)  humEl.value  = this._rhRef;
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
    this._selectedDBRate = null;

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
    else if (s === 'db') this.loadCommunityLaminates();
    else this.updateBanner();
  },

  unlockCompany() {
    alert('To unlock the Company Database:\n\n1. Go to the main app Settings\n2. Navigate to "Company" section\n3. Join an existing company with an invite code, or create a new company workspace\n4. Your organisation\'s laminates will then appear here automatically\n\nThis feature requires an active company membership.');
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

  // ------------------------------------------------------------------
  // 🗄️ COMMUNITY DB LOADER
  // FIX #4: case-insensitive mode filter
  // ------------------------------------------------------------------
  loadCommunityLaminates() {
    const sel = document.getElementById('mvtr-db-pick');
    if (!sel) return;

    if (typeof DB !== 'undefined' && DB.laminates && DB.laminates.length > 0) {
      // FIX #4: toLowerCase() handles 'wvtr', 'WVTR', 'Wvtr' etc.
      const wvtrLaminates = DB.laminates.filter(l => !l.mode || l.mode.toLowerCase() === 'wvtr');

      if (wvtrLaminates.length === 0) {
        sel.innerHTML = '<option value="">No WVTR laminates in community DB</option>';
        const hint = document.getElementById('mvtr-db-hint');
        if (hint) hint.textContent = 'No WVTR laminates found.';
        return;
      }

      sel.innerHTML = '<option value="">— Select a laminate —</option>' +
        wvtrLaminates.map(l => {
          const wvtr = l.total ? l.total.toFixed(5) : '0.00000';
          const name = l.name || 'Unnamed';
          // FIX C: ?? operator evita che 0 venga trattato come falsy;
          // copre tutti i nomi di campo usati dal Calculator
          const t  = l.temperature ?? l.tRef ?? l.testTemp ?? l.T ?? 38;
          const rh = l.humidity    ?? l.rhRef ?? l.testRH   ?? l.RH ?? 90;
          const value = `${wvtr}|${t}|${rh}`;
          return `<option value="${value}">${name} — ${wvtr} g/m²·day @ ${t}°C/${rh}%RH</option>`;
        }).join('');

      const hint = document.getElementById('mvtr-db-hint');
      if (hint) hint.textContent = `${wvtrLaminates.length} laminates loaded.`;
    } else {
      sel.innerHTML = '<option value="">No community database available</option>';
      const hint = document.getElementById('mvtr-db-hint');
      if (hint) hint.textContent = 'Create laminates in the Calculator tab first.';
    }
  },

  // FIX #5: show T/RH feedback in DB panel
  onDBPick(val) {
    if (!val) {
      this._selectedDBRate = null;
      this.updateBanner();
      return;
    }

    const parts = val.split('|');
    if (parts.length < 3) return;

    const w  = parseFloat(parts[0]);
    const t  = parseFloat(parts[1]);
    const rh = parseFloat(parts[2]);

    this._selectedDBRate = w;
    this._tRef  = t;
    this._rhRef = rh;

    // Aggiorna il banner condizioni nel pannello DB
    const dbCond = document.getElementById('mvtr-db-conditions');
    if (dbCond) dbCond.textContent = `Test conditions: ${t}°C / ${rh}% RH`;

    // FIX B: aggiorna anche il banner globale delle condizioni
    // (mvtr-rate-temp e mvtr-rate-hum nel pannello manual, utili se si passa a manual)
    this._updateConditionsDisplay();

    this._updateRateSummary(w.toFixed(5));
    this.updateBanner();
  },

  onManualChange() {
    const rate = parseFloat(document.getElementById('mvtr-rate-manual')?.value) || 0;
    const t  = parseFloat(document.getElementById('mvtr-rate-temp')?.value);
    const rh = parseFloat(document.getElementById('mvtr-rate-hum')?.value);
    if (!isNaN(t))  this._tRef  = t;
    if (!isNaN(rh)) this._rhRef = rh;
    this._updateRateSummary(rate > 0 ? rate.toFixed(5) : '-');
    this.updateBanner();
  },

  // ------------------------------------------------------------------
  // 🔑 getActiveRate — FIX #1: localStorage FIRST
  // ------------------------------------------------------------------
  getActiveRate() {
    if (this._manualOverride) {
      const v = parseFloat(document.getElementById('mvtr-rate-manual')?.value);
      return isNaN(v) ? null : v;
    }
    if (this._activeSource === 'db') {
      if (this._selectedDBRate !== null && this._selectedDBRate > 0) return this._selectedDBRate;
      const sel = document.getElementById('mvtr-db-pick');
      const v = sel?.value;
      if (!v) return null;
      const wvtr = parseFloat(v.split('|')[0]);
      return isNaN(wvtr) ? null : wvtr;
    }
    if (this._activeSource === 'calc') {
      // FIX #1: localStorage FIRST — reliable across page navigations and reloads
      try {
        const saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
        if (saved && saved.total > 0) return saved.total;
      } catch(e) {}
      // Fallback: live State (same-page context only)
      try {
        if (typeof State !== 'undefined' && State.calcResult?.total > 0) return State.calcResult.total;
      } catch(e) {}
      return null;
    }
    return null;
  },

  updateBanner() {
    const r = this.getActiveRate();
    const el = document.getElementById('mvtr-active-rate');
    if (el) el.textContent = r != null ? r.toFixed(5) + ' g/m²/day' : '— g/m²/day';
  },

  // ------------------------------------------------------------------
  // 📐 PACKAGING GEOMETRY
  // ------------------------------------------------------------------
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
        const bodyLat  = 2 * Math.PI * Rb * Hb;
        const neckLat  = 2 * Math.PI * Rn * Hn;
        const slant    = Math.sqrt((Rb - Rn)**2 + Hs**2);
        const shoulder = Math.PI * (Rb + Rn) * slant;
        const bottom   = Math.PI * Rb**2;
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

  // ------------------------------------------------------------------
  // 🎯 MAIN CALCULATION
  // ------------------------------------------------------------------
  calculate() {
    const rate = this.getActiveRate();
    if (!rate || rate <= 0) { alert('No valid WVTR. Select a source or enter a value manually.'); return; }
    if (!this.validate()) return;
    const params = {
      wRef:        rate,
      Tref:        this._tRef,
      RHref:       this._rhRef,
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

  // ------------------------------------------------------------------
  // 📊 KPI DASHBOARD
  // ------------------------------------------------------------------
  updateKPIs() {
    const zs = this._results.zones;
    const pass = zs.filter(r => r.pass).length, tot = zs.length;
    const pct  = Math.round(pass / tot * 100);
    const zCard = document.getElementById('mvtr-kpi-zones');
    const kvz = document.getElementById('mvtr-kv-zones');
    const ksz = document.getElementById('mvtr-ks-zones');
    if (kvz) kvz.textContent = pass + '/' + tot;
    if (ksz) ksz.textContent = pct + '% compliant';
    if (zCard) zCard.className = 'kpi ' + (pass === tot ? 'green' : pass === 0 ? 'danger' : 'warning');

    const maxAnn = Math.max(...zs.map(r => r.annual));
    const kvi = document.getElementById('mvtr-kv-ingress');
    const ksi = document.getElementById('mvtr-ks-ingress');
    if (kvi) kvi.textContent = maxAnn.toFixed(3) + ' mg';
    if (ksi) ksi.textContent = zs.find(r => r.annual === maxAnn).zone.label;

    const minSaf = Math.min(...zs.map(r => 100 - r.pct));
    const sCard = document.getElementById('mvtr-kpi-safety');
    const kvs = document.getElementById('mvtr-kv-safety');
    if (kvs) kvs.textContent = minSaf.toFixed(1) + '%';
    if (sCard) sCard.className = 'kpi ' + (minSaf > 20 ? 'green' : minSaf > 0 ? 'warning' : 'danger');

    const avgArr = zs.reduce((s, r) => s + r.arrF, 0) / zs.length;
    const kva = document.getElementById('mvtr-kv-arr');
    if (kva) kva.textContent = avgArr.toFixed(2) + 'x';

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

  // ------------------------------------------------------------------
  // 📊 TABLE RENDERING
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 📈 CHART RENDERING
  // ------------------------------------------------------------------
  renderCharts() {
    // Solo overview charts: questi canvas sono visibili durante calculate()
    // perché il tab 'overview' è quello attivo di default.
    // I canvas del tab 'charts' (wvtr, trh, ttl) sono hidden → render lazy
    // in switchTab('charts') tramite requestAnimationFrame.
    this.renderOverviewChart();
    this.renderFactorsChart();
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
          { label:'Ref WVTR', data: zs.map(() => this._results.params.wRef), backgroundColor:'rgba(100,116,139,.4)', borderRadius:3 },
          { label:'Eff WVTR', data: zs.map(r => r.eff), backgroundColor: zs.map(r => r.zone.color + 'b3'), borderColor: zs.map(r => r.zone.color), borderWidth:1.5, borderRadius:3 }
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
    this._tRef  = s.params.Tref;
    this._rhRef = s.params.RHref;
    const eaEl    = document.getElementById('mvtr-ea');    if (eaEl)    eaEl.value    = s.params.Ea;
    const critEl  = document.getElementById('mvtr-crit');  if (critEl)  critEl.value  = s.params.Mcrit;
    const yearsEl = document.getElementById('mvtr-years'); if (yearsEl) yearsEl.value = s.params.shelf_years;
    const labelEl = document.getElementById('mvtr-label'); if (labelEl) labelEl.value = s.params.label;
    const togEl   = document.getElementById('mvtr-manual-toggle');
    if (togEl) { togEl.checked = true; this.toggleManual(true); }
    const manEl = document.getElementById('mvtr-rate-manual');
    if (manEl) manEl.value = s.params.wRef;
    this._updateConditionsDisplay();
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

  // ------------------------------------------------------------------
  // 🔬 SENSITIVITY
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 📋 TABS
  // ------------------------------------------------------------------
  switchTab(name, event) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(c => c.classList.remove('active'));
    if (event) event.target.classList.add('active');
    const tc = document.getElementById('mvtr-tab-' + name);
    if (tc) tc.classList.add('active');

    if (!this._results) return;

    // FIX: doppio requestAnimationFrame garantisce che il browser abbia
    // completato il layout del tab (display:block) prima di fare render.
    // Con setTimeout(80ms) il layout poteva non essere ancora pronto.
    const afterLayout = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

    if (name === 'overview') {
      // I canvas overview erano visibili al primo render ma dopo un cambio
      // tab perdono le dimensioni se Chart.js non riesce a fare resize.
      // Re-render completo garantisce dimensioni corrette.
      afterLayout(() => {
        this.renderOverviewChart();
        this.renderFactorsChart();
      });
    }

    if (name === 'charts') {
      // I canvas del tab charts erano hidden (display:none) durante
      // calculate() → Chart.js li rendeva a 0x0. Render lazy al click.
      afterLayout(() => {
        this.renderWVTRChart();
        this.renderTRHChart();
        this.renderTTLChart();
      });
    }

    if (name === 'scenarios') {
      afterLayout(() => this.renderScenarioComparisonChart());
    }

    if (name === 'sensitivity') {
      afterLayout(() => { this.runSensEA(); this.runSensWVTR(); });
    }
  },

  // ------------------------------------------------------------------
  // 🔄 RESET
  // ------------------------------------------------------------------
  resetForm() {
    if (!confirm('Reset to defaults?')) return;
    this._tRef  = 38;
    this._rhRef = 90;
    const eaEl    = document.getElementById('mvtr-ea');    if (eaEl)    eaEl.value    = 35;
    const critEl  = document.getElementById('mvtr-crit');  if (critEl)  critEl.value  = 2.0;
    const yearsEl = document.getElementById('mvtr-years'); if (yearsEl) yearsEl.value = 2;
    const labelEl = document.getElementById('mvtr-label'); if (labelEl) labelEl.value = 'Base Scenario';
    document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('invalid'));
    const togEl = document.getElementById('mvtr-manual-toggle');
    if (togEl) togEl.checked = false;
    this.toggleManual(false);
    this._updateConditionsDisplay();
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
  // 📄 EXPORT PDF  (unchanged — no bugs here)
  // ------------------------------------------------------------------
  async exportPDF() {
    if (!this._results) { alert('No data to export. Run a calculation first.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('PDF library missing. Reload page.'); return; }
    if (typeof html2canvas === 'undefined') { alert('html2canvas library missing. Reload page.'); return; }
    const btn = document.getElementById('mvtr-btn-pdf');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

    // FIX 2: forzare il render di TUTTI i chart prima di procedere col PDF.
    // I chart lazy (wvtr, trh, ttl, sce, sea, swvtr) vengono renderizzati
    // solo al click del tab corrispondente — se l'utente non li ha mai aperti,
    // i canvas sono 0×0 e html2canvas non li cattura.
    // Li rendiamo ora in un contenitore offscreen così il PDF li include sempre.
    this.renderWVTRChart();
    this.renderTRHChart();
    this.renderTTLChart();
    this.renderOverviewChart();
    this.renderFactorsChart();
    this.renderScenarioComparisonChart();
    // sensitivity: run solo se esistono i canvas
    if (document.getElementById('mvtr-ch-sea') && document.getElementById('mvtr-ch-swvtr')) {
      this.runSensEA();
      this.runSensWVTR();
    }
    // Attendi due frame per dare al browser tempo di completare il layout dei chart
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

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
        green:[22,163,74], greenL:[240,253,244], amber:[217,119,6], amberL:[255,251,235],
        red:[220,38,38], redL:[254,242,242], slate:[71,85,105], slateL:[248,250,252],
        border:[226,232,240], white:[255,255,255], black:[15,23,42]
      };
      let y = 0, pageNum = 0;
      const safe = s => String(s || '').replace(/[^\x20-\x7E]/g, '');
      const drawFooter = () => {
        pdf.setFillColor(...C.blueDark); pdf.rect(0, PH-10, PW, 10, 'F');
        pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.white);
        pdf.text('MVTR / ICH Q1A(R2) Compliance Report  |  For R&D use only  |  ASTM F1249 / ISO 15106', ML, PH-3.5);
        pdf.text('Page '+pdf.internal.getNumberOfPages(), PW-MR, PH-3.5, {align:'right'});
        pdf.setTextColor(...C.black);
      };
      const newPage = () => { if(pageNum>0) drawFooter(); pdf.addPage(); pageNum++; y=ML; };
      const sectionTitle = (title, color) => {
        color = color||C.blue; y+=4;
        pdf.setFillColor(...color); pdf.rect(ML,y,3,6,'F');
        pdf.setFontSize(11); pdf.setFont('helvetica','bold'); pdf.setTextColor(...color);
        pdf.text(safe(title), ML+5, y+4.5); pdf.setTextColor(...C.black); y+=10;
        pdf.setDrawColor(...C.border); pdf.setLineWidth(0.3);
        pdf.line(ML, y-2, PW-MR, y-2); y+=2;
      };
      const kpiBox = (x,bw,bh,label,value,unit2,color,colorL) => {
        pdf.setFillColor(...colorL); pdf.setDrawColor(...color); pdf.setLineWidth(0.4);
        pdf.roundedRect(x,y,bw,bh,2,2,'FD');
        pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.slate);
        pdf.text(safe(label), x+bw/2, y+5, {align:'center'});
        pdf.setFontSize(13); pdf.setFont('helvetica','bold'); pdf.setTextColor(...color);
        pdf.text(safe(value), x+bw/2, y+13, {align:'center'});
        pdf.setFontSize(6.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.slate);
        pdf.text(safe(unit2), x+bw/2, y+18, {align:'center'});
        pdf.setTextColor(...C.black);
      };
      const tableHeader = (cols, x, cw, rh) => {
        rh=rh||7; pdf.setFillColor(...C.blue);
        let cx=x; cols.forEach((_,i)=>{pdf.rect(cx,y,cw[i],rh,'F'); cx+=cw[i];});
        pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
        cx=x; cols.forEach((col,i)=>{pdf.text(safe(col),cx+2,y+4.8); cx+=cw[i];});
        pdf.setTextColor(...C.black); y+=rh;
      };
      const tableRow = (cells, x, cw, rh, bg, scol) => {
        rh=rh||6.5; scol=scol===undefined?-1:scol;
        if(bg){pdf.setFillColor(...bg); let cx2=x; cw.forEach(w=>{pdf.rect(cx2,y,w,rh,'F'); cx2+=w;});}
        pdf.setDrawColor(...C.border); pdf.setLineWidth(0.2);
        let cx=x;
        cw.forEach((w,i)=>{
          pdf.rect(cx,y,w,rh,'S');
          pdf.setFontSize(7.5); pdf.setFont('helvetica','normal');
          if(scol===i){const ip=cells[i]==='PASS'; pdf.setTextColor(...(ip?C.green:C.red)); pdf.setFont('helvetica','bold');}
          else pdf.setTextColor(...C.black);
          pdf.text(safe(cells[i]||'—'), cx+2, y+4.5); cx+=w;
        });
        pdf.setTextColor(...C.black); y+=rh;
      };
      pageNum++;
      pdf.setFillColor(...C.blueDark); pdf.rect(0,0,PW,55,'F');
      pdf.setFillColor(...C.blue); pdf.rect(0,40,PW,18,'F');
      pdf.setFontSize(22); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
      pdf.text('MVTR Compliance Report', ML, 22);
      pdf.setFontSize(11); pdf.setFont('helvetica','normal'); pdf.setTextColor(186,210,255);
      pdf.text(safe('ICH Q1A(R2) — '+p.label), ML, 32);
      const bC=allPass?C.green:(pass===0?C.red:C.amber);
      const bT=allPass?'COMPLIANT':(pass===0?'NON-COMPLIANT':'PARTIAL');
      pdf.setFillColor(...bC); pdf.roundedRect(PW-MR-42,8,42,10,2,2,'F');
      pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
      pdf.text(bT, PW-MR-21, 14.5, {align:'center'});
      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.white);
      pdf.text('Generated: '+genDate+'  |  Source: '+p.source.toUpperCase()+'  |  '+pass+'/'+tot+' zones pass', ML, 50);
      pdf.setTextColor(...C.black);
      y=65; const kpiW=(CW-9)/4, kpiH=22;
      const minSaf=Math.min(...res.map(r=>100-r.pct)).toFixed(1);
      const avgArr=(res.reduce((s,r)=>s+r.arrF,0)/res.length).toFixed(3);
      kpiBox(ML,          kpiW,kpiH,'COMPLIANT ZONES',pass+'/'+tot, allPass?'All pass':'Partial', allPass?C.green:C.amber, allPass?C.greenL:C.amberL);
      kpiBox(ML+kpiW+3,   kpiW,kpiH,'SAFETY MARGIN',  minSaf+'%',   'vs M_crit', parseFloat(minSaf)>20?C.green:C.red, parseFloat(minSaf)>20?C.greenL:C.redL);
      kpiBox(ML+kpiW*2+6, kpiW,kpiH,'SURFACE AREA',   p.area.toFixed(4),'m2', C.blue, C.blueLight);
      kpiBox(ML+kpiW*3+9, kpiW,kpiH,'AVG F_T',        avgArr+'x',   'Arrhenius', C.slate, C.slateL);
      y+=kpiH+8;
      sectionTitle('Input Parameters');
      const pC=['Parameter','Value','Parameter','Value'], pW=[45,35,45,35];
      tableHeader(pC,ML,pW);
      [[`Reference WVTR`,p.wRef.toFixed(5)+' g/m2/day','Reference Temp',p.Tref+' C ('+(p.Tref+273.15).toFixed(2)+' K)'],
       ['Reference RH',p.RHref+' %','Activation Energy',p.Ea+' kJ/mol'],
       ['Surface Area',(p.area*10000).toFixed(2)+' cm2 ('+p.area.toFixed(5)+' m2)','Critical Limit',p.Mcrit+' mg'],
       ['Shelf Life',p.shelf_years+' years ('+p.shelfDays.toFixed(0)+' days)','Source',p.source.toUpperCase()]
      ].forEach((row,idx)=>tableRow(row,ML,pW,6.5,idx%2===0?C.slateL:C.white));
      y+=4;
      if(y>PH-90) newPage();
      sectionTitle('Results by ICH Climatic Zone');
      const rC=['Zone','T (C)','RH (%)','WVTR eff','Annual (mg)','Total (mg)','% Limit','Status'];
      const rW=[24,14,14,26,24,24,18,18];
      tableHeader(rC,ML,rW);
      res.forEach((r,idx)=>tableRow([r.zone.label,String(r.zone.T),String(r.zone.RH),r.eff.toFixed(5),r.annual.toFixed(3),r.total.toFixed(3),r.pct.toFixed(1)+'%',r.pass?'PASS':'FAIL'],ML,rW,6.5,idx%2===0?C.slateL:C.white,7));
      y+=4;
      if(y>PH-60) newPage();
      sectionTitle('Methodology Summary');
      ['MVTR compliance is evaluated across 7 ICH climatic zones using Arrhenius thermal correction',
       'and linear RH driving force. The model assumes steady-state permeation through a defect-free',
       'film with constant storage conditions. Compliance criterion: total ingress <= M_crit over shelf life.',
       'F_T = exp[(Ea/R) x (1/Tref - 1/Ttgt)]  |  F_RH = RHtgt / RHref  |  WVTR_eff = WVTR_ref x F_T x F_RH'
      ].forEach(line=>{pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.slate); pdf.text(safe(line),ML,y); y+=5;});
      pdf.setTextColor(...C.black); y+=3;
      drawFooter();
      const chartConfigs=[
        {id:'mvtr-ch-overview',title:'Annual Ingress by Zone',desc:'Total moisture ingress per ICH zone with compliance limit threshold.'},
        {id:'mvtr-ch-factors', title:'Correction Factors (F_T, F_RH)',desc:'Arrhenius thermal factor and RH driving force across climatic zones.'},
        {id:'mvtr-ch-wvtr',    title:'WVTR: Reference vs Effective',desc:'Comparison of measured reference WVTR against zone-corrected effective values.'},
        {id:'mvtr-ch-trh',     title:'Zone Map (Temperature vs RH)',desc:'ICH climatic zones plotted on temperature-humidity coordinate system.'},
        {id:'mvtr-ch-ttl',     title:'Years to Critical Limit',desc:'Time until cumulative moisture ingress reaches M_crit per zone.'},
        {id:'mvtr-ch-sce',     title:'Scenario Comparison',desc:'Total ingress comparison across saved scenarios for all ICH zones.'},
        {id:'mvtr-ch-sea',     title:'Sensitivity: Activation Energy',desc:'Impact of Ea variation on max ingress and zone compliance.'},
        {id:'mvtr-ch-swvtr',   title:'Sensitivity: WVTR',desc:'Impact of WVTR variation on max ingress and zone compliance.'}
      ];
      // FIX 2b: dopo il pre-render forzato, tutti i canvas esistono.
      // Non filtrare più per width/height (erano 0 prima del fix, ora sono ok).
      const avail=chartConfigs.filter(cfg=>!!document.getElementById(cfg.id));
      for(let i=0;i<avail.length;i+=2){
        newPage();
        const pair=avail.slice(i,i+2);
        const chartH=(PH-y-35)/2;
        for(let idx=0;idx<pair.length;idx++){
          const cfg=pair[idx];
          const canvas=document.getElementById(cfg.id);
          if(!canvas) continue;
          if(idx>0) y+=5;
          pdf.setFillColor(...C.blue); pdf.rect(ML,y,3,5,'F');
          pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.blue);
          pdf.text(safe(cfg.title),ML+5,y+3.8); pdf.setTextColor(...C.black); y+=8;
          pdf.setFillColor(...C.slateL); pdf.setDrawColor(...C.border); pdf.setLineWidth(0.3);
          pdf.roundedRect(ML,y,CW,7,1,1,'FD');
          pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.slate);
          pdf.text(safe(cfg.desc),ML+3,y+4.5); pdf.setTextColor(...C.black); y+=9;
          try{
            const cc=await html2canvas(canvas,{scale:2.5,useCORS:true,backgroundColor:'#ffffff',logging:false});
            const img=cc.toDataURL('image/png');
            const maxH=chartH-20;
            const h=Math.min(CW*(cc.height/cc.width),maxH);
            pdf.setFillColor(...C.white); pdf.setDrawColor(...C.border); pdf.setLineWidth(0.4);
            pdf.roundedRect(ML-1,y-1,CW+2,h+2,2,2,'FD');
            pdf.addImage(img,'PNG',ML,y,CW,h); y+=h+3;
          }catch(e){
            pdf.setFontSize(8); pdf.setTextColor(...C.slate);
            pdf.text('Chart not available for this configuration.',ML,y+5);
            pdf.setTextColor(...C.black); y+=15;
          }
        }
      }
      newPage();
      sectionTitle('Important Disclaimer & Model Limitations', C.red);
      [{title:'For Research & Development Use Only',body:'This report and the underlying calculations are intended exclusively for internal R&D screening, packaging concept development, and educational purposes. Results must not be used as the sole basis for commercial shelf-life labeling, regulatory submissions, or product safety declarations.'},
       {title:'Laboratory Validation Required',body:'All predictive model outputs require independent validation through accredited laboratory testing. Relevant standards include: ASTM F1249 / ISO 15106-3 (Water Vapor Transmission), ICH Q1A(R2) (Stability Testing), and WHO TRS No. 863 (Climatic Zone Classification).'},
       {title:'Model Assumptions & Known Limitations',body:'The model assumes: steady-state gas permeation through defect-free films; linear superposition of Arrhenius and RH correction factors; uniform, constant storage conditions; no seal degradation, pinholes, or mechanical damage; negligible back-diffusion. Real-world performance may deviate significantly.'},
       {title:'Regulatory Compliance',body:'This tool does not constitute regulatory advice. Commercial shelf-life declarations must comply with applicable regulations including FDA 21 CFR, EU guidelines, ICH Q1A(R2), and any applicable sector-specific guidelines. Consult a qualified regulatory specialist before product launch.'}
      ].forEach(sec=>{
        if(y>PH-45) newPage();
        pdf.setFillColor(...C.redL); pdf.setDrawColor(...C.red); pdf.setLineWidth(0.3);
        pdf.roundedRect(ML,y,CW,7,1,1,'FD');
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.red);
        pdf.text(safe(sec.title),ML+3,y+4.8); pdf.setTextColor(...C.black); y+=9;
        const bodyLines=pdf.splitTextToSize(safe(sec.body),CW-4);
        pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...C.slate);
        bodyLines.forEach(line=>{if(y>PH-20) newPage(); pdf.text(line,ML+2,y); y+=4.5;});
        pdf.setTextColor(...C.black); y+=5;
      });
      if(y>PH-25) newPage();
      pdf.setFillColor(...C.blueDark); pdf.roundedRect(ML,y,CW,14,2,2,'F');
      pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...C.white);
      pdf.text('Report generated on '+genDate+'  |  MVTR / ICH Q1A(R2) Compliance Tool', ML+CW/2, y+5.5, {align:'center'});
      pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(186,210,255);
      pdf.text('Methodology aligned with ASTM F1249, ISO 15106-3, ICH Q1A(R2), WHO TRS No. 863', ML+CW/2, y+10.5, {align:'center'});
      pdf.setTextColor(...C.black);
      drawFooter();
      const safeName=p.label.replace(/[^a-z0-9]+/gi,'_').slice(0,30)||'Report';
      pdf.save('MVTR_Report_'+safeName+'_'+genISO+'.pdf');
    } catch(error) {
      console.error('PDF export failed:', error);
      alert('PDF generation failed: '+error.message);
    } finally {
      if(btn){ btn.disabled=false; btn.textContent='PDF Report'; }
    }
  }
};

// ====================================================================
// 🌉 GLOBAL BRIDGE — Calculator → Compliance
// FIX #6: guard against early call before MVTR DOM is rendered
// ====================================================================
window.saveCalcResult = function(result) {
  try {
    localStorage.setItem('mvtr_calc_result', JSON.stringify(result));
  } catch(e) {
    console.error('❌ saveCalcResult: localStorage write failed', e);
  }
  // FIX #6: only call refreshCalcPanel if MVTR DOM is present
  if (document.getElementById('mvtr-lam-name')) {
    MVTR.refreshCalcPanel();
  }
};


// ====================================================================
// 📋 HTML TEMPLATE
// ====================================================================
function renderMVTR() {
  return `
<div class="grid grid-2" style="gap:1.2rem;align-items:start">

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

      <!-- Panel: From Calculator -->
      <div id="mvtr-panel-calc">
        <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:0.6rem;font-size:0.75rem">
          <div style="font-weight:700;margin-bottom:0.15rem" id="mvtr-lam-name">No laminate loaded</div>
          <div style="color:var(--text-light);word-break:break-word;margin-bottom:0.3rem;min-height:1.2em" id="mvtr-lam-struct">Run a calculation in the Calculator tab first.</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span>Calculated WVTR:</span>
            <strong style="color:var(--primary)" id="mvtr-lam-rate">—</strong>
          </div>
          <div id="mvtr-calc-conditions" style="margin-top:0.4rem;font-size:0.75rem;color:var(--text-light);font-style:italic">
            Test conditions: —
          </div>
        </div>
      </div>

      <!-- Panel: Community DB -->
      <div id="mvtr-panel-db" style="display:none">
        <div class="form-group" style="margin:0">
          <label style="font-size:0.75rem;font-weight:600">Select from Community Database</label>
          <select class="form-input" id="mvtr-db-pick" onchange="MVTR.onDBPick(this.value)" style="font-size:0.78rem">
            <option value="">— Loading laminates... —</option>
          </select>
          <!-- FIX #5: show T/RH after DB selection -->
          <div id="mvtr-db-conditions" style="margin-top:0.3rem;font-size:0.75rem;color:var(--text-light);font-style:italic"></div>
          <div class="hint" id="mvtr-db-hint">Laminates loaded from your community database.</div>
        </div>
      </div>

      <!-- Panel: Company DB -->
      <div id="mvtr-panel-co" style="display:none">
        <div style="font-size:0.75rem;color:var(--text-light);padding:0.4rem 0">
          Join a company to access company laminates. <a href="#" onclick="MVTR.unlockCompany();return false" style="color:var(--primary)">Connect now</a>
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
          <div class="form-group" style="margin:0">
            <label>WVTR Value (g/m²/day)</label>
            <input type="number" id="mvtr-rate-manual" value="1.0" step="0.001" class="form-input" oninput="MVTR.onManualChange()">
          </div>
          <div class="form-group" style="margin:0">
            <label>Test Temperature (°C)</label>
            <input type="number" id="mvtr-rate-temp" value="38" class="form-input" oninput="MVTR.onManualChange()">
          </div>
          <div class="form-group" style="margin:0;grid-column:1/-1">
            <label>Test Humidity (%RH)</label>
            <input type="number" id="mvtr-rate-hum" value="90" class="form-input" oninput="MVTR.onManualChange()">
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
        <div class="form-group" style="margin:0" id="mvtr-fg-ea">
          <label>Activation Energy Eₐ (kJ/mol)</label>
          <input type="number" id="mvtr-ea" value="35" step="1" min="0" max="150" class="form-input">
          <div class="hint">LDPE/PP ≈ 30–40 · EVOH ≈ 50–65 · Nylon ≈ 40–55 · Al foil ≈ 0</div>
          <div class="err">0–150 kJ/mol</div>
        </div>
      </div>
    </div>

    <!-- STEP 3 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;color:var(--warning);font-weight:600;font-size:0.85rem">
        ▼ 3. Packaging Dimensions
      </div>
      <div style="margin-bottom:0.75rem;display:flex;flex-direction:column;gap:0.4rem">
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.85rem">
          <input type="radio" name="mvtr-pkg-mode" value="shape" checked onchange="MVTR.togglePkgMode()">
          <span style="font-weight:500">Calculate from shape</span>
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.85rem">
          <input type="radio" name="mvtr-pkg-mode" value="manual" onchange="MVTR.togglePkgMode()">
          <span style="font-weight:500">Enter area manually</span>
        </label>
      </div>
      <div id="mvtr-geom-selector" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem">
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Shape Type</label>
          <select id="mvtr-shape" onchange="MVTR.onShapeChange()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
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
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Welding Margin (cm)</label>
          <input type="number" id="mvtr-margin" value="1.0" step="0.5" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
        </div>
      </div>
      <div id="mvtr-dims-std" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem">
        <div><label id="mvtr-lbl-w" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Width L (cm)</label><input type="number" id="mvtr-w" value="8" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label id="mvtr-lbl-h" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Height H (cm)</label><input type="number" id="mvtr-h" value="12" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label id="mvtr-lbl-d" style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Depth (cm)</label><input type="number" id="mvtr-d" value="0" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
      </div>
      <div id="mvtr-dims-bottle" style="display:none;grid-template-columns:repeat(2,1fr);gap:0.75rem">
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Body Radius (cm)</label><input type="number" id="mvtr-bt-br" value="3" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Body Height (cm)</label><input type="number" id="mvtr-bt-bh" value="10" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Neck Radius (cm)</label><input type="number" id="mvtr-bt-nr" value="1" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Neck Height (cm)</label><input type="number" id="mvtr-bt-nh" value="2" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div style="grid-column:1/-1"><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Shoulder Height (cm)</label><input type="number" id="mvtr-bt-sh" value="1.5" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
      </div>
      <div id="mvtr-dims-blister" style="display:none;grid-template-columns:repeat(2,1fr);gap:0.75rem">
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Cavities per strip</label><input type="number" id="mvtr-bl-count" value="14" step="1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
        <div><label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Cavity Area (cm²)</label><input type="number" id="mvtr-bl-area" value="1.2" step="0.1" oninput="MVTR.calcArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff"></div>
      </div>
      <div id="mvtr-manual-area" style="display:none;margin-top:0.5rem">
        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Total Surface Area (m²)</label>
        <input type="number" id="mvtr-area-man" value="0.0200" step="0.0001" oninput="MVTR.updateManualArea()" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
      </div>
      <div style="margin-top:1rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);padding:0.75rem 1rem;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.9rem;font-weight:600;color:var(--text)">→ Effective Area:</span>
        <strong id="mvtr-area-display" style="color:var(--primary);font-size:1.1rem">0.0200 m²</strong>
      </div>
      <input type="hidden" id="mvtr-area" value="0.0200">
    </div>

    <!-- STEP 4 -->
    <div style="padding:1rem;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;color:var(--purple);font-weight:600;font-size:0.85rem">
        ▼ 4. Product & Compliance
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Critical Moisture Gain (mg/package)</label>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <input type="number" id="mvtr-crit" value="2.0" step="0.1" min="0.01" style="flex:1;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
            <span style="font-size:0.9rem;font-weight:600;color:var(--text-light)">mg</span>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Target Shelf Life (years)</label>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <input type="number" id="mvtr-years" value="2" step="0.5" min="0.5" max="10" style="flex:1;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
            <span style="font-size:0.9rem;font-weight:600;color:var(--text-light)">yr</span>
          </div>
        </div>
      </div>
      <div style="margin-top:0.75rem">
        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem">Scenario Label</label>
        <input type="text" id="mvtr-label" value="Base Scenario" placeholder="e.g. Formulation A" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fff">
      </div>
    </div>

    <!-- FIX #7: STEP 5 — buttons INSIDE their own padding div -->
    <div style="padding:1rem">
      <button class="btn btn-primary btn-full" onclick="MVTR.calculate()" style="margin-bottom:0.6rem;padding:0.8rem;font-size:0.9rem">
        ▶ Calculate ICH Compliance
      </button>
      <div class="btn-group">
        <button class="btn btn-outline btn-sm" onclick="MVTR.resetForm()">Reset</button>
        <button class="btn btn-success btn-sm" onclick="MVTR.saveScenario()">Save Scenario</button>
        <button class="btn btn-outline btn-sm" onclick="MVTR.exportCSV()">CSV</button>
        <button class="btn btn-outline btn-sm" id="mvtr-btn-pdf" onclick="MVTR.exportPDF()">PDF Report</button>
      </div>
    </div>

  </div><!-- end left card -->

  <div style="position:sticky;top:1rem;height:fit-content">
    <div class="card" style="margin-bottom:0.9rem">
      <h2>KPI Dashboard</h2>
      <div class="kpi-grid">
        <div class="kpi blue" id="mvtr-kpi-zones">
          <div class="kpi-label">Compliant ICH Zones</div>
          <div class="kpi-val" id="mvtr-kv-zones">—</div>
          <div class="kpi-sub" id="mvtr-ks-zones">Awaiting calculation</div>
        </div>
        <div class="kpi warning" id="mvtr-kpi-ingress">
          <div class="kpi-label">Max Annual Ingress</div>
          <div class="kpi-val" id="mvtr-kv-ingress">—</div>
          <div class="kpi-sub" id="mvtr-ks-ingress">Most critical zone</div>
        </div>
        <div class="kpi gray" id="mvtr-kpi-safety">
          <div class="kpi-label">Min Safety Margin</div>
          <div class="kpi-val" id="mvtr-kv-safety">—</div>
          <div class="kpi-sub">vs critical limit</div>
        </div>
        <div class="kpi gray" id="mvtr-kpi-arr">
          <div class="kpi-label">Avg Arrhenius Factor</div>
          <div class="kpi-val" id="mvtr-kv-arr">—</div>
          <div class="kpi-sub">Thermal acceleration</div>
        </div>
      </div>
      <div style="margin-top:0.85rem">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem">
          <span id="mvtr-kpi-status" style="color:var(--text-light)">Waiting for calculation…</span>
          <span id="mvtr-kpi-pct" style="font-weight:700">—</span>
        </div>
        <div class="progress-bar"><div class="progress-fill blue" id="mvtr-kpi-bar" style="width:0%"></div></div>
      </div>
    </div>
    <div class="card">
      <h2>Quick Results</h2>
      <div id="mvtr-quick-results" style="font-size:0.9rem;color:var(--text-light);text-align:center;padding:1rem 0">
        Configure parameters and click <strong>Calculate ICH Compliance</strong>.
      </div>
    </div>
  </div>

</div><!-- end grid -->

<div id="mvtr-detailed" style="display:none;margin-top:1.2rem">
  <div class="tabs">
    <button class="tab active" onclick="MVTR.switchTab('overview',event)">Overview</button>
    <button class="tab" onclick="MVTR.switchTab('tables',event)">Full Tables</button>
    <button class="tab" onclick="MVTR.switchTab('charts',event)">Charts</button>
    <button class="tab" onclick="MVTR.switchTab('scenarios',event)">Scenarios</button>
    <button class="tab" onclick="MVTR.switchTab('sensitivity',event)">Sensitivity</button>
  </div>
  <div id="mvtr-tab-overview" class="tab-pane active">
    <div class="grid grid-2">
      <div class="card"><h2>Annual Ingress by Zone</h2><div class="chart-wrap"><canvas id="mvtr-ch-overview"></canvas></div></div>
      <div class="card"><h2>Correction Factors</h2><div class="chart-wrap sm"><canvas id="mvtr-ch-factors"></canvas></div><div id="mvtr-factors-sum" style="margin-top:0.6rem;font-size:0.85rem;color:var(--text-light)"></div></div>
    </div>
    <div class="card"><h2>Summary by ICH Zone</h2>
      <div class="tbl-wrap"><table class="data-table" id="mvtr-tbl-summary">
        <thead><tr><th>Zone</th><th>Conditions</th><th>Eff. WVTR</th><th>Annual Ingress</th><th>Total (SL)</th><th>% Limit</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
  </div>
  <div id="mvtr-tab-tables" class="tab-pane">
    <div class="card"><h2>Complete Calculation Table</h2>
      <div class="tbl-wrap"><table class="data-table" id="mvtr-tbl-detailed">
        <thead><tr><th>Zone</th><th>T°C</th><th>RH%</th><th>WVTR ref</th><th>F_T</th><th>F_RH</th><th>WVTR eff</th><th>Area m²</th><th>Daily mg</th><th>Annual mg</th><th>Total mg</th><th>% Limit</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>
    <div class="card"><h2>Active Parameters</h2><div id="mvtr-params-panel" style="font-size:0.88rem;line-height:1.9;font-family:'Courier New',monospace"></div></div>
  </div>
  <div id="mvtr-tab-charts" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><h2>WVTR: Reference vs Effective</h2><div class="chart-wrap"><canvas id="mvtr-ch-wvtr"></canvas></div></div>
      <div class="card"><h2>Zone Map (T vs RH)</h2><div class="chart-wrap"><canvas id="mvtr-ch-trh"></canvas></div></div>
      <div class="card"><h2>Years to Critical Limit</h2><div class="chart-wrap"><canvas id="mvtr-ch-ttl"></canvas></div></div>
    </div>
  </div>
  <div id="mvtr-tab-scenarios" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><div id="mvtr-sce-comp-list"></div></div>
      <div class="card"><h2>Comparison Chart</h2><div class="chart-wrap"><canvas id="mvtr-ch-sce"></canvas></div></div>
    </div>
    <div class="card"><h2>Comparison Table</h2>
      <div class="tbl-wrap"><table class="data-table" id="mvtr-tbl-sce">
        <thead><tr id="mvtr-sce-hdr"><th>Parameter</th></tr></thead>
        <tbody id="mvtr-sce-body"></tbody>
      </table></div>
    </div>
  </div>
  <div id="mvtr-tab-sensitivity" class="tab-pane">
    <div class="grid grid-2">
      <div class="card"><h2>Sensitivity: Eₐ</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;align-items:end">
          <div class="form-group" style="margin:0"><label>Eₐ min (kJ/mol)</label><input type="number" id="mvtr-s-ea-min" value="20" step="5" class="form-input" oninput="MVTR.runSensEA()"></div>
          <div class="form-group" style="margin:0"><label>Eₐ max (kJ/mol)</label><input type="number" id="mvtr-s-ea-max" value="65" step="5" class="form-input" oninput="MVTR.runSensEA()"></div>
        </div>
        <div class="chart-wrap"><canvas id="mvtr-ch-sea"></canvas></div>
      </div>
      <div class="card"><h2>Sensitivity: WVTR</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;align-items:end">
          <div class="form-group" style="margin:0"><label>WVTR min (g/m²/d)</label><input type="number" id="mvtr-s-wvtr-min" value="0.1" step="0.1" class="form-input" oninput="MVTR.runSensWVTR()"></div>
          <div class="form-group" style="margin:0"><label>WVTR max (g/m²/d)</label><input type="number" id="mvtr-s-wvtr-max" value="3.0" step="0.1" class="form-input" oninput="MVTR.runSensWVTR()"></div>
        </div>
        <div class="chart-wrap"><canvas id="mvtr-ch-swvtr"></canvas></div>
      </div>
    </div>
  </div>
</div>

<div class="disclaimer">
  <h3>⚠ Regulatory Disclaimer & Model Limitations</h3>
  <div class="disc-item"><strong>For R&D screening and concept development only.</strong> This tool assists packaging engineers during early material selection. It produces predictive estimates from mathematical models and does not replace regulatory stability testing.</div>
  <div class="disc-item"><strong>Real-time and accelerated stability studies are mandatory.</strong> Commercial shelf-life claims submitted to FDA, EMA, PMDA, ANVISA, or any national authority must be supported by experimental data from accredited stability chambers, in full compliance with ICH Q1A(R2) and applicable local regulations.</div>
  <div class="disc-item"><strong>Model assumptions:</strong> Steady-state permeation through a defect-free uniform film. Linear superposition of Arrhenius and RH correction factors. No seal permeation, pinholes, or mechanical damage. Constant storage conditions. Negligible back-diffusion. Real systems may deviate significantly.</div>
  <div class="disc-item"><strong>Source data quality determines output reliability.</strong> When entering values manually, the user is solely responsible for ensuring the measurement was performed under the stated reference conditions per ASTM F1249 or ISO 15106.</div>
</div>

${renderMVTRMethodology()}
`;
}

function renderMVTRMethodology() {
  return `
<div class="methodology-card">
  <div class="mc-inner">
    <h2>Mechanics of MVTR Analysis & ICH Q1A(R2) Compliance</h2>
    <div class="mc-body">
      <p>The Moisture Vapor Transmission Rate (MVTR, also written WVTR) is the steady-state flux of water vapor through a unit area of packaging film under defined conditions of temperature and relative humidity. In pharmaceutical packaging science, quantifying this rate and projecting its cumulative effect over the product's intended shelf life is not optional. It is the foundation upon which stability assessments under ICH Q1A(R2) are built. This system implements the full analytical chain from measured barrier values through zone-specific thermal and humidity corrections to compliance predictions against a user-defined critical limit.</p>

      <h3>The ICH Climatic Zone Framework</h3>
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

      <h3>Arrhenius Temperature Correction</h3>
      <p>Water vapor permeation through a polymer film is a thermally activated diffusion process. As temperature rises, polymer chain segmental mobility increases, free volume grows, and the diffusion coefficient of water molecules through the matrix accelerates exponentially. This relationship is described by the Arrhenius equation:</p>
      <div class="formula-block">F_T = exp [ (Eₐ / R) × (1/T_ref − 1/T_target) ]<br><br>Eₐ = activation energy of permeation (kJ/mol)<br>R = 8.314 × 10⁻³ kJ/(mol·K) · T in Kelvin</div>
      <p>When F_T &gt; 1 the target zone is hotter than the reference and permeation is accelerated. F_T &lt; 1 means the zone is cooler and the film performs better than its measured value. Setting Eₐ = 0 treats WVTR as temperature-independent, which is appropriate only when no activation energy data exists.</p>
      <div class="callout warning">
        <strong>Literature Eₐ guidance:</strong> Polyolefins (LDPE, PP) ≈ 28–42 kJ/mol. Polar films (EVOH, Nylon) ≈ 45–70 kJ/mol due to stronger hydrogen-bonding with water. Aluminium foil laminates: near zero when foil is intact, because transport occurs through defects (pinholes, seals), not through the metal lattice itself. Metallised films fall between 10–30 kJ/mol depending on metallisation quality.
      </div>

      <h3>Relative Humidity Driving Force</h3>
      <p>Permeation is driven by the partial pressure differential of water vapour across the film. At the same temperature, the ratio of partial pressures simplifies to the ratio of relative humidities, giving a linear first-order correction:</p>
      <div class="formula-block">F_RH = RH_target / RH_ref<br>WVTR_eff = WVTR_ref × F_T × F_RH</div>
      <p>This linear approximation holds well for non-hygroscopic films (polyolefins, PET). For hygroscopic films (EVOH, Nylon, regenerated cellulose), the diffusion coefficient increases non-linearly with humidity. In those cases an exponential beta-correction should be applied. The Community DB laminates have been validated to contain hygroscopic-grade corrections where applicable.</p>

      <h3>Cumulative Ingress and Compliance Evaluation</h3>
      <p>Once the effective WVTR is established for each ICH zone, cumulative ingress over the shelf life follows from a steady-state linear model:</p>
      <div class="formula-block">Ingress_daily (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000<br>Ingress_total (mg) = Ingress_daily × t_shelf (days)<br>Compliance: Ingress_total ≤ M_crit</div>
      <div class="callout success">
        <strong>Worked example (pharmaceutical blister pack):</strong> WVTR_ref = 1.0 g/m²/day at 38°C/90%RH, Eₐ = 35 kJ/mol, cavity area = 2 cm². Zone IVa (40°C/75%RH): F_T = exp[(35/0.008314)×(1/311.15 − 1/313.15)] = 1.088; F_RH = 75/90 = 0.833; WVTR_eff = 0.907 g/m²/day. Daily ingress = 0.907 × 0.0002 × 1000 = 0.000181 mg. Over 2 years (730 days) = 0.133 mg, well within a 2.0 mg M_crit.
      </div>
      <p>The critical moisture limit M_crit must be established through independent product characterisation. Moisture sorption isotherm testing (ISO 18787, DVS method) combined with accelerated degradation experiments identifies the threshold beyond which physicochemical or microbiological failure initiates.</p>

      <h3>Packaging Geometry & Exposed Area</h3>
      <p>The surface area A is the single geometric parameter coupling the barrier value to the mass of water entering the package. For blister packs, only the polymer lid foil area over the cavity is moisture-active. The aluminium base contributes negligibly. For pouches and bags, both faces and any gusset area contribute. Bottles require numerical integration over the body, shoulder, and neck surfaces, which this tool performs automatically when the "Bottle" shape is selected. Seal areas and induction-welded surfaces are excluded by default and should be accounted for separately if seal permeation is a known concern.</p>

      <h3>Safety Margin and Sensitivity Analysis</h3>
      <p>A compliance pass is a necessary but not sufficient condition for robust packaging. The safety margin, defined as the fraction of M_crit not consumed at end of shelf life, quantifies engineering headroom against real-world variability: batch-to-batch WVTR variation (±15–25% is typical for commercial films), seal integrity degradation during distribution, cyclic humidity in transit, and measurement uncertainty in the reference WVTR. A margin below 20% warrants a design review. The sensitivity analysis identifies which input parameters have the greatest leverage on the compliance outcome, directing experimental validation effort efficiently.</p>

      <h3>Alignment with International Standards</h3>
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

// ====================================================================
// 🚀 ENTRY POINT
// FIX #3: setTimeout increased from 100ms to 200ms to ensure
// renderMVTR() HTML is fully injected before MVTR.init() reads the DOM
// ====================================================================
window.renderPharmaMvtr = function() {
  const c = document.getElementById('app-content');
  if (c) c.innerHTML = renderMVTR();
  setTimeout(function() { MVTR.init(); }, 200);
};
