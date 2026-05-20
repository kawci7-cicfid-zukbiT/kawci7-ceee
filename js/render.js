// ====================================================================
// 🎨 RENDER.JS - All page render functions
// Dependencies: engine.js, app.js (State, DB, Engine, getUnit, getLabel,
//               rStr, formatWithSigFigs, getDisplayPrecision, LAYER_COLORS,
//               destroyChart, chartInstances, postCalcRender, postArrheniusRender,
//               postSensitivityRender, postCompareRender, drawLamChart)
// ====================================================================


// ====================================================================
// 🏠 HOME
// ====================================================================
function renderHome() {
    var totalMats = DB.materials.length;
    var totalLams = DB.laminates.length;
    var multiTempMats = 0;
    for(var i = 0; i < DB.materials.length; i++) {
        if(Engine.validateArrhenius(DB.materials[i]).valid) multiTempMats++;
    }
    var commCount = getCommunityCount();

    return `
<div class="home-bg-glow"></div>
<div style="max-width:1100px;margin:0 auto;padding:0 0.5rem; position:relative; z-index:10;">
        <!-- HERO -->
        <div style="padding:3rem 2rem 2.5rem;margin-bottom:2rem;border-bottom:1px solid #e2e8f0">
            <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem">
                <div>
                    <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;color:#2563eb;text-transform:uppercase;margin-bottom:0.6rem">
                        Packaging Engineering Tool
                    </div>
                    <h1 style="font-size:2.4rem;font-weight:800;color:#0f172a;line-height:1.15;margin:0 0 0.75rem 0;letter-spacing:-0.03em">
                        WVTR / OTR<br>Calculator
                    </h1>
                    <p style="font-size:0.95rem;color:#64748b;margin:0;max-width:480px;line-height:1.6">
                        Professional barrier analysis for multilayer packaging structures.
                        Resistance model, Arrhenius prediction, shelf life estimation.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('nav-tabs').querySelector('[data-tab=calc]').click()"
                    style="background:#2563eb;color:#fff;border:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;letter-spacing:0.01em;transition:background 0.2s;white-space:nowrap"
                    onmouseover="this.style.background='#1d4ed8'"
                    onmouseout="this.style.background='#2563eb'">
                    Start Calculation →
                </button>
            </div>
        </div>

        <!-- KPI ROW -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2e8f0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">
            <div style="background:#fff;padding:1.75rem 1.5rem">
                <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Total Materials</div>
                <div style="font-size:2.8rem;font-weight:800;color:#2563eb;line-height:1;margin-bottom:0.4rem">${totalMats}</div>
                <div style="font-size:0.78rem;color:#94a3b8">In the database</div>
                <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9">
                    <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=materials]').click()"
                        style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">
                        Explore database →
                    </button>
                </div>
            </div>
            <div style="background:#fff;padding:1.75rem 1.5rem">
                <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Arrhenius Ready</div>
                <div style="font-size:2.8rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.4rem">${multiTempMats}</div>
                <div style="font-size:0.78rem;color:#94a3b8">Multi-temperature datasets</div>
                <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9">
                    <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=arrhenius]').click()"
                        style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">
                        Run analysis →
                    </button>
                </div>
            </div>
            <div style="background:#fff;padding:1.75rem 1.5rem">
                <div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Saved Laminates</div>
                <div style="font-size:2.8rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.4rem">${totalLams}</div>
                <div style="font-size:0.78rem;color:#94a3b8">Structures in your library</div>
                <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9">
                    <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=laminates]').click()"
                        style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">
                        View library →
                    </button>
                </div>
            </div>
        </div>

        <!-- TOP 3 + CAPABILITIES -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
                    <div>
                        <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">This Month</div>
                        <div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin-top:0.15rem">Most Used Materials</div>
                    </div>
                    <div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div>
                </div>
                <div id="top3-ranking" style="padding:0.5rem 0">
                    <div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">Loading rankings...</div>
                </div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
                <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9">
                    <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Platform</div>
                    <div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin-top:0.15rem">Core Capabilities</div>
                </div>
                <div style="padding:0.5rem 0">
                    ${[
                        { label: 'Multilayer Resistance Model', desc: 'Series resistance calculation per ISO/ASTM' },
                        { label: 'Arrhenius Temperature Fit', desc: 'R² validated prediction at untested temperatures' },
                        { label: 'Shelf Life Engine', desc: 'GAB isotherm + oxidation kinetics' },
                        { label: 'Sensitivity & Optimization', desc: 'Thickness sweep and cost optimizer' },
                    ].map(f => `
                        <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;border-bottom:1px solid #f8fafc">
                            <div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div>
                            <div>
                                <div style="font-size:0.82rem;font-weight:600;color:#0f172a">${f.label}</div>
                                <div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">${f.desc}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- FOOTER NOTE -->
        <div style="padding:1.5rem 0;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
            <div style="font-size:0.72rem;color:#94a3b8;line-height:1.4">
                <strong style="color:#64748b">Disclaimer:</strong> For R&D and engineering use only.
                Results require laboratory validation per ASTM F1249 / ISO 15106 standards.
            </div>
            <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
                <a href="mailto:wvtrotrcalculator@gmail.com?subject=Feedback%20-%20WVTR%2FOTR%20Calculator"
                   style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;color:#2563eb;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;padding:0.3rem 0.65rem;border-radius:6px;transition:all 0.2s"
                   onmouseover="this.style.background='#dbeafe'"
                   onmouseout="this.style.background='#eff6ff'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,12 2,6"/>
                    </svg>
                    Send Feedback
                </a>
            </div>
        </div>
    </div>
    `;
}

// ====================================================================
// 🧮 CALCULATOR
// ====================================================================
function renderCalc() {
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    var hasMats = State.layers.some(function(l){ return l.mid !== null; });

    var cardHeader = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">' +
        '<h2 style="margin:0;display:flex;align-items:center;gap:0.4rem">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary)">' +
                '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/>' +
            '</svg>Laminate Structure</h2>' +
        '<button class="btn btn-sm btn-danger" onclick="clearProject()" title="Cancel current calculation and clear all layers" style="display:inline-flex;align-items:center">Cancel</button>' +
        '</div>';

    // Build test method filter options
    var testMethods = {};
    for(var i=0; i<DB.materials.length; i++){
        var m = DB.materials[i];
        var currentTM = State.mode === 'wvtr' ? (m.testMethodWVTR || '') : (m.testMethodOTR || '');
        if(currentTM && currentTM.trim() !== '') testMethods[currentTM.trim()] = true;
    }
    var tmOpts = '<option value="">All test methods</option>';
    var tmList = Object.keys(testMethods).sort();
    for(var t=0; t<tmList.length; t++){
        var sel = State.selectedTestMethod === tmList[t] ? ' selected' : '';
        var escaped = tmList[t].replace(/"/g,'&quot;');
        var count = DB.materials.filter(function(m){
            return (m.testMethodWVTR === tmList[t] || m.testMethodOTR === tmList[t]) &&
                   Engine.findCommonConditions(State.layers, [m], tmList[t]).conditions.length > 0;
        }).length;
        tmOpts += '<option value="'+escaped+'"'+sel+'>'+tmList[t]+' ('+count+')</option>';
    }
    var testMethodFilter =
        '<div class="form-group" style="margin-top:0.5rem">' +
            '<label style="display:flex;align-items:center;gap:0.3rem">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px">' +
                    '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>' +
                    '<line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>' +
                '</svg>Filter by Test Method</label>' +
            '<select class="form-input" id="filter-testmethod" onchange="onTestMethodFilterChange(this.value)">'+tmOpts+'</select>' +
            '<span style="font-size:0.65rem;color:var(--text-light)">Show only materials tested with the same standard</span>' +
        '</div>';

    // Build conditions HTML
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
        for(var ci = 0; ci < uniqueConditions.length; ci++){
            var c = uniqueConditions[ci];
            var selAttr = State.selCond && State.selCond.temperature === c.temperature && State.selCond.humidity === c.humidity ? ' selected' : '';
            opts += '<option value="'+c.temperature+'|'+c.humidity+'"'+selAttr+'>'+c.temperature+'\u00b0C / '+c.humidity+'%</option>';
        }
        condHTML = '<div class="form-group"><label>Test Conditions</label><select class="form-input" id="sel-cond" onchange="onCondSelect()">'+opts+'</select></div>';
    }

    // Build layers HTML
    var layersHTML = '';
    for(var i=0; i<State.layers.length; i++){
        var l = State.layers[i];
        var res = State.calcResult && State.calcResult.layers ? State.calcResult.layers[i] : null;

        // Filter materials for this layer
        var filteredMats = DB.materials.filter(function(mat){ return passesTestMethodFilter(mat); });
        filteredMats.sort(function(a, b){ return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}); });

        // Compatibility filter with other layers
        var otherMats = [];
        for(var k=0; k<State.layers.length; k++){
            if(k !== i && State.layers[k].mid !== null){
                var matOther = DB.materials.find(function(m){ return m.id === State.layers[k].mid; });
                if(matOther) otherMats.push(matOther);
            }
        }
        var reqConds = [];
        if(otherMats.length > 0){
            reqConds = [].concat(otherMats[0].validConditions || []);
            for(var om=1; om<otherMats.length; om++){
                var nc = otherMats[om].validConditions || [];
                reqConds = reqConds.filter(function(c){
                    return nc.some(function(n){
                        return Math.abs(n.temperature-c.temperature)<0.01 && Math.abs(n.humidity-c.humidity)<0.01;
                    });
                });
            }
        }
        var displayMats = filteredMats;
        if(reqConds.length > 0){
            displayMats = filteredMats.filter(function(mat){
                var vc = mat.validConditions || [];
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
            var label = mat.name;
            var currentTM = State.mode === 'wvtr' ? (mat.testMethodWVTR || '') : (mat.testMethodOTR || '');
            if(currentTM) label += ' ['+currentTM+']';
            var selected = (l.mid === mat.id) ? ' selected' : '';
            matOpts += '<option value="'+mat.id+'"'+selected+'>'+label+'</option>';
        }

        layersHTML += '<div class="layer-card"><span class="layer-badge">LAYER '+(i+1)+'</span>' +
            '<div class="layer-grid">' +
            '<div class="form-group" style="margin:0"><label>Material</label><select class="form-input" onchange="onLayerChange('+i+',\'mid\',this.value)">'+matOpts+'</select></div>' +
            '<div class="form-group" style="margin:0"><label>Thickness (µm)</label><input type="number" step="any" class="form-input" value="'+(l.thick||'')+'" placeholder="0" onchange="onLayerChange('+i+',\'thick\',this.value)"></div>' +
            '<div style="display:flex;align-items:center;gap:.3rem">'+(i>0 ? '<button class="btn btn-sm btn-danger" onclick="rmLayer('+i+')">X</button>' : '')+
            (res && res.transmissionAtThickness > 0 ? '<span class="badge badge-green">'+res.transmissionAtThickness.toFixed(3)+'</span>' : '')+
            (res && res.isBarrier ? '<span class="badge badge-purple">BARRIER</span>' : '')+
            '</div></div>'+
            (res ? '<div style="margin-top:.35rem;font-size:.68rem;color:var(--text-light)">R: '+rStr(res.resistance)+' - '+res.resistancePct.toFixed(1)+'%</div>' : '')+
            '</div>';
    }

    var selectedCond = State.selCond ? State.selCond.temperature+'\u00b0C/'+State.selCond.humidity+'%' : null;
    var canCalc = !!selectedCond && State.layers.every(function(l){ return l.mid !== null && l.thick > 0; });
    var hasResult = State.calcResult && !State.calcResult.error && State.calcResult.total > 0;

    // Build result HTML
    var resultHTML = '';
    if(State.calcError) {
        resultHTML = '<div class="alert alert-error">'+State.calcError+'</div>';
    } else if(hasResult){
        var prec = getDisplayPrecision();
        resultHTML = '<div class="result-card fade-in"><div class="result-value">'+formatWithSigFigs(State.calcResult.total, prec)+'</div><div class="result-unit">'+getUnit()+'</div></div>';
        var detail = '';
        for(var r=0; r<State.calcResult.layers.length; r++){
            var rl = State.calcResult.layers[r];
            var prec2 = getDisplayPrecision();
            detail += '<div><strong>'+rl.materialName+'</strong> ('+rl.thickness+'µm): '+getLabel()+' = '+formatWithSigFigs(rl.transmissionAtThickness, prec2)+' '+getUnit()+' • R='+formatWithSigFigs(rl.resistance, prec2)+' • '+rl.resistancePct.toFixed(1)+'%</div>';
        }
        detail += '<div style="padding-top:.25rem;border-top:2px solid #93c5fd;margin-top:.25rem"><strong>Total R:</strong> '+rStr(State.calcResult.totalResistance)+'</div>';
        resultHTML += '<div class="result-detail">'+detail+'</div>';
    }

    // Hygroscopic warning
    if(hasResult && State.calcResult.layers) {
        var hygroWarnings = [];
        for(var r = 0; r < State.calcResult.layers.length; r++) {
            var lr = State.calcResult.layers[r];
            if(lr.hygroCorrection && lr.hygroCorrection.isSignificant) hygroWarnings.push(lr.hygroCorrection.message);
        }
        if(hygroWarnings.length > 0) {
            var warningsHTML = hygroWarnings.map(function(w) {
                return '<div style="display:block; margin:0.15rem 0; line-height:1.3">• ' + w + '</div>';
            }).join('');
            resultHTML += `<div class="alert alert-warning" style="margin-top:0.75rem; display:flex; gap:0.4rem; align-items:flex-start; font-size:0.75rem">
                <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;margin-top:2px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div style="flex:1">
                    <strong style="display:block; margin-bottom:0.2rem">Hygroscopic correction applied:</strong>
                    ${warningsHTML}
                    <div style="margin-top:0.4rem; font-size:0.68rem; color:var(--text-light); border-top:1px solid rgba(0,0,0,0.1); padding-top:0.3rem">
                        β correction based on external RH vs material reference conditions
                    </div>
                </div>
            </div>`;
        }
    }

    return '<div class="grid grid-2">' +
        '<div><div class="card">'+cardHeader+testMethodFilter+layersHTML+
        '<button class="btn btn-outline btn-full" onclick="addLayer()"'+(State.layers.length>0 && State.layers[State.layers.length-1].mid===null ? ' disabled' : '')+'>+ Add Layer</button></div>'+
        '<div class="card"><h2>Test Conditions</h2>'+condHTML+
        (selectedCond ? '<p style="font-size:.75rem;color:var(--text-light);margin-top:.5rem">Selected: <strong>'+selectedCond+'</strong></p>' : '')+
        '<div style="display:flex;align-items:center;gap:.4rem;margin:.5rem 0">'+
        '<div onclick="toggleAutoCalc()" style="width:36px;height:20px;background:'+(State.autoCalc?'var(--primary)':'var(--border)')+';border-radius:10px;position:relative;cursor:pointer"><div style="position:absolute;top:2px;'+(State.autoCalc?'right:2px':'left:2px')+';width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s"></div></div>'+
        '<span style="font-size:.75rem;color:var(--text-light)">Auto-calculate</span></div>'+
        '<button class="btn btn-danger btn-full" onclick="doCalc()"'+(canCalc?'':' disabled')+'>Calculate '+getLabel()+'</button></div></div>'+
        '<div><div class="card"><h2>Result</h2>'+(resultHTML||'<p style="color:var(--text-light);font-size:.8rem;text-align:center;padding:1.5rem">Configure layers and calculate</p>')+'</div>'+
        (hasResult ? '<div class="card" id="hygro-card" style="display:none"><h2>Time-Dependent barrier integrity</h2><p style="font-size:0.75rem;color:var(--text-light);margin-bottom:0.5rem">WVTR increases as material absorbs moisture</p><div class="chart-container" style="min-height:280px"><canvas id="hygroTimeChart"></canvas></div></div>' : '')+
        (hasResult ? '<div class="card"><h2>'+getLabel()+' vs Temperature</h2><div class="chart-container"><canvas id="lamCurveChart"></canvas></div><div id="lamCurveLegend" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;justify-content:center"></div></div>'+
        '<div class="card"><h2>Save Laminate</h2><div style="display:flex;gap:.4rem;align-items:flex-end">'+
        '<div class="form-group" style="flex:1;margin:0"><label>Name</label><input type="text" class="form-input" id="lam-name" value="'+State.laminateName+'" placeholder="Name..." oninput="State.laminateName=this.value;updateSaveBtn()"></div>'+
        '<button class="btn btn-primary" id="save-btn" onclick="doSaveLam()">Save</button></div><div id="save-feedback"></div></div>' : '')+
        '</div></div>' +
        renderCalcMethodology();
}

// ====================================================================
// 📚 CALCULATOR METHODOLOGY
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
<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
R<sub>total</sub> = R<sub>layer1</sub> + R<sub>layer2</sub> + ... + R<sub>layerN</sub><br><br>
Final Permeability (WVTR or OTR) = 1 / R<sub>total</sub>
</div>
<div style="background:#f0fdf4; padding:1rem; border-radius:8px; border-left:3px solid var(--success); margin:1.2rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong style="color:#16a34a; font-size:0.95rem;">A Step-by-Step example:</strong><br>
Let's calculate the final WVTR of a simple two-layer pouch made of <strong>PET (12 µm)</strong> and <strong>LDPE (50 µm)</strong>:<br>
<ul>
  <li><strong>Layer 1 (PET 12 µm):</strong> R<sub>PET</sub> = 12 / (30.0 × 12) = <strong>0.0333</strong></li>
  <li><strong>Layer 2 (LDPE 50 µm):</strong> R<sub>LDPE</sub> = 50 / (4.0 × 25) = <strong>0.5000</strong></li>
  <li><strong>Total:</strong> R<sub>total</sub> = 0.5333 → WVTR = <strong style="color:#111;">1.87 g/m²·day</strong></li>
</ul>
</div>
<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Hygroscopic dynamics</h3>
<p>Some premium barrier materials, like EVOH or Polyamides (Nylon), are highly sensitive to water vapor. The calculator applies an exponential scaling factor:</p>
<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
Corrected Permeability = Permeability<sub>base</sub> × e<sup>&beta; × (&Delta;RH)</sup>
</div>
<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Metallized and coated shields</h3>
<p>Metallized films (such as MET-PET) and nanometric ceramic coatings follow entirely different physical rules. Their barrier performance does not come from the bulk polymer thickness, but rather from an ultra-thin, atomic layer deposited onto the surface. The calculator treats these as having a fixed, constant permeability barrier.</p>
<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">Reading your analysis matrix</h3>
<table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
  <thead><tr style="background:#f1f5f9; border-bottom:2px solid var(--border);"><th style="padding:0.6rem; text-align:left;">Layer Resistance %</th><th style="padding:0.6rem; text-align:left;">Physical Meaning</th><th style="padding:0.6rem; text-align:left;">Design Action</th></tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid var(--border);"><td style="padding:0.6rem; font-weight:bold; color:var(--danger);">&gt; 50%</td><td>Primary Line of Defense</td><td>Tweaking this material yields maximum return.</td></tr>
    <tr style="border-bottom:1px solid var(--border);"><td style="padding:0.6rem; font-weight:bold; color:var(--warning);">20% – 50%</td><td>Significant Contributor</td><td>Balance its thickness to manage costs.</td></tr>
    <tr><td style="padding:0.6rem; font-weight:bold; color:var(--success);">&lt; 10%</td><td>Minor Barrier Role</td><td>Do not increase thickness for barrier reasons.</td></tr>
  </tbody>
</table>
<div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
<strong>Industrial Protocol Disclaimer:</strong> This methodology is built to support engineering design and educational workflows. For commercial legal specifications or regulatory packaging claims, model predictions must always be verified by empirical testing executed under ASTM F1249, ASTM D3985, or ISO 15106.
</div>
</div>
</div>
</div>
`;
}

