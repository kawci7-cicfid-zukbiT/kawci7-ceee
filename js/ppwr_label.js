// ====================================================================
// ppwr_label.js  —  PPWR / Decision 97/129/EC Label Generator
// Tab: State.tab === 'ppwr-label'
// Renders into #app-content
//
// Logic:
//   1. Read layers from State (same as Calculator)
//   2. Compute weight per material family using CFP density defaults
//   3. Classify per Decision 97/129/EC codes
//   4. Apply national rules (FR / IT / DE / ES / EU-2028)
//   5. Render classification + recyclability + market requirements table
// ====================================================================

// ------------------------------------------------------------------
// Material code mapping — Decision 97/129/EC
// ------------------------------------------------------------------
var PPWR_MATERIAL_CODES = {
  // Plastics
  'PET':        { code:'01', abbr:'PET',  family:'plastic' },
  'PETG':       { code:'01', abbr:'PET',  family:'plastic' },
  'HDPE':       { code:'02', abbr:'HDPE', family:'plastic' },
  'PVC':        { code:'03', abbr:'PVC',  family:'plastic' },
  'PVDC':       { code:'03', abbr:'PVC',  family:'plastic' },
  'LDPE':       { code:'04', abbr:'LDPE', family:'plastic' },
  'LLDPE':      { code:'04', abbr:'LDPE', family:'plastic' },
  'PE':         { code:'04', abbr:'LDPE', family:'plastic' },
  'PP':         { code:'05', abbr:'PP',   family:'plastic' },
  'BOPP':       { code:'05', abbr:'PP',   family:'plastic' },
  'PS':         { code:'06', abbr:'PS',   family:'plastic' },
  'PA':         { code:'07', abbr:'O7',   family:'plastic' },
  'EVOH':       { code:'07', abbr:'O7',   family:'plastic' },
  'PLA':        { code:'07', abbr:'O7',   family:'plastic' },
  'Other':      { code:'07', abbr:'O7',   family:'plastic' },
  // Metals
  'AL':         { code:'41', abbr:'ALU',  family:'metal'   },
  'Metal':      { code:'41', abbr:'ALU',  family:'metal'   },
  // Paper / board
  'Paper':      { code:'22', abbr:'PAP',  family:'paper'   },
};

// Resolve family from material object
function _ppwrFamily(mat) {
  if (!mat) return 'plastic';
  // Try direct family match
  var fam = mat.family || '';
  if (fam === 'AL' || fam.toUpperCase().indexOf('ALU') >= 0 ||
      fam.toUpperCase().indexOf('METAL') >= 0) return 'metal';
  if (fam === 'Paper' || fam.toUpperCase().indexOf('PAPER') >= 0 ||
      fam.toUpperCase().indexOf('KRAFT') >= 0) return 'paper';
  // Fallback to name scan
  var name = (mat.name || '').toUpperCase();
  if (name.indexOf('ALU') >= 0 || name.indexOf(' AL ') >= 0 || name.indexOf('FOIL') >= 0) return 'metal';
  if (name.indexOf('PAPER') >= 0 || name.indexOf('KRAFT') >= 0) return 'paper';
  return 'plastic';
}

function _ppwrCode(mat) {
  if (!mat) return PPWR_MATERIAL_CODES['Other'];
  var fam = mat.family || '';
  if (PPWR_MATERIAL_CODES[fam]) return PPWR_MATERIAL_CODES[fam];
  // scan name
  var name = (mat.name || '').toUpperCase();
  for (var k in PPWR_MATERIAL_CODES) {
    if (name.indexOf(k) >= 0) return PPWR_MATERIAL_CODES[k];
  }
  return PPWR_MATERIAL_CODES['Other'];
}

// ------------------------------------------------------------------
// Density fallback (mirrors CFP logic — no direct dependency)
// ------------------------------------------------------------------
var _PPWR_DENSITY = {
  PET:1380, PETG:1380, HDPE:960, PVC:1380, PVDC:1700,
  LDPE:950, LLDPE:925, PE:950, PP:910, BOPP:910,
  PS:1050, PA:1130, EVOH:1190, PLA:1240, ALU:2700, Paper:700,
  Other:1000
};

function _ppwrDensity(mat) {
  if (mat && mat.density && mat.density > 0) return mat.density;
  // Use cfpDefaults if available (carbonfp.js)
  if (typeof cfpDefaults === 'function') return cfpDefaults(mat).density;
  var fam = mat ? (mat.family || '') : '';
  return _PPWR_DENSITY[fam] || 1000;
}

