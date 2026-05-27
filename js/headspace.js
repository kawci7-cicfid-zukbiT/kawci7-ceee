// ====================================================================
// headspace.js  —  Headspace O₂ Calculator
// Food Analysis → Headspace Calculator tab  (State.tab === 'headspace')
//
// Model: mass balance between O₂ ingress through film and O₂
//        consumption by the product (zero-order or first-order).
//
// dO2/dt = (OTR_eff × A) - k_resp × W        [zero-order]
// dO2/dt = (OTR_eff × A) - k_resp × W × O2   [first-order, fraction]
//
// OTR_eff = OTR_film × (pO2_ext - pO2_int) / pO2_ext   [driving force correction]
// ====================================================================

// ------------------------------------------------------------------
// Core calculation — Euler integration over time steps
// Input params object:
//   otr_film      OTR of laminate at test conditions  (cm³/m²/day/bar) — pulled from Engine if available
//   area_cm2      Package inner surface area in cm²
//   headspace_ml  Headspace volume in mL
//   o2_initial    Initial O₂ in headspace (%) — e.g. 21 for air, 2 for MAP
//   o2_limit      O₂ limit that defines end of shelf life (%)
//   k_resp        O₂ consumption rate of product (cm³ O₂/kg/day)
//   product_kg    Product mass in kg
//   resp_order    'zero' or 'first'
//   days          Simulation duration in days
// ------------------------------------------------------------------
function calcHeadspace(p) {
  var areaM2   = p.area_cm2 / 1e4;
  var vol_mL   = p.headspace_ml;
  var o2Frac   = p.o2_initial / 100;   // fraction 0–1
  var limitFrac= p.o2_limit   / 100;
  var dt       = 0.5;                  // day step
  var steps    = Math.ceil(p.days / dt);
  var pO2_ext  = 0.2095;              // O₂ fraction in external air

  var timeline = [];
  var shelfLifeDay = null;

  for (var i = 0; i <= steps; i++) {
    var t = i * dt;
    var pO2_int = o2Frac;              // current internal O₂ fraction

    // O₂ ingress (cm³/day) — driving-force corrected
    var otrEff = p.otr_film * areaM2 * Math.max(0, pO2_ext - pO2_int) / pO2_ext;

    // Product O₂ consumption (cm³/day)
    var resp = 0;
    if (p.resp_order === 'zero') {
      resp = p.k_resp * p.product_kg;
    } else {
      resp = p.k_resp * p.product_kg * pO2_int;
    }

    // Net change in O₂ volume (cm³)
    var dVol = (otrEff - resp) * dt;
    // Convert to fraction change: dO2 = dVol / vol_mL  (1 cm³ ≈ 1 mL at STP)
    var dFrac = dVol / vol_mL;
    o2Frac = Math.max(0, Math.min(1, o2Frac + dFrac));

    if (i % 2 === 0) {                 // record every full day
      timeline.push({ t: t, o2: o2Frac * 100 });
    }

    // First crossing of limit
    if (shelfLifeDay === null) {
      if (p.o2_initial <= p.o2_limit && o2Frac * 100 >= p.o2_limit) shelfLifeDay = t;
      if (p.o2_initial >  p.o2_limit && o2Frac * 100 <= p.o2_limit) shelfLifeDay = t;
    }
  }

  return {
    timeline:      timeline,
    shelfLifeDay:  shelfLifeDay,
    finalO2:       o2Frac * 100
  };
}

