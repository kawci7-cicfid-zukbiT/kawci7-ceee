// ====================================================================
// pharma_uptake.js  —  Desiccant Sizing Calculator  v1
// Biomedical Analysis → Desiccant Sizing  (State.tab === 'pharma-uptake')
// Style: same as shelflife.js / pharma_mvtr
// ====================================================================

// ── Core model ───────────────────────────────────────────────────────
// Desiccant sizing for sealed pharmaceutical containers
//
// Moisture budget:
//   Q_film  (mg) = WVTR_eff × A_m2 × 1000 × t_days        [ingress through film]
//   Q_head  (mg) = V_L × RH_init/100 × Psat(T) / (R×T) × Mw × 1000  [headspace at fill]
//   Q_total (mg) = Q_film + Q_head
//
// Desiccant capacity (absorbed at RH_crit):
//   Cap_eff (mg/g) = Cap_rated × F_RH                      [interpolated from isotherm]
//
// Required desiccant:
//   W_des (g) = Q_total / Cap_eff
//
// Saturation timeline:
//   W_abs(t) = Q_film(t) + Q_head   [cumulative absorbed]
//   Fraction saturated = W_abs / (W_des × Cap_eff)
//   RH_internal(t) estimated via linear interpolation on isotherm

var DESICCANT_DB = {
  silica_gel_a: {
    name: 'Silica Gel Type A',
    desc: 'Standard silica gel – wide RH working range',
    color: '#2563eb',
    // [RH%, capacity g/100g]
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
    desc: 'Zeolite – very low RH control, pharmaceutical grade',
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
    desc: 'High capacity – aggressive moisture removal',
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

// Psat(T°C) in Pa — Antoine equation
function psat_Pa(T) {
  return 610.94 * Math.exp(17.625 * T / (T + 243.04));
}

// Interpolate capacity from isotherm at given RH%
function interpCapacity(isotherm, rh) {
  rh = Math.max(0, Math.min(100, rh));
  for (var i = 0; i < isotherm.length - 1; i++) {
    if (rh >= isotherm[i][0] && rh <= isotherm[i+1][0]) {
      var t = (rh - isotherm[i][0]) / (isotherm[i+1][0] - isotherm[i][0]);
      return (isotherm[i][1] + t * (isotherm[i+1][1] - isotherm[i][1])) / 100; // g/g
    }
  }
  return isotherm[isotherm.length-1][1] / 100;
}

// Arrhenius WVTR correction
function wvtrEff(wvtr_ref, Ea_kJ, T_ref, T_store, RH_ref, RH_store) {
  var R = 8.314;
  var Ea_J = Ea_kJ * 1000;
  var arrF = Ea_J > 0
    ? Math.exp(-(Ea_J / R) * (1 / (T_store + 273.15) - 1 / (T_ref + 273.15)))
    : 1;
  var rhF = RH_ref > 0 ? RH_store / RH_ref : 1;
  return wvtr_ref * arrF * rhF;
}

function calcDesiccant(p) {
  var des = DESICCANT_DB[p.des_type] || DESICCANT_DB['silica_gel_a'];

  // Effective WVTR at storage
  var wvtr_e = wvtrEff(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.T_store, p.RH_ref, p.RH_store);

  // Film ingress over shelf life
  var A_m2   = p.area_cm2 / 1e4;
  var t_days = p.shelf_years * 365;
  var Q_film = wvtr_e * A_m2 * 1000 * t_days; // mg

  // Headspace moisture at fill
  // n = PV/RT → mass = n × Mw; Mw(H2O)=18 g/mol; R=8.314 J/(mol·K)
  var Ps     = psat_Pa(p.T_store);
  var Q_head = (p.headspace_ml / 1e6) * (p.RH_fill / 100) * Ps / (8.314 * (p.T_store + 273.15)) * 18 * 1e6; // mg

  // Product moisture contribution (if product releases moisture)
  var Q_prod = p.drug_mass_g * (p.mc_init / 100) * 1000 * (p.mc_release_frac / 100); // mg

  var Q_total = Q_film + Q_head + Q_prod;

  // Desiccant capacity at RH_crit
  var cap_eff = interpCapacity(des.isotherm, p.RH_crit); // g H2O / g desiccant
  var W_required = cap_eff > 0 ? Q_total / 1000 / cap_eff : Infinity; // g desiccant

  // Safety factor
  var W_recommended = W_required * p.safety_factor;

  // Timeline: cumulative absorption vs desiccant capacity
  var timeline = [];
  var cap_total_mg = W_recommended * cap_eff * 1000; // total mg the desiccant can hold
  for (var d = 0; d <= t_days; d += Math.max(1, Math.floor(t_days / 200))) {
    var abs = wvtr_e * A_m2 * 1000 * d + Q_head + Q_prod;
    var frac = Math.min(abs / cap_total_mg, 1);
    // Estimate internal RH: interpolate inverse isotherm
    var rh_int = frac * p.RH_crit; // linear approximation
    timeline.push({ t: d, absorbed: abs, frac: frac * 100, rh_int: rh_int });
  }

  // Days to saturation
  var days_sat = cap_total_mg > (Q_head + Q_prod)
    ? (cap_total_mg - Q_head - Q_prod) / (wvtr_e * A_m2 * 1000)
    : 0;

  return {
    wvtr_eff:       wvtr_e,
    Q_film:         Q_film,
    Q_head:         Q_head,
    Q_prod:         Q_prod,
    Q_total:        Q_total,
    cap_eff_g_g:    cap_eff,
    W_required:     W_required,
    W_recommended:  W_recommended,
    days_sat:       days_sat,
    timeline:       timeline,
    des:            des,
    t_days:         t_days
  };
}

// ── Main render ───────────────────────────────────────────────────────
function renderPharmaUptake() {
  var c = document.getElementById('app-content');
  if (!c) return;

  var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {};

  var wvtr_ref      = st.wvtr_ref      != null ? st.wvtr_ref      : 0.5;
  var T_ref         = st.T_ref         != null ? st.T_ref         : 38;
  var RH_ref        = st.RH_ref        != null ? st.RH_ref        : 90;
  var Ea_kJ         = st.Ea_kJ         != null ? st.Ea_kJ         : 35;
  var T_store       = st.T_store       != null ? st.T_store       : 25;
  var RH_store      = st.RH_store      != null ? st.RH_store      : 60;
  var area_cm2      = st.area_cm2      != null ? st.area_cm2      : 50;
  var shelf_years   = st.shelf_years   != null ? st.shelf_years   : 2;
  var headspace_ml  = st.headspace_ml  != null ? st.headspace_ml  : 10;
  var RH_fill       = st.RH_fill       != null ? st.RH_fill       : 20;
  var drug_mass_g   = st.drug_mass_g   != null ? st.drug_mass_g   : 5;
  var mc_init       = st.mc_init       != null ? st.mc_init       : 0.5;
  var mc_release_frac = st.mc_release_frac != null ? st.mc_release_frac : 10;
  var RH_crit       = st.RH_crit       != null ? st.RH_crit       : 40;
  var safety_factor = st.safety_factor != null ? st.safety_factor : 2.0;
  var des_type      = st.des_type      || 'silica_gel_a';

  // ── Helpers ────────────────────────────────────────────────────────
  function field(id, label, val, unit, step, hint) {
    return '<div class="form-group" style="margin:0">' +
      '<label>' + label + '</label>' +
      '<div style="display:flex;align-items:center;gap:0.35rem">' +
      '<input type="number" id="' + id + '" value="' + val + '" step="' + (step || 'any') +
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

  // ── Desiccant type selector options ───────────────────────────────
  var desOpts = '';
  Object.keys(DESICCANT_DB).forEach(function(k) {
    var d = DESICCANT_DB[k];
    desOpts += '<option value="' + k + '"' + (k === des_type ? ' selected' : '') + '>' +
               d.name + '</option>';
  });

  // ── Page title ────────────────────────────────────────────────────
  var html = '<div style="max-width:1200px;margin:0 auto;padding:1.5rem">';
  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;' +
          'color:var(--text-light);margin-bottom:0.3rem">Biomedical Analysis</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem">Desiccant Sizing Calculator</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:720px">' +
          'Calculate the minimum desiccant mass required to maintain internal RH below a critical threshold ' +
          'for the full shelf life of a sealed pharmaceutical container (HDPE bottle, blister pouch, sachet).</p>';
  html += '</div>';

  // ── Two-column layout ──────────────────────────────────────────────
  html += '<div class="grid grid-2" style="gap:1.2rem;align-items:start">';

  // ════════════════════════════════════════════════════
  // LEFT — Form
  // ════════════════════════════════════════════════════
  html += '<div class="card" style="padding:0">';

  // Card header
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
  html += '<div class="form-group" style="margin:0 0 0.6rem">';
  html += '<label>Desiccant Material</label>';
  html += '<select id="pu-des-type" class="form-input" onchange="onDesCalc()">' + desOpts + '</select>';
  html += '</div>';
  html += '<div id="pu-des-desc" style="font-size:0.72rem;color:var(--text-light);margin-bottom:0.65rem;' +
          'padding:0.4rem 0.6rem;background:#f8fafc;border-radius:6px;border:1px solid var(--border)">' +
          DESICCANT_DB[des_type].desc + '</div>';
  // Isotherm preview bar
  html += '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;' +
          'color:var(--text-light);margin-bottom:0.3rem">Capacity at key RH levels</div>';
  html += '<div id="pu-isotherm-bars" style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.25rem"></div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 2: Barrier film ──────────────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(2, 'Barrier Film (WVTR)', 'var(--primary)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:0.55rem">';
  html += field('pu-wvtr',  'WVTR (test cond.)', wvtr_ref, 'g/m²/day', 0.001);
  html += field('pu-tref',  'Reference T',        T_ref,    '°C',       0.5);
  html += field('pu-rhref', 'Reference RH',       RH_ref,   '%',        1);
  html += field('pu-ea',    'Activation energy',  Ea_kJ,    'kJ/mol',   1, 'LDPE≈35 · EVOH≈55 · Al≈0');
  html += field('pu-area',  'Container area',     area_cm2, 'cm²',      1, 'Total permeable surface');
  html += '</div>';
  html += '<div style="margin-top:0.6rem;background:var(--primary-light);border-radius:6px;' +
          'padding:0.4rem 0.75rem;display:flex;justify-content:space-between;align-items:center">';
  html += '<span style="font-size:0.75rem;font-weight:600">WVTR<sub>eff</sub> at storage:</span>';
  html += '<strong id="pu-wvtr-eff" style="color:var(--primary);font-size:0.9rem">— g/m²/day</strong>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 3: Storage & shelf life ──────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(3, 'Storage Conditions & Shelf Life', 'var(--warning)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:0.55rem">';
  html += field('pu-tstore',  'Storage T',        T_store,     '°C',   0.5);
  html += field('pu-rhstore', 'External RH',      RH_store,    '%',    1);
  html += field('pu-shelf',   'Shelf life',        shelf_years, 'yr',   0.5);
  html += field('pu-rhcrit',  'Max internal RH',   RH_crit,     '%',    1, 'Threshold for product stability');
  html += '</div>';
  // ICH quick-select
  html += '<div style="margin-top:0.6rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;' +
          'color:var(--text-light);margin-bottom:0.3rem">ICH Q1A(R2) quick select</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.3rem">';
  [
    { label:'Zone I',   t:21, rh:45 },
    { label:'Zone II',  t:25, rh:60 },
    { label:'Zone IVa', t:40, rh:75 },
    { label:'Zone IVb', t:30, rh:75 }
  ].forEach(function(z) {
    html += '<button class="btn btn-sm btn-outline" style="font-size:0.65rem;padding:0.3rem 0.15rem" ' +
            'onclick="puSetZone(' + z.t + ',' + z.rh + ')">' +
            z.label + '<br><span style=\'font-size:0.6rem;color:var(--text-light)\'>' +
            z.t + '°C/' + z.rh + '%</span></button>';
  });
  html += '</div></div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 4: Container & fill ──────────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(4, 'Container & Fill Conditions', 'var(--purple,#8b5cf6)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:0.55rem">';
  html += field('pu-headspace',   'Headspace volume',   headspace_ml,     'mL',  0.5,  'Air volume inside sealed container');
  html += field('pu-rhfill',      'RH at fill/sealing', RH_fill,          '%',   1,    'Room RH during packaging');
  html += field('pu-drugmass',    'Product mass',       drug_mass_g,      'g',   0.1);
  html += field('pu-mcinit',      'Product initial MC', mc_init,          '%',   0.01, 'Moisture content at sealing');
  html += field('pu-mcrelease',   'MC release fraction',mc_release_frac,  '%',   1,    '% of product moisture released to headspace');
  html += field('pu-safety',      'Safety factor',      safety_factor,    '×',   0.1,  'Recommended ≥ 2× (ICH guideline)');
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
  // RIGHT — Results (sticky)
  // ════════════════════════════════════════════════════
  html += '<div style="position:sticky;top:1rem;height:fit-content">';

  html += '<div class="card" id="pu-result-panel">';
  html += '<div style="text-align:center;padding:2rem;color:var(--text-light)">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'style="width:48px;height:48px;margin-bottom:0.5rem;opacity:0.3">';
  html += '<path d="M3 3h18v4H3zM3 7v14h18V7"/><line x1="12" y1="7" x2="12" y2="21"/>';
  html += '</svg>';
  html += '<p>Configure parameters and calculate to see desiccant requirements</p>';
  html += '</div>';
  html += '</div>';

  html += '<div id="pu-charts-wrap" style="display:none;margin-top:1rem">';
  // Chart 1: moisture budget breakdown
  html += '<div class="card" style="margin-bottom:1rem">';
  html += '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Moisture Budget Breakdown</h3>';
  html += '<div class="chart-mini" style="height:200px"><canvas id="pu-budget-chart"></canvas></div>';
  html += '</div>';
  // Chart 2: desiccant saturation over time
  html += '<div class="card" style="margin-bottom:1rem">';
  html += '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Desiccant Saturation Over Time</h3>';
  html += '<div class="chart-mini" style="height:240px"><canvas id="pu-sat-chart"></canvas></div>';
  html += '</div>';
  // Chart 3: desiccant isotherm
  html += '<div class="card">';
  html += '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Sorption Isotherm</h3>';
  html += '<div class="chart-mini" style="height:220px"><canvas id="pu-iso-chart"></canvas></div>';
  html += '</div>';
  html += '</div>'; // end charts-wrap

  html += '</div>'; // end right col
  html += '</div>'; // end grid
  html += '</div>'; // end outer wrapper

  c.innerHTML = html;

  // Expose helpers globally
  window.puSetZone = function(t, rh) {
    var tEl = document.getElementById('pu-tstore');
    var rEl = document.getElementById('pu-rhstore');
    if (tEl) { tEl.value = t; }
    if (rEl) { rEl.value = rh; }
    onDesCalc();
  };

  window.onDesTypeChange = function() {
    var sel = document.getElementById('pu-des-type');
    if (!sel) return;
    var d = DESICCANT_DB[sel.value];
    var desc = document.getElementById('pu-des-desc');
    if (desc && d) desc.textContent = d.desc;
    onDesCalc();
  };

  // Re-wire select onchange (innerHTML loses event references)
  var desSelect = document.getElementById('pu-des-type');
  if (desSelect) desSelect.addEventListener('change', window.onDesTypeChange);

  setTimeout(onDesCalc, 60);
}

// ── Calculation + render ──────────────────────────────────────────────
function onDesCalc() {
  var get = function(id) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
  };
  var getString = function(id) {
    var el = document.getElementById(id);
    return el ? el.value : 'silica_gel_a';
  };

  var p = {
    des_type:        getString('pu-des-type'),
    wvtr_ref:        get('pu-wvtr'),
    T_ref:           get('pu-tref'),
    RH_ref:          get('pu-rhref'),
    Ea_kJ:           get('pu-ea'),
    area_cm2:        get('pu-area'),
    T_store:         get('pu-tstore'),
    RH_store:        get('pu-rhstore'),
    shelf_years:     get('pu-shelf') || 2,
    RH_crit:         get('pu-rhcrit'),
    headspace_ml:    get('pu-headspace'),
    RH_fill:         get('pu-rhfill'),
    drug_mass_g:     get('pu-drugmass'),
    mc_init:         get('pu-mcinit'),
    mc_release_frac: get('pu-mcrelease'),
    safety_factor:   get('pu-safety') || 1
  };

  if (typeof State !== 'undefined') State.pharmaUptake = p;

  var res = calcDesiccant(p);

  // Update WVTR-eff pill
  var pill = document.getElementById('pu-wvtr-eff');
  if (pill) pill.textContent = res.wvtr_eff.toFixed(5) + ' g/m²/day';

  // Update isotherm bars
  _renderIsothermBars(res.des);

  // ── KPI boxes ─────────────────────────────────────────────────────
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
  var satStr = res.days_sat > res.t_days
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
    satOK ? 'Desiccant lasts full shelf life' : 'Replace or increase desiccant');

  var panel = document.getElementById('pu-result-panel');
  if (panel) {
    panel.innerHTML =
      '<div style="animation:fadeIn 0.3s ease">' +
      // Hero
      '<div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);' +
      'border-radius:12px;margin-bottom:1rem">' +
      '<div style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1.2">' +
      (isFinite(res.W_recommended) ? res.W_recommended.toFixed(2) + ' g' : '—') + '</div>' +
      '<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.35rem;font-weight:500">' +
      res.des.name + '</div>' +
      '<span class="badge badge-blue" style="margin-top:0.5rem;display:inline-block">' +
      'Recommended desiccant mass</span>' +
      '</div>' +
      // Moisture budget detail
      '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;' +
      'padding:0.75rem;margin-bottom:1rem;font-size:0.82rem">' +
      '<div style="font-weight:700;margin-bottom:0.5rem;font-size:0.75rem;text-transform:uppercase;' +
      'letter-spacing:0.05em;color:var(--text-light)">Moisture budget</div>' +
      _budgetRow('Film ingress',   res.Q_film,  res.Q_total, '#2563eb') +
      _budgetRow('Headspace fill', res.Q_head,  res.Q_total, '#7c3aed') +
      _budgetRow('Product release',res.Q_prod,  res.Q_total, '#d97706') +
      '<div style="border-top:1px solid var(--border);margin-top:0.4rem;padding-top:0.4rem;' +
      'display:flex;justify-content:space-between;font-weight:700">' +
      '<span>Total</span><span>' + res.Q_total.toFixed(2) + ' mg</span></div>' +
      '</div>' +
      // KPIs
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' + kpis + '</div>' +
      '</div>';
  }

  var wrap = document.getElementById('pu-charts-wrap');
  if (wrap) wrap.style.display = 'block';

  setTimeout(function() { _renderDesCharts(p, res); }, 120);
}

function _budgetRow(label, val, total, color) {
  var pct = total > 0 ? (val / total * 100) : 0;
  return '<div style="margin-bottom:0.4rem">' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:0.15rem">' +
    '<span style="color:var(--text-light)">' + label + '</span>' +
    '<span style="font-weight:600">' + val.toFixed(2) + ' mg <span style="color:var(--text-light);font-weight:400">(' + pct.toFixed(0) + '%)</span></span>' +
    '</div>' +
    '<div style="height:4px;background:var(--border);border-radius:2px">' +
    '<div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + color + ';border-radius:2px"></div>' +
    '</div>' +
    '</div>';
}

function _renderIsothermBars(des) {
  var container = document.getElementById('pu-isotherm-bars');
  if (!container) return;
  var keyRH = [20, 40, 60, 80, 100];
  container.innerHTML = keyRH.map(function(rh) {
    var cap = (interpCapacity(des.isotherm, rh) * 100).toFixed(1);
    return '<div style="text-align:center">' +
      '<div style="font-size:0.7rem;font-weight:700;color:' + des.color + '">' + cap + '%</div>' +
      '<div style="height:32px;background:var(--border);border-radius:3px;margin:0.2rem 0;position:relative">' +
      '<div style="position:absolute;bottom:0;left:0;right:0;height:' + Math.min(parseFloat(cap), 100) + '%;' +
      'background:' + des.color + ';border-radius:3px;opacity:0.7"></div>' +
      '</div>' +
      '<div style="font-size:0.62rem;color:var(--text-light)">' + rh + '% RH</div>' +
      '</div>';
  }).join('');
}

function _renderDesCharts(p, res) {
  if (typeof Chart === 'undefined') return;

  // Destroy old charts
  ['_puBudgetChart','_puSatChart','_puIsoChart'].forEach(function(k) {
    if (window[k]) { window[k].destroy(); window[k] = null; }
  });

  // Chart 1: moisture budget doughnut
  var cv1 = document.getElementById('pu-budget-chart');
  if (cv1) {
    window._puBudgetChart = new Chart(cv1.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Film ingress', 'Headspace fill', 'Product release'],
        datasets: [{
          data: [res.Q_film, res.Q_head, res.Q_prod],
          backgroundColor: ['rgba(37,99,235,0.8)', 'rgba(124,58,237,0.8)', 'rgba(217,119,6,0.8)'],
          borderColor: ['#2563eb','#7c3aed','#d97706'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ctx.label + ': ' + ctx.parsed.toFixed(2) + ' mg (' +
                  (ctx.parsed / res.Q_total * 100).toFixed(0) + '%)';
              }
            }
          }
        }
      }
    });
  }

  // Chart 2: saturation over time
  var cv2 = document.getElementById('pu-sat-chart');
  if (cv2) {
    var tl    = res.timeline;
    var days  = tl.map(function(pt) { return pt.t; });
    var fracs = tl.map(function(pt) { return pt.frac; });

    window._puSatChart = new Chart(cv2.getContext('2d'), {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Desiccant saturation (%)',
            data: fracs,
            borderColor: res.des.color,
            backgroundColor: res.des.color + '18',
            fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
          },
          {
            label: 'Full saturation (100%)',
            data: new Array(days.length).fill(100),
            borderColor: '#ef4444',
            borderDash: [6, 4], borderWidth: 2,
            pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
        scales: {
          x: { title: { display: true, text: 'Days' }, ticks: { font: { size: 9 } } },
          y: {
            min: 0, max: 105,
            title: { display: true, text: 'Saturation (%)' },
            ticks: { font: { size: 9 }, callback: function(v) { return v + '%'; } }
          }
        }
      }
    });
  }

  // Chart 3: sorption isotherm
  var cv3 = document.getElementById('pu-iso-chart');
  if (cv3) {
    var iso   = res.des.isotherm;
    var isoRH = iso.map(function(pt) { return pt[0]; });
    var isoCap= iso.map(function(pt) { return pt[1]; });

    window._puIsoChart = new Chart(cv3.getContext('2d'), {
      type: 'line',
      data: {
        labels: isoRH,
        datasets: [
          {
            label: res.des.name + ' isotherm',
            data: isoCap,
            borderColor: res.des.color,
            backgroundColor: res.des.color + '18',
            fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2
          },
          {
            label: 'Operating point (' + p.RH_crit + '% RH)',
            data: isoRH.map(function(rh) { return rh === p.RH_crit ? interpCapacity(res.des.isotherm, p.RH_crit) * 100 : null; }),
            borderColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            pointRadius: 7,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
        scales: {
          x: { title: { display: true, text: 'Relative Humidity (%)' }, ticks: { font: { size: 9 } } },
          y: { title: { display: true, text: 'Capacity (g H₂O / 100g)' }, ticks: { font: { size: 9 } } }
        }
      }
    });
  }
}


// ── Methodology + Disclaimer (appended after grid) ───────────────────
// Called at the end of renderPharmaUptake — append to c.innerHTML

(function _appendMethodology() {
  var _origRender = window.renderPharmaUptake;
  window.renderPharmaUptake = function() {
    _origRender();
    var c = document.getElementById('app-content');
    if (!c) return;
    c.innerHTML += _methodologyHTML() + _disclaimerHTML();
  };
})();

function _methodologyHTML() {
  return '' +
  '<div style="background:#fff;border:1px solid var(--border);border-left:4px solid var(--primary);' +
  'border-radius:var(--radius,12px);box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-top:1.5rem">' +
  '<div style="padding:1.5rem 1.75rem">' +

  // Title
  '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.35rem;color:var(--text,#0f172a);' +
  'border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1.2rem">' +
  'Mechanics of Desiccant Sizing for Pharmaceutical Packaging' +
  '</h2>' +

  '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:0.97rem;line-height:1.85;color:#334155">' +

  // ── Introduction ──
  '<p>The preservation of moisture-sensitive pharmaceutical products over their intended shelf life depends not only on the barrier properties of the surrounding packaging film, but also on the capacity of any desiccant material placed inside the container to absorb the residual moisture that inevitably penetrates the system. A desiccant sizing calculation is therefore a mass balance exercise: one must quantify every source of water vapour that will accumulate inside a sealed container over time, and ensure that the chosen desiccant possesses sufficient capacity to adsorb that total moisture load before the internal relative humidity rises to a level that compromises product stability. This tool implements that mass balance in full, accounting for three independent moisture sources and applying a material-specific sorption isotherm to translate absorbed mass into required desiccant weight.</p>' +

  // ── Section 1 ──
  '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
  'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
  'The Three-Component Moisture Budget' +
  '</h3>' +
  '<p>The total moisture load that the desiccant must manage over the shelf life of the product is the sum of three distinct contributions. Each arises from a different physical mechanism and must be characterised independently before a reliable sizing can be performed.</p>' +
  '<p>The first and typically dominant contribution is <strong>film ingress</strong> — the steady-state permeation of water vapour from the external storage environment through the walls of the container. This flux is governed by Fick\'s first law of diffusion, and under steady-state conditions it is fully described by the moisture vapour transmission rate (MVTR, also written WVTR) of the packaging film. The cumulative mass of water entering the container over the shelf life is given by:</p>' +

  '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;' +
  'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
  'Q_film (mg) = WVTR_eff (g/m²/day) × A (m²) × 1000 × t (days)' +
  '</div>' +

  '<p>where A is the total permeable surface area of the container and t is the shelf life in days. The factor of 1000 converts grams to milligrams for consistency with the other budget components. The effective WVTR at storage conditions is not necessarily equal to the value measured in the laboratory; it must be corrected for the temperature and humidity of the actual storage environment, as described in detail in the section on thermal correction below.</p>' +

  '<p>The second contribution is <strong>headspace moisture at the time of filling and sealing</strong>. Every sealed container encloses a volume of air at the moment of closure. If that air is not dried — for example by sealing under dry nitrogen or in a low-humidity cleanroom — it carries a quantity of water vapour proportional to its volume, the filling room relative humidity, and the saturation vapour pressure at the sealing temperature. Treating the enclosed gas as ideal, the mass of water vapour trapped in the headspace is:</p>' +

  '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;' +
  'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
  'Q_head (mg) = V (m³) × (RH_fill/100) × P_sat(T) / (R × T) × M_w × 10⁶' +
  '</div>' +

  '<p>where V is the headspace volume in cubic metres, P_sat(T) is the saturation vapour pressure of water at the sealing temperature (calculated here via the Magnus–Tetens approximation), R is the universal gas constant (8.314 J mol⁻¹ K⁻¹), T is the absolute temperature in Kelvin, and M_w is the molar mass of water (0.018 kg/mol). The factor of 10⁶ converts kilograms to milligrams. This component is often underestimated in practice, yet for small containers with large headspace-to-volume ratios it can represent a substantial fraction of the total moisture budget — particularly when products are packaged in poorly controlled environments.</p>' +

  '<p>The third contribution is <strong>moisture released by the product itself</strong>. Pharmaceutical solids — tablets, capsules, granules — are never completely anhydrous at the point of packaging. They carry a residual moisture content that is in thermodynamic equilibrium with the humidity of the manufacturing environment. Once sealed, a fraction of this bound moisture partitions into the headspace gas phase, adding to the internal humidity. The magnitude of this contribution depends on the initial moisture content of the product, its total mass, and the fraction of that moisture that is physically available to desorb under the storage conditions. In this model, the latter is treated as an input parameter — the moisture release fraction — which should ideally be determined experimentally from desorption isotherm data or accelerated stability studies.</p>' +

  // ── Section 2 ──
  '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
  'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
  'Thermal Correction of the Barrier Rate' +
  '</h3>' +
  '<p>Laboratory measurements of WVTR are performed under standardised reference conditions — most commonly 38°C and 90% relative humidity in accordance with ASTM F1249 or ISO 15106. However, pharmaceutical products are stored and distributed across a wide range of climatic environments, and the permeability of most polymer films varies significantly with both temperature and humidity. To obtain the effective WVTR at the actual storage conditions, two multiplicative correction factors are applied.</p>' +
  '<p>The temperature correction follows the Arrhenius model of thermally activated diffusion. As temperature increases, the segmental mobility of the polymer chains grows, the free volume available for gas diffusion expands, and the diffusion coefficient of water molecules through the matrix rises exponentially. The Arrhenius correction factor F_T is defined as:</p>' +

  '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;' +
  'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
  'F_T = exp [ (E_a / R) × (1/T_ref − 1/T_store) ]' +
  '</div>' +

  '<p>where E_a is the activation energy of permeation in joules per mole and T_ref and T_store are the reference and storage temperatures in Kelvin respectively. Activation energies for common packaging polymers span a wide range: polyolefins such as LDPE and PP typically exhibit values of 28–42 kJ/mol, reflecting their relatively non-polar structure and limited interaction with water; polar films such as EVOH and polyamide (nylon) show considerably higher values of 45–70 kJ/mol, because water molecules interact strongly with the polar groups in the matrix and the diffusion mechanism is more strongly temperature-dependent. Aluminium foil, when intact, has a near-zero activation energy because moisture transport occurs through discrete physical defects — pinholes and seal imperfections — rather than through the metal lattice itself.</p>' +
  '<p>The humidity correction accounts for the fact that the driving force for moisture permeation is the partial pressure differential of water vapour across the film, which under the simplifying assumption of a linear concentration–pressure relationship is proportional to the ratio of the external and reference relative humidities. This yields the correction factor:</p>' +

  '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;' +
  'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
  'F_RH = RH_store / RH_ref' +
  '<br>WVTR_eff = WVTR_ref × F_T × F_RH' +
  '</div>' +

  '<p>This linear approximation is accurate for non-hygroscopic films. For hygroscopic materials such as EVOH and nylon, where the diffusion coefficient increases non-linearly with sorbed water content, an exponential beta-correction should be applied instead. Users working with such materials are advised to consult the hygroscopic correction module available in the WVTR/OTR Calculator and to use the corrected effective rate as the manual input in this tool.</p>' +

  // ── Section 3 ──
  '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
  'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
  'Desiccant Sorption Isotherms and Capacity' +
  '</h3>' +
  '<p>A desiccant functions by adsorbing water vapour from the gas phase until thermodynamic equilibrium is reached between the moisture content of the desiccant and the relative humidity of the surrounding atmosphere. The relationship between the equilibrium moisture content of the desiccant and the ambient relative humidity is described by its sorption isotherm — a material-specific curve that is the central design datum for any sizing calculation.</p>' +
  '<p>Different desiccant materials exhibit markedly different isotherm shapes, and the choice of material must be matched to the application. Silica gel, the most widely used pharmaceutical desiccant, displays a Type IV BET isotherm with a broad working plateau across the mid-humidity range, making it suitable for maintaining relative humidities below 40–50%. Its capacity at saturation is approximately 35–40% of its dry mass, though the commercially available Type A and Type B grades differ in pore structure and therefore in the shape of their low-humidity uptake curves. Molecular sieves — crystalline zeolites with precisely defined pore diameters of 3 or 4 ångströms — display a fundamentally different Type I (Langmuir) isotherm, characterised by very rapid uptake at low relative humidities and a capacity plateau that is reached at humidities as low as 10–20% RH. They are therefore the material of choice for products that must be maintained at very low internal humidity, such as effervescent tablets, lyophilised biologics, and moisture-reactive active pharmaceutical ingredients. Montmorillonite clay offers a cost-effective intermediate option for less demanding applications, while calcium chloride, although it offers extremely high capacity, is rarely used in direct contact with pharmaceutical products due to its tendency to deliquesce and its corrosive properties.</p>' +
  '<p>In this tool, the effective capacity of the selected desiccant at the critical relative humidity is obtained by linear interpolation on the tabulated isotherm data. The required desiccant mass is then:</p>' +

  '<div style="background:#f8fafc;border:1px dashed var(--border);border-radius:8px;padding:0.9rem;' +
  'font-family:\'Courier New\',monospace;font-size:0.9rem;text-align:center;margin:0.75rem 0;line-height:1.9">' +
  'Cap_eff (g H₂O / g desiccant) = isotherm(RH_crit)' +
  '<br>W_required (g) = Q_total (mg) / 1000 / Cap_eff' +
  '</div>' +

  // ── Section 4 ──
  '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
  'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
  'Safety Factor and the Saturation Timeline' +
  '</h3>' +
  '<p>The calculated required desiccant mass represents the theoretical minimum: the exact quantity needed to absorb the total predicted moisture load if every assumption in the model were perfectly accurate. In engineering practice, a safety factor is always applied to account for the inevitable uncertainties in the input parameters. Batch-to-batch variation in film WVTR is typically ±15–25% for commercial polymer films. The actual headspace humidity at sealing depends on the real-time conditions in the manufacturing environment, which fluctuate. Product moisture content varies across the batch and changes during handling. The desiccant itself may have absorbed atmospheric moisture between manufacture and use if storage conditions are not controlled. For these reasons, regulatory guidance and industry practice consistently recommend a minimum safety factor of 2×, and values of 3–4× are common for high-value or moisture-sensitive products such as lyophilised injectables or solid oral dosage forms containing hygroscopic active ingredients.</p>' +
  '<p>The saturation timeline shown in the results panel tracks the cumulative moisture absorbed by the recommended desiccant quantity as a function of time. As long as the absorbed moisture remains below the total capacity of the desiccant at the critical relative humidity, the internal atmosphere of the container is buffered and the product is protected. The day on which the desiccant reaches full saturation — the point at which it can no longer accept additional moisture and the internal RH begins to rise freely — is the effective end of desiccant-mediated protection. For a correctly sized system this day must lie beyond the end of the intended shelf life, ideally with a margin commensurate with the safety factor applied.</p>' +

  // ── Section 5 ──
  '<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;font-weight:700;' +
  'color:var(--primary-dark,#1d4ed8);margin:1.5rem 0 0.5rem;border-bottom:2px solid var(--border);padding-bottom:0.35rem">' +
  'Alignment with International Standards' +
  '</h3>' +
  '<p>The methodology implemented in this tool is consistent with the following international standards and regulatory guidelines. Users are encouraged to consult the primary documents for detailed procedural requirements, as the mathematical models presented here are intended for screening and concept development, not as a substitute for experimental validation.</p>' +

  '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:0.88rem;' +
  'color:var(--text-light,#64748b);margin-top:1rem;line-height:1.8">' +
  '• <strong>ASTM F1249-20</strong>: Standard Test Method for Water Vapor Transmission Rate Through Plastic Film and Sheeting Using a Modulated Infrared Sensor<br>' +
  '• <strong>ISO 15106-3:2003</strong>: Plastics — Film and sheeting — Determination of water vapour transmission rate — Electrolytic detection sensor method<br>' +
  '• <strong>ICH Q1A(R2) (2003)</strong>: Stability Testing of New Drug Substances and Pharmaceutical Products — reference conditions for climatic zone classification<br>' +
  '• <strong>USP &lt;671&gt;</strong>: Containers — Performance Testing, including moisture permeation testing for pharmaceutical containers and closures<br>' +
  '• <strong>ISO 18787:2017</strong>: Foodstuffs — Determination of water activity (applicable by analogy to pharmaceutical solids)<br>' +
  '• <strong>ASTM D3985</strong>: Standard Test Method for Oxygen Gas Transmission Rate Through Plastic Film and Sheeting<br>' +
  '• <strong>WHO Technical Report Series No. 863 (1996)</strong>: Climatic zone definitions for global pharmaceutical stability testing' +
  '</div>' +

  '</div>' + // end mc-body
  '</div>' + // end mc-inner
  '</div>';  // end methodology-card
}

function _disclaimerHTML() {
  return '' +
  '<div style="background:#fff8f8;border:1.5px solid #fca5a5;border-radius:var(--radius,12px);' +
  'padding:1.1rem 1.4rem;margin-top:1.1rem">' +
  '<h3 style="font-size:0.95rem;font-weight:700;color:var(--danger,#dc2626);margin-bottom:0.75rem;' +
  'display:flex;align-items:center;gap:0.35rem">⚠ Regulatory Disclaimer & Model Limitations</h3>' +

  _discItem('For R&D Screening and Concept Development Only',
    'The calculations produced by this tool are mathematical predictions based on simplified physical models and literature isotherm data. They are intended to support early-stage packaging design decisions and desiccant pre-selection. They do not constitute validated stability data and must not be used as the sole basis for regulatory submissions, commercial shelf-life labelling, or product safety declarations.') +

  _discItem('Experimental Validation Is Mandatory',
    'All desiccant sizing predictions must be verified through real-time and accelerated stability studies conducted in accordance with ICH Q1A(R2), USP ⟨671⟩, and any applicable national regulatory requirements. Stability chambers must be qualified and operated under controlled conditions with calibrated humidity and temperature sensors. Desiccant performance must be confirmed on the actual packaging system, not on the materials in isolation.') +

  _discItem('Isotherm Data and Model Assumptions',
    'The sorption isotherm data included in this tool are representative literature values for each desiccant class. Real commercial products may deviate from these values depending on manufacturing process, particle size distribution, pore structure, and prior storage history. The model assumes: (1) thermodynamic equilibrium between the desiccant and the internal atmosphere at each time step; (2) linear interpolation between isotherm data points; (3) steady-state film permeation at constant temperature and humidity; (4) no seal permeation, pinholes, or mechanical damage to the container; (5) instantaneous and complete mixing of moisture within the headspace.') +

  _discItem('Safety Factor Responsibility',
    'The safety factor applied in this calculation is a user-defined input. The tool does not automatically validate whether the chosen safety factor is appropriate for the specific product, container, and regulatory market. The user is solely responsible for justifying the selected safety factor based on the risk profile of the product, the variability of the manufacturing process, and the requirements of the applicable regulatory framework.') +

  _discItem('Regulatory Compliance',
    'This tool does not provide regulatory advice. The design and validation of pharmaceutical packaging systems must comply with applicable regulations, including but not limited to FDA 21 CFR Parts 211 and 610, EU GMP Annex 1, ICH Q1A(R2), USP ⟨661⟩ and ⟨671⟩, and any country-specific requirements in the target markets. Consult a qualified pharmaceutical packaging engineer or regulatory specialist before finalising packaging specifications.') +

  '</div>';
}

function _discItem(title, body) {
  return '<div style="margin-bottom:0.8rem;font-size:0.88rem;color:#374151;line-height:1.65">' +
    '<strong style="color:var(--danger,#dc2626)">' + title + '. </strong>' + body +
    '</div>';
}
