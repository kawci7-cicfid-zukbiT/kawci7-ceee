// ====================================================================
// RENDER.JS - All page render functions
// ====================================================================

// ====================================================================
// HOME
// ====================================================================
function renderHome() {
    var totalMats = DB.materials.length;
    var totalLams = DB.laminates.length;
    var multiTempMats = 0;
    for(var i = 0; i < DB.materials.length; i++) {
        if(Engine.validateArrhenius(DB.materials[i]).valid) multiTempMats++;
    }
    var commCount = getCommunityCount();
    return '<div class="home-bg-glow"></div>' +
    '<div style="max-width:1100px;margin:0 auto;padding:0 0.5rem;position:relative;z-index:10;">' +
        '<div style="padding:3rem 2rem 2.5rem;margin-bottom:2rem;border-bottom:1px solid #e2e8f0">' +
            '<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem">' +
                '<div>' +
                    '<div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;color:#2563eb;text-transform:uppercase;margin-bottom:0.6rem">Packaging Engineering Tool</div>' +
                    '<h1 style="font-size:2.4rem;font-weight:800;color:#0f172a;line-height:1.15;margin:0 0 0.75rem 0;letter-spacing:-0.03em">WVTR / OTR<br>Calculator</h1>' +
                    '<p style="font-size:0.95rem;color:#64748b;margin:0;max-width:480px;line-height:1.6">Professional barrier analysis for multilayer packaging structures. Resistance model, Arrhenius prediction, shelf life estimation.</p>' +
                '</div>' +
                '<button onclick="document.getElementById(\'nav-tabs\').querySelector(\'[data-tab=calc]\').click()" style="background:#2563eb;color:#fff;border:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;letter-spacing:0.01em;transition:background 0.2s;white-space:nowrap" onmouseover="this.style.background=\'#1d4ed8\'" onmouseout="this.style.background=\'#2563eb\'">Start Calculation</button>' +
            '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2e8f0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">' +
            '<div style="background:#fff;padding:1.75rem 1.5rem"><div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Total Materials</div><div style="font-size:2.8rem;font-weight:800;color:#2563eb;line-height:1;margin-bottom:0.4rem">' + totalMats + '</div><div style="font-size:0.78rem;color:#94a3b8">In the database</div><div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9"><button onclick="document.getElementById(\'nav-tabs\').querySelector(\'[data-tab=materials]\').click()" style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Explore database</button></div></div>' +
            '<div style="background:#fff;padding:1.75rem 1.5rem"><div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Arrhenius Ready</div><div style="font-size:2.8rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.4rem">' + multiTempMats + '</div><div style="font-size:0.78rem;color:#94a3b8">Multi-temperature datasets</div><div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9"><button onclick="document.getElementById(\'nav-tabs\').querySelector(\'[data-tab=arrhenius]\').click()" style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Run analysis</button></div></div>' +
            '<div style="background:#fff;padding:1.75rem 1.5rem"><div style="font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.5rem">Saved Laminates</div><div style="font-size:2.8rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.4rem">' + totalLams + '</div><div style="font-size:0.78rem;color:#94a3b8">Structures in your library</div><div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9"><button onclick="document.getElementById(\'nav-tabs\').querySelector(\'[data-tab=laminates]\').click()" style="font-size:0.78rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">View library</button></div></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem">' +
            '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
                '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">This Month</div><div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin-top:0.15rem">Most Used Materials</div></div><div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div></div>' +
                '<div id="top3-ranking" style="padding:0.5rem 0"><div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">Loading rankings...</div></div>' +
            '</div>' +
            '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
                '<div style="padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9"><div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Platform</div><div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin-top:0.15rem">Core Capabilities</div></div>' +
                '<div style="padding:0.5rem 0">' +
                    '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;border-bottom:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.82rem;font-weight:600;color:#0f172a">Multilayer Resistance Model</div><div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">Series resistance calculation per ISO/ASTM</div></div></div>' +
                    '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;border-bottom:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.82rem;font-weight:600;color:#0f172a">Arrhenius Temperature Fit</div><div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">R2 validated prediction at untested temperatures</div></div></div>' +
                    '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem;border-bottom:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.82rem;font-weight:600;color:#0f172a">Shelf Life Engine</div><div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">GAB isotherm + oxidation kinetics</div></div></div>' +
                    '<div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 1.5rem"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.82rem;font-weight:600;color:#0f172a">Sensitivity and Optimization</div><div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">Thickness sweep and cost optimizer</div></div></div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="padding:1.5rem 0;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">' +
            '<div style="font-size:0.72rem;color:#94a3b8;line-height:1.4"><strong style="color:#64748b">Disclaimer:</strong> For R&D and engineering use only. Results require laboratory validation per ASTM F1249 / ISO 15106 standards.</div>' +
            '<a href="mailto:wvtrotrcalculator@gmail.com?subject=Feedback" style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;color:#2563eb;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;padding:0.3rem 0.65rem;border-radius:6px">Send Feedback</a>' +
        '</div>' +
    '</div>';
}

