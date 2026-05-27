// ====================================================================
// carbonfp.js  v3  —  Carbon Footprint Estimator (complete rewrite)
// Food Analysis → Carbon Footprint tab  (State.tab === 'carbonfp')
//
// Formula (cradle-to-gate, per layer):
//   mass   (kg/m²) = density (kg/m³) × thickness (µm) × 1e-6
//   CO₂    (kg/m²) = mass × GWP (kg CO₂eq/kg)
//   Total           = Σ CO₂_layer
//   Per unit        = Total × package_area_m²
//
// New in v3:
//   • Renders into #app-content (the real app container)
//   • Density & GWP cells are editable inputs — charts update live
//   • Donut chart: CO₂ contribution by material layer
//   • Area sensitivity chart: CO₂/unit vs package area (50–2000 cm²)
//   • "Save to DB" button per row persists values into DB.materials
// ====================================================================

// ------------------------------------------------------------------
// Default GWP & density lookup (PlasticsEurope / Ecoinvent 3.x)
// ------------------------------------------------------------------
var CFP_DEFAULTS = [
  { key: 'PET',        density: 1380, gwp: 2.15 },
  { key: 'BOPP',       density:  910, gwp: 1.85 },
  { key: 'OPP',        density:  910, gwp: 1.85 },
  { key: 'PP',         density:  910, gwp: 1.85 },
  { key: 'LDPE',       density:  950, gwp: 1.90 },
  { key: 'LLDPE',      density:  925, gwp: 1.90 },
  { key: 'PE',         density:  950, gwp: 1.90 },
  { key: 'HDPE',       density:  960, gwp: 1.80 },
  { key: 'PA',         density: 1130, gwp: 6.80 },
  { key: 'NYLON',      density: 1130, gwp: 6.80 },
  { key: 'EVOH',       density: 1190, gwp: 3.20 },
  { key: 'PVC',        density: 1380, gwp: 2.80 },
  { key: 'PVDC',       density: 1700, gwp: 4.50 },
  { key: 'ALU',        density: 2700, gwp: 8.10 },
  { key: 'ALUMINUM',   density: 2700, gwp: 8.10 },
  { key: 'FOIL',       density: 2700, gwp: 8.10 },
  { key: 'MET',        density: 1380, gwp: 2.40 },
  { key: 'PAPER',      density:  700, gwp: 0.90 },
  { key: 'KRAFT',      density:  700, gwp: 0.90 },
  { key: 'PLA',        density: 1240, gwp: 0.50 },
  { key: 'CELLOPHANE', density: 1420, gwp: 2.80 }
];

var CFP_PALETTE = [
  '#3b82f6','#ef4444','#22c55e','#f59e0b',
  '#8b5cf6','#06b6d4','#f97316','#ec4899',
  '#14b8a6','#a855f7'
];

// ------------------------------------------------------------------
// Resolve density/GWP — stored values take priority over defaults
// ------------------------------------------------------------------
function cfpDefaults(mat) {
  if (mat && mat.density && mat.gwp)
    return { density: mat.density, gwp: mat.gwp, isDefault: false };
  var name = ((mat ? mat.name : '') + ' ' + (mat ? mat.family || '' : '')).toUpperCase();
  for (var i = 0; i < CFP_DEFAULTS.length; i++) {
    if (name.indexOf(CFP_DEFAULTS[i].key) !== -1)
      return { density: CFP_DEFAULTS[i].density, gwp: CFP_DEFAULTS[i].gwp, isDefault: true };
  }
  return { density: 1000, gwp: 2.0, isDefault: true };
}

// ------------------------------------------------------------------
// Core calculation (kept for external callers / shelflife.js etc.)
// ------------------------------------------------------------------
function calcCarbonFootprint(layers, mats, areaM2) {
  areaM2 = areaM2 || 1;
  var result = { layers: [], totalPerM2: 0, totalPerUnit: 0, areaM2: areaM2 };
  for (var i = 0; i < layers.length; i++) {
    var l   = layers[i];
    var mat = mats[l.matId];
    if (!mat || !l.thickness) continue;
    var d      = cfpDefaults(mat);
    var thickM = l.thickness * 1e-6;
    var mass   = d.density * thickM;
    var co2    = mass * d.gwp;
    result.layers.push({
      name: mat.name, thickness: l.thickness,
      density: d.density, gwp: d.gwp,
      massPerM2: mass, co2PerM2: co2,
      isDefault: d.isDefault
    });
    result.totalPerM2 += co2;
  }
  result.totalPerUnit = result.totalPerM2 * areaM2;
  return result;
}

