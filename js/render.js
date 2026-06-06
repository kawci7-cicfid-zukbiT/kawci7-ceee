// ====================================================================
// RENDER.JS - All page render functions
// ====================================================================

// ====================================================================
// HOME
// ====================================================================

// ====================================================================
// CALCULATOR
// ====================================================================
function renderCalc() {
    // FIX: sync Engine.mode FIRST so getUnit()/getLabel() return correct values
    Engine.mode = State.mode;

    var unit  = getUnit();
    var label = getLabel();

    var common = Engine.findCommonConditions(State.layers, DB.materials);
    var hasMats = State.layers.some(function(l){ return l.mid !== null; });

    var cardHeader = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">' +
        '<h2 style="margin:0;display:flex;align-items:center;gap:0.4rem">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary)"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>Laminate Structure</h2>' +
        '<button class="btn btn-sm btn-danger" onclick="clearProject()">Cancel</button></div>';

    var testMethods = {};
    for(var i=0; i<DB.materials.length; i++){
        var m = DB.materials[i];
        var currentTM = State.mode === 'wvtr' ? (m.testMethodWVTR || m.testMethod || '') : (m.testMethodOTR || m.testMethod || '');
        if(currentTM && currentTM.trim() !== '') testMethods[currentTM.trim()] = true;
        var mVals = State.mode === 'wvtr' ? (m.wvtrValues || []) : (m.otrValues || []);
        for(var vi=0; vi<mVals.length; vi++){
            if(mVals[vi] && mVals[vi].testMethod && mVals[vi].testMethod.trim() !== '')
                testMethods[mVals[vi].testMethod.trim()] = true;
        }
    }
    var tmOpts = '<option value="">All test methods</option>';
    var tmList = Object.keys(testMethods).sort();
    for(var t=0; t<tmList.length; t++){
        var sel = State.selectedTestMethod === tmList[t] ? ' selected' : '';
        var escaped = tmList[t].replace(/"/g,'&quot;');
        tmOpts += '<option value="'+escaped+'"'+sel+'>'+tmList[t]+'</option>';
    }

    var matSourceFilter =
        '<div class="form-group" style="margin-top:0.5rem">' +
        '<label>Materials Source</label>' +
        '<select class="form-input" id="filter-matsource" onchange="onMatSourceChange(this.value)">' +
        '<option value="general"' + (State.matSource !== 'company' ? ' selected' : '') + '>General Database</option>' +
        (CompanyState.isActive() ? '<option value="company"' + (State.matSource === 'company' ? ' selected' : '') + '>Company DB (' + CompanyState.companyName + ')</option>' : '') +
        '</select>' +
        (!CompanyState.isActive() ? '<span style="font-size:0.65rem;color:var(--text-light)"><a href="#" onclick="showCompanyModal();return false" style="color:var(--primary)">Join a company</a> to access private materials</span>' : '') +
        '</div>';

    var testMethodFilter =
        '<div class="form-group" style="margin-top:0.5rem">' +
        '<label>Filter by Test Method</label>' +
        '<select class="form-input" id="filter-testmethod" onchange="onTestMethodFilterChange(this.value)">'+tmOpts+'</select>' +
        '<span style="font-size:0.65rem;color:var(--text-light)">Show only materials tested with the same standard</span>' +
        '</div>';

    var condHTML = '';
    if(!hasMats) {
        condHTML = '<div class="alert alert-info">Add at least one material with thickness</div>';
    } else if(common.error) {
        condHTML = '<div class="alert alert-error">'+common.error+'</div>';
        if(common.matInfo) {
            var infoHTML = '<table class="cond-table"><thead><tr><th>Material</th><th>Conditions</th></tr></thead><tbody>';
            for(var mi=0; mi<common.matInfo.length; mi++) {
                infoHTML += '<tr><td><strong>'+common.matInfo[mi].name+'</strong></td><td>'+common.matInfo[mi].conditions.join(', ')+'</td></tr>';
            }
            infoHTML += '</tbody></table>';
            condHTML += '<div class="alert alert-warning"><strong>Available conditions:</strong>'+infoHTML+'</div>';
        }
    } else {
        var uniqueConditions = [];
        var seen = {};
        for(var ci = 0; ci < common.conditions.length; ci++){
            var c = common.conditions[ci];
            var key = c.temperature + '|' + c.humidity;
            if(!seen[key]){ seen[key] = true; uniqueConditions.push(c); }
        }
        var opts = '<option value="">Select temperature/humidity...</option>';
        for(var ci2 = 0; ci2 < uniqueConditions.length; ci2++){
            var uc = uniqueConditions[ci2];
            var selAttr = State.selCond && State.selCond.temperature === uc.temperature && State.selCond.humidity === uc.humidity ? ' selected' : '';
            opts += '<option value="'+uc.temperature+'|'+uc.humidity+'"'+selAttr+'>'+uc.temperature+'\u00b0C / '+uc.humidity+'%</option>';
        }
        condHTML = '<div class="form-group"><label>Test Conditions</label><select class="form-input" id="sel-cond" onchange="onCondSelect()">'+opts+'</select></div>';
    }

    var layersHTML = '';
    for(var li=0; li<State.layers.length; li++){
        var l = State.layers[li];
        var res = (State.calcResult && State.calcResult.layers && State.calcResult.layers[li]) ? State.calcResult.layers[li] : null;

        var filteredMats = DB.materials.filter(function(mat){
            if (State.matSource === 'company') return mat.isCompany && passesTestMethodFilter(mat);
            return !mat.isCompany && passesTestMethodFilter(mat);
        });
        filteredMats.sort(function(a, b){ return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}); });

        var otherMats = [];
        for(var k=0; k<State.layers.length; k++){
            if(k !== li && State.layers[k].mid !== null){
                var matOther = findMaterialById(State.layers[k].mid);
                if(matOther) otherMats.push(matOther);
            }
        }
        var reqConds = [];
        if(otherMats.length > 0){
            reqConds = Engine._getAvailableConditions(otherMats[0]).slice();
            for(var om=1; om<otherMats.length; om++){
                var omConds = Engine._getAvailableConditions(otherMats[om]);
                reqConds = reqConds.filter(function(cond){
                    return omConds.some(function(n){
                        return Math.abs(n.temperature-cond.temperature)<0.01 && Math.abs(n.humidity-cond.humidity)<0.01;
                    });
                });
            }
        }
        var displayMats = filteredMats;
        if(reqConds.length > 0){
            displayMats = filteredMats.filter(function(mat){
                var vc = Engine._getAvailableConditions(mat);
                return vc.some(function(v){
                    return reqConds.some(function(r){
                        return Math.abs(v.temperature - r.temperature) < 0.01 && Math.abs(v.humidity - r.humidity) < 0.01;
                    });
                });
            });
            if(displayMats.length === 0) displayMats = filteredMats;
        }

        var matOpts = '<option value="">Select...</option>';
        for(var j=0; j<displayMats.length; j++){
            var mat = displayMats[j];
            var matLabel = mat.name;
            var currentTM2 = '';
            if(State.selectedTestMethod) {
                currentTM2 = State.selectedTestMethod;
            } else {
                currentTM2 = State.mode === 'wvtr' ? (mat.testMethodWVTR || mat.testMethod || '') : (mat.testMethodOTR || mat.testMethod || '');
                if(!currentTM2) {
                    var firstVals = State.mode === 'wvtr' ? (mat.wvtrValues || []) : (mat.otrValues || []);
                    if(firstVals[0] && firstVals[0].testMethod) currentTM2 = firstVals[0].testMethod;
                }
            }
            if(currentTM2) matLabel += ' ['+currentTM2+']';
            var selected = (String(l.mid) === String(mat.id)) ? ' selected' : '';
            matOpts += '<option value="'+mat.id+'"'+selected+'>'+matLabel+'</option>';
        }

        layersHTML += '<div class="layer-card"><span class="layer-badge">LAYER '+(li+1)+'</span>' +
            '<div class="layer-grid">' +
            '<div class="form-group" style="margin:0"><label>Material</label><select class="form-input" onchange="onLayerChange('+li+',\'mid\',this.value)">'+matOpts+'</select></div>' +
            '<div class="form-group" style="margin:0"><label>Thickness (um)</label><input type="number" step="any" class="form-input" value="'+(l.thick||'')+'" placeholder="0" onchange="onLayerChange('+li+',\'thick\',this.value)"></div>' +
            '<div style="display:flex;align-items:center;gap:.3rem">'+(li>0 ? '<button class="btn btn-sm btn-danger" onclick="rmLayer('+li+')">X</button>' : '')+
            (res && res.transmissionAtThickness > 0 ? '<span class="badge badge-green">'+res.transmissionAtThickness.toFixed(3)+'</span>' : '')+
            (res && res.isBarrier ? '<span class="badge badge-purple">BARRIER</span>' : '')+
            '</div></div>'+
            (res ? '<div style="margin-top:.35rem;font-size:.68rem;color:var(--text-light)">R: '+rStr(res.resistance)+' - '+res.resistancePct.toFixed(1)+'%</div>' : '')+
            '</div>';
    }

    var selectedCond = State.selCond ? State.selCond.temperature+'\u00b0C/'+State.selCond.humidity+'%' : null;
    var canCalc = !!selectedCond && State.layers.every(function(l){ return l.mid !== null && l.thick > 0; });
    var hasResult = State.calcResult && !State.calcResult.error && State.calcResult.total > 0;

    var lastLayerEmpty = State.layers.length > 0 && State.layers[State.layers.length-1].mid === null;

    var resultHTML = '';
    if(State.calcError) {
        resultHTML = '<div class="alert alert-error">'+State.calcError+'</div>';
    } else if(hasResult){
        var prec = getDisplayPrecision();
        resultHTML = '<div class="result-card fade-in"><div class="result-value">'+formatWithSigFigs(State.calcResult.total, prec)+'</div><div class="result-unit">'+unit+'</div></div>';
        var detail = '';
        for(var r=0; r<State.calcResult.layers.length; r++){
            var rl = State.calcResult.layers[r];
            var prec2 = getDisplayPrecision();
            detail += '<div><strong>'+rl.materialName+'</strong> ('+rl.thickness+'um): '+label+' = '+formatWithSigFigs(rl.transmissionAtThickness, prec2)+' '+unit+' R='+formatWithSigFigs(rl.resistance, prec2)+' '+rl.resistancePct.toFixed(1)+'%</div>';
        }
        detail += '<div style="padding-top:.25rem;border-top:2px solid #93c5fd;margin-top:.25rem"><strong>Total R:</strong> '+rStr(State.calcResult.totalResistance)+'</div>';
        resultHTML += '<div class="result-detail">'+detail+'</div>';
    }

    if(hasResult && State.calcResult.layers) {
        var hygroWarnings = [];
        for(var r2 = 0; r2 < State.calcResult.layers.length; r2++) {
            var lr = State.calcResult.layers[r2];
            if(lr.hygroCorrection && lr.hygroCorrection.isSignificant) hygroWarnings.push(lr.hygroCorrection.message);
        }
        if(hygroWarnings.length > 0) {
            var warningsHTML = hygroWarnings.map(function(w) {
                return '<div style="display:block;margin:0.15rem 0;line-height:1.3">- ' + w + '</div>';
            }).join('');
            resultHTML += '<div class="alert alert-warning" style="margin-top:0.75rem;font-size:0.75rem">' +
                '<strong style="display:block;margin-bottom:0.2rem">Hygroscopic correction applied:</strong>' +
                warningsHTML + '</div>';
        }
    }

    var html = '<div class="grid grid-2">' +
        '<div><div class="card">'+cardHeader+matSourceFilter+testMethodFilter+layersHTML+
        '<button class="btn btn-outline btn-full" onclick="addLayer()"'+(lastLayerEmpty ? ' disabled' : '')+'>+ Add Layer</button></div>'+
        '<div class="card"><h2>Test Conditions</h2>'+condHTML+
        (selectedCond ? '<p style="font-size:.75rem;color:var(--text-light);margin-top:.5rem">Selected: <strong>'+selectedCond+'</strong></p>' : '')+
        '<div style="display:flex;align-items:center;gap:.4rem;margin:.5rem 0">'+
        '<div onclick="toggleAutoCalc()" style="width:36px;height:20px;background:'+(State.autoCalc?'var(--primary)':'var(--border)')+';border-radius:10px;position:relative;cursor:pointer"><div style="position:absolute;top:2px;'+(State.autoCalc?'right:2px':'left:2px')+';width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s"></div></div>'+
        '<span style="font-size:.75rem;color:var(--text-light)">Auto-calculate</span></div>'+
        '<button class="btn btn-danger btn-full" onclick="doCalc()"'+(canCalc?'':' disabled')+'>Calculate '+label+'</button></div></div>'+
        '<div><div class="card"><h2>Result</h2>'+(resultHTML||'<p style="color:var(--text-light);font-size:.8rem;text-align:center;padding:1.5rem">Configure layers and calculate</p>')+'</div>'+
        (hasResult ? '<div class="card" id="hygro-card" style="display:none"><h2>Time-Dependent barrier integrity</h2><div class="chart-container" style="min-height:280px"><canvas id="hygroTimeChart"></canvas></div></div>' : '')+
        (hasResult ? '<div class="card"><h2>'+label+' vs Temperature</h2><div class="chart-container"><canvas id="lamCurveChart"></canvas></div><div id="lamCurveLegend" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;justify-content:center"></div></div>'+
        '<div class="card"><h2>Save Laminate</h2>' +
        '<div class="form-group"><label>Name</label><input type="text" class="form-input" id="lam-name" value="'+State.laminateName+'" placeholder="e.g. Coffee pouch structure..." oninput="State.laminateName=this.value;updateSaveBtn()"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.5rem">' +
        '<button class="btn btn-primary" id="save-btn-general" onclick="saveLaminateWithChoice()" title="Save to your personal laminates library">Save to General DB</button>' +
        '<button class="btn btn-outline" id="save-btn-company" onclick="saveLaminateToCompany()" style="opacity:' + (CompanyState.isActive()?'1':'0.4') + ';cursor:' + (CompanyState.isActive()?'pointer':'not-allowed') + '" ' + (!CompanyState.isActive()?'disabled':'') + ' title="' + (CompanyState.isActive()?'Save to '+CompanyState.companyName:'Join a company first') + '">Save to Company DB</button></div>' +
        '<div id="save-feedback"></div></div>' : '')+
        '</div></div>' +
        renderCalcMethodology();
    return html;
}

