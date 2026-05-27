// ====================================================================
// pharma_uptake.js  —  Drug Moisture Uptake Model
// Biomedical Analysis → Drug Moisture Uptake  (State.tab === 'pharma-uptake')
//
// Linear moisture uptake model (ICH Q1A(R2)):
//   M(t) = (WVTR_eff × A × RH_ext/100) / W  ×  t
//
// Shelf life (days) until critical moisture content reached:
//   t_sl = (ΔM_crit × W) / (WVTR_eff × A × RH_ext/100)
//
// Where:
//   WVTR_eff    g/m²/day  —  effective WVTR at storage conditions
//   A           m²        —  cavity surface area
//   RH_ext      %         —  external relative humidity
//   W           g         —  drug content per unit
//   ΔM_crit     %         —  allowable moisture gain (% of W)
// ====================================================================

// ------------------------------------------------------------------
// ICH zones reused from pharma_mvtr.js
// (included there; reference only if loaded separately)
// ------------------------------------------------------------------
var UPTAKE_ICH_ZONES = (typeof ICH_ZONES !== 'undefined') ? ICH_ZONES : [
  { id: 'II',   label: 'Zone II',     desc: '25°C / 60% RH', T: 25, RH: 60 },
  { id: 'IVa',  label: 'Zone IVa',    desc: '40°C / 75% RH', T: 40, RH: 75 },
  { id: 'IVb',  label: 'Zone IVb',    desc: '30°C / 75% RH', T: 30, RH: 75 },
  { id: 'ACC',  label: 'Accelerated', desc: '40°C / 75% RH', T: 40, RH: 75 },
  { id: 'INT',  label: 'Intermediate',desc: '30°C / 65% RH', T: 30, RH: 65 }
];

// ------------------------------------------------------------------
// Degradation models
// degradation_model: 'none' | 'hydrolysis' | 'oxidation'
// ------------------------------------------------------------------
function potencyAtTime(t_days, k_deg, model) {
  if (model === 'none' || k_deg <= 0) return 100;
  // First-order degradation: P(t) = 100 × exp(-k × t)
  return 100 * Math.exp(-k_deg * t_days);
}

