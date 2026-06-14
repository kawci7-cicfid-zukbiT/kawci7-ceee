// ====================================================================
// ppwr_label.js  —  PPWR / Decision 97/129/EC Label & Compliance Module
// Tab: State.tab === 'ppwr-label'
// Renders into #app-content
//
// v2 — CHANGELOG vs v1:
//  FIX  Composite codes corrected per Decision 97/129/EC Annex VII:
//       plastic+alu = 90 (was wrongly 84), paper+plastic = 81,
//       paper+alu = 82, paper+plastic+alu = 84. C/ prefix now uses the
//       dominant material abbreviation (e.g. C/LDPE 90).
//  FIX  actionRow 'warn' state now renders amber (was falling to red).
//  FIX  Missing ⚠️ icon in the regulatory banner.
//  NEW  Per-polymer recyclability logic with RecyClass barrier
//       tolerances (EVOH/PA/tie ≤5% in PE/PP films) → grades A–E.
//  NEW  Substances-of-Concern / PFAS screening (mandatory 12 Aug 2026):
//       fluoropolymer + PVDC detection, heavy-metals reminder.
//  NEW  Deadline countdown to 12 August 2026.
//  NEW  SVG marking preview + download (triangle / code / abbreviation).
//  NEW  Declaration of Conformity draft generator (Art. 39 / Annex VIII),
//       pre-filled with the computed composition, downloadable.
//  NEW  Full printable compliance report (opens in new tab → print/PDF).
// ====================================================================

// ------------------------------------------------------------------
// Material code mapping — Decision 97/129/EC (mono-material codes)
// ------------------------------------------------------------------
var PPWR_MATERIAL_CODES = {
  // Plastics
  'PET':        { code:'01', abbr:'PET',  family:'plastic', polymer:'PET'  },
  'PETG':       { code:'01', abbr:'PET',  family:'plastic', polymer:'PET'  },
  'HDPE':       { code:'02', abbr:'HDPE', family:'plastic', polymer:'PE'   },
  'PVC':        { code:'03', abbr:'PVC',  family:'plastic', polymer:'PVC'  },
  'PVDC':       { code:'03', abbr:'PVC',  family:'plastic', polymer:'PVDC' },
  'LDPE':       { code:'04', abbr:'LDPE', family:'plastic', polymer:'PE'   },
  'LLDPE':      { code:'04', abbr:'LDPE', family:'plastic', polymer:'PE'   },
  'PE':         { code:'04', abbr:'LDPE', family:'plastic', polymer:'PE'   },
  'PP':         { code:'05', abbr:'PP',   family:'plastic', polymer:'PP'   },
  'BOPP':       { code:'05', abbr:'PP',   family:'plastic', polymer:'PP'   },
  'PS':         { code:'06', abbr:'PS',   family:'plastic', polymer:'PS'   },
  'PA':         { code:'07', abbr:'O7',   family:'plastic', polymer:'PA'   },
  'EVOH':       { code:'07', abbr:'O7',   family:'plastic', polymer:'EVOH' },
  'PLA':        { code:'07', abbr:'O7',   family:'plastic', polymer:'PLA'  },
  'Other':      { code:'07', abbr:'O7',   family:'plastic', polymer:'Other'},
  // Metals
  'AL':         { code:'41', abbr:'ALU',  family:'metal',   polymer:null   },
  'Metal':      { code:'41', abbr:'ALU',  family:'metal',   polymer:null   },
  // Paper / board
  'Paper':      { code:'22', abbr:'PAP',  family:'paper',   polymer:null   },
};

// Composite codes — Decision 97/129/EC Annex VII
//  81 paper & fibreboard / plastic
//  82 paper & fibreboard / aluminium
//  84 paper & fibreboard / plastic / aluminium
//  90 plastic / aluminium
var PPWR_COMPOSITE = {
  PLASTIC_ALU:        { code:'90' },
  PAPER_PLASTIC:      { code:'81' },
  PAPER_ALU:          { code:'82' },
  PAPER_PLASTIC_ALU:  { code:'84' }
};

// Barrier polymers tolerated by RecyClass in PE/PP flexible streams
// when each remains ≤5% of total structure weight
var PPWR_TOLERATED_BARRIERS = { 'EVOH':true, 'PA':true };

// Substance-of-concern name patterns
var PPWR_SOC_PATTERNS = [
  { re:/PVDF|PTFE|FEP|PFA\b|FLUORO|PERFLUOR/i, type:'PFAS',
    label:'Fluoropolymer / possible PFAS',
    msg:'PFAS in food-contact packaging are restricted under PPWR Art. 5(5) from 12 August 2026 (limits on total fluorine / targeted PFAS). Verify the coating or polymer grade with the supplier and obtain a PFAS declaration.' },
  { re:/PVDC|VINYLIDENE/i, type:'HALOGEN',
    label:'Chlorinated polymer (PVDC)',
    msg:'PVDC is not a PFAS, but chlorinated barriers attract EPR eco-modulation penalties in several markets (e.g. CITEO malus in France) and disturb mechanical recycling. Consider EVOH or coated alternatives.' },
  { re:/\bPVC\b/i, type:'HALOGEN',
    label:'PVC layer',
    msg:'PVC in packaging faces EPR malus fees and sorting issues in most EU markets; several retailers ban it outright. Verify whether a substitution is feasible.' }
];

// ------------------------------------------------------------------
// Family / code resolution helpers
// ------------------------------------------------------------------
function _ppwrFamily(mat) {
  if (!mat) return 'plastic';
  var fam = mat.family || '';
  if (fam === 'AL' || fam.toUpperCase().indexOf('ALU') >= 0 ||
      fam.toUpperCase().indexOf('METAL') >= 0) return 'metal';
  if (fam === 'Paper' || fam.toUpperCase().indexOf('PAPER') >= 0 ||
      fam.toUpperCase().indexOf('KRAFT') >= 0) return 'paper';
  var name = (mat.name || '').toUpperCase();
  if (name.indexOf('ALU') >= 0 || name.indexOf(' AL ') >= 0 || name.indexOf('FOIL') >= 0) return 'metal';
  if (name.indexOf('PAPER') >= 0 || name.indexOf('KRAFT') >= 0) return 'paper';
  return 'plastic';
}

function _ppwrCode(mat) {
  if (!mat) return PPWR_MATERIAL_CODES['Other'];
  var fam = mat.family || '';
  if (PPWR_MATERIAL_CODES[fam]) return PPWR_MATERIAL_CODES[fam];
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
  if (typeof cfpDefaults === 'function') return cfpDefaults(mat).density;
  var fam = mat ? (mat.family || '') : '';
  return _PPWR_DENSITY[fam] || 1000;
}