// ====================================================================
// CALCULATOR METHODOLOGY
// ====================================================================
function renderCalcMethodology() {
return `
<div class="card methodology-card" style="margin-top:1.5rem; border-left:4px solid var(--primary); background: var(--card);">
<div style="padding:1.2rem 1.5rem;">
<h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.3rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">
Understanding the calculations
</h2>
<div style="font-size:0.95rem; line-height:1.8; color:#334155; font-family:Georgia, 'Times New Roman', serif;">

<p>When engineers design packaging for food, pharmaceuticals, or sensitive products, they often combine several thin layers of different materials. Each layer plays a specific role: one might block moisture, another might block oxygen, and another might provide structural strength or heat-sealability. But how do we mathematically predict how well the whole structure will perform? This calculator answers that question using a classic physics principle: the series resistance model.</p>

<p>Think of it like building an insulated wall to keep out the cold. A single brick lets some heat through. Add a layer of foam insulation, then another brick, then a vapor barrier and suddenly, the wall becomes incredibly effective. Each layer adds its own "resistance" to the thermal flow. Packaging works exactly the same way, except instead of blocking heat, we are blocking water vapor molecules (WVTR) or oxygen molecules (OTR).</p>

<div style="background:var(--primary-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--primary); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong>The Core Rule:</strong> The total barrier resistance of a laminate is simply the sum of the individual resistances of each layer. Because permeability is the physical opposite (the inverse) of resistance, the final transmission rate is calculated by dividing 1 by the total accumulated resistance.
</div>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">How single layer resistance is calculated</h3>
<p>For any uniform polymer film, gas transport under steady conditions follows Fick's Law. This means a material's resistance depends linearly on the thickness you use versus its baseline performance measured in a laboratory. To find a single layer's resistance, the calculator uses this exact formula:</p>

<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
R<sub>layer</sub> = Thickness<sub>input</sub> / (Permeability<sub>ref</sub> × Thickness<sub>ref</sub>)
</div>

<p>In plain words: the term <em>(Permeability<sub>ref</sub> × Thickness<sub>ref</sub>)</em> is a constant value representing the material's intrinsic barrier quality (often called the Permeation Coefficient). If you double the thickness of your layer, you double its mathematical resistance, which effectively cuts the amount of gas leaking through in half.</p>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Combining layers (the multilayer math)</h3>
<p>When you stack multiple materials together to form a laminate sheet, the calculator mathematically chains them together by adding up their calculated resistances:</p>

<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
R<sub>total</sub> = R<sub>layer1</sub> + R<sub>layer2</sub> + ... + R<sub>layerN</sub><br><br>
Final Permeability (WVTR or OTR) = 1 / R<sub>total</sub>
</div>

<div style="background:#f0fdf4; padding:1rem; border-radius:8px; border-left:3px solid var(--success); margin:1.2rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong style="color:#16a34a; font-size:0.95rem;"> A Step-by-Step example:</strong><br>
Let's calculate the final WVTR of a simple two-layer pouch made of <strong>PET (12 µm)</strong> and <strong>LDPE (50 µm)</strong>:<br>
<ul>
  <li><strong>Layer 1 (PET 12 µm):</strong> Laboratory reference says it has a WVTR of 30.0 at 12 µm. <br>
  <em>R<sub>PET</sub> = 12 / (30.0 × 12) = 1 / 30.0 = <strong>0.0333</strong></em></li>
  <li><strong>Layer 2 (LDPE 50 µm):</strong> Laboratory reference says it has a WVTR of 4.0 at 25 µm.<br>
  <em>R<sub>LDPE</sub> = 50 / (4.0 × 25) = 50 / 100 = <strong>0.5000</strong></em></li>
  <li><strong>Total Combined Resistance:</strong> R<sub>total</sub> = 0.0333 + 0.5000 = <strong>0.5333</strong></li>
  <li><strong>Final Laminate WVTR:</strong> 1 / 0.5333 = <strong style="color:#111;">1.87 g/m²·day</strong></li>
</ul>
Notice how the LDPE layer is providing the vast majority of the moisture resistance (0.5000 out of 0.5333 total), making it the true moisture barrier in this structure!
</div>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Hygroscopic dynamics</h3>
<p>Some premium barrier materials, like EVOH or Polyamides (Nylon), are highly sensitive to water vapor. When environmental humidity rises, these polymers absorb water molecules, which act as plasticizers, loosening the polymer chains and accelerating gas leakage. To simulate this real-world risk, the calculator applies an exponential scaling factor to the material's resistance based on its experimental sensitivity coefficient (&beta;):</p>

<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
Corrected Permeability = Permeability<sub>base</sub> × e<sup>&beta; × (&Delta;RH)</sup>
</div>

<p>Where <em>&Delta;RH</em> represents the difference between your current storage humidity and the original lab testing condition. If you test an EVOH-based material in tropical humidity without calculating this factor, your physical barrier will break down much faster than an uncorrected calculation would predict.</p>

<div style="background:var(--warning-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--warning); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong>Info:</strong> If no &beta; (beta) coefficient is supplied in the database, the model assumes the material is completely immune to moisture damage. In tropical or high-condensation environments, this assumption will generate overly optimistic shelf-life estimates.
</div>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Metallized and coated shields</h3>
<p>Metallized films (such as MET-PET) and nanometric ceramic coatings (like AlO<sub>x</sub> or SiO<sub>x</sub>) follow entirely different physical rules. Their barrier performance does not come from the bulk polymer thickness, but rather from an ultra-thin, atomic layer of aluminum or oxide deposited onto the surface. Because a thicker base film will not have a better aluminum layer, the calculator treats these specialty materials as having a fixed, constant permeability barrier, bypassing the linear thickness division rule.</p>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Reading your analysis matrix</h3>
<p>The percentage contribution shown for each layer helps you pinpoint exactly where your money and material thickness are being effectively used:</p>

<table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid var(--border);">
      <th style="padding:0.6rem; text-align:left;">Layer Resistance %</th>
      <th style="padding:0.6rem; text-align:left;">Physical Meaning</th>
      <th style="padding:0.6rem; text-align:left;">Design Optimization Action</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.6rem; font-weight:bold; color:var(--danger);">&gt; 50%</td>
      <td>Primary Line of Defense</td>
      <td>This is your "weakest link". Tweaking this material or increasing its thickness yields the maximum performance return.</td>
    </tr>
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.6rem; font-weight:bold; color:var(--warning);">20% – 50%</td>
      <td>Significant Contributor</td>
      <td>Provides active support. Balance its thickness to manage overall roll-stock costs.</td>
    </tr>
    <tr>
      <td style="padding:0.6rem; font-weight:bold; color:var(--success);">&lt; 10%</td>
      <td>Minor Barrier Role</td>
      <td>This layer is doing almost no barrier work. It is likely there for mechanical strength, sealing, or printing. Do not waste money increasing its thickness for barrier reasons.</td>
    </tr>
  </tbody>
</table>

<p>Finally, remember that simulations assume a perfect universe: uniform film gauges, zero pinholes, and flawless industrial lamination. In the actual manufacturing plant, converting stresses and thermal sealing will slightly shift these properties. Treat this tool as a high-velocity screening application for early-stage R&D, and always validate your definitive structures with physical laboratory testing.</p>

<div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
<strong>Industrial Protocol Disclaimer:</strong> This methodology is built to support engineering design and educational workflows. For commercial legal specifications or regulatory packaging claims, model predictions must always be verified by empirical testing executed under international standards such as ASTM F1249, ASTM D3985, or ISO 15106.
</div>

</div>
</div>
</div>
`;
}
// ====================================================================
// ARRHENIUS
// ====================================================================
function renderArrhenius() {
    // FIX: sync Engine.mode
    Engine.mode = State.mode;

    var unit  = getUnit();
    var label = getLabel();

    var validCount = 0;
    var opts = '<option value="">Select a multi-temp material...</option>';
    for(var i = 0; i < DB.materials.length; i++) {
        var mat = DB.materials[i];
        var v = Engine.validateArrhenius(mat);
        if(v.valid) {
            var r = Engine.calcArrheniusParams(mat);
            var r2 = r.valid ? r.rSquared.toFixed(3) : '-';
            opts += '<option value="' + mat.id + '">' + mat.name + ' [R2=' + r2 + ']</option>';
            validCount++;
        }
    }
    var infoText = validCount > 0 ? validCount + ' materials available for prediction' : 'No materials with multi-temperature data found';
    var html = '<div class="card"><h2>Arrhenius Analysis</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Predict ' + label + ' at unmeasured temperatures. <span style="color:' + (validCount > 0 ? 'var(--success)' : 'var(--danger)') + ';font-weight:600">' + infoText + '</span></p>' +
        '<div class="grid grid-2">' +
            '<div class="form-group"><label>Material (multi-temp only)</label><select class="form-input" id="arr-mat" onchange="onArrChange()">' + opts + '</select></div>' +
            '<div class="form-group"><label>Target Temperature (C)</label><input type="number" step="any" class="form-input" id="arr-temp" value="25" oninput="onArrChange()"></div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:0.5rem;padding:0.6rem;background:var(--primary-light);border-radius:8px">' +
            '<label style="font-weight:600">Ea Activation Energy (kJ/mol)</label>' +
            '<input type="number" step="any" class="form-input" id="arr-ea" value="" placeholder="Auto-calculated or enter custom value" oninput="onArrEaChange()">' +
            '<span style="font-size:0.65rem;color:var(--text-light);display:block;margin-top:0.25rem">Leave empty to auto-calculate, or enter custom value for what-if analysis</span>' +
        '</div>' +
        '<div id="arr-result"></div></div>' +
        '<div class="grid grid-2">' +
            '<div class="card"><h2>' + label + ' vs Temperature</h2><div class="chart-container"><canvas id="arrTempCanvas"></canvas></div></div>' +
            '<div class="card"><h2>Arrhenius Plot (ln vs 1/T)</h2><div class="chart-container"><canvas id="arrLinCanvas"></canvas></div></div>' +
        '</div>' +
        '</div>' +
        renderArrheniusMethodology();
    return html;
}

