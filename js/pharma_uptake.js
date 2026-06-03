// ====================================================================
// pharma_uptake.js  —  Drug Moisture Uptake  v2
// Biomedical Analysis → Drug Moisture Uptake  (State.tab === 'pharma-uptake')
// Style: same as shelflife.js / pharma_mvtr
// ====================================================================

// ── Core model ───────────────────────────────────────────────────────
// Linear moisture uptake (ICH Q1A(R2)):
//   rate (%MC/day) = WVTR_eff × A_m2 × RH_store/100 / W_g × 100
//   t_sl (days)    = delta_MC_crit / rate
//   Potency:        P(t) = 100 × exp(−k × t);  t90 = ln(100/90)/k

function calcMoistureUptakeTimeline(p) {
  // Arrhenius correction (reuses wvtrAtICH if available in host app)
  var wvtr_eff = p.wvtr_ref;
  if (typeof wvtrAtICH === 'function') {
    wvtr_eff = wvtrAtICH(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, p.T_store, p.RH_store);
  } else {
    // Inline Arrhenius fallback
    var R = 8.314;
    var Ea_J = (p.Ea_kJ || 0) * 1000;
    if (Ea_J > 0) {
      var T1 = p.T_ref + 273.15;
      var T2 = p.T_store + 273.15;
      wvtr_eff = p.wvtr_ref * Math.exp(-(Ea_J / R) * (1 / T2 - 1 / T1));
    }
  }

  var A_m2 = p.cavity_cm2 / 1e4;
  var W_g  = p.drug_mass_mg / 1000;
  var rate = (W_g > 0) ? (wvtr_eff * A_m2 * p.RH_store / 100) / W_g * 100 : 0;
  var sl_day = (rate > 0) ? (p.delta_mc_crit / rate) : null;

  var tl = [];
  for (var t = 0; t <= p.sim_days; t++) {
    tl.push({
      t:       t,
      mc:      p.mc_initial + rate * t,
      potency: 100 * Math.exp(-(p.k_deg_day || 0) * t)
    });
  }

  var potency_sl = null;
  if (p.k_deg_day > 0) {
    potency_sl = Math.log(100 / 90) / p.k_deg_day;
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

// ── Main render ───────────────────────────────────────────────────────
function renderPharmaUptake() {
  var c = document.getElementById('app-content');
  if (!c) return;

  var st            = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {};
  var wvtr_ref      = st.wvtr_ref      != null ? st.wvtr_ref      : 1.0;
  var T_ref         = st.T_ref         != null ? st.T_ref         : 38;
  var RH_ref        = st.RH_ref        != null ? st.RH_ref        : 90;
  var Ea_kJ         = st.Ea_kJ         != null ? st.Ea_kJ         : 35;
  var T_store       = st.T_store       != null ? st.T_store       : 25;
  var RH_store      = st.RH_store      != null ? st.RH_store      : 60;
  var cavity_cm2    = st.cavity_cm2    != null ? st.cavity_cm2    : 2.0;
  var drug_mass_mg  = st.drug_mass_mg  != null ? st.drug_mass_mg  : 200;
  var mc_initial    = st.mc_initial    != null ? st.mc_initial    : 0.5;
  var delta_mc_crit = st.delta_mc_crit != null ? st.delta_mc_crit : 1.5;
  var k_deg_day     = st.k_deg_day     != null ? st.k_deg_day     : 0.0003;
  var sim_days      = st.sim_days      != null ? st.sim_days      : 730;

  // ── Helper: numeric field identical to shelflife.js style ─────────
  function field(id, label, val, unit, step, hint) {
    return '<div class="form-group" style="margin:0">' +
      '<label>' + label + '</label>' +
      '<div style="display:flex;align-items:center;gap:0.35rem">' +
      '<input type="number" id="' + id + '" value="' + val + '" step="' + (step || 'any') + '" min="0" class="form-input" style="flex:1">' +
      '<span style="font-size:0.7rem;color:var(--text-light);white-space:nowrap">' + unit + '</span>' +
      '</div>' +
      (hint ? '<div style="font-size:0.65rem;color:var(--text-light);margin-top:0.15rem">' + hint + '</div>' : '') +
      '</div>';
  }

  // ── Section divider (same violet as pharma-mvtr) ───────────────────
  function sectionDiv(label) {
    return '<div style="grid-column:1/-1;font-size:0.7rem;font-weight:700;text-transform:uppercase;' +
           'letter-spacing:0.06em;color:#8b5cf6;padding-top:0.5rem;padding-bottom:0.15rem;' +
           'border-top:1px solid #e9d5ff;margin-top:0.15rem">' + label + '</div>';
  }

  // ── Step header (same blue chevron as shelflife.js) ────────────────
  function stepHeader(n, label, color) {
    color = color || 'var(--primary)';
    return '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.6rem;' +
           'color:' + color + ';font-weight:600;font-size:0.85rem">▼ ' + n + '. ' + label + '</div>';
  }

  // ── Page breadcrumb + title ────────────────────────────────────────
  var html = '<div style="max-width:1200px;margin:0 auto;padding:1.5rem">';
  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;' +
          'color:var(--text-light);margin-bottom:0.3rem">Biomedical Analysis</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem">Drug Moisture Uptake</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:720px">' +
          'Predict moisture content evolution inside a blister cavity and estimate shelf life ' +
          'limited by critical moisture gain or first-order chemical degradation (ICH Q1A(R2)).</p>';
  html += '</div>';

  // ── Two-column layout (form | results) ────────────────────────────
  html += '<div class="grid grid-2" style="gap:1.2rem;align-items:start">';

  // ════════════════════════════════════════════════════════
  // LEFT COLUMN — Form card
  // ════════════════════════════════════════════════════════
  html += '<div class="card" style="padding:0">';

  // Card header
  html += '<div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">';
  html += '<h2 style="margin:0;font-size:1rem;display:flex;align-items:center;gap:0.4rem">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">';
  html += '<path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>';
  html += '</svg>Parameters</h2>';
  html += '</div>';

  // ── STEP 1: Barrier film ─────────────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(1, 'Barrier Film (WVTR)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:0.6rem">';
  html += field('pu-wvtr',  'WVTR (test cond.)',      wvtr_ref, 'g/m²/day', 0.01);
  html += field('pu-tref',  'Reference temp',          T_ref,    '°C',       0.5);
  html += field('pu-rhref', 'Reference RH',            RH_ref,   '%',        1);
  html += field('pu-ea',    'Activation energy E<sub>a</sub>', Ea_kJ, 'kJ/mol', 1,
                'Arrhenius correction to storage T. Typical LDPE ≈ 35–45 kJ/mol');
  html += '</div>';
  // Active WVTR summary pill
  html += '<div style="margin-top:0.65rem;background:var(--primary-light);border-radius:6px;' +
          'padding:0.4rem 0.75rem;display:flex;justify-content:space-between;align-items:center">';
  html += '<span style="font-size:0.75rem;font-weight:600">Active WVTR at storage:</span>';
  html += '<strong id="pu-wvtr-eff" style="color:var(--primary);font-size:0.9rem">— g/m²/day</strong>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 2: Storage conditions ──────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(2, 'Storage Conditions', 'var(--warning)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">';
  html += field('pu-tstore',  'Storage temperature', T_store,  '°C', 0.5);
  html += field('pu-rhstore', 'Storage RH',          RH_store, '%',  1);
  html += '</div>';

  // ICH zone quick-select
  html += '<div style="margin-top:0.65rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;' +
          'color:var(--text-light);margin-bottom:0.35rem">ICH Q1A(R2) Quick Select</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.3rem">';
  var zones = [
    { label:'Zone I',   t:25, rh:60 },
    { label:'Zone II',  t:25, rh:60 },
    { label:'Zone III', t:30, rh:35 },
    { label:'Zone IVb', t:40, rh:75 }
  ];
  zones.forEach(function(z) {
    html += '<button class="btn btn-sm btn-outline" style="font-size:0.68rem;padding:0.3rem 0.2rem;' +
            'white-space:nowrap" onclick="puSetZone(' + z.t + ',' + z.rh + ')">' +
            z.label + '<br><span style=\'font-size:0.6rem;color:var(--text-light)\'>' +
            z.t + '°C/' + z.rh + '%</span></button>';
  });
  html += '</div></div>';
  html += '</div>';
  html += '</div>';

  // ── STEP 3: Drug / dosage form ──────────────────────────────────
  html += '<div style="padding:1rem;border-bottom:1px solid var(--border)">';
  html += stepHeader(3, 'Drug / Dosage Form', 'var(--purple,#8b5cf6)');
  html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:0.6rem">';
  html += field('pu-area',   'Cavity surface area',   cavity_cm2,    'cm²',  0.1,
                'Exposed film area per blister pocket');
  html += field('pu-dmass',  'Drug mass per cavity',  drug_mass_mg,  'mg',   1);
  html += field('pu-mcinit', 'Initial moisture',      mc_initial,    '%',    0.01);
  html += field('pu-dmcrit', 'Allowable MC gain',     delta_mc_crit, '%',    0.1,
                'Hygroscopic APIs 0.5–1% · tablets 1–3%');
  html += field('pu-kdeg',   'Degradation rate k',    k_deg_day,     '/day', 0.0001,
                'ICH ≥90% potency. k = ln(100/90)/t₉₀');
  html += field('pu-simdays','Simulation duration',   sim_days,      'days', 30);
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // ── CTA ─────────────────────────────────────────────────────────
  html += '<div style="padding:1rem">';
  html += '<button class="btn btn-danger btn-full" onclick="onPharmaUptakeCalc()" ' +
          'style="padding:0.8rem;font-size:0.9rem">▶ Calculate</button>';
  html += '</div>';

  html += '</div>'; // end left card

  // ════════════════════════════════════════════════════════
  // RIGHT COLUMN — Results (sticky)
  // ════════════════════════════════════════════════════════
  html += '<div style="position:sticky;top:1rem;height:fit-content">';

  // Placeholder before first calc
  html += '<div class="card" id="pu-result-panel">';
  html += '<div style="text-align:center;padding:2rem;color:var(--text-light)">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'style="width:48px;height:48px;margin-bottom:0.5rem;opacity:0.3">';
  html += '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
  html += '</svg>';
  html += '<p>Configure parameters and calculate to see predictions</p>';
  html += '</div>';
  html += '</div>';

  // Chart container (hidden until calc)
  html += '<div id="pu-charts-wrap" style="display:none;margin-top:1rem">';
  html += '<div class="card" style="margin-bottom:1rem">';
  html += '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Moisture Content Over Time</h3>';
  html += '<div class="chart-mini" style="height:260px"><canvas id="pu-mc-chart"></canvas></div>';
  html += '</div>';
  html += '<div class="card">';
  html += '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Potency Retention Over Time</h3>';
  html += '<div class="chart-mini" style="height:220px"><canvas id="pu-pot-chart"></canvas></div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end right col
  html += '</div>'; // end grid
  html += '</div>'; // end outer wrapper

  c.innerHTML = html;

  // ICH zone helper exposed globally
  window.puSetZone = function(t, rh) {
    var tEl = document.getElementById('pu-tstore');
    var rEl = document.getElementById('pu-rhstore');
    if (tEl) tEl.value = t;
    if (rEl) rEl.value = rh;
  };

  setTimeout(onPharmaUptakeCalc, 60);
}

// ── Calculation + result render ───────────────────────────────────────
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

  // Update WVTR-eff pill in form
  var wvtrPill = document.getElementById('pu-wvtr-eff');
  if (wvtrPill) wvtrPill.textContent = res.wvtr_eff.toFixed(4) + ' g/m²/day';

  // ── KPI boxes (same helper as shelflife.js) ───────────────────────
  function kpiBox(label, val, color, colorL, sub) {
    return '<div style="background:' + colorL + ';border:1px solid ' + color + ';' +
           'border-radius:12px;padding:1rem">' +
           '<div style="font-size:0.66rem;font-weight:700;letter-spacing:0.08em;' +
           'text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">' + label + '</div>' +
           '<div style="font-size:1.05rem;font-weight:800;color:' + color + ';line-height:1.25">' + val + '</div>' +
           (sub ? '<div style="font-size:0.68rem;color:var(--text-light);margin-top:0.2rem">' + sub + '</div>' : '') +
           '</div>';
  }

  var isM   = res.limitingFactor === 'moisture';
  var slStr = res.shelfLifeDay !== null
    ? res.shelfLifeDay.toFixed(0) + ' days (' + (res.shelfLifeDay / 365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days';
  var potStr = res.potencySlDay !== null
    ? res.potencySlDay.toFixed(0) + ' days (' + (res.potencySlDay / 365).toFixed(1) + ' yr)'
    : '> ' + p.sim_days + ' days (≥90%)';

  var kpis = '';
  kpis += kpiBox('Moisture shelf life', slStr,
    isM ? '#2563eb' : '#94a3b8', isM ? '#eff6ff' : '#f8fafc',
    isM ? '⚠ Limiting factor' : '');
  kpis += kpiBox('Potency shelf life', potStr,
    !isM ? '#8b5cf6' : '#94a3b8', !isM ? '#f5f3ff' : '#f8fafc',
    !isM ? '⚠ Limiting factor' : '');
  kpis += kpiBox('MC ingress rate', res.rate_pct_day.toFixed(4) + ' %/day',
    '#475569', '#f8fafc');
  kpis += kpiBox('WVTR<sub>eff</sub> at storage', res.wvtr_eff.toFixed(4) + ' g/m²/day',
    '#475569', '#f8fafc', p.T_store + '°C / ' + p.RH_store + '% RH');

  var panel = document.getElementById('pu-result-panel');
  if (panel) {
    // Shelf life hero
    var heroColor = isM ? 'var(--primary)' : '#8b5cf6';
    panel.innerHTML =
      '<div style="animation:fadeIn 0.3s ease">' +
      '<div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);' +
      'border-radius:12px;margin-bottom:1rem">' +
      '<div style="font-size:2.2rem;font-weight:800;color:' + heroColor + ';line-height:1.2">' +
      (res.shelfLifeDay !== null ? res.shelfLifeDay.toFixed(0) : '>' + p.sim_days) + ' Days</div>' +
      '<div style="font-size:0.82rem;color:var(--text-light);margin-top:0.35rem;font-weight:500">' +
      'Moisture shelf life · ICH Q1A(R2)</div>' +
      '<span class="badge badge-blue" style="margin-top:0.5rem;display:inline-block">' +
      'Limiting: ' + (isM ? 'Moisture' : 'Degradation') + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">' + kpis + '</div>' +
      '</div>';
  }

  // Show chart wrapper
  var wrap = document.getElementById('pu-charts-wrap');
  if (wrap) wrap.style.display = 'block';

  // ── Charts ────────────────────────────────────────────────────────
  setTimeout(function() {
    if (typeof Chart === 'undefined') return;

    var days    = res.timeline.map(function(pt) { return pt.t; });
    var mcs     = res.timeline.map(function(pt) { return pt.mc; });
    var pots    = res.timeline.map(function(pt) { return pt.potency; });
    var limitMC = p.mc_initial + p.delta_mc_crit;

    // Destroy old
    if (window._puMcChart)  { window._puMcChart.destroy();  window._puMcChart  = null; }
    if (window._puPotChart) { window._puPotChart.destroy(); window._puPotChart = null; }

    // MC chart
    var cv1 = document.getElementById('pu-mc-chart');
    if (cv1) {
      window._puMcChart = new Chart(cv1.getContext('2d'), {
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
              label: 'Critical limit (' + limitMC.toFixed(2) + '%)',
              data: new Array(days.length).fill(limitMC),
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
            y: { title: { display: true, text: 'Moisture Content (%)' }, ticks: { font: { size: 9 } } }
          }
        }
      });
    }

    // Potency chart
    var cv2 = document.getElementById('pu-pot-chart');
    if (cv2) {
      window._puPotChart = new Chart(cv2.getContext('2d'), {
        type: 'line',
        data: {
          labels: days,
          datasets: [
            {
              label: 'Potency (%)',
              data: pots,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139,92,246,0.08)',
              fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
            },
            {
              label: 'ICH limit (90%)',
              data: new Array(days.length).fill(90),
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
              min: 70, max: 102,
              title: { display: true, text: 'Potency (%)' },
              ticks: { font: { size: 9 }, callback: function(v) { return v + '%'; } }
            }
          }
        }
      });
    }
  }, 120);
}