// ------------------------------------------------------------------
// Default parameters by product category
// ------------------------------------------------------------------
var HS_PRESETS = {
  'fresh-meat':  { o2_initial: 70, o2_limit:  5, k_resp: 10,  resp_order: 'zero',  label: 'Fresh meat (MAP 70% O₂)' },
  'chilled-meat':{ o2_initial:  2, o2_limit:  1, k_resp:  5,  resp_order: 'zero',  label: 'Chilled cooked meat' },
  'cheese':      { o2_initial:  0, o2_limit:  1, k_resp:  2,  resp_order: 'first', label: 'Cheese (vacuum)' },
  'coffee':      { o2_initial:  0, o2_limit:  1, k_resp:  0,  resp_order: 'zero',  label: 'Roasted coffee (flushed N₂)' },
  'berries':     { o2_initial: 21, o2_limit:  3, k_resp: 30,  resp_order: 'first', label: 'Fresh berries' },
  'salad':       { o2_initial: 21, o2_limit:  3, k_resp: 50,  resp_order: 'first', label: 'Fresh-cut salad' },
  'custom':      { o2_initial: 21, o2_limit:  1, k_resp:  5,  resp_order: 'zero',  label: 'Custom' }
};

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
function renderHeadspace() {
  var el = document.getElementById('content');
  if (!el) return;

  // Read saved state or defaults
  var hs = (typeof State !== 'undefined' && State.headspace) ? State.headspace : {
    preset:       'coffee',
    otr_film:     1.0,
    area_cm2:     600,
    headspace_ml: 200,
    o2_initial:   0,
    o2_limit:     1,
    k_resp:       0,
    resp_order:   'zero',
    product_kg:   0.25,
    days:         365
  };

  var html = '<div class="tab-content" id="hs-root">';
  html += '<h2 class="section-title">Headspace O₂ Calculator</h2>';
  html += '<p class="section-desc">Model O₂ evolution inside a sealed package: ingress through the film vs. product respiration.</p>';

  // Preset selector
  html += '<div class="hs-row"><label>Product preset</label><select id="hs-preset" onchange="onHsPreset()">';
  for (var k in HS_PRESETS) {
    html += '<option value="' + k + '"' + (hs.preset === k ? ' selected' : '') + '>' + HS_PRESETS[k].label + '</option>';
  }
  html += '</select></div>';

  // Inputs grid
  html += '<div class="hs-grid">';

  function field(id, label, val, unit, step, min) {
    return '<div class="hs-field"><label>' + label + '</label>' +
           '<div class="hs-input-row"><input type="number" id="' + id + '" value="' + val +
           '" step="' + (step||'any') + '" min="' + (min||0) + '"> <span class="hs-unit">' + unit + '</span></div></div>';
  }

  html += field('hs-otr',        'Film OTR',             hs.otr_film,     'cm³/m²/day',    0.01);
  html += field('hs-area',       'Package inner area',   hs.area_cm2,     'cm²',            1);
  html += field('hs-vol',        'Headspace volume',     hs.headspace_ml, 'mL',             1);
  html += field('hs-o2init',     'Initial O₂',           hs.o2_initial,   '%',              0.1);
  html += field('hs-o2limit',    'O₂ shelf-life limit',  hs.o2_limit,     '%',              0.1);
  html += field('hs-kresp',      'O₂ consumption rate',  hs.k_resp,       'cm³/kg·day',     0.1);
  html += field('hs-prodkg',     'Product mass',         hs.product_kg,   'kg',             0.01);
  html += field('hs-days',       'Simulation duration',  hs.days,         'days',            1);

  html += '<div class="hs-field"><label>Respiration order</label>' +
          '<select id="hs-order">' +
          '<option value="zero"'  + (hs.resp_order === 'zero'  ? ' selected' : '') + '>Zero-order (constant)</option>' +
          '<option value="first"' + (hs.resp_order === 'first' ? ' selected' : '') + '>First-order (∝ O₂)</option>' +
          '</select></div>';

  html += '</div>'; // hs-grid

  html += '<button class="btn-primary" onclick="onHsCalc()">Calculate</button>';

  // Results placeholder — filled by onHsCalc()
  html += '<div id="hs-results"></div>';

  html += '</div>'; // tab-content
  el.innerHTML = html;

  // Auto-calculate on load if OTR available
  onHsCalc();
}

function onHsPreset() {
  var k = document.getElementById('hs-preset').value;
  var p = HS_PRESETS[k];
  if (!p) return;
  var set = function(id, v) { var e = document.getElementById(id); if (e) e.value = v; };
  set('hs-o2init',  p.o2_initial);
  set('hs-o2limit', p.o2_limit);
  set('hs-kresp',   p.k_resp);
  document.getElementById('hs-order').value = p.resp_order;
}