// ------------------------------------------------------------------
// Core classification
// ------------------------------------------------------------------
function classifyLaminateForPPWR(layers, materials) {
  var weights   = { plastic:0, metal:0, paper:0 };
  var totalW    = 0;
  var layerData = [];

  for (var i = 0; i < layers.length; i++) {
    var l   = layers[i];
    var mat = null;
    for (var j = 0; j < materials.length; j++) {
      if (String(materials[j].id) === String(l.mid)) { mat = materials[j]; break; }
    }
    if (!mat || !l.thick) continue;
    var density  = _ppwrDensity(mat);
    var w        = density * l.thick * 1e-6;      // kg/m²
    var family   = _ppwrFamily(mat);
    var code     = _ppwrCode(mat);
    weights[family] = (weights[family] || 0) + w;
    totalW += w;
    layerData.push({ name:mat.name, thick:l.thick, density:density, weight:w,
                     family:family, code:code });
  }

  if (totalW === 0) return null;

  var pct = {
    plastic: (weights.plastic / totalW) * 100,
    metal:   (weights.metal   / totalW) * 100,
    paper:   (weights.paper   / totalW) * 100
  };

  var families = Object.keys(weights).filter(function(f){ return weights[f] > 0; });

  // Single-family
  if (families.length === 1) {
    var fam0 = families[0];
    // Find dominant layer within family
    var domLayer = layerData.filter(function(l){ return l.family === fam0; })
                            .sort(function(a,b){ return b.weight - a.weight; })[0];
    return {
      code:           domLayer.code.code,
      abbr:           domLayer.code.abbr,
      isComposite:    false,
      dominantFamily: fam0,
      weights:        weights,
      totalWeight:    totalW,
      pct:            pct,
      layerData:      layerData,
      note:           null
    };
  }

  // Composite — dominant material + threshold rules
  // Metal > 5% → C/ALU (84)
  if (pct.metal > 5) {
    return {
      code:'84', abbr:'C/ALU', isComposite:true,
      dominantFamily: pct.plastic >= pct.metal ? 'plastic' : 'metal',
      weights:weights, totalWeight:totalW, pct:pct, layerData:layerData,
      note:'Aluminium content ' + pct.metal.toFixed(1) + '% by weight (threshold 5%). ' +
           'Classified as plastic-metal composite.'
    };
  }
  // Paper > 5% → C/PAP (82)
  if (pct.paper > 5) {
    return {
      code:'82', abbr:'C/PAP', isComposite:true,
      dominantFamily:'composite',
      weights:weights, totalWeight:totalW, pct:pct, layerData:layerData,
      note:'Paper/board content ' + pct.paper.toFixed(1) + '% by weight (threshold 5%).'
    };
  }
  // Multi-layer plastic only
  return {
    code:'07', abbr:'O7', isComposite:true,
    dominantFamily:'plastic',
    weights:weights, totalWeight:totalW, pct:pct, layerData:layerData,
    note:'Multi-layer plastic structure — verify recycling stream compatibility with the ' +
         'relevant PRO (Producer Responsibility Organisation).'
  };
}

// ------------------------------------------------------------------
// RECYCLABILITY ASSESSMENT (RecyClass / CEFLEX based — indicative)
// NOTE: Official PPWR Design-for-Recycling criteria and the A/B/C grades
// are not finalised (delegated acts expected 2028, grades apply 2030).
// This is an INDICATIVE assessment based on current RecyClass / CEFLEX
// guidelines, not a legal recyclability grade.
// ------------------------------------------------------------------
function assessRecyclability(cls, layers, materials) {
  if (!cls) return null;
  var pct = cls.pct || { plastic: 0, metal: 0, paper: 0 };

  // Mono-material threshold (RecyClass: ≥90–95% one family to be recyclable)
  var MONO_THRESHOLD = 90;
  var dominantPct = Math.max(pct.plastic, pct.metal, pct.paper);

  // Distinct plastic families present (PE/PP/PET incompatible in same stream)
  var plasticFamilies = {};
  for (var i = 0; i < (cls.layerData || []).length; i++) {
    var ld = cls.layerData[i];
    if (ld.family === 'plastic') plasticFamilies[ld.code.abbr] = true;
  }
  var nPlasticTypes = Object.keys(plasticFamilies).length;

  var level, score, color, reasons = [];

  if (!cls.isComposite && dominantPct >= MONO_THRESHOLD && nPlasticTypes <= 1) {
    level = 'recyclable'; score = 'A–B'; color = '#16a34a';
    reasons.push('Mono-material structure (' + dominantPct.toFixed(0) + '% ' + cls.dominantFamily + ') — compatible with an existing recycling stream.');
  } else if (pct.metal > 5) {
    level = 'not-recyclable'; score = 'D–E'; color = '#dc2626';
    reasons.push('Aluminium content ' + pct.metal.toFixed(1) + '% (>5%) — plastic-metal composite is not separable in standard streams.');
  } else if (pct.paper > 5 && pct.plastic > 5) {
    level = 'limited'; score = 'C–D'; color = '#d97706';
    reasons.push('Paper-plastic composite — recyclable only where dedicated fibre-recovery streams exist.');
  } else if (nPlasticTypes > 1) {
    level = 'not-recyclable'; score = 'D'; color = '#dc2626';
    reasons.push('Multi-material plastic (' + Object.keys(plasticFamilies).join(' + ') + ') — incompatible polymers cannot be separated in mechanical recycling.');
    reasons.push('Consider a mono-material redesign (e.g. all-PE or all-PP) to reach recyclability.');
  } else {
    level = 'limited'; score = 'C'; color = '#d97706';
    reasons.push('Predominantly one polymer with minor secondary components — verify stream compatibility with the local recycler.');
  }

  return {
    level: level,
    scoreHint: score,
    color: color,
    reasons: reasons,
    monoMaterial: !cls.isComposite && dominantPct >= MONO_THRESHOLD && nPlasticTypes <= 1,
    dominantPct: dominantPct,
    plasticTypes: Object.keys(plasticFamilies)
  };
}


