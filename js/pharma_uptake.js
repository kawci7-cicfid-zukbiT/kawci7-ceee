// ====================================================================
// pharma_uptake.js  —  Drug Moisture Uptake Model
// Biomedical Analysis → Drug Moisture Uptake  (State.tab === 'pharma-uptake')
// Pattern: writes directly to #app-content (same as renderCarbonFootprint)
// ====================================================================

// Linear moisture uptake model (ICH Q1A(R2)):
//   rate (%MC/day) = WVTR_eff × A × RH_ext/100 / W_g × 100
//   t_sl (days)    = delta_MC_crit / rate

function calcMoistureUptakeTimeline(p) {
  // Arrhenius correction (reuse wvtrAtICH if available)
  var wvtr_eff = p.wvtr_ref;
  if (typeof wvtrAtICH === 'function') {
    wvtr_eff = wvtrAtICH(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, p.T_store, p.RH_store);
  }

  var A_m2     = p.cavity_cm2 / 1e4;
  var W_g      = p.drug_mass_mg / 1000;
  var rate     = (W_g > 0) ? (wvtr_eff * A_m2 * p.RH_store / 100) / W_g * 100 : 0;
  var sl_day   = (rate > 0) ? (p.delta_mc_crit / rate) : null;

  // Timeline
  var tl = [];
  for (var t = 0; t <= p.sim_days; t++) {
    var mc      = p.mc_initial + rate * t;
    var potency = 100 * Math.exp(-(p.k_deg_day || 0) * t);
    tl.push({ t:t, mc:mc, potency:potency });
  }

  // Potency shelf life (90% ICH limit)
  var potency_sl = null;
  if (p.k_deg_day > 0) {
    potency_sl = Math.log(100/90) / p.k_deg_day;
  }

  return {
    timeline:      tl,
    shelfLifeDay:  sl_day,
    potencySlDay:  potency_sl,
    rate_pct_day:  rate,
    wvtr_eff:      wvtr_eff,
    limitingFactor: (sl_day !== null && (potency_sl === null || sl_day <= potency_sl))
                    ? 'moisture' : 'degradation'
  };
}

function renderPharmaUptake() {
  var c = document.getElementById('app-content');
  if (!c) return;

  var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {};
  var wvtr_ref      = st.wvtr_ref      || 1.0;
  var T_ref         = st.T_ref         || 38;
  var RH_ref        = st.RH_ref        || 90;
  var Ea_kJ         = st.Ea_kJ         || 35;
  var T_store       = st.T_store       || 25;
  var RH_store      = st.RH_store      || 60;
  var cavity_cm2    = st.cavity_cm2    || 2.0;
  var drug_mass_mg  = st.drug_mass_mg  || 200;
  var mc_initial    = st.mc_initial    || 0.5;
  var delta_mc_crit = st.delta_mc_crit || 1.5;
  var k_deg_day     = st.k_deg_day     || 0.0003;
  var sim_days      = st.sim_days      || 730;

  var html = '<div style="max-width:1100px;margin:0 auto;padding:1.5rem">';

  // Page title
  html += '<div style="margin-bottom:1.5rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Biomedical Analysis</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem">Drug Moisture Uptake</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:700px">Predict moisture content evolution inside a blister cavity and estimate shelf life limited by critical moisture gain or chemical degradation (ICH Q1A(R2)).</p>';
  html += '</div>';

  // Input card
  html += '<div class="card" style="margin-bottom:1.25rem">';
  html += '<h2 style="font-size:0.95rem;margin-bottom:1rem">Parameters</h2>';
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

  // Section: film
  html += '<div style="grid-column:1/-1;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8b5cf6;padding-top:0.25rem;border-top:1px solid #e9d5ff">Barrier film</div>';
  html += field('pu-wvtr',   'WVTR reference',         wvtr_ref,     'g/m²/day', 0.01);
  html += field('pu-tref',   'Reference temperature',  T_ref,        '°C',       0.5);
  html += field('pu-rhref',  'Reference RH',           RH_ref,       '%',        1);
  html += field('pu-ea',     'Activation energy Eₐ',   Ea_kJ,        'kJ/mol',   1);

  // Section: storage
  html += '<div style="grid-column:1/-1;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8b5cf6;padding-top:0.25rem;border-top:1px solid #e9d5ff;margin-top:0.25rem">Storage conditions</div>';
  html += field('pu-tstore', 'Storage temperature',    T_store,      '°C',       0.5);
  html += field('pu-rhstore','Storage RH',             RH_store,     '%',        1);

  // Section: drug
  html += '<div style="grid-column:1/-1;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#8b5cf6;padding-top:0.25rem;border-top:1px solid #e9d5ff;margin-top:0.25rem">Drug / dosage form</div>';
  html += field('pu-area',   'Cavity surface area',    cavity_cm2,   'cm²',      0.1);
  html += field('pu-dmass',  'Drug mass per cavity',   drug_mass_mg, 'mg',       1);
  html += field('pu-mcinit', 'Initial moisture content',mc_initial,  '%',        0.01);
  html += field('pu-dmcrit', 'Allowable moisture gain',delta_mc_crit,'%',        0.1, 'Typical: hygroscopic APIs 0.5–1% · tablets 1–3%');
  html += field('pu-kdeg',   'Degradation rate k',     k_deg_day,   '/day',      0.0001, 'ICH limit: ≥90% potency. k = ln(100/90)/t₉₀');
  html += field('pu-simdays','Simulation duration',    sim_days,    'days',      30);

  html += '</div>';
  html += '<button class="btn btn-danger" onclick="onPharmaUptakeCalc()">Calculate</button>';
  html += '</div>';

  html += '<div id="pu-results"></div>';
  html += '</div>';

  c.innerHTML = html;
  setTimeout(onPharmaUptakeCalc, 50);
}

