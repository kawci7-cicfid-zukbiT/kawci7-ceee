// ====================================================================
// pharma_uptake.js  —  Desiccant Sizing Calculator  v4  [PATCHED]
// ====================================================================
// FIX APPLIED:
//  #1 _getRefCond()       - fallback 23/50 → 38/90 + localStorage bridge
//  #2 setBarrierSource()  - aggiunto fallback localStorage per WVTR
//  #3 _getActiveRate()    - aggiunto fallback localStorage per WVTR
//  #4 Q_head formula      - ×1e6 → ×1000 (errore 1000× su headspace moisture)
//  #5 onDBPick()          - aggiunto des-db-conditions per feedback T/RH
//  #6 renderPharmaUptake  - fallback localStorage per condizioni di test
//  #7 safety_factor       - Math.max(1, ...) invece di || 1
//  #8 days_sat guard      - protezione contro Infinity/NaN
//  #9 des_wvtrEff         - allineato a formula MVTR (stile, non errore)
// ====================================================================

// ── Desiccant database ───────────────────────────────────────────────
const DESICCANT_DB = {
  silica_gel_a: {
    name: 'Silica Gel Type A',
    desc: 'Standard pharmaceutical-grade silica gel – wide RH working range, most common',
    color: '#2563eb',
    // FIX 5: Corrected to Grace Davison EP/USP pharmacopoeial data.
    // Previous values were 30–50% too high (52% at RH90 vs real ~35%).
    // Source: Grace Davison Syloid 244FP TDS; Desiccare SG-A datasheet;
    // USP <381> silica gel NF specification (≥10% at 25°C/50% RH).
    isotherm: [[0,0],[10,3],[20,7],[30,11],[40,15],[50,19],[60,24],[70,28],[80,32],[90,36],[100,40]]
  },
  silica_gel_b: {
    name: 'Silica Gel Type B (Indicating)',
    desc: 'Colour-indicating silica gel (CoCl₂ or CoCl₂-free) – lower capacity than Type A due to pore blockage',
    color: '#7c3aed',
    // FIX 6: Type B has ~15–25% lower capacity than Type A (cobalt impregnation
    // occupies micropores). Previous values were erroneously close to or higher
    // than Type A. Source: Multisorb Technologies datasheet; Grace Davison comparison.
    isotherm: [[0,0],[10,2],[20,5],[30,8],[40,12],[50,15],[60,19],[70,23],[80,27],[90,30],[100,34]]
  },
  mol_sieve_3a: {
    name: 'Molecular Sieve 3Å',
    desc: 'Zeolite – aggressive low-RH control, lyophilised biologics, effervescent tablets',
    color: '#16a34a',
    isotherm: [[0,0],[5,14],[10,18],[20,20],[30,21],[40,21.5],[50,22],[60,22],[70,22],[80,22],[90,22],[100,22]]
  },
  mol_sieve_4a: {
    name: 'Molecular Sieve 4Å',
    desc: 'Zeolite – broad spectrum moisture control, USP/NF grade',
    color: '#0891b2',
    isotherm: [[0,0],[5,16],[10,20],[20,23],[30,24],[40,24.5],[50,25],[60,25],[70,25],[80,25],[90,25],[100,25]]
  },
  montmorillonite: {
    name: 'Montmorillonite Clay',
    desc: 'Cost-effective natural clay – good mid-range RH performance',
    color: '#d97706',
    isotherm: [[0,0],[10,4],[20,8],[30,12],[40,16],[50,20],[60,25],[70,31],[80,38],[90,46],[100,54]]
  },
  calcium_chloride: {
    name: 'Calcium Chloride ⚠ DELIQUESCENT',
    desc: '⚠ CaCl₂ deliquesces at >32% RH forming brine — NOT suitable for direct pharma contact. Model valid only below 30% RH.',
    color: '#dc2626',
    // FIX 7: CaCl₂ deliquescence flag + isotherm capped at 30% RH.
    // Above ~32% RH the solid dissolves into saturated solution — the
    // "isotherm" above this point is physically meaningless for a solid
    // desiccant sizing model. Values above 30% RH are flagged as invalid.
    deliquescence_rh: 32,  // % RH above which model is invalid
    isotherm: [[0,0],[10,20],[20,50],[30,90],[32,null],[40,null],[50,null],[60,null],[70,null],[80,null],[90,null],[100,null]]
  }
};

// ── Container geometry presets ────────────────────────────────────────
const CONTAINER_GEOMETRY = {
  hdpe_30:     { name: 'Round Bottle 30 mL',             area_cm2: 42,  headspace_ml: 8  },
  hdpe_60:     { name: 'Round Bottle 60 mL',             area_cm2: 62,  headspace_ml: 15 },
  hdpe_120:    { name: 'Round Bottle 120 mL',            area_cm2: 96,  headspace_ml: 25 },
  hdpe_200:    { name: 'Round Bottle 200 mL',            area_cm2: 140, headspace_ml: 40 },
  hdpe_500:    { name: 'Round Bottle 500 mL',            area_cm2: 260, headspace_ml: 80 },
  blister_10:  { name: 'Blister Strip — 10 cavities',    area_cm2: 20,  headspace_ml: 1  },
  blister_30:  { name: 'Blister Strip — 30 cavities',    area_cm2: 60,  headspace_ml: 3  },
  sachet_5g:   { name: 'Foil Sachet 5 g',                area_cm2: 30,  headspace_ml: 3  },
  sachet_20g:  { name: 'Foil Sachet 20 g',               area_cm2: 70,  headspace_ml: 8  },
  pouch_50ml:  { name: 'Stand-Up Pouch 50 mL',           area_cm2: 80,  headspace_ml: 10 },
  pouch_200ml: { name: 'Stand-Up Pouch 200 mL',          area_cm2: 180, headspace_ml: 30 },
  custom:      { name: 'Custom…',                        area_cm2: null, headspace_ml: null }
};

// ── Storage condition presets ─────────────────────────────────────────
const STORAGE_PRESETS = {
  zone1:  { label: 'ICH Zone I — 21°C / 45% RH',         T: 21, RH: 45 },
  zone2:  { label: 'ICH Zone II — 25°C / 60% RH',        T: 25, RH: 60 },
  zone3a: { label: 'ICH Zone IIIa — 40°C / 15% RH',      T: 40, RH: 15 },
  zone4a: { label: 'ICH Zone IVa — 40°C / 75% RH',       T: 40, RH: 75 },
  zone4b: { label: 'ICH Zone IVb — 30°C / 75% RH',       T: 30, RH: 75 },
  acc:    { label: 'ICH Accelerated — 40°C / 75% RH',    T: 40, RH: 75 },
  int:    { label: 'ICH Intermediate — 30°C / 65% RH',   T: 30, RH: 65 },
  rt:     { label: 'Room temperature — 25°C / 50% RH',   T: 25, RH: 50 },
  cold:   { label: 'Cold chain — 5°C / 40% RH',          T:  5, RH: 40 },
  custom: { label: 'Custom…',                             T: null, RH: null }
};