// ------------------------------------------------------------------
// Internal: build row objects from State, applying live edit overrides
// ------------------------------------------------------------------
function _cfpBuildRows() {
  var layers  = (typeof State !== 'undefined' && State.layers) ? State.layers : [];
  var allMats = (typeof DB !== 'undefined') ? DB.materials : [];
  var mats = {};
  for (var i = 0; i < allMats.length; i++) mats[allMats[i].id] = allMats[i];
  var rows = [];
  for (var i = 0; i < layers.length; i++) {
    var l   = layers[i];
    var mat = mats[l.mid] || null;
    if (!mat || !l.thick) continue;
    var d = cfpDefaults(mat);
    // live edit overrides
    var ov = (window._cfpEdit || {})[i];
    if (ov) {
      if (ov.density > 0) { d.density   = ov.density;   d.isDefault = false; }
      if (ov.gwp     > 0) { d.gwp       = ov.gwp;       d.isDefault = false; }
    }
    var mass = d.density * l.thick * 1e-6;
    rows.push({
      idx: i, matId: l.mid, name: mat.name,
      thickness: l.thick,
      density: d.density, gwp: d.gwp, isDefault: d.isDefault,
      massPerM2: mass, co2PerM2: mass * d.gwp
    });
  }
  return rows;
}

function _cfpTotals(rows, areaCm2) {
  var areaM2 = (areaCm2 || 400) / 1e4;
  var totalPerM2 = 0;
  for (var i = 0; i < rows.length; i++) totalPerM2 += rows[i].co2PerM2;
  return { totalPerM2: totalPerM2, totalPerUnit: totalPerM2 * areaM2 };
}

// ------------------------------------------------------------------
// Live update — called on every cell input or slider move
// ------------------------------------------------------------------
function _cfpUpdateAll() {
  var rows    = _cfpBuildRows();
  var areaCm2 = window._cfpArea || 400;
  var tots    = _cfpTotals(rows, areaCm2);

  // derived cells
  for (var i = 0; i < rows.length; i++) {
    var r    = rows[i];
    var mEl  = document.getElementById('cfp-mass-' + i);
    var cEl  = document.getElementById('cfp-co2-'  + i);
    var pEl  = document.getElementById('cfp-pct-'  + i);
    if (mEl) mEl.textContent = (r.massPerM2 * 1000).toFixed(2);
    if (cEl) cEl.textContent = (r.co2PerM2  * 1000).toFixed(3);
    if (pEl) pEl.textContent = tots.totalPerM2 > 0
      ? ((r.co2PerM2 / tots.totalPerM2) * 100).toFixed(1) + '%' : '—';
  }

  // KPI cards
  var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
  set('cfp-kpi-m2',    (tots.totalPerM2   * 1000).toFixed(1));
  set('cfp-kpi-unit',  (tots.totalPerUnit * 1000).toFixed(2));
  set('cfp-eq-car',    (tots.totalPerUnit * 1000 / 170).toFixed(3) + ' km');
  set('cfp-eq-phone',  (tots.totalPerUnit * 1000 / 21 ).toFixed(2) + ' charges');
  set('cfp-eq-led',    (tots.totalPerUnit * 1000 / 0.006).toFixed(0) + ' h');
  set('cfp-eq-tree',   (tots.totalPerUnit * 1000 / 0.0015).toFixed(0) + ' min');
  set('cfp-kpi-area',  areaCm2 + ' cm²');
  set('cfp-total-row', (tots.totalPerM2 * 1000).toFixed(3));

  _cfpDrawDonut(rows, tots);
  _cfpDrawSensitivity(rows);
}