// ====================================================================
// 🌡️ ARRHENIUS
// ====================================================================
function renderArrhenius() {
    var validCount = 0;
    var opts = '<option value="">Select a multi-temp material...</option>';
    for(var i = 0; i < DB.materials.length; i++) {
        var mat = DB.materials[i];
        var v = Engine.validateArrhenius(mat);
        if(v.valid) {
            var r = Engine.calcArrheniusParams(mat);
            var r2 = r.valid ? r.rSquared.toFixed(3) : '-';
            opts += '<option value="' + mat.id + '">' + mat.name + ' [R²=' + r2 + ']</option>';
            validCount++;
        }
    }
    var infoText = validCount > 0
        ? validCount + ' materials available for prediction'
        : 'No materials with multi-temperature data found';

    return '<div class="card"><h2>Arrhenius Analysis</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">' +
        'Predict ' + getLabel() + ' at unmeasured temperatures using the Arrhenius equation. ' +
        '<span style="color:' + (validCount > 0 ? 'var(--success)' : 'var(--danger)') + ';font-weight:600">' + infoText + '</span>' +
        '</p>' +
        '<div class="grid grid-2">' +
            '<div class="form-group"><label>Material (multi-temp only)</label><select class="form-input" id="arr-mat" onchange="onArrChange()">' + opts + '</select></div>' +
            '<div class="form-group"><label>Target Temperature (°C)</label><input type="number" step="any" class="form-input" id="arr-temp" value="25" oninput="onArrChange()"></div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:0.5rem;padding:0.6rem;background:var(--primary-light);border-radius:8px">' +
            '<label style="display:flex;align-items:center;gap:0.3rem;font-weight:600"><span>Eₐ Activation Energy (kJ/mol)</span></label>' +
            '<input type="number" step="any" class="form-input" id="arr-ea" value="" placeholder="Auto-calculated or enter custom value" oninput="onArrEaChange()">' +
            '<span style="font-size:0.65rem;color:var(--text-light);display:block;margin-top:0.25rem">Leave empty to auto-calculate from material data, or enter a custom value for "what-if" analysis</span>' +
        '</div>' +
        '<div id="arr-result"></div></div>' +
        '<div class="grid grid-2">' +
            '<div class="card"><h2>' + getLabel() + ' vs Temperature</h2><div class="chart-container"><canvas id="arrTempCanvas"></canvas></div></div>' +
            '<div class="card"><h2>Arrhenius Plot (ln(' + getLabel() + ') vs 1/T)</h2><div class="chart-container"><canvas id="arrLinCanvas"></canvas></div></div>' +
        '</div>' +
        '</div>' + renderArrheniusMethodology();
}