// ====================================================================
// ARRHENIUS METHODOLOGY
// ====================================================================
function renderArrheniusMethodology() {
  return `
  <div class="card methodology-card" style="margin-top:1rem; border-left:4px solid var(--primary);">
  <div style="padding:1.2rem 1.5rem;">
  <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.2rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">
   Understanding Arrhenius Analysis
  </h2>

  <div style="font-size:0.92rem; line-height:1.75; color:#334155; font-family:Georgia, 'Times New Roman', serif;">

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">What is the Arrhenius equation, really?</h3>
  <p>At its heart, the Arrhenius equation helps us understand a simple but powerful idea: temperature changes how quickly molecules move through packaging materials. Whether you're measuring water vapor (WVTR) or oxygen (OTR), warmth gives molecules more energy to wiggle through tiny gaps in films and coatings.</p>
  
  <div style="background:var(--primary-light); padding:0.7rem; border-radius:8px; border-left:3px solid var(--primary); margin:0.8rem 0; font-family:sans-serif;">
  <strong>Think of it this way:</strong> Imagine trying to walk through a crowded room. When it's cool, people move slowly and you make progress gradually. When it's warm and energetic, everyone's moving faster—and so do the molecules trying to pass through your packaging. Arrhenius gives us the math to predict exactly how much faster.
  </div>

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">How do we gather the data needed?</h3>
  <p>To unlock Arrhenius predictions, you need at least two measurements of the same material taken at different temperatures, while keeping relative humidity steady. More points = more confidence.</p>

  <div style="background:#f8fafc; padding:0.9rem; border-radius:8px; border:1px dashed var(--border); margin:0.8rem 0;">
  <strong>Example: Building your dataset</strong>
  <table style="width:100%; font-size:0.85rem; margin-top:0.5rem; border-collapse:collapse;">
  <thead>
  <tr style="background:var(--bg); text-align:left;">
  <th style="padding:0.4rem 0.6rem;">Temperature</th>
  <th style="padding:0.4rem 0.6rem;">Humidity</th>
  <th style="padding:0.4rem 0.6rem;">Measured WVTR</th>
  </tr>
  </thead>
  <tbody>
  <tr><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">23°C</td><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">50% RH</td><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">0.8 g/m²·day</td></tr>
  <tr><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">38°C</td><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">50% RH</td><td style="padding:0.3rem 0.6rem; border-bottom:1px solid var(--border);">1.5 g/m²·day</td></tr>
  <tr><td style="padding:0.3rem 0.6rem;">50°C</td><td style="padding:0.3rem 0.6rem;">50% RH</td><td style="padding:0.3rem 0.6rem;">2.8 g/m²·day</td></tr>
  </tbody>
  </table>
  </div>

  <p style="font-size:0.85rem; color:var(--text-light); margin-top:0.5rem;">
  <strong>Quick note:</strong> Keep humidity consistent (within ±5%) across all tests. Because humidity affects permeability independently of temperature, and we want to isolate temperature's role.
  </p>

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">What happens behind the scenes?</h3>
  <p>Once you've entered your multi-temperature data, here's how the calculator brings Arrhenius to life:</p>
  
  <ol style="padding-left:1.2rem; margin:0.5rem 0;">
  <li><strong>Transform the numbers:</strong> Temperatures get converted to Kelvin (K = °C + 273.15), and we take the natural logarithm of each WVTR/OTR value. This linearizes the relationship.</li>
  <li><strong>Plot and check alignment:</strong> We graph ln(WVTR) versus 1/T. If your points fall roughly along a straight line, congratulations—your material follows Arrhenius behavior!</li>
  <li><strong>Extract the key parameters:</strong>
  <ul style="padding-left:1rem; margin:0.3rem 0; font-size:0.9em;">
  <li><strong>Eₐ (Activation Energy):</strong> Measured in kJ/mol, this tells us how "temperature-sensitive" your material is. Higher Eₐ = bigger changes with temperature.</li>
  <li><strong>A (Pre-exponential Factor):</strong> A theoretical baseline value—think of it as the permeability the material would have at infinite temperature.</li>
  <li><strong>R² (Goodness of Fit):</strong> A score from 0 to 1 showing how well your data matches the Arrhenius model. Closer to 1.0 means more trustworthy predictions.</li>
  </ul>
  </li>
  <li><strong>Make predictions:</strong> With Eₐ and A in hand, the calculator can estimate WVTR/OTR at any temperature you specify—even ones you haven't tested yet.</li>
  </ol>

  <div style="background:#f8fafc; padding:0.9rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:0.8rem 0;">
  <strong>The Equation:</strong><br>
  WVTR(T) = A · exp( -Eₐ / (R · T) )
  </div>

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">Making sense of your output</h3>
  <p>After running the analysis, you'll see an R² value. Here's how to interpret it:</p>
  
  <div style="display:grid; grid-template-columns:1fr; gap:0.5rem; margin:0.8rem 0;">
  <div style="background:var(--success-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--success);">
  <strong style="color:var(--success);">✓ R² ≥ 0.95:</strong> Excellent fit. Your data aligns beautifully with Arrhenius—predictions are highly reliable for both interpolation and cautious extrapolation.
  </div>
  <div style="background:var(--warning-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--warning);">
  <strong style="color:var(--warning);">⚠ 0.80 ≤ R² < 0.95:</strong> Reasonable fit. Predictions within your tested temperature range are generally trustworthy, but use extra caution when estimating values far outside that range.
  </div>
  <div style="background:var(--danger-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--danger);">
  <strong style="color:var(--danger);">✗ R² < 0.80:</strong> Weak fit. Your material may not follow Arrhenius behavior closely, or you may need more data points. Consider collecting additional measurements or investigating other influencing factors.
  </div>
  </div>

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">Tips for reliable, publication-ready results</h3>
  <ul style="padding-left:1.2rem; margin:0.5rem 0; font-size:0.9rem;">
  <li><strong>Spread your temperatures:</strong> Aim for at least 3 distinct temperatures spanning your expected storage or use conditions. Wider ranges improve prediction confidence.</li>
  <li><strong>Lock down humidity:</strong> Keep relative humidity consistent across all tests. Even small fluctuations can introduce noise that masks the true temperature effect.</li>
  <li><strong>Let samples equilibrate:</strong> Before measuring, ensure your material has fully adjusted to the test environment. Rushed measurements lead to scattered data.</li>
  <li><strong>Build in a safety margin:</strong> When extrapolating beyond your measured range (e.g., predicting performance at 5°C when you only tested 20–50°C), apply a 20–30% buffer to account for uncertainty.</li>
  <li><strong>Watch for phase changes:</strong> Some materials undergo structural shifts (like crystallization or glass transitions) at certain temperatures. These can cause deviations from Arrhenius behavior—flag them if you notice sudden changes in your data trend.</li>
  </ul>

  <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">Further Reading & Standards</h3>
  <ul style="padding-left:1.2rem; margin:0.5rem 0; color:var(--text-light); font-size:0.85rem;">
  <li>ASTM F1249 / ISO 15106-3</li>
  <li>ASTM D3985 / ISO 15106-2</li>
  <li>Arrhenius, S. (1889).</li>
  <li>Robertson, G.L. (2016).</li>
  </ul>

  <div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
  <strong>Operational note:</strong> This Arrhenius tool is designed to support research, development, and informed decision-making. For commercial shelf-life claims or regulatory submissions, always validate predictions with real-time or accelerated aging studies under actual storage conditions, and ensure compliance with applicable regulations (e.g., EU Regulation 1169/2011, FDA 21 CFR Part 101).
  </div>

  </div>
  </div>
  </div>
  `;
}