// ------------------------------------------------------------------
// Donut chart — CO₂ contribution by layer
// ------------------------------------------------------------------
function _cfpDrawDonut(rows, tots) {
  var canvas = document.getElementById('cfp-donut');
  if (!canvas || typeof Chart === 'undefined') return;
  if (window._cfpDonutChart) { window._cfpDonutChart.destroy(); window._cfpDonutChart = null; }
  if (!rows.length || tots.totalPerM2 <= 0) return;

  window._cfpDonutChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: rows.map(function(r) { return r.name + ' (' + r.thickness + 'µm)'; }),
      datasets: [{
        data: rows.map(function(r) { return +(r.co2PerM2 * 1000).toFixed(4); }),
        backgroundColor: CFP_PALETTE.slice(0, rows.length),
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10, padding: 10,
            font: { size: 10, weight: '600' },
            generateLabels: function(chart) {
              var ds    = chart.data.datasets[0];
              var total = ds.data.reduce(function(a, b) { return a + b; }, 0);
              return chart.data.labels.map(function(lbl, i) {
                var pct = total > 0 ? ((ds.data[i] / total) * 100).toFixed(1) : '0';
                return {
                  text: lbl + '  ' + pct + '%',
                  fillStyle: ds.backgroundColor[i],
                  strokeStyle: ds.backgroundColor[i],
                  lineWidth: 0, index: i
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var v   = ctx.parsed;
              var tot = ctx.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              var pct = tot > 0 ? ((v / tot) * 100).toFixed(1) : '0';
              return ctx.label + ': ' + v.toFixed(3) + ' g CO₂eq/m²  (' + pct + '%)';
            }
          }
        }
      }
    }
  });

  // centre label
  var centreEl = document.getElementById('cfp-donut-centre');
  if (centreEl) {
    centreEl.innerHTML =
      '<div style="font-size:1.4rem;font-weight:800;color:#0f172a;line-height:1.1">' +
        (tots.totalPerM2 * 1000).toFixed(1) +
      '</div>' +
      '<div style="font-size:0.6rem;color:#64748b;font-weight:600;margin-top:2px">g CO₂eq/m²</div>';
  }
}

// ------------------------------------------------------------------
// Sensitivity chart — CO₂/unit vs area (50 – 2000 cm²)
// ------------------------------------------------------------------
function _cfpDrawSensitivity(rows) {
  var canvas = document.getElementById('cfp-sens-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (window._cfpSensChart) { window._cfpSensChart.destroy(); window._cfpSensChart = null; }
  if (!rows.length) return;

  var totalPerM2 = 0;
  for (var i = 0; i < rows.length; i++) totalPerM2 += rows[i].co2PerM2;

  var areas = [], vals = [];
  for (var a = 50; a <= 2000; a += (a < 200 ? 10 : a < 500 ? 20 : 50)) {
    areas.push(a);
    vals.push(+(totalPerM2 * a / 1e4 * 1000).toFixed(4));
  }

  var curArea = window._cfpArea || 400;
  var curVal  = +(totalPerM2 * curArea / 1e4 * 1000).toFixed(4);

  window._cfpSensChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: areas,
      datasets: [
        {
          label: 'CO₂eq / unit (g)',
          data: vals,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.07)',
          fill: true, tension: 0.35,
          pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5
        },
        {
          label: 'Current area (' + curArea + ' cm²)',
          data: [{ x: curArea, y: curVal }],
          type: 'scatter',
          pointRadius: 8, pointHoverRadius: 10,
          backgroundColor: '#ef4444',
          borderColor: '#fff', borderWidth: 2,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } },
        tooltip: {
          callbacks: {
            title: function(items) { return items[0].label + ' cm²'; },
            label: function(ctx) {
              return ctx.dataset.label + ': ' + (+ctx.parsed.y).toFixed(3) + ' g CO₂eq';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Package area (cm²)', font: { size: 10, weight: '600' } },
          ticks: { font: { size: 9 } },
          grid:  { color: 'rgba(0,0,0,0.04)' }
        },
        y: {
          title: { display: true, text: 'g CO₂eq / unit', font: { size: 10, weight: '600' } },
          beginAtZero: true,
          ticks: { font: { size: 9 }, callback: function(v) { return v.toFixed(2); } },
          grid:  { color: 'rgba(0,0,0,0.04)' }
        }
      }
    }
  });
}