// ====================================================================
// 📚 ARRHENIUS METHODOLOGY
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
<strong>Think of it this way:</strong> Imagine trying to walk through a crowded room. When it's cool, people move slowly. When it's warm and energetic, everyone's moving faster — and so do the molecules trying to pass through your packaging.
</div>
<h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">How do we gather the data needed?</h3>
<p>To unlock Arrhenius predictions, you need at least two measurements of the same material taken at different temperatures, while keeping relative humidity steady. More points = more confidence.</p>
<h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">What happens behind the scenes?</h3>
<ol style="padding-left:1.2rem; margin:0.5rem 0;">
  <li><strong>Transform the numbers:</strong> Temperatures get converted to Kelvin (K = °C + 273.15), and we take the natural logarithm of each WVTR/OTR value.</li>
  <li><strong>Extract the key parameters:</strong> Eₐ (Activation Energy in kJ/mol), A (Pre-exponential Factor), R² (Goodness of Fit).</li>
  <li><strong>Make predictions:</strong> With Eₐ and A in hand, the calculator can estimate WVTR/OTR at any temperature.</li>
</ol>
<div style="background:#f8fafc; padding:0.9rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:0.8rem 0;">
WVTR(T) = A · exp( -Eₐ / (R · T) )
</div>
<h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.05rem; color:var(--primary-dark); margin:1.2rem 0 0.5rem 0; font-weight:700;">Making sense of your output</h3>
<div style="display:grid; grid-template-columns:1fr; gap:0.5rem; margin:0.8rem 0;">
  <div style="background:var(--success-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--success);">
    <strong style="color:var(--success);">✓ R² ≥ 0.95:</strong> Excellent fit. Predictions are highly reliable.
  </div>
  <div style="background:var(--warning-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--warning);">
    <strong style="color:var(--warning);">⚠ 0.80 ≤ R² &lt; 0.95:</strong> Reasonable fit. Use caution for extrapolation.
  </div>
  <div style="background:var(--danger-light); padding:0.6rem; border-radius:6px; border-left:3px solid var(--danger);">
    <strong style="color:var(--danger);">✗ R² &lt; 0.80:</strong> Weak fit. Collect additional measurements.
  </div>
