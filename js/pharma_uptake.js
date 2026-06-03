// ====================================================================
// pharma_uptake.js  —  Desiccant Sizing Calculator  v3
// State.tab === 'pharma-uptake'
// Style: identical to pharma_mvtr.js / shelflife.js
// ====================================================================

// ── Desiccant database ───────────────────────────────────────────────
var DESICCANT_DB = {
  silica_gel_a: {
    name: 'Silica Gel Type A',
    desc: 'Standard silica gel – wide RH working range, most common pharma grade',
    color: '#2563eb',
    isotherm: [[0,0],[10,5],[20,10],[30,14],[40,18],[50,22],[60,28],[70,35],[80,43],[90,52],[100,60]]
  },
  silica_gel_b: {
    name: 'Silica Gel Type B (Indicating)',
    desc: 'Colour-indicating silica gel – visual saturation check',
    color: '#7c3aed',
    isotherm: [[0,0],[10,3],[20,6],[30,10],[40,14],[50,19],[60,25],[70,32],[80,40],[90,50],[100,58]]
  },
  mol_sieve_3a: {
    name: 'Molecular Sieve 3Å',
    desc: 'Zeolite – very low RH control, lyophilised biologics, effervescent tablets',
    color: '#16a34a',
    isotherm: [[0,0],[5,14],[10,18],[20,20],[30,21],[40,21.5],[50,22],[60,22],[70,22],[80,22],[90,22],[100,22]]
  },
  mol_sieve_4a: {
    name: 'Molecular Sieve 4Å',
    desc: 'Zeolite – broad spectrum, USP/NF grade',
    color: '#0891b2',
    isotherm: [[0,0],[5,16],[10,20],[20,23],[30,24],[40,24.5],[50,25],[60,25],[70,25],[80,25],[90,25],[100,25]]
  },
  calcium_chloride: {
    name: 'Calcium Chloride',
    desc: 'Very high capacity – aggressive moisture removal, not for direct contact',
    color: '#dc2626',
    isotherm: [[0,0],[10,20],[20,50],[30,90],[40,150],[50,220],[60,310],[70,400],[80,500],[90,600],[100,700]]
  },
  montmorillonite: {
    name: 'Montmorillonite Clay',
    desc: 'Cost-effective – good mid-range RH performance',
    color: '#d97706',
    isotherm: [[0,0],[10,4],[20,8],[30,12],[40,16],[50,20],[60,25],[70,31],[80,38],[90,46],[100,54]]
  }
};

// ── Container presets ────────────────────────────────────────────────
var CONTAINER_PRESETS = {
  hdpe_30: {
    name: 'HDPE Bottle 30 mL',
    area_cm2: 42, headspace_ml: 8, drug_mass_g: 5
  },
  hdpe_60: {
    name: 'HDPE Bottle 60 mL',
    area_cm2: 62, headspace_ml: 15, drug_mass_g: 12
  },
  hdpe_120: {
    name: 'HDPE Bottle 120 mL',
    area_cm2: 96, headspace_ml: 25, drug_mass_g: 25
  },
  hdpe_200: {
    name: 'HDPE Bottle 200 mL',
    area_cm2: 140, headspace_ml: 40, drug_mass_g: 50
  },
  blister_alu: {
    name: 'Alu-Alu Blister Strip (10 cav.)',
    area_cm2: 20, headspace_ml: 1, drug_mass_g: 2
  },
  blister_pvdc: {
    name: 'PVDC Blister Strip (10 cav.)',
    area_cm2: 20, headspace_ml: 1, drug_mass_g: 2
  },
  sachet_foil: {
    name: 'Foil Sachet 5 g',
    area_cm2: 30, headspace_ml: 3, drug_mass_g: 5
  },
  pouch_small: {
    name: 'Stand-Up Pouch 50 mL',
    area_cm2: 80, headspace_ml: 10, drug_mass_g: 20
  },
  custom: {
    name: 'Custom…',
    area_cm2: null, headspace_ml: null, drug_mass_g: null
  }
};

// ── Storage condition presets ────────────────────────────────────────
var STORAGE_PRESETS = {
  zone1:  { label: 'ICH Zone I  — 21°C / 45% RH (Temperate)',              T: 21, RH: 45 },
  zone2:  { label: 'ICH Zone II — 25°C / 60% RH (Subtropical)',            T: 25, RH: 60 },
  zone3a: { label: 'ICH Zone IIIa — 40°C / 15% RH (Hot Dry)',              T: 40, RH: 15 },
  zone4a: { label: 'ICH Zone IVa — 40°C / 75% RH (Hot Humid)',             T: 40, RH: 75 },
  zone4b: { label: 'ICH Zone IVb — 30°C / 75% RH (Hot Very Humid, ASEAN)', T: 30, RH: 75 },
  acc:    { label: 'ICH Accelerated — 40°C / 75% RH',                      T: 40, RH: 75 },
  int:    { label: 'ICH Intermediate — 30°C / 65% RH',                     T: 30, RH: 65 },
  rt:     { label: 'Room temperature — 25°C / 50% RH',                     T: 25, RH: 50 },
  cold:   { label: 'Cold chain — 5°C / 40% RH',                            T:  5, RH: 40 },
  custom: { label: 'Custom…',                                               T: null, RH: null }
};

// ── Core model ───────────────────────────────────────────────────────
function psat_Pa(T) {
  return 610.94 * Math.exp(17.625 * T / (T + 243.04));
}

function interpCapacity(isotherm, rh) {
  rh = Math.max(0, Math.min(100, rh));
  for (var i = 0; i < isotherm.length - 1; i++) {
    if (rh >= isotherm[i][0] && rh <= isotherm[i+1][0]) {
      var t = (rh - isotherm[i][0]) / (isotherm[i+1][0] - isotherm[i][0]);
      return (isotherm[i][1] + t * (isotherm[i+1][1] - isotherm[i][1])) / 100;
    }
  }
  return isotherm[isotherm.length-1][1] / 100;
}