// ====================================================================
// CALCULATOR
// ====================================================================
function renderCalc() {
    var common = Engine.findCommonConditions(State.layers, DB.materials);
    var hasMats = State.layers.some(function(l){ return l.mid !== null; });

    var cardHeader = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">' +
        '<h2 style="margin:0;display:flex;align-items:center;gap:0.4rem">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary)"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>Laminate Structure</h2>' +
        '<button class="btn btn-sm btn-danger" onclick="clearProject()">Cancel</button></div>';

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
        for(var ci = 0; ci < uniqueConditions.length; ci++){
            var c = uniqueConditions[ci];
            var selAttr = State.selCond && State.selCond.temperature === c.temperature && State.selCond.humidity === c.humidity ? ' selected' : '';
            opts += '<option value="'+c.temperature+'|'+c.humidity+'"'+selAttr+'>'+c.temperature+'\u00b0C / '+c.humidity+'%</option>';
        }
        condHTML = '<div class="form-group"><label>Test Conditions</label><select class="form-input" id="sel-cond" onchange="onCondSelect()">'+opts+'</select></div>';
    }

    var layersHTML = '';
    for(var i=0; i<State.layers.length; i++){
        var l = State.layers[i];
        var res = State.calcResult && State.calcResult.layers ? State.calcResult.layers[i] : null;

        var filteredMats = DB.materials.filter(function(mat){
            if (State.matSource === 'company') return mat.isCompany && passesTestMethodFilter(mat);
            return !mat.isCompany && passesTestMethodFilter(mat);
        });
        filteredMats.sort(function(a, b){ return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}); });

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
            '<div class="form-group" style="margin:0"><label>Thickness (um)</label><input type="number" step="any" class="form-input" value="'+(l.thick||'')+'" placeholder="0" onchange="onLayerChange('+i+',\'thick\',this.value)"></div>' +
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
            detail += '<div><strong>'+rl.materialName+'</strong> ('+rl.thickness+'um): '+getLabel()+' = '+formatWithSigFigs(rl.transmissionAtThickness, prec2)+' '+getUnit()+' R='+formatWithSigFigs(rl.resistance, prec2)+' '+rl.resistancePct.toFixed(1)+'%</div>';
        }
        detail += '<div style="padding-top:.25rem;border-top:2px solid #93c5fd;margin-top:.25rem"><strong>Total R:</strong> '+rStr(State.calcResult.totalResistance)+'</div>';
        resultHTML += '<div class="result-detail">'+detail+'</div>';
    }

    if(hasResult && State.calcResult.layers) {
        var hygroWarnings = [];
        for(var r = 0; r < State.calcResult.layers.length; r++) {
            var lr = State.calcResult.layers[r];
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
        '<button class="btn btn-outline btn-full" onclick="addLayer()"'+(State.layers.length>0 && State.layers[State.layers.length-1].mid===null ? ' disabled' : '')+'>+ Add Layer</button></div>'+
        '<div class="card"><h2>Test Conditions</h2>'+condHTML+
        (selectedCond ? '<p style="font-size:.75rem;color:var(--text-light);margin-top:.5rem">Selected: <strong>'+selectedCond+'</strong></p>' : '')+
        '<div style="display:flex;align-items:center;gap:.4rem;margin:.5rem 0">'+
        '<div onclick="toggleAutoCalc()" style="width:36px;height:20px;background:'+(State.autoCalc?'var(--primary)':'var(--border)')+';border-radius:10px;position:relative;cursor:pointer"><div style="position:absolute;top:2px;'+(State.autoCalc?'right:2px':'left:2px')+';width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s"></div></div>'+
        '<span style="font-size:.75rem;color:var(--text-light)">Auto-calculate</span></div>'+
        '<button class="btn btn-danger btn-full" onclick="doCalc()"'+(canCalc?'':' disabled')+'>Calculate '+getLabel()+'</button></div></div>'+
        '<div><div class="card"><h2>Result</h2>'+(resultHTML||'<p style="color:var(--text-light);font-size:.8rem;text-align:center;padding:1.5rem">Configure layers and calculate</p>')+'</div>'+
        (hasResult ? '<div class="card" id="hygro-card" style="display:none"><h2>Time-Dependent barrier integrity</h2><div class="chart-container" style="min-height:280px"><canvas id="hygroTimeChart"></canvas></div></div>' : '')+
        (hasResult ? '<div class="card"><h2>'+getLabel()+' vs Temperature</h2><div class="chart-container"><canvas id="lamCurveChart"></canvas></div><div id="lamCurveLegend" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;justify-content:center"></div></div>'+
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
    return '<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:var(--card);">' +
        '<div style="padding:1.2rem 1.5rem;">' +
        '<h2 style="font-family:Georgia,serif;font-size:1.3rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem;">Understanding the calculations</h2>' +
        '<div style="font-size:0.95rem;line-height:1.8;color:#334155;font-family:Georgia,serif;">' +
        '<p>When engineers design packaging, they combine several thin layers of different materials. This calculator predicts performance using the series resistance model.</p>' +
        '<div style="background:var(--primary-light);padding:0.8rem 1rem;border-radius:8px;border-left:3px solid var(--primary);margin:1rem 0;font-family:sans-serif;font-size:0.9rem;"><strong>The Core Rule:</strong> Total barrier resistance = sum of individual resistances. Final transmission = 1 / R_total.</div>' +
        '<h3 style="font-size:1.1rem;color:var(--text);margin:1.2rem 0 0.5rem 0;font-family:sans-serif;">Single layer resistance formula</h3>' +
        '<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.95rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a;">R_layer = Thickness_input / (Permeability_ref x Thickness_ref)</div>' +
        '<h3 style="font-size:1.1rem;color:var(--text);margin:1.2rem 0 0.5rem 0;font-family:sans-serif;">Combining layers</h3>' +
        '<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.95rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a;">R_total = R1 + R2 + ... + Rn<br><br>Final Permeability = 1 / R_total</div>' +
        '<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif;"><strong>Disclaimer:</strong> For commercial specifications, validate with ASTM F1249, ASTM D3985, or ISO 15106.</div>' +
        '</div></div></div>';
}

// ====================================================================
// ARRHENIUS
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
            opts += '<option value="' + mat.id + '">' + mat.name + ' [R2=' + r2 + ']</option>';
            validCount++;
        }
    }
    var infoText = validCount > 0 ? validCount + ' materials available for prediction' : 'No materials with multi-temperature data found';
    var html = '<div class="card"><h2>Arrhenius Analysis</h2>' +
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">Predict ' + getLabel() + ' at unmeasured temperatures. <span style="color:' + (validCount > 0 ? 'var(--success)' : 'var(--danger)') + ';font-weight:600">' + infoText + '</span></p>' +
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
            '<div class="card"><h2>' + getLabel() + ' vs Temperature</h2><div class="chart-container"><canvas id="arrTempCanvas"></canvas></div></div>' +
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
    return '<div class="card methodology-card" style="margin-top:1rem;border-left:4px solid var(--primary);">' +
        '<div style="padding:1.2rem 1.5rem;">' +
        '<h2 style="font-family:Georgia,serif;font-size:1.2rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem;">Understanding Arrhenius Analysis</h2>' +
        '<div style="font-size:0.92rem;line-height:1.75;color:#334155;font-family:Georgia,serif;">' +
        '<p>Temperature changes how quickly molecules move through packaging. The Arrhenius equation quantifies this relationship, allowing prediction of WVTR/OTR at unmeasured temperatures.</p>' +
        '<div style="background:#f8fafc;padding:0.9rem;border-radius:6px;font-family:monospace;font-size:0.9rem;text-align:center;border:1px dashed var(--border);margin:0.8rem 0;">WVTR(T) = A x exp( -Ea / (R x T) )</div>' +
        '<div style="display:grid;grid-template-columns:1fr;gap:0.5rem;margin:0.8rem 0;">' +
            '<div style="background:var(--success-light);padding:0.6rem;border-radius:6px;border-left:3px solid var(--success);"><strong style="color:var(--success);">R2 >= 0.95:</strong> Excellent fit.</div>' +
            '<div style="background:var(--warning-light);padding:0.6rem;border-radius:6px;border-left:3px solid var(--warning);"><strong style="color:var(--warning);">0.80 to 0.95:</strong> Reasonable fit, use caution.</div>' +
            '<div style="background:var(--danger-light);padding:0.6rem;border-radius:6px;border-left:3px solid var(--danger);"><strong style="color:var(--danger);">R2 < 0.80:</strong> Weak fit, collect more data.</div>' +
        '</div>' +
        '<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif;"><strong>Note:</strong> Always validate predictions with real-time or accelerated aging studies.</div>' +
        '</div></div></div>';
}