// ── Core math ─────────────────────────────────────────────────────────

// Returns saturation vapour pressure in Pa (Magnus–Tetens approximation)
function des_psat(T) {
  return 610.94 * Math.exp(17.625 * T / (T + 243.04));
}

function des_interpCap(isotherm, rh) {
  rh = Math.max(0, Math.min(100, rh));
  for (let i = 0; i < isotherm.length - 1; i++) {
    if (rh >= isotherm[i][0] && rh <= isotherm[i+1][0]) {
      // FIX 7: null entries mark invalid range (deliquescence above threshold)
      if (isotherm[i][1] === null || isotherm[i+1][1] === null) return null;
      const t = (rh - isotherm[i][0]) / (isotherm[i+1][0] - isotherm[i][0]);
      return (isotherm[i][1] + t * (isotherm[i+1][1] - isotherm[i][1])) / 100;
    }
  }
  const last = isotherm[isotherm.length-1][1];
  return last === null ? null : last / 100;
}

// FIX 9: F_RH based on water vapour partial pressure (Magnus), not linear RH.
// Driving force for WVTR is ΔpH₂O = Psat(T)×RH, not RH alone.
// Same fix as pharma_mvtr.js calcWVTR — consistent across all pharma modules.
function des_wvtrEff(wvtr_ref, Ea_kJ, T_ref, T_store, RH_ref, RH_store) {
  const Tr = T_ref   + 273.15;
  const Ts = T_store + 273.15;
  const arrF = Ea_kJ > 0
    ? Math.exp((Ea_kJ * 1000 / 8.314) * (1 / Tr - 1 / Ts))
    : 1;
  // Partial-pressure driving force: F_RH = [Psat(T_store)×RH_store] / [Psat(T_ref)×RH_ref]
  const psatRef   = 610.94 * Math.exp(17.625 * T_ref   / (T_ref   + 243.04));
  const psatStore = 610.94 * Math.exp(17.625 * T_store / (T_store + 243.04));
  const rhF = RH_ref > 0 ? (psatStore * RH_store) / (psatRef * RH_ref) : 1;
  return wvtr_ref * arrF * rhF;
}

function des_calc(p) {
  const des    = DESICCANT_DB[p.des_type] || DESICCANT_DB['silica_gel_a'];
  const wvtr_e = des_wvtrEff(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.T_store, p.RH_ref, p.RH_store);
  const A_m2   = p.area_cm2 / 1e4;
  const t_days = p.shelf_years * 365;

  // Film ingress (mg)
  const Q_film = wvtr_e * A_m2 * 1000 * t_days;

  // Q_head: moisture in headspace air at sealing (one-time event at t=0)
  const Ps     = des_psat(p.T_store); // Pa
  const Q_head = (p.headspace_ml / 1e6)
               * (p.RH_fill / 100)
               * Ps
               / (8.314 * (p.T_store + 273.15))
               * 18
               * 1000;  // mg

  // Q_prod: moisture released by product (one-time event at t=0)
  const Q_prod = p.drug_mass_g * (p.mc_init / 100) * 1000 * (p.mc_release_frac / 100);

  const Q_total = Q_film + Q_head + Q_prod;

  const cap_eff    = des_interpCap(des.isotherm, p.RH_crit);
  // null cap_eff = CaCl₂ above deliquescence threshold — model invalid
  const deliquesce = cap_eff === null;
  const W_required = (cap_eff !== null && cap_eff > 0) ? Q_total / 1000 / cap_eff : Infinity;
  const W_rec      = W_required * p.safety_factor;
  const cap_total_mg = isFinite(W_rec) ? W_rec * (cap_eff || 0) * 1000 : Infinity;

  // FIX 8: Saturation timeline — Q_head and Q_prod are ONE-TIME sources
  // at sealing (t=0), not recurring daily. Add them as initial offset only.
  // Previous bug: summed Q_head+Q_prod every day → grossly overestimated saturation speed.
  const Q_instant = Q_head + Q_prod;   // moisture absorbed at day 0 (mg)
  const timeline = [];
  const step = Math.max(1, Math.floor(t_days / 200));
  for (let d = 0; d <= t_days; d += step) {
    const abs  = Q_instant + wvtr_e * A_m2 * 1000 * d;  // Q_instant added once
    const frac = isFinite(cap_total_mg) && cap_total_mg > 0
      ? Math.min(abs / cap_total_mg, 1)
      : 0;
    timeline.push({ t: d, absorbed: abs, frac: frac * 100 });
  }

  let days_sat = 0;
  if (isFinite(cap_total_mg) && cap_total_mg > 0 && wvtr_e > 0) {
    const remaining = cap_total_mg - Q_instant;
    days_sat = remaining > 0 ? remaining / (wvtr_e * A_m2 * 1000) : 0;
  }

  return { wvtr_eff: wvtr_e, Q_film, Q_head, Q_prod, Q_total,
           cap_eff_g_g: cap_eff, W_required, W_recommended: W_rec,
           days_sat, timeline, des, t_days, deliquesce };
}

// ── Helper: read WVTR result from localStorage (Calculator bridge) ────
function des_readLocalStorageRate() {
  try {
    const saved = JSON.parse(localStorage.getItem('mvtr_calc_result') || 'null');
    if (saved && saved.total > 0) return saved;
  } catch(e) {}
  return null;
}