// ------------------------------------------------------------------
// National rules
// ------------------------------------------------------------------
var COUNTRY_RULES = {
  'FR': {
    flag:'🇫🇷', name:'France', system:'Triman / AGEC',
    requiresTriman: true,
    note:'The Triman logo is mandatory for products placed on the French market under AGEC (Loi Anti-Gaspillage). It must appear on the primary packaging alongside sorting instructions. This obligation remains in force until the PPWR harmonised pictograms are adopted (expected from August 2028).',
    sorting:{
      plastic:  'Bac de tri sélectif — plastiques',
      metal:    'Bac de tri sélectif — métaux',
      paper:    'Bac de tri sélectif — papiers',
      composite:'Vérifier les consignes de tri locales'
    },
    additionalItems:['Triman logo on pack', 'Online sorting instructions (consumer-facing URL or QR code)']
  },
  'IT': {
    flag:'🇮🇹', name:'Italy', system:'D.Lgs. 116/2020 / CONAI',
    requiresMaterialCode: true,
    note:'Italian law (D.Lgs. 116/2020, implementing EU Directive 2018/851) requires the material identification code and collection stream to appear on packaging. The code must be referenced against the CONAI material identification system. Labelling must be in Italian.',
    sorting:{
      plastic:  'Raccolta differenziata — plastica',
      metal:    'Raccolta differenziata — metalli',
      paper:    'Raccolta differenziata — carta e cartone',
      composite:'Verificare la raccolta locale'
    },
    additionalItems:['CONAI material code on pack', 'Collection stream indication in Italian']
  },
  'DE': {
    flag:'🇩🇪', name:'Germany', system:'VerpackG / LUCID',
    requiresLUCID: true,
    note:'The Verpackungsgesetz (VerpackG) requires all producers placing packaging on the German market to register in the LUCID Packaging Register and contract a dual-system operator (e.g. Der Grüne Punkt, Interseroh). The Grüner Punkt symbol is commercially widespread but not legally mandatory as a pack marking.',
    sorting:{
      plastic:  'Gelbe Tonne / Gelber Sack — Leichtverpackungen',
      metal:    'Gelbe Tonne / Gelber Sack — Metalle',
      paper:    'Blaue Tonne — Papier und Pappe',
      composite:'Gelbe Tonne — Verbundmaterialien'
    },
    additionalItems:['LUCID registration mandatory before placing on market', 'Dual-system contract required']
  },
  'ES': {
    flag:'🇪🇸', name:'Spain', system:'Ley 7/2022 / Ecoembes',
    requiresMaterialInfo: true,
    note:'Spain\'s Residuos y Suelos Contaminados (Ley 7/2022) requires material identification on packaging. The Punto Verde is managed by Ecoembes for light packaging. Marking must follow the Decision 97/129/EC codes currently in force.',
    sorting:{
      plastic:  'Contenedor amarillo — plásticos',
      metal:    'Contenedor amarillo — metales',
      paper:    'Contenedor azul — papel y cartón',
      composite:'Contenedor amarillo — envases compuestos'
    },
    additionalItems:['Punto Verde or equivalent producer responsibility scheme', 'Material code on pack recommended']
  },
  'EU2028': {
    flag:'🇪🇺', name:'All EU (from 12 August 2028)', system:'PPWR Harmonised',
    note:'PPWR (Regulation (EU) 2025/40) mandates a harmonised labelling system for all packaging placed on the EU single market. The Commission is expected to publish implementing acts specifying the final pictograms and format before the August 2028 transition date. National labels (Triman, CONAI codes, etc.) cannot coexist with the harmonised label after that date.',
    status:'pending',
    additionalItems:['Await Commission implementing act for final pictogram specifications', 'Until then, Decision 97/129/EC marking remains valid (Art. 8(2))']
  }
};

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
function renderPPWRLabel() {
  var c = document.getElementById('app-content'); if (!c) return;

  var layers  = (typeof State !== 'undefined' && State.layers)   ? State.layers   : [];
  var allMats = (typeof DB    !== 'undefined' && DB.materials)    ? DB.materials   : [];
  var selMkts = (typeof State !== 'undefined' && State.ppwrMkts) ? State.ppwrMkts : ['FR','IT','DE','ES','EU2028'];

  var cls = layers.length > 0 ? classifyLaminateForPPWR(layers, allMats) : null;

  var html = '<div style="max-width:960px;margin:0 auto;padding-bottom:2rem">';

  // ── Page header ──────────────────────────────────────────────────
  html += '<div style="margin-bottom:1.5rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Regulatory · Packaging</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem;letter-spacing:-0.01em">PPWR Label Generator</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:620px">Automatic material classification per Decision 97/129/EC. Generates the labelling specification for each selected market based on the layer structure defined in the Calculator.</p>';
  html += '</div>';

  // ── Regulatory status banner ──────────────────────────────────────
  html += '<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:0.9rem 1.1rem;margin-bottom:1.25rem;display:flex;gap:0.75rem;align-items:flex-start">';
  html += '<div style="font-size:1.1rem;flex-shrink:0;margin-top:0.05rem"></div>';
  html += '<div style="font-size:0.8rem;color:#713f12;line-height:1.55">';
  html += '<strong>PPWR — Regulation (EU) 2025/40</strong> entered into force 11 Feb 2025 and <strong>applies from 12 August 2026</strong>, repealing Directive 94/62/EC. From that date every packaging placed on the EU market needs an <strong>EU Declaration of Conformity</strong> and technical documentation (Art. 38–39), must minimise substances of concern, and meet packaging-minimisation rules. ';
  html += 'Material marking still follows <strong>Decision 97/129/EC</strong> codes — kept in force under Art. 8(2) until ~30 months after the Commission\'s implementing act (expected ~2028). Recyclability grades (A/B/C) and recycled-content targets phase in from 2030.';
  html += '</div></div>';

  // ── No laminate guard ─────────────────────────────────────────────
  if (!cls) {
    html += '<div class="card"><div class="alert alert-info" style="margin:0">No laminate configured. Go to the <strong>Calculator</strong> tab, define a layer structure, then return here for the classification.</div></div>';
    html += _ppwrMethodology();
    html += '</div>'; c.innerHTML = html; return;
  }

  // ── Classification result ─────────────────────────────────────────
  html += '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:1.25rem 1.4rem;margin-bottom:1.25rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.85rem">Classification Result — Decision 97/129/EC</div>';

  // Big code badge + breakdown
  html += '<div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap">';

  // Badge
  var badgeBg   = cls.dominantFamily === 'metal' ? '#fef3c7' :
                  cls.dominantFamily === 'paper' ? '#f0fdf4' : '#eff6ff';
  var badgeBord = cls.dominantFamily === 'metal' ? '#fcd34d' :
                  cls.dominantFamily === 'paper' ? '#86efac' : '#bfdbfe';
  var badgeClr  = cls.dominantFamily === 'metal' ? '#92400e' :
                  cls.dominantFamily === 'paper' ? '#166534' : '#1e40af';

  html += '<div style="flex-shrink:0;text-align:center">';
  html += '<div style="background:' + badgeBg + ';border:2px solid ' + badgeBord + ';border-radius:10px;padding:1rem 1.5rem;display:inline-block">';
  html += '<div style="font-family:monospace;font-size:0.65rem;font-weight:700;letter-spacing:0.12em;color:' + badgeClr + ';text-transform:uppercase;margin-bottom:0.3rem">Decision 97/129/EC</div>';
  html += '<div style="font-size:2rem;font-weight:900;color:' + badgeClr + ';line-height:1;letter-spacing:0.05em">' + cls.abbr + '</div>';
  html += '<div style="font-size:0.72rem;font-weight:700;color:' + badgeClr + ';margin-top:0.2rem">Code ' + cls.code + '</div>';
  html += '</div>';
  if (cls.isComposite) {
    html += '<div style="font-size:0.68rem;color:var(--text-light);margin-top:0.4rem;font-weight:600">COMPOSITE</div>';
  }
  html += '</div>';

  // Weight breakdown
  html += '<div style="flex:1;min-width:240px">';
  html += '<div style="font-size:0.78rem;font-weight:700;color:var(--text);margin-bottom:0.6rem">Material composition by weight (kg/m²)</div>';

  // Layer table
  html += '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;margin-bottom:0.75rem">';
  html += '<thead><tr style="background:#f8fafc">';
  html += '<th style="padding:0.4rem 0.6rem;text-align:left;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border)">Material</th>';
  html += '<th style="padding:0.4rem 0.6rem;text-align:right;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border)">µm</th>';
  html += '<th style="padding:0.4rem 0.6rem;text-align:right;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border)">g/m²</th>';
  html += '<th style="padding:0.4rem 0.6rem;text-align:right;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border)">%</th>';
  html += '<th style="padding:0.4rem 0.6rem;text-align:left;font-weight:600;color:var(--text-light);border-bottom:1px solid var(--border)">Family</th>';
  html += '</tr></thead><tbody>';
  for (var li = 0; li < cls.layerData.length; li++) {
    var ld  = cls.layerData[li];
    var pctLayer = ((ld.weight / cls.totalWeight) * 100).toFixed(1);
    var famClr = ld.family === 'metal' ? '#d97706' : ld.family === 'paper' ? '#16a34a' : '#2563eb';
    html += '<tr style="border-bottom:1px solid #f1f5f9">';
    html += '<td style="padding:0.4rem 0.6rem;font-weight:500">' + ld.name + '</td>';
    html += '<td style="padding:0.4rem 0.6rem;text-align:right;color:var(--text-light)">' + ld.thick + '</td>';
    html += '<td style="padding:0.4rem 0.6rem;text-align:right;font-variant-numeric:tabular-nums">' + (ld.weight * 1000).toFixed(2) + '</td>';
    html += '<td style="padding:0.4rem 0.6rem;text-align:right;font-weight:600;color:' + famClr + '">' + pctLayer + '%</td>';
    html += '<td style="padding:0.4rem 0.6rem"><span style="font-size:0.68rem;font-weight:700;background:' + (ld.family==='metal'?'#fef3c7':ld.family==='paper'?'#f0fdf4':'#eff6ff') + ';color:' + famClr + ';padding:1px 6px;border-radius:4px;text-transform:uppercase">' + ld.family + '</span></td>';
    html += '</tr>';
  }
  // Summary row per family
  html += '<tr style="background:#f8fafc;font-weight:700;font-size:0.76rem">';
  html += '<td colspan="2" style="padding:0.4rem 0.6rem;color:var(--text-light)">TOTAL</td>';
  html += '<td style="padding:0.4rem 0.6rem;text-align:right">' + (cls.totalWeight * 1000).toFixed(2) + '</td>';
  html += '<td style="padding:0.4rem 0.6rem;text-align:right">100%</td>';
  html += '<td></td>';
  html += '</tr>';
  html += '</tbody></table>';

  // Family weight bars
  var famOrder = [
    { key:'plastic', label:'Plastic',   clr:'#2563eb' },
    { key:'metal',   label:'Metal',     clr:'#d97706' },
    { key:'paper',   label:'Paper',     clr:'#16a34a' }
  ];
  for (var fi = 0; fi < famOrder.length; fi++) {
    var fo  = famOrder[fi];
    var pf  = cls.pct[fo.key];
    if (pf < 0.1) continue;
    html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">';
    html += '<span style="font-size:0.7rem;width:46px;color:var(--text-light);flex-shrink:0">' + fo.label + '</span>';
    html += '<div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">';
    html += '<div style="height:100%;width:' + pf.toFixed(1) + '%;background:' + fo.clr + ';border-radius:4px;transition:width 0.4s"></div>';
    html += '</div>';
    html += '<span style="font-size:0.72rem;font-weight:700;color:' + fo.clr + ';width:38px;text-align:right;flex-shrink:0">' + pf.toFixed(1) + '%</span>';
    html += '</div>';
  }

  if (cls.note) {
    html += '<div style="margin-top:0.75rem;background:#fef9ec;border:1px solid #fde68a;border-radius:6px;padding:0.55rem 0.75rem;font-size:0.75rem;color:#92400e;line-height:1.5">ℹ️ ' + cls.note + '</div>';
  }
  html += '</div>'; // weight breakdown
  html += '</div>'; // flex row
  html += '</div>'; // classification card

  // ── Recyclability assessment (indicative) ─────────────────────────
  var rec = assessRecyclability(cls, layers, allMats);
  if (rec) {
    var recBg = rec.level === 'recyclable' ? '#f0fdf4' : rec.level === 'limited' ? '#fffbeb' : '#fef2f2';
    var recIcon = rec.level === 'recyclable' ? '♻️' : rec.level === 'limited' ? '⚠️' : '🚫';
    var recTitle = rec.level === 'recyclable' ? 'Likely recyclable' :
                   rec.level === 'limited' ? 'Limited recyclability' : 'Not recyclable (current streams)';
    html += '<div style="background:' + recBg + ';border:1.5px solid ' + rec.color + '33;border-radius:12px;padding:1.1rem 1.4rem;margin-bottom:1.25rem">';
    html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.6rem">Recyclability — indicative (RecyClass / CEFLEX)</div>';
    html += '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.6rem">';
    html += '<span style="font-size:1.4rem">' + recIcon + '</span>';
    html += '<span style="font-size:1.05rem;font-weight:800;color:' + rec.color + '">' + recTitle + '</span>';
    html += '<span style="margin-left:auto;font-size:0.72rem;font-weight:700;color:' + rec.color + ';background:#fff;border:1px solid ' + rec.color + '55;border-radius:20px;padding:0.2rem 0.7rem">Est. grade ' + rec.scoreHint + '</span>';
    html += '</div>';
    for (var ri = 0; ri < rec.reasons.length; ri++)
      html += '<div style="font-size:0.8rem;color:var(--text);line-height:1.5;margin-bottom:0.3rem">• ' + rec.reasons[ri] + '</div>';
    html += '<div style="font-size:0.68rem;color:var(--text-light);margin-top:0.6rem;line-height:1.5;font-style:italic">Indicative only. Official PPWR Design-for-Recycling criteria and A/B/C grades are pending (delegated acts expected 2028; recyclability grades apply from 1 Jan 2030).</div>';
    html += '</div>';
  }

  // ── Compliance action checklist (what to do, based on this structure) ──
  var recForChecklist = assessRecyclability(cls, layers, allMats);
  html += '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:1.1rem 1.4rem;margin-bottom:1.25rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.7rem">What this means for you — PPWR action checklist</div>';
  html += '<div style="display:flex;flex-direction:column;gap:0.55rem">';

  function actionRow(state, title, body) {
    var clr = state === 'ok' ? '#16a34a' : state === 'action' ? '#d97706' : '#dc2626';
    var ic  = state === 'ok' ? '✓' : state === 'action' ? '!' : '✗';
    return '<div style="display:flex;gap:0.6rem;align-items:flex-start">' +
      '<span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:' + clr + ';color:#fff;font-size:0.7rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:0.1rem">' + ic + '</span>' +
      '<div style="font-size:0.82rem;line-height:1.5;color:var(--text)"><strong>' + title + '</strong><br><span style="color:var(--text-light)">' + body + '</span></div></div>';
  }

  // 1. Declaration of Conformity
  html += actionRow('action', 'EU Declaration of Conformity (mandatory from 12 Aug 2026)',
    'Draw up a DoC and technical documentation for this packaging per Art. 38–39 and Annex VII. Without it the pack cannot be legally placed on the EU market.');
  // 2. Material identification
  html += actionRow('ok', 'Material identification: ' + cls.abbr + ' (code ' + cls.code + ')',
    'Mark the pack with the Decision 97/129/EC code shown above. Apply the national sorting rules for each target market below.');
  // 3. Recyclability
  if (recForChecklist) {
    if (recForChecklist.level === 'recyclable')
      html += actionRow('ok', 'Recyclability: on track',
        'Mono-material structure — compatible with existing recycling streams. Keep evidence for the recyclability assessment that becomes mandatory from 2030.');
    else
      html += actionRow('warn', 'Recyclability: at risk for 2030',
        'This structure is unlikely to be recyclable in current streams. From 1 Jan 2030 all packaging must meet recyclability grades — consider a mono-material redesign now to avoid a forced reformulation later.');
  }
  // 5. Recycled content
  html += actionRow('action', 'Recycled content (targets from 2030)',
    'Recorded recycled-content % is not yet required but will be from 2030. Start collecting this data from your film suppliers now.');

  html += '</div></div>';

  html += '<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:0.25rem">Target Markets</div>';
  html += '<div style="font-size:0.75rem;color:var(--text-light);margin-bottom:0.85rem">Select the markets where this packaging will be placed — the table below shows the labelling requirements for each.</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem">';
  var allMkts = Object.keys(COUNTRY_RULES);
  for (var mi = 0; mi < allMkts.length; mi++) {
    var mk    = allMkts[mi];
    var rule  = COUNTRY_RULES[mk];
    var isOn  = selMkts.indexOf(mk) >= 0;
    html += '<button onclick="ppwrToggleMkt(\'' + mk + '\')" id="ppwr-mkt-' + mk + '" style="' +
      'display:inline-flex;align-items:center;gap:0.4rem;padding:0.45rem 0.85rem;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;border:1.5px solid;transition:all 0.15s;' +
      (isOn ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : 'background:#fff;color:var(--text-light);border-color:var(--border)') +
      '">' + rule.flag + ' ' + rule.name + '</button>';
  }
  html += '</div></div>';

  // ── Single market requirements table ──────────────────────────────
  html += '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1.25rem">';
  html += '<div style="overflow-x:auto">';
  html += '<table style="width:100%;border-collapse:collapse;font-size:0.8rem">';
  html += '<thead><tr style="background:#f8fafc">';
  html += '<th style="padding:0.6rem 0.85rem;text-align:left;font-weight:700;color:var(--text-light);border-bottom:1.5px solid var(--border)">Market</th>';
  html += '<th style="padding:0.6rem 0.85rem;text-align:left;font-weight:700;color:var(--text-light);border-bottom:1.5px solid var(--border)">Labelling scheme</th>';
  html += '<th style="padding:0.6rem 0.85rem;text-align:left;font-weight:700;color:var(--text-light);border-bottom:1.5px solid var(--border)">Status</th>';
  html += '<th style="padding:0.6rem 0.85rem;text-align:left;font-weight:700;color:var(--text-light);border-bottom:1.5px solid var(--border)">Collection stream</th>';
  html += '<th style="padding:0.6rem 0.85rem;text-align:left;font-weight:700;color:var(--text-light);border-bottom:1.5px solid var(--border)">Key requirement for this pack</th>';
  html += '</tr></thead><tbody>';

  for (var mki = 0; mki < allMkts.length; mki++) {
    var mk2   = allMkts[mki];
    var rule2 = COUNTRY_RULES[mk2];
    var isOn2 = selMkts.indexOf(mk2) >= 0;
    if (!isOn2) continue; // show only selected markets
    var sort2 = rule2.sorting ? (rule2.sorting[cls.dominantFamily] || rule2.sorting['composite'] || '—') : '—';

    // Build the key requirement for this structure
    var keyReq = '';
    if (rule2.status === 'pending') {
      keyReq = 'Await harmonised EU pictograms; Decision 97/129/EC code <strong>' + cls.abbr + ' ' + cls.code + '</strong> remains valid until then.';
    } else if (rule2.requiresTriman) {
      keyReq = 'Triman logo + online sorting instructions on primary pack; mark code <strong>' + cls.abbr + ' ' + cls.code + '</strong>.';
    } else if (rule2.requiresMaterialCode) {
      keyReq = 'CONAI material code <strong>' + cls.abbr + ' ' + cls.code + '</strong> + collection stream, in Italian.';
    } else if (rule2.requiresLUCID) {
      keyReq = 'LUCID registration + dual-system contract required before placing on market.';
    } else if (rule2.requiresMaterialInfo) {
      keyReq = 'Punto Verde / EPR scheme; material code <strong>' + cls.abbr + ' ' + cls.code + '</strong> recommended.';
    } else {
      keyReq = 'Mark code <strong>' + cls.abbr + ' ' + cls.code + '</strong>.';
    }

    var statusBadge = rule2.status === 'pending'
      ? '<span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.66rem;font-weight:700;white-space:nowrap">PENDING</span>'
      : '<span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:6px;padding:0.15rem 0.5rem;font-size:0.66rem;font-weight:700;white-space:nowrap">IN FORCE</span>';

    html += '<tr style="border-bottom:1px solid #f1f5f9;vertical-align:top">';
    html += '<td style="padding:0.6rem 0.85rem;white-space:nowrap"><span style="font-size:1rem;margin-right:0.3rem">' + rule2.flag + '</span><strong>' + rule2.name + '</strong></td>';
    html += '<td style="padding:0.6rem 0.85rem;color:var(--text-light)">' + rule2.system + '</td>';
    html += '<td style="padding:0.6rem 0.85rem">' + statusBadge + '</td>';
    html += '<td style="padding:0.6rem 0.85rem;color:var(--text)">' + sort2 + '</td>';
    html += '<td style="padding:0.6rem 0.85rem;color:var(--text);line-height:1.5">' + keyReq + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table></div></div>';

  // ── Methodology / disclaimer ──────────────────────────────────────
  html += _ppwrMethodology();
  html += '</div>'; // max-width
  c.innerHTML = html;
}

// ------------------------------------------------------------------
// Toggle market button
// ------------------------------------------------------------------
function ppwrToggleMkt(mk) {
  if (typeof State === 'undefined') return;
  if (!State.ppwrMkts) State.ppwrMkts = ['FR','IT','DE','ES','EU2028'];
  var idx = State.ppwrMkts.indexOf(mk);
  if (idx >= 0) State.ppwrMkts.splice(idx, 1);
  else          State.ppwrMkts.push(mk);
  if (typeof DB !== 'undefined' && typeof DB.saveState === 'function') DB.saveState(State);
  renderPPWRLabel(); // rebuild page so the table reflects the new selection
}


// ------------------------------------------------------------------
// Methodology / disclaimer
// ------------------------------------------------------------------
function _ppwrMethodology() {
  return '<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary);background:var(--card)">' +
    '<div style="padding:1.1rem 1.4rem">' +
    '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.05rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.4rem;margin-bottom:0.8rem">Methodology &amp; Legal Basis</h2>' +
    '<div style="font-size:0.85rem;line-height:1.7;color:#334155;font-family:Georgia,\'Times New Roman\',serif">' +
    '<p><strong>Classification system:</strong> Commission Decision 97/129/EC establishes the identification system for packaging materials. Numeric codes (01–07 for plastics, 41 for aluminium, 22 for paper) and alphabetic abbreviations (PET, PP, ALU, PAP, etc.) appear on the packaging to identify the primary material or, for composites, the dominant material preceded by C/.</p>' +
    '<p><strong>Composite threshold:</strong> When a laminate contains more than one material family, the tool applies a 5% by weight threshold. If metal exceeds 5% of total laminate weight, the structure is classified as C/ALU (code 84). If paper/board exceeds 5%, it is classified as C/PAP (code 82). Multi-layer all-plastic structures are classified as O7 (code 07).</p>' +
    '<p><strong>Weight calculation:</strong> Layer weights are computed from density × thickness, using stored material density values or EPD defaults (same methodology as the Carbon Footprint Estimator). The percentage composition is calculated on a per-unit-area basis (kg/m²).</p>' +
    '<p><strong>PPWR transition:</strong> Regulation (EU) 2025/40 (PPWR) entered into force on 11 February 2025 and applies from 12 August 2026, repealing Directive 94/62/EC. It mandates a future harmonised EU labelling system; under Article 8(2) the existing Decision 97/129/EC marking continues to apply until 30 months after the Commission adopts the relevant implementing act (expected around 2028). National schemes (Triman, CONAI codes, VerpackG) cannot coexist with the harmonised EU label once it takes effect.</p>' +
    '<p><strong>Recyclability (indicative):</strong> The recyclability verdict applies current RecyClass and CEFLEX design-for-recycling guidance: a structure that is ≥90% one material family and a single polymer type is treated as compatible with an existing recycling stream; multi-polymer plastic laminates (e.g. PET/EVOH/PE) and composites with >5% aluminium or paper are flagged as not separable in standard streams. This is a proxy — the binding PPWR criteria and A/B/C grades are pending.</p>' +
    '<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:0.9rem 1.1rem;margin-top:0.85rem;font-family:sans-serif;font-size:0.82rem;color:#7f1d1d;line-height:1.6">' +
      '<div style="font-weight:800;font-size:0.9rem;margin-bottom:0.3rem;display:flex;align-items:center;gap:0.4rem">⚠️ Disclaimer — read before use</div>' +
      'This tool produces <strong>indicative</strong> labelling and recyclability information for packaging-engineering and screening purposes only. It is <strong>not legal or regulatory compliance advice</strong>. The official PPWR Design-for-Recycling criteria and A/B/C recyclability grades are not yet finalised (delegated acts expected ~2028; grades apply from 2030), so recyclability here is based on current RecyClass / CEFLEX guidance as a proxy. Requirements vary by product category, market and pack type. Always verify final obligations — and the EU Declaration of Conformity — with a qualified packaging-compliance specialist or legal counsel before placing products on the market.' +
    '</div>' +
    '</div></div></div>';
}
