// ====================================================================
// 🧪 MATERIALS.JS - Materials DB page, modals, filters, voting,
//                   community sync, trash, usage tracking, initApp
// Dependencies: engine.js, app.js, render.js
// ====================================================================

// ====================================================================
// 🗑️ SOFT DELETE / TRASH
// ====================================================================
var _matTrash = [];

function softDeleteMat(matId) {
    var idx = DB.materials.findIndex(function(m){ return String(m.id) === String(matId); });
    if(idx < 0) return;
    var mat = DB.materials[idx];
    _matTrash.push(mat);
    DB.materials.splice(idx, 1);
    DB.save();
    matApplyFilters();
    showTrashNotification(mat);
}

function restoreFromTrash(matId) {
    var idx = _matTrash.findIndex(function(m){ return String(m.id) === String(matId); });
    if(idx < 0) return;
    var mat = _matTrash[idx];
    _matTrash.splice(idx, 1);
    DB.materials.push(mat);
    DB.save();
    matApplyFilters();
}

function showTrashNotification(mat) {
    var old = document.getElementById('trash-toast');
    if(old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'trash-toast';
    toast.style.cssText = [
        'position:fixed','bottom:1.5rem','left:50%','transform:translateX(-50%)',
        'background:#0f172a','color:#fff','padding:0.75rem 1.25rem',
        'border-radius:10px','font-size:0.82rem','display:flex',
        'align-items:center','gap:1rem','z-index:9999',
        'box-shadow:0 8px 24px rgba(0,0,0,0.3)','animation:fadeIn 0.2s ease'
    ].join(';');
    toast.innerHTML =
        '<span>🗑️ <strong>' + mat.name + '</strong> moved to trash</span>' +
        '<button onclick="restoreFromTrash(\'' + String(mat.id) + '\');this.closest(\'#trash-toast\').remove()" ' +
        'style="background:var(--primary);color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.78rem;font-weight:600">Undo</button>' +
        '<button onclick="this.closest(\'#trash-toast\').remove()" ' +
        'style="background:transparent;color:rgba(255,255,255,0.5);border:none;cursor:pointer;font-size:1rem;padding:0 0.25rem">✕</button>';
    document.body.appendChild(toast);
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 6000);
}

function showTrashPanel() {
    if(_matTrash.length === 0) { alert('The trash is empty.'); return; }
    var body = '<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.75rem">Items in trash are recovered to your local database only.</div>';
    body += _matTrash.map(function(m) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">' +
            '<span style="font-size:0.85rem;font-weight:500">' + m.name + '</span>' +
            '<button class="btn btn-sm btn-success" onclick="restoreFromTrash(\'' + String(m.id) + '\');Modal.close();matApplyFilters()">↩ Restore</button>' +
            '</div>';
    }).join('');
    Modal.open('🗑️ Trash (' + _matTrash.length + ' items)', body, function(){ return true; });
}

// ====================================================================
// 📬 CONTACT SUPPLIER
// ====================================================================
function contactSupplier(matName, company, email) {
    if(!email) {
        alert('No supplier email available for this material.\nAdd it by editing the material and filling in the Contact Email field.');
        return;
    }
    var subject = encodeURIComponent('Technical Data Request – ' + matName + ' (WVTR/OTR)');
    var body = encodeURIComponent(
        'Dear ' + (company || 'Supplier') + ',\n\n' +
        'I am contacting you regarding the material "' + matName + '".\n\n' +
        'I would appreciate receiving the following technical data:\n' +
        '- WVTR (Water Vapor Transmission Rate) per ASTM F1249 / ISO 15106\n' +
        '- OTR (Oxygen Transmission Rate) per ASTM D3985 / ISO 15106-2\n' +
        '- Test conditions (temperature, relative humidity, thickness)\n\n' +
        'Thank you for your time.\n\nBest regards'
    );
    window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

// ====================================================================
// 🌍 SHARE / UPDATE WITH COMMUNITY
// ====================================================================
async function shareToCommunity(matId) {
    var mat = DB.materials.find(function(m){ return String(m.id) === String(matId); });
    if(!mat) return;
    if(!window.communityDB) { alert('⚠️ Database not connected. Try again later.'); return; }
    var btn = event && event.target ? event.target : null;
    if(btn) { btn.disabled = true; btn.textContent = '⏳...'; }
    try {
        mat.author = mat.author || 'Community';
        var result = await window.saveToCommunity(mat);
        if(result.success) {
            mat.firebaseDocId = result.id;
            mat.isCommunity = true;
            mat._communitySourceId = String(mat.id);
            DB.save();
            matApplyFilters();
        }
    } catch(e) { alert('❌ Unexpected error: ' + e.message); }
    finally { if(btn) { btn.disabled=false; btn.textContent = mat.firebaseDocId ? '🔄 Update community' : '🌍 Share with community'; } }
}

function submitToFirebaseById(matId) { shareToCommunity(matId); }

// ====================================================================
// ✅ VERIFIED BADGE
// ====================================================================
function isVerifiedMaterial(mat) {
    if(!window.VERIFIED_MATERIALS) return null;
    return window.VERIFIED_MATERIALS[mat.name] || null;
}

// ====================================================================
// 👍 RELIABILITY VOTING
// ====================================================================
async function voteReliability(matId, voteType) {
    var matIdStr = String(matId);
    var currentVote = hasUserVoted(matIdStr);
    var mat = DB.materials.find(function(m){ return String(m.id) === matIdStr; });
    if(!mat) return;
    if(!mat.reliabilityVotes) mat.reliabilityVotes = { up: 0, down: 0 };
    var firebaseUpdate = {};
    var needsSync = mat.firebaseDocId && window.communityDB && mat.isCommunity === true;

    if(currentVote) {
        mat.reliabilityVotes[currentVote] = Math.max(0, (mat.reliabilityVotes[currentVote] || 0) - 1);
        if(needsSync) firebaseUpdate["reliabilityVotes." + currentVote] = window.fbIncrement(-1);
        if(currentVote === voteType) {
            recordUserVote(matIdStr, null);
            DB.save();
            if(State.tab === 'materials') { matApplyFilters(); } else { renderContent(); }
            if(needsSync) {
                try { const ref = window.fbDoc(window.communityDB,"materials",mat.firebaseDocId); await window.fbUpdateDoc(ref, firebaseUpdate); } catch(e) {}
            }
            return;
        }
    }

    mat.reliabilityVotes[voteType] = (mat.reliabilityVotes[voteType] || 0) + 1;
    recordUserVote(matIdStr, voteType);
    if(needsSync) firebaseUpdate["reliabilityVotes." + voteType] = window.fbIncrement(1);
    DB.save();
    if(State.tab === 'materials') { matApplyFilters(); } else { renderContent(); }
    if(needsSync && Object.keys(firebaseUpdate).length > 0) {
        try { const ref = window.fbDoc(window.communityDB,"materials",mat.firebaseDocId); await window.fbUpdateDoc(ref, firebaseUpdate); } catch(e) {}
    }
}

function hasUserVoted(matId) {
    try { var votes = JSON.parse(localStorage.getItem('wvtr_user_votes') || '{}'); return votes[String(matId)] || null; }
    catch(e) { return null; }
}

function recordUserVote(matId, voteType) {
    try {
        var votes = JSON.parse(localStorage.getItem('wvtr_user_votes') || '{}');
        if(voteType) votes[String(matId)] = voteType;
        else delete votes[String(matId)];
        localStorage.setItem('wvtr_user_votes', JSON.stringify(votes));
    } catch(e) {}
}

function getReliabilityScore(mat) {
    if(!mat.reliabilityVotes) return null;
    var up = mat.reliabilityVotes.up || 0;
    var down = mat.reliabilityVotes.down || 0;
    var total = up + down;
    if(total === 0) return null;
    return Math.round((up / total) * 100);
}

// ====================================================================
// 📊 MATERIAL USAGE TRACKING
// ====================================================================
function getMonthlyStats() {
    var now = new Date();
    var currentMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    var stats = JSON.parse(localStorage.getItem('wvtr_monthly_stats') || '{}');
    if(stats.month !== currentMonth && stats.counts) {
        stats.prevTop3 = Object.entries(stats.counts)
            .sort(function(a,b){ return b[1]-a[1]; }).slice(0,3)
            .map(function(e){ return { id: String(e[0]), count: e[1] }; });
        stats.counts = {};
    }
    stats.month  = currentMonth;
    stats.counts = stats.counts || {};
    return stats;
}

async function recordMaterialUsage(matId) {
    if(!matId) return;
    var activeLayers = State.layers.filter(function(l){ return l.mid !== null; });
    if(activeLayers.length !== 1) return;
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var mat = DB.materials.find(function(m){ return String(m.id) === String(matId); });
    if(mat) {
        mat.usageCount    = (mat.usageCount || 0) + 1;
        mat.lastUsageMonth = currentMonth;
    }
    if(window.communityDB && mat && mat.firebaseDocId) {
        try {
            const ref = window.fbDoc(window.communityDB, "materials", mat.firebaseDocId);
            await window.fbUpdateDoc(ref, { usageCount: window.fbIncrement(1), lastUsageMonth: currentMonth });
        } catch(e) { console.warn("⚠️ Firebase usage sync failed:", e); }
    }
    if(State.tab === 'home') {
        setTimeout(function(){ if(typeof updateTop3UI === 'function') updateTop3UI(); }, 200);
    }
}

function getTop3Materials() {
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var candidates = DB.materials.filter(function(m){ return m.lastUsageMonth === currentMonth && (m.usageCount || 0) > 0; });
    if(candidates.length === 0) {
        var stats = getMonthlyStats();
        var counts = stats.counts || {};
        return Object.entries(counts).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3).map(function(e, idx){
            var mat = DB.materials.find(function(m){ return String(m.id) === String(e[0]); });
            return mat ? { name:mat.name, company:mat.company||null, count:e[1], icon:['🥇','🥈','🥉'][idx] } : null;
        }).filter(Boolean);
    }
    candidates.sort(function(a,b){ return (b.usageCount||0)-(a.usageCount||0); });
    return candidates.slice(0,3).map(function(mat,idx){
        return { name:mat.name, company:mat.company||null, count:mat.usageCount||0, icon:['🥇','🥈','🥉'][idx] };
    });
}