</div>
<div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
<strong>Operational note:</strong> This Arrhenius tool is designed to support research and development. For commercial shelf-life claims, always validate predictions with real-time or accelerated aging studies.
</div>
</div>
</div>
</div>
`;
}

// ====================================================================
// 📊 SENSITIVITY
// ====================================================================
function renderSensitivity() {
    var hasMats = State.layers.some(function(l){ return l.mid !== null; });
    var layerOpts = '';
    for(var i=0; i<State.layers.length; i++){
        var mat = null;
        if(State.layers[i].mid !== null) for(var m=0; m<DB.materials.length; m++) if(DB.materials[m].id===State.layers[i].mid){ mat=DB.materials[m]; break; }
        layerOpts += '<option value="'+i+'"'+(State.sensLayerIdx===i?' selected':'')+'>'+(i+1)+': '+((mat)?mat.name:'Unknown')+' ('+(State.layers[i].thick||0)+'um)</option>';
    }
    var barrierOpts = '';
    for(var i2=0; i2<State.layers.length; i2++){
        var mat2 = null;
        if(State.layers[i2].mid !== null) for(var m2=0; m2<DB.materials.length; m2++) if(DB.materials[m2].id===State.layers[i2].mid){ mat2=DB.materials[m2]; break; }
        barrierOpts += '<option value="'+i2+'">'+(i2+1)+': '+((mat2)?mat2.name:'Unknown')+'</option>';
    }
    return '<div class="grid grid-2">' +
        '<div class="card"><h2>Sensitivity Analysis</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">See how '+getLabel()+' changes when varying one layer thickness</p>' +
        (!hasMats ? '<div class="alert alert-info">Configure layers in Calculator first</div>' :
        '<div class="grid grid-2"><div class="form-group"><label>Layer to vary</label><select class="form-input" id="sens-layer" onchange="onSensChange()">'+layerOpts+'</select></div>' +
        '<div class="form-group"><label>Thickness range (um)</label><div style="display:flex;gap:.5rem"><input type="number" step="any" class="form-input" id="sens-tmin" value="10" onchange="onSensChange()"><input type="number" step="any" class="form-input" id="sens-tmax" value="500" onchange="onSensChange()"></div></div></div></div>') +
        '<div class="card"><h2>'+getLabel()+' vs Thickness</h2><div class="chart-container"><canvas id="sensChart"></canvas></div></div>' +
        '</div>' +
        '<div class="card"><h2>Cost-Saving Optimizer</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Find minimum barrier layer thickness to meet target</p>' +
        '<div class="grid grid-2">' +
        '<div class="form-group"><label>Target '+getLabel()+' ('+getUnit()+')</label><input type="number" step="any" class="form-input" id="opt-target" value="'+State.targetValue+'" onchange="doOptimize()"></div>' +
        '<div class="form-group"><label>Barrier layer</label><select class="form-input" id="opt-layer" onchange="doOptimize()">'+barrierOpts+'</select></div></div>' +
        '<div id="opt-result"></div></div>' +
        renderSensitivityMethodology();
}

// ====================================================================
// 📚 SENSITIVITY METHODOLOGY
// ====================================================================
function renderSensitivityMethodology() {
    return `
