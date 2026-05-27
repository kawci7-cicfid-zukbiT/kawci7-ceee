// ====================================================================
// render_patch.js  v4 — routes new tabs to their dedicated renderers
// MODIFICA: headspace ora usa renderHeadspace() da headspace.js (se disponibile)
// Fallback: mantiene _renderHeadspace() legacy per compatibilità
// ====================================================================
(function () {

  var _orig = window.renderContent;

  // ──────────────────────────────────────────────────────────────────
  // HEADSPACE — Prefer new renderHeadspace() if available
  // ──────────────────────────────────────────────────────────────────
  function _renderHeadspace() {
    // Se esiste il nuovo renderer con layout shelflife-style, usalo
    if (typeof renderHeadspace === 'function' && typeof HS !== 'undefined') {
      return renderHeadspace();
    }

    // Fallback legacy (codice originale)
    var c = document.getElementById('app-content'); if (!c) return;
    var hs = (typeof State !== 'undefined' && State.headspace) ? State.headspace : {
      preset:'coffee', otr_film:1.0, area_cm2:600, headspace_ml:200,
      o2_initial:0, o2_limit:1, k_resp:0, resp_order:'zero', product_kg:0.25, days:365
    };
    var HS_P = (typeof HS_PRESETS !== 'undefined') ? HS_PRESETS : {
      'fresh-meat'  : { o2_initial:70, o2_limit:5,  k_resp:10, resp_order:'zero',  label:'Fresh meat (MAP 70% O₂)' },
      'chilled-meat': { o2_initial:2,  o2_limit:1,  k_resp:5,  resp_order:'zero',  label:'Chilled cooked meat' },
      'cheese'      : { o2_initial:0,  o2_limit:1,  k_resp:2,  resp_order:'first', label:'Cheese (vacuum)' },
      'coffee'      : { o2_initial:0,  o2_limit:1,  k_resp:0,  resp_order:'zero',  label:'Roasted coffee (flushed N₂)' },
      'berries'     : { o2_initial:21, o2_limit:3,  k_resp:30, resp_order:'first', label:'Fresh berries' },
      'salad'       : { o2_initial:21, o2_limit:3,  k_resp:50, resp_order:'first', label:'Fresh-cut salad' },
      'custom'      : { o2_initial:21, o2_limit:1,  k_resp:5,  resp_order:'zero',  label:'Custom' }
    };
    var pOpts = '';
    for (var k in HS_P) pOpts += '<option value="' + k + '"' + (hs.preset === k ? ' selected' : '') + '>' + HS_P[k].label + '</option>';

    function fld(id, lbl, val, unit, step) {
      return '<div class="ph-field"><label>' + lbl + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
        '" step="' + (step || 'any') + '" min="0" class="form-input"> <span class="ph-unit">' + unit + '</span></div></div>';
    }

    var html = '<div style="max-width:900px;margin:0 auto"><div class="card">';
    html += '<h2>Headspace O₂ Calculator</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Model O₂ evolution inside a sealed package: ingress through the film vs. product respiration.</p>';
    html += '<div class="form-group"><label>Product preset</label><select id="hs-preset" class="form-input" onchange="hsPresetChange()">' + pOpts + '</select></div>';
    html += '<div class="pharma-grid">';
    html += fld('hs-otr',    'Film OTR',            hs.otr_film,     'cm³/m²/day', 0.01);
    html += fld('hs-area',   'Package inner area',  hs.area_cm2,     'cm²',        1);
    html += fld('hs-vol',    'Headspace volume',    hs.headspace_ml, 'mL',         1);
    html += fld('hs-o2init', 'Initial O₂',          hs.o2_initial,   '%',          0.1);
    html += fld('hs-o2limit','O₂ shelf-life limit', hs.o2_limit,     '%',          0.1);
    html += fld('hs-kresp',  'O₂ consumption rate', hs.k_resp,       'cm³/kg·day', 0.1);
    html += fld('hs-prodkg', 'Product mass',        hs.product_kg,   'kg',         0.01);
    html += fld('hs-days',   'Simulation duration', hs.days,         'days',       1);
    html += '<div class="ph-field"><label>Respiration order</label><select id="hs-order" class="form-input">';
    html += '<option value="zero"'  + (hs.resp_order === 'zero'  ? ' selected' : '') + '>Zero-order (constant)</option>';
    html += '<option value="first"' + (hs.resp_order === 'first' ? ' selected' : '') + '>First-order (∝ O₂)</option>';
    html += '</select></div></div>';
    html += '<button class="btn btn-primary" onclick="hsCalc()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="hs-results" style="margin-top:1rem"></div>';
    html += '</div>' + _hsMethodology() + '</div>';
    c.innerHTML = html;
    setTimeout(hsCalc, 100);
  }

  // Legacy wrapper functions (only if new HS object not available)
  window.hsPresetChange = function () {
    if (typeof HS !== 'undefined' && typeof HS.onProductChange === 'function') {
      return HS.onProductChange();
    }
    // Fallback legacy
    var k  = document.getElementById('hs-preset') ? document.getElementById('hs-preset').value : '';
    var p  = (typeof HS_PRESETS !== 'undefined') ? HS_PRESETS[k] : null;
    if (!p) return;
    var s  = function (id, v) { var e = document.getElementById(id); if (e) e.value = v; };
    s('hs-o2init', p.o2_initial); s('hs-o2limit', p.o2_limit); s('hs-kresp', p.k_resp);
    var o = document.getElementById('hs-order'); if (o) o.value = p.resp_order;
  };

  window.hsCalc = function () {
    if (typeof HS !== 'undefined' && typeof HS.calculate === 'function') {
      return HS.calculate();
    }
    // Fallback legacy
    if (typeof calcHeadspace !== 'function') return;
    var g = function (id) { var e = document.getElementById(id); return e ? (parseFloat(e.value) || 0) : 0; };
    var p = {
      preset:       document.getElementById('hs-preset') ? document.getElementById('hs-preset').value : 'custom',
      otr_film:     g('hs-otr'),   area_cm2:     g('hs-area'),
      headspace_ml: g('hs-vol'),   o2_initial:   g('hs-o2init'),
      o2_limit:     g('hs-o2limit'), k_resp:      g('hs-kresp'),
      product_kg:   g('hs-prodkg'), resp_order:  document.getElementById('hs-order') ? document.getElementById('hs-order').value : 'zero',
      days:         g('hs-days')
    };
    if (typeof State !== 'undefined') State.headspace = p;
    var res = calcHeadspace(p);
    var el  = document.getElementById('hs-results'); if (!el) return;
    var sl  = res.shelfLifeDay !== null
      ? '<strong>' + res.shelfLifeDay.toFixed(0) + ' days</strong>'
      : '> ' + p.days + ' days (limit not reached)';
    var h = '<div class="ph-result-box">' +
      '<div class="ph-kpi"><span class="ph-kpi-val">' + sl + '</span><span class="ph-kpi-lbl">Estimated shelf life</span></div>' +
      '<div class="ph-kpi"><span class="ph-kpi-val">' + res.finalO2.toFixed(1) + '%</span><span class="ph-kpi-lbl">Final O₂ at day ' + p.days + '</span></div>' +
      '</div>';
    if (typeof renderHsChart === 'function') h += renderHsChart(res.timeline, p.o2_limit, p.o2_initial);
    el.innerHTML = h;
  };

  function _hsMethodology() {
    return '<div class="card methodology-card" style="margin-top:1rem;border-left:4px solid var(--primary);background:#fff">' +
      '<div style="padding:1rem 1.4rem">' +
      '<h2 style="font-family:Georgia,serif;font-size:1.1rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.4rem;margin-bottom:0.8rem">Understanding the Headspace O₂ Model</h2>' +
      '<div style="font-size:0.87rem;line-height:1.7;color:#334155;font-family:Georgia,serif">' +
      '<p>A sealed package is not a closed system. O₂ permeates through the film driven by the partial-pressure gradient between external air (20.95%) and the internal concentration; simultaneously the product consumes O₂ through respiration or oxidation. This calculator solves both fluxes simultaneously.</p>' +
      '<div style="background:#f8fafc;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.82rem;text-align:center;border:1px dashed #e2e8f0;margin:0.7rem 0">' +
        'dO₂/dt = OTR_eff · A − R_resp &nbsp;(cm³/day)<br><br>' +
        'OTR_eff = OTR_film · A · (pO₂_ext − pO₂_int) / pO₂_ext<br><br>' +
        'R_resp = k · W [zero-order] &nbsp;or&nbsp; k · W · O₂_frac [first-order]' +
      '</div>' +
      '<p><strong>Zero-order:</strong> fixed O₂ consumption per kg/day — processed or dried foods. <strong>First-order:</strong> consumption scales with current O₂ fraction — living tissues (berries, salad). Integration uses explicit Euler with a 0.5-day time step. Simulation halts when the O₂ trajectory crosses the user-defined limit.</p>' +
      '<div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:0.6rem 0.8rem;font-family:sans-serif;font-size:0.8rem;color:#92400e"><strong>Disclaimer:</strong> Screening tool for MAP design. O₂ limits and microbial safety must be validated by accredited laboratory testing.</div>' +
      '</div></div></div>';
  }

  // ──────────────────────────────────────────────────────────────────
  // PHARMA MVTR (unchanged)
  // ──────────────────────────────────────────────────────────────────
  function _renderPharmaMVTR() {
    var c = document.getElementById('app-content'); if (!c) return;
    var st = (typeof State !== 'undefined' && State.pharmaMVTR) ? State.pharmaMVTR
      : { wvtr_ref:1.0, T_ref:38, RH_ref:90, Ea_kJ:35, cavity_cm2:2.0, critical_mg:2.0, shelf_years:2 };

    function f(id, l, v, u, s) {
      return '<div class="ph-field"><label>' + l + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + v +
        '" step="' + (s || 'any') + '" min="0" class="form-input"> <span class="ph-unit">' + u + '</span></div></div>';
    }

    var html = '<div style="max-width:960px;margin:0 auto"><div class="card">';
    html += '<h2>MVTR at ICH Conditions</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Calculate effective MVTR across all ICH Q1A(R2) climatic zones.</p>';
    html += '<div class="pharma-grid">';
    html += '<div class="ph-section-title">Reference measurement</div>';
    html += f('ph-wvtr',  'WVTR (reference)',     st.wvtr_ref,    'g/m²/day', 0.01);
    html += f('ph-tref',  'Reference temperature',st.T_ref,       '°C',       0.5);
    html += f('ph-rhref', 'Reference RH',         st.RH_ref,      '%',        1);
    html += f('ph-ea',    'Activation energy Eₐ', st.Ea_kJ,       'kJ/mol',   1);
    html += '<div class="ph-hint">Eₐ = 0 disables Arrhenius correction (RH scaling only).<br>Typical: PET 30–40 · PVDC 45–55 · PA 40–50 kJ/mol</div>';
    html += '<div class="ph-section-title">Blister geometry &amp; criticality</div>';
    html += f('ph-area',  'Cavity surface area',   st.cavity_cm2,  'cm²',   0.1);
    html += f('ph-crit',  'Critical moisture gain',st.critical_mg, 'mg/cavity', 0.1);
    html += f('ph-years', 'Target shelf life',     st.shelf_years, 'years', 0.5);
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="phMVTRCalc()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="ph-results" style="margin-top:1rem"></div>';
    html += '</div>' + _phMVTRMethodology() + '</div>';
    c.innerHTML = html;
    setTimeout(phMVTRCalc, 100);
  }

  window.phMVTRCalc = function () {
    var g = function (id) { var e = document.getElementById(id); return e ? (parseFloat(e.value) || 0) : 0; };
    if (typeof wvtrAtCondition !== 'function' || typeof ICH_ZONES === 'undefined') {
      if (typeof onPharmaMVTRCalc === 'function') { onPharmaMVTRCalc(); return; }
      return;
    }
    var p = {
      wvtr_ref: g('ph-wvtr'), T_ref: g('ph-tref'), RH_ref: g('ph-rhref'),
      Ea_kJ: g('ph-ea'), cavity_cm2: g('ph-area'), critical_mg: g('ph-crit'), shelf_years: g('ph-years')
    };
    if (typeof State !== 'undefined') State.pharmaMVTR = p;
    var aM2 = p.cavity_cm2 / 1e4, sd = p.shelf_years * 365;
    var rows = ICH_ZONES.map(function (z) {
      var w   = wvtrAtCondition(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, z.T, z.RH);
      var ing = w * aM2 * z.days * 1000;
      var tot = ing * (sd / z.days);
      return { zone: z, wvtrEff: w, ingressPerYear: ing, total: tot, pass: tot <= p.critical_mg };
    });
    if (typeof renderPharmaMVTRResults === 'function') renderPharmaMVTRResults(rows, p);
  };

  function _phMVTRMethodology() {
    return '<div class="card methodology-card" style="margin-top:1rem;border-left:4px solid var(--primary);background:#fff">' +
      '<div style="padding:1rem 1.4rem">' +
      '<h2 style="font-family:Georgia,serif;font-size:1.1rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.4rem;margin-bottom:0.8rem">Understanding MVTR at ICH Conditions</h2>' +
      '<div style="font-size:0.87rem;line-height:1.7;color:#334155;font-family:Georgia,serif">' +
      '<p>ICH Q1A(R2) defines discrete climatic zones each with a representative temperature and relative humidity. This tool predicts the effective MVTR at every zone and checks whether the resulting moisture ingress per blister cavity stays within the critical tolerance over the intended shelf life.</p>' +
      '<div style="background:#f8fafc;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.82rem;text-align:center;border:1px dashed #e2e8f0;margin:0.7rem 0">' +
        'WVTR(T) = WVTR_ref × exp( Eₐ/R × (1/T_ref − 1/T_ich) ) &nbsp;·&nbsp; R = 8.314×10⁻³ kJ·mol⁻¹·K⁻¹<br><br>' +
        'WVTR_eff = WVTR(T) × ( RH_ich / RH_ref )<br><br>' +
        'm (mg) = WVTR_eff × A_cavity (m²) × days × 1000' +
      '</div>' +
      '<p>PASS/FAIL compares total ingress against the critical limit. The ICH Accelerated condition (40°C/75% RH, 6 months) is typically the binding constraint for Zone IVa markets.</p>' +
      '<div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:0.6rem 0.8rem;font-family:sans-serif;font-size:0.8rem;color:#92400e"><strong>Regulatory note:</strong> Validate with real-time or accelerated stability studies before submitting registration dossiers.</div>' +
      '</div></div></div>';
  }

  // ──────────────────────────────────────────────────────────────────
  // PHARMA UPTAKE (unchanged)
  // ──────────────────────────────────────────────────────────────────
  function _renderPharmaUptake() {
    var c = document.getElementById('app-content'); if (!c) return;
    var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake
      : { wvtr_ref:1.0, T_ref:38, RH_ref:90, Ea_kJ:35, ich_zone:'IVa', cavity_cm2:2.0,
          drug_mass_mg:200, mc_initial:0.5, delta_mc_crit:1.5, deg_model:'hydrolysis',
          k_deg_day:0.0003, sim_days:730 };

    function f(id, l, v, u, s) {
      return '<div class="ph-field"><label>' + l + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + v +
        '" step="' + (s || 'any') + '" min="0" class="form-input"> <span class="ph-unit">' + u + '</span></div></div>';
    }

    var zones  = (typeof ICH_ZONES !== 'undefined') ? ICH_ZONES
      : (typeof UPTAKE_ICH_ZONES !== 'undefined' ? UPTAKE_ICH_ZONES : []);
    var zOpts  = zones.map(function (z) {
      return '<option value="' + z.id + '"' + (st.ich_zone === z.id ? ' selected' : '') + '>' +
             z.label + ' — ' + z.T + '°C / ' + z.RH + '% RH</option>';
    }).join('');

    var html = '<div style="max-width:960px;margin:0 auto"><div class="card">';
    html += '<h2>Drug Moisture Uptake</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Predict moisture content evolution and estimate shelf life (ICH Q1A(R2)).</p>';
    html += '<div class="pharma-grid">';
    html += '<div class="ph-section-title">Barrier film (WVTR reference)</div>';
    html += f('pu-wvtr',  'WVTR reference',        st.wvtr_ref,     'g/m²/day', 0.01);
    html += f('pu-tref',  'Reference temperature', st.T_ref,        '°C',       0.5);
    html += f('pu-rhref', 'Reference RH',          st.RH_ref,       '%',        1);
    html += f('pu-ea',    'Activation energy Eₐ',  st.Ea_kJ,        'kJ/mol',   1);
    html += '<div class="ph-section-title">Storage conditions (ICH zone)</div>';
    html += '<div class="ph-field"><label>ICH zone</label><select id="pu-zone" class="form-input">' + zOpts + '</select></div>';
    html += '<div class="ph-section-title">Drug / dosage form</div>';
    html += f('pu-area',   'Cavity surface area',      st.cavity_cm2,   'cm²',  0.1);
    html += f('pu-dmass',  'Drug mass per cavity',     st.drug_mass_mg, 'mg',   1);
    html += f('pu-mcinit', 'Initial moisture content', st.mc_initial,   '%',    0.01);
    html += f('pu-dmcrit', 'Allowable moisture gain',  st.delta_mc_crit,'%',    0.1);
    html += '<div class="ph-hint">Typical limits: hygroscopic APIs 0.5–1% · tablets 1–3% · lyophilised 0.5%</div>';
    html += '<div class="ph-section-title">Chemical degradation (optional)</div>';
    html += '<div class="ph-field"><label>Model</label><select id="pu-degmodel" class="form-input">';
    html += '<option value="none"'       + (st.deg_model === 'none'       ? ' selected' : '') + '>None</option>';
    html += '<option value="hydrolysis"' + (st.deg_model === 'hydrolysis' ? ' selected' : '') + '>Hydrolysis (first-order)</option>';
    html += '<option value="oxidation"'  + (st.deg_model === 'oxidation'  ? ' selected' : '') + '>Oxidation (first-order)</option>';
    html += '</select></div>';
    html += f('pu-kdeg',    'Rate constant k',      st.k_deg_day,  '/day', 0.0001);
    html += '<div class="ph-hint">ICH limit: ≥ 90% potency. k = ln(100/90) / t₉₀</div>';
    html += f('pu-simdays', 'Simulation duration',  st.sim_days,   'days', 30);
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="phUptakeCalc()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="pu-results" style="margin-top:1rem"></div>';
    html += '</div>' + _phUptakeMethodology() + '</div>';
    c.innerHTML = html;
    setTimeout(phUptakeCalc, 100);
  }

  window.phUptakeCalc = function () {
    if (typeof onPharmaUptakeCalc === 'function') onPharmaUptakeCalc();
  };

  function _phUptakeMethodology() {
    return '<div class="card methodology-card" style="margin-top:1rem;border-left:4px solid var(--primary);background:#fff">' +
      '<div style="padding:1rem 1.4rem">' +
      '<h2 style="font-family:Georgia,serif;font-size:1.1rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.4rem;margin-bottom:0.8rem">Understanding the Drug Moisture Uptake Model</h2>' +
      '<div style="font-size:0.87rem;line-height:1.7;color:#334155;font-family:Georgia,serif">' +
      '<p>Moisture catalyses hydrolysis reactions, accelerates polymorphic transitions, and plasticises film coatings. Predicting when a drug product crosses its critical moisture threshold is central to setting an evidence-based shelf life.</p>' +
      '<div style="background:#f8fafc;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.82rem;text-align:center;border:1px dashed #e2e8f0;margin:0.7rem 0">' +
        'dMC/dt = (WVTR_eff × A × RH_ext/100) / W_drug × 100 &nbsp;(%/day)<br><br>' +
        'Shelf life = ΔMC_crit / (dMC/dt)<br><br>' +
        'P(t) = 100 × exp(−k × t) &nbsp;[ICH limit: ≥ 90% potency]' +
      '</div>' +
      '<p>The limiting-factor display identifies whether moisture uptake or chemical degradation is the binding constraint. The sink assumption (internal RH ≈ 0) is valid for very dry hygroscopic APIs — in other cases the model is conservative.</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:0.6rem 0;font-family:sans-serif;font-size:0.83rem">' +
        '<thead><tr style="background:var(--primary-light)">' +
          '<th style="padding:0.4rem 0.6rem;text-align:left">Dosage form</th>' +
          '<th style="padding:0.4rem 0.6rem;text-align:left">ΔMC limit</th>' +
          '<th style="padding:0.4rem 0.6rem;text-align:left">Rationale</th>' +
        '</tr></thead><tbody>' +
        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:0.35rem 0.6rem">Hygroscopic API</td><td>0.5–1.0%</td><td>Hydrolysis / polymorphism</td></tr>' +
        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:0.35rem 0.6rem">Compressed tablet</td><td>1.0–3.0%</td><td>Disintegration / hardness</td></tr>' +
        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:0.35rem 0.6rem">Film-coated tablet</td><td>0.5–1.5%</td><td>Coat integrity</td></tr>' +
        '<tr><td style="padding:0.35rem 0.6rem">Lyophilised</td><td>0.5–1.0%</td><td>Reconstitution / stability</td></tr>' +
        '</tbody></table>' +
      '<div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:0.6rem 0.8rem;font-family:sans-serif;font-size:0.8rem;color:#92400e"><strong>Regulatory note:</strong> For internal ICH Q1A(R2) feasibility screening only. Shelf-life claims require real-time stability data.</div>' +
      '</div></div></div>';
  }

  // ──────────────────────────────────────────────────────────────────
  // ROUTER — Updated to prefer new renderers when available
  // ──────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────
// ROUTER — Updated to prefer new renderers when available
// ──────────────────────────────────────────────────────────────────
var ROUTES = {
  'carbonfp': function () {
    if (typeof renderCarbonFootprint === 'function') {
      renderCarbonFootprint();
    } else if (typeof _orig === 'function') {
      _orig();
    }
  },
  
  'headspace': function () {
    // ✅ PREFER NEW RENDERER IF AVAILABLE
    if (typeof window.renderHeadspace === 'function' && typeof window.HS !== 'undefined') {
      console.log('🎯 Using new shelflife-style headspace renderer');
      window.renderHeadspace();
    } else {
      // Fallback legacy
      console.log('⚠️ Falling back to legacy headspace renderer');
      _renderHeadspace();
    }
  },
  
  'pharma-mvtr': function () {
    if (typeof renderPharmaMVTR === 'function') {
      renderPharmaMVTR();
    } else {
      _renderPharmaMVTR();
    }
  },
  
  'pharma-uptake': function () {
    if (typeof renderPharmaUptake === 'function') {
      renderPharmaUptake();
    } else {
      _renderPharmaUptake();
    }
  }
};

window.renderContent = function () {
  var tab = (typeof State !== 'undefined') ? State.tab : '';
  console.log('🔄 renderContent called for tab:', tab);
  
  if (ROUTES[tab]) {
    ROUTES[tab]();
  } else {
    console.warn('⚠️ No route found for tab:', tab);
    if (typeof _orig === 'function') _orig();
  }
};

})();