function wvtrEff(wvtr_ref, Ea_kJ, T_ref, T_store, RH_ref, RH_store) {
  var R   = 8.314;
  var Ea_J = Ea_kJ * 1000;
  var arrF = Ea_J > 0
    ? Math.exp(-(Ea_J / R) * (1 / (T_store + 273.15) - 1 / (T_ref + 273.15)))
    : 1;
  var rhF = RH_ref > 0 ? RH_store / RH_ref : 1;
  return wvtr_ref * arrF * rhF;
}

function calcDesiccant(p) {
  var des = DESICCANT_DB[p.des_type] || DESICCANT_DB['silica_gel_a'];
  var wvtr_e = wvtrEff(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.T_store, p.RH_ref, p.RH_store);
  var A_m2   = p.area_cm2 / 1e4;
  var t_days = p.shelf_years * 365;

  var Q_film = wvtr_e * A_m2 * 1000 * t_days;
  var Ps     = psat_Pa(p.T_store);
  var Q_head = (p.headspace_ml / 1e6) * (p.RH_fill / 100) * Ps
               / (8.314 * (p.T_store + 273.15)) * 18 * 1e6;
  var Q_prod = p.drug_mass_g * (p.mc_init / 100) * 1000 * (p.mc_release_frac / 100);
  var Q_total = Q_film + Q_head + Q_prod;

  var cap_eff       = interpCapacity(des.isotherm, p.RH_crit);
  var W_required    = cap_eff > 0 ? Q_total / 1000 / cap_eff : Infinity;
  var W_recommended = W_required * p.safety_factor;

  var timeline = [];
  var cap_total_mg = W_recommended * cap_eff * 1000;
  var step = Math.max(1, Math.floor(t_days / 200));
  for (var d = 0; d <= t_days; d += step) {
    var abs  = wvtr_e * A_m2 * 1000 * d + Q_head + Q_prod;
    var frac = Math.min(abs / cap_total_mg, 1);
    timeline.push({ t: d, absorbed: abs, frac: frac * 100 });
  }

  var days_sat = cap_total_mg > (Q_head + Q_prod)
    ? (cap_total_mg - Q_head - Q_prod) / (wvtr_e * A_m2 * 1000)
    : 0;

  return {
    wvtr_eff: wvtr_e, Q_film: Q_film, Q_head: Q_head, Q_prod: Q_prod,
    Q_total: Q_total, cap_eff_g_g: cap_eff, W_required: W_required,
    W_recommended: W_recommended, days_sat: days_sat,
    timeline: timeline, des: des, t_days: t_days
  };
}