async function refreshGlobalRankings() {
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    if(window.communityDB) {
        try {
            var q = window.fbQuery(window.fbCollection(window.communityDB,"materials"), window.fbOrderBy("usageCount","desc"));
            var snapshot = await window.fbGetDocs(q);
            var globalTop = [];
            snapshot.forEach(function(d){
                var data = d.data();
                if(data.lastUsageMonth === currentMonth && (data.usageCount||0) > 0) {
                    globalTop.push({ name:data.name, company:data.company||null, count:data.usageCount||0, firebaseDocId:d.id });
                }
            });
            if(globalTop.length > 0) {
                globalTop.forEach(function(item){
                    var localMat = DB.materials.find(function(m){ return m.firebaseDocId === item.firebaseDocId; });
                    if(localMat) { localMat.usageCount = item.count; localMat.lastUsageMonth = currentMonth; }
                });
                return globalTop.slice(0,3).map(function(m,idx){ return Object.assign({},m,{icon:['🥇','🥈','🥉'][idx]}); });
            }
        } catch(e) { console.warn("⚠️ Firebase ranking failed:", e); }
    }
    return getTop3Materials();
}

async function updateTop3UI() {
    var top3 = await refreshGlobalRankings();
    var container = document.getElementById('top3-ranking');
    if(!container) return;
    if(top3.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">Start calculating to see rankings</div>';
    } else {
        var medals = ['01','02','03'];
        container.innerHTML = top3.map(function(m, idx){
            return '<div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 1.5rem;border-bottom:1px solid #f8fafc">' +
                '<div style="font-size:0.72rem;font-weight:700;color:#cbd5e1;font-family:monospace;width:20px;flex-shrink:0">' + medals[idx] + '</div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.85rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + m.name + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">' + (m.company || 'Community · ' + m.count + ' uses') + '</div>' +
                '</div>' +
                '<div style="font-size:0.72rem;font-weight:700;color:#2563eb">' + m.count + '</div>' +
                '</div>';
        }).join('');
    }
}
window.updateTop3UI = updateTop3UI;

// ====================================================================
// 🃏 MATERIAL CARD HTML — NEW LAYOUT
// ====================================================================

// Helper: build a barrier data table (WVTR, OTR, or CO2) for the card body
function _matBarrierSection(m, type, idStr) {
    var labels = { wvtr: 'WVTR', otr: 'OTR', co2: 'CO₂TR' };
    var units  = { wvtr: 'g/m²·day', otr: 'cc/m²·day·atm', co2: 'cc/m²·day·atm' };
    var valKey = { wvtr: 'wvtrValues', otr: 'otrValues', co2: 'co2Values' };
    var tmKey  = { wvtr: 'testMethodWVTR', otr: 'testMethodOTR', co2: 'testMethodCO2' };

    var label = labels[type];
    var unit  = units[type];
    var vals  = (m[valKey[type]] || []);
    var topTM = m[tmKey[type]] || '';

    // Per-row add-condition dropdown options
    var ctmOpts = {
        wvtr: ['ASTM F1249','ISO 15106-3','ASTM E96','JIS K7129','MOCON PERMATRAN','DIN 53122'],
        otr:  ['ASTM D3985','ASTM D1927','ISO 15106-2','JIS K7126','MOCON OXTRAN'],
        co2:  ['ASTM D1434','ISO 15105-1','ISO 15105-2','MOCON']
    };
    var tmOptsList = ctmOpts[type];
    var tmOptsHTML = '<option value="">— test method —</option>';
    for(var ti=0; ti<tmOptsList.length; ti++) {
        tmOptsHTML += '<option value="'+tmOptsList[ti]+'">'+tmOptsList[ti]+'</option>';
    }

    // Section header
    var html =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px">' +
            '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">' +
                label + ' <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:0.68rem">· ' + unit + '</span>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline" style="font-size:0.7rem;padding:2px 8px;height:auto" ' +
                'onclick="event.stopPropagation();matToggleInlineForm(\'' + idStr + '-' + type + '-form\')">+ Add condition</button>' +
        '</div>';

    // Table of existing values
    if(vals.length > 0) {
        html += '<div style="overflow-x:auto">' +
            '<table style="width:100%;border-collapse:collapse;font-size:0.75rem">' +
            '<thead><tr style="border-bottom:1px solid var(--border)">' +
                '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light);white-space:nowrap">Value</th>' +
                '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light);white-space:nowrap">Thickness</th>' +
                '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light);white-space:nowrap">Temp</th>' +
                '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light);white-space:nowrap">RH%</th>' +
                '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light);white-space:nowrap">Method</th>' +
            '</tr></thead><tbody>';
        for(var ri=0; ri<vals.length; ri++) {
            var v = vals[ri];
            var condTemp = (v.temperature != null) ? v.temperature : '—';
            var condHum  = (v.humidity    != null) ? v.humidity    : '—';
            var condTM   = v.testMethod || topTM || '—';
            html +=
                '<tr style="border-bottom:1px solid var(--border-light,#f1f5f9)">' +
                '<td style="padding:4px 6px;font-weight:600;color:var(--primary);font-family:monospace;font-size:0.8rem">' + v.value + '</td>' +
                '<td style="padding:4px 6px;color:var(--text)">' + v.thickness + ' µm</td>' +
                '<td style="padding:4px 6px;color:var(--text)">' + condTemp + (condTemp !== '—' ? '°C' : '') + '</td>' +
                '<td style="padding:4px 6px;color:var(--text)">' + condHum + (condHum !== '—' ? '%' : '') + '</td>' +
                '<td style="padding:4px 6px;color:var(--text-light);font-size:0.7rem;font-style:italic">' + condTM + '</td>' +
                '</tr>';
        }
        html += '</tbody></table></div>';
    } else {
        html += '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic;padding:4px 0">No ' + label + ' data available.</div>';
    }

    // Inline add-condition form (hidden by default)
    html +=
        '<div id="' + idStr + '-' + type + '-form" style="display:none;margin-top:8px;padding:10px 12px;' +
            'background:var(--primary-light,#eff6ff);border:1px dashed var(--primary);border-radius:8px">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:6px;margin-bottom:6px">' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">' + label + ' value</label>' +
                    '<input type="number" step="any" class="form-input matinline-val" id="' + idStr + '-' + type + '-val" placeholder="0" style="font-size:0.78rem" onclick="event.stopPropagation()"></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Thickness (µm)</label>' +
                    '<input type="number" step="any" class="form-input matinline-thick" id="' + idStr + '-' + type + '-thick" placeholder="0" style="font-size:0.78rem" onclick="event.stopPropagation()"></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Test method</label>' +
                    '<select class="form-input matinline-method" id="' + idStr + '-' + type + '-method" style="font-size:0.75rem" onclick="event.stopPropagation()">' + tmOptsHTML + '</select></div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Temp (°C)</label>' +
                    '<input type="number" step="any" class="form-input matinline-temp" id="' + idStr + '-' + type + '-temp" placeholder="23" style="font-size:0.78rem" onclick="event.stopPropagation()"></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Humidity (%RH)</label>' +
                    '<input type="number" step="any" class="form-input matinline-hum" id="' + idStr + '-' + type + '-hum" placeholder="50" style="font-size:0.78rem" onclick="event.stopPropagation()"></div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;justify-content:flex-end">' +
                '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();matToggleInlineForm(\'' + idStr + '-' + type + '-form\')">Cancel</button>' +
                '<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();matSaveInlineRow(\'' + idStr + '\',\'' + type + '\')">✓ Save</button>' +
            '</div>' +
        '</div>';

    return html;
}