<div class="card methodology-card" style="margin-top:1.5rem; border-left:4px solid var(--primary); background: var(--card);">
<div style="padding:1.2rem 1.5rem;">
<h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.3rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1rem;">
Mechanics of Sensitivity Analysis
</h2>
<div style="font-size:0.95rem; line-height:1.8; color:#334155; font-family:Georgia, 'Times New Roman', serif;">
<p>In packaging optimization, a common question arises: <em>"What happens if we make this specific layer thinner to save money, or thicker to extend shelf life?"</em> Sensitivity Analysis is a powerful mathematical stress-test that answers this question by sweeping the thickness of a single selected layer across a wide range while keeping all other layers locked.</p>
<div style="background:var(--primary-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--primary); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
<strong>The Mathematical Phenomenon:</strong> Even though a single layer's resistance scales linearly with its thickness, the final transmission rate changes non-linearly because the variable layer is constantly shifting its percentage share of the global resistance pool.
</div>
<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">The math under the hood</h3>
<div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
R<sub>variable</sub>(t) = Thickness<sub>sampled</sub> / (Permeability<sub>ref</sub> × Thickness<sub>ref</sub>)<br><br>
R<sub>total</sub>(t) = R<sub>fixed_layers</sub> + R<sub>variable</sub>(t)<br><br>
Laminate Permeability(t) = 1 / R<sub>total</sub>(t)
</div>
<h3 style="font-size:1.1rem; color:var(--text); margin:1.2rem 0 0.5rem 0; font-family:sans-serif;">How to read the sensitivity chart</h3>
<table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
  <thead><tr style="background:#f1f5f9; border-bottom:2px solid var(--border);"><th style="padding:0.6rem; text-align:left;">Curve Topography</th><th style="padding:0.6rem; text-align:left;">Physical Meaning</th><th style="padding:0.6rem; text-align:left;">Industrial Action</th></tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid var(--border);"><td style="padding:0.6rem; font-weight:bold; color:var(--danger);">The Steep Cliff</td><td>Critical Threshold Zone</td><td>Reducing thickness here causes catastrophic spike in gas transmission.</td></tr>
    <tr style="border-bottom:1px solid var(--border);"><td style="padding:0.6rem; font-weight:bold; color:var(--warning);">The "Knee"</td><td>Thermodynamic Optimum</td><td>Maximum barrier protection before the curve flattens.</td></tr>
    <tr><td style="padding:0.6rem; font-weight:bold; color:var(--success);">The Flat Plateau</td><td>System Bottleneck</td><td>Adding more material is a waste of money.</td></tr>
  </tbody>