// ── Main render ───────────────────────────────────────────────────────
function renderPharmaUptake() {
  var c = document.getElementById('app-content');
  if (!c) return;

  var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {};
  var wvtr_ref        = st.wvtr_ref        != null ? st.wvtr_ref        : 0.5;
  var T_ref           = st.T_ref           != null ? st.T_ref           : 38;
  var RH_ref          = st.RH_ref          != null ? st.RH_ref          : 90;
  var Ea_kJ           = st.Ea_kJ           != null ? st.Ea_kJ           : 35;
  var T_store         = st.T_store         != null ? st.T_store         : 25;
  var RH_store        = st.RH_store        != null ? st.RH_store        : 60;
  var area_cm2        = st.area_cm2        != null ? st.area_cm2        : 62;
  var shelf_years     = st.shelf_years     != null ? st.shelf_years     : 2;
  var headspace_ml    = st.headspace_ml    != null ? st.headspace_ml    : 15;
  var RH_fill         = st.RH_fill         != null ? st.RH_fill         : 20;
  var drug_mass_g     = st.drug_mass_g     != null ? st.drug_mass_g     : 12;
  var mc_init         = st.mc_init         != null ? st.mc_init         : 0.5;
  var mc_release_frac = st.mc_release_frac != null ? st.mc_release_frac : 10;
  var RH_crit         = st.RH_crit         != null ? st.RH_crit         : 40;
  var safety_factor   = st.safety_factor   != null ? st.safety_factor   : 2.0;
  var des_type        = st.des_type        || 'silica_gel_a';
  var des_source      = st.des_source      || 'calc';

  // ── Helpers ──────────────────────────────────────────────────────
  function field(id, label, val, unit, step, hint) {
    return '<div class="form-group" style="margin:0">' +
      '<label>' + label + '</label>' +
      '<div style="display:flex;align-items:center;gap:0.35rem">' +
      '<input type="number" id="' + id + '" value="' + val + '" step="' + (step||'any') +
      '" min="0" class="form-input" style="flex:1" oninput="onDesCalc()">' +
      '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap">' + unit + '</span>' +
      '</div>' +
      (hint ? '<div style="font-size:0.65rem;color:var(--text-light);margin-top:0.15rem">' + hint + '</div>' : '') +
      '</div>';
  }

  function stepHeader(n, label, color) {
    color = color || 'var(--primary)';
    return '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.65rem;' +
           'color:' + color + ';font-weight:600;font-size:0.85rem">▼ ' + n + '. ' + label + '</div>';
  }

  // ── Current rate from calculator ──────────────────────────────────
  var calcRate   = (typeof State !== 'undefined' && State.calcResult && State.calcResult.total > 0)
                   ? State.calcResult.total : 0;
  var lamName    = (typeof State !== 'undefined' && State.laminateName) ? State.laminateName : 'No laminate loaded';
  var lamStruct  = '';
  if (typeof State !== 'undefined' && State.layers && State.layers.length) {
    var parts = [];
    State.layers.forEach(function(l) {
      if (!l.mid) return;
      var m = (typeof DB !== 'undefined') ? (DB.materials || []).find(function(x){ return x.id === l.mid; }) : null;
      if (m) parts.push(m.name + ' ' + l.thick + 'µm');
    });
    lamStruct = parts.join(' / ');
  }

  var modeLabel = (typeof State !== 'undefined' && State.mode === 'otr') ? 'OTR' : 'WVTR';
  var modeUnit  = modeLabel === 'WVTR' ? 'g/m²/day' : 'cc/m²/day';

  // ── Desiccant options ─────────────────────────────────────────────
  var desOpts = '';
  Object.keys(DESICCANT_DB).forEach(function(k) {
    desOpts += '<option value="' + k + '"' + (k === des_type ? ' selected' : '') + '>' +
               DESICCANT_DB[k].name + '</option>';
  });

  // ── Storage preset options ────────────────────────────────────────
  var storOpts = '';
  Object.keys(STORAGE_PRESETS).forEach(function(k) {
    storOpts += '<option value="' + k + '">' + STORAGE_PRESETS[k].label + '</option>';
  });

  // ── Container preset options ──────────────────────────────────────
  var contOpts = '';
  Object.keys(CONTAINER_PRESETS).forEach(function(k) {
    contOpts += '<option value="' + k + '"' + (k === 'hdpe_60' ? ' selected' : '') + '>' +
                CONTAINER_PRESETS[k].name + '</option>';
  });

  // ════════════════════════════════════════════════════
  // PAGE
  // ════════════════════════════════════════════════════
  var html = '<div style="max-width:1200px;margin:0 auto;padding:1.5rem">';

  // Title (no breadcrumb — same as shelf life)
  html += '<div style="margin-bottom:1.25rem">';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem">Desiccant Sizing Calculator</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:720px">' +
          'Calculate the minimum desiccant mass required to maintain internal RH below a critical ' +
          'threshold for the full shelf life of a sealed pharmaceutical container.</p>';
  html += '</div>';

  html += '<div class="grid grid-2" style="gap:1.2rem;align-items:start">';

  // ════════════════════════════════════════════════════
  // LEFT — Form
  // ════════════════════════════════════════════════════
  html += '<div class="card" style="padding:0">';

  html += '<div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">';
  html += '<h2 style="margin:0;font-size:1rem;display:flex;align-items:center;gap:0.4rem">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">';
  html += '<path d="M3 3h18v4H3zM3 7v14h18V7"/><line x1="12" y1="7" x2="12" y2="21"/>';
  html += '</svg>Parameters</h2>';
  html += '</div>';

  // ── STEP 1: Desiccant type ────────────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(1, 'Desiccant Type');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div class="form-group" style="margin:0 0 0.5rem">';
  html += '<label>Material</label>';
  html += '<select id="pu-des-type" class="form-input" onchange="onDesTypeChange()">' + desOpts + '</select>';
  html += '</div>';
  html += '<div id="pu-des-desc" style="font-size:0.72rem;color:var(--text-light);padding:0.35rem 0.6rem;' +
          'background:#f8fafc;border-radius:6px;border:1px solid var(--border);margin-bottom:0.6rem">' +
          DESICCANT_DB[des_type].desc + '</div>';
  html += '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;' +
          'color:var(--text-light);margin-bottom:0.3rem">Capacity at key RH levels</div>';
  html += '<div id="pu-isotherm-bars" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.25rem"></div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 2: Barrier film — 3 source buttons ───────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(2, 'Barrier Film (' + modeLabel + ' Rate Source)');

  // Source buttons (identical to MVTR)
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.35rem;margin-bottom:0.65rem">';
  ['calc','db','manual'].forEach(function(src) {
    var labels = { calc:'From Calculator', db:'Community DB', manual:'Enter Manually' };
    var isActive = (src === des_source);
    html += '<button id="des-src-btn-' + src + '" class="src-btn' + (isActive ? ' active' : '') + '" ' +
            'onclick="desSetSource(\'' + src + '\')">' + labels[src] + '</button>';
  });
  html += '</div>';

  // Panel: From Calculator
  html += '<div id="des-panel-calc" style="' + (des_source === 'calc' ? '' : 'display:none') + '">';
  html += '<div class="source-panel">';
  html += '<div class="sp-name">' + lamName + '</div>';
  html += '<div class="sp-struct">' + (lamStruct || 'Run a calculation in the Calculator tab first.') + '</div>';
  html += '<div class="sp-row"><span>Calculated ' + modeLabel + ':</span>';
  html += '<span class="sp-val">' + (calcRate > 0 ? calcRate.toFixed(5) : '—') + ' ' + modeUnit + '</span></div>';
  html += '</div>';
  html += '<div class="alert alert-info" style="margin-top:0.4rem;font-size:0.8rem">';
  html += '<span>When the Calculator produces a result it automatically populates this field.</span></div>';
  html += '</div>';

  // Panel: Community DB
  html += '<div id="des-panel-db" style="' + (des_source === 'db' ? '' : 'display:none') + '">';
  html += '<div class="form-group" style="margin:0">';
  html += '<label>Select from Community Database</label>';
  html += '<select class="form-input" id="des-db-pick" onchange="desOnDBPick(this.value)" style="font-size:0.78rem">';
  html += '<option value="">— Select a validated laminate —</option>';
  html += '<optgroup label="Pharmaceutical Grade">';
  html += '<option value="0.002|38|90|35">PET 12µm / Al 9µm / LDPE 60µm — 0.002 g/m²/day</option>';
  html += '<option value="0.01|38|90|35">OPA 15µm / Al 12µm / LLDPE 80µm — 0.010 g/m²/day</option>';
  html += '<option value="0.05|38|90|50">PET 12µm / EVOH 12µm / PP 50µm — 0.050 g/m²/day</option>';
  html += '<option value="0.001|38|90|30">PVDC 40µm / OPA 15µm / Al 9µm / LDPE 50µm — 0.001 g/m²/day</option>';
  html += '</optgroup>';
  html += '<optgroup label="HDPE Bottle">';
  html += '<option value="0.3|23|50|38">HDPE 30mil bottle wall — 0.300 g/m²/day</option>';
  html += '<option value="0.8|23|50|38">HDPE 20mil bottle wall — 0.800 g/m²/day</option>';
  html += '</optgroup>';
  html += '</select>';
  html += '<div class="hint">Values at test conditions noted. Ea applied to correct to storage T.</div>';
  html += '</div>';
  html += '</div>';

  // Panel: Manual
  html += '<div id="des-panel-manual" style="' + (des_source === 'manual' ? '' : 'display:none') + ';' +
          'background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:0.65rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.5rem">';
  html += field('pu-wvtr',  modeLabel + ' value', wvtr_ref, modeUnit,  0.001);
  html += field('pu-tref',  'Test temperature',   T_ref,    '°C',      0.5);
  html += field('pu-rhref', 'Test RH',            RH_ref,   '%',       1);
  html += field('pu-ea',    'E<sub>a</sub>',       Ea_kJ,    'kJ/mol',  1, 'LDPE≈35 · EVOH≈55 · Al≈0');
  html += '</div>';
  html += '</div>';

  // Active rate banner (always visible)
  html += '<div class="rate-banner" style="margin-top:0.65rem">';
  html += '<span class="rb-label">Active ' + modeLabel + ':</span>';
  html += '<span class="rb-val" id="des-active-rate">— ' + modeUnit + '</span>';
  html += '</div>';

  // Container area (shared, always visible)
  html += '<div style="margin-top:0.65rem">';
  html += field('pu-area', 'Container permeable area', area_cm2, 'cm²', 1, 'Total film surface exposed to external atmosphere');
  html += '</div>';

  html += '</div>'; // end step 2

  // ── STEP 3: Storage conditions — dropdown + editable fields ───────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(3, 'Storage Conditions & Shelf Life', 'var(--warning)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';

  html += '<div class="form-group" style="margin:0 0 0.6rem">';
  html += '<label>Preset conditions</label>';
  html += '<select id="pu-stor-preset" class="form-input" onchange="desOnStorPreset(this.value)">' + storOpts + '</select>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.55rem">';
  html += field('pu-tstore',  'Storage T',      T_store,     '°C',  0.5);
  html += field('pu-rhstore', 'External RH',    RH_store,    '%',   1);
  html += field('pu-shelf',   'Shelf life',      shelf_years, 'yr',  0.5);
  html += field('pu-rhcrit',  'Max internal RH', RH_crit,     '%',   1, 'Stability threshold for product');
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 4: Container & fill ───────────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(4, 'Container & Fill Conditions', 'var(--purple,#8b5cf6)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';

  html += '<div class="form-group" style="margin:0 0 0.6rem">';
  html += '<label>Container type</label>';
  html += '<select id="pu-cont-preset" class="form-input" onchange="desOnContPreset(this.value)">' + contOpts + '</select>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.55rem">';
  html += field('pu-headspace',    'Headspace volume',    headspace_ml,     'mL',  0.5,  'Air volume at sealing');
  html += field('pu-rhfill',       'RH at fill/sealing',  RH_fill,          '%',   1,    'Room RH during packaging');
  html += field('pu-drugmass',     'Product mass',        drug_mass_g,      'g',   0.1);
  html += field('pu-mcinit',       'Product initial MC',  mc_init,          '%',   0.01, 'Moisture content at sealing');
  html += field('pu-mcrelease',    'MC release fraction', mc_release_frac,  '%',   1,    '% of product MC released to headspace');
  html += field('pu-safety',       'Safety factor',       safety_factor,    '×',   0.1,  'Recommended ≥ 2× (industry standard)');
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // ── CTA ───────────────────────────────────────────────────────────
  html += '<div style="padding:1rem">';
  html += '<button class="btn btn-danger btn-full" onclick="onDesCalc()" ' +
          'style="padding:0.8rem;font-size:0.9rem">▶ Calculate Desiccant Requirement</button>';
  html += '</div>';

  html += '</div>'; // end left card

  // ════════════════════════════════════════════════════
  // RIGHT — Results sticky
  // ════════════════════════════════════════════════════
  html += '<div style="position:sticky;top:1rem;height:fit-content">';

  html += '<div class="card" id="pu-result-panel">';
  html += '<div style="text-align:center;padding:2rem;color:var(--text-light)">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'style="width:48px;height:48px;margin-bottom:0.5rem;opacity:0.3">';
  html += '<path d="M3 3h18v4H3zM3 7v14h18V7"/><line x1="12" y1="7" x2="12" y2="21"/>';
  html += '</svg>';
  html += '<p>Configure parameters and calculate to see desiccant requirements</p>';
  html += '</div></div>';

  html += '<div id="pu-charts-wrap" style="display:none;margin-top:1rem">';
  html += '<div class="card" style="margin-bottom:1rem"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Moisture Budget Breakdown</h3>';
  html += '<div class="chart-mini" style="height:200px"><canvas id="pu-budget-chart"></canvas></div></div>';
  html += '<div class="card" style="margin-bottom:1rem"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Desiccant Saturation Over Time</h3>';
  html += '<div class="chart-mini" style="height:240px"><canvas id="pu-sat-chart"></canvas></div></div>';
  html += '<div class="card"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Sorption Isotherm</h3>';
  html += '<div class="chart-mini" style="height:220px"><canvas id="pu-iso-chart"></canvas></div></div>';
  html += '</div>';

  html += '</div>'; // end right col
  html += '</div>'; // end grid

  // ── Methodology & Disclaimer ──────────────────────────────────────
  html += _desMethodologyHTML();
  html += _desDisclaimerHTML();

  html += '</div>'; // end outer wrapper

  c.innerHTML = html;

  // ── Expose globals ────────────────────────────────────────────────
  window.desSetSource = function(src) {
    if (typeof State !== 'undefined' && State.pharmaUptake) State.pharmaUptake.des_source = src;
    ['calc','db','manual'].forEach(function(s) {
      var btn = document.getElementById('des-src-btn-' + s);
      var pan = document.getElementById('des-panel-' + s);
      if (btn) btn.classList.toggle('active', s === src);
      if (pan) pan.style.display = s === src ? '' : 'none';
    });
    _desUpdateBanner();
  };

  window.desOnDBPick = function(val) {
    if (!val) return;
    var parts = val.split('|');
    var r = document.getElementById('pu-wvtr');
    var t = document.getElementById('pu-tref');
    var rh = document.getElementById('pu-rhref');
    var ea = document.getElementById('pu-ea');
    // Fields may be hidden; store values for calc
    if (r)  r.value  = parts[0];
    if (t)  t.value  = parts[1];
    if (rh) rh.value = parts[2];
    if (ea) ea.value = parts[3] || 35;
    _desUpdateBanner();
    onDesCalc();
  };

  window.desOnStorPreset = function(key) {
    var pr = STORAGE_PRESETS[key];
    if (!pr || pr.T === null) return;
    var tEl  = document.getElementById('pu-tstore');
    var rhEl = document.getElementById('pu-rhstore');
    if (tEl)  tEl.value  = pr.T;
    if (rhEl) rhEl.value = pr.RH;
    onDesCalc();
  };

  window.desOnContPreset = function(key) {
    var pr = CONTAINER_PRESETS[key];
    if (!pr || pr.area_cm2 === null) return;
    var aEl  = document.getElementById('pu-area');
    var hEl  = document.getElementById('pu-headspace');
    var dEl  = document.getElementById('pu-drugmass');
    if (aEl) aEl.value = pr.area_cm2;
    if (hEl) hEl.value = pr.headspace_ml;
    if (dEl) dEl.value = pr.drug_mass_g;
    onDesCalc();
  };

  window.onDesTypeChange = function() {
    var sel  = document.getElementById('pu-des-type');
    var desc = document.getElementById('pu-des-desc');
    if (sel && desc) desc.textContent = (DESICCANT_DB[sel.value] || {}).desc || '';
    _renderIsothermBars(DESICCANT_DB[sel ? sel.value : 'silica_gel_a']);
    onDesCalc();
  };

  _desUpdateBanner();
  _renderIsothermBars(DESICCANT_DB[des_type]);
  setTimeout(onDesCalc, 60);
}

// ── Banner helper ─────────────────────────────────────────────────────
function _desUpdateBanner() {
  var banner = document.getElementById('des-active-rate');
  if (!banner) return;
  var rate = _desGetRate();
  var modeUnit = (typeof State !== 'undefined' && State.mode === 'otr') ? 'cc/m²/day' : 'g/m²/day';
  banner.textContent = rate > 0 ? rate.toFixed(5) + ' ' + modeUnit : '—';
}

function _desGetRate() {
  var src = 'calc';
  var btn = document.getElementById('des-src-btn-calc');
  if (btn && btn.classList.contains('active')) src = 'calc';
  var btnDB = document.getElementById('des-src-btn-db');
  if (btnDB && btnDB.classList.contains('active')) src = 'db';
  var btnM = document.getElementById('des-src-btn-manual');
  if (btnM && btnM.classList.contains('active')) src = 'manual';

  if (src === 'calc') {
    return (typeof State !== 'undefined' && State.calcResult && State.calcResult.total > 0)
      ? State.calcResult.total : 0;
  }
  if (src === 'db') {
    var pick = document.getElementById('des-db-pick');
    if (pick && pick.value) return parseFloat(pick.value.split('|')[0]) || 0;
    return 0;
  }
  // manual
  var el = document.getElementById('pu-wvtr');
  return el ? (parseFloat(el.value) || 0) : 0;
}

function _desGetRefConditions() {
  // For DB source read from hidden fields set by desOnDBPick, else from manual inputs
  var src = 'calc';
  ['calc','db','manual'].forEach(function(s) {
    var b = document.getElementById('des-src-btn-' + s);
    if (b && b.classList.contains('active')) src = s;
  });
  var get = function(id, fallback) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || fallback) : fallback;
  };
  return {
    wvtr_ref: _desGetRate(),
    T_ref:    get('pu-tref', 38),
    RH_ref:   get('pu-rhref', 90),
    Ea_kJ:    get('pu-ea', 35)
  };
}