// ------------------------------------------------------------------
// Event handlers (called from inline HTML)
// ------------------------------------------------------------------
function cfpCellChange(rowIdx) {
  if (!window._cfpEdit) window._cfpEdit = {};
  var d = parseFloat(document.getElementById('cfp-d-' + rowIdx) ?
          document.getElementById('cfp-d-' + rowIdx).value : 0);
  var g = parseFloat(document.getElementById('cfp-g-' + rowIdx) ?
          document.getElementById('cfp-g-' + rowIdx).value : 0);
  window._cfpEdit[rowIdx] = { density: isNaN(d) ? 0 : d, gwp: isNaN(g) ? 0 : g };
  _cfpUpdateAll();
}

function cfpAreaSlider(v) {
  window._cfpArea = parseFloat(v) || 400;
  var inp = document.getElementById('cfp-area-num');
  if (inp) inp.value = window._cfpArea;
  _cfpUpdateAll();
}

function cfpAreaInput(v) {
  var val = Math.max(10, Math.min(5000, parseFloat(v) || 400));
  window._cfpArea = val;
  var sld = document.getElementById('cfp-area-slider');
  if (sld) sld.value = val;
  _cfpUpdateAll();
}

function cfpSave(rowIdx) {
  var dEl = document.getElementById('cfp-d-' + rowIdx);
  var gEl = document.getElementById('cfp-g-' + rowIdx);
  if (!dEl || !gEl) return;
  var density = parseFloat(dEl.value);
  var gwp     = parseFloat(gEl.value);
  if (!(density > 0)) { alert('Enter a valid density (kg/m³)'); return; }
  if (!(gwp     > 0)) { alert('Enter a valid GWP (kg CO₂eq/kg)'); return; }

  var layers  = (typeof State !== 'undefined' && State.layers) ? State.layers : [];
  var allMats = (typeof DB !== 'undefined') ? DB.materials : [];
  var l = layers[rowIdx];
  if (!l) return;
  for (var i = 0; i < allMats.length; i++) {
    if (String(allMats[i].id) === String(l.mid)) {
      allMats[i].density = density;
      allMats[i].gwp     = gwp;
      break;
    }
  }
  if (typeof DB !== 'undefined' && typeof DB.save === 'function') DB.save();
  if (window._cfpEdit) delete window._cfpEdit[rowIdx];

  // visual feedback
  var dInput = document.getElementById('cfp-d-' + rowIdx);
  var gInput = document.getElementById('cfp-g-' + rowIdx);
  if (dInput) dInput.style.borderColor = '#86efac';
  if (gInput) gInput.style.borderColor = '#86efac';
  var badge = document.getElementById('cfp-est-' + rowIdx);
  if (badge) badge.style.display = 'none';
  var btn = document.getElementById('cfp-savebtn-' + rowIdx);
  if (btn) { btn.textContent = '✓ Saved'; btn.disabled = true;
             btn.style.cssText += ';background:#22c55e !important;opacity:1'; }
  _cfpUpdateAll();
}