</table>
<div style="margin-top:1.5rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
<strong>Industrial Protocol Disclaimer:</strong> This sensitivity framework serves as a rapid screening asset for early-stage structural conceptualization. Commercial specifications must always be validated with direct laboratory measurements per ASTM F1249 or ASTM D3985.
</div>
</div>
</div>
</div>
`;
}

// ====================================================================
// ⚖️ COMPARE LAMINATES
// ====================================================================
function renderCompare() {
    var unit = getUnit();
    if(DB.laminates.length < 2) return '<div class="card"><div class="empty-state"><p>Save 2+ laminates to compare</p></div></div>';
    var html = '<div class="card"><h2>Side-by-Side Comparison</h2><p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Select up to 3 laminates</p><div class="grid grid-2">';
    var maxC = Math.min(DB.laminates.length, 6);
    for(var i=0; i<maxC; i++){
        var l = DB.laminates[i];
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
// 🗂️ LAMINATES DB
// ====================================================================
function renderLaminates() {
    var unit = getUnit();
    if(!DB.laminates.length) return '<div class="card"><div class="empty-state"><p>No laminates saved yet</p></div></div>';
    var colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
    var html = '<div class="card"><h2>Laminates <span class="badge badge-purple">'+DB.laminates.length+'</span></h2><div class="grid grid-2">';
    for(var i=0; i<DB.laminates.length; i++){
        var l = DB.laminates[i];
        html += '<div style="border:1.5px solid var(--border);border-radius:10px;padding:.85rem;border-top:4px solid '+colors[i%colors.length]+'">' +
            '<div style="font-weight:600;font-size:.85rem;margin-bottom:.35rem">'+l.name+'</div>' +
            '<div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">'+(l.mode||State.mode).toUpperCase()+'</div><div style="font-size:1.2rem;font-weight:700;color:var(--primary)">'+l.total.toFixed(5)+'</div><div style="font-size:.65rem;color:var(--text-light)">'+unit+'</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Thickness</div><div style="font-weight:600">'+l.totalThickness.toFixed(0)+' um</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Conditions</div><div style="font-weight:600">'+l.temperature+'\u00b0C / '+l.humidity+'%</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Recyclable</div><span class="sustainability-flag '+(l.recyclable?'yes':'no')+'">'+(l.recyclable?'Yes':'No')+'</span></div>' +
            '</div><div style="margin-top:.45rem;text-align:right"><button class="btn btn-sm btn-danger" onclick="DB.deleteLam('+l.id+');render()">Delete</button></div></div>';
    }
    html += '</div></div>';
    if(DB.laminates.length >= 2) html += '<div class="card"><h2>WVTR Comparison</h2><div class="chart-container"><canvas id="lamChart"></canvas></div></div>';
    return html;
}

// ====================================================================
// 🧮 CALC HANDLERS (used by renderCalc DOM)
// ====================================================================
function updateSaveBtn() {
    var btn = document.getElementById('save-btn');
    if(btn) btn.disabled = State.laminateName.trim() === '';
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
    var tm = State.mode === 'wvtr' ? (mat.testMethodWVTR || '') : (mat.testMethodOTR || '');
    if(!tm) return false;
    return tm.trim().toLowerCase() === State.selectedTestMethod.trim().toLowerCase();
}

function onTestMethodFilterChange(value) {
    State.selectedTestMethod = value || '';
    DB.saveState(State);
    renderContent();
}

function onLayerChange(i, field, val) {
    if(field === 'mid') {
        if(val !== '') {
            if(!isNaN(val)) State.layers[i].mid = parseFloat(val);
            else State.layers[i].mid = val;
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
// 🌡️ ARRHENIUS HANDLERS
// ====================================================================
function onArrEaChange() { onArrChange(); }

function postArrheniusRender() {
    setTimeout(function() {
        var sel = document.getElementById('arr-mat');
        var resEl = document.getElementById('arr-result');
        if(!sel) return;
        if(!sel.value) {
            if(resEl) resEl.innerHTML =
                '<div class="alert alert-info" style="display:flex;gap:0.5rem;align-items:flex-start">' +
                '<svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
                '<div><strong>Select a material to begin Arrhenius analysis</strong><br>' +
                '<span style="font-size:0.75rem;color:var(--text-light)">Choose a material with ✓ Arrhenius badge (multi-temperature data required)</span></div>' +
                '</div>';
            clearArrCanvas('arrTempCanvas');
            clearArrCanvas('arrLinCanvas');
            return;
        }
        if(sel.value) onArrChange();
    }, 100);
}

function onArrChange() {
    var selMat = document.getElementById('arr-mat');
    var selTemp = document.getElementById('arr-temp');
    var selEa = document.getElementById('arr-ea');
    var resEl = document.getElementById('arr-result');
    if(!selMat || !selTemp) return;
    var matId = parseFloat(selMat.value);
    var targetTemp = parseFloat(selTemp.value) || 25;
    var customEaInput = selEa ? selEa.value.trim() : '';
    var customEa = customEaInput ? parseFloat(customEaInput) : NaN;
    if(!matId) {
        if(resEl) resEl.innerHTML = '';
        if(selEa) selEa.value = '';
        clearArrCanvas('arrTempCanvas');
        clearArrCanvas('arrLinCanvas');
        return;
    }
    var mat = null;
    for(var i=0; i<DB.materials.length; i++) { if(DB.materials[i].id === matId){ mat=DB.materials[i]; break; } }
    if(!mat) return;
    var A, EaUsed, rSquared = 1, warn = '', relClass = 'reliability-medium';
    if(isNaN(customEa) || customEa <= 0) {
        var v = Engine.validateArrhenius(mat);
        if(!v.valid){ if(resEl) resEl.innerHTML='<div class="alert alert-error">'+v.error+'</div>'; clearArrCanvas('arrTempCanvas'); clearArrCanvas('arrLinCanvas'); return; }
        var r = Engine.calcArrheniusParams(mat);
        if(!r.valid){ if(resEl) resEl.innerHTML='<div class="alert alert-error">'+r.error+'</div>'; clearArrCanvas('arrTempCanvas'); clearArrCanvas('arrLinCanvas'); return; }
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
            warn = '<div class="alert alert-warning">Using custom Eₐ = '+customEa.toFixed(2)+' kJ/mol</div>';
            relClass = 'reliability-low';
        } else { if(resEl) resEl.innerHTML='<div class="alert alert-error">Cannot calculate A with custom Eₐ</div>'; return; }
    }
    var pred = Engine.predict(A, EaUsed, targetTemp);
    var minT = mat.validConditions[0].temperature, maxT = mat.validConditions[0].temperature;
    for(var i=0; i<mat.validConditions.length; i++){ var t=mat.validConditions[i].temperature; if(t<minT) minT=t; if(t>maxT) maxT=t; }
    var isExtrapolation = targetTemp < minT-1 || targetTemp > maxT+1;
    if(isExtrapolation) warn += '<div class="alert alert-warning">Extrapolation - target '+targetTemp+'°C is outside measured range ('+minT.toFixed(0)+'-'+maxT.toFixed(0)+'°C)</div>';
    if(resEl) {
        resEl.innerHTML = warn +
            '<div class="reliability-meter '+relClass+'">' + (isNaN(customEaInput)||customEaInput==='' ? 'R²='+(rSquared).toFixed(4)+' ' : '') + 'Eₐ='+(EaUsed/1000).toFixed(2)+' kJ/mol</div>' +
            '<div class="grid grid-3" style="margin-top:.4rem">' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Activation Energy</div><div style="font-weight:700">'+(EaUsed/1000).toFixed(2)+' kJ/mol</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Pre-exponential A</div><div style="font-weight:700">'+A.toExponential(3)+'</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Predicted at '+targetTemp+'°C</div><div style="font-size:1rem;font-weight:700;color:var(--primary)">'+pred.toFixed(6)+'</div></div>' +
            '</div>';
    }
    var dataPoints = [];
    var vals2 = Engine.getValues(mat);
    for(var i=0; i<mat.validConditions.length; i++){
        if(vals2[i] && vals2[i].value > 0 && mat.validConditions[i]) dataPoints.push({T_K: mat.validConditions[i].temperature+273.15, trans: vals2[i].value});
    }
    drawArrTempChart(mat, {A:A, Ea:EaUsed, predicted:pred, targetTempC:targetTemp, minTemp:minT, maxTemp:maxT, isExtrapolation:isExtrapolation, dataPoints:dataPoints, rSquared:rSquared}, customEaInput !== '');
    drawArrLinChart(mat, {A:A, Ea:EaUsed, dataPoints:dataPoints, rSquared:rSquared}, customEaInput !== '');
}

// ====================================================================
// 📊 SENSITIVITY HANDLERS
// ====================================================================
function onSensChange() {
    State.sensLayerIdx = parseInt(document.getElementById('sens-layer') ? document.getElementById('sens-layer').value : '0');
    drawSensitivityChart();
}

function postSensitivityRender() {
    if(State.layers.some(function(l){ return l.mid !== null; })) setTimeout(function(){ drawSensitivityChart(); doOptimize(); }, 100);
}

function doOptimize() {
    var target = parseFloat(document.getElementById('opt-target') ? document.getElementById('opt-target').value : '0.5');
    var barrierIdx = parseInt(document.getElementById('opt-layer') ? document.getElementById('opt-layer').value : '0');
    var resEl = document.getElementById('opt-result'); if(!resEl) return;
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    var condition = State.selCond || (common.conditions && common.conditions[0]);
    if(!condition || !State.layers.every(function(l){ return l.mid!==null && l.thick>0; })){
        resEl.innerHTML = '<div class="alert alert-info">Configure and calculate first</div>'; return;
    }
    var barrierLayer = State.layers[barrierIdx];
    var barrierMat = DB.materials.find(function(m){ return m.id === barrierLayer.mid; });
    if(barrierMat && barrierMat.isMetallized){
        resEl.innerHTML = '<div class="alert alert-warning" style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;font-size:0.76rem;line-height:1.2;padding:0.6rem 0.8rem">' +
            '<svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
            '<span><strong>Optimization not applicable:</strong> For metallized/coated films, barrier performance is independent of substrate thickness.</span></div>';
        return;
    }
    var result = Engine.optimizeForTarget(State.layers, DB.materials, condition, target, barrierIdx);
    if(result.error){ resEl.innerHTML='<div class="alert alert-warning">'+result.error+'</div>'; return; }
    var mat = null;
    for(var m=0; m<DB.materials.length; m++) if(DB.materials[m].id===State.layers[barrierIdx].mid){ mat=DB.materials[m]; break; }
    var current = State.layers[barrierIdx].thick;
    resEl.innerHTML = '<div class="alert alert-success" style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;font-size:0.76rem;line-height:1.2;padding:0.6rem 0.8rem">' +
        '<span>To achieve <strong>target '+getLabel()+' ≤ '+target+' '+getUnit()+'</strong> @ '+condition.temperature+'°C/'+condition.humidity+'%:</span>' +
        '<span><strong>'+((mat)?mat.name:'Layer '+(barrierIdx+1))+'</strong> min: <span style="color:var(--primary);font-weight:700">'+result.thickness.toFixed(1)+' um</span></span>' +
        '<span style="color:var(--text-light);font-size:0.7rem">('+current+'→'+result.thickness.toFixed(1)+'um, '+(result.thickness<current?'✓ Savings':'⚠ Increase needed')+')</span>' +
        '</div>';
}

// ====================================================================
// ⚖️ COMPARE HANDLERS
// ====================================================================
function toggleCompare(id) {
    var idx = State.compareIds.indexOf(id);
    if(idx >= 0) State.compareIds.splice(idx,1);
    else if(State.compareIds.length < 3) State.compareIds.push(id);
    renderContent(); postCompareRender();
}

function postCompareRender() {
    if(State.compareIds.length < 1) return;
    var selected = [];
    for(var i=0; i<DB.laminates.length; i++) if(State.compareIds.indexOf(DB.laminates[i].id) >= 0) selected.push(DB.laminates[i]);
    var unit = getUnit();
    var tableEl = document.getElementById('compare-table');
    if(tableEl && selected.length > 0){
        var modeLabel = (selected[0].mode || State.mode).toUpperCase();
        var th = '<thead><tr><th>Parameter</th>'; for(var i=0;i<selected.length;i++) th+='<th>'+selected[i].name+'</th>'; th+='</tr></thead>';
        var body = '<tbody>';
        body += '<tr><td><strong>'+modeLabel+'</strong></td>'; for(var i=0;i<selected.length;i++) body+='<td>'+selected[i].total.toFixed(4)+' '+unit+'</td>'; body+='</tr>';
        body += '<tr><td><strong>Thickness</strong></td>'; for(var i=0;i<selected.length;i++) body+='<td>'+selected[i].totalThickness.toFixed(0)+' um</td>'; body+='</tr>';
        body += '<tr><td><strong>Conditions</strong></td>'; for(var i=0;i<selected.length;i++) body+='<td>'+selected[i].temperature+'°C / '+selected[i].humidity+'%</td>'; body+='</tr>';
        body += '<tr><td><strong>Recyclable</strong></td>'; for(var i=0;i<selected.length;i++) body+='<td><span class="sustainability-flag '+((selected[i].recyclable)?'yes':'no')+'">'+(selected[i].recyclable?'Yes':'No')+'</span></td>'; body+='</tr>';
        body += '</tbody>';
        tableEl.innerHTML = '<div class="card"><h2>Comparison Table</h2><table class="cond-table">'+th+body+'</table></div>';
    }
    if(selected.length >= 2){
        var canvas = document.getElementById('compareChart'); if(!canvas) return;
        destroyChart('compare');
        var ctx = canvas.getContext('2d');
        var modeLabel2 = (selected[0].mode || State.mode).toUpperCase();
        var labels=[], vals=[], colors=[];
        for(var i=0;i<selected.length;i++){ labels.push(selected[i].name); vals.push(selected[i].total); colors.push(LAYER_COLORS[i%LAYER_COLORS.length]); }
        chartInstances.compare = new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{label:modeLabel2,data:vals,backgroundColor:colors,borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:unit}},x:{title:{display:true,text:'Laminates'}}}}});
    }
}

// ====================================================================
// 🔍 MISC HELPERS used across pages
// ====================================================================
function searchMaterialWeb(matName) {
    var encoded = encodeURIComponent(matName);
    Modal.open('Search Online: '+matName,
        '<div style="margin-bottom:1rem">' +
        '<p style="font-size:.82rem;color:var(--text-light);margin-bottom:1rem">Search for WVTR/OTR datasheets and technical data:</p>' +
        '<div class="grid grid-2" style="gap:.75rem">' +
        '<a href="https://scholar.google.com/scholar?q='+encoded+'+WVTR+OTR+datasheet" target="_blank" class="btn btn-primary" style="text-decoration:none;justify-content:center">Google Scholar</a>' +
        '<a href="https://www.google.com/search?q='+encoded+'+WVTR+permeability" target="_blank" class="btn btn-outline" style="text-decoration:none;justify-content:center">Google Search</a>' +
        '<a href="https://www.matweb.com/search/Search.aspx?stext='+encoded+'" target="_blank" class="btn btn-outline" style="text-decoration:none;justify-content:center">MatWeb</a>' +
        '<a href="https://omnexus.specialchem.com/search?q='+encoded+'" target="_blank" class="btn btn-outline" style="text-decoration:none;justify-content:center">Omnexus</a>' +
        '</div></div>' +
        '<div class="alert alert-info"><strong>When you find the data:</strong><br>1. Copy WVTR, OTR, temperature and humidity<br>2. Return to this app<br>3. Click "Add Material"<br>4. Paste the values</div>',
        function(){ return true; }
    );
}

function getCommunityCount() {
    return DB.materials.filter(function(m){ return m.isCommunity || String(m.id).startsWith('fb_'); }).length;
}