// ── Calculation ───────────────────────────────────────────────────────
function onDesCalc() {
  _desUpdateBanner();
  var get = function(id, fb) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || (fb || 0)) : (fb || 0);
  };
  var ref = _desGetRefConditions();

  var p = {
    des_type:        (document.getElementById('pu-des-type') || {}).value || 'silica_gel_a',
    wvtr_ref:        ref.wvtr_ref,
    T_ref:           ref.T_ref,
    RH_ref:          ref.RH_ref,
    Ea_kJ:           ref.Ea_kJ,
    area_cm2:        get('pu-area', 62),
    T_store:         get('pu-tstore', 25),
    RH_store:        get('pu-rhstore', 60),
    shelf_years:     get('pu-shelf', 2) || 2,
    RH_crit:         get('pu-rhcrit', 40),
    headspace_ml:    get('pu-headspace', 15),
    RH_fill:         get('pu-rhfill', 20),
    drug_mass_g:     get('pu-drugmass', 12),
    mc_init:         get('pu-mcinit', 0.5),
    mc_release_frac: get('pu-mcrelease', 10),
    safety_factor:   get('pu-safety', 2) || 1
  };
  if (typeof State !== 'undefined') State.pharmaUptake = p;

  var res = calcDesiccant(p);

  // KPI helper
  function kpiBox(label, val, color, colorL, sub) {
    return '<div style="background:' + colorL + ';border:1px solid ' + color + ';' +
           'border-radius:12px;padding:1rem">' +
           '<div style="font-size:0.66rem;font-weight:700;letter-spacing:0.08em;' +
           'text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">' + label + '</div>' +
           '<div style="font-size:1.05rem;font-weight:800;color:' + color + ';line-height:1.25">' + val + '</div>' +
           (sub ? '<div style="font-size:0.68rem;color:var(--text-light);margin-top:0.2rem">' + sub + '</div>' : '') +
           '</div>';
  }

  var satOK  = res.days_sat > res.t_days;
  var satStr = satOK
    ? '> ' + res.t_days + ' days ✓'
    : res.days_sat.toFixed(0) + ' days ⚠';

  var kpis = '';
  kpis += kpiBox('Required desiccant',
    isFinite(res.W_required) ? res.W_required.toFixed(2) + ' g' : '—',
    '#2563eb', '#eff6ff', 'Without safety factor');
  kpis += kpiBox('Recommended desiccant',
    isFinite(res.W_recommended) ? res.W_recommended.toFixed(2) + ' g' : '—',
    '#16a34a', '#f0fdf4', p.safety_factor + '× safety factor');
  kpis += kpiBox('Total moisture load',
    res.Q_total.toFixed(2) + ' mg',
    '#d97706', '#fef3c7', 'Film + headspace + product');
  kpis += kpiBox('Saturation time',
    satStr,
    satOK ? '#16a34a' : '#dc2626',
    satOK ? '#f0fdf4' : '#fee2e2',
    satOK ? 'Full shelf life protected' : 'Increase desiccant or improve barrier');

  var panel = document.getElementById('pu-result-panel');
  if (panel) {
    panel.innerHTML =
      '<div style="animation:fadeIn 0.3s ease">' +
      '<div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);' +
      'border-radius:12px;margin-bottom:1rem">' +
      '<div style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1.2">' +
      (isFinite(res.W_recommended) ? res.W_recommended.toFixed(2) + ' g' : '—') + '</div>' +
      '<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.35rem;font-weight:500">' + res.des.name + '</div>' +
      '<span class="badge badge-blue" style="margin-top:0.5rem;display:inline-block">Recommended desiccant mass</span>' +
      '</div>' +
      // Budget bars
      '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:0.75rem;margin-bottom:1rem;font-size:0.82rem">' +
      '<div style="font-weight:700;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-light);margin-bottom:0.5rem">Moisture budget</div>' +
      _budgetRow('Film ingress',    res.Q_film,  res.Q_total, '#2563eb') +
      _budgetRow('Headspace fill',  res.Q_head,  res.Q_total, '#7c3aed') +
      _budgetRow('Product release', res.Q_prod,  res.Q_total, '#d97706') +
      '<div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;display:flex;justify-content:space-between;font-weight:700">' +
      '<span>Total</span><span>' + res.Q_total.toFixed(2) + ' mg</span></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' + kpis + '</div>' +
      '</div>';
  }

  var wrap = document.getElementById('pu-charts-wrap');
  if (wrap) wrap.style.display = 'block';

  setTimeout(function() { _renderDesCharts(p, res); }, 120);
}