// ====================================================================
// SENSITIVITY
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
    var html = '<div class="grid grid-2">' +
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
    return html;
}

// ====================================================================
// SENSITIVITY METHODOLOGY
// ====================================================================
function renderSensitivityMethodology() {
    return '<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:var(--card);">' +
        '<div style="padding:1.2rem 1.5rem;">' +
        '<h2 style="font-family:Georgia,serif;font-size:1.3rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem;">Mechanics of Sensitivity Analysis</h2>' +
        '<div style="font-size:0.95rem;line-height:1.8;color:#334155;font-family:Georgia,serif;">' +
        '<p>Sensitivity Analysis sweeps the thickness of a single selected layer across a wide range while keeping all other layers locked, showing how the final transmission rate changes non-linearly.</p>' +
        '<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.95rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a;">R_variable(t) = t / (P_ref x T_ref)<br><br>Permeability(t) = 1 / (R_fixed + R_variable(t))</div>' +
        '<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif;"><strong>Disclaimer:</strong> Commercial specifications must always be validated with direct laboratory measurements.</div>' +
        '</div></div></div>';
}

// ====================================================================
// COMPARE LAMINATES
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
// LAMINATES DB
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
    var tm = State.mode === 'wvtr' ? (mat.testMethodWVTR || '') : (mat.testMethodOTR || '');
    if(!tm) return false;
    return tm.trim().toLowerCase() === State.selectedTestMethod.trim().toLowerCase();
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
        return;
    }
    var mat = null;
    for(var i=0; i<DB.materials.length; i++) { if(DB.materials[i].id === matId){ mat=DB.materials[i]; break; } }
    if(!mat) return;
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
    for(var i=0; i<mat.validConditions.length; i++){ var t=mat.validConditions[i].temperature; if(t<minT) minT=t; if(t>maxT) maxT=t; }
    var isExtrapolation = targetTemp < minT-1 || targetTemp > maxT+1;
    if(isExtrapolation) warn += '<div class="alert alert-warning">Extrapolation outside measured range ('+minT.toFixed(0)+'-'+maxT.toFixed(0)+'C)</div>';
    if(resEl) {
        resEl.innerHTML = warn +
            '<div class="reliability-meter '+relClass+'">' + (customEaInput==='' ? 'R2='+(rSquared).toFixed(4)+' ' : '') + 'Ea='+(EaUsed/1000).toFixed(2)+' kJ/mol</div>' +
            '<div class="grid grid-3" style="margin-top:.4rem">' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Activation Energy</div><div style="font-weight:700">'+(EaUsed/1000).toFixed(2)+' kJ/mol</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Pre-exponential A</div><div style="font-weight:700">'+A.toExponential(3)+'</div></div>' +
            '<div><div style="font-size:.65rem;color:var(--text-light)">Predicted at '+targetTemp+'C</div><div style="font-size:1rem;font-weight:700;color:var(--primary)">'+pred.toFixed(6)+'</div></div>' +
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
        resEl.innerHTML = '<div class="alert alert-warning"><strong>Optimization not applicable:</strong> For metallized/coated films, barrier performance is independent of substrate thickness.</div>';
        return;
    }
    var result = Engine.optimizeForTarget(State.layers, DB.materials, condition, target, barrierIdx);
    if(result.error){ resEl.innerHTML='<div class="alert alert-warning">'+result.error+'</div>'; return; }
    var mat = null;
    for(var m=0; m<DB.materials.length; m++) if(DB.materials[m].id===State.layers[barrierIdx].mid){ mat=DB.materials[m]; break; }
    var current = State.layers[barrierIdx].thick;
    resEl.innerHTML = '<div class="alert alert-success">' +
        'To achieve target '+getLabel()+' <= '+target+' '+getUnit()+' @ '+condition.temperature+'C/'+condition.humidity+'%: ' +
        '<strong>'+((mat)?mat.name:'Layer '+(barrierIdx+1))+'</strong> min: <span style="color:var(--primary);font-weight:700">'+result.thickness.toFixed(1)+' um</span>' +
        ' ('+current+' to '+result.thickness.toFixed(1)+'um, '+(result.thickness<current?'Savings':'Increase needed')+')' +
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
        body += '<tr><td><strong>Conditions</strong></td>'; for(var i=0;i<selected.length;i++) body+='<td>'+selected[i].temperature+'C / '+selected[i].humidity+'%</td>'; body+='</tr>';
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
// MISC HELPERS
// ====================================================================
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
    return DB.materials.filter(function(m){ return m.isCommunity || String(m.id).startsWith('fb_'); }).length;
}