// ------------------------------------------------------------------
// Core classification
// ------------------------------------------------------------------
function classifyLaminateForPPWR(layers, materials) {
  var weights    = { plastic:0, metal:0, paper:0 };
  var totalW     = 0;
  var layerData  = [];
  var polymerW   = {};   // weight per polymer stream (PE, PP, PET, EVOH, PA…)

  for (var i = 0; i < layers.length; i++) {
    var l   = layers[i];
    var mat = null;
    if (l.mid != null) {
      for (var j = 0; j < materials.length; j++) {
        if (String(materials[j].id) === String(l.mid)) { mat = materials[j]; break; }
      }
    }
    // Synthetic material for a bare-family layer (PPWR needs only family/density/thickness)
    if (!mat && (l.family || l.name)) {
      mat = { name: l.name || l.family, family: l.family || l.name,
              density: l.density || null, pfas: l.pfas || null };
    }
    if (!mat || !l.thick) continue;
    var density  = _ppwrDensity(mat);
    var w        = density * l.thick * 1e-6;      // kg/m²
    var family   = _ppwrFamily(mat);
    var code     = _ppwrCode(mat);
    weights[family] = (weights[family] || 0) + w;
    totalW += w;
    if (family === 'plastic' && code.polymer) {
      polymerW[code.polymer] = (polymerW[code.polymer] || 0) + w;
    }
    layerData.push({ name:mat.name, thick:l.thick, density:density, weight:w,
                     family:family, code:code,
                     pfas: (typeof getPfasStatus === 'function') ? getPfasStatus(mat) : null });
  }

  if (totalW === 0) return null;

  var pct = {
    plastic: (weights.plastic / totalW) * 100,
    metal:   (weights.metal   / totalW) * 100,
    paper:   (weights.paper   / totalW) * 100
  };

  // Per-polymer percentages of TOTAL structure weight
  var polymerPct = {};
  for (var pk in polymerW) polymerPct[pk] = (polymerW[pk] / totalW) * 100;

  var families = Object.keys(weights).filter(function(f){ return weights[f] > 0.0000001; });

  // Dominant layer (heaviest) overall and within plastics
  var byWeight = layerData.slice().sort(function(a,b){ return b.weight - a.weight; });
  var domLayer = byWeight[0];
  var domPlasticLayer = byWeight.filter(function(l){ return l.family === 'plastic'; })[0] || null;

  var base = {
    weights:weights, totalWeight:totalW, pct:pct,
    polymerPct:polymerPct, layerData:layerData
  };

  // ── Single family ────────────────────────────────────────────────
  if (families.length === 1) {
    var fam0 = families[0];
    var domInFam = byWeight.filter(function(l){ return l.family === fam0; })[0];
    var out = Object.assign({}, base, {
      code:           domInFam.code.code,
      abbr:           domInFam.code.abbr,
      isComposite:    false,
      dominantFamily: fam0,
      note:           null
    });
    // All-plastic but multi-polymer → still mono-family; if >1 polymer the
    // marking convention is the dominant polymer code, with a note.
    var nPoly = Object.keys(polymerPct).length;
    if (fam0 === 'plastic' && nPoly > 1) {
      out.code = domPlasticLayer.code.code;
      out.abbr = domPlasticLayer.code.abbr;
      out.note = 'Multi-polymer plastic structure (' + Object.keys(polymerPct).join(' + ') +
                 '). Marked with the dominant polymer code; verify recycling-stream ' +
                 'compatibility with the relevant PRO.';
    }
    return out;
  }

  // ── Composites — Decision 97/129/EC Annex VII ────────────────────
  var hasMetal = pct.metal > 5;
  var hasPaper = pct.paper > 5;
  var domAbbr  = domLayer.family === 'paper' ? 'PAP'
               : domLayer.family === 'metal' ? 'ALU'
               : (domPlasticLayer ? domPlasticLayer.code.abbr : 'O7');

  if (hasPaper && hasMetal) {
    return Object.assign({}, base, {
      code: PPWR_COMPOSITE.PAPER_PLASTIC_ALU.code, abbr:'C/' + domAbbr,
      isComposite:true, dominantFamily:domLayer.family,
      note:'Paper ' + pct.paper.toFixed(1) + '% + aluminium ' + pct.metal.toFixed(1) +
           '% by weight (>5% thresholds). Composite code 84 — paper/plastic/aluminium.'
    });
  }
  if (hasMetal) {
    return Object.assign({}, base, {
      code: PPWR_COMPOSITE.PLASTIC_ALU.code, abbr:'C/' + domAbbr,
      isComposite:true, dominantFamily:domLayer.family,
      note:'Aluminium content ' + pct.metal.toFixed(1) + '% by weight (threshold 5%). ' +
           'Composite code 90 — plastic/aluminium, marked C/ + dominant material.'
    });
  }
  if (hasPaper) {
    return Object.assign({}, base, {
      code: PPWR_COMPOSITE.PAPER_PLASTIC.code, abbr:'C/' + domAbbr,
      isComposite:true, dominantFamily:domLayer.family,
      note:'Paper/board content ' + pct.paper.toFixed(1) + '% by weight (threshold 5%). ' +
           'Composite code 81 — paper/plastic.'
    });
  }
  // Mixed families but all secondary <5% → treat as dominant-family mono
  return Object.assign({}, base, {
    code: domLayer.code.code, abbr: domLayer.code.abbr,
    isComposite:false, dominantFamily:domLayer.family,
    note:'Secondary material families are each below the 5% weight threshold — ' +
         'classified by the dominant material.'
  });
}

// ------------------------------------------------------------------
// RECYCLABILITY ASSESSMENT — per-polymer, RecyClass/CEFLEX based
// (indicative; official PPWR DfR criteria pending, grades apply 2030)
// ------------------------------------------------------------------
function assessRecyclability(cls) {
  if (!cls) return null;
  var pct = cls.pct || { plastic:0, metal:0, paper:0 };
  var polymerPct = cls.polymerPct || {};

  var polymers = Object.keys(polymerPct).sort(function(a,b){ return polymerPct[b]-polymerPct[a]; });
  var domPoly  = polymers[0] || null;
  var domPolyPct = domPoly ? polymerPct[domPoly] : 0;

  // Are all secondary polymers tolerated barriers ≤5% each?
  var secondariesOk = true, secondaryList = [];
  for (var i = 1; i < polymers.length; i++) {
    var p = polymers[i];
    secondaryList.push(p + ' ' + polymerPct[p].toFixed(1) + '%');
    if (!(PPWR_TOLERATED_BARRIERS[p] && polymerPct[p] <= 5)) secondariesOk = false;
  }

  var level, score, color, reasons = [];

  // 1. Metal composite → worst case
  if (pct.metal > 5) {
    level = 'not-recyclable'; score = 'D–E'; color = '#dc2626';
    reasons.push('Aluminium content ' + pct.metal.toFixed(1) + '% (>5%) — plastic-metal composite is not separable in standard streams.');
    reasons.push('A metallised film (AlOx/SiOx or thin metallisation, typically <2% weight) can often replace foil and keep the structure in a plastic stream.');
  }
  // 2. Paper-plastic composite
  else if (pct.paper > 5 && pct.plastic > 5) {
    level = 'limited'; score = 'C–D'; color = '#d97706';
    reasons.push('Paper-plastic composite — recyclable only where dedicated fibre-recovery streams exist (e.g. beverage-carton streams).');
  }
  // 3. Pure mono-polymer ≥95% → A
  else if (domPoly && domPolyPct >= 95 && polymers.length === 1) {
    level = 'recyclable'; score = 'A'; color = '#16a34a';
    reasons.push('Mono-material ' + domPoly + ' structure (' + domPolyPct.toFixed(0) + '%) — fully compatible with the existing ' + domPoly + ' recycling stream.');
  }
  // 4. Dominant ≥90% with tolerated barriers ≤5% each → B
  else if (domPoly && domPolyPct >= 90 && secondariesOk) {
    level = 'recyclable'; score = 'B'; color = '#16a34a';
    reasons.push('Predominantly ' + domPoly + ' (' + domPolyPct.toFixed(0) + '%) with tolerated barrier layers (' + secondaryList.join(', ') + ') — accepted in ' + domPoly + ' flexible streams per current RecyClass guidance (each barrier ≤5%).');
  }
  // 5. Dominant ≥80% with minor non-tolerated components → C
  else if (domPoly && domPolyPct >= 80) {
    level = 'limited'; score = 'C'; color = '#d97706';
    reasons.push('Predominantly ' + domPoly + ' (' + domPolyPct.toFixed(0) + '%) but secondary components (' + secondaryList.join(', ') + ') exceed barrier tolerances or are stream-incompatible.');
    reasons.push('Reducing the secondary layers below 5% each — or switching to a tolerated barrier (EVOH) — would likely raise the structure to grade B.');
  }
  // 6. Genuinely mixed plastics → D
  else if (polymers.length > 1) {
    level = 'not-recyclable'; score = 'D'; color = '#dc2626';
    reasons.push('Multi-material plastic (' + polymers.join(' + ') + ') — incompatible polymers cannot be separated in mechanical recycling.');
    reasons.push('Consider a mono-material redesign (e.g. all-PE with MDO-PE print web, or all-PP) to reach recyclability before the 2030 grading.');
  }
  // 7. Fallback
  else {
    level = 'limited'; score = 'C'; color = '#d97706';
    reasons.push('Verify stream compatibility with the local recycler.');
  }

  return {
    level: level, scoreHint: score, color: color, reasons: reasons,
    monoMaterial: level === 'recyclable',
    dominantPolymer: domPoly, dominantPolymerPct: domPolyPct
  };
}

