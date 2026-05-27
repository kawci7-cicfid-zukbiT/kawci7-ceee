// ====================================================================
// pharma_mvtr.js  —  MVTR at ICH Conditions
// Biomedical Analysis → MVTR / ICH Conditions  (State.tab === 'pharma-mvtr')
// Pattern: writes directly to #app-content (same as renderCarbonFootprint)
// ====================================================================

var ICH_ZONES = [
  { id:'I',    label:'Zone I',       desc:'Temperate',                  T:21, RH:45 },
  { id:'II',   label:'Zone II',      desc:'Subtropical / Mediterranean',T:25, RH:60 },
  { id:'IIIa', label:'Zone IIIa',    desc:'Hot dry',                    T:40, RH:15 },
  { id:'IVa',  label:'Zone IVa',     desc:'Hot humid',                  T:40, RH:75 },
  { id:'IVb',  label:'Zone IVb',     desc:'Hot very humid (ASEAN)',     T:30, RH:75 },
  { id:'ACC',  label:'Accelerated',  desc:'ICH accelerated test',       T:40, RH:75 },
  { id:'INT',  label:'Intermediate', desc:'ICH intermediate test',      T:30, RH:65 }
];

// Arrhenius + RH driving force correction
function wvtrAtICH(wvtr_ref, Ea_kJ, T_ref, RH_ref, T_target, RH_target) {
  var R  = 8.314e-3; // kJ/(mol·K)
  var Tr = T_ref    + 273.15;
  var Tt = T_target + 273.15;
  var arrFactor = (Ea_kJ > 0) ? Math.exp((Ea_kJ / R) * (1/Tr - 1/Tt)) : 1;
  var rhFactor  = (RH_ref > 0) ? (RH_target / RH_ref) : 1;
  return wvtr_ref * arrFactor * rhFactor;
}

function renderPharmaMVTR() {
  var c = document.getElementById('app-content');
  if (!c) return;

  // Read saved state or defaults
  var st = (typeof State !== 'undefined' && State.pharmaMVTR) ? State.pharmaMVTR : {};
  var wvtr_ref    = st.wvtr_ref    || 1.0;
  var T_ref       = st.T_ref       || 38;
  var RH_ref      = st.RH_ref      || 90;
  var Ea_kJ       = st.Ea_kJ       || 35;
  var cavity_cm2  = st.cavity_cm2  || 2.0;
  var critical_mg = st.critical_mg || 2.0;
  var shelf_years = st.shelf_years || 2;

  var html = '<div style="max-width:1100px;margin:0 auto;padding:1.5rem">';

  // Page title
  html += '<div style="margin-bottom:1.5rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Biomedical Analysis</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem">MVTR at ICH Conditions</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:700px">Calculate effective moisture vapor transmission rate across all ICH Q1A(R2) climatic zones. Arrhenius temperature correction and RH driving force applied.</p>';
  html += '</div>';

  // Input card
  html += '<div class="card" style="margin-bottom:1.25rem">';
  html += '<h2 style="font-size:0.95rem;margin-bottom:1rem">Reference Measurement & Parameters</h2>';

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;margin-bottom:1rem">';

  function field(id, label, val, unit, step, hint) {
    return '<div class="form-group" style="margin:0">' +
      '<label>' + label + '</label>' +
      '<div style="display:flex;align-items:center;gap:0.35rem">' +
      '<input type="number" id="' + id + '" value="' + val + '" step="' + (step||'any') + '" min="0" class="form-input" style="flex:1">' +
      '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap">' + unit + '</span>' +
      '</div>' +
      (hint ? '<div style="font-size:0.65rem;color:var(--text-light);margin-top:0.15rem">' + hint + '</div>' : '') +
      '</div>';
  }

  html += field('ph-wvtr',   'WVTR reference',          wvtr_ref,    'g/m²/day', 0.01);
  html += field('ph-tref',   'Reference temperature',   T_ref,       '°C',       0.5);
  html += field('ph-rhref',  'Reference RH',            RH_ref,      '%',        1);
  html += field('ph-ea',     'Activation energy Eₐ',    Ea_kJ,       'kJ/mol',   1, 'Eₐ = 0 → RH correction only');
  html += field('ph-area',   'Cavity surface area',     cavity_cm2,  'cm²',      0.1);
  html += field('ph-crit',   'Critical moisture gain',  critical_mg, 'mg/cavity',0.1);
  html += field('ph-years',  'Target shelf life',       shelf_years, 'years',    0.5);

  html += '</div>';
  html += '<button class="btn btn-danger" onclick="onPharmaMVTRCalc()">Calculate ICH Zones</button>';
  html += '</div>';

  html += '<div id="ph-results"></div>';
  html += '</div>';

  c.innerHTML = html;

  // Auto-calculate on load
  setTimeout(onPharmaMVTRCalc, 50);
}