function _budgetRow(label, val, total, color) {
  var pct = total > 0 ? val / total * 100 : 0;
  return '<div style="margin-bottom:0.4rem">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:0.15rem">' +
    '<span style="color:var(--text-light)">' + label + '</span>' +
    '<span style="font-weight:600">' + val.toFixed(2) + ' mg <span style="color:var(--text-light);font-weight:400">(' + pct.toFixed(0) + '%)</span></span>' +
    '</div>' +
    '<div style="height:4px;background:var(--border);border-radius:2px">' +
    '<div style="height:100%;width:' + Math.min(pct,100) + '%;background:' + color + ';border-radius:2px"></div>' +
    '</div></div>';
}

function _renderIsothermBars(des) {
  var container = document.getElementById('pu-isotherm-bars');
  if (!container || !des) return;
  [20,40,60,80,100].forEach(function(rh) {
    // already rendered via innerHTML below
  });
  container.innerHTML = [20,40,60,80,100].map(function(rh) {
    var cap = (interpCapacity(des.isotherm, rh) * 100).toFixed(1);
    return '<div style="text-align:center">' +
      '<div style="font-size:0.7rem;font-weight:700;color:' + des.color + '">' + cap + '%</div>' +
      '<div style="height:32px;background:var(--border);border-radius:3px;margin:0.2rem 0;position:relative">' +
      '<div style="position:absolute;bottom:0;left:0;right:0;height:' + Math.min(parseFloat(cap),100) + '%;' +
      'background:' + des.color + ';border-radius:3px;opacity:0.7"></div></div>' +
      '<div style="font-size:0.62rem;color:var(--text-light)">' + rh + '% RH</div>' +
      '</div>';
  }).join('');
}