// ------------------------------------------------------------------
// SUBSTANCES OF CONCERN screening (PPWR Art. 5 — applies 12 Aug 2026)
// Cross-analysis: name heuristic × admin-verified PFAS-free badge.
// Per layer, four possible PFAS states:
//   verified  — admin checked supplier documentation (badge in Firestore)
//   conflict  — name suggests fluoropolymer BUT badge says PFAS-free
//   flagged   — name suggests fluoropolymer, no verification
//   unverified— nothing known; supplier declaration still needed
// Halogen findings (PVDC/PVC) are independent of the PFAS badge.
// ------------------------------------------------------------------
function assessSubstances(cls) {
  if (!cls) return null;
  var rows = [], halogens = [], seenHal = {};
  var nVerified = 0, nConflict = 0, nFlagged = 0, nExpired = 0;

  for (var i = 0; i < cls.layerData.length; i++) {
    var ld = cls.layerData[i];
    var name = ld.name || '';

    // PFAS state — use attached status if pfas.js is loaded, else name-only fallback
    var pf = ld.pfas;
    if (!pf) {
      var fb = /PVDF|PTFE|FEP|\bPFA\b|FLUORO|PERFLUOR/i.test(name);
      pf = { verified:false, expired:false, flagged:fb, conflict:false, meta:null };
    }
    var state, msg;
    if (pf.conflict) {
      state = 'conflict'; nConflict++;
      msg = 'Layer name suggests a fluoropolymer but a PFAS-free badge is set — re-check the supplier documentation before relying on either.';
    } else if (pf.flagged) {
      state = 'flagged'; nFlagged++;
      msg = 'Fluoropolymer / possible PFAS. PFAS in food-contact packaging are restricted under PPWR Art. 5(5) from 12 August 2026 — obtain a PFAS declaration or substitute the layer.';
    } else if (pf.verified) {
      state = 'verified'; nVerified++;
      msg = 'PFAS-free verified by site admin against supplier documentation' +
            (pf.meta && pf.meta.verifiedAt ? ' on ' + pf.meta.verifiedAt : '') +
            (pf.meta && pf.meta.expiresAt  ? ' (valid until ' + pf.meta.expiresAt + ')' : '') + '.';
    } else if (pf.expired) {
      state = 'expired'; nExpired++;
      msg = 'PFAS-free declaration has expired — request an updated declaration from the supplier.';
    } else {
      state = 'unverified';
      msg = 'No verification on record. Request a PFAS declaration from the supplier (coatings and processing aids cannot be detected from the layer name).';
    }
    rows.push({ layer:name, state:state, msg:msg });

    // Halogen findings (independent of badge)
    for (var s = 0; s < PPWR_SOC_PATTERNS.length; s++) {
      var pat = PPWR_SOC_PATTERNS[s];
      if (pat.type !== 'HALOGEN') continue;
      if (pat.re.test(name) && !seenHal[name + pat.label]) {
        seenHal[name + pat.label] = true;
        halogens.push({ layer:name, label:pat.label, msg:pat.msg });
      }
    }
  }

  var total = rows.length;
  var summary;
  if (nConflict > 0)                 summary = 'conflict';
  else if (nFlagged > 0)             summary = 'flagged';
  else if (nVerified === total)      summary = 'verified';
  else                               summary = 'partial';

  return {
    rows: rows, halogens: halogens, summary: summary,
    nVerified: nVerified, total: total,
    clean: summary === 'verified',
    hasIssues: summary === 'flagged' || summary === 'conflict' || halogens.length > 0
  };
}

// ------------------------------------------------------------------
// National rules
// ------------------------------------------------------------------
var COUNTRY_RULES = {
  'FR': {
    flag:'', name:'France', system:'Triman / AGEC',
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
    flag:'', name:'Italy', system:'D.Lgs. 116/2020 / CONAI',
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
    flag:'', name:'Germany', system:'VerpackG / LUCID',
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
    flag:'', name:'Spain', system:'Ley 7/2022 / Ecoembes',
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
    flag:'', name:'All EU (from 12 August 2028)', system:'PPWR Harmonised',
    note:'PPWR (Regulation (EU) 2025/40) mandates a harmonised labelling system for all packaging placed on the EU single market. The Commission is expected to publish implementing acts specifying the final pictograms and format before the August 2028 transition date. National labels (Triman, CONAI codes, etc.) cannot coexist with the harmonised label after that date.',
    status:'pending',
    additionalItems:['Await Commission implementing act for final pictogram specifications', 'Until then, Decision 97/129/EC marking remains valid (Art. 8(2))']
  }
};

// ------------------------------------------------------------------
// CUSTOM STRUCTURE for PPWR analysis (independent from the Calculator)
// PPWR classification needs only family + thickness + density — barrier
// data and test conditions are irrelevant. This lets users analyse any
// structure even when materials lack compatible test conditions.
// ------------------------------------------------------------------
var PPWR_GENERIC_MATERIALS = [
  { key:'PET',   label:'PET' },
  { key:'HDPE',  label:'HDPE' },
  { key:'LDPE',  label:'LDPE' },
  { key:'LLDPE', label:'LLDPE' },
  { key:'PP',    label:'PP (cast)' },
  { key:'BOPP',  label:'BOPP' },
  { key:'PS',    label:'PS' },
  { key:'PA',    label:'PA (Nylon)' },
  { key:'EVOH',  label:'EVOH' },
  { key:'PLA',   label:'PLA' },
  { key:'PVC',   label:'PVC' },
  { key:'PVDC',  label:'PVDC' },
  { key:'AL',    label:'Aluminium foil' },
  { key:'Paper', label:'Paper / board' },
  { key:'Other', label:'Other plastic' }
];

function _ppwrGenericMat(key, idx) {
  var meta = null;
  for (var i = 0; i < PPWR_GENERIC_MATERIALS.length; i++)
    if (PPWR_GENERIC_MATERIALS[i].key === key) { meta = PPWR_GENERIC_MATERIALS[i]; break; }
  if (!meta) meta = { key:'Other', label:'Other plastic' };
  var dKey = meta.key === 'AL' ? 'ALU' : meta.key;
  return {
    id: 'gen_' + meta.key + '_' + idx,
    name: meta.label + ' (generic)',
    family: meta.key,
    density: _PPWR_DENSITY[dKey] || 1000
  };
}

function _ppwrGetSource() {
  return (typeof State !== 'undefined' && State.ppwrSource) ? State.ppwrSource : 'calc';
}
function _ppwrCustomLayers() {
  if (typeof State === 'undefined') return [];
  if (!State.ppwrCustomLayers) State.ppwrCustomLayers = [];
  return State.ppwrCustomLayers;
}
function _ppwrSaveState() {
  if (typeof DB !== 'undefined' && typeof DB.saveState === 'function') DB.saveState(State);
}
function ppwrSetSource(src) {
  if (typeof State === 'undefined') return;
  State.ppwrSource = src;
  _ppwrSaveState(); renderPPWRLabel();
}
function ppwrAddLayer() {
  _ppwrCustomLayers().push({ sel:'gen:LDPE', thick:50 });
  _ppwrSaveState(); renderPPWRLabel();
}
function ppwrRemoveLayer(i) {
  _ppwrCustomLayers().splice(i, 1);
  _ppwrSaveState(); renderPPWRLabel();
}
function ppwrLayerChanged(i) {
  var arr = _ppwrCustomLayers(); if (!arr[i]) return;
  var s = document.getElementById('ppwr-l-sel-' + i);
  var t = document.getElementById('ppwr-l-thick-' + i);
  if (s) arr[i].sel = s.value;
  if (t) arr[i].thick = parseFloat(t.value) || 0;
  _ppwrSaveState(); renderPPWRLabel();
}

// Resolve the active structure into (layers, materials) for classification
function _ppwrResolveStructure() {
  var src = _ppwrGetSource();
  if (src === 'calc') {
    return {
      layers:    (typeof State !== 'undefined' && State.layers) ? State.layers : [],
      materials: (typeof DB    !== 'undefined' && DB.materials) ? DB.materials : []
    };
  }
  var layers = [], mats = [];
  var custom = _ppwrCustomLayers();
  var dbMats = (typeof DB !== 'undefined' && DB.materials) ? DB.materials : [];
  for (var i = 0; i < custom.length; i++) {
    var e = custom[i];
    if (!e || !(e.thick > 0)) continue;
    var sel = String(e.sel || '');
    if (sel.indexOf('db:') === 0) {
      var id = sel.slice(3), m = null;
      for (var j = 0; j < dbMats.length; j++)
        if (String(dbMats[j].id) === id) { m = dbMats[j]; break; }
      if (m) { mats.push(m); layers.push({ mid:m.id, thick:e.thick }); }
    } else if (sel.indexOf('gen:') === 0) {
      var g = _ppwrGenericMat(sel.slice(4), i);
      mats.push(g); layers.push({ mid:g.id, thick:e.thick });
    }
  }
  return { layers:layers, materials:mats };
}

// ------------------------------------------------------------------
// Deadline countdown
// ------------------------------------------------------------------
function _ppwrCountdown() {
  var deadline = new Date('2026-08-12T00:00:00');
  var now = new Date();
  var days = Math.ceil((deadline - now) / 86400000);
  if (days > 0)  return { days:days, passed:false };
  return { days:0, passed:true };
}