// ====================================================================
// SENSITIVITY
// ====================================================================
function renderSensitivity() {
    // FIX: sync Engine.mode
    Engine.mode = State.mode;

    var unit  = getUnit();
    var label = getLabel();

    var hasMats = State.layers.some(function(l){ return l.mid !== null; });
    var layerOpts = '';
    for(var i=0; i<State.layers.length; i++){
        var mat = findMaterialById(State.layers[i].mid);
        layerOpts += '<option value="'+i+'"'+(State.sensLayerIdx===i?' selected':'')+'>'+(i+1)+': '+((mat)?mat.name:'Unknown')+' ('+(State.layers[i].thick||0)+'um)</option>';
    }
    var barrierOpts = '';
    for(var i2=0; i2<State.layers.length; i2++){
        var mat2 = findMaterialById(State.layers[i2].mid);
        barrierOpts += '<option value="'+i2+'">'+(i2+1)+': '+((mat2)?mat2.name:'Unknown')+'</option>';
    }
    var html = '<div class="grid grid-2">' +
        '<div class="card"><h2>Sensitivity Analysis</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">See how '+label+' changes when varying one layer thickness</p>' +
        (!hasMats ? '<div class="alert alert-info">Configure layers in Calculator first</div>' :
        '<div class="grid grid-2"><div class="form-group"><label>Layer to vary</label><select class="form-input" id="sens-layer" onchange="onSensChange()">'+layerOpts+'</select></div>' +
        '<div class="form-group"><label>Thickness range (um)</label><div style="display:flex;gap:.5rem"><input type="number" step="any" class="form-input" id="sens-tmin" value="10" onchange="onSensChange()"><input type="number" step="any" class="form-input" id="sens-tmax" value="500" onchange="onSensChange()"></div></div></div></div>') +
        '<div class="card"><h2>'+label+' vs Thickness</h2><div class="chart-container"><canvas id="sensChart"></canvas></div><div id="sens-points-info"></div></div>' +
        '</div>' +
        '<div class="card"><h2>Cost-Saving Optimizer</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Find minimum barrier layer thickness to meet target</p>' +
        '<div class="grid grid-2">' +
        '<div class="form-group"><label>Target '+label+' ('+unit+')</label><input type="number" step="any" class="form-input" id="opt-target" value="'+State.targetValue+'" onchange="doOptimize()"></div>' +
        '<div class="form-group"><label>Barrier layer</label><select class="form-input" id="opt-layer" onchange="doOptimize()">'+barrierOpts+'</select></div></div>' +
        '<div id="opt-result"></div></div>' +
        renderSensitivityMethodology();
    return html;
}

// ====================================================================
// SENSITIVITY METHODOLOGY
// ====================================================================
function renderSensitivityMethodology() {
return `
<div class="card methodology-card" style="margin-top:1.5rem; border-left:4px solid var(--primary); background: var(--card);">
<div style="padding:1.2rem 1.5rem;">
<h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.3rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">
Mechanics of Sensitivity Analysis
</h2>
<div style="font-size:0.95rem; line-height:1.8; color:#334155; font-family:Georgia, 'Times New Roman', serif;">

<p>In packaging optimization, a common question arises: <em>"What happens if we make this specific layer thinner to save money, or thicker to extend shelf life?"</em> Not all layers impact the final structure equally. Sensitivity Analysis is a powerful mathematical stress-test that answers this question. By sweeping the thickness of a single selected layer across a wide range while keeping all other layers locked, the model plots a dynamic trajectory showing exactly where you get the most "bang for your buck."</p>

<div style="background:var(--primary-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--primary); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong>The Mathematical Phenomenon:</strong> Even though a single layer's resistance scales linearly with its thickness, the final transmission rate (WVTR/OTR) of the laminate changes non-linearly. This creates a distinct curve because the variable layer is constantly shifting its percentage share of the global resistance pool.
</div>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">The math under the hood</h3>
<p>To plot your sensitivity curve, the calculator isolates the chosen layer and executes an iterative loops calculation. It samples multiple thickness points (ranging from thin to thick) and for every step, it re-computes Fick's resistance formula and recombines it into the global series model:</p>

<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
R<sub>variable</sub>(t) = Thickness<sub>sampled</sub> / (Permeability<sub>ref</sub> × Thickness<sub>ref</sub>)<br><br>
R<sub>total</sub>(t) = R<sub>fixed_layers</sub> + R<sub>variable</sub>(t)<br><br>
Laminate Permeability(t) = 1 / R<sub>total</sub>(t)
</div>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">How to read the sensitivity chart</h3>
<p>When you analyze the generated curve, your eyes should look for specific geometric patterns that dictate engineering decisions:</p>

<table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
  <thead>
    <tr style="background:#f1f5f9; border-bottom:2px solid var(--border);">
      <th style="padding:0.6rem; text-align:left;">Curve Topography</th>
      <th style="padding:0.6rem; text-align:left;">Physical Meaning</th>
      <th style="padding:0.6rem; text-align:left;">Industrial Diagnostic Action</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.6rem; font-weight:bold; color:var(--danger);">The Steep Cliff</td>
      <td>Critical Threshold Zone</td>
      <td>Reducing thickness even by 1 or 2 microns here will cause a catastrophic spike in gas transmission. This is a high-risk zone for product shelf life.</td>
    </tr>
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.6rem; font-weight:bold; color:var(--warning);">The "Knee" (Inflection)</td>
      <td>Thermodynamic Optimum</td>
      <td>The sweet spot. This is the exact point of cost-performance optimization where you achieve maximum barrier protection before the curve begins to flatten.</td>
    </tr>
    <tr>
      <td style="padding:0.6rem; font-weight:bold; color:var(--success);">The Flat Plateau</td>
      <td>System Bottleneck</td>
      <td>Adding more material is a waste of money. The variable layer is no longer the limiting factor; another layer in the structure is bottlenecking the performance. Focus on optimizing other materials.</td>
    </tr>
  </tbody>
</table>

<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Why metallized or coated layers stay flat?</h3>
<p>If you run a sensitivity sweep on a metallized film (like MET-PET) or an oxide-coated material (AlO<sub>x</sub>/SiO<sub>x</sub>), you will notice that the resulting graph line is completely flat. This is physical proof that the model is working correctly. The calculator treats these structures as surface shields: their gas-blocking properties are dictated entirely by the quality of the nanometric vacuum deposition, not by the thickness of the plastic carrier underneath. Changing a carrier film from 12 µm to 20 µm changes mechanical properties, but leaves the barrier resistance unchanged.</p>

<p>Use these graphic slopes to streamline your packaging specifications. By identifying structural plateaus, you can eliminate over-engineered components, reduce polymer plastic weights, minimize your eco-tax footprints, and cut production costs without risking standard food safety or chemical shelf-life metrics.</p>

<div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
<strong>Industrial Protocol Disclaimer:</strong> This sensitivity framework serves as a rapid screening asset for early-stage structural conceptualization. Commercial specifications, safety certifications, or legal regulatory filings must always be cross-examined and validated with direct laboratory measurements according to standard methods like ASTM F1249 or ASTM D3985.
</div>

</div>
</div>
</div>
`;
}