function _renderDesCharts(p, res) {
  if (typeof Chart === 'undefined') return;
  ['_puBudgetChart','_puSatChart','_puIsoChart'].forEach(function(k) {
    if (window[k]) { window[k].destroy(); window[k] = null; }
  });

  var cv1 = document.getElementById('pu-budget-chart');
  if (cv1) {
    window._puBudgetChart = new Chart(cv1.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Film ingress','Headspace fill','Product release'],
        datasets: [{ data: [res.Q_film, res.Q_head, res.Q_prod],
          backgroundColor: ['rgba(37,99,235,0.8)','rgba(124,58,237,0.8)','rgba(217,119,6,0.8)'],
          borderColor: ['#2563eb','#7c3aed','#d97706'], borderWidth: 2 }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins: { legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:12 } },
          tooltip:{ callbacks:{ label:function(ctx){ return ctx.label+': '+ctx.parsed.toFixed(2)+' mg ('+
            (ctx.parsed/res.Q_total*100).toFixed(0)+'%)'; } } } } }
    });
  }

  var cv2 = document.getElementById('pu-sat-chart');
  if (cv2) {
    var days  = res.timeline.map(function(pt){ return pt.t; });
    var fracs = res.timeline.map(function(pt){ return pt.frac; });
    window._puSatChart = new Chart(cv2.getContext('2d'), {
      type:'line',
      data:{ labels:days, datasets:[
        { label:'Desiccant saturation (%)', data:fracs, borderColor:res.des.color,
          backgroundColor:res.des.color+'18', fill:true, tension:0.3, pointRadius:0, borderWidth:2 },
        { label:'Full saturation (100%)', data:new Array(days.length).fill(100),
          borderColor:'#ef4444', borderDash:[6,4], borderWidth:2, pointRadius:0, fill:false }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:10} } } },
        scales:{
          x:{ title:{ display:true, text:'Days' }, ticks:{ font:{size:9} } },
          y:{ min:0, max:105, title:{ display:true, text:'Saturation (%)' },
            ticks:{ font:{size:9}, callback:function(v){ return v+'%'; } } } } }
    });
  }

  var cv3 = document.getElementById('pu-iso-chart');
  if (cv3) {
    var iso    = res.des.isotherm;
    var isoRH  = iso.map(function(pt){ return pt[0]; });
    var isoCap = iso.map(function(pt){ return pt[1]; });
    window._puIsoChart = new Chart(cv3.getContext('2d'), {
      type:'line',
      data:{ labels:isoRH, datasets:[
        { label:res.des.name, data:isoCap, borderColor:res.des.color,
          backgroundColor:res.des.color+'18', fill:true, tension:0.4, pointRadius:3, borderWidth:2 },
        { label:'Operating point ('+p.RH_crit+'% RH)',
          data:isoRH.map(function(rh){ return Math.abs(rh - p.RH_crit) < 5 ? interpCapacity(res.des.isotherm, p.RH_crit)*100 : null; }),
          borderColor:'#ef4444', pointBackgroundColor:'#ef4444', pointRadius:7, showLine:false }
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ boxWidth:12, font:{size:10} } } },
        scales:{
          x:{ title:{ display:true, text:'Relative Humidity (%)' }, ticks:{ font:{size:9} } },
          y:{ title:{ display:true, text:'Capacity (g H₂O / 100g)' }, ticks:{ font:{size:9} } } } }
    });
  }
}