// ── DES object ────────────────────────────────────────────────────────
const DES = {
  _barrierSource: 'calc',
  _manualOverride: false,

  setBarrierSource(src) {
    if (!['calc', 'db', 'company'].includes(src)) return;
    this._barrierSource = src;
    ['calc', 'db', 'company'].forEach(key => {
      const btn = document.getElementById(`des-src-btn-${key}`);
      const pan = document.getElementById(`des-panel-${key}`);
      if (btn) {
        if (key === src) {
          btn.className = 'btn btn-sm';
          btn.style.cssText = 'background:var(--primary);color:#fff;border:none;font-size:0.75rem';
        } else {
          btn.className = 'btn btn-sm btn-outline';
          btn.style.cssText = 'font-size:0.75rem';
          if (key === 'company' && !(typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive())) {
            btn.style.opacity = '0.5';
            btn.disabled = true;
          }
        }
      }
      if (pan) pan.style.display = key === src ? 'block' : 'none';
    });

    if (src === 'db') {
      this.loadCommunityLaminates();
    }

    if (src === 'calc') {
      // FIX #2: localStorage FIRST, State as fallback
      let rate = 0;
      const ls = des_readLocalStorageRate();
      if (ls) {
        rate = ls.total;
        // Aggiorna display condizioni di test
        const condEl = document.getElementById('des-calc-conditions');
        if (condEl && ls.tRef != null) {
          condEl.textContent = `Test conditions: ${ls.tRef}°C / ${ls.rhRef ?? 90}% RH`;
        }
      } else if (typeof State !== 'undefined' && State.calcResult?.total > 0) {
        rate = State.calcResult.total;
      }
      this._updateBanner(rate > 0 ? rate.toFixed(5) : '-');
    }
  },

  toggleManualOverride(checked) {
    this._manualOverride = !!checked;
    const panel = document.getElementById('des-panel-manual');
    if (panel) panel.style.display = checked ? 'block' : 'none';
    ['calc', 'db', 'company'].forEach(key => {
      const btn = document.getElementById('des-src-btn-' + key);
      if (!btn) return;
      btn.disabled = checked;
      btn.style.opacity = checked ? '0.35' : '1';
      btn.style.cursor = checked ? 'not-allowed' : 'pointer';
      const pan = document.getElementById('des-panel-' + key);
      if (pan) pan.style.display = checked ? 'none' : (key === this._barrierSource ? 'block' : 'none');
    });
    if (checked) this.onManualRateChange();
    else this.setBarrierSource(this._barrierSource);
  },

  // FIX #3: localStorage FIRST, State as fallback
  _getActiveRate() {
    if (this._manualOverride) {
      return parseFloat(document.getElementById('des-rate-manual')?.value || 0);
    }
    if (this._barrierSource === 'db') {
      const v = document.getElementById('des-db-pick')?.value;
      return v ? parseFloat(v.split('|')[0]) : 0;
    }
    // source === 'calc'
    const ls = des_readLocalStorageRate();
    if (ls && ls.total > 0) return ls.total;
    if (typeof State !== 'undefined' && State.calcResult?.total > 0) return State.calcResult.total;
    return 0;
  },

  // FIX #1: _getRefCond con fallback corretto 38/90 + localStorage
  _getRefCond() {
    const get = (id, fb) => { const el = document.getElementById(id); return el ? (parseFloat(el.value) || fb) : fb; };

    if (!this._manualOverride && this._barrierSource === 'calc') {
      // FIX #1: localStorage FIRST — reliable across navigations/reloads
      const ls = des_readLocalStorageRate();
      if (ls && ls.tRef != null) {
        return { T_ref: ls.tRef, RH_ref: ls.rhRef ?? 90, Ea_kJ: get('des-ea', 0) };
      }
      // Fallback: State.selCond (same-page context)
      if (typeof State !== 'undefined' && State.selCond) {
        return {
          // FIX #1: fallback 38/90, NON 23/50
          T_ref:  State.selCond.temperature ?? 38,
          RH_ref: State.selCond.humidity    ?? 90,
          Ea_kJ:  get('des-ea', 0)
        };
      }
      // Default ASTM F1249
      return { T_ref: 38, RH_ref: 90, Ea_kJ: get('des-ea', 0) };
    }

    if (this._barrierSource === 'db' && !this._manualOverride) {
      const v = document.getElementById('des-db-pick')?.value;
      if (v) {
        const parts = v.split('|');
        // Legge Eₐ dal campo editabile des-db-ea (utente può modificarlo)
        // con fallback al valore nell'option (parts[3])
        const eaFromField = parseFloat(document.getElementById('des-db-ea')?.value);
        const Ea_kJ = !isNaN(eaFromField) ? eaFromField : (parseFloat(parts[3]) || 35);
        return { T_ref: parseFloat(parts[1]) || 38, RH_ref: parseFloat(parts[2]) || 90, Ea_kJ };
      }
    }

    // Manual
    return { T_ref: get('des-tref', 38), RH_ref: get('des-rhref', 90), Ea_kJ: get('des-ea-man', 35) };
  },

  _updateBanner(rateStr) {
    const el = document.getElementById('des-active-rate');
    if (el) el.textContent = (rateStr || '-') + ' g/m²·day';
  },

  onManualRateChange() {
    const rate = parseFloat(document.getElementById('des-rate-manual')?.value) || 0;
    this._updateBanner(rate > 0 ? rate.toFixed(5) : '-');
  },

  // Carica i laminati dalla community DB (DB.laminates) con fallback hardcoded
  loadCommunityLaminates() {
    const sel = document.getElementById('des-db-pick');
    if (!sel) return;

    // Laminati hardcoded come fallback se DB.laminates non disponibile
    const HARDCODED = [
      { group: 'Pharmaceutical Grade', items: [
        { label: 'PET 12µm / Al 9µm / LDPE 60µm — 0.002 g/m²/day', value: '0.002|38|90|35' },
        { label: 'OPA 15µm / Al 12µm / LLDPE 80µm — 0.010 g/m²/day', value: '0.01|38|90|35' },
        { label: 'PET 12µm / EVOH 12µm / PP 50µm — 0.050 g/m²/day', value: '0.05|38|90|50' },
        { label: 'PVDC / OPA / Al / LDPE Alu-Alu — 0.001 g/m²/day', value: '0.001|38|90|30' },
      ]},
      { group: 'HDPE Bottle Wall', items: [
        { label: 'HDPE 30 mil bottle — 0.300 g/m²/day', value: '0.3|23|50|38' },
        { label: 'HDPE 20 mil bottle — 0.800 g/m²/day', value: '0.8|23|50|38' },
      ]},
    ];

    const hint = document.getElementById('des-db-hint');

    if (typeof DB !== 'undefined' && DB.laminates && DB.laminates.length > 0) {
      // Filtra per mode wvtr (case-insensitive)
      const wvtrLaminates = DB.laminates.filter(l => !l.mode || l.mode.toLowerCase() === 'wvtr');
      if (wvtrLaminates.length > 0) {
        sel.innerHTML = '<option value="">— Select a laminate —</option>' +
          wvtrLaminates.map(l => {
            const wvtr = l.total ? l.total.toFixed(5) : '0.00000';
            const t    = l.temperature ?? l.tRef ?? l.testTemp ?? 38;
            const rh   = l.humidity    ?? l.rhRef ?? l.testRH  ?? 90;
            const ea   = l.Ea ?? l.ea ?? l.activationEnergy ?? 35;
            return `<option value="${wvtr}|${t}|${rh}|${ea}">${l.name || 'Unnamed'} — ${wvtr} g/m²·day @ ${t}°C/${rh}%RH</option>`;
          }).join('');
        if (hint) hint.textContent = ``;
        return;
      }
    }

    // Fallback: opzioni hardcoded
    sel.innerHTML = '<option value="">— Select a validated laminate —</option>' +
      HARDCODED.map(g =>
        `<optgroup label="${g.group}">${g.items.map(i => `<option value="${i.value}">${i.label}</option>`).join('')}</optgroup>`
      ).join('');
    if (hint) hint.textContent = 'Showing reference laminates. Add laminates in Calculator to see your data here.';
  },

  // FIX #5: mostra condizioni T/RH nel pannello DB + pre-popola Eₐ
  onDBPick(val) {
    if (!val) return;
    const parts = val.split('|');
    const t  = parts[1] || '38';
    const rh = parts[2] || '90';
    const ea = parts[3] || '35';

    // Mostra le condizioni di test
    const dbCond = document.getElementById('des-db-conditions');
    if (dbCond) dbCond.textContent = `Test conditions: ${t}°C / ${rh}% RH`;

    // Pre-popola il campo Eₐ editabile del pannello DB
    const eaEl = document.getElementById('des-db-ea');
    if (eaEl) eaEl.value = ea;

    this._updateBanner(parts[0]);
    DES.calculate();
  },

  onStorPreset(key) {
    const pr = STORAGE_PRESETS[key];
    if (!pr || pr.T === null) return;
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('des-tstore', pr.T); setV('des-rhstore', pr.RH);
    DES.calculate();
  },

  onContPreset(key) {
    const pr = CONTAINER_GEOMETRY[key];
    if (!pr || pr.area_cm2 === null) return;
    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('des-area', pr.area_cm2); setV('des-headspace', pr.headspace_ml);
    DES.calculate();
  },

  onDesTypeChange() {
    const sel = document.getElementById('des-des-type');
    const desc = document.getElementById('des-des-desc');
    if (sel && desc) desc.textContent = (DESICCANT_DB[sel.value] || {}).desc || '';
    this._renderIsothermBars(DESICCANT_DB[sel?.value || 'silica_gel_a']);
    DES.calculate();
  },

  calculate() {
    const get = (id, fb) => { const el = document.getElementById(id); return el ? (parseFloat(el.value) || (fb||0)) : (fb||0); };
    const ref = this._getRefCond();
    const p = {
      des_type:        document.getElementById('des-des-type')?.value || 'silica_gel_a',
      wvtr_ref:        this._getActiveRate(),
      T_ref:           ref.T_ref,
      RH_ref:          ref.RH_ref,
      Ea_kJ:           ref.Ea_kJ,
      area_cm2:        get('des-area', 62),
      T_store:         get('des-tstore', 25),
      RH_store:        get('des-rhstore', 60),
      shelf_years:     get('des-shelf', 2) || 2,
      RH_crit:         get('des-rhcrit', 40),
      headspace_ml:    get('des-headspace', 15),
      RH_fill:         get('des-rhfill', 20),
      drug_mass_g:     get('des-drugmass', 12),
      mc_init:         get('des-mcinit', 0.5),
      mc_release_frac: get('des-mcrelease', 10),
      // FIX #7: Math.max(1, ...) invece di || 1
      safety_factor:   Math.max(1, get('des-safety', 2))
    };
    if (typeof State !== 'undefined') State.pharmaUptake = p;

    const res = des_calc(p);
    this._updateBanner(res.wvtr_eff.toFixed(5) + ' (at ' + p.T_store + '°C)');
    this._renderResults(p, res);
    this._renderIsothermBars(res.des);

    const wrap = document.getElementById('des-charts-wrap');
    if (wrap) wrap.style.display = 'block';
    setTimeout(() => this._drawCharts(p, res), 120);
  },

  _renderResults(p, res) {
    const panel = document.getElementById('des-result-panel');
    if (!panel) return;
    const satOK = res.days_sat > res.t_days;
    const satStr = satOK ? '> ' + res.t_days + ' days ✓' : (res.days_sat > 0 ? res.days_sat.toFixed(0) + ' days ⚠' : 'N/A ⚠');

    const kpi = (label, val, color, colorL, sub) =>
      `<div style="background:${colorL};border:1px solid ${color};border-radius:12px;padding:1rem">
        <div style="font-size:0.66rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">${label}</div>
        <div style="font-size:1.05rem;font-weight:800;color:${color};line-height:1.25">${val}</div>
        ${sub ? `<div style="font-size:0.68rem;color:var(--text-light);margin-top:0.2rem">${sub}</div>` : ''}
      </div>`;

    const budgetRow = (label, val, total, color) => {
      const pct = total > 0 ? val / total * 100 : 0;
      return `<div style="margin-bottom:0.4rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.15rem">
          <span style="color:var(--text-light)">${label}</span>
          <span style="font-weight:600">${val.toFixed(4)} mg <span style="color:var(--text-light);font-weight:400">(${pct.toFixed(1)}%)</span></span>
        </div>
        <div style="height:4px;background:var(--border);border-radius:2px">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${color};border-radius:2px"></div>
        </div></div>`;
    };

    panel.innerHTML = `
    <div style="animation:fadeIn 0.3s ease">
      <div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);border-radius:12px;margin-bottom:1rem">
        <div style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1.2">${isFinite(res.W_recommended) ? res.W_recommended.toFixed(2) + ' g' : '—'}</div>
        <div style="font-size:0.82rem;color:var(--text-light);margin-top:0.4rem;font-weight:500">${res.des.name}</div>
        <span class="badge badge-blue" style="margin-top:0.5rem">Recommended desiccant mass</span>
      </div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:1rem;font-size:0.82rem">
        <div style="font-weight:700;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-light);margin-bottom:0.5rem">Moisture budget</div>
        ${budgetRow('Film ingress',    res.Q_film, res.Q_total, '#2563eb')}
        ${budgetRow('Headspace fill',  res.Q_head, res.Q_total, '#7c3aed')}
        ${budgetRow('Product release', res.Q_prod, res.Q_total, '#d97706')}
        <div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;display:flex;justify-content:space-between;font-weight:700">
          <span>Total</span><span>${res.Q_total.toFixed(4)} mg</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        ${kpi('Required desiccant', isFinite(res.W_required) ? res.W_required.toFixed(2)+' g':'—', '#2563eb','#eff6ff','Without safety factor')}
        ${kpi('Recommended desiccant', isFinite(res.W_recommended) ? res.W_recommended.toFixed(2)+' g':'—', '#16a34a','#f0fdf4', p.safety_factor+'× safety factor')}
        ${kpi('Total moisture load', res.Q_total.toFixed(4)+' mg', '#d97706','#fef3c7','Film + headspace + product')}
        ${kpi('Saturation time', satStr, satOK?'#16a34a':'#dc2626', satOK?'#f0fdf4':'#fee2e2', satOK?'Full shelf life protected':'Increase desiccant or improve barrier')}
      </div>
      <div style="margin-top:0.75rem;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:0.5rem 0.75rem;font-size:0.75rem;color:var(--text-light)">
        Ref. conditions: <strong>${p.T_ref}°C / ${p.RH_ref}% RH</strong> → Storage: <strong>${p.T_store}°C / ${p.RH_store}% RH</strong> · Eₐ = ${p.Ea_kJ} kJ/mol · WVTR_eff = ${res.wvtr_eff.toFixed(5)} g/m²/day
      </div>
    </div>`;
  },

  _renderIsothermBars(des) {
    const container = document.getElementById('des-isotherm-bars');
    if (!container || !des) return;
    container.innerHTML = [20,40,60,80,100].map(rh => {
      const cap = (des_interpCap(des.isotherm, rh) * 100).toFixed(1);
      return `<div style="text-align:center">
        <div style="font-size:0.7rem;font-weight:700;color:${des.color}">${cap}%</div>
        <div style="height:32px;background:var(--border);border-radius:3px;margin:0.2rem 0;position:relative">
          <div style="position:absolute;bottom:0;left:0;right:0;height:${Math.min(parseFloat(cap),100)}%;background:${des.color};border-radius:3px;opacity:0.7"></div>
        </div>
        <div style="font-size:0.62rem;color:var(--text-light)">${rh}% RH</div>
      </div>`;
    }).join('');
  },

  _drawCharts(p, res) {
    if (typeof Chart === 'undefined') return;
    if (!window.chartInstances) window.chartInstances = {};
    ['desBudget','desSat','desIso'].forEach(k => {
      if (window.chartInstances[k]) { window.chartInstances[k].destroy(); delete window.chartInstances[k]; }
    });

    // Budget doughnut
    const cv1 = document.getElementById('des-budget-chart');
    if (cv1) {
      window.chartInstances.desBudget = new Chart(cv1.getContext('2d'), {
        type: 'doughnut',
        data: { labels: ['Film ingress','Headspace fill','Product release'],
          datasets: [{ data: [res.Q_film, res.Q_head, res.Q_prod],
            backgroundColor: ['rgba(37,99,235,0.8)','rgba(124,58,237,0.8)','rgba(217,119,6,0.8)'],
            borderColor: ['#2563eb','#7c3aed','#d97706'], borderWidth: 2 }] },
        options: { responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:12 } },
            tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(4)} mg (${res.Q_total > 0 ? (ctx.parsed/res.Q_total*100).toFixed(1) : 0}%)` } } } }
      });
    }

    // Saturation timeline
    const cv2 = document.getElementById('des-sat-chart');
    if (cv2) {
      const days  = res.timeline.map(pt => pt.t);
      const fracs = res.timeline.map(pt => pt.frac);
      window.chartInstances.desSat = new Chart(cv2.getContext('2d'), {
        type: 'line',
        data: { labels: days, datasets: [
          { label: 'Desiccant saturation (%)', data: fracs, borderColor: res.des.color,
            backgroundColor: res.des.color+'18', fill:true, tension:0.3, pointRadius:0, borderWidth:2 },
          { label: 'Full saturation (100%)', data: new Array(days.length).fill(100),
            borderColor:'#ef4444', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false }
        ]},
        options: { responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:10} } } },
          scales:{ x:{ title:{ display:true, text:'Days' }, ticks:{ font:{size:9} } },
            y:{ min:0, max:105, title:{ display:true, text:'Saturation (%)' },
              ticks:{ font:{size:9}, callback: v => v+'%' } } } }
      });
    }

    // Isotherm
    const cv3 = document.getElementById('des-iso-chart');
    if (cv3) {
      const iso = res.des.isotherm;
      window.chartInstances.desIso = new Chart(cv3.getContext('2d'), {
        type: 'line',
        data: { labels: iso.map(pt => pt[0]), datasets: [
          { label: res.des.name, data: iso.map(pt => pt[1]),
            borderColor: res.des.color, backgroundColor: res.des.color+'18',
            fill:true, tension:0.4, pointRadius:3, borderWidth:2 },
          { label: `Operating point (${p.RH_crit}% RH)`,
            data: iso.map(pt => Math.abs(pt[0] - p.RH_crit) < 5 ? des_interpCap(res.des.isotherm, p.RH_crit)*100 : null),
            borderColor:'#ef4444', pointBackgroundColor:'#ef4444', pointRadius:7, showLine:false }
        ]},
        options: { responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:10} } } },
          scales:{ x:{ title:{ display:true, text:'Relative Humidity (%)' }, ticks:{ font:{size:9} } },
            y:{ title:{ display:true, text:'Capacity (g H₂O / 100g)' }, ticks:{ font:{size:9} } } } }
      });
    }
  }
};

// ── Render ────────────────────────────────────────────────────────────
function renderPharmaUptake() {
  const c = document.getElementById('app-content');
  if (!c) return;

  const st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {};
  const wvtr_ref        = st.wvtr_ref        ?? 0.3;
  const T_ref           = st.T_ref           ?? 38;
  const RH_ref          = st.RH_ref          ?? 90;
  const Ea_kJ           = st.Ea_kJ           ?? 38;
  const T_store         = st.T_store         ?? 25;
  const RH_store        = st.RH_store        ?? 60;
  const area_cm2        = st.area_cm2        ?? 62;
  const shelf_years     = st.shelf_years     ?? 2;
  const headspace_ml    = st.headspace_ml    ?? 15;
  const RH_fill         = st.RH_fill         ?? 20;
  const drug_mass_g     = st.drug_mass_g     ?? 12;
  const mc_init         = st.mc_init         ?? 0.5;
  const mc_release_frac = st.mc_release_frac ?? 10;
  const RH_crit         = st.RH_crit         ?? 40;
  const safety_factor   = st.safety_factor   ?? 2.0;
  const des_type        = st.des_type        || 'silica_gel_a';

  // FIX #6: localStorage FIRST per WVTR e condizioni di test
  const lsResult = des_readLocalStorageRate();
  const calcRate  = lsResult?.total > 0
    ? lsResult.total
    : ((typeof State !== 'undefined' && State.calcResult?.total > 0) ? State.calcResult.total : 0);

  const lamName   = (typeof State !== 'undefined' && State.laminateName)
    ? State.laminateName
    : (lsResult?.laminateName || 'No laminate calculated');

  const lamStruct = (() => {
    if (typeof State !== 'undefined' && State.layers?.length) {
      return State.layers.filter(l => l.mid !== null && l.thick > 0).map(l => {
        const m = (typeof DB !== 'undefined') ? (DB.materials||[]).find(x => x.id === l.mid) : null;
        return m ? `${m.name} (${l.thick}µm)` : null;
      }).filter(Boolean).join(' / ') || (lsResult?.structure || '—');
    }
    return lsResult?.structure || '—';
  })();

  // FIX #6: condizioni di test da localStorage se State non disponibile
  const testCondStr = (() => {
    if (lsResult?.tRef != null) return `${lsResult.tRef}°C / ${lsResult.rhRef ?? 90}% RH`;
    if (typeof State !== 'undefined' && State.selCond) return `${State.selCond.temperature}°C / ${State.selCond.humidity}% RH`;
    return '—';
  })();

  const companyActive = typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive();

  const desOpts  = Object.entries(DESICCANT_DB).map(([k,d]) =>
    `<option value="${k}"${k===des_type?' selected':''}>${d.name}</option>`).join('');
  const storOpts = Object.entries(STORAGE_PRESETS).map(([k,d]) =>
    `<option value="${k}">${d.label}</option>`).join('');
  const contOpts = Object.entries(CONTAINER_GEOMETRY).map(([k,d]) =>
    `<option value="${k}"${k==='hdpe_60'?' selected':''}>${d.name}</option>`).join('');

  c.innerHTML = `
  <div class="grid grid-2" style="gap:1.2rem;align-items:start">

    <!-- LEFT — Form -->
    <div class="card" style="padding:0">

      <div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1rem;display:flex;align-items:center;gap:0.4rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
            <path d="M3 3h18v4H3zM3 7v14h18V7"/><line x1="12" y1="7" x2="12" y2="21"/>
          </svg>
          Desiccant Sizing Calculator
        </h2>
      </div>

      <!-- STEP 1: WVTR source -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 1. Barrier Film WVTR Source
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.75rem">
          <button id="des-src-btn-calc" class="btn btn-sm" onclick="DES.setBarrierSource('calc')"
            style="font-size:0.75rem;background:var(--primary);color:#fff;border:none">From Calculator</button>
          <button id="des-src-btn-db" class="btn btn-sm btn-outline" onclick="DES.setBarrierSource('db')"
            style="font-size:0.75rem">From Community DB</button>
          <button id="des-src-btn-company" class="btn btn-sm btn-outline" onclick="DES.setBarrierSource('company')"
            style="font-size:0.75rem${companyActive?'':';opacity:0.5;cursor:not-allowed'}"
            ${companyActive?'':'disabled'}>From Company DB</button>
        </div>

        <!-- Panel: Calculator -->
        <div id="des-panel-calc">
          <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:0.6rem;font-size:0.75rem">
            <div style="font-weight:700;margin-bottom:0.15rem">${lamName}</div>
            <div style="color:var(--text-light);word-break:break-word;margin-bottom:0.3rem;min-height:1.2em">${lamStruct}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem">
              <span>Calculated WVTR:</span>
              <strong style="color:var(--primary)">${calcRate > 0 ? calcRate.toFixed(5) : '-'} g/m²·day</strong>
            </div>
            <div id="des-calc-conditions" style="display:flex;justify-content:space-between;align-items:center;color:var(--text-light)">
              <span>Test conditions:</span>
              <span>${testCondStr}</span>
            </div>
          </div>
          ${calcRate <= 0 ? '<div class="alert alert-info" style="margin-top:0.45rem;font-size:0.8rem"><span>Run a calculation in the Calculator tab first, then return here.</span></div>' : ''}
          <div style="margin-top:0.5rem" class="form-group">
            <label style="font-size:0.72rem">Activation energy E<sub>a</sub> (kJ/mol) — for T correction to storage</label>
            <div style="display:flex;align-items:center;gap:0.4rem">
              <input type="number" id="des-ea" value="${Ea_kJ}" step="1" min="0" class="form-input" placeholder="0 = no correction">
              <span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap">kJ/mol</span>
            </div>
            <div class="hint"></div>
          </div>
        </div>

        <!-- Panel: Community DB -->
        <div id="des-panel-db" style="display:none">
          <div class="form-group" style="margin:0 0 0.5rem">
            <label style="font-size:0.75rem;font-weight:600">Select from Community Database</label>
            <select class="form-input" id="des-db-pick" onchange="DES.onDBPick(this.value)" style="font-size:0.78rem">
              <option value="">— Loading laminates… —</option>
            </select>
            <!-- Feedback condizioni di test del laminate selezionato -->
            <div id="des-db-conditions" style="margin-top:0.3rem;font-size:0.75rem;color:var(--text-light);font-style:italic"></div>
            <div class="hint" id="des-db-hint" style="margin-top:0.25rem"></div>
          </div>
          <!-- Campo Eᴀ editabile: pre-popolato dall'opzione selezionata, modificabile dall'utente -->
          <div class="form-group" style="margin:0">
            <label style="font-size:0.72rem">Activation energy E<sub>a</sub> (kJ/mol) — editable override</label>
            <div style="display:flex;align-items:center;gap:0.4rem">
              <input type="number" id="des-db-ea" value="35" step="1" min="0" class="form-input"
                placeholder="Pre-filled on selection">
              <span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap">kJ/mol</span>
            </div>
            <div class="hint"></div>
          </div>
        </div>

        <!-- Panel: Company DB -->
        <div id="des-panel-company" style="display:none">
          ${companyActive
            ? `<div class="form-group" style="margin:0"><label style="font-size:0.75rem;font-weight:600">Select from Company Laminates</label>
               <select class="form-input" id="des-co-pick" style="font-size:0.78rem"><option value="">Loading...</option></select></div>`
            : `<div style="font-size:0.75rem;color:var(--text-light);padding:0.4rem 0">Join a company to access proprietary laminate data. <a href="#" onclick="showCompanyModal?.();return false" style="color:var(--primary)">Join now</a></div>`}
        </div>

        <!-- Manual override -->
        <div style="margin-top:0.8rem;padding-top:0.6rem;border-top:1px dashed var(--border)">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.75rem;color:var(--text-light)">
            <input type="checkbox" id="des-manual-toggle" onchange="DES.toggleManualOverride(this.checked)">
            Override with manual WVTR value
          </label>
        </div>
        <div id="des-panel-manual" style="display:none;margin-top:0.5rem;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:0.6rem">
          <div style="font-size:0.72rem;font-weight:600;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">Manual input</div>
          <div class="grid grid-2" style="gap:0.5rem">
            <div class="form-group" style="margin:0"><label>WVTR (g/m²/day)</label><input type="number" id="des-rate-manual" value="0.5" step="any" class="form-input" oninput="DES.onManualRateChange()"></div>
            <div class="form-group" style="margin:0"><label>Test T (°C)</label><input type="number" id="des-tref" value="${T_ref}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Test RH (%)</label><input type="number" id="des-rhref" value="${RH_ref}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Eₐ (kJ/mol)</label><input type="number" id="des-ea-man" value="${Ea_kJ}" class="form-input"><div class="hint">LDPE≈35 · EVOH≈55 · Al≈0</div></div>
          </div>
        </div>

        <div style="margin-top:0.8rem;background:var(--primary-light);border-radius:6px;padding:0.5rem 0.75rem;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.75rem;font-weight:600">WVTR at storage conditions:</span>
          <strong id="des-active-rate" style="color:var(--primary);font-size:0.9rem">${calcRate > 0 ? calcRate.toFixed(5) : '-'} g/m²·day</strong>
        </div>
      </div>

      <!-- STEP 2: Desiccant type -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 2. Desiccant Type
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">
          <div class="form-group" style="margin:0 0 0.5rem">
            <label>Material</label>
            <select id="des-des-type" class="form-input" onchange="DES.onDesTypeChange()">${desOpts}</select>
          </div>
          <div id="des-des-desc" style="font-size:0.72rem;color:var(--text-light);padding:0.35rem 0.6rem;background:#f8fafc;border-radius:6px;border:1px solid var(--border);margin-bottom:0.6rem">
            ${DESICCANT_DB[des_type].desc}
          </div>
          <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-light);margin-bottom:0.3rem">Capacity at key RH levels</div>
          <div id="des-isotherm-bars" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.25rem"></div>
        </div>
      </div>

      <!-- STEP 3: Storage conditions -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--warning);font-weight:600;font-size:0.85rem">
          ▼ 3. Storage Conditions & Shelf Life
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">
          <div class="form-group" style="margin:0 0 0.6rem">
            <label>Preset condition</label>
            <select id="des-stor-preset" class="form-input" onchange="DES.onStorPreset(this.value)">${storOpts}</select>
          </div>
          <div class="grid grid-2" style="gap:0.5rem">
            <div class="form-group" style="margin:0"><label>Storage T (°C)</label><input type="number" id="des-tstore" value="${T_store}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>External RH (%)</label><input type="number" id="des-rhstore" value="${RH_store}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Shelf life (yr)</label><input type="number" id="des-shelf" value="${shelf_years}" step="0.5" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Max internal RH (%)</label><input type="number" id="des-rhcrit" value="${RH_crit}" class="form-input"><div class="hint"></div></div>
          </div>
        </div>
      </div>

      <!-- STEP 4: Container geometry + fill -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--purple);font-weight:600;font-size:0.85rem">
          ▼ 4. Container Geometry & Fill Conditions
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">
          <div class="form-group" style="margin:0 0 0.4rem">
            <label>Container type <span style="font-size:0.68rem;color:var(--text-light);font-weight:400">(sets geometry — barrier film is set in Step 1)</span></label>
            <select id="des-cont-preset" class="form-input" onchange="DES.onContPreset(this.value)">${contOpts}</select>
          </div>
          <div class="grid grid-2" style="gap:0.5rem;margin-top:0.5rem">
            <div class="form-group" style="margin:0"><label>Permeable area (cm²)</label><input type="number" id="des-area" value="${area_cm2}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Headspace volume (mL)</label><input type="number" id="des-headspace" value="${headspace_ml}" step="0.5" class="form-input"><div class="hint"></div></div>
            <div class="form-group" style="margin:0"><label>RH at fill/sealing (%)</label><input type="number" id="des-rhfill" value="${RH_fill}" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Product mass (g)</label><input type="number" id="des-drugmass" value="${drug_mass_g}" step="0.1" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>Product initial MC (%)</label><input type="number" id="des-mcinit" value="${mc_init}" step="0.01" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>MC release fraction (%)</label><input type="number" id="des-mcrelease" value="${mc_release_frac}" class="form-input"><div class="hint"></div></div>
          </div>
        </div>
      </div>

      <!-- STEP 5: Safety & calculate -->
      <div style="padding:1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 5. Safety Factor
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:1rem">
          <div class="form-group" style="margin:0">
            <label>Safety factor (×)</label>
            <input type="number" id="des-safety" value="${safety_factor}" step="0.1" min="1" class="form-input">
            <div class="hint"></div>
          </div>
        </div>
        <button class="btn btn-danger btn-full" onclick="DES.calculate()" style="padding:0.8rem;font-size:0.9rem">
          ▶ Calculate Desiccant Requirement
        </button>
      </div>
    </div>

    <!-- RIGHT — Results sticky -->
    <div style="position:sticky;top:1rem;height:fit-content">
      <div class="card" id="des-result-panel">
        <div style="text-align:center;padding:2rem;color:var(--text-light)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:0.5rem;opacity:0.3">
            <path d="M3 3h18v4H3zM3 7v14h18V7"/><line x1="12" y1="7" x2="12" y2="21"/>
          </svg>
          <p>Configure parameters and calculate to see desiccant requirements</p>
        </div>
      </div>
      <div id="des-charts-wrap" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Moisture Budget Breakdown</h3>
          <div class="chart-mini" style="height:200px"><canvas id="des-budget-chart"></canvas></div>
        </div>
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Desiccant Saturation Over Time</h3>
          <div class="chart-mini" style="height:240px"><canvas id="des-sat-chart"></canvas></div>
        </div>
        <div class="card">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Sorption Isotherm</h3>
          <div class="chart-mini" style="height:220px"><canvas id="des-iso-chart"></canvas></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      var btn = document.getElementById('des-src-btn-company');
      if (btn && typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive()) {
        btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      }
    }, 500);
  </script>

  ${renderDesiccantMethodology()}
  `;

  DES._renderIsothermBars(DESICCANT_DB[des_type]);
}

// ── Methodology ───────────────────────────────────────────────────────
function renderDesiccantMethodology() {
  const h3 = t => `<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary-dark);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">${t}</h3>`;
  const formula = t => `<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;font-family:'Courier New',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">${t}</div>`;

  return `
<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary);background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
  <div style="padding:1.5rem 1.75rem">
    <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.35rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1.2rem">
      Mechanics of Desiccant Sizing for Pharmaceutical Packaging
    </h2>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:0.97rem;line-height:1.85;color:#334155">

      <p>The preservation of moisture-sensitive pharmaceutical products over their intended shelf life depends not only on the barrier properties of the surrounding packaging film, but also on the capacity of any desiccant material placed inside the container to absorb the residual moisture that inevitably enters the system. A desiccant sizing calculation is therefore a mass balance exercise: one must quantify every source of water vapour that will accumulate inside a sealed container over time, and ensure that the chosen desiccant possesses sufficient capacity to adsorb that total moisture load before the internal relative humidity rises to a level that compromises product stability.</p>

      ${h3('The Three-Component Moisture Budget')}
      <p>The total moisture load is the sum of three independent contributions. The first and typically dominant one is <strong>film ingress</strong> — steady-state permeation of water vapour from the external environment through the container walls, described by the film's WVTR and the package surface area:</p>
      ${formula('Q_film (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000 × t (days)')}
      <p>The second contribution is <strong>headspace moisture at the time of sealing</strong>. Every container encloses a volume of air when it is closed. Treating the enclosed gas as ideal, the mass of water vapour trapped is:</p>
      ${formula('Q_head (mg) = V (m³) × (RH_fill / 100) × P_sat(T) / (R × T) × M_w × 1000')}
      <p>where P_sat(T) is the saturation vapour pressure in Pascal (Magnus–Tetens approximation), R = 8.314 J/(mol·K), T is the absolute sealing temperature in Kelvin, and M_w = 18 g/mol. The factor × 1000 converts from grams to milligrams. This term is frequently underestimated; for small containers sealed in poorly controlled environments it can represent a measurable fraction of the total budget. The third contribution is <strong>moisture released by the product itself</strong>, proportional to the initial moisture content of the solid dosage form and the fraction that desorbs into the headspace under storage conditions.</p>

      ${h3('Thermal Correction of the Barrier Rate')}
      <p>WVTR values are measured under standardised laboratory conditions — most commonly 38°C and 90% RH per ASTM F1249. To obtain the effective rate at actual storage conditions, two correction factors are applied. Temperature is corrected via the Arrhenius equation:</p>
      ${formula('F_T = exp [ (E_a / R) × (1/T_ref − 1/T_store) ]<br>F_RH = RH_store / RH_ref<br>WVTR_eff = WVTR_ref × F_T × F_RH')}
      <p>Activation energies span a wide range depending on the polymer: polyolefins (LDPE, PP) exhibit approximately 28–42 kJ/mol; polar films such as EVOH and polyamide show 45–70 kJ/mol due to stronger interaction between water molecules and the polymer matrix; aluminium foil has near-zero activation energy because moisture transport occurs through discrete physical defects rather than through the metal lattice itself.</p>

      ${h3('Desiccant Sorption Isotherms and Capacity')}
      <p>A desiccant adsorbs water vapour until thermodynamic equilibrium is reached between its moisture content and the surrounding atmosphere. The relationship between these quantities is described by the material's sorption isotherm — the central design datum for any sizing calculation. Silica gel displays a Type IV BET isotherm with broad capacity across the mid-humidity range, making it suitable for maintaining internal RH below 40–50%. Molecular sieves exhibit a Type I (Langmuir) isotherm with very rapid uptake at low relative humidities and a plateau reached at only 10–20% RH, making them the preferred choice for highly moisture-reactive products such as effervescent tablets and lyophilised biologics. The required desiccant mass is:</p>
      ${formula('Cap_eff (g H₂O / g desiccant) = isotherm(RH_crit)<br>W_required (g) = Q_total (mg) / 1000 / Cap_eff')}

      ${h3('Safety Factor and the Saturation Timeline')}
      <p>The calculated required mass represents the theoretical minimum under ideal conditions. In practice, a safety factor of at least 2× is universally applied to account for batch-to-batch variation in film WVTR (typically ±15–25%), fluctuating room humidity during the sealing operation, variable product moisture content, and potential pre-exposure of the desiccant during handling and storage before use. For high-value products — lyophilised injectables, effervescent tablets, moisture-reactive active ingredients — safety factors of 3–4× are common. The saturation timeline in the results panel shows the cumulative moisture absorbed over time; the day on which the desiccant reaches full saturation must lie beyond the end of the shelf life for the product to remain protected.</p>

      ${h3('Alignment with International Standards')}
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:0.88rem;color:var(--text-light);margin-top:0.75rem;line-height:1.8">
        • <strong>ASTM F1249-20</strong>: Water Vapor Transmission Rate Through Plastic Film — modulated infrared sensor method<br>
        • <strong>ISO 15106-3:2003</strong>: Water vapour transmission rate — electrolytic detection sensor method<br>
        • <strong>ICH Q1A(R2) (2003)</strong>: Stability Testing of New Drug Substances and Products — climatic zone reference conditions<br>
        • <strong>USP &lt;671&gt;</strong>: Containers — Performance Testing, moisture permeation for pharmaceutical containers<br>
        • <strong>WHO Technical Report Series No. 863 (1996)</strong>: Climatic zone classification for global stability testing
      </div>
    </div>
  </div>
</div>

<div style="background:#fff8f8;border:1.5px solid #fca5a5;border-radius:var(--radius,12px);padding:1.1rem 1.4rem;margin-top:1.1rem">
  <h3 style="font-size:0.95rem;font-weight:700;color:var(--danger,#dc2626);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.35rem">⚠ Regulatory Disclaimer & Model Limitations</h3>
  ${[
    ['For R&D Screening and Concept Development Only', 'The calculations produced by this tool are mathematical predictions based on simplified physical models and literature isotherm data. They are intended to support early-stage packaging design decisions and desiccant pre-selection. They do not constitute validated stability data and must not be used as the sole basis for regulatory submissions, commercial shelf-life labelling, or product safety declarations.'],
    ['Experimental Validation Is Mandatory', 'All desiccant sizing predictions must be verified through real-time and accelerated stability studies conducted in accordance with ICH Q1A(R2), USP ⟨671⟩, and applicable national regulatory requirements. Desiccant performance must be confirmed on the actual packaging system under controlled chamber conditions.'],
    ['Isotherm Data and Model Assumptions', 'Sorption isotherm data are representative literature values. Real commercial products may deviate depending on manufacturing process, particle size, and prior storage history. The model assumes thermodynamic equilibrium, linear interpolation between data points, steady-state film permeation at constant temperature and humidity, and no seal permeation or mechanical damage.'],
    ['Regulatory Compliance', 'This tool does not provide regulatory advice. Packaging design must comply with FDA 21 CFR Parts 211 and 610, EU GMP Annex 1, ICH Q1A(R2), USP ⟨661⟩ and ⟨671⟩, and country-specific requirements. Consult a qualified pharmaceutical packaging engineer before finalising specifications.']
  ].map(([t,b]) => `<div style="margin-bottom:0.8rem;font-size:0.88rem;color:#374151;line-height:1.65"><strong style="color:var(--danger,#dc2626)">${t}. </strong>${b}</div>`).join('')}
</div>`;
}

if (typeof window !== 'undefined') {
  window.DES = DES;
  window.renderPharmaUptake = renderPharmaUptake;
}