// ------------------------------------------------------------------
// SVG marking (triangle + code + abbreviation)
// ------------------------------------------------------------------
function _ppwrMarkingSVG(code, abbr, sizePx) {
  var s = sizePx || 120;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="' + s + '" height="' + Math.round(s*140/120) + '">' +
    // Equilateral triangle outline (chasing-arrows simplified form)
    '<path d="M60 12 L108 96 L12 96 Z" fill="none" stroke="#0f172a" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M60 30 L92 86 L28 86 Z" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>' +
    // Code number centred in the triangle
    '<text x="60" y="78" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#0f172a">' + code + '</text>' +
    // Abbreviation below
    '<text x="60" y="128" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="1" fill="#0f172a">' + abbr + '</text>' +
    '</svg>';
}

// ------------------------------------------------------------------
// Download helper
// ------------------------------------------------------------------
function _ppwrDownload(filename, content, mime) {
  try {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  } catch (e) {
    alert('Download failed: ' + e.message);
  }
}

// Cache last classification for export actions
var _ppwrLast = null;

function ppwrDownloadLabel() {
  if (!_ppwrLast) return;
  var svg = _ppwrMarkingSVG(_ppwrLast.cls.code, _ppwrLast.cls.abbr, 240);
  _ppwrDownload('ppwr-marking-' + _ppwrLast.cls.abbr.replace(/[^A-Za-z0-9]/g,'') + '-' + _ppwrLast.cls.code + '.svg',
                svg, 'image/svg+xml');
}

// ------------------------------------------------------------------
// Declaration of Conformity draft (Art. 39 / Annex VIII)
// ------------------------------------------------------------------
function ppwrDownloadDoC() {
  if (!_ppwrLast) return;
  var cls = _ppwrLast.cls;
  var today = new Date().toISOString().slice(0,10);

  var compLines = '';
  for (var i = 0; i < cls.layerData.length; i++) {
    var ld = cls.layerData[i];
    compLines += '    - ' + ld.name + ' — ' + ld.thick + ' µm, ' +
                 (ld.weight*1000).toFixed(2) + ' g/m² (' +
                 ((ld.weight/cls.totalWeight)*100).toFixed(1) + '%), family: ' + ld.family + '\n';
  }

  var txt =
'EU DECLARATION OF CONFORMITY — DRAFT\n' +
'(Regulation (EU) 2025/40 — PPWR, Article 39 and Annex VIII)\n' +
'Generated: ' + today + ' — wvtr-otr-calculator.com PPWR module\n' +
'====================================================================\n\n' +
'1. PACKAGING TYPE (unique identification):\n' +
'   [INTERNAL REFERENCE / SKU OF THE PACKAGING TYPE]\n' +
'   Flexible laminate — structure:\n' + compLines + '\n' +
'2. NAME AND ADDRESS OF THE MANUFACTURER and, where applicable,\n' +
'   the authorised representative:\n' +
'   [COMPANY NAME]\n' +
'   [REGISTERED ADDRESS]\n\n' +
'3. This declaration of conformity is issued under the sole\n' +
'   responsibility of the manufacturer.\n\n' +
'4. OBJECT OF THE DECLARATION (packaging identification allowing\n' +
'   traceability):\n' +
'   Material classification (Decision 97/129/EC): ' + cls.abbr + ' — code ' + cls.code + '\n' +
'   Total grammage: ' + (cls.totalWeight*1000).toFixed(2) + ' g/m²\n' +
'   Composition by family: plastic ' + cls.pct.plastic.toFixed(1) + '% / metal ' +
    cls.pct.metal.toFixed(1) + '% / paper ' + cls.pct.paper.toFixed(1) + '%\n\n' +
'5. The object of the declaration described above is in conformity\n' +
'   with the relevant requirements of Regulation (EU) 2025/40:\n' +
'   [ ] Art. 5  — Substances of concern minimised; PFAS limits in\n' +
'                 food-contact packaging respected (supplier\n' +
'                 declarations attached)\n' +
'   [ ] Art. 5  — Heavy metals (Pb+Cd+Hg+Cr VI) < 100 ppm\n' +
'   [ ] Art. 6  — Recyclability / design-for-recycling assessment\n' +
'                 (indicative pending delegated acts)\n' +
'   [ ] Art. 10 — Packaging minimisation criteria (Annex IV)\n' +
'   [ ] Art. 11 — Marking per Decision 97/129/EC (Art. 8(2) transitional)\n\n' +
'6. REFERENCES to relevant harmonised standards, common\n' +
'   specifications or other technical specifications used:\n' +
'   [EN 13427 SERIES / OTHER STANDARDS USED]\n\n' +
'7. Where applicable: NOTIFIED BODY [N/A for self-assessment under\n' +
'   Module A, Annex VII]\n\n' +
'8. ADDITIONAL INFORMATION:\n' +
'   Supporting technical documentation (Annex VII) reference:\n' +
'   [TECH FILE REFERENCE]\n\n' +
'Signed for and on behalf of: [COMPANY NAME]\n' +
'Place and date of issue: [PLACE], [DATE]\n' +
'Name, function, signature: [NAME / FUNCTION]\n\n' +
'--------------------------------------------------------------------\n' +
'DRAFT ONLY — auto-generated skeleton for engineering screening.\n' +
'Items in [BRACKETS] must be completed; checkboxes require evidence\n' +
'in the technical documentation. Have the final DoC reviewed by a\n' +
'qualified packaging-compliance specialist before market placement.\n';

  _ppwrDownload('declaration-of-conformity-DRAFT-' + today + '.txt', txt, 'text/plain;charset=utf-8');
}

// ------------------------------------------------------------------
// Printable compliance report (opens new tab → user prints to PDF)
// ------------------------------------------------------------------
function ppwrPrintReport() {
  if (!_ppwrLast) return;
  var cls = _ppwrLast.cls, rec = _ppwrLast.rec, soc = _ppwrLast.soc;
  var today = new Date().toISOString().slice(0,10);
  var cd = _ppwrCountdown();

  var rows = '';
  for (var i = 0; i < cls.layerData.length; i++) {
    var ld = cls.layerData[i];
    rows += '<tr><td>' + ld.name + '</td><td style="text-align:right">' + ld.thick +
            '</td><td style="text-align:right">' + (ld.weight*1000).toFixed(2) +
            '</td><td style="text-align:right">' + ((ld.weight/cls.totalWeight)*100).toFixed(1) +
            '%</td><td>' + ld.family + '</td></tr>';
  }

  var recHtml = '';
  if (rec) {
    recHtml = '<h2>2. Recyclability (indicative — RecyClass/CEFLEX)</h2>' +
      '<p><strong>Estimated grade: ' + rec.scoreHint + '</strong> — ' +
      (rec.level === 'recyclable' ? 'likely recyclable' :
       rec.level === 'limited' ? 'limited recyclability' : 'not recyclable in current streams') + '</p><ul>';
    for (var r = 0; r < rec.reasons.length; r++) recHtml += '<li>' + rec.reasons[r] + '</li>';
    recHtml += '</ul>';
  }

  var socHtml = '<h2>3. Substances of concern (PPWR Art. 5 — from 12 Aug 2026)</h2>';
  if (soc) {
    socHtml += '<p><strong>PFAS verification: ' + soc.nVerified + ' of ' + soc.total + ' layers verified.</strong></p><ul>';
    for (var s = 0; s < soc.rows.length; s++)
      socHtml += '<li><strong>[' + soc.rows[s].state.toUpperCase() + ']</strong> ' + soc.rows[s].layer + ' — ' + soc.rows[s].msg + '</li>';
    for (var hh = 0; hh < soc.halogens.length; hh++)
      socHtml += '<li><strong>[HALOGEN]</strong> ' + soc.halogens[hh].layer + ' — ' + soc.halogens[hh].label + ': ' + soc.halogens[hh].msg + '</li>';
    socHtml += '</ul><p style="font-size:.85rem"><em>VERIFIED status is assigned only by the site administrator after reviewing supplier documentation. Heavy-metals limit (Pb+Cd+Hg+Cr VI &lt; 100 ppm) must be evidenced separately in the technical file.</em></p>';
  }

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>PPWR Compliance Screening — ' + today + '</title>' +
    '<style>body{font-family:Georgia,serif;max-width:760px;margin:2rem auto;color:#1e293b;line-height:1.6;padding:0 1rem}' +
    'h1{font-size:1.5rem;border-bottom:2px solid #1e293b;padding-bottom:.4rem}h2{font-size:1.1rem;margin-top:1.6rem}' +
    'table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{border:1px solid #cbd5e1;padding:.35rem .6rem;text-align:left}' +
    'th{background:#f1f5f9}.badge{display:inline-block;border:2px solid #1e293b;border-radius:8px;padding:.5rem 1rem;font-weight:800;font-size:1.3rem}' +
    '.disclaimer{border:2px solid #dc2626;border-radius:8px;padding:.8rem 1rem;font-size:.85rem;margin-top:2rem;font-family:Arial,sans-serif}' +
    '@media print{.noprint{display:none}}</style></head><body>' +
    '<p class="noprint" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:.6rem 1rem;font-family:Arial">Use your browser\'s <strong>Print</strong> (Ctrl/Cmd+P) to save this report as PDF.</p>' +
    '<h1>PPWR Compliance Screening Report</h1>' +
    '<p>Generated ' + today + ' · wvtr-otr-calculator.com · ' +
    (cd.passed ? 'PPWR general application date has passed (12 Aug 2026).' : '<strong>' + cd.days + ' days</strong> to the PPWR application date (12 Aug 2026).') + '</p>' +
    '<h2>1. Material classification — Decision 97/129/EC</h2>' +
    '<p><span class="badge">' + cls.abbr + ' · ' + cls.code + '</span></p>' +
    (cls.note ? '<p><em>' + cls.note + '</em></p>' : '') +
    '<table><thead><tr><th>Layer</th><th>µm</th><th>g/m²</th><th>%</th><th>Family</th></tr></thead><tbody>' + rows +
    '<tr><th colspan="2">TOTAL</th><th style="text-align:right">' + (cls.totalWeight*1000).toFixed(2) + '</th><th style="text-align:right">100%</th><th></th></tr></tbody></table>' +
    recHtml + socHtml +
    '<h2>4. Key obligations checklist (from 12 August 2026)</h2><ul>' +
    '<li>EU Declaration of Conformity + technical documentation (Art. 38–39, Annex VII–VIII)</li>' +
    '<li>Substances-of-concern minimisation; PFAS limits in food-contact packs (Art. 5)</li>' +
    '<li>Marking per Decision 97/129/EC (transitional, Art. 8(2)) + national schemes per market</li>' +
    '<li>Packaging minimisation criteria (Art. 10, Annex IV)</li>' +
    '<li>Prepare for recyclability grades and recycled-content targets (from 2030)</li></ul>' +
    '<div class="disclaimer"><strong>Disclaimer.</strong> Indicative screening for packaging-engineering purposes only — not legal or regulatory compliance advice. Official PPWR Design-for-Recycling criteria and A/B/C grades are pending (delegated acts ~2028; grades apply 2030). Verify final obligations with a qualified packaging-compliance specialist before placing products on the market.</div>' +
    '</body></html>';

  try {
    var blob = new Blob([html], { type:'text/html' });
    var url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(function(){ URL.revokeObjectURL(url); }, 30000);
  } catch (e) { alert('Could not open report: ' + e.message); }
}