// Toggle inline form visibility
function matToggleInlineForm(formId) {
    var el = document.getElementById(formId);
    if(!el) return;
    el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

// Save a new row from the inline form into DB and re-render the card
function matSaveInlineRow(idStr, type) {
    var val   = parseFloat(document.getElementById(idStr + '-' + type + '-val').value);
    var thick = parseFloat(document.getElementById(idStr + '-' + type + '-thick').value);
    var temp  = parseFloat(document.getElementById(idStr + '-' + type + '-temp').value);
    var hum   = parseFloat(document.getElementById(idStr + '-' + type + '-hum').value);
    var meth  = document.getElementById(idStr + '-' + type + '-method').value.trim();

    var label = {wvtr:'WVTR', otr:'OTR', co2:'CO₂TR'}[type];
    if(isNaN(val)  || val < 0)   { alert(label + ' value is invalid');    return; }
    if(isNaN(thick)|| thick <= 0){ alert('Thickness must be > 0');         return; }
    if(isNaN(temp))               { alert('Temperature is required');       return; }
    if(isNaN(hum))                { alert('Humidity is required');          return; }

    var mat = DB.materials.find(function(m){ return String(m.id) === String(idStr); });
    if(!mat) return;

    var valKey = { wvtr: 'wvtrValues', otr: 'otrValues', co2: 'co2Values' };
    if(!mat[valKey[type]]) mat[valKey[type]] = [];

    var newEntry = { value: val, thickness: thick, temperature: temp, humidity: hum };
    if(meth) newEntry.testMethod = meth;
    mat[valKey[type]].push(newEntry);

    DB.save();
    matApplyFilters();
}

function matCardHTML(m, q) {
    var isComm   = !!(m.isCommunity || (m.id && String(m.id).startsWith('fb_')));
    var verified = isVerifiedMaterial(m);
    var relScore = getReliabilityScore(m);
    var userVote = hasUserVoted(m.id);
    var arrOk    = Engine.validateArrhenius(m).valid;
    var idStr    = String(m.id);
    var hasEmail = !!(m.supplierEmail && m.supplierEmail.trim());

    function hl(str) {
        if(!q || !str) return str || '';
        var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','gi');
        return String(str).replace(re,'<mark style="background:#fef08a;color:#713f12;padding:0 2px;border-radius:2px">$1</mark>');
    }

    // ── Header pills: show first value of each barrier type ──────────
    function firstValPill(vals, label, unit) {
        if(vals && vals.length > 0) {
            return '<span style="font-size:0.7rem;font-weight:600;color:var(--primary);background:var(--primary-light,#eff6ff);' +
                'border:1px solid var(--primary-border,#bfdbfe);border-radius:4px;padding:1px 7px;white-space:nowrap">' +
                label + ' ' + vals[0].value + '</span> ';
        }
        return '<span style="font-size:0.7rem;color:var(--text-light);background:var(--bg-secondary,#f8fafc);' +
            'border:1px solid var(--border);border-radius:4px;padding:1px 7px;white-space:nowrap">' +
            label + ' —</span> ';
    }

    var headerPills =
        firstValPill(m.wvtrValues, 'WVTR', 'g/m²·day') +
        firstValPill(m.otrValues,  'OTR',  'cc/m²·day') +
        ((m.co2Values && m.co2Values.length > 0) ? firstValPill(m.co2Values, 'CO₂', 'cc/m²·day') : '');

    // ── Badges ───────────────────────────────────────────────────────
    var badges = '';
    if(isComm)         badges += '<span class="badge badge-purple" style="font-size:0.65rem">🌍 Community</span> ';
    if(verified)       badges += '<span class="badge-verified" title="Verified by ' + verified.by + '">✅ Verified</span> ';
    if(m.isMetallized) badges += '<span class="badge badge-yellow" style="font-size:0.65rem">⚙️ Metallized</span> ';
    if(arrOk)          badges += '<span class="badge badge-green" style="font-size:0.65rem">✓ Arrhenius</span> ';

    // ── Action buttons ───────────────────────────────────────────────
    var shareLabel = m.firebaseDocId ? '🔄 Update community' : '🌍 Share with community';
    var btns =
        '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();showMatModal(\'' + idStr + '\')">✏️ Edit</button>' +
        '<button class="btn btn-sm btn-danger"  onclick="event.stopPropagation();softDeleteMat(\'' + idStr + '\')">🗑️ Delete</button>' +
        '<button class="btn btn-sm ' + (m.firebaseDocId ? 'btn-success' : 'btn-primary') + '" ' +
            'onclick="event.stopPropagation();submitToFirebaseById(\'' + idStr + '\')">' + shareLabel + '</button>' +
        '<button class="btn btn-sm btn-outline" ' +
            (hasEmail ? '' : 'style="opacity:0.4;cursor:not-allowed" title="No supplier email — edit material to add it" ') +
            'onclick="event.stopPropagation();' +
            (hasEmail ? 'contactSupplier(\'' + (m.name||'').replace(/'/g,"\\'") + '\',\'' + (m.company||'').replace(/'/g,"\\'") + '\',\'' + (m.supplierEmail||'').replace(/'/g,"\\'") + '\')' : '') +
            '">📧 Contact supplier</button>';

    // ── Reliability voting ───────────────────────────────────────────
    var upStyle   = userVote === 'up'   ? 'background:var(--success-light);border-color:var(--success);color:var(--success)' : '';
    var downStyle = userVote === 'down' ? 'background:var(--danger-light);border-color:var(--danger);color:var(--danger)'   : '';
    var relLabel  = relScore !== null ? relScore + '%' : '—';
    var relClass  = relScore !== null ? (relScore >= 70 ? 'high' : relScore >= 40 ? 'medium' : 'low') : 'medium';

    // ── Physical properties grid ─────────────────────────────────────
    var physProps = '';
    var physItems = [];
    if(m.density)      physItems.push(['Density', m.density + ' kg/m³']);
    if(m.meltingTemp)  physItems.push(['Melting temp', m.meltingTemp + '°C' + (m.meltingTempMethod ? ' <span style="color:var(--text-light);font-size:0.68rem">(' + m.meltingTempMethod + ')</span>' : '')]);
    if(m.gwp)          physItems.push(['GWP', m.gwp + ' kg CO₂eq/kg']);
    if(m.haze != null) physItems.push(['Haze', m.haze + (m.hazeUnit || '%') + (m.hazeMethod ? ' <span style="color:var(--text-light);font-size:0.68rem">(' + m.hazeMethod + ')</span>' : '')]);
    if(physItems.length > 0) {
        physProps =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px">' +
                '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">Physical properties</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">' +
            physItems.map(function(p){
                return '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px">' +
                    '<div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">' + p[0] + '</div>' +
                    '<div style="font-size:0.8rem;font-weight:600;color:var(--text)">' + p[1] + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';
    }

    // ── Hygroscopic props ────────────────────────────────────────────
    var hygroProps = '';
    if((m.hygroscopicBetaWVTR && m.hygroscopicBetaWVTR > 0) || (m.hygroscopicBetaOTR && m.hygroscopicBetaOTR > 0)) {
        hygroProps =
            '<div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px">' +
                '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">Hygroscopic correction</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">' +
            (m.hygroscopicBetaWVTR > 0 ? '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">β WVTR</div><div style="font-size:0.8rem;font-weight:600;color:var(--text)">' + m.hygroscopicBetaWVTR + ' · ref ' + (m.hygroscopicRefRHWVTR||50) + '% RH</div></div>' : '') +
            (m.hygroscopicBetaOTR  > 0 ? '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">β OTR</div><div style="font-size:0.8rem;font-weight:600;color:var(--text)">' + m.hygroscopicBetaOTR  + ' · ref ' + (m.hygroscopicRefRHOTR ||50) + '% RH</div></div>' : '') +
            '</div>';
    }

    // ── Source note ──────────────────────────────────────────────────
    var sourceNote = '';
    if(m.tdsSource) {
        sourceNote =
            '<div style="margin-top:10px;padding:8px 10px;background:var(--bg-secondary,#f8fafc);border-radius:6px;border-left:2px solid var(--border)">' +
            '<div style="font-size:0.65rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px">Data source</div>' +
            '<div style="font-size:0.72rem;color:var(--text-light);line-height:1.5">' + m.tdsSource + '</div>' +
            '</div>';
    }

    // ── Food contact ─────────────────────────────────────────────────
    var foodContactNote = '';
    if(m.foodContactRegulations && m.foodContactRegulations.length > 0) {
        foodContactNote =
            '<div style="font-size:0.72rem;color:var(--text-light);margin-top:4px">' +
            '🍽️ Food contact: ' + m.foodContactRegulations.join(', ') +
            '</div>';
    }

    // ── Assemble full card ───────────────────────────────────────────
    return '<div class="material-item' + (verified ? ' verified-item' : '') + '" onclick="this.classList.toggle(\'expanded\')">' +

        // ── CLOSED STATE: compact header ─────────────────────────────
        '<div class="mat-header">' +
            '<div style="flex:1;min-width:0;overflow:hidden">' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                    '<h3 style="margin:0;font-size:0.9rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + hl(m.name) + '</h3>' +
                    '<span style="font-size:0.7rem;font-weight:400;color:var(--text-light)">[' + (m.family||'?') + ']</span>' +
                    (m.company ? '<span style="font-size:0.7rem;color:var(--text-light)">· ' + hl(m.company) + '</span>' : '') +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px">' +
                    headerPills + badges +
                '</div>' +
            '</div>' +
            '<svg class="chevron" style="margin-left:8px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</div>' +

        // ── EXPANDED STATE: full detail ──────────────────────────────
        '<div class="mat-body"><div class="mat-body-content">' +

            // Barrier sections
            '<div style="border-top:1px solid var(--border);padding-top:4px">' +
                _matBarrierSection(m, 'wvtr', idStr) +
            '</div>' +
            '<div style="border-top:1px solid var(--border-light,#f1f5f9);padding-top:4px;margin-top:4px">' +
                _matBarrierSection(m, 'otr', idStr) +
            '</div>' +
            '<div style="border-top:1px solid var(--border-light,#f1f5f9);padding-top:4px;margin-top:4px">' +
                _matBarrierSection(m, 'co2', idStr) +
            '</div>' +

            // Physical properties
            physProps +
            hygroProps +
            foodContactNote +

            // Supplier info
            '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:12px;padding-top:10px">' +
                '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Supplier</div>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px">' +
                    (m.company ? '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">Company</div><div style="font-size:0.8rem;font-weight:600">' + hl(m.company) + '</div></div>' : '') +
                    '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px">' +
                        '<div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">Contact email</div>' +
                        (m.supplierEmail
                            ? '<div style="font-size:0.78rem;font-weight:500;color:var(--primary)">' + m.supplierEmail + '</div>'
                            : '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic">Not available</div>') +
                    '</div>' +
                    '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px">' +
                        '<div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">TDS</div>' +
                        (m.tdsLink
                            ? '<a href="' + m.tdsLink + '" target="_blank" onclick="event.stopPropagation()" style="font-size:0.78rem;font-weight:500;color:var(--primary);text-decoration:none">View datasheet →</a>'
                            : '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic">Not available</div>') +
                    '</div>' +
                '</div>' +
            '</div>' +

            // Source note
            sourceNote +

            // Actions
            '<div class="mat-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light,#f1f5f9)">' + btns + '</div>' +

            // Reliability voting
            '<div class="mat-voting" style="margin-top:10px">' +
                '<div class="mat-voting-label">' +
                    '<span>Community reliability</span>' +
                    '<span class="reliability-badge ' + relClass + '">' + relLabel + '</span>' +
                '</div>' +
                '<div class="mat-voting-buttons">' +
                    '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();voteReliability(\'' + idStr + '\',\'up\')"   style="' + upStyle   + '" title="' + (userVote==='up'  ?'Remove vote':'Reliable')   + '">👍</button>' +
                    '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();voteReliability(\'' + idStr + '\',\'down\')" style="' + downStyle + '" title="' + (userVote==='down'?'Remove vote':'Unreliable') + '">👎</button>' +
                '</div>' +
            '</div>' +

        '</div></div></div>';
}

// ====================================================================
// 🔍 FILTER + RENDER LIST
// ====================================================================
function matApplyFilters() {
    Engine.mode = State.mode;
    var q       = ((document.getElementById('mat-search')  ? document.getElementById('mat-search').value  : State.searchQuery) || '').trim().toLowerCase();
    var fc      = (document.getElementById('mf-company')   ? document.getElementById('mf-company').value  : '');
    var fperf   = (document.getElementById('mf-perf')      ? document.getElementById('mf-perf').value     : '');
    var fmethod = (document.getElementById('mf-method')    ? document.getElementById('mf-method').value   : '');
    var ffamily = (document.getElementById('mf-family')    ? document.getElementById('mf-family').value   : '');
    var ftype   = (document.getElementById('mf-type')      ? document.getElementById('mf-type').value     : '');

    var chipsEl = document.getElementById('mf-chips');
    if(chipsEl) {
        var chips = [];
        if(fc)      chips.push({ label:'Supplier: '+fc,                    clear:"document.getElementById('mf-company').value='';matApplyFilters()" });
        if(fperf)   chips.push({ label:State.mode.toUpperCase()+': '+fperf, clear:"document.getElementById('mf-perf').value='';matApplyFilters()" });
        if(fmethod) chips.push({ label:'Method: '+fmethod,                 clear:"document.getElementById('mf-method').value='';matApplyFilters()" });
        if(ffamily) chips.push({ label:'Family: '+ffamily,                 clear:"document.getElementById('mf-family').value='';matApplyFilters()" });
        if(ftype)   chips.push({ label:'Type: '+ftype,                     clear:"document.getElementById('mf-type').value='';matApplyFilters()" });
        chipsEl.innerHTML = chips.map(function(c){
            return '<span onclick="' + c.clear + '" style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;background:var(--primary-light);color:var(--primary);font-size:0.72rem;font-weight:600;cursor:pointer">✕ ' + c.label + '</span>';
        }).join('');
    }

    var filtered = DB.materials.filter(function(m) {
        if(fc) { var hay = ((m.company||'')+' '+(m.name||'')).toLowerCase(); if(hay.indexOf(fc.toLowerCase()) < 0) return false; }
        if(fperf) {
            var val = State.mode === 'wvtr' ? ((m.wvtrValues&&m.wvtrValues[0])?m.wvtrValues[0].value:null) : ((m.otrValues&&m.otrValues[0])?m.otrValues[0].value:null);
            if(val === null) return false;
            if(fperf==='ultra' && !(val < 0.1))  return false;
            if(fperf==='high'  && !(val < 1))    return false;
            if(fperf==='med'   && !(val < 10))   return false;
            if(fperf==='low'   && !(val >= 10))  return false;
        }
        if(fmethod) { var tm = State.mode==='wvtr'?(m.testMethodWVTR||''):(m.testMethodOTR||''); if(tm.trim() !== fmethod) return false; }
        if(ffamily && m.family !== ffamily) return false;
        if(ftype==='community' && !m.isCommunity) return false;
        if(ftype==='verified'  && !isVerifiedMaterial(m)) return false;
        if(ftype==='metallized'&& !m.isMetallized) return false;
        if(ftype==='arrhenius' && !Engine.validateArrhenius(m).valid) return false;
        if(q) {
            var numRe = /^\s*(wvtr|otr|co2)\s*(<=|>=|<|>|=)\s*([\d.]+)\s*$/i;
            var nm = q.match(numRe);
            if(nm) {
                var type2=nm[1].toLowerCase(), op=nm[2], thresh=parseFloat(nm[3]);
                var vals2 = type2==='wvtr'?(m.wvtrValues||[]):type2==='otr'?(m.otrValues||[]):(m.co2Values||[]);
                var found2 = vals2.some(function(v){
                    if(op==='<')  return v.value < thresh;
                    if(op==='>')  return v.value > thresh;
                    if(op==='<=') return v.value <= thresh;
                    if(op==='>=') return v.value >= thresh;
                    if(op==='=')  return v.value == thresh;
                    return false;
                });
                if(!found2) return false;
            } else {
                var hay2 = (m.name+' '+(m.family||'')+' '+(m.company||'')+' '+(m.testMethodWVTR||'')+' '+(m.testMethodOTR||'')+' '+(m.testMethodCO2||'')).toLowerCase();
                if(hay2.indexOf(q) < 0) return false;
            }
        }
        return true;
    });

    filtered.sort(function(a,b){ return a.name.localeCompare(b.name); });

    var listEl  = document.getElementById('mat-list');
    var labelEl = document.getElementById('mat-result-label');
    if(labelEl) labelEl.innerHTML = 'Showing <strong>' + filtered.length + '</strong> of ' + DB.materials.length + ' materials';
    if(!listEl) return;
    if(filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin-bottom:0.5rem;opacity:0.3"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg><p>No materials match these filters</p></div>';
        return;
    }
    listEl.innerHTML = filtered.map(function(m){ return matCardHTML(m, q); }).join('');
}

function onMatSearch(val) {
    State.searchQuery = val || '';
    matApplyFilters();
    setTimeout(function(){
        var input = document.getElementById('mat-search');
        if(input){ input.focus(); input.setSelectionRange(val.length, val.length); }
    }, 10);
}

// ====================================================================
// 📄 RENDER MATERIALS PAGE
// ====================================================================
function renderMaterials() {
    Engine.mode = State.mode;
    var currentLabel = State.mode === 'wvtr' ? 'WVTR' : 'OTR';
    var currentUnit  = State.mode === 'wvtr' ? 'g/m²·day' : 'cc/m²·day';

    var companies={}, methods={}, families={};
    DB.materials.forEach(function(m){
        if(m.company && m.company.trim()) companies[m.company.trim()] = true;
        var tm = State.mode==='wvtr'?(m.testMethodWVTR||''):(m.testMethodOTR||'');
        if(tm) methods[tm.trim()] = true;
        if(m.family) families[m.family] = true;
    });

    var compOpts = Object.keys(companies).sort().map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join('');
    var methOpts = Object.keys(methods).sort().map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
    var famOpts  = Object.keys(families).sort().map(function(f){ return '<option value="'+f+'">'+f+'</option>'; }).join('');

    return '<div style="padding:0.25rem 0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">' +
            '<div style="font-size:1rem;font-weight:600">Materials <span class="badge badge-blue">' + DB.materials.length + '</span></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="btn btn-sm btn-primary"  onclick="showMatModal()">+ Add material</button>' +
                '<button class="btn btn-sm btn-outline"  onclick="showBulkImport()">Import CSV</button>' +
                '<button class="btn btn-sm btn-outline"  onclick="showTrashPanel()" title="View deleted materials" style="' + (_matTrash.length > 0 ? 'border-color:var(--danger);color:var(--danger)' : '') + '">' +
                    '🗑️ Trash' + (_matTrash.length > 0 ? ' <span class="badge badge-red">'+_matTrash.length+'</span>' : '') +
                '</button>' +
            '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:0.75rem">' +
            '<div style="font-size:0.75rem;font-weight:600;color:var(--text-light);margin-bottom:0.6rem">Filters</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:0.6rem">' +
                '<div class="form-group" style="margin:0"><label>Supplier / brand</label>' +
                    '<select class="form-input" id="mf-company" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All suppliers</option>' + compOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>' + currentLabel + ' level</label>' +
                    '<select class="form-input" id="mf-perf" onchange="matApplyFilters()" style="font-size:0.78rem">' +
                    '<option value="">Any</option><option value="ultra">&lt; 0.1 ' + currentUnit + '</option>' +
                    '<option value="high">&lt; 1 ' + currentUnit + '</option><option value="med">&lt; 10 ' + currentUnit + '</option>' +
                    '<option value="low">&gt; 10 ' + currentUnit + '</option></select></div>' +
                '<div class="form-group" style="margin:0"><label>Test method</label>' +
                    '<select class="form-input" id="mf-method" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All methods</option>' + methOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>Family</label>' +
                    '<select class="form-input" id="mf-family" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All families</option>' + famOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>Type</label>' +
                    '<select class="form-input" id="mf-type" onchange="matApplyFilters()" style="font-size:0.78rem">' +
                    '<option value="">All types</option><option value="community">Community only</option>' +
                    '<option value="verified">Verified only</option><option value="metallized">Metallized only</option>' +
                    '<option value="arrhenius">Arrhenius ready</option></select></div>' +
            '</div>' +
            '<div id="mf-chips" style="display:flex;flex-wrap:wrap;gap:5px"></div>' +
        '</div>' +

        '<div class="search-input" style="position:relative;margin-bottom:0.75rem">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--text-light);pointer-events:none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" class="form-input" id="mat-search" style="padding-left:32px;font-size:0.82rem" ' +
                'placeholder="Search by name, supplier, value (e.g. wvtr &lt; 2, otr &gt; 500, co2 &lt; 5)…" ' +
                'value="' + State.searchQuery + '" oninput="onMatSearch(this.value)">' +
        '</div>' +

        '<div style="background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:1rem 1.25rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
            '<div style="font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;font-size:0.68rem;margin-bottom:0.65rem;display:flex;align-items:center;gap:0.4rem">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;color:#2563eb"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
                'Badge Guide' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">' +
                '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;background:#f5f3ff;border-radius:8px;border-left:3px solid #7c3aed">' +
                    '<span class="badge badge-purple" style="flex-shrink:0;white-space:nowrap">🌍 Community</span>' +
                    '<span style="color:#374151;font-size:0.72rem;line-height:1.4">User-submitted data.</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;background:#f0fdf4;border-radius:8px;border-left:3px solid #16a34a">' +
                    '<span class="badge badge-green" style="flex-shrink:0;white-space:nowrap">✅ Verified</span>' +
                    '<span style="color:#374151;font-size:0.72rem;line-height:1.4">Certified Materials</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;background:#fefce8;border-radius:8px;border-left:3px solid #d97706">' +
                    '<span class="badge badge-yellow" style="flex-shrink:0;white-space:nowrap">⚙️ Metallized</span>' +
                    '<span style="color:#374151;font-size:0.72rem;line-height:1.4">Barrier independent of thickness.</span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;background:#f0fdf4;border-radius:8px;border-left:3px solid #16a34a">' +
                    '<span class="badge badge-green" style="flex-shrink:0;white-space:nowrap">✓ Arrhenius</span>' +
                    '<span style="color:#374151;font-size:0.72rem;line-height:1.4">≥ 2 temperatures at constant RH.</span>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<div style="font-size:0.75rem;color:var(--text-light);margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center">' +
            '<span id="mat-result-label">Showing <strong>' + DB.materials.length + '</strong> materials</span>' +
            '<span>WVTR · OTR · CO₂TR</span>' +
        '</div>' +
        '<div id="mat-list" style="display:flex;flex-direction:column;gap:6px"></div>' +
    '</div>';
}

// ====================================================================
// EDIT ADD MATERIAL MODAL - new layout
// ====================================================================

// Builds a barrier section (table + add-new-row form) inside the modal
function _modalBarrierSection(type, mat, isCommMat, isDefaultMat) {
    var labels  = { wvtr:'WVTR', otr:'OTR', co2:'CO\u2082TR' };
    var units   = { wvtr:'g/m\xb2\xb7day', otr:'cc/m\xb2\xb7day\xb7atm', co2:'cc/m\xb2\xb7day\xb7atm' };
    var valKeys = { wvtr:'wvtrValues', otr:'otrValues', co2:'co2Values' };
    var tmKeys  = { wvtr:'testMethodWVTR', otr:'testMethodOTR', co2:'testMethodCO2' };
    var ctmOpts = {
        wvtr: ['ASTM F1249','ISO 15106-3','ASTM E96','JIS K7129','MOCON PERMATRAN','DIN 53122'],
        otr:  ['ASTM D3985','ASTM D1927','ISO 15106-2','JIS K7126','MOCON OXTRAN'],
        co2:  ['ASTM D1434','ISO 15105-1','ISO 15105-2','MOCON']
    };
    var label   = labels[type];
    var unit    = units[type];
    var vals    = mat ? (mat[valKeys[type]] || []) : [];
    var topTM   = mat ? (mat[tmKeys[type]] || '') : '';
    var roData  = isCommMat || isDefaultMat;

    var tmOptsHTML = '<option value="">-- method --</option>';
    ctmOpts[type].forEach(function(t){ tmOptsHTML += '<option value="'+t+'">'+t+'</option>'; });

    var html =
        '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:14px;padding-top:12px">' +
        '<div style="font-size:0.72rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">' +
            label + ' <span style="font-weight:400;text-transform:none;font-size:0.68rem">- ' + unit + '</span>' +
        '</div>';

    if(vals.length > 0) {
        html += '<div style="overflow-x:auto;margin-bottom:8px"><table style="width:100%;border-collapse:collapse;font-size:0.75rem">' +
            '<thead><tr style="border-bottom:1px solid var(--border)">' +
            '<th style="text-align:left;padding:3px 5px;color:var(--text-light);font-weight:600">Value</th>' +
            '<th style="text-align:left;padding:3px 5px;color:var(--text-light);font-weight:600">Thickness</th>' +
            '<th style="text-align:left;padding:3px 5px;color:var(--text-light);font-weight:600">Temp</th>' +
            '<th style="text-align:left;padding:3px 5px;color:var(--text-light);font-weight:600">RH%</th>' +
            '<th style="text-align:left;padding:3px 5px;color:var(--text-light);font-weight:600">Method</th>' +
            (roData ? '' : '<th></th>') +
            '</tr></thead><tbody id="modal-' + type + '-tbody">';
        vals.forEach(function(v, ri) {
            var condTemp = v.temperature != null ? v.temperature : '--';
            var condHum  = v.humidity    != null ? v.humidity    : '--';
            var condTM   = v.testMethod || topTM || '--';
            if(roData) {
                html += '<tr style="border-bottom:1px solid var(--border-light,#f1f5f9);background:#f8fafc">' +
                    '<td style="padding:4px 5px;font-weight:600;color:var(--primary);font-family:monospace">' + v.value + '</td>' +
                    '<td style="padding:4px 5px">' + v.thickness + ' um</td>' +
                    '<td style="padding:4px 5px">' + condTemp + (condTemp!=='--'?'C':'') + '</td>' +
                    '<td style="padding:4px 5px">' + condHum  + (condHum !=='--'?'%' :'') + '</td>' +
                    '<td style="padding:4px 5px;color:var(--text-light);font-size:0.7rem;font-style:italic">' + condTM + '</td>' +
                    '</tr>';
            } else {
                var tmSelOpts = '<option value="">-- method --</option>';
                ctmOpts[type].forEach(function(t){
                    tmSelOpts += '<option value="'+t+'"'+(condTM===t?' selected':'')+'>' + t + '</option>';
                });
                if(condTM && condTM!=='--' && ctmOpts[type].indexOf(condTM)<0)
                    tmSelOpts += '<option value="'+condTM+'" selected>'+condTM+'</option>';
                html += '<tr style="border-bottom:1px solid var(--border-light,#f1f5f9)" id="modal-'+type+'-row-'+ri+'">' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input modal-val" data-type="'+type+'" data-ri="'+ri+'" value="'+v.value+'" style="font-size:0.75rem;padding:3px 6px;width:70px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input modal-thick" data-type="'+type+'" data-ri="'+ri+'" value="'+v.thickness+'" style="font-size:0.75rem;padding:3px 6px;width:70px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input modal-temp" data-type="'+type+'" data-ri="'+ri+'" value="'+(v.temperature!=null?v.temperature:'')+'" placeholder="23" style="font-size:0.75rem;padding:3px 6px;width:55px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input modal-hum" data-type="'+type+'" data-ri="'+ri+'" value="'+(v.humidity!=null?v.humidity:'')+'" placeholder="50" style="font-size:0.75rem;padding:3px 6px;width:55px"></td>' +
                    '<td style="padding:3px 4px"><select class="form-input modal-method" data-type="'+type+'" data-ri="'+ri+'" style="font-size:0.72rem;padding:3px 5px">'+tmSelOpts+'</select></td>' +
                    '<td style="padding:3px 4px"><button type="button" style="border:none;background:none;color:var(--danger);cursor:pointer;font-size:0.9rem;padding:2px 4px" ' +
                        'onclick="document.getElementById(\'modal-'+type+'-row-'+ri+'\').remove()">x</button></td>' +
                    '</tr>';
            }
        });
        html += '</tbody></table></div>';
    } else {
        html += '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic;margin-bottom:8px">No ' + label + ' data yet.</div>';
    }

    html +=
        '<div style="background:var(--primary-light,#eff6ff);border:1px dashed var(--primary);border-radius:7px;padding:8px 10px;margin-top:4px">' +
        '<div style="font-size:0.68rem;font-weight:600;color:var(--primary);margin-bottom:6px">+ Add condition</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:5px;margin-bottom:5px">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">' + label + ' value</label>' +
                '<input type="number" step="any" class="form-input" id="modal-'+type+'-new-val" placeholder="0" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Thickness (um)</label>' +
                '<input type="number" step="any" class="form-input" id="modal-'+type+'-new-thick" placeholder="0" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Test method</label>' +
                '<select class="form-input" id="modal-'+type+'-new-method" style="font-size:0.72rem;padding:3px 5px">' + tmOptsHTML + '</select></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Temp (C)</label>' +
                '<input type="number" step="any" class="form-input" id="modal-'+type+'-new-temp" placeholder="23" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Humidity (%RH)</label>' +
                '<input type="number" step="any" class="form-input" id="modal-'+type+'-new-hum" placeholder="50" style="font-size:0.75rem;padding:3px 7px"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    return html;
}

function showMatModal(editId) {
    var mat = null;
    if(editId !== undefined && editId !== null) {
        for(var i=0; i<DB.materials.length; i++) {
            if(String(DB.materials[i].id) === String(editId)){ mat = DB.materials[i]; break; }
        }
    }

    var isDefaultMat = false;
    var isCommMat    = false;
    if(mat) {
        for(var di=0; di<DEFAULT_MATERIALS.length; di++) {
            if(DEFAULT_MATERIALS[di].id == mat.id){ isDefaultMat = true; break; }
        }
        isCommMat = !!(mat.isCommunity || (mat.id && String(mat.id).startsWith('fb_')));
    }

    var RO      = (isCommMat || isDefaultMat) ? ' disabled readonly style="opacity:0.6;cursor:not-allowed;background:#f1f5f9"' : '';
    var ROcheck = (isCommMat || isDefaultMat) ? ' disabled style="opacity:0.6;cursor:not-allowed"' : '';
    var tdsRO   = isDefaultMat ? ' disabled readonly style="opacity:0.6;cursor:not-allowed;background:#f1f5f9"' : '';

    var familyOpts = '<option value="">Select family...</option>';
    for(var fam in POLYMER_FAMILIES){
        var selected = (mat && mat.family === fam) ? ' selected' : '';
        familyOpts += '<option value="'+fam+'"'+selected+'>'+fam+'</option>';
    }
    var metallizedCheck = mat && mat.isMetallized ? 'checked' : '';

    var banner = '';
    if(isCommMat) {
        banner =
            '<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:0.6rem 0.9rem;margin-bottom:0.9rem;display:flex;gap:0.5rem;align-items:flex-start">' +
            '<span style="font-size:1rem">Community</span>' +
            '<div><div style="font-size:0.82rem;font-weight:700;color:#1e40af">Community material</div>' +
            '<div style="font-size:0.72rem;color:#3b82f6;margin-top:0.2rem">Barrier data is protected. You can <strong>add new conditions</strong> (pending approval) and edit <strong>email</strong> and <strong>TDS link</strong>.</div>' +
            '</div></div>';
    } else if(isDefaultMat) {
        banner =
            '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #fcd34d;border-radius:8px;padding:0.65rem 0.9rem;margin-bottom:0.9rem;display:flex;gap:0.5rem;align-items:flex-start">' +
            '<span style="font-size:1rem">Lock</span>' +
            '<div><div style="font-size:0.82rem;font-weight:700;color:#92400e">Built-in material</div>' +
            '<div style="font-size:0.72rem;color:#a16207;margin-top:0.2rem">Existing data is protected. You can <strong>add new conditions</strong> below.</div>' +
            '</div></div>';
    }

    var hygroRO = (isCommMat || isDefaultMat) ? ' disabled readonly style="opacity:0.6;cursor:not-allowed;background:#f1f5f9"' : '';
    var hygroHTML =
        '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:14px;padding-top:12px">' +
        '<div style="font-size:0.72rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Hygroscopic correction</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Beta WVTR (%/RH)</label>' +
                '<input type="number" step="0.001" class="form-input" id="mf-beta-wvtr" value="'+(mat&&mat.hygroscopicBetaWVTR>0?mat.hygroscopicBetaWVTR:'')+'" placeholder="0.034"'+hygroRO+'></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Ref RH WVTR (%)</label>' +
                '<input type="number" class="form-input" id="mf-refrh-wvtr" value="'+(mat&&mat.hygroscopicRefRHWVTR?mat.hygroscopicRefRHWVTR:50)+'" placeholder="50"'+hygroRO+'></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Beta OTR (%/RH)</label>' +
                '<input type="number" step="0.001" class="form-input" id="mf-beta-otr" value="'+(mat&&mat.hygroscopicBetaOTR>0?mat.hygroscopicBetaOTR:'')+'" placeholder="0.034"'+hygroRO+'></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Ref RH OTR (%)</label>' +
                '<input type="number" class="form-input" id="mf-refrh-otr" value="'+(mat&&mat.hygroscopicRefRHOTR?mat.hygroscopicRefRHOTR:50)+'" placeholder="50"'+hygroRO+'></div>' +
        '</div></div>';

    var modalBody =
        banner +
        '<div class="form-group"><label>Name *</label>' +
            '<input type="text" class="form-input" id="mf-name" value="'+(mat?mat.name:'')+'"'+RO+'></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div class="form-group" style="margin:0"><label>Material family</label>' +
                '<select class="form-input" id="mf-family"'+RO+'>'+familyOpts+'</select></div>' +
            '<div class="form-group" style="margin:0"><label>Company name</label>' +
                '<input type="text" class="form-input" id="mf-company" value="'+(mat?mat.company||'':'')+'" placeholder="e.g. DuPont, 3M..."'+RO+'></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
            '<div class="form-group" style="margin:0"><label>Contact email <span style="font-size:0.65rem;color:var(--text-light);font-weight:400">(always editable)</span></label>' +
                '<input type="email" class="form-input" id="mf-email" value="'+(mat&&mat.supplierEmail?mat.supplierEmail:'')+'" placeholder="supplier@company.com"></div>' +
            '<div class="form-group" style="margin:0"><label>TDS link <span style="font-size:0.65rem;color:var(--text-light);font-weight:400">(always editable)</span></label>' +
                '<input type="url" class="form-input" id="mf-tdslink" value="'+(mat?mat.tdsLink||'':'')+'" placeholder="https://"'+tdsRO+'></div>' +
        '</div>' +
        '<div style="margin:10px 0;padding:0.4rem 0.6rem;background:var(--warning-light);border-radius:6px;display:flex;align-items:center;gap:0.4rem">' +
            '<input type="checkbox" id="mf-metallized" '+metallizedCheck+ROcheck+'>' +
            '<label for="mf-metallized" style="font-size:0.75rem;color:var(--text-light);margin:0;cursor:'+((isCommMat||isDefaultMat)?'not-allowed':'pointer')+'">' +
            '<strong>Metallized/Coated film</strong> - Barrier independent of substrate thickness</label></div>' +
        _modalBarrierSection('wvtr', mat, isCommMat, isDefaultMat) +
        _modalBarrierSection('otr',  mat, isCommMat, isDefaultMat) +
        _modalBarrierSection('co2',  mat, isCommMat, isDefaultMat) +
        hygroHTML;

    Modal.open(
        editId !== undefined ? 'Edit Material' : 'Add Material',
        modalBody,
        function() {
            var name    = document.getElementById('mf-name').value.trim();
            if(!name){ alert('Enter material name'); return false; }
            var family        = document.getElementById('mf-family').value;
            var company       = document.getElementById('mf-company').value.trim();
            var tdsLink       = document.getElementById('mf-tdslink').value.trim();
            var supplierEmail = document.getElementById('mf-email') ? document.getElementById('mf-email').value.trim() : '';
            if(tdsLink && !tdsLink.startsWith('http')){ alert('TDS Link must start with http:// or https://'); return false; }
            var isMetallized  = document.getElementById('mf-metallized') ? document.getElementById('mf-metallized').checked : false;

            if(isCommMat && mat) {
                ['wvtr','otr','co2'].forEach(function(type) {
                    var nv = parseFloat(document.getElementById('modal-'+type+'-new-val').value);
                    var nt = parseFloat(document.getElementById('modal-'+type+'-new-thick').value);
                    var ntp= parseFloat(document.getElementById('modal-'+type+'-new-temp').value);
                    var nh = parseFloat(document.getElementById('modal-'+type+'-new-hum').value);
                    var nm = document.getElementById('modal-'+type+'-new-method').value.trim();
                    if(!isNaN(nv)&&nv>=0&&!isNaN(nt)&&nt>0&&!isNaN(ntp)&&!isNaN(nh)) {
                        var entry = { value:nv, thickness:nt, temperature:ntp, humidity:nh };
                        if(nm) entry.testMethod = nm;
                        sendPendingConditionForApproval(mat, type, entry, supplierEmail);
                    }
                });
                DB.updateMat(editId, { supplierEmail: supplierEmail, tdsLink: tdsLink });
                render(); return true;
            }

            function collectRows(type) {
                var rows = [];
                var valEls   = document.querySelectorAll('.modal-val[data-type="'+type+'"]');
                var thickEls = document.querySelectorAll('.modal-thick[data-type="'+type+'"]');
                var tempEls  = document.querySelectorAll('.modal-temp[data-type="'+type+'"]');
                var humEls   = document.querySelectorAll('.modal-hum[data-type="'+type+'"]');
                var methEls  = document.querySelectorAll('.modal-method[data-type="'+type+'"]');
                for(var i=0; i<valEls.length; i++) {
                    var v=parseFloat(valEls[i].value),t=parseFloat(thickEls[i].value),
                        te=parseFloat(tempEls[i].value),h=parseFloat(humEls[i].value),
                        mt=methEls[i]?methEls[i].value.trim():'';
                    if(isNaN(v)||v<0||isNaN(t)||t<=0||isNaN(te)||isNaN(h)) continue;
                    var obj={value:v,thickness:t,temperature:te,humidity:h};
                    if(mt) obj.testMethod=mt;
                    rows.push(obj);
                }
                var nv=parseFloat(document.getElementById('modal-'+type+'-new-val').value);
                var nt=parseFloat(document.getElementById('modal-'+type+'-new-thick').value);
                var ntp=parseFloat(document.getElementById('modal-'+type+'-new-temp').value);
                var nh=parseFloat(document.getElementById('modal-'+type+'-new-hum').value);
                var nm=document.getElementById('modal-'+type+'-new-method').value.trim();
                if(!isNaN(nv)&&nv>=0&&!isNaN(nt)&&nt>0&&!isNaN(ntp)&&!isNaN(nh)) {
                    var e={value:nv,thickness:nt,temperature:ntp,humidity:nh};
                    if(nm) e.testMethod=nm;
                    rows.push(e);
                }
                return rows;
            }

            function collectReadOnlyPlusNew(type) {
                var existing = mat ? (mat[{wvtr:'wvtrValues',otr:'otrValues',co2:'co2Values'}[type]] || []) : [];
                var nv=parseFloat(document.getElementById('modal-'+type+'-new-val').value);
                var nt=parseFloat(document.getElementById('modal-'+type+'-new-thick').value);
                var ntp=parseFloat(document.getElementById('modal-'+type+'-new-temp').value);
                var nh=parseFloat(document.getElementById('modal-'+type+'-new-hum').value);
                var nm=document.getElementById('modal-'+type+'-new-method').value.trim();
                var rows=existing.slice();
                if(!isNaN(nv)&&nv>=0&&!isNaN(nt)&&nt>0&&!isNaN(ntp)&&!isNaN(nh)) {
                    var e={value:nv,thickness:nt,temperature:ntp,humidity:nh};
                    if(nm) e.testMethod=nm;
                    rows.push(e);
                }
                return rows;
            }

            var wvtrValues = isDefaultMat ? collectReadOnlyPlusNew('wvtr') : collectRows('wvtr');
            var otrValues  = isDefaultMat ? collectReadOnlyPlusNew('otr')  : collectRows('otr');
            var co2Values  = isDefaultMat ? collectReadOnlyPlusNew('co2')  : collectRows('co2');

            var betaWVTR  = parseFloat(document.getElementById('mf-beta-wvtr').value)  || 0;
            var refRHWVTR = parseFloat(document.getElementById('mf-refrh-wvtr').value) || 50;
            var betaOTR   = parseFloat(document.getElementById('mf-beta-otr').value)   || 0;
            var refRHOTR  = parseFloat(document.getElementById('mf-refrh-otr').value)  || 50;

            var matData = {
                name: name, family: family || getFamily(name), company: company,
                tdsLink: tdsLink, supplierEmail: supplierEmail,
                isMetallized: isMetallized,
                hygroscopicBetaWVTR: betaWVTR,   hygroscopicRefRHWVTR: refRHWVTR,
                hygroscopicBetaOTR:  betaOTR,    hygroscopicRefRHOTR:  refRHOTR,
                isHygroscopic: (betaWVTR > 0 || betaOTR > 0),
                testMethodWVTR: mat ? mat.testMethodWVTR : '',
                testMethodOTR:  mat ? mat.testMethodOTR  : '',
                testMethodCO2:  mat ? mat.testMethodCO2  : '',
                wvtrValues: wvtrValues, otrValues: otrValues, co2Values: co2Values,
                validConditions: []
            };

            if(editId !== null && editId !== undefined) DB.updateMat(editId, matData);
            else DB.addMat(matData);
            render();
            return true;
        }
    );
}

// ====================================================================
// sendPendingConditionForApproval
// ====================================================================
async function sendPendingConditionForApproval(mat, type, newEntry, submitterEmail) {
    var ADMIN_EMAIL = 'admin@yourapp.com';
    var typeLabel = { wvtr:'WVTR', otr:'OTR', co2:'CO2TR' }[type] || type.toUpperCase();
    if(window.communityDB) {
        try {
            var pendingDoc = {
                materialName:   mat.name,
                materialId:     String(mat.id),
                firebaseDocId:  mat.firebaseDocId || null,
                type:           type,
                value:          newEntry.value,
                thickness:      newEntry.thickness,
                temperature:    newEntry.temperature,
                humidity:       newEntry.humidity,
                testMethod:     newEntry.testMethod || '',
                submitterEmail: submitterEmail || '',
                pending:        true,
                submittedAt:    new Date().toISOString()
            };
            if(window.fbDoc && window.fbSetDoc) {
                await window.fbSetDoc(
                    window.fbDoc(window.communityDB, 'pending_conditions', Date.now() + '_' + String(mat.id)),
                    pendingDoc
                );
            }
        } catch(e) { console.warn('Pending save failed:', e); }
    }
    var subject = encodeURIComponent('[APPROVAL NEEDED] New ' + typeLabel + ' condition for ' + mat.name);
    var bodyLines = [
        'A new condition was submitted for approval.',
        '',
        'Material: ' + mat.name + ' (' + (mat.family||'?') + ')',
        'Type: ' + typeLabel,
        'Value: ' + newEntry.value,
        'Thickness: ' + newEntry.thickness + ' um',
        'Temperature: ' + newEntry.temperature + 'C',
        'Humidity: ' + newEntry.humidity + '%',
        'Test method: ' + (newEntry.testMethod || '-'),
        'Submitted by: ' + (submitterEmail || '-'),
        '',
        'To approve: Firebase console > pending_conditions > set pending: false.',
        'Material Firebase ID: ' + (mat.firebaseDocId || 'not yet shared')
    ];
    window.open('mailto:' + ADMIN_EMAIL + '?subject=' + subject + '&body=' + encodeURIComponent(bodyLines.join('\n')));
}


function addMatRow() {
    var currentMode  = State.mode;
    var currentLabel = currentMode === 'wvtr' ? 'WVTR' : 'OTR';
    var ctmList = currentMode === 'wvtr'
        ? ['ASTM F1249','ISO 15106-3','ASTM E96','JIS K7129','MOCON PERMATRAN','DIN 53122']
        : ['ASTM D3985','ASTM D1927','ISO 15106-2','JIS K7126','MOCON OXTRAN'];
    var tmOpts = '<option value="">— test method —</option>';
    for (var ti = 0; ti < ctmList.length; ti++) {
        tmOpts += '<option value="' + ctmList[ti] + '">' + ctmList[ti] + '</option>';
    }
    document.getElementById('mf-rows').insertAdjacentHTML('beforeend',
        '<div class="wvtr-row-form" style="margin-bottom:0.5rem;animation:fadeIn 0.2s ease">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:0.35rem;margin-bottom:0.35rem">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">' + currentLabel + ' value</label>' +
                '<input type="number" step="any" class="form-input mf-val" placeholder="0" style="font-size:0.78rem"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Thickness (µm)</label>' +
                '<input type="number" step="any" class="form-input mf-thick" placeholder="0" style="font-size:0.78rem"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Test method</label>' +
                '<select class="form-input mf-rowmethod" style="font-size:0.75rem">' + tmOpts + '</select></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.35rem">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Temp (°C)</label>' +
                '<input type="number" step="any" class="form-input mf-temp" placeholder="23" style="font-size:0.78rem"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Humidity (%)</label>' +
                '<input type="number" step="any" class="form-input mf-hum" placeholder="50" style="font-size:0.78rem"></div>' +
        '</div>' +
        '</div>');
}

// ====================================================================
// 📥 BULK IMPORT
// ====================================================================
function showBulkImport() {
    Modal.open('Bulk Import (CSV)',
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">' +
        '<strong>CSV format:</strong><br>' +
        'Name,Family,TestMethod,IsMetallized,WVTR_Value,WVTR_Thickness,OTR_Value,OTR_Thickness,Temp1,Hum1[,Temp2,Hum2,...]<br><br>' +
        '<strong>Example:</strong><br>PET,PET,ASTM F1249,false,1.0,500,150,500,23,50,38,50<br>' +
        'Alu-PET,PET,,true,0.01,500,0.005,500,23,50</p>' +
        '<div class="import-area"><textarea id="bulk-data" placeholder="PET,PET,ASTM F1249,false,1.0,500,150,500,23,50,38,50"></textarea></div>' +
        '<p style="font-size:.7rem;color:var(--text-light);margin-top:.5rem">Or <a href="#" onclick="document.getElementById(\'bulk-file\').click();return false">upload JSON</a>' +
        '<input type="file" id="bulk-file" accept=".json" style="display:none" onchange="importFile(this)"></p>',
        function(){
            var data = document.getElementById('bulk-data').value.trim();
            if(!data){ alert('Paste data first'); return false; }
            try {
                var lines = data.split('\n').filter(function(l){ return l.trim(); });
                var count = 0;
                for(var li=0; li<lines.length; li++){
                    var cols = lines[li].split(/,\s*|\t/).map(function(s){ return s.trim(); });
                    if(cols.length < 10) continue;
                    var name         = cols[0];
                    var family       = cols[1] || getFamily(cols[0]);
                    var testMethod   = cols[2] || '';
                    var isMetallized = (cols[3]||'').toLowerCase() === 'true';
                    var wvtr  = parseFloat(cols[4])||0; var wvtrT = parseFloat(cols[5])||0;
                    var otr   = parseFloat(cols[6])||0; var otrT  = parseFloat(cols[7])||0;
                    var validConditions = [];
                    for(var i=8; i<cols.length; i+=2){
                        var te=parseFloat(cols[i]); var h=parseFloat(cols[i+1]);
                        if(!isNaN(te)&&!isNaN(h)) validConditions.push({temperature:te,humidity:h});
                    }
                    if(name && validConditions.length > 0){
                        DB.addMat({ name:name, family:family, testMethod:testMethod, isMetallized:isMetallized,
                            wvtrValues:[{value:wvtr,thickness:wvtrT}], otrValues:[{value:otr,thickness:otrT}],
                            co2Values:[], validConditions:validConditions });
                        count++;
                    }
                }
                alert('Imported '+count+' materials'); render(); return true;
            } catch(e){ alert('Import error: '+e.message); return false; }
        }
    );
}

function importFile(input) {
    var file = input.files[0]; if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
        try {
            var data = JSON.parse(e.target.result);
            if(data.materials){ DB.importAll(JSON.stringify(data)); alert('Imported '+data.materials.length+' materials'); Modal.close(); render(); }
        } catch(err){ alert('File import error: '+err.message); }
    };
    reader.readAsText(file);
}

// ====================================================================
// 📥 EXTERNAL materials.json LOADER
// ====================================================================
async function loadExternalMaterialsDB() {
    try {
        var res = await fetch('materials.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        var externalMats = Array.isArray(data) ? data : (data.materials || []);
        if (!externalMats.length) return;

        var existingByFirebaseId = {};
        var existingByName = {};
        for (var i = 0; i < DB.materials.length; i++) {
            var m = DB.materials[i];
            if (m.firebaseDocId) existingByFirebaseId[m.firebaseDocId] = m;
            existingByName[m.name.trim().toLowerCase()] = m;
        }

        var addedCount = 0;
        for (var ei = 0; ei < externalMats.length; ei++) {
            var em = externalMats[ei];
            if (!em || !em.name) continue;
            var nameLower = em.name.trim().toLowerCase();

            if (em.firebaseDocId && existingByFirebaseId[em.firebaseDocId]) {
                var existing = existingByFirebaseId[em.firebaseDocId];
                if (em.hygroscopicBetaWVTR !== undefined) {
                    existing.hygroscopicBetaWVTR  = em.hygroscopicBetaWVTR;
                    existing.hygroscopicRefRHWVTR = em.hygroscopicRefRHWVTR;
                    existing.hygroscopicBetaOTR   = em.hygroscopicBetaOTR;
                    existing.hygroscopicRefRHOTR  = em.hygroscopicRefRHOTR;
                }
                continue;
            }

            if (existingByName[nameLower]) {
                var existingN = existingByName[nameLower];
                if (em.firebaseDocId) existingN.firebaseDocId = em.firebaseDocId;
                if (em.hygroscopicBetaWVTR !== undefined) {
                    existingN.hygroscopicBetaWVTR  = em.hygroscopicBetaWVTR;
                    existingN.hygroscopicRefRHWVTR = em.hygroscopicRefRHWVTR;
                    existingN.hygroscopicBetaOTR   = em.hygroscopicBetaOTR;
                    existingN.hygroscopicRefRHOTR  = em.hygroscopicRefRHOTR;
                }
                continue;
            }

            var newMat = Object.assign({}, em);
            if (em.firebaseDocId) {
                var numericIds = DB.materials.map(function(m) {
                    return typeof m.id === 'number' ? m.id : 0;
                });
                var maxId = numericIds.length ? Math.max.apply(null, numericIds) : 0;
                newMat.id = maxId + 1 + addedCount;
            }
            newMat.family           = em.family || getFamily(em.name);
            newMat.isMetallized     = em.isMetallized || false;
            newMat.reliabilityVotes = em.reliabilityVotes || { up: 0, down: 0 };
            if (!newMat.co2Values) newMat.co2Values = [];

            DB.materials.push(newMat);
            existingByFirebaseId[newMat.firebaseDocId] = newMat;
            existingByName[nameLower] = newMat;
            addedCount++;
        }

        if (addedCount > 0) {
            DB.save();
            render();
            console.log('✅ materials.json: aggiunti ' + addedCount + ' materiali');
        }
    } catch (e) {
        console.log('ℹ️ materials.json non caricato:', e.message);
    }
}

// ====================================================================
// 🚀 APP INIT
// ====================================================================