// ------------------------------------------------------------------
// Main render — writes into #app-content
// ------------------------------------------------------------------
function renderCarbonFootprint() {
  var c = document.getElementById('app-content');
  if (!c) return;

  // reset edit state each full render
  window._cfpEdit = {};
  if (typeof State !== 'undefined' && State.cfpArea)
    window._cfpArea = State.cfpArea * 1e4;   // m² → cm²
  var area = window._cfpArea || 400;

  var rows  = _cfpBuildRows();
  var tots  = _cfpTotals(rows, area);
  var hasRows = rows.length > 0;

  // ── PAGE ──────────────────────────────────────────────────────────
  var html = '<div style="max-width:1100px;margin:0 auto;padding-bottom:2rem">';

  // ── Header strip ────────────────────────────────────────────────
  html += '<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f4c75 100%);border-radius:16px;padding:1.5rem 1.75rem;margin-bottom:1.25rem;position:relative;overflow:hidden">';
  html += '<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(59,130,246,0.12);pointer-events:none"></div>';
  html += '<div style="position:absolute;bottom:-30px;left:30%;width:120px;height:120px;border-radius:50%;background:rgba(34,197,94,0.08);pointer-events:none"></div>';
  html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem;position:relative">';
  html += '<div>';
  html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(148,163,184,0.8);margin-bottom:0.4rem">Food Analysis · Carbon</div>';
  html += '<h1 style="font-size:1.5rem;font-weight:800;color:#fff;margin:0 0 0.3rem;letter-spacing:-0.02em">Carbon Footprint Estimator</h1>';
  html += '<p style="font-size:0.8rem;color:rgba(148,163,184,0.85);margin:0;max-width:480px;line-height:1.5">Cradle-to-gate CO₂eq. Edit density &amp; GWP values directly — charts update instantly. Drag the slider to explore different package sizes.</p>';
  html += '</div>';
  html += '<div style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:0.45rem 0.75rem;display:flex;align-items:center;gap:0.4rem;flex-shrink:0">';
  html += '<span style="font-size:0.9rem">⚠️</span>';
  html += '<span style="font-size:0.68rem;font-weight:600;color:#fbbf24;line-height:1.3">Not suitable for<br>official LCA declarations</span>';
  html += '</div>';
  html += '</div></div>';

  if (!hasRows) {
    html += '<div class="card"><div class="alert alert-info" style="margin:0">No laminate defined yet. Build a structure in the <strong>Calculator</strong> tab, then return here.</div></div>';
    html += '</div>';
    c.innerHTML = html;
    return;
  }

  // ── KPI row ─────────────────────────────────────────────────────
  function kpiCard(id, icon, label, val, unit, color) {
    return '<div style="background:#fff;border-radius:14px;padding:1rem 1.1rem;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.04)">' +
      '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.5rem">' +
        '<span style="font-size:1rem">' + icon + '</span>' +
        '<span style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">' + label + '</span>' +
      '</div>' +
      '<div style="font-size:1.6rem;font-weight:800;color:' + color + ';line-height:1" id="' + id + '">' + val + '</div>' +
      '<div style="font-size:0.65rem;color:#94a3b8;margin-top:0.2rem">' + unit + '</div>' +
    '</div>';
  }

  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.85rem;margin-bottom:1.1rem">';
  html += kpiCard('cfp-kpi-m2',   '', 'per m²',    (tots.totalPerM2   * 1000).toFixed(1),  'g CO₂eq / m²',   '#2563eb');
  html += kpiCard('cfp-kpi-unit', '', 'per unit',  (tots.totalPerUnit * 1000).toFixed(2), 'g CO₂eq / unit', '#7c3aed');
  html += kpiCard('cfp-eq-car',   '', 'car equiv.',(tots.totalPerUnit * 1000 / 170).toFixed(3) + ' km', 'km driven', '#16a34a');
  html += kpiCard('cfp-eq-phone', '', 'phone equiv.',(tots.totalPerUnit * 1000 / 21).toFixed(2) + ' charges', 'smartphone charges', '#d97706');
  html += '</div>';

  // ── Area slider bar ─────────────────────────────────────────────
  html += '<div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:1rem 1.25rem;margin-bottom:1.1rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap">';
  html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0">';
  html += '<span style="font-size:1rem"></span>';
  html += '<span style="font-size:0.78rem;font-weight:700;color:#0f172a">Package surface area</span>';
  html += '</div>';
  html += '<input id="cfp-area-slider" type="range" min="50" max="2000" step="10" value="' + area + '" oninput="cfpAreaSlider(this.value)" style="flex:1;min-width:120px;accent-color:#2563eb;cursor:pointer">';
  html += '<div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0">';
  html += '<input id="cfp-area-num" type="number" min="10" max="5000" step="10" value="' + area + '" oninput="cfpAreaInput(this.value)" style="width:80px;padding:0.35rem 0.5rem;border:1.5px solid #e2e8f0;border-radius:7px;font-size:0.82rem;font-weight:600;text-align:right;outline:none" onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'#e2e8f0\'">';
  html += '<span style="font-size:0.78rem;color:#64748b;font-weight:500">cm²</span>';
  html += '</div>';
  html += '<div style="font-size:0.72rem;color:#64748b;flex-shrink:0">Current: <strong id="cfp-kpi-area" style="color:#2563eb">' + area + ' cm²</strong></div>';
  html += '</div>';

  // ── Two-column: table | charts ──────────────────────────────────
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">';

  // LEFT — editable table
  html += '<div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden">';
  html += '<div style="padding:0.85rem 1.1rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">';
  html += '<div><div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Layer breakdown</div>';
  html += '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Material CO₂ Data</div></div>';
  html += '<div style="display:flex;align-items:center;gap:0.75rem;font-size:0.68rem;color:#64748b">';
  html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#fef3c7;border:1px solid #fcd34d;margin-right:3px"></span>estimated</span>';
  html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f0fdf4;border:1px solid #bbf7d0;margin-right:3px"></span>verified</span>';
  html += '</div></div>';

  html += '<div style="overflow-x:auto">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:0.75rem">';
  html += '<thead><tr style="background:#f8fafc">';
  var ths = ['Layer','µm','Density ✏','GWP ✏','g/m²','CO₂','%',''];
  var thColors = ['#475569','#475569','#2563eb','#2563eb','#475569','#7c3aed','#475569',''];
  for (var ti = 0; ti < ths.length; ti++) {
    var align = ti >= 4 ? 'right' : (ti >= 2 ? 'center' : 'left');
    if (ti === 7) align = 'center';
    html += '<th style="padding:0.5rem ' + (ti === 0 ? '0.7rem' : '0.45rem') + ';text-align:' + align + ';font-weight:700;color:' + (thColors[ti] || '#475569') + ';border-bottom:1.5px solid #e2e8f0;white-space:nowrap">' + ths[ti] + '</th>';
  }
  html += '</tr></thead><tbody>';

  for (var ri = 0; ri < rows.length; ri++) {
    var r       = rows[ri];
    var color   = CFP_PALETTE[ri % CFP_PALETTE.length];
    var pct     = tots.totalPerM2 > 0 ? ((r.co2PerM2 / tots.totalPerM2) * 100).toFixed(1) : '0';
    var iBg     = r.isDefault ? '#fffbeb' : '#f0fdf4';
    var iBorder = r.isDefault ? '#fcd34d' : '#86efac';

    html += '<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">';

    // name + colour dot
    html += '<td style="padding:0.5rem 0.7rem;vertical-align:middle">';
    html += '<div style="display:flex;align-items:center;gap:0.4rem">';
    html += '<span style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0;display:inline-block"></span>';
    html += '<span style="font-weight:600;color:#0f172a;white-space:nowrap">' + r.name + '</span>';
    html += ' <span id="cfp-est-' + ri + '" style="display:' + (r.isDefault ? 'inline' : 'none') + ';background:#fef3c7;color:#d97706;padding:1px 4px;border-radius:3px;font-size:0.6rem;font-weight:700">est</span>';
    html += '</div></td>';

    // thickness
    html += '<td style="padding:0.5rem 0.45rem;text-align:right;color:#64748b;vertical-align:middle">' + r.thickness + '</td>';

    // density input
    html += '<td style="padding:0.3rem 0.4rem;text-align:center;vertical-align:middle">';
    html += '<input type="number" id="cfp-d-' + ri + '" value="' + r.density + '" min="1" step="1"';
    html += ' oninput="cfpCellChange(' + ri + ')"';
    html += ' style="width:72px;padding:0.3rem 0.4rem;border-radius:6px;font-size:0.75rem;text-align:right;border:1.5px solid ' + iBorder + ';background:' + iBg + ';outline:none;transition:border-color 0.15s"';
    html += ' onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'' + iBorder + '\'">';
    html += '</td>';

    // GWP input
    html += '<td style="padding:0.3rem 0.4rem;text-align:center;vertical-align:middle">';
    html += '<input type="number" id="cfp-g-' + ri + '" value="' + r.gwp.toFixed(2) + '" min="0" step="0.01"';
    html += ' oninput="cfpCellChange(' + ri + ')"';
    html += ' style="width:72px;padding:0.3rem 0.4rem;border-radius:6px;font-size:0.75rem;text-align:right;border:1.5px solid ' + iBorder + ';background:' + iBg + ';outline:none;transition:border-color 0.15s"';
    html += ' onfocus="this.style.borderColor=\'#3b82f6\'" onblur="this.style.borderColor=\'' + iBorder + '\'">';
    html += '</td>';

    // mass (live)
    html += '<td style="padding:0.5rem 0.45rem;text-align:right;color:#475569;vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-mass-' + ri + '">' + (r.massPerM2 * 1000).toFixed(2) + '</span></td>';

    // CO2 (live)
    html += '<td style="padding:0.5rem 0.45rem;text-align:right;font-weight:700;color:' + color + ';vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-co2-' + ri + '">' + (r.co2PerM2 * 1000).toFixed(3) + '</span></td>';

    // %
    html += '<td style="padding:0.5rem 0.45rem;text-align:right;color:#64748b;vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-pct-' + ri + '">' + pct + '%</span></td>';

    // save btn
    var saved = !r.isDefault;
    html += '<td style="padding:0.3rem 0.4rem;text-align:center;vertical-align:middle">';
    if (saved) {
      html += '<button id="cfp-savebtn-' + ri + '" disabled style="background:#22c55e;color:#fff;border:none;border-radius:5px;padding:0.25rem 0.5rem;font-size:0.65rem;font-weight:700;opacity:0.7;cursor:not-allowed">✓ DB</button>';
    } else {
      html += '<button id="cfp-savebtn-' + ri + '" onclick="cfpSave(' + ri + ')" style="background:#2563eb;color:#fff;border:none;border-radius:5px;padding:0.25rem 0.5rem;font-size:0.65rem;font-weight:700;cursor:pointer;transition:opacity 0.15s" onmouseover="this.style.opacity=\'0.85\'" onmouseout="this.style.opacity=\'1\'">💾 Save</button>';
    }
    html += '</td>';
    html += '</tr>';
  }

  // footer total
  html += '<tr style="background:linear-gradient(90deg,#1e40af,#2563eb)">';
  html += '<td colspan="5" style="padding:0.5rem 0.7rem;text-align:right;color:#bfdbfe;font-weight:600;font-size:0.72rem">TOTAL</td>';
  html += '<td style="padding:0.5rem 0.45rem;text-align:right;color:#fff;font-weight:800;font-size:0.88rem;font-variant-numeric:tabular-nums"><span id="cfp-total-row">' + (tots.totalPerM2 * 1000).toFixed(3) + '</span></td>';
  html += '<td colspan="2" style="padding:0.5rem 0.4rem;text-align:right;color:#93c5fd;font-size:0.7rem">g CO₂eq/m²</td>';
  html += '</tr>';

  html += '</tbody></table></div></div>'; // end left card

  // RIGHT — charts
  html += '<div style="display:flex;flex-direction:column;gap:1rem">';

  // Donut
  html += '<div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:1rem;flex:1">';
  html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.2rem">CO₂ Contribution</div>';
  html += '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:0.6rem">By Material Layer</div>';
  html += '<div style="position:relative;height:220px">';
  html += '<canvas id="cfp-donut"></canvas>';
  html += '<div id="cfp-donut-centre" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-65%);text-align:center;pointer-events:none">';
  html += '<div style="font-size:1.4rem;font-weight:800;color:#0f172a;line-height:1.1">' + (tots.totalPerM2 * 1000).toFixed(1) + '</div>';
  html += '<div style="font-size:0.6rem;color:#64748b;font-weight:600;margin-top:2px">g CO₂eq/m²</div>';
  html += '</div></div></div>';

  // Sensitivity
  html += '<div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:1rem;flex:1">';
  html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.2rem">Area Sensitivity</div>';
  html += '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-bottom:0.25rem">CO₂/unit vs Package Size</div>';
  html += '<div style="font-size:0.7rem;color:#64748b;margin-bottom:0.6rem">Drag the slider to move the red dot ↑</div>';
  html += '<div style="height:200px"><canvas id="cfp-sens-chart"></canvas></div>';
  html += '</div>';

  html += '</div>'; // right column
  html += '</div>'; // two-col grid

  // ── Equivalences strip ──────────────────────────────────────────
  var gUnit = tots.totalPerUnit * 1000;
  html += '<div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:14px;padding:1rem 1.25rem;margin-bottom:1rem">';
  html += '<div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0369a1;margin-bottom:0.75rem">Environmental equivalences — per unit at current area</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:0.75rem">';

  function eqCard(icon, label, id, val, suffix) {
    return '<div style="background:#fff;border-radius:10px;padding:0.75rem;border:1px solid #bae6fd">' +
      '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.3rem">' +
        '<span>' + icon + '</span>' +
        '<span style="font-size:0.65rem;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.05em">' + label + '</span>' +
      '</div>' +
      '<div style="font-size:1.15rem;font-weight:800;color:#0f172a" id="' + id + '">' + val + '</div>' +
      '<div style="font-size:0.64rem;color:#64748b">' + suffix + '</div>' +
    '</div>';
  }

  html += eqCard('🚗','Car distance',   'cfp-eq-car',   (gUnit/170).toFixed(3)+' km',   'km driven (EU avg 170 g CO₂/km)');
  html += eqCard('📱','Phone charges',  'cfp-eq-phone', (gUnit/21).toFixed(2)+' charges','smartphone charges (50 Wh, avg grid)');
  html += eqCard('💡','LED bulb',       'cfp-eq-led',   (gUnit/0.006).toFixed(0)+' h',   'hours of 10 W LED bulb');
  html += eqCard('🌳','Tree absorption','cfp-eq-tree',  (gUnit/0.0015).toFixed(0)+' min','minutes of CO₂ absorption by one tree');
  html += '</div></div>';

  // ── Methodology ─────────────────────────────────────────────────
  html += _cfpMethodologyHTML();
  html += '</div>'; // max-width
  c.innerHTML = html;

  // Draw charts after DOM
  setTimeout(function() {
    var r2 = _cfpBuildRows();
    var t2 = _cfpTotals(r2, window._cfpArea || 400);
    _cfpDrawDonut(r2, t2);
    _cfpDrawSensitivity(r2);
  }, 80);
}