function onPharmaUptakeCalc() {
  var get = function(id) {
    var el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
  };

  var p = {
    wvtr_ref:      get('pu-wvtr'),
    T_ref:         get('pu-tref'),
    RH_ref:        get('pu-rhref'),
    Ea_kJ:         get('pu-ea'),
    T_store:       get('pu-tstore'),
    RH_store:      get('pu-rhstore'),
    cavity_cm2:    get('pu-area'),
    drug_mass_mg:  get('pu-dmass'),
    mc_initial:    get('pu-mcinit'),
    delta_mc_crit: get('pu-dmcrit'),
    k_deg_day:     get('pu-kdeg'),
    sim_days:      get('pu-simdays')
  };
  if (typeof State !== 'undefined') State.pharmaUptake = p;

  var res = calcMoistureUptakeTimeline(p);

  var el = document.getElementById('pu-results');
  if (!el) return;

  // KPI row
  var slStr = res.shelfLifeDay !== null
    ? res.shelfLifeDay.toFixed(0) + ' days (' + (res.shelfLifeDay/365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days';

  var potStr = res.potencySlDay !== null
    ? res.potencySlDay.toFixed(0) + ' days (' + (res.potencySlDay/365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days (≥90%)';

  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.25rem">';

  function kpi(label, val, color, sub) {
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem">' +
      '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.35rem">' + label + '</div>' +
      '<div style="font-size:1.1rem;font-weight:800;color:' + color + ';line-height:1.2">' + val + '</div>' +
      (sub ? '<div style="font-size:0.7rem;color:var(--text-light);margin-top:0.2rem">' + sub + '</div>' : '') +
      '</div>';
  }

  html += kpi('Moisture shelf life', slStr,
    res.limitingFactor === 'moisture' ? '#2563eb' : '#64748b',
    res.limitingFactor === 'moisture' ? '⚠ Limiting factor' : '');
  html += kpi('Potency shelf life', potStr,
    res.limitingFactor === 'degradation' ? '#8b5cf6' : '#64748b',
    res.limitingFactor === 'degradation' ? '⚠ Limiting factor' : '');
  html += kpi('MC ingress rate', res.rate_pct_day.toFixed(4) + ' %/day', '#64748b');
  html += kpi('WVTR_eff at storage', res.wvtr_eff.toFixed(4) + ' g/m²/day', '#64748b',
    p.T_store + '°C / ' + p.RH_store + '% RH');

  html += '</div>';

  // Chart canvas
  html += '<div class="card" style="margin-bottom:1.25rem">';
  html += '<h2 style="font-size:0.9rem;margin-bottom:0.5rem">Moisture Content Over Time</h2>';
  html += '<div style="height:260px;position:relative"><canvas id="pu-chart"></canvas></div>';
  html += '</div>';

  el.innerHTML = html;

  // Draw chart
  setTimeout(function() {
    var canvas = document.getElementById('pu-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (window._puChart) { window._puChart.destroy(); window._puChart = null; }

    var limitMC = p.mc_initial + p.delta_mc_crit;
    var days    = res.timeline.map(function(pt){ return pt.t; });
    var mcs     = res.timeline.map(function(pt){ return pt.mc; });

    window._puChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Moisture Content (%)',
            data: mcs,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.08)',
            fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
          },
          {
            label: 'Critical limit (' + limitMC.toFixed(1) + '%)',
            data: new Array(days.length).fill(limitMC),
            borderColor: '#ef4444',
            borderDash: [6,4], borderWidth: 2,
            pointRadius: 0, fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position:'top', labels:{ boxWidth:12, font:{ size:10 } } }
        },
        scales: {
          x: { title:{ display:true, text:'Days' }, ticks:{ font:{ size:9 } } },
          y: { title:{ display:true, text:'Moisture Content (%)' },
               ticks:{ font:{ size:9 } } }
        }
      }
    });
  }, 100);
}
