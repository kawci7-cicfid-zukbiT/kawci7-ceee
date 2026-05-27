// ====================================================================
// carbonfp.js  —  Carbon Footprint Estimator
// Food Analysis → Carbon Footprint tab  (State.tab === 'carbonfp')
//
// Formula (cradle-to-gate, per layer):
//   mass   (kg/m²) = density (kg/m³) × thickness (µm) × 1e-6
//   CO₂    (kg/m²) = mass × GWP (kg CO₂eq/kg)
//   Total           = Σ CO₂_layer
//   Per unit        = Total × package_area_m²
// ====================================================================
// ------------------------------------------------------------------
// Default GWP & density lookup table by material family keyword
// Values from public EPD databases (Ecoinvent 3.x, PlasticsEurope)
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
  { key: 'MET',        density: 1380, gwp: 2.40 },  // metallised films
  { key: 'PAPER',      density:  700, gwp: 0.90 },
  { key: 'KRAFT',      density:  700, gwp: 0.90 },
  { key: 'PLA',        density: 1240, gwp: 0.50 },
  { key: 'CELLOPHANE', density: 1420, gwp: 2.80 }
];

// Resolve density/GWP for a material: use stored values if present,
// otherwise fall back to keyword match on material name/family.
function cfpDefaults(mat) {
  if (mat.density && mat.gwp) return { density: mat.density, gwp: mat.gwp };
  var name = ((mat.name || '') + ' ' + (mat.family || '')).toUpperCase();
  for (var i = 0; i < CFP_DEFAULTS.length; i++) {
    if (name.indexOf(CFP_DEFAULTS[i].key) !== -1) return CFP_DEFAULTS[i];
  }
  return { density: 1000, gwp: 2.0 }; // generic polymer fallback
}

// ------------------------------------------------------------------
// Core calculation
// Input:
//   layers  — array of { matId, thickness (µm) }  (State.layers format)
//   mats    — materials lookup object keyed by id
//   areaM2  — package surface area in m²  (optional, default 1)
// Output:
//   { layers: [...], totalPerM2, totalPerUnit, areaM2 }
// ------------------------------------------------------------------
function calcCarbonFootprint(layers, mats, areaM2) {
  areaM2 = areaM2 || 1;
  var result = { layers: [], totalPerM2: 0, totalPerUnit: 0, areaM2: areaM2 };

  for (var i = 0; i < layers.length; i++) {
    var l   = layers[i];
    var mat = mats[l.matId];
    if (!mat || !l.thickness) continue;

    var d   = cfpDefaults(mat);
    var thickM = l.thickness * 1e-6;             // µm → m
    var mass   = d.density * thickM;             // kg/m²
    var co2    = mass * d.gwp;                   // kg CO₂eq/m²

    result.layers.push({
      name:     mat.name,
      thickness: l.thickness,
      density:  d.density,
      gwp:      d.gwp,
      massPerM2: mass,
      co2PerM2:  co2,
      isDefault: !(mat.density && mat.gwp)
    });
    result.totalPerM2 += co2;
  }

  result.totalPerUnit = result.totalPerM2 * areaM2;
  return result;
}