// ── Methodology ───────────────────────────────────────────────────────
function _desMethodologyHTML() {
  return '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid var(--primary);' +
  'border-radius:var(--radius,12px);box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-top:1.5rem">' +
  '<div style="padding:1.5rem 1.75rem">' +
  '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.35rem;color:var(--text,#0f172a);' +
  'border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1.2rem">' +
  'Mechanics of Desiccant Sizing for Pharmaceutical Packaging</h2>' +
  '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:0.97rem;line-height:1.85;color:#334155">' +

  '<p>The preservation of moisture-sensitive pharmaceutical products over their intended shelf life depends not only on the barrier properties of the surrounding packaging film, but also on the capacity of any desiccant material placed inside the container to absorb the residual moisture that inevitably penetrates the system. A desiccant sizing calculation is therefore a mass balance exercise: one must quantify every source of water vapour that will accumulate inside a sealed container over time, and ensure that the chosen desiccant possesses sufficient capacity to adsorb that total moisture load before the internal relative humidity rises to a level that compromises product stability.</p>' +

  _mcH3('The Three-Component Moisture Budget') +
  '<p>The total moisture load that the desiccant must manage over the shelf life of the product is the sum of three distinct contributions. Each arises from a different physical mechanism and must be characterised independently before a reliable sizing can be performed.</p>' +
  '<p>The first and typically dominant contribution is <strong>film ingress</strong> — the steady-state permeation of water vapour from the external storage environment through the walls of the container. Under steady-state conditions this flux is fully described by the moisture vapour transmission rate of the packaging film. The cumulative mass of water entering the container over the shelf life is:</p>' +
  _formula('Q_film (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000 × t (days)') +
  '<p>The second contribution is <strong>headspace moisture at the time of filling and sealing</strong>. Every sealed container encloses a volume of air at the moment of closure. Treating the enclosed gas as ideal, the mass of water vapour trapped in the headspace is:</p>' +
  _formula('Q_head (mg) = V (m³) × (RH_fill/100) × P_sat(T) / (R × T) × M_w × 10⁶') +
  '<p>where P_sat(T) is the saturation vapour pressure at the sealing temperature (Magnus–Tetens approximation), R is the universal gas constant (8.314 J mol⁻¹ K⁻¹), T is the absolute temperature in Kelvin, and M_w is the molar mass of water (0.018 kg/mol). This component is frequently underestimated in practice, yet for small containers with large headspace-to-volume ratios it can represent a substantial fraction of the total budget.</p>' +
  '<p>The third contribution is <strong>moisture released by the product itself</strong>. Pharmaceutical solids carry a residual moisture content that is in thermodynamic equilibrium with the manufacturing environment at the time of packaging. Once sealed, a fraction of this bound moisture partitions into the headspace gas phase. The magnitude of this contribution depends on the initial moisture content, the total product mass, and the fraction available to desorb — a parameter that should ideally be determined from desorption isotherm data or accelerated stability studies.</p>' +

  _mcH3('Thermal Correction of the Barrier Rate') +
  '<p>Laboratory WVTR measurements are performed under standardised reference conditions, most commonly 38°C and 90% relative humidity per ASTM F1249. To obtain the effective rate at actual storage conditions, two multiplicative correction factors are applied. The temperature correction follows the Arrhenius model of thermally activated diffusion:</p>' +
  _formula('F_T = exp [ (E_a / R) × (1/T_ref − 1/T_store) ]') +
  '<p>where E_a is the activation energy of permeation. Polyolefins such as LDPE and PP exhibit E_a of 28–42 kJ/mol; polar films such as EVOH and polyamide show 45–70 kJ/mol because water interacts strongly with polar groups in the matrix; aluminium foil has near-zero E_a because moisture transport occurs through discrete physical defects rather than through the metal lattice. The humidity correction is:</p>' +
  _formula('F_RH = RH_store / RH_ref     →     WVTR_eff = WVTR_ref × F_T × F_RH') +

  _mcH3('Desiccant Sorption Isotherms and Capacity') +
  '<p>A desiccant functions by adsorbing water vapour from the gas phase until thermodynamic equilibrium is reached. The relationship between its equilibrium moisture content and the ambient relative humidity is described by its sorption isotherm — the central design datum for any sizing calculation. Silica gel displays a Type IV BET isotherm with a broad working plateau across the mid-humidity range, suitable for maintaining RH below 40–50%. Molecular sieves exhibit a Type I (Langmuir) isotherm characterised by very rapid uptake at low relative humidities and a capacity plateau reached at only 10–20% RH — making them the material of choice for effervescent tablets, lyophilised biologics, and reactive active pharmaceutical ingredients. The required desiccant mass is:</p>' +
  _formula('Cap_eff (g/g) = isotherm(RH_crit)     →     W_required (g) = Q_total (mg) / 1000 / Cap_eff') +

  _mcH3('Safety Factor and the Saturation Timeline') +
  '<p>The calculated required mass represents the theoretical minimum. In engineering practice a safety factor is always applied to account for batch-to-batch WVTR variation (typically ±15–25% for commercial polymer films), fluctuating room humidity during sealing, variable product moisture content, and desiccant pre-exposure during handling. Industry practice and regulatory guidance consistently recommend a minimum safety factor of 2×; values of 3–4× are common for high-value or moisture-sensitive products such as lyophilised injectables. The saturation timeline shown in the results panel tracks the cumulative moisture absorbed as a function of time. The day on which the desiccant reaches full saturation must lie beyond the end of the intended shelf life for the product to remain protected throughout its commercial life.</p>' +

  _mcH3('Alignment with International Standards') +
  '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:0.88rem;color:var(--text-light,#64748b);margin-top:0.75rem;line-height:1.8">' +
  '• <strong>ASTM F1249-20</strong>: Water Vapor Transmission Rate Through Plastic Film — modulated infrared sensor method<br>' +
  '• <strong>ISO 15106-3:2003</strong>: Water vapour transmission rate — electrolytic detection sensor method<br>' +
  '• <strong>ICH Q1A(R2) (2003)</strong>: Stability Testing of New Drug Substances and Products — climatic zone reference conditions<br>' +
  '• <strong>USP &lt;671&gt;</strong>: Containers — Performance Testing, moisture permeation for pharmaceutical containers<br>' +
  '• <strong>ISO 18787:2017</strong>: Determination of water activity in food and food products<br>' +
  '• <strong>WHO Technical Report Series No. 863 (1996)</strong>: Climatic zone classification for global stability testing' +
  '</div>' +

  '</div></div></div>';
}