function onPharmaMVTRCalc() {
  var get = function(id) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
  };

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

  var areaM2    = p.cavity_cm2 / 1e4;
  var shelfDays = p.shelf_years * 365;

  var rows = ICH_ZONES.map(function(z) {
    var wvtrEff = wvtrAtICH(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, z.T, z.RH);
    var ingress = wvtrEff * areaM2 * 365 * 1000;          // mg/cavity/year
    var total   = wvtrEff * areaM2 * shelfDays * 1000;    // mg over shelf life
    var pass    = total <= p.critical_mg;
    return { zone:z, wvtrEff:wvtrEff, ingressPerYear:ingress, total:total, pass:pass };
  });

  var el = document.getElementById('ph-results');
  if (!el) return;

  var html = '<div class="card">';
  html += '<h2 style="font-size:0.95rem;margin-bottom:0.75rem">Results — All ICH Zones</h2>';
  html += '<div style="overflow-x:auto">';
  html += '<table class="cond-table">';
  html += '<thead><tr>' +
    '<th>ICH Zone</th><th>T (°C)</th><th>RH (%)</th>' +
    '<th>WVTR_eff (g/m²/day)</th>' +
    '<th>Ingress / year (mg)</th>' +
    '<th>Total ' + p.shelf_years + ' yr (mg)</th>' +
    '<th>vs ' + p.critical_mg + ' mg limit</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < rows.length; i++) {
    var r   = rows[i];
    var bg  = r.pass ? 'background:#f0fdf4' : 'background:#fef2f2';
    html += '<tr style="' + bg + '">';
    html += '<td><strong>' + r.zone.label + '</strong><br><span style="font-size:0.68rem;color:var(--text-light)">' + r.zone.desc + '</span></td>';
    html += '<td>' + r.zone.T + '</td>';
    html += '<td>' + r.zone.RH + '</td>';
    html += '<td>' + r.wvtrEff.toFixed(4) + '</td>';
    html += '<td>' + r.ingressPerYear.toFixed(3) + '</td>';
    html += '<td><strong>' + r.total.toFixed(3) + '</strong></td>';
    html += '<td>' + (r.pass
      ? '<span style="color:#16a34a;font-weight:700">✓ PASS</span>'
      : '<span style="color:#dc2626;font-weight:700">✗ FAIL</span> <span style="font-size:0.7rem;color:#dc2626">(+' + ((r.total / p.critical_mg * 100 - 100).toFixed(0)) + '%)</span>') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  html += '<p style="font-size:0.72rem;color:var(--text-light);margin-top:0.75rem">';
  html += 'Arrhenius correction: Eₐ = ' + p.Ea_kJ + ' kJ/mol · ';
  html += 'Reference: ' + p.wvtr_ref + ' g/m²/day at ' + p.T_ref + '°C / ' + p.RH_ref + '% RH · ';
  html += 'Cavity area: ' + p.cavity_cm2 + ' cm²</p>';
  html += '</div>';

  el.innerHTML = html;
}