// ------------------------------------------------------------------
// Core: moisture content vs time for one condition
// Returns timeline and shelf life
// ------------------------------------------------------------------
function calcMoistureUptake(p) {
  // Shelf life from linear model
  var WVTR_eff = p.wvtr_eff;                      // g/m²/day
  var A        = p.cavity_cm2 / 1e4;              // m²
  var W_g      = p.drug_mass_mg / 1000;           // g
  var dM_crit  = p.mc_initial + p.delta_mc_crit;  // % target MC

  // Moisture ingress rate (% MC per day)
  var rate_pct_day = (WVTR_eff * A * p.RH_ext / 100) / W_g * 100;

  var slDay = (rate_pct_day > 0)
    ? (p.delta_mc_crit / rate_pct_day)
    : null;

  // Timeline
  var days    = p.sim_days;
  var step    = 1;
  var tl      = [];
  var potency_sl = null;

  for (var t = 0; t <= days; t += step) {
    var mc      = p.mc_initial + rate_pct_day * t;
    var potency = potencyAtTime(t, p.k_deg_day, p.deg_model);
    tl.push({ t: t, mc: mc, potency: potency });
    if (potency_sl === null && potency <= 90) potency_sl = t;  // 90% ICH limit
  }

  return {
    timeline:       tl,
    shelfLifeDay:   slDay,
    potencySlDay:   potency_sl,
    rate_pct_day:   rate_pct_day,
    limitingFactor: (slDay !== null && (potency_sl === null || slDay <= potency_sl))
                    ? 'moisture' : 'degradation'
  };
}

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
function renderPharmaUptake() {
  var el = document.getElementById('content');
  if (!el) return;

  var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {
    wvtr_ref:       1.0,
    T_ref:          38,
    RH_ref:         90,
    Ea_kJ:          35,
    ich_zone:       'IVa',
    cavity_cm2:     2.0,
    drug_mass_mg:   200,
    mc_initial:     0.5,
    delta_mc_crit:  1.5,
    deg_model:      'hydrolysis',
    k_deg_day:      0.0003,
    sim_days:       730
  };

  var html = '<div class="tab-content">';
  html += '<h2 class="section-title">Drug Moisture Uptake</h2>';
  html += '<p class="section-desc">Predict moisture content evolution inside a blister cavity and estimate shelf life limited by critical moisture gain or chemical degradation (ICH Q1A(R2)).</p>';

  html += '<div class="pharma-grid">';

  function field(id, label, val, unit, step) {
    return '<div class="ph-field"><label>' + label + '</label>' +
           '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
           '" step="' + (step || 'any') + '" min="0"> <span class="ph-unit">' + unit + '</span></div></div>';
  }

  // Film parameters
  html += '<div class="ph-section-title">Barrier film (WVTR reference)</div>';
  html += field('pu-wvtr',   'WVTR reference',        st.wvtr_ref,     'g/m²/day', 0.01);
  html += field('pu-tref',   'Reference temperature', st.T_ref,        '°C',       0.5);
  html += field('pu-rhref',  'Reference RH',          st.RH_ref,       '%',        1);
  html += field('pu-ea',     'Activation energy Eₐ',  st.Ea_kJ,        'kJ/mol',   1);

  // ICH zone
  html += '<div class="ph-section-title">Storage conditions (ICH zone)</div>';
  html += '<div class="ph-field"><label>ICH zone</label><select id="pu-zone">';
  var zones = (typeof ICH_ZONES !== 'undefined') ? ICH_ZONES : UPTAKE_ICH_ZONES;
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i];
    html += '<option value="' + z.id + '"' + (st.ich_zone === z.id ? ' selected' : '') + '>' +
            z.label + ' — ' + z.T + '°C / ' + z.RH + '% RH</option>';
  }
  html += '</select></div>';

  // Product
  html += '<div class="ph-section-title">Drug / dosage form</div>';
  html += field('pu-area',   'Cavity surface area',   st.cavity_cm2,   'cm²',      0.1);
  html += field('pu-dmass',  'Drug mass per cavity',  st.drug_mass_mg, 'mg',       1);
  html += field('pu-mcinit', 'Initial moisture content', st.mc_initial,'%',        0.01);
  html += field('pu-dmcrit', 'Allowable moisture gain',  st.delta_mc_crit, '%',    0.1);
  html += '<div class="ph-hint">Typical limits: hygroscopic APIs 0.5–1 % · tablets 1–3 % · lyophilised 0.5 %</div>';

  // Degradation
  html += '<div class="ph-section-title">Chemical degradation (optional)</div>';
  html += '<div class="ph-field"><label>Model</label><select id="pu-degmodel">' +
          '<option value="none"'       + (st.deg_model === 'none'       ? ' selected' : '') + '>None</option>' +
          '<option value="hydrolysis"' + (st.deg_model === 'hydrolysis' ? ' selected' : '') + '>Hydrolysis (first-order)</option>' +
          '<option value="oxidation"'  + (st.deg_model === 'oxidation'  ? ' selected' : '') + '>Oxidation (first-order)</option>' +
          '</select></div>';
  html += field('pu-kdeg',   'Rate constant k',       st.k_deg_day,    '/day',     0.0001);
  html += '<div class="ph-hint">ICH limit: ≥ 90% potency. k = ln(100/90) / t₉₀</div>';

  html += field('pu-simdays','Simulation duration',   st.sim_days,     'days',     30);

  html += '</div>'; // pharma-grid
  html += '<button class="btn-primary" onclick="onPharmaUptakeCalc()">Calculate</button>';
  html += '<div id="pu-results"></div>';
  html += '</div>';

  el.innerHTML = html;
  onPharmaUptakeCalc();
}

function onPharmaUptakeCalc() {
  var get = function(id) { return parseFloat(document.getElementById(id).value) || 0; };

  var zoneId = document.getElementById('pu-zone').value;
  var zones  = (typeof ICH_ZONES !== 'undefined') ? ICH_ZONES : UPTAKE_ICH_ZONES;
  var zone   = zones.find(function(z){ return z.id === zoneId; }) || zones[0];

  var wvtr_ref = get('pu-wvtr');
  var T_ref    = get('pu-tref');
  var RH_ref   = get('pu-rhref');
  var Ea_kJ    = get('pu-ea');

  // Arrhenius-corrected WVTR at ICH zone conditions
  var wvtr_eff = (typeof wvtrAtCondition === 'function')
    ? wvtrAtCondition(wvtr_ref, Ea_kJ, T_ref, RH_ref, zone.T, zone.RH)
    : wvtr_ref;

  var p = {
    wvtr_eff:       wvtr_eff,
    RH_ext:         zone.RH,
    cavity_cm2:     get('pu-area'),
    drug_mass_mg:   get('pu-dmass'),
    mc_initial:     get('pu-mcinit'),
    delta_mc_crit:  get('pu-dmcrit'),
    deg_model:      document.getElementById('pu-degmodel').value,
    k_deg_day:      get('pu-kdeg'),
    sim_days:       get('pu-simdays'),
    ich_zone:       zoneId
  };
  if (typeof State !== 'undefined') State.pharmaUptake = Object.assign({}, p, {
    wvtr_ref: get('pu-wvtr'), T_ref: get('pu-tref'), RH_ref: get('pu-rhref'), Ea_kJ: Ea_kJ
  });

  var res = calcMoistureUptake(p);
  renderPharmaUptakeResults(res, p, zone);
}