// ====================================================================
// COMPARE LAMINATES
// ====================================================================
function renderCompare() {
    var unit = getUnit();
    var filteredLams = DB.laminates.filter(function(l){ return l.mode === State.mode; });
    if(filteredLams.length < 2) return '<div class="card"><div class="empty-state"><p>Save 2+ ' + State.mode.toUpperCase() + ' laminates to compare</p></div></div>';
    
    var html = '<div class="card"><h2>Side-by-Side Comparison</h2><p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Select up to 3 laminates</p><div class="grid grid-2">';
    
    var maxC = Math.min(filteredLams.length, 6);
    for(var i=0; i<maxC; i++){
        var l = filteredLams[i];
        var checked = State.compareIds.indexOf(l.id) >= 0 ? 'checked' : '';
        var bg = State.compareIds.indexOf(l.id) >= 0 ? 'background:var(--primary-light);border-color:var(--primary)' : '';
        html += '<label style="display:flex;align-items:center;gap:.5rem;padding:.5rem;border:1px solid var(--border);border-radius:8px;cursor:pointer;'+bg+'">' +
            '<input type="checkbox" '+checked+' onchange="toggleCompare('+l.id+')" style="accent-color:var(--primary)">' +
            '<div><div style="font-weight:600;font-size:.82rem">'+l.name+'</div><div style="font-size:.7rem;color:var(--text-light)">'+l.total.toFixed(4)+' '+unit+' - '+l.totalThickness+'um</div></div></label>';
    }
    html += '</div></div><div id="compare-table"></div><div class="card"><h2>Comparison Chart</h2><div class="chart-container"><canvas id="compareChart"></canvas></div></div>';
    return html;
}

// ====================================================================
// LAMINATES DB
// ====================================================================
// ====================================================================
// LAMINATES DB — redesigned
// ====================================================================
// Filters/sort state — survives across renders within the session
if (typeof State !== 'undefined' && !State.lamFilters) {
    State.lamFilters = { search: '', recyclable: '', layerCount: '', application: '', sort: 'name' };
}
if (!window._lamExpanded) window._lamExpanded = {};

function lamGetMatById(mid) {
    if (!DB || !DB.materials) return null;
    for (var i = 0; i < DB.materials.length; i++) {
        if (String(DB.materials[i].id) === String(mid)) return DB.materials[i];
    }
    return null;
}

// Dominant application of a laminate = the application of the majority of its layers (by thickness)
function lamDominantApplication(lam) {
    if (!lam.layers || !lam.layers.length) return 'neutral';
    var weights = {};
    for (var i = 0; i < lam.layers.length; i++) {
        var L = lam.layers[i];
        var mat = lamGetMatById(L.mid);
        if (!mat) continue;
        var app = (typeof normalizeApplication === 'function') ? normalizeApplication(mat.application) : (mat.application || 'neutral');
        weights[app] = (weights[app] || 0) + (L.thick || 0);
    }
    var best = 'neutral', bestW = 0;
    for (var k in weights) {
        // Skip 'neutral' if any other application present; surface domain-specific apps
        if (k === 'neutral') continue;
        if (weights[k] > bestW) { bestW = weights[k]; best = k; }
    }
    if (bestW === 0 && weights.neutral) return 'neutral';
    return best;
}

function lamUpdateFilter(field, value) {
    State.lamFilters[field] = value;
    DB.saveState(State);
    renderContent();
}

function lamToggleExpanded(id) {
    window._lamExpanded[id] = !window._lamExpanded[id];
    renderContent();
}

function lamClearFilters() {
    State.lamFilters = { search: '', recyclable: '', layerCount: '', application: '', sort: 'name' };
    DB.saveState(State);
    renderContent();
}

function _lamLayerListHTML(lam, unit) {
    if (!lam.layers || !lam.layers.length) return '<div style="font-size:.72rem;color:var(--text-light)">No layer data</div>';
    var html = '<div style="display:flex;flex-direction:column;gap:4px">';
    for (var i = 0; i < lam.layers.length; i++) {
        var L = lam.layers[i];
        var mat = lamGetMatById(L.mid);
        var nm  = mat ? mat.name : ('Material #' + L.mid + ' (deleted)');
        var fam = mat ? (mat.family || '') : '';
        var appMeta = (typeof getApplicationMeta === 'function' && mat) ? getApplicationMeta(mat.application) : null;
        var dot = appMeta ? '<span style="width:7px;height:7px;border-radius:50%;background:' + appMeta.color + ';display:inline-block;flex-shrink:0;margin-right:5px"></span>' : '';
        var matMissing = !mat;
        html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 9px;background:' + (matMissing ? '#fef2f2' : '#f8fafc') + ';border-radius:6px;font-size:.75rem">' +
            '<div style="font-weight:700;color:var(--text-light);min-width:18px;font-size:.7rem">' + (i + 1) + '</div>' +
            dot +
            '<div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _escAttr(nm) + '">' + _escHtml(nm) + (fam ? ' <span style="color:var(--text-light);font-size:.66rem">· ' + _escHtml(fam) + '</span>' : '') + '</div>' +
            '<div style="font-weight:600;font-size:.72rem;color:var(--text-light);white-space:nowrap">' + (L.thick || 0).toFixed(0) + ' µm</div>' +
            '</div>';
    }
    html += '</div>';
    return html;
}