function _mcH3(text) {
  return '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
    'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
    text + '</h3>';
}

function _formula(text) {
  return '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.85rem;' +
    'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
    text + '</div>';
}

// ── Disclaimer ────────────────────────────────────────────────────────
function _desDisclaimerHTML() {
  return '<div style="background:#fff8f8;border:1.5px solid #fca5a5;border-radius:var(--radius,12px);' +
    'padding:1.1rem 1.4rem;margin-top:1.1rem">' +
    '<h3 style="font-size:0.95rem;font-weight:700;color:var(--danger,#dc2626);margin-bottom:0.75rem;' +
    'display:flex;align-items:center;gap:0.35rem">⚠ Regulatory Disclaimer & Model Limitations</h3>' +
    _dItem('For R&D Screening and Concept Development Only',
      'The calculations produced by this tool are mathematical predictions based on simplified physical models and literature isotherm data. They are intended to support early-stage packaging design decisions and desiccant pre-selection. They do not constitute validated stability data and must not be used as the sole basis for regulatory submissions, commercial shelf-life labelling, or product safety declarations.') +
    _dItem('Experimental Validation Is Mandatory',
      'All desiccant sizing predictions must be verified through real-time and accelerated stability studies conducted in accordance with ICH Q1A(R2), USP ⟨671⟩, and applicable national regulatory requirements. Stability chambers must be qualified and operated under controlled conditions. Desiccant performance must be confirmed on the actual packaging system.') +
    _dItem('Isotherm Data and Model Assumptions',
      'The sorption isotherm data included in this tool are representative literature values. Real commercial products may deviate depending on manufacturing process, particle size distribution, and prior storage history. The model assumes thermodynamic equilibrium between desiccant and internal atmosphere, linear interpolation between isotherm data points, steady-state film permeation at constant temperature and humidity, and no seal permeation, pinholes, or mechanical damage to the container.') +
    _dItem('Safety Factor Responsibility',
      'The safety factor is a user-defined input. The tool does not validate whether the chosen value is appropriate for a specific product, container, or regulatory market. The user is solely responsible for its justification based on the risk profile of the product and the variability of the manufacturing process.') +
    _dItem('Regulatory Compliance',
      'This tool does not provide regulatory advice. Packaging design and validation must comply with applicable regulations including FDA 21 CFR Parts 211 and 610, EU GMP Annex 1, ICH Q1A(R2), USP ⟨661⟩ and ⟨671⟩, and country-specific requirements. Consult a qualified pharmaceutical packaging engineer or regulatory specialist before finalising specifications.') +
    '</div>';
}

function _dItem(title, body) {
  return '<div style="margin-bottom:0.8rem;font-size:0.88rem;color:#374151;line-height:1.65">' +
    '<strong style="color:var(--danger,#dc2626)">' + title + '. </strong>' + body + '</div>';
}