function renderPharmaUptakeResults(res, p, zone) {
  var el = document.getElementById('pu-results');
  if (!el) return;

  var slText = res.shelfLifeDay !== null
    ? res.shelfLifeDay.toFixed(0) + ' days (' + (res.shelfLifeDay / 365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days';

  var potText = res.potencySlDay !== null
    ? res.potencySlDay.toFixed(0) + ' days (' + (res.potencySlDay / 365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days (stays ≥ 90%)';

  var html = '<div class="ph-result-box">';
  html += '<div class="ph-kpi-row">';
  html += kpi('Moisture shelf life', slText,    res.limitingFactor === 'moisture' ? '#2563eb' : '#64748b');
  html += kpi('Potency shelf life',  potText,   res.limitingFactor === 'degradation' ? '#8b5cf6' : '#64748b');
  html += kpi('Limiting factor',     res.limitingFactor, res.limitingFactor === 'moisture' ? '#2563eb' : '#8b5cf6');
  html += kpi('MC ingress rate',     res.rate_pct_day.toFixed(4) + ' %/day', '#64748b');
  html += '</div>';
  html += '</div>';

  // Chart: MC over time + potency
  html += renderUptakeChart(res.timeline, p);

  // Zone info
  html += '<div class="ph-note">Conditions: ' + zone.label + ' — ' + zone.T + '°C / ' + zone.RH +
          '% RH · WVTR_eff = ' + p.wvtr_eff.toFixed(3) + ' g/m²/day</div>';

  el.innerHTML = html;
}

function kpi(label, val, color) {
  return '<div class="ph-kpi"><span class="ph-kpi-val" style="color:' + color + '">' + val +
         '</span><span class="ph-kpi-lbl">' + label + '</span></div>';
}

function renderUptakeChart(tl, p) {
  if (!tl || tl.length < 2) return '';
  var W = 560, H = 220, PAD = 44;

  var maxT  = tl[tl.length - 1].t;
  var maxMC = Math.max(p.mc_initial + p.delta_mc_crit * 1.5,
                       tl[tl.length - 1].mc, 3);

  function xp(t)  { return PAD + (t / maxT) * (W - PAD * 2); }
  function yMC(v) { return PAD + (1 - v / maxMC) * (H - PAD * 2); }

  // MC path
  var mcPath = tl.map(function(pt, i) {
    return (i === 0 ? 'M' : 'L') + xp(pt.t).toFixed(1) + ',' + yMC(pt.mc).toFixed(1);
  }).join(' ');

  var critY = yMC(p.mc_initial + p.delta_mc_crit);

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:' + W + 'px;margin-top:1rem">';
  svg += '<line x1="' + PAD + '" y1="' + (H-PAD) + '" x2="' + (W-PAD) + '" y2="' + (H-PAD) + '" stroke="#cbd5e1" stroke-width="1"/>';
  svg += '<line x1="' + PAD + '" y1="' + PAD + '" x2="' + PAD + '" y2="' + (H-PAD) + '" stroke="#cbd5e1" stroke-width="1"/>';

  // Critical MC line
  svg += '<line x1="' + PAD + '" y1="' + critY + '" x2="' + (W-PAD) + '" y2="' + critY +
         '" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>';
  svg += '<text x="' + (W-PAD+4) + '" y="' + (critY+4) + '" fill="#ef4444" font-size="10">MC limit</text>';

  // MC curve
  svg += '<path d="' + mcPath + '" fill="none" stroke="#2563eb" stroke-width="2"/>';

  // Axis labels
  svg += '<text x="' + (W/2) + '" y="' + (H-4) + '" text-anchor="middle" fill="#64748b" font-size="11">Days</text>';
  svg += '<text x="12" y="' + (H/2) + '" text-anchor="middle" fill="#2563eb" font-size="11" transform="rotate(-90,12,' + H/2 + ')">MC (%)</text>';

  // Y ticks
  svg += '<text x="' + (PAD-4) + '" y="' + (PAD+4) + '" text-anchor="end" fill="#94a3b8" font-size="10">' + maxMC.toFixed(1) + '</text>';
  svg += '<text x="' + (PAD-4) + '" y="' + (H-PAD+4) + '" text-anchor="end" fill="#94a3b8" font-size="10">' + p.mc_initial.toFixed(1) + '</text>';

  svg += '</svg>';
  return svg;
}