function onHsCalc() {
  var get = function(id) { return parseFloat(document.getElementById(id).value) || 0; };

  var params = {
    preset:       document.getElementById('hs-preset').value,
    otr_film:     get('hs-otr'),
    area_cm2:     get('hs-area'),
    headspace_ml: get('hs-vol'),
    o2_initial:   get('hs-o2init'),
    o2_limit:     get('hs-o2limit'),
    k_resp:       get('hs-kresp'),
    product_kg:   get('hs-prodkg'),
    resp_order:   document.getElementById('hs-order').value,
    days:         get('hs-days')
  };

  if (typeof State !== 'undefined') State.headspace = params;

  var res = calcHeadspace(params);
  renderHeadspaceResults(res, params);
}

function renderHeadspaceResults(res, params) {
  var el = document.getElementById('hs-results');
  if (!el) return;

  var slText = res.shelfLifeDay !== null
    ? '<strong>' + res.shelfLifeDay.toFixed(0) + ' days</strong>'
    : '> ' + params.days + ' days (limit not reached)';

  var html = '<div class="hs-result-box">';
  html += '<div class="hs-kpi"><span class="hs-kpi-val">' + slText + '</span>' +
          '<span class="hs-kpi-lbl">Estimated shelf life</span></div>';
  html += '<div class="hs-kpi"><span class="hs-kpi-val">' + res.finalO2.toFixed(1) + '%</span>' +
          '<span class="hs-kpi-lbl">Final O₂ at day ' + params.days + '</span></div>';
  html += '</div>';

  // Simple ASCII-style SVG chart
  html += renderHsChart(res.timeline, params.o2_limit, params.o2_initial);

  el.innerHTML = html;
}

function renderHsChart(timeline, limit, o2init) {
  if (!timeline || timeline.length < 2) return '';

  var W = 560, H = 200, PAD = 40;
  var maxT = timeline[timeline.length - 1].t;
  var allO2 = timeline.map(function(p){ return p.o2; });
  var maxO2 = Math.max(o2init, Math.max.apply(null, allO2), limit * 1.2);
  var minO2 = 0;

  function xp(t)  { return PAD + (t / maxT) * (W - PAD * 2); }
  function yp(o2) { return PAD + (1 - (o2 - minO2) / (maxO2 - minO2)) * (H - PAD * 2); }

  var path = '';
  for (var i = 0; i < timeline.length; i++) {
    path += (i === 0 ? 'M' : 'L') + xp(timeline[i].t).toFixed(1) + ',' + yp(timeline[i].o2).toFixed(1) + ' ';
  }

  var limitY = yp(limit);

  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:' + W + 'px;margin-top:1rem">';
  // axes
  svg += '<line x1="' + PAD + '" y1="' + (H-PAD) + '" x2="' + (W-PAD) + '" y2="' + (H-PAD) + '" stroke="#cbd5e1" stroke-width="1"/>';
  svg += '<line x1="' + PAD + '" y1="' + PAD + '" x2="' + PAD + '" y2="' + (H-PAD) + '" stroke="#cbd5e1" stroke-width="1"/>';
  // limit line
  svg += '<line x1="' + PAD + '" y1="' + limitY + '" x2="' + (W-PAD) + '" y2="' + limitY +
         '" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>';
  svg += '<text x="' + (W-PAD+4) + '" y="' + (limitY+4) + '" fill="#ef4444" font-size="10">limit</text>';
  // O₂ curve
  svg += '<path d="' + path + '" fill="none" stroke="#2563eb" stroke-width="2"/>';
  // axis labels
  svg += '<text x="' + (W/2) + '" y="' + (H-4) + '" text-anchor="middle" fill="#64748b" font-size="11">Days</text>';
  svg += '<text x="10" y="' + (H/2) + '" text-anchor="middle" fill="#64748b" font-size="11" transform="rotate(-90,10,' + H/2 + ')">O₂ (%)</text>';
  // y tick max
  svg += '<text x="' + (PAD-4) + '" y="' + (PAD+4) + '" text-anchor="end" fill="#94a3b8" font-size="10">' + maxO2.toFixed(0) + '</text>';
  svg += '</svg>';
  return svg;
}