function renderLaminates() {
    var unit = getUnit();
    var modeUpper = State.mode.toUpperCase();
    var filters = State.lamFilters;

    // ── 1. Base filter on current mode (WVTR/OTR) ─────────────────────
    var pool = DB.laminates.filter(function(l) { return l.mode === State.mode; });

    if (!DB.laminates.length) {
        return '<div class="card" style="text-align:center;padding:3rem 1.5rem">' +
            '<div style="width:64px;height:64px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="width:30px;height:30px"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>' +
            '</div>' +
            '<h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 .5rem">Your saved laminates will appear here</h3>' +
            '<p style="font-size:.82rem;color:var(--text-light);margin:0 0 1.25rem;max-width:380px;margin-left:auto;margin-right:auto;line-height:1.6">Build a structure in the Calculator tab, compute the result, then click "Save to General DB" to add it to this library.</p>' +
            '<button class="btn btn-primary" onclick="State.tab=\'calc\';renderContent();if(typeof postNavRender===\'function\')postNavRender()">Open Calculator</button>' +
            '</div>';
    }

    // ── 2. Apply filters ──────────────────────────────────────────────
    var q = (filters.search || '').trim().toLowerCase();
    var filtered = pool.filter(function(l) {
        if (filters.recyclable === 'yes' && !l.recyclable) return false;
        if (filters.recyclable === 'no'  &&  l.recyclable) return false;
        if (filters.layerCount) {
            var nc = parseInt(filters.layerCount, 10);
            var actual = (l.layers && l.layers.length) || l.layerCount || 0;
            if (nc === 5 ? actual < 5 : actual !== nc) return false;
        }
        if (filters.application) {
            if (lamDominantApplication(l) !== filters.application) return false;
        }
        if (q) {
            var hay = (l.name || '').toLowerCase();
            if (l.layers) {
                for (var i = 0; i < l.layers.length; i++) {
                    var mat = lamGetMatById(l.layers[i].mid);
                    if (mat) hay += ' ' + (mat.name || '').toLowerCase() + ' ' + (mat.family || '').toLowerCase();
                }
            }
            if (hay.indexOf(q) < 0) return false;
        }
        return true;
    });

    // ── 3. Sort ───────────────────────────────────────────────────────
    if (filters.sort === 'name')         filtered.sort(function(a,b){ return a.name.localeCompare(b.name); });
    else if (filters.sort === 'perf')    filtered.sort(function(a,b){ return a.total - b.total; });
    else if (filters.sort === 'thick')   filtered.sort(function(a,b){ return a.totalThickness - b.totalThickness; });
    else if (filters.sort === 'layers')  filtered.sort(function(a,b){ return ((a.layers&&a.layers.length)||0) - ((b.layers&&b.layers.length)||0); });
    else if (filters.sort === 'recent')  filtered.sort(function(a,b){ return (b.id||0) - (a.id||0); });

    // ── 4. Header ─────────────────────────────────────────────────────
    var html = '<div style="padding:.25rem 0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">' +
            '<div style="font-size:1rem;font-weight:600">Laminates <span class="badge badge-purple">' + filtered.length + ' / ' + pool.length + '</span></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="btn btn-sm btn-primary" onclick="State.tab=\'calc\';renderContent();if(typeof postNavRender===\'function\')postNavRender()">+ New laminate</button>' +
            '</div>' +
        '</div>';

    // ── 5. Filter bar ─────────────────────────────────────────────────
    html += '<div class="card" style="margin-bottom:0.75rem">' +
        '<div style="font-size:0.75rem;font-weight:600;color:var(--text-light);margin-bottom:0.6rem">Filters</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:0.6rem">' +
            '<div class="form-group" style="margin:0"><label>Recyclable</label>' +
                '<select class="form-input" id="lf-recyc" onchange="lamUpdateFilter(\'recyclable\',this.value)" style="font-size:0.78rem">' +
                '<option value=""' + (filters.recyclable === '' ? ' selected' : '') + '>Any</option>' +
                '<option value="yes"' + (filters.recyclable === 'yes' ? ' selected' : '') + '>Yes only</option>' +
                '<option value="no"' + (filters.recyclable === 'no' ? ' selected' : '') + '>No only</option>' +
                '</select></div>' +
            '<div class="form-group" style="margin:0"><label>Layers</label>' +
                '<select class="form-input" id="lf-layers" onchange="lamUpdateFilter(\'layerCount\',this.value)" style="font-size:0.78rem">' +
                '<option value=""' + (filters.layerCount === '' ? ' selected' : '') + '>Any</option>' +
                '<option value="1"' + (filters.layerCount === '1' ? ' selected' : '') + '>1 (mono)</option>' +
                '<option value="2"' + (filters.layerCount === '2' ? ' selected' : '') + '>2 (duplex)</option>' +
                '<option value="3"' + (filters.layerCount === '3' ? ' selected' : '') + '>3 (triplex)</option>' +
                '<option value="4"' + (filters.layerCount === '4' ? ' selected' : '') + '>4</option>' +
                '<option value="5"' + (filters.layerCount === '5' ? ' selected' : '') + '>5+</option>' +
                '</select></div>' +
            '<div class="form-group" style="margin:0"><label>Application</label>' +
                '<select class="form-input" id="lf-app" onchange="lamUpdateFilter(\'application\',this.value)" style="font-size:0.78rem">' +
                '<option value=""' + (filters.application === '' ? ' selected' : '') + '>Any</option>' +
                (typeof APPLICATION_DOMAINS !== 'undefined'
                    ? APPLICATION_DOMAINS.map(function(a){ return '<option value="' + a.key + '"' + (filters.application === a.key ? ' selected' : '') + '>' + a.icon + ' ' + a.label + '</option>'; }).join('')
                    : '') +
                '</select></div>' +
            '<div class="form-group" style="margin:0"><label>Sort by</label>' +
                '<select class="form-input" id="lf-sort" onchange="lamUpdateFilter(\'sort\',this.value)" style="font-size:0.78rem">' +
                '<option value="name"'   + (filters.sort === 'name'   ? ' selected' : '') + '>Name (A→Z)</option>' +
                '<option value="perf"'   + (filters.sort === 'perf'   ? ' selected' : '') + '>Best ' + modeUpper + ' first</option>' +
                '<option value="thick"'  + (filters.sort === 'thick'  ? ' selected' : '') + '>Thinnest first</option>' +
                '<option value="layers"' + (filters.sort === 'layers' ? ' selected' : '') + '>Fewest layers</option>' +
                '<option value="recent"' + (filters.sort === 'recent' ? ' selected' : '') + '>Most recent</option>' +
                '</select></div>' +
        '</div>' +
        '<div style="position:relative">' +
            '<input type="text" class="form-input" id="lf-search" style="font-size:0.82rem"' +
            ' placeholder="Search by name or contained material…"' +
            ' value="' + _escAttr(filters.search) + '"' +
            ' oninput="State.lamFilters.search=this.value;clearTimeout(window._lamSearchT);window._lamSearchT=setTimeout(function(){DB.saveState(State);renderContent()},220)">' +
        '</div>' +
        ((filters.recyclable || filters.layerCount || filters.application || filters.search)
            ? '<div style="margin-top:.5rem"><button class="btn btn-sm btn-outline" onclick="lamClearFilters()" style="font-size:.72rem">× Clear all filters</button></div>'
            : '') +
        '</div>';

    // ── 6. Empty result state ─────────────────────────────────────────
    if (!filtered.length) {
        html += '<div class="card" style="text-align:center;padding:2rem 1rem"><p style="color:var(--text-light);margin:0">No laminates match these filters.</p></div></div>';
        return html;
    }

    // ── 7. Cards grid ─────────────────────────────────────────────────
    var accentColors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#14b8a6','#ec4899'];
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px">';

    for (var idx = 0; idx < filtered.length; idx++) {
        var l        = filtered[idx];
        var accent   = accentColors[idx % accentColors.length];
        var expanded = !!window._lamExpanded[l.id];
        var nLayers  = (l.layers && l.layers.length) || l.layerCount || 0;
        var dominant = lamDominantApplication(l);
        var domMeta  = (typeof getApplicationMeta === 'function') ? getApplicationMeta(dominant) : null;

        // Performance class colour bucket
        var perfClass = 'low', perfLabel = 'Standard';
        if (l.total < 0.1)      { perfClass = 'ultra'; perfLabel = 'Ultra-high barrier'; }
        else if (l.total < 1)   { perfClass = 'high';  perfLabel = 'High barrier'; }
        else if (l.total < 10)  { perfClass = 'med';   perfLabel = 'Medium barrier'; }

        var perfColors = { ultra:'#7c3aed', high:'#2563eb', med:'#0891b2', low:'#64748b' };
        var perfBg     = { ultra:'#ede9fe', high:'#eff6ff', med:'#ecfeff', low:'#f1f5f9' };

        html += '<div style="border:1.5px solid var(--border);border-radius:12px;background:#fff;overflow:hidden;transition:box-shadow .15s" onmouseover="this.style.boxShadow=\'0 4px 14px rgba(0,0,0,.08)\'" onmouseout="this.style.boxShadow=\'none\'">' +
            // Top stripe with accent
            '<div style="height:4px;background:' + accent + '"></div>' +
            '<div style="padding:.9rem 1rem">' +
                // Title row + badges
                '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:.6rem">' +
                    '<div style="flex:1;min-width:0">' +
                        '<div style="font-weight:700;font-size:.92rem;color:#0f172a;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical" title="' + _escAttr(l.name) + '">' + _escHtml(l.name) + '</div>' +
                    '</div>' +
                    '<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;flex-shrink:0">' +
                        (domMeta ? '<span class="badge" style="font-size:0.6rem;background:' + domMeta.bg + ';color:' + domMeta.color + ';border:1px solid ' + domMeta.color + '33;white-space:nowrap">' + domMeta.icon + ' ' + domMeta.label + '</span>' : '') +
                        '<span class="sustainability-flag ' + (l.recyclable ? 'yes' : 'no') + '" style="font-size:.6rem;white-space:nowrap">' + (l.recyclable ? '♻ Recyclable' : '⊘ Not recyclable') + '</span>' +
                    '</div>' +
                '</div>' +
                // KPI row
                '<div style="display:flex;align-items:flex-end;gap:14px;padding:.6rem .75rem;background:' + perfBg[perfClass] + ';border-radius:8px;margin-bottom:.55rem">' +
                    '<div style="flex:1">' +
                        '<div style="font-size:.6rem;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em;font-weight:600">' + modeUpper + '</div>' +
                        '<div style="font-size:1.4rem;font-weight:800;color:' + perfColors[perfClass] + ';line-height:1.1;font-variant-numeric:tabular-nums">' + l.total.toFixed(l.total < 0.01 ? 5 : (l.total < 1 ? 4 : 3)) + '</div>' +
                        '<div style="font-size:.62rem;color:var(--text-light)">' + unit + '</div>' +
                    '</div>' +
                    '<div style="text-align:right">' +
                        '<div style="font-size:.6rem;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em;font-weight:600">' + perfLabel + '</div>' +
                        '<div style="font-size:.7rem;color:var(--text-light);margin-top:2px">' + l.temperature + '°C / ' + l.humidity + '% RH</div>' +
                    '</div>' +
                '</div>' +
                // Stats row
                '<div style="display:flex;justify-content:space-between;gap:8px;font-size:.72rem;color:var(--text-light);padding:0 .25rem .35rem">' +
                    '<span><strong style="color:#0f172a">' + nLayers + '</strong> layer' + (nLayers !== 1 ? 's' : '') + '</span>' +
                    '<span><strong style="color:#0f172a">' + (l.totalThickness || 0).toFixed(0) + '</strong> µm total</span>' +
                '</div>' +
                // Expandable layer structure
                (nLayers > 0 ?
                    '<div style="border-top:1px solid var(--border);margin-top:.4rem;padding-top:.55rem">' +
                        '<button onclick="lamToggleExpanded(' + l.id + ')" style="background:none;border:none;padding:0;color:var(--primary);font-size:.72rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;margin-bottom:' + (expanded ? '.5rem' : '0') + '">' +
                            '<span style="display:inline-block;transition:transform .2s;transform:rotate(' + (expanded ? '90' : '0') + 'deg)">▸</span>' +
                            (expanded ? 'Hide structure' : 'Show structure') +
                        '</button>' +
                        (expanded ? _lamLayerListHTML(l, unit) : '') +
                    '</div>' : '') +
                // Action footer
                '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:.6rem;padding-top:.5rem;border-top:1px solid var(--border)">' +
                    '<button class="btn btn-sm btn-outline" onclick="lamLoadIntoCalculator(' + l.id + ')" title="Load this laminate into the Calculator">Load</button>' +
                    '<button class="btn btn-sm btn-danger"  onclick="if(confirm(\'Delete this laminate?\'))DB.deleteLam(' + l.id + '),render()">Delete</button>' +
                '</div>' +
            '</div>' +
            '</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
}

// Load a saved laminate back into the Calculator tab
function lamLoadIntoCalculator(lamId) {
    var lam = null;
    for (var i = 0; i < DB.laminates.length; i++) {
        if (DB.laminates[i].id === lamId) { lam = DB.laminates[i]; break; }
    }
    if (!lam || !lam.layers) return;
    State.mode = lam.mode || State.mode;
    State.layers = JSON.parse(JSON.stringify(lam.layers));
    State.selCond = { temperature: lam.temperature, humidity: lam.humidity };
    State.laminateName = lam.name + ' (copy)';
    State.tab = 'calc';
    DB.saveState(State);
    renderNav();
    renderContent();
    if (typeof postNavRender === 'function') postNavRender();
}

// ====================================================================
// CALC HANDLERS
// ====================================================================
function updateSaveBtn() {
    var name = State.laminateName.trim();
    var btnG = document.getElementById('save-btn-general');
    var btnC = document.getElementById('save-btn-company');
    if (btnG) btnG.disabled = name === '';
    if (btnC) {
        if (!CompanyState.isActive()) {
            btnC.disabled = true;
            btnC.style.opacity = '0.4';
            btnC.style.cursor = 'not-allowed';
            btnC.title = 'Join a company first';
        } else {
            btnC.disabled = name === '';
            btnC.style.opacity = name === '' ? '0.4' : '1';
            btnC.style.cursor = name === '' ? 'not-allowed' : 'pointer';
            btnC.title = 'Save to ' + CompanyState.companyName;
        }
    }
}

function onCondSelect() {
    var sel = document.getElementById('sel-cond');
    if(sel && sel.value){ var parts = sel.value.split('|'); State.selCond = {temperature:parseFloat(parts[0]), humidity:parseFloat(parts[1])};  }
    else State.selCond = null;
    DB.saveState(State);
    if(State.autoCalc) doCalcSilent(); else renderContent();
}

function passesTestMethodFilter(mat) {
    if(!State.selectedTestMethod) return true;
    var filter = State.selectedTestMethod.trim().toLowerCase();
    var topTM = State.mode === 'wvtr' ? (mat.testMethodWVTR || mat.testMethod || '') : (mat.testMethodOTR || mat.testMethod || '');
    if(topTM && topTM.trim().toLowerCase() === filter) return true;
    var vals = State.mode === 'wvtr' ? (mat.wvtrValues || []) : (mat.otrValues || []);
    for(var i = 0; i < vals.length; i++) {
        if(vals[i] && vals[i].testMethod && vals[i].testMethod.trim().toLowerCase() === filter) return true;
    }
    return false;
}

function onTestMethodFilterChange(value) {
    State.selectedTestMethod = value || '';
    DB.saveState(State);
    renderContent();
}

function onMatSourceChange(val) {
    State.matSource = val || 'general';
    if (val === 'company') {
        loadCompanyMaterials().then(function(mats) {
            DB.materials = DB.materials.filter(function(m){ return !m.isCompany; });
            mats.forEach(function(m){ DB.materials.push(m); });
            renderContent();
        });
    } else {
        DB.materials = DB.materials.filter(function(m){ return !m.isCompany; });
        renderContent();
    }
}

function onLayerChange(i, field, val) {
    if(field === 'mid') {
        if(val !== '') {
            var numVal = parseFloat(val);
            State.layers[i].mid = isNaN(numVal) ? val : numVal;
            recordMaterialUsage(val);
        } else {
            State.layers[i].mid = null;
        }
    } else {
        State.layers[i].thick = parseFloat(val) || 0;
    }
    DB.saveState(State);
    if(State.autoCalc) doCalcSilent(); else renderContent();
}

function addLayer() { State.layers.push({mid:null, thick:0}); DB.saveState(State); renderContent(); }
function rmLayer(i) { if(State.layers.length <= 1) return; State.layers.splice(i,1); DB.saveState(State); renderContent(); }
function toggleAutoCalc() { State.autoCalc = !State.autoCalc; renderContent(); }

function doCalc() {
    if(!State.selCond){ State.calcError='Select conditions first'; State.calcResult=null; renderContent(); return; }
    if(!State.layers.every(function(l){ return l.mid!==null && l.thick>0; })){ State.calcError='Complete all layers'; State.calcResult=null; renderContent(); return; }
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    if(common.error){ State.calcError=common.error; State.calcResult=null; renderContent(); return; }
    var result = Engine.calcTotal(State.layers, DB.materials, State.selCond);
    if(result.error){ State.calcError=result.error; State.calcResult=null; }
    else { State.calcResult=result; State.calcError=null; }
    renderContent();
    if(State.calcResult && !State.calcResult.error) setTimeout(postCalcRender, 150);
}

function doCalcSilent() {
    if(!State.selCond) return;
    if(!State.layers.every(function(l){ return l.mid!==null && l.thick>0; })) return;
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    if(common.error) return;
    var result = Engine.calcTotal(State.layers, DB.materials, State.selCond);
    if(!result.error){ State.calcResult=result; State.calcError=null; renderContent(); setTimeout(postCalcRender, 150); }
}

function doSaveLam() {
    var name = State.laminateName.trim();
    if(!name){ alert('Enter a name'); return; }
    if(!State.calcResult || State.calcResult.total <= 0){ alert('Calculate first'); return; }
    var tt = 0;
    for(var i=0; i<State.layers.length; i++) tt += (State.layers[i].thick || 0);
    var rec = Engine.checkRecyclability(State.layers, DB.materials);
    DB.addLam({name:name, total:State.calcResult.total, totalThickness:tt, humidity:State.selCond.humidity, temperature:State.selCond.temperature, mode:State.mode, recyclable:rec.recyclable, monoStructure:rec.monoStructure, layerCount:State.layers.length, layers:JSON.parse(JSON.stringify(State.layers))});
    State.laminateName = '';
    var nameEl = document.getElementById('lam-name'); if(nameEl) nameEl.value = '';
    var btn = document.getElementById('save-btn'); if(btn) btn.disabled = true;
    var fb = document.getElementById('save-feedback');
    if(fb) fb.innerHTML = '<div class="alert alert-success" style="margin-top:.5rem">Saved!</div>';
    setTimeout(function(){ var f=document.getElementById('save-feedback'); if(f) f.innerHTML=''; }, 3000);
}

// ====================================================================
// ARRHENIUS HANDLERS
// ====================================================================
function onArrEaChange() { onArrChange(); }

function postArrheniusRender() {
    setTimeout(function() {
        var sel = document.getElementById('arr-mat');
        var resEl = document.getElementById('arr-result');
        if(!sel) return;
        if(!sel.value) {
            if(resEl) resEl.innerHTML = '<div class="alert alert-info"><strong>Select a material to begin Arrhenius analysis</strong></div>';
            return;
        }
        onArrChange();
    }, 100);
}

function onArrChange() {
    // FIX: sync Engine.mode
    Engine.mode = State.mode;

    var selMat = document.getElementById('arr-mat');
    var selTemp = document.getElementById('arr-temp');
    var selEa = document.getElementById('arr-ea');
    var resEl = document.getElementById('arr-result');
    if(!selMat || !selTemp) return;
    var matId = selMat.value;
    var targetTemp = parseFloat(selTemp.value) || 25;
    if(selEa && matId !== onArrChange._lastMatId) {
        selEa.value = '';
        onArrChange._lastMatId = matId;
    }
    var customEaInput = selEa ? selEa.value.trim() : '';
    var customEa = customEaInput ? parseFloat(customEaInput) : NaN;
    if(!matId) {
        if(resEl) resEl.innerHTML = '';
        if(selEa) selEa.value = '';
        return;
    }
    var mat = findMaterialById(matId);
    if(!mat) return;
    if(!mat.validConditions || mat.validConditions.length === 0) {
        if(resEl) resEl.innerHTML = '<div class="alert alert-error">No valid conditions found for this material.</div>';
        return;
    }

    var unit  = getUnit();
    var label = getLabel();

    var A, EaUsed, rSquared = 1, warn = '', relClass = 'reliability-medium';
    if(isNaN(customEa) || customEa <= 0) {
        var v = Engine.validateArrhenius(mat);
        if(!v.valid){ if(resEl) resEl.innerHTML='<div class="alert alert-error">'+v.error+'</div>'; return; }
        var r = Engine.calcArrheniusParams(mat);
        if(!r.valid){ if(resEl) resEl.innerHTML='<div class="alert alert-error">'+r.error+'</div>'; return; }
        if(selEa) selEa.value = (r.Ea/1000).toFixed(2);
        EaUsed = r.Ea; A = r.A; rSquared = r.rSquared;
        relClass = rSquared > 0.95 ? 'reliability-high' : rSquared > 0.8 ? 'reliability-medium' : 'reliability-low';
    } else {
        EaUsed = customEa * 1000;
        var vals = Engine.getValues(mat);
        var R = Engine.R_GAS;
        var lnA_values = [];
        for(var i=0; i<mat.validConditions.length; i++){
            var tk = mat.validConditions[i].temperature + 273.15;
            if(vals[i] && vals[i].value > 0) lnA_values.push(Math.log(vals[i].value) + EaUsed/(R*tk));
        }
        if(lnA_values.length > 0){
            var lnA_mean = lnA_values.reduce(function(a,b){return a+b;},0) / lnA_values.length;
            A = Math.exp(lnA_mean);
            warn = '<div class="alert alert-warning">Using custom Ea = '+customEa.toFixed(2)+' kJ/mol</div>';
            relClass = 'reliability-low';
        } else { if(resEl) resEl.innerHTML='<div class="alert alert-error">Cannot calculate A with custom Ea</div>'; return; }
    }
    var pred = Engine.predict(A, EaUsed, targetTemp);
    var minT = mat.validConditions[0].temperature, maxT = mat.validConditions[0].temperature;
    for(var i2=0; i2<mat.validConditions.length; i2++){ var t=mat.validConditions[i2].temperature; if(t<minT) minT=t; if(t>maxT) maxT=t; }
    var isExtrapolation = targetTemp < minT-1 || targetTemp > maxT+1;
    if(isExtrapolation) warn += '<div class="alert alert-warning">Extrapolation outside measured range ('+minT.toFixed(0)+'-'+maxT.toFixed(0)+'C)</div>';
    if(resEl) {
        resEl.innerHTML = warn +
            '<div class="reliability-meter '+relClass+'">' + (customEaInput==='' ? 'R2='+(rSquared).toFixed(4)+' ' : '') + 'Ea='+(EaUsed/1000).toFixed(2)+' kJ/mol</div>' +
            '<div class="grid grid-3" style="margin-top:.4rem">' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Activation Energy</div><div style="font-weight:700">'+(EaUsed/1000).toFixed(2)+' kJ/mol</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Pre-exponential A</div><div style="font-weight:700">'+A.toExponential(3)+'</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Predicted at '+targetTemp+'°C</div><div style="font-size:1rem;font-weight:700;color:var(--primary)">'+pred.toFixed(6)+' '+unit+'</div></div>' +
            '</div>';
    }
    var dataPoints = [];
    var vals2 = Engine.getValues(mat);
    for(var i3=0; i3<mat.validConditions.length; i3++){
        if(vals2[i3] && vals2[i3].value > 0 && mat.validConditions[i3]) dataPoints.push({T_K: mat.validConditions[i3].temperature+273.15, trans: vals2[i3].value});
    }
    drawArrTempChart(mat, {A:A, Ea:EaUsed, predicted:pred, targetTempC:targetTemp, minTemp:minT, maxTemp:maxT, isExtrapolation:isExtrapolation, dataPoints:dataPoints, rSquared:rSquared}, customEaInput !== '');
    drawArrLinChart(mat, {A:A, Ea:EaUsed, dataPoints:dataPoints, rSquared:rSquared}, customEaInput !== '');
}

// ====================================================================
// SENSITIVITY HANDLERS
// ====================================================================
function onSensChange() {
    State.sensLayerIdx = parseInt(document.getElementById('sens-layer') ? document.getElementById('sens-layer').value : '0');
    drawSensitivityChart();
}

function postSensitivityRender() {
    if(State.layers.some(function(l){ return l.mid !== null; })) setTimeout(function(){ drawSensitivityChart(); doOptimize(); }, 100);
}

function doOptimize() {
    // FIX: sync Engine.mode
    Engine.mode = State.mode;

    var target = parseFloat(document.getElementById('opt-target') ? document.getElementById('opt-target').value : '0.5');
    var barrierIdx = parseInt(document.getElementById('opt-layer') ? document.getElementById('opt-layer').value : '0');
    var resEl = document.getElementById('opt-result'); if(!resEl) return;
    if(barrierIdx < 0 || barrierIdx >= State.layers.length) {
        resEl.innerHTML = '<div class="alert alert-warning">Invalid layer selection.</div>';
        return;
    }
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    var condition = State.selCond || (common.conditions && common.conditions[0]);
    if(!condition || !State.layers.every(function(l){ return l.mid!==null && l.thick>0; })){
        resEl.innerHTML = '<div class="alert alert-info">Configure and calculate first</div>'; return;
    }
    var barrierLayer = State.layers[barrierIdx];
    var barrierMat = findMaterialById(barrierLayer.mid);
    if(barrierMat && barrierMat.isMetallized){
        resEl.innerHTML = '<div class="alert alert-warning"><strong>Optimization not applicable:</strong> For metallized/coated films, barrier performance is independent of substrate thickness.</div>';
        return;
    }
    var result = Engine.optimizeForTarget(State.layers, DB.materials, condition, target, barrierIdx);
    if(result.error){ resEl.innerHTML='<div class="alert alert-warning">'+result.error+'</div>'; return; }
    var mat = findMaterialById(State.layers[barrierIdx].mid);
    var current = State.layers[barrierIdx].thick;
    var unit = getUnit();
    var label = getLabel();
    resEl.innerHTML = '<div class="alert alert-success">' +
        'To achieve target '+label+' <= '+target+' '+unit+' @ '+condition.temperature+'°C/'+condition.humidity+'%: ' +
        '<strong>'+((mat)?mat.name:'Layer '+(barrierIdx+1))+'</strong> min: <span style="color:var(--primary);font-weight:700">'+result.thickness.toFixed(1)+' um</span>' +
        ' ('+current+' → '+result.thickness.toFixed(1)+'um, '+(result.thickness<current?'✓ Savings':'⚠ Increase needed')+')' +
        '</div>';
}

// ====================================================================
// COMPARE HANDLERS
// ====================================================================
function toggleCompare(id) {
    var idx = State.compareIds.indexOf(id);
    if(idx >= 0) State.compareIds.splice(idx,1);
    else if(State.compareIds.length < 3) State.compareIds.push(id);
    renderContent(); postCompareRender();
}

function postCompareRender() {
    if(State.compareIds.length < 1) return;
    var filteredLams = DB.laminates.filter(function(l){ return l.mode === State.mode; });
    State.compareIds = State.compareIds.filter(function(id){
        return filteredLams.some(function(l){ return l.id === id; });
    });
    if(State.compareIds.length < 1) return;
    var selected = [];
    for(var i=0; i<filteredLams.length; i++) if(State.compareIds.indexOf(filteredLams[i].id) >= 0) selected.push(filteredLams[i]);
    var unit = getUnit();
    var tableEl = document.getElementById('compare-table');
    if(tableEl && selected.length > 0){
        var modeLabel = (selected[0].mode || State.mode).toUpperCase();
        var th = '<thead><tr><th>Parameter</th>';
        for(var j=0; j<selected.length; j++) th+='<th>'+selected[j].name+'</th>';
        th+='</tr></thead>';
        var body = '<tbody>';
        body += '<tr><td><strong>'+modeLabel+'</strong></td>';
        for(var j2=0; j2<selected.length; j2++) body+='<td>'+selected[j2].total.toFixed(4)+' '+unit+'</td>';
        body+='</tr>';
        body += '<tr><td><strong>Thickness</strong></td>';
        for(var j3=0; j3<selected.length; j3++) body+='<td>'+selected[j3].totalThickness.toFixed(0)+' um</td>';
        body+='</tr>';
        body += '<tr><td><strong>Conditions</strong></td>';
        for(var j4=0; j4<selected.length; j4++) body+='<td>'+selected[j4].temperature+'°C / '+selected[j4].humidity+'%</td>';
        body+='</tr>';
        body += '<tr><td><strong>Recyclable</strong></td>';
        for(var j5=0; j5<selected.length; j5++) body+='<td><span class="sustainability-flag '+((selected[j5].recyclable)?'yes':'no')+'">'+(selected[j5].recyclable?'Yes':'No')+'</span></td>';
        body+='</tr>';
        body += '</tbody>';
        tableEl.innerHTML = '<div class="card"><h2>Comparison Table</h2><table class="cond-table">'+th+body+'</table></div>';
    }
    if(selected.length >= 2){
        var canvas = document.getElementById('compareChart'); if(!canvas) return;
        destroyChart('compare');
        var ctx = canvas.getContext('2d');
        var modeLabel2 = (selected[0].mode || State.mode).toUpperCase();
        var labels=[], vals=[], colors=[];
        for(var j6=0; j6<selected.length; j6++){ labels.push(selected[j6].name); vals.push(selected[j6].total); colors.push(LAYER_COLORS[j6%LAYER_COLORS.length]); }
        chartInstances.compare = new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{label:modeLabel2,data:vals,backgroundColor:colors,borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:unit}},x:{title:{display:true,text:'Laminates'}}}}});
    }
}