// ------------------------------------------------------------------
// Render  —  called from renderContent() when State.tab === 'carbonfp'
// ------------------------------------------------------------------
function renderCarbonFootprint() {
  var el = document.getElementById('content');
  if (!el) return;

  // Build layers from State
  var mats   = {};
  var allMats = (typeof State !== 'undefined' && State.materials) ? State.materials : [];
  for (var i = 0; i < allMats.length; i++) mats[allMats[i].id] = allMats[i];

  var layers = (typeof State !== 'undefined' && State.layers) ? State.layers : [];
  var area   = (typeof State !== 'undefined' && State.cfpArea) ? State.cfpArea : 0.04; // default 400 cm²

  var cfp = (layers.length > 0) ? calcCarbonFootprint(layers, mats, area) : null;

  // ── HTML ──────────────────────────────────────────────────────────
  var html = '<div class="tab-content" id="cfp-root">';
  html += '<h2 class="section-title">Carbon Footprint Estimator</h2>';
  html += '<p class="section-desc">Cradle-to-gate CO₂eq for the current laminate structure. ' +
          'Based on EPD values (PlasticsEurope / Ecoinvent). ' +
          '<strong>Not suitable for official LCA declarations.</strong></p>';

  // Package area input
  html += '<div class="cfp-area-row">';
  html += '<label>Package surface area</label>';
  html += '<input type="number" id="cfp-area-input" value="' + (area * 1e4).toFixed(0) +
          '" min="1" step="1" style="width:90px"> cm²';
  html += ' <button class="btn-secondary" onclick="onCfpAreaChange()">Update</button>';
  html += '</div>';

  if (layers.length === 0) {
    html += '<div class="cfp-empty">No laminate defined yet. ' +
            'Build a structure in the <strong>Calculator</strong> tab first.</div>';
  } else {
    // Layer breakdown table
    html += '<table class="cfp-table">';
    html += '<thead><tr>' +
            '<th>Layer</th><th>Thickness (µm)</th>' +
            '<th>Density (kg/m³)</th><th>GWP (kg CO₂eq/kg)</th>' +
            '<th>Mass (g/m²)</th><th>CO₂eq (g/m²)</th></tr></thead><tbody>';

    for (var j = 0; j < cfp.layers.length; j++) {
      var r = cfp.layers[j];
      html += '<tr' + (r.isDefault ? ' class="cfp-default"' : '') + '>';
      html += '<td>' + r.name + (r.isDefault ? ' <span class="cfp-est">est.</span>' : '') + '</td>';
      html += '<td>' + r.thickness + '</td>';
      html += '<td>' + r.density   + '</td>';
      html += '<td>' + r.gwp.toFixed(2) + '</td>';
      html += '<td>' + (r.massPerM2 * 1000).toFixed(2) + '</td>';
      html += '<td>' + (r.co2PerM2  * 1000).toFixed(3) + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table>';

    // Results panel
    html += '<div class="cfp-results">';
    html += '<div class="cfp-result-card">';
    html += '<div class="cfp-result-val">' + (cfp.totalPerM2 * 1000).toFixed(1) + '</div>';
    html += '<div class="cfp-result-lbl">g CO₂eq / m²</div>';
    html += '</div>';
    html += '<div class="cfp-result-card cfp-accent">';
    html += '<div class="cfp-result-val">' + (cfp.totalPerUnit * 1000).toFixed(2) + '</div>';
    html += '<div class="cfp-result-lbl">g CO₂eq / unit  (' + (area * 1e4).toFixed(0) + ' cm²)</div>';
    html += '</div>';
    html += '</div>';

    // Equivalence note
    var gPerUnit = cfp.totalPerUnit * 1000;
    html += '<div class="cfp-equiv">≈ ' + (gPerUnit / 170 * 1).toFixed(2) +
            ' km driven by car · or ' + (gPerUnit / 21 * 1).toFixed(2) +
            ' charges of a smartphone</div>';

    // Default-value disclaimer
    var hasDefaults = cfp.layers.some(function(r){ return r.isDefault; });
    if (hasDefaults) {
      html += '<div class="cfp-note">⚠ Rows marked <em>est.</em> use default GWP values. ' +
              'Add <code>density</code> and <code>gwp</code> fields to the material record for precise values.</div>';
    }
  }

  html += '</div>'; // tab-content
  el.innerHTML = html;
}

// Called when user changes the area input
function onCfpAreaChange() {
  var v = parseFloat(document.getElementById('cfp-area-input').value);
  if (isNaN(v) || v <= 0) return;
  if (typeof State !== 'undefined') State.cfpArea = v / 1e4; // cm² → m²
  renderCarbonFootprint();
}
