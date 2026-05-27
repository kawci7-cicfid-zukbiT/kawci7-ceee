// ====================================================================
// pharma_mvtr.js  —  MVTR / ICH Conditions
// Biomedical Analysis → MVTR / ICH Conditions  (State.tab === 'pharma-mvtr')
//
// Calculates effective WVTR of a laminate at each ICH Q1A(R2) climatic
// zone and estimates moisture ingress per blister cavity per year.
//
// Effective WVTR uses Arrhenius temperature correction (if Ea available)
// and RH driving force correction:
//   WVTR_eff = WVTR_ref × exp(Ea/R × (1/T_ref - 1/T_ich)) × (RH_ich/RH_ref)
//
// Moisture ingress per cavity:
//   m (mg) = WVTR_eff (g/m²/day) × A_cavity (m²) × days
// ====================================================================
// ------------------------------------------------------------------
// ICH Q1A(R2) climatic zones
// ------------------------------------------------------------------
var ICH_ZONES = [
  { id: 'I',    label: 'Zone I',    desc: 'Temperate',               T: 21, RH: 45, days: 365 },
  { id: 'II',   label: 'Zone II',   desc: 'Subtropical / Mediterranean', T: 25, RH: 60, days: 365 },
  { id: 'IIIa', label: 'Zone IIIa', desc: 'Hot dry',                 T: 40, RH: 15, days: 365 },
  { id: 'IVa',  label: 'Zone IVa',  desc: 'Hot humid',               T: 40, RH: 75, days: 365 },
  { id: 'IVb',  label: 'Zone IVb',  desc: 'Hot very humid (ASEAN)',   T: 30, RH: 75, days: 365 },
  // Accelerated / intermediate
  { id: 'ACC',  label: 'Accelerated', desc: 'ICH accelerated test',  T: 40, RH: 75, days: 180 },
  { id: 'INT',  label: 'Intermediate', desc: 'ICH intermediate test', T: 30, RH: 65, days: 365 }
];

// ------------------------------------------------------------------
// Arrhenius-corrected WVTR
// wvtr_ref   g/m²/day at (T_ref °C, RH_ref %)
// Ea_kJ      activation energy kJ/mol  (typical 30–50 for polymers; 0 = no correction)
// T_target   °C
// RH_target  %
// RH_ref     %
// T_ref      °C
// ------------------------------------------------------------------
function wvtrAtCondition(wvtr_ref, Ea_kJ, T_ref, RH_ref, T_target, RH_target) {
  var R = 8.314e-3;  // kJ/(mol·K)
  var Tr = T_ref    + 273.15;
  var Tt = T_target + 273.15;
  var arrFactor = (Ea_kJ > 0) ? Math.exp((Ea_kJ / R) * (1/Tr - 1/Tt)) : 1;
  var rhFactor  = (RH_ref > 0) ? (RH_target / RH_ref) : 1;
  return wvtr_ref * arrFactor * rhFactor;
}

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
function renderPharmaMVTR() {
  var el = document.getElementById('content');
  if (!el) return;

  var st = (typeof State !== 'undefined' && State.pharmaMVTR) ? State.pharmaMVTR : {
    wvtr_ref:    1.0,
    T_ref:       38,
    RH_ref:      90,
    Ea_kJ:       35,
    cavity_cm2:  2.0,
    critical_mg: 2.0,
    shelf_years: 2
  };

  var html = '<div class="tab-content">';
  html += '<h2 class="section-title">MVTR at ICH Conditions</h2>';
  html += '<p class="section-desc">Calculate effective moisture vapor transmission rate across all ICH Q1A(R2) climatic zones. ' +
          'Uses Arrhenius temperature correction and RH driving force.</p>';

  // Input panel
  html += '<div class="pharma-grid">';

  function field(id, label, val, unit, step) {
    return '<div class="ph-field"><label>' + label + '</label>' +
           '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
           '" step="' + (step || 'any') + '" min="0"> <span class="ph-unit">' + unit + '</span></div></div>';
  }

  html += '<div class="ph-section-title">Reference measurement (from datasheet or DB)</div>';
  html += field('ph-wvtr',    'WVTR (reference)',     st.wvtr_ref,    'g/m²/day', 0.01);
  html += field('ph-tref',    'Reference temperature',st.T_ref,       '°C',       0.5);
  html += field('ph-rhref',   'Reference RH',         st.RH_ref,      '%',        1);
  html += field('ph-ea',      'Activation energy Eₐ', st.Ea_kJ,       'kJ/mol',   1);
  html += '<div class="ph-hint">Eₐ = 0 disables Arrhenius correction (RH scaling only).<br>' +
          'Typical values: PET 30–40 · PVDC 45–55 · PA 40–50 kJ/mol</div>';

  html += '<div class="ph-section-title">Blister geometry & criticality</div>';
  html += field('ph-area',    'Cavity surface area',  st.cavity_cm2,  'cm²',      0.1);
  html += field('ph-crit',    'Critical moisture gain',st.critical_mg,'mg/cavity',0.1);
  html += field('ph-years',   'Target shelf life',    st.shelf_years, 'years',    0.5);

  html += '</div>'; // pharma-grid

  html += '<button class="btn-primary" onclick="onPharmaMVTRCalc()">Calculate</button>';
  html += '<div id="ph-results"></div>';
  html += '</div>';

  el.innerHTML = html;
  onPharmaMVTRCalc();
}