// ====================================================================
// MISC HELPERS
// ====================================================================
function findMaterialById(id) {
    if(id === null || id === undefined) return null;
    var sid = String(id);
    for(var i = 0; i < DB.materials.length; i++) {
        if(String(DB.materials[i].id) === sid) return DB.materials[i];
    }
    return null;
}

function searchMaterialWeb(matName) {
    var encoded = encodeURIComponent(matName);
    Modal.open('Search Online: '+matName,
        '<p style="font-size:.82rem;color:var(--text-light);margin-bottom:1rem">Search for WVTR/OTR datasheets:</p>' +
        '<div class="grid grid-2" style="gap:.75rem">' +
        '<a href="https://scholar.google.com/scholar?q='+encoded+'+WVTR+OTR+datasheet" target="_blank" class="btn btn-primary" style="text-decoration:none;justify-content:center">Google Scholar</a>' +
        '<a href="https://www.google.com/search?q='+encoded+'+WVTR+permeability" target="_blank" class="btn btn-outline" style="text-decoration:none;justify-content:center">Google Search</a>' +
        '</div>',
        function(){ return true; }
    );
}

function getCommunityCount() {
    return DB.materials.filter(function(m){
        return m.isCommunity || String(m.id).indexOf('fb_') === 0;
    }).length;
}