// ------------------------------------------------------------------
// Family options for the PPWR structure builder (map cleanly to codes)
// ------------------------------------------------------------------
var PPWR_FAMILY_OPTIONS = [
  { key:'PET',   label:'PET / polyester' },
  { key:'PE',    label:'PE (LDPE/LLDPE/HDPE)' },
  { key:'PP',    label:'PP / BOPP / CPP' },
  { key:'EVOH',  label:'EVOH (barrier)' },
  { key:'PA',    label:'PA / nylon (barrier)' },
  { key:'PVDC',  label:'PVDC (barrier)' },
  { key:'PVC',   label:'PVC' },
  { key:'PS',    label:'PS' },
  { key:'PLA',   label:'PLA (compostable)' },
  { key:'AL',    label:'Aluminium foil' },
  { key:'Paper', label:'Paper / board' },
  { key:'Other', label:'Other plastic' }
];

// ------------------------------------------------------------------
// Structure builder UI — two modes:
//   'calculator' → load the structure from the Calculator tab
//   'manual'     → Calculator-style add row (material + thickness + Add)
// ------------------------------------------------------------------
function _ppwrStructureBuilder(layers, allMats) {
  var mode = (typeof State !== 'undefined' && State.ppwrMode) ? State.ppwrMode : 'manual';
  var calcLayers = (typeof State !== 'undefined' && State.layers)
    ? State.layers.filter(function(l){ return l.mid != null && l.thick; }) : [];

  var h = '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:1.1rem 1.4rem;margin-bottom:1.25rem">';
  h += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.7rem">Packaging Structure</div>';

  // ── Mode selector (segmented control) ─────────────────────────────
  function modeBtn(key, label, onclick) {
    var on = mode === key;
    return '<button onclick="' + onclick + '" style="' +
      'flex:1;font-size:0.78rem;font-weight:700;padding:0.5rem 0.6rem;border-radius:8px;cursor:pointer;border:1.5px solid;transition:all 0.15s;' +
      (on ? 'background:var(--primary,#2563eb);color:#fff;border-color:var(--primary,#2563eb)'
          : 'background:#fff;color:var(--text-light);border-color:var(--border)') + '">' + label + '</button>';
  }
  h += '<div style="display:flex;gap:0.5rem;margin-bottom:0.9rem">';
  // "Load from Calculator" loads immediately (no second click needed)
  h += modeBtn('calculator', ' From Calculator', 'ppwrLoadFromCalculator()');
  h += modeBtn('manual', ' Write structure', "ppwrSetMode('manual')");
  h += '</div>';

  // ── Current layers list (shared by both modes) ────────────────────
  if (layers.length > 0) {
    h += '<div style="display:flex;flex-direction:column;gap:0.35rem;margin-bottom:0.8rem">';
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i];
      var label = l.name || l.family || '—';
      if (l.mid != null && allMats) {
        for (var j = 0; j < allMats.length; j++) {
          if (String(allMats[j].id) === String(l.mid)) { label = allMats[j].name; break; }
        }
      }
      h += '<div style="display:flex;align-items:center;gap:0.6rem;background:#f8fafc;border:1px solid var(--border);border-radius:7px;padding:0.4rem 0.7rem">';
      h += '<span style="font-size:0.66rem;font-weight:700;color:var(--text-light);font-family:monospace;width:18px">' + (i+1) + '</span>';
      h += '<span style="flex:1;font-size:0.82rem;font-weight:500;color:var(--text)">' + label + '</span>';
      h += '<span style="font-size:0.78rem;color:var(--text-light);font-variant-numeric:tabular-nums">' + l.thick + ' µm</span>';
      h += '<button onclick="ppwrRemoveLayer(' + i + ')" style="border:none;background:none;color:var(--danger,#dc2626);cursor:pointer;font-size:1rem;line-height:1;padding:0 0.2rem" title="Remove layer">×</button>';
      h += '</div>';
    }
    h += '</div>';
    h += '<button onclick="ppwrClearLayers()" style="font-size:0.7rem;font-weight:600;color:var(--danger,#dc2626);background:none;border:none;cursor:pointer;padding:0;margin-bottom:0.7rem">Clear all layers</button>';
  }

  // ── Mode-specific input area ───────────────────────────────────────
  if (mode === 'calculator') {
    if (calcLayers.length > 0) {
      h += '<div style="background:var(--primary-light,#eff6ff);border:1px dashed var(--primary,#2563eb);border-radius:9px;padding:0.8rem 0.9rem">';
      h += '<div style="font-size:0.78rem;color:var(--text);line-height:1.5;margin-bottom:0.6rem">Loaded from the Calculator (' + calcLayers.length + ' layers). Barrier values and test conditions are ignored — only family, density and thickness are used. If you change the structure in the Calculator, reload it here.</div>';
      h += '<button onclick="ppwrLoadFromCalculator()" style="font-size:0.76rem;font-weight:700;padding:0.4rem 0.85rem;border-radius:8px;border:1.5px solid var(--border);background:#fff;color:var(--text);cursor:pointer">↻ Reload from Calculator</button>';
      h += '</div>';
    } else {
      h += '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:9px;padding:0.8rem 0.9rem;font-size:0.8rem;color:#92400e;line-height:1.5">The Calculator has no layer structure yet. Build one in the <strong>Calculator</strong> tab, or switch to <strong>Write structure</strong> to enter the layers here directly.</div>';
    }
  } else {
    // Manual — Calculator-style add row: material + thickness + Add layer
    // One material dropdown with two groups: generic families + DB materials.
    var famOpts = PPWR_FAMILY_OPTIONS.map(function(f){
      return '<option value="fam:' + f.key + '">' + f.label + '</option>';
    }).join('');
    var matOpts = '';
    if (allMats && allMats.length) {
      var sorted = allMats.slice().sort(function(a,b){ return (a.name||'').localeCompare(b.name||''); });
      for (var m = 0; m < sorted.length; m++) {
        matOpts += '<option value="mat:' + String(sorted[m].id) + '">' + (sorted[m].name || '?') + (sorted[m].family ? ' [' + sorted[m].family + ']' : '') + '</option>';
      }
    }
    h += '<div style="background:var(--primary-light,#eff6ff);border:1px dashed var(--primary,#2563eb);border-radius:9px;padding:0.7rem 0.85rem">';
    h += '<div style="font-size:0.68rem;font-weight:700;color:var(--primary,#2563eb);margin-bottom:0.5rem">+ Add layer</div>';
    h += '<div style="display:grid;grid-template-columns:2.4fr 0.9fr auto;gap:0.5rem;align-items:end">';
    // Material select (with generic families + database materials)
    h += '<div><label style="font-size:0.64rem;color:var(--text-light);display:block;margin-bottom:2px">Material</label>';
    h += '<select id="ppwr-new-mat" class="form-input" style="font-size:0.78rem;padding:0.35rem 0.5rem;width:100%">';
    h += '<optgroup label="Generic families">' + famOpts + '</optgroup>';
    if (matOpts) h += '<optgroup label="Database materials">' + matOpts + '</optgroup>';
    h += '</select></div>';
    // Thickness
    h += '<div><label style="font-size:0.64rem;color:var(--text-light);display:block;margin-bottom:2px">Thickness (µm)</label>';
    h += '<input id="ppwr-new-thick" type="number" step="any" min="0" class="form-input" placeholder="12" style="font-size:0.78rem;padding:0.35rem 0.5rem;width:100%"></div>';
    // Add button
    h += '<button onclick="ppwrAddLayer()" style="font-size:0.78rem;font-weight:700;padding:0.4rem 0.9rem;border-radius:7px;border:1.5px solid var(--primary,#2563eb);background:var(--primary,#2563eb);color:#fff;cursor:pointer;white-space:nowrap">Add layer</button>';
    h += '</div>';
    h += '<div style="font-size:0.64rem;color:var(--text-light);margin-top:0.4rem">Pick a database material to reuse its exact name and density, or a generic family for materials you don\'t have stored. No barrier values or test conditions are needed for PPWR.</div>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

// ------------------------------------------------------------------
// Structure builder handlers
// ------------------------------------------------------------------
function _ppwrSaveLayers() {
  if (typeof DB !== 'undefined' && typeof DB.saveState === 'function' && typeof State !== 'undefined') {
    DB.saveState(State);
  }
}

function ppwrSetMode(mode) {
  if (typeof State === 'undefined') return;
  State.ppwrMode = mode;
  _ppwrSaveLayers();
  renderPPWRLabel();
}

function ppwrAddLayer() {
  if (typeof State === 'undefined') return;
  if (!State.ppwrLayers) State.ppwrLayers = [];
  var matSel  = document.getElementById('ppwr-new-mat');
  var thickEl = document.getElementById('ppwr-new-thick');
  var thick = parseFloat(thickEl ? thickEl.value : '');
  if (isNaN(thick) || thick <= 0) { alert('Enter a thickness in µm (greater than 0).'); return; }

  var val = matSel ? matSel.value : '';
  if (val.indexOf('mat:') === 0) {
    State.ppwrLayers.push({ mid: val.slice(4), thick: thick });          // database material
  } else {
    var fam = val.indexOf('fam:') === 0 ? val.slice(4) : 'Other';        // generic family
    var labelMap = {}; PPWR_FAMILY_OPTIONS.forEach(function(f){ labelMap[f.key] = f.label; });
    State.ppwrLayers.push({ mid: null, family: fam, name: (labelMap[fam] || fam), thick: thick });
  }
  _ppwrSaveLayers();
  renderPPWRLabel();
}

function ppwrRemoveLayer(idx) {
  if (typeof State === 'undefined' || !State.ppwrLayers) return;
  State.ppwrLayers.splice(idx, 1);
  _ppwrSaveLayers();
  renderPPWRLabel();
}

function ppwrClearLayers() {
  if (typeof State === 'undefined') return;
  State.ppwrLayers = [];
  _ppwrSaveLayers();
  renderPPWRLabel();
}

function ppwrLoadFromCalculator() {
  if (typeof State === 'undefined') return;
  State.ppwrMode = 'calculator';
  var copied = (State.layers || [])
    .filter(function(l){ return l.mid != null && l.thick; })
    .map(function(l){ return { mid: l.mid, thick: l.thick }; });
  if (copied.length > 0) {
    State.ppwrLayers = copied;
  }
  // If the Calculator is empty, just switch to calculator mode and show the
  // guidance panel — don't block with an alert.
  _ppwrSaveLayers();
  renderPPWRLabel();
}

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------
function renderPPWRLabel() {
  var c = document.getElementById('app-content'); if (!c) return;

  // PPWR uses its OWN layer list (no barrier values / test conditions needed).
  if (typeof State !== 'undefined' && !State.ppwrLayers) State.ppwrLayers = [];
  var layers  = (typeof State !== 'undefined' && State.ppwrLayers) ? State.ppwrLayers : [];
  var allMats = (typeof DB    !== 'undefined' && DB.materials)    ? DB.materials   : [];
  var selMkts = (typeof State !== 'undefined' && State.ppwrMkts) ? State.ppwrMkts : ['FR','IT','DE','ES','EU2028'];

  var cls = layers.length > 0 ? classifyLaminateForPPWR(layers, allMats) : null;
  var rec = cls ? assessRecyclability(cls) : null;
  var soc = cls ? assessSubstances(cls) : null;
  _ppwrLast = cls ? { cls:cls, rec:rec, soc:soc } : null;

  var cd = _ppwrCountdown();

  var html = '<div style="max-width:960px;margin:0 auto;padding-bottom:2rem">';

  // ── Page header ──────────────────────────────────────────────────
  html += '<div style="margin-bottom:1.5rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Regulatory · Packaging</div>';
  html += '<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem;letter-spacing:-0.01em">PPWR Label & Compliance Check</h1>';
  html += '<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:620px">Material classification per Decision 97/129/EC, indicative recyclability grade, substances-of-concern screening and per-market labelling requirements — computed from the layer structure defined in the Calculator.</p>';
  html += '</div>';

  // ── Regulatory status banner + countdown ─────────────────────────
  html += '<div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:0.9rem 1.1rem;margin-bottom:1.25rem;display:flex;gap:0.75rem;align-items:flex-start">';
  html += '<div style="font-size:1.1rem;flex-shrink:0;margin-top:0.05rem">⚠️</div>';
  html += '<div style="font-size:0.8rem;color:#713f12;line-height:1.55;flex:1">';
  html += '<strong>PPWR — Regulation (EU) 2025/40</strong> entered into force 11 Feb 2025 and <strong>applies from 12 August 2026</strong>, repealing Directive 94/62/EC. From that date every packaging placed on the EU market needs an <strong>EU Declaration of Conformity</strong> and technical documentation (Art. 38–39), must minimise substances of concern (incl. PFAS limits in food contact), and meet packaging-minimisation rules. ';
  html += 'Material marking still follows <strong>Decision 97/129/EC</strong> codes — kept in force under Art. 8(2) until ~30 months after the Commission\'s implementing act (expected ~2028). Recyclability grades (A/B/C) and recycled-content targets phase in from 2030.';
  html += '</div>';
  // Countdown chip
  if (!cd.passed) {
    html += '<div style="flex-shrink:0;text-align:center;background:#fff;border:1.5px solid #fde047;border-radius:10px;padding:0.5rem 0.9rem">';
    html += '<div style="font-size:1.4rem;font-weight:900;color:#b45309;line-height:1">' + cd.days + '</div>';
    html += '<div style="font-size:0.6rem;font-weight:700;letter-spacing:0.08em;color:#92400e;text-transform:uppercase;margin-top:0.15rem">days to<br>12 Aug 2026</div>';
    html += '</div>';
  } else {
    html += '<div style="flex-shrink:0;background:#fee2e2;border:1.5px solid #fca5a5;border-radius:10px;padding:0.5rem 0.9rem;font-size:0.7rem;font-weight:800;color:#991b1b;text-align:center">PPWR<br>IN FORCE</div>';
  }
  html += '</div>';

  // ── Structure builder (PPWR-native — no test conditions needed) ───
  html += _ppwrStructureBuilder(layers, allMats);

  // ── No layers yet → builder + methodology only ────────────────────
  if (!cls) {
    html += '<div class="card"><div class="alert alert-info" style="margin:0">Add at least one layer above to get the PPWR classification. You only need the material family and thickness — no barrier values or test conditions.</div></div>';
    html += _ppwrMethodology();
    html += '</div>'; c.innerHTML = html; return;
  }

  // ── Classification result ─────────────────────────────────────────
  html += '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:1.25rem 1.4rem;margin-bottom:1.25rem">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light)">Classification Result — Decision 97/129/EC</div>';
  // Export buttons
  html += '<div style="display:flex;gap:0.45rem;flex-wrap:wrap">';
  html += '<button onclick="ppwrDownloadLabel()" style="font-size:0.72rem;font-weight:700;padding:0.35rem 0.75rem;border-radius:7px;border:1.5px solid var(--border);background:#fff;color:var(--text);cursor:pointer">⬇ Marking SVG</button>';
  html += '<button onclick="ppwrDownloadDoC()" style="font-size:0.72rem;font-weight:700;padding:0.35rem 0.75rem;border-radius:7px;border:1.5px solid var(--border);background:#fff;color:var(--text);cursor:pointer">⬇ DoC draft</button>';
  html += '<button onclick="ppwrPrintReport()" style="font-size:0.72rem;font-weight:700;padding:0.35rem 0.75rem;border-radius:7px;border:1.5px solid var(--primary);background:var(--primary);color:#fff;cursor:pointer">🖨 Full report</button>';
  html += '</div></div>';

  // Big code badge + marking preview + breakdown
  html += '<div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap">';

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
  // Marking preview
  html += '<div style="margin-top:0.8rem;background:#fff;border:1px dashed var(--border);border-radius:10px;padding:0.7rem;display:inline-block">';
  html += _ppwrMarkingSVG(cls.code, cls.abbr, 88);
  html += '<div style="font-size:0.62rem;color:var(--text-light);margin-top:0.3rem;font-weight:600">On-pack marking preview</div>';
  html += '</div>';
  html += '</div>';

  // Weight breakdown
  html += '<div style="flex:1;min-width:240px">';
  html += '<div style="font-size:0.78rem;font-weight:700;color:var(--text);margin-bottom:0.6rem">Material composition by weight (kg/m²)</div>';

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

  // Per-polymer mini-bars (new — drives the recyclability story)
  var polyKeys = Object.keys(cls.polymerPct || {}).sort(function(a,b){ return cls.polymerPct[b]-cls.polymerPct[a]; });
  if (polyKeys.length > 1) {
    html += '<div style="font-size:0.72rem;font-weight:700;color:var(--text);margin:0.7rem 0 0.35rem">Polymer streams</div>';
    for (var pi = 0; pi < polyKeys.length; pi++) {
      var pk2 = polyKeys[pi], pv = cls.polymerPct[pk2];
      html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">';
      html += '<span style="font-size:0.68rem;width:46px;color:var(--text-light);flex-shrink:0">' + pk2 + '</span>';
      html += '<div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pv.toFixed(1) + '%;background:#64748b;border-radius:3px"></div></div>';
      html += '<span style="font-size:0.68rem;font-weight:700;color:#475569;width:38px;text-align:right;flex-shrink:0">' + pv.toFixed(1) + '%</span>';
      html += '</div>';
    }
  }

  if (cls.note) {
    html += '<div style="margin-top:0.75rem;background:#fef9ec;border:1px solid #fde68a;border-radius:6px;padding:0.55rem 0.75rem;font-size:0.75rem;color:#92400e;line-height:1.5"> ' + cls.note + '</div>';
  }
  html += '</div>'; // weight breakdown
  html += '</div>'; // flex row
  html += '</div>'; // classification card

  // ── Recyclability assessment (indicative) ─────────────────────────
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

  // ── Substances of concern — cross-analysis per layer ──────────────
  if (soc) {
    var socCfg = {
      verified: { bg:'#f0fdf4', bord:'#86efac', title:'PFAS-free — all layers verified',           icon:'' },
      partial:  { bg:'#fffbeb', bord:'#fcd34d', title:'PFAS status incomplete — verification needed', icon:'⚠️' },
      flagged:  { bg:'#fef2f2', bord:'#fca5a5', title:'Possible PFAS detected',                     icon:'❗' },
      conflict: { bg:'#fef2f2', bord:'#fca5a5', title:'PFAS data conflict — re-check documentation', icon:'❗' }
    };
    var sc = socCfg[soc.summary] || socCfg.partial;
    html += '<div style="background:' + sc.bg + ';border:1.5px solid ' + sc.bord + ';border-radius:12px;padding:1.1rem 1.4rem;margin-bottom:1.25rem">';
    html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.6rem">Substances of Concern — PPWR Art. 5 (applies 12 Aug 2026)</div>';
    html += '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem">';
    html += '<span style="font-size:1.2rem">' + sc.icon + '</span>';
    html += '<span style="font-size:0.95rem;font-weight:800;color:var(--text)">' + sc.title + '</span>';
    html += '<span style="margin-left:auto;font-size:0.7rem;font-weight:700;color:var(--text-light);background:#fff;border:1px solid var(--border);border-radius:20px;padding:0.2rem 0.7rem">' + soc.nVerified + '/' + soc.total + ' layers verified</span>';
    html += '</div>';

    // Per-layer status rows
    var stChip = {
      verified:   { txt:'VERIFIED',   bg:'#dcfce7', clr:'#166534' },
      conflict:   { txt:'CONFLICT',   bg:'#fee2e2', clr:'#991b1b' },
      flagged:    { txt:'FLAGGED',    bg:'#fee2e2', clr:'#991b1b' },
      expired:    { txt:'EXPIRED',    bg:'#fef3c7', clr:'#92400e' },
      unverified: { txt:'UNVERIFIED', bg:'#f1f5f9', clr:'#475569' }
    };
    for (var sr = 0; sr < soc.rows.length; sr++) {
      var row = soc.rows[sr];
      var ch  = stChip[row.state] || stChip.unverified;
      html += '<div style="display:flex;gap:0.6rem;align-items:flex-start;margin-bottom:0.45rem">';
      html += '<span style="flex-shrink:0;font-size:0.6rem;font-weight:800;letter-spacing:0.05em;background:' + ch.bg + ';color:' + ch.clr + ';border-radius:5px;padding:2px 7px;margin-top:0.15rem;white-space:nowrap">' + ch.txt + '</span>';
      html += '<div style="font-size:0.78rem;line-height:1.5;color:var(--text)"><strong>' + row.layer + '</strong> — <span style="color:var(--text-light)">' + row.msg + '</span></div>';
      html += '</div>';
    }

    // Halogen findings (independent of PFAS badge)
    if (soc.halogens.length > 0) {
      html += '<div style="border-top:1px solid ' + sc.bord + ';margin-top:0.7rem;padding-top:0.7rem">';
      for (var hf = 0; hf < soc.halogens.length; hf++) {
        var h = soc.halogens[hf];
        html += '<div style="font-size:0.78rem;color:#92400e;line-height:1.5;margin-bottom:0.35rem">⚠️ <strong>' + h.label + '</strong> (layer: ' + h.layer + ') — ' + h.msg + '</div>';
      }
      html += '</div>';
    }

    html += '<div style="font-size:0.66rem;color:var(--text-light);margin-top:0.7rem;line-height:1.5;font-style:italic">The <strong>VERIFIED</strong> badge is assigned only by the site administrator after reviewing supplier documentation and certifications; it cannot be self-assigned. Name-based flags are a heuristic — coatings, inks, adhesives and processing aids cannot be detected from layer names. Heavy metals (Pb+Cd+Hg+Cr VI &lt; 100 ppm) must be evidenced separately in the technical file.</div>';
    html += '</div>';
  }

  // ── Compliance action checklist ───────────────────────────────────
  html += '<div style="background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:1.1rem 1.4rem;margin-bottom:1.25rem">';
  html += '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.7rem">What this means for you — PPWR action checklist</div>';
  html += '<div style="display:flex;flex-direction:column;gap:0.55rem">';

  function actionRow(state, title, body) {
    // FIX: 'warn' now maps to amber; only 'fail' is red
    var clr = state === 'ok'     ? '#16a34a'
            : state === 'action' ? '#d97706'
            : state === 'warn'   ? '#d97706'
            : '#dc2626';
    var ic  = state === 'ok' ? '✓' : state === 'fail' ? '✗' : '!';
    return '<div style="display:flex;gap:0.6rem;align-items:flex-start">' +
      '<span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:' + clr + ';color:#fff;font-size:0.7rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:0.1rem">' + ic + '</span>' +
      '<div style="font-size:0.82rem;line-height:1.5;color:var(--text)"><strong>' + title + '</strong><br><span style="color:var(--text-light)">' + body + '</span></div></div>';
  }

  // 1. Declaration of Conformity
  html += actionRow('action', 'EU Declaration of Conformity (mandatory from 12 Aug 2026)',
    'Draw up a DoC and technical documentation for this packaging per Art. 38–39 and Annex VII–VIII. Use the <strong>DoC draft</strong> button above as a starting skeleton. Without it the pack cannot be legally placed on the EU market.');
  // 2. Substances of concern
  if (soc && (soc.summary === 'flagged' || soc.summary === 'conflict'))
    html += actionRow('fail', 'Substances of concern: flags raised',
      'The cross-analysis above raised PFAS flags or conflicts. Obtain supplier declarations and resolve before 12 Aug 2026.');
  else if (soc && soc.summary === 'verified')
    html += actionRow('ok', 'Substances of concern: all layers PFAS-verified',
      'Every layer carries an admin-verified PFAS-free badge. Keep the supplier declarations in the technical file and watch the expiry dates.');
  else
    html += actionRow('action', 'Substances of concern: verification incomplete',
      'Some layers have no PFAS verification on record. Request supplier declarations; heavy-metals evidence (<100 ppm Pb+Cd+Hg+Cr VI) must also be in the technical file.');
  // 3. Material identification
  html += actionRow('ok', 'Material identification: ' + cls.abbr + ' (code ' + cls.code + ')',
    'Mark the pack with the Decision 97/129/EC code shown above — download the <strong>marking SVG</strong> for the artwork. Apply the national sorting rules for each target market below.');
  // 4. Recyclability
  if (rec) {
    if (rec.level === 'recyclable')
      html += actionRow('ok', 'Recyclability: on track (est. grade ' + rec.scoreHint + ')',
        'Structure compatible with existing recycling streams. Keep evidence for the recyclability assessment that becomes mandatory from 2030.');
    else
      html += actionRow('warn', 'Recyclability: at risk for 2030 (est. grade ' + rec.scoreHint + ')',
        'This structure is unlikely to be recyclable in current streams. From 1 Jan 2030 all packaging must meet recyclability grades — consider a mono-material redesign now to avoid a forced reformulation later.');
  }
  // 5. Recycled content
  html += actionRow('action', 'Recycled content (targets from 2030)',
    'Recorded recycled-content % is not yet required but will be from 2030. Start collecting this data from your film suppliers now.');

  html += '</div></div>';

  html += '<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:0.25rem">Target Markets</div>';
  html += '<div style="font-size:0.75rem;color:var(--text-light);margin-bottom:0.85rem">Select the markets where this packaging will be placed — the table below shows the labelling requirements for each.</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">';
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
  html += '</div>';

  // ── Market requirements table ─────────────────────────────────────
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

  var shown = 0;
  for (var mki = 0; mki < allMkts.length; mki++) {
    var mk2   = allMkts[mki];
    var rule2 = COUNTRY_RULES[mk2];
    var isOn2 = selMkts.indexOf(mk2) >= 0;
    if (!isOn2) continue;
    shown++;
    var sort2 = rule2.sorting ? (rule2.sorting[cls.dominantFamily] || rule2.sorting['composite'] || '—') : '—';

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
  if (shown === 0) {
    html += '<tr><td colspan="5" style="padding:0.9rem;text-align:center;color:var(--text-light);font-size:0.8rem">No markets selected — pick at least one above to see its requirements.</td></tr>';
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
  renderPPWRLabel();
}

// ------------------------------------------------------------------
// Methodology / disclaimer
// ------------------------------------------------------------------
function _ppwrMethodology() {
  return '<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary);background:var(--card)">' +
    '<div style="padding:1.2rem 1.5rem">' +
 
    '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.15rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.45rem;margin:0 0 1rem">How this tool works</h2>' +
 
    '<div style="font-size:0.9rem;line-height:1.75;color:#334155;font-family:Georgia,\'Times New Roman\',serif">' +
 
    '<p style="margin:0 0 1.1rem">This page explains, in plain terms, how each result is reached — so you can trust the numbers, check them, and explain them to someone else.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">1. What the material code means</h3>' +
    '<p style="margin:0 0 1rem">Every piece of packaging sold in the EU carries a material code, defined by an old but still-valid rule called Decision 97/129/EC. The code simply tells recyclers and consumers what the packaging is made of. Plastics are numbered from 01 to 07, aluminium is 41, paper is 22. If a pack is made of one single material, it takes that material\'s code. If it combines two or more different families — say plastic bonded to a layer of aluminium foil — it becomes a <em>composite</em>, written with a \u201CC/\u201D in front of the main material, for example C/LDPE.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">2. How the tool decides the code</h3>' +
    '<p style="margin:0 0 1rem">Most laminates contain more than one material, so the tool has to decide which ones really count. It does this by weight. A material family is counted only if it makes up more than 5% of the total weight; anything smaller is treated as a minor component and set aside. If more than one family passes that 5% line, the pack is a composite, and the code follows fixed rules: plastic + aluminium gives <strong>90</strong>, paper + plastic gives <strong>81</strong>, paper + aluminium <strong>82</strong>, and paper + plastic + aluminium <strong>84</strong>.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">3. How the weights are found</h3>' +
    '<p style="margin:0 0 1rem">The weight of each layer comes from one simple rule of physics: weight equals density times thickness. You provide the thickness; the density comes from the material\'s stored value, or from a standard figure for its family when none is saved. The shares are then worked out for one square metre of packaging (kg/m\u00B2), which is the fair way to compare layers of different thickness.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">4. How recyclability is judged</h3>' +
    '<p style="margin:0 0 1rem">A pack is easy to recycle when it is made of as few, and as compatible, materials as possible — because a recycling plant melts one type of plastic at a time and cannot separate materials that are fused together. Following current RecyClass and CEFLEX guidance, the tool gives a rough grade: a pack that is at least 95% one single polymer is treated as easily recyclable (grade A); one that is at least 90% a single polymer, with only thin barrier layers such as EVOH or PA below 5% each, is still recyclable (grade B); a pack with more than 5% aluminium, or a real mix of plastics that do not belong to the same stream, cannot be separated and is flagged as not recyclable. This is a guide to help you redesign, not an official score — the binding PPWR grades are not final yet.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">5. Substances of concern (including PFAS)</h3>' +
    '<p style="margin:0 0 1rem">Some substances are restricted or carry penalties. The tool reads the names of your layers and warns you when it spots fluoropolymers (a possible sign of PFAS) or chlorinated plastics such as PVC and PVDC. It is important to understand the limit of this check: it can only read names. It cannot see a coating, ink, adhesive or processing aid that is not written into the layer name. To be certain a material is free of these substances, you still need a written declaration from the supplier — and that document is exactly what earns the verified \u201CPFAS-free\u201D badge on this tool.</p>' +
 
    '<h3 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1rem;color:var(--text);margin:1.2rem 0 0.4rem">6. The dates that matter</h3>' +
    '<p style="margin:0 0 1rem">PPWR is Regulation (EU) 2025/40. It came into force on 11 February 2025 and applies from <strong>12 August 2026</strong>, replacing the old Packaging Directive 94/62/EC. From that date, packaging needs an EU Declaration of Conformity and must respect the rules on substances and on using no more material than necessary. The current material codes stay valid until the EU publishes its new single labelling system, expected around 2028. The recyclability grades and the targets for recycled content begin to apply from 2030.</p>' +
 
    '<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:0.9rem 1.1rem;margin-top:1.1rem;font-family:sans-serif;font-size:0.82rem;color:#7f1d1d;line-height:1.6">' +
      '<div style="font-weight:800;font-size:0.9rem;margin-bottom:0.3rem">⚠️ Disclaimer — read before use</div>' +
      'This tool produces <strong>indicative</strong> labelling, recyclability and substances screening for packaging-engineering purposes only. It is <strong>not legal or regulatory compliance advice</strong>. The official PPWR Design-for-Recycling criteria and A/B/C recyclability grades are not yet finalised (delegated acts expected ~2028; grades apply from 2030), so recyclability here is based on current RecyClass / CEFLEX guidance as a proxy. Requirements vary by product category, market and pack type. Always verify final obligations — and the EU Declaration of Conformity — with a qualified packaging-compliance specialist or legal counsel before placing products on the market.' +
    '</div>' +
    '</div></div></div>';
}