function onPharmaMVTRCalc() {
  var get = function(id) { return parseFloat(document.getElementById(id).value) || 0; };

  var p = {
    wvtr_ref:    get('ph-wvtr'),
    T_ref:       get('ph-tref'),
    RH_ref:      get('ph-rhref'),
    Ea_kJ:       get('ph-ea'),
    cavity_cm2:  get('ph-area'),
    critical_mg: get('ph-crit'),
    shelf_years: get('ph-years')
  };
  if (typeof State !== 'undefined') State.pharmaMVTR = p;

  var areaM2     = p.cavity_cm2 / 1e4;
  var shelfDays  = p.shelf_years * 365;

  // Calculate for every ICH zone
  var rows = ICH_ZONES.map(function(z) {
    var wvtrEff  = wvtrAtCondition(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, z.T, z.RH);
    var ingress  = wvtrEff * areaM2 * z.days * 1000;   // g → mg, per year
    var total    = ingress * (shelfDays / z.days);      // over full shelf life
    var pass     = total <= p.critical_mg;
    return { zone: z, wvtrEff: wvtrEff, ingressPerYear: ingress, total: total, pass: pass };
  });

  renderPharmaMVTRResults(rows, p);
}

function renderPharmaMVTRResults(rows, p) {
  var el = document.getElementById('ph-results');
  if (!el) return;

  var html = '<div class="ph-table-wrap">';
  html += '<table class="ph-table">';
  html += '<thead><tr>' +
          '<th>ICH Zone</th><th>T (°C)</th><th>RH (%)</th>' +
          '<th>WVTR_eff (g/m²/day)</th>' +
          '<th>Ingress / year (mg/cavity)</th>' +
          '<th>Total ' + p.shelf_years + ' yr (mg)</th>' +
          '<th>vs ' + p.critical_mg + ' mg limit</th>' +
          '</tr></thead><tbody>';

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    html += '<tr class="' + (r.pass ? 'ph-pass' : 'ph-fail') + '">';
    html += '<td><strong>' + r.zone.label + '</strong><br><span class="ph-zdesc">' + r.zone.desc + '</span></td>';
    html += '<td>' + r.zone.T + '</td>';
    html += '<td>' + r.zone.RH + '</td>';
    html += '<td>' + r.wvtrEff.toFixed(3) + '</td>';
    html += '<td>' + r.ingressPerYear.toFixed(2) + '</td>';
    html += '<td>' + r.total.toFixed(2) + '</td>';
    html += '<td class="ph-verdict">' + (r.pass
      ? '<span class="ph-ok">✓ PASS</span>'
      : '<span class="ph-nok">✗ FAIL</span> (' + ((r.total / p.critical_mg * 100 - 100).toFixed(0)) + '% over)') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table></div>';

  // Mini heatmap bar
  html += '<div class="ph-note">Arrhenius correction applied with Eₐ = ' + p.Ea_kJ + ' kJ/mol · ' +
          'Reference: ' + p.wvtr_ref + ' g/m²/day at ' + p.T_ref + '°C / ' + p.RH_ref + '% RH</div>';

  el.innerHTML = html;
}