// ------------------------------------------------------------------
// Methodology text
// ------------------------------------------------------------------
function _cfpMethodologyHTML() {
  return '<div class="card methodology-card" style="margin-top:1rem;border-left:4px solid #2563eb;background:#fff">' +
    '<div style="padding:1.1rem 1.4rem">' +
    '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.1rem;color:#0f172a;border-bottom:1px solid #e2e8f0;padding-bottom:0.45rem;margin-bottom:0.85rem">' +
      'Understanding Carbon Footprint Estimation' +
    '</h2>' +
    '<div style="font-size:0.88rem;line-height:1.7;color:#334155;font-family:Georgia,\'Times New Roman\',serif">' +
    '<p>Every gram of polymer film or aluminium foil carries an embedded carbon cost — the cumulative greenhouse gas emissions generated from raw material extraction through polymerisation, extrusion, and conversion. This tool estimates that <em>cradle-to-gate</em> footprint using a mass-balance model.</p>' +
    '<div style="background:#f8fafc;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.83rem;text-align:center;border:1px dashed #e2e8f0;margin:0.75rem 0;color:#0f172a">' +
      'Mass (kg/m²) = density (kg/m³) × thickness (µm) × 10⁻⁶<br><br>' +
      'CO₂eq (kg/m²) = mass × GWP (kg CO₂eq / kg polymer)<br><br>' +
      'Total = Σ CO₂eq_layer &nbsp;|&nbsp; Per unit = Total × package area (m²)' +
    '</div>' +
    '<p><strong>Editable cells:</strong> Amber-highlighted rows use EPD defaults from PlasticsEurope/Ecoinvent 3.x. Click into the Density or GWP cell, type your supplier\'s value — the CO₂ column, donut chart, and sensitivity curve all update live. Click <em>💾 Save</em> to store the values in the material record permanently so all future calculations use the precise data.</p>' +
    '<p><strong>Donut chart:</strong> Shows the relative CO₂ contribution of each layer. Layers with a large share are the highest-impact candidates for material substitution or thickness reduction.</p>' +
    '<p><strong>Sensitivity chart:</strong> The line shows how CO₂ per unit scales linearly with package surface area (50 – 2000 cm²). The red dot marks the current area; dragging the slider moves it so you can instantly compare a small sachet against a large stand-up pouch.</p>' +
    '<div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:0.65rem 0.85rem;margin:0.75rem 0;font-family:sans-serif;font-size:0.82rem;color:#92400e">' +
      '<strong>Scope:</strong> Cradle-to-gate only — excludes conversion (printing, lamination, form-fill-seal), distribution, use phase, and end-of-life treatment. For official EPDs or carbon-labelling claims, use ISO 14040/14044-compliant LCA software with certified background datasets.' +
    '</div>' +
    '</div></div></div>';
}

// Called when user changes area from old-style button (kept for compatibility)
function onCfpAreaChange() {
  var v = parseFloat(document.getElementById('cfp-area-input') ?
          document.getElementById('cfp-area-input').value : 0);
  if (isNaN(v) || v <= 0) return;
  if (typeof State !== 'undefined') State.cfpArea = v / 1e4;
  window._cfpArea = v;
  renderCarbonFootprint();
}
