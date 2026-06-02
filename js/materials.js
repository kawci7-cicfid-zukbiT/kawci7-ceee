// ====================================================================
// MATERIALS.JS
// Dependencies: engine.js, app.js, render.js
// ====================================================================

// ====================================================================
// SOFT DELETE / TRASH  (persisted in localStorage)
// ====================================================================
var _matTrash = (function() {
    try { return JSON.parse(localStorage.getItem('wvtr_mat_trash') || '[]'); }
    catch(e) { return []; }
})();

function _saveTrash() {
    try { localStorage.setItem('wvtr_mat_trash', JSON.stringify(_matTrash)); }
    catch(e) { console.warn('Trash persist failed:', e); }
}

function softDeleteMat(matId) {
    var idx = DB.materials.findIndex(function(m){ return String(m.id) === String(matId); });
    if(idx < 0) return;
    var mat = DB.materials[idx];
    _matTrash.push(mat);
    _saveTrash();
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
    _saveTrash();
    DB.materials.push(mat);
    DB.save();
    matApplyFilters();
}

function showTrashNotification(mat) {
    var old = document.getElementById('trash-toast');
    if(old) old.remove();
    var toast = document.createElement('div');
    toast.id = 'trash-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:0.75rem 1.25rem;border-radius:10px;font-size:0.82rem;display:flex;align-items:center;gap:1rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3)';
    toast.innerHTML =
        '<span>\uD83D\uDDD1\uFE0F <strong>' + _escHtml(mat.name) + '</strong> moved to trash</span>' +
        '<button onclick="restoreFromTrash(\'' + String(mat.id) + '\');this.closest(\'#trash-toast\').remove()" ' +
        'style="background:var(--primary);color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.78rem;font-weight:600">Undo</button>' +
        '<button onclick="this.closest(\'#trash-toast\').remove()" ' +
        'style="background:transparent;color:rgba(255,255,255,0.5);border:none;cursor:pointer;font-size:1rem;padding:0 0.25rem">\u00d7</button>';
    document.body.appendChild(toast);
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 6000);
}

function showTrashPanel() {
    if(_matTrash.length === 0) { alert('The trash is empty.'); return; }
    var body = '<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.75rem">Items in trash are recovered to your local database only.</div>';
    body += _matTrash.map(function(m) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">' +
            '<span style="font-size:0.85rem;font-weight:500">' + _escHtml(m.name) + '</span>' +
            '<button class="btn btn-sm btn-success" onclick="restoreFromTrash(\'' + String(m.id) + '\');Modal.close();matApplyFilters()">Restore</button>' +
            '</div>';
    }).join('');
    Modal.open('Trash (' + _matTrash.length + ' items)', body, function(){ return true; });
}

// ====================================================================
// HTML ESCAPING HELPER
// ====================================================================
function _escHtml(str) {
    if(!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _escAttr(str) {
    return _escHtml(str).replace(/\\/g, '\\\\');
}

// ====================================================================
// CONTACT SUPPLIER
// ====================================================================
function contactSupplier(matName, company, email) {
    if(!email) { alert('No supplier email available.'); return; }
    var subject = encodeURIComponent('Technical Data Request - ' + matName);
    var body = encodeURIComponent('Dear ' + (company || 'Supplier') + ',\n\nI am contacting you regarding "' + matName + '".\n\nBest regards');
    window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

// ====================================================================
// COMMUNITY SHARE
// ====================================================================
async function shareToCommunity(matId) {
    var mat = DB.materials.find(function(m){ return String(m.id) === String(matId); });
    if(!mat) return;
    if(!window.communityDB) { alert('Database not connected.'); return; }
    var btn = event && event.target ? event.target : null;
    if(btn) { btn.disabled = true; btn.textContent = '...'; }
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
    } catch(e) { alert('Error: ' + e.message); }
    finally {
        if(btn) { btn.disabled = false; btn.textContent = mat.firebaseDocId ? 'Update community' : 'Share with community'; }
    }
}

function submitToFirebaseById(matId) { shareToCommunity(matId); }

// ====================================================================
// PENDING CONDITION APPROVAL
// ====================================================================
async function savePendingCondition(mat, type, newEntry) {
    var valKey = { wvtr: 'wvtrValues', otr: 'otrValues', co2: 'co2Values' };
    var entry = { value: newEntry.value, thickness: newEntry.thickness,
        temperature: newEntry.temperature, humidity: newEntry.humidity,
        testMethod: newEntry.testMethod || '', pending: true };
    if(!mat[valKey[type]]) mat[valKey[type]] = [];
    mat[valKey[type]].push(entry);
    DB.save();
    matApplyFilters();
    if(window.communityDB && mat.firebaseDocId) {
        try {
            var pendingCol = window.fbCollection(window.communityDB, 'pending_conditions');
            if(window.fbAddDoc) {
                await window.fbAddDoc(pendingCol, {
                    materialName: mat.name, materialId: String(mat.id),
                    firebaseDocId: mat.firebaseDocId, type: type,
                    value: newEntry.value, thickness: newEntry.thickness,
                    temperature: newEntry.temperature, humidity: newEntry.humidity,
                    testMethod: newEntry.testMethod || '', pending: true,
                    submittedAt: new Date().toISOString()
                });
            }
        } catch(e) { console.warn('Pending Firebase save failed:', e); }
    }
}

// ====================================================================
// VERIFIED BADGE
// ====================================================================
function isVerifiedMaterial(mat) {
    if(!window.VERIFIED_MATERIALS) return null;
    return window.VERIFIED_MATERIALS[mat.name] || null;
}

// ====================================================================
// RELIABILITY VOTING
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
        if(needsSync) firebaseUpdate['reliabilityVotes.' + currentVote] = window.fbIncrement(-1);
        if(currentVote === voteType) {
            recordUserVote(matIdStr, null);
            DB.save();
            if(State.tab === 'materials') { matApplyFilters(); } else { renderContent(); }
            if(needsSync) { try { var r = window.fbDoc(window.communityDB,'materials',mat.firebaseDocId); await window.fbUpdateDoc(r, firebaseUpdate); } catch(e){} }
            return;
        }
    }
    mat.reliabilityVotes[voteType] = (mat.reliabilityVotes[voteType] || 0) + 1;
    recordUserVote(matIdStr, voteType);
    if(needsSync) firebaseUpdate['reliabilityVotes.' + voteType] = window.fbIncrement(1);
    DB.save();
    if(State.tab === 'materials') { matApplyFilters(); } else { renderContent(); }
    if(needsSync && Object.keys(firebaseUpdate).length > 0) {
        try { var ref = window.fbDoc(window.communityDB,'materials',mat.firebaseDocId); await window.fbUpdateDoc(ref, firebaseUpdate); } catch(e){}
    }
}

function hasUserVoted(matId) {
    try { var v = JSON.parse(localStorage.getItem('wvtr_user_votes') || '{}'); return v[String(matId)] || null; }
    catch(e) { return null; }
}

function recordUserVote(matId, voteType) {
    try {
        var v = JSON.parse(localStorage.getItem('wvtr_user_votes') || '{}');
        if(voteType) v[String(matId)] = voteType; else delete v[String(matId)];
        localStorage.setItem('wvtr_user_votes', JSON.stringify(v));
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
// USAGE TRACKING
// ====================================================================
function getMonthlyStats() {
    var now = new Date();
    var currentMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    var stats = JSON.parse(localStorage.getItem('wvtr_monthly_stats') || '{}');
    if(stats.month !== currentMonth && stats.counts) {
        stats.prevTop3 = Object.entries(stats.counts).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3)
            .map(function(e){ return { id: String(e[0]), count: e[1] }; });
        stats.counts = {};
    }
    stats.month = currentMonth;
    stats.counts = stats.counts || {};
    return stats;
}

async function recordMaterialUsage(matId) {
    if(!matId) return;
    var activeLayers = State.layers.filter(function(l){ return l.mid !== null; });
    if(activeLayers.length !== 1) return;
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var mat = DB.materials.find(function(m){ return String(m.id) === String(matId); });
    if(mat) { mat.usageCount = (mat.usageCount || 0) + 1; mat.lastUsageMonth = currentMonth; }
    if(window.communityDB && mat && mat.firebaseDocId) {
        try {
            var ref = window.fbDoc(window.communityDB, 'materials', mat.firebaseDocId);
            await window.fbUpdateDoc(ref, { usageCount: window.fbIncrement(1), lastUsageMonth: currentMonth });
        } catch(e) { console.warn('Firebase usage sync failed:', e); }
    }
    if(State.tab === 'home') {
        setTimeout(function(){ if(typeof updateTop3UI === 'function') updateTop3UI(); }, 200);
    }
}

function getTop3Materials() {
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var candidates = DB.materials.filter(function(m){ return m.lastUsageMonth === currentMonth && (m.usageCount||0) > 0; });
    if(candidates.length === 0) {
        var stats = getMonthlyStats();
        return Object.entries(stats.counts||{}).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3).map(function(e,idx){
            var mat = DB.materials.find(function(m){ return String(m.id) === String(e[0]); });
            return mat ? { name:mat.name, company:mat.company||null, count:e[1], icon:['1','2','3'][idx] } : null;
        }).filter(Boolean);
    }
    candidates.sort(function(a,b){ return (b.usageCount||0)-(a.usageCount||0); });
    return candidates.slice(0,3).map(function(mat,idx){
        return { name:mat.name, company:mat.company||null, count:mat.usageCount||0, icon:['1','2','3'][idx] };
    });
}

async function refreshGlobalRankings() {
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    if(window.communityDB) {
        try {
            var q = window.fbQuery(window.fbCollection(window.communityDB,'materials'), window.fbOrderBy('usageCount','desc'));
            var snapshot = await window.fbGetDocs(q);
            var globalTop = [];
            snapshot.forEach(function(d){
                var data = d.data();
                if(data.lastUsageMonth === currentMonth && (data.usageCount||0) > 0)
                    globalTop.push({ name:data.name, company:data.company||null, count:data.usageCount||0, firebaseDocId:d.id });
            });
            if(globalTop.length > 0) {
                globalTop.forEach(function(item){
                    var localMat = DB.materials.find(function(m){ return m.firebaseDocId === item.firebaseDocId; });
                    if(localMat) { localMat.usageCount = item.count; localMat.lastUsageMonth = currentMonth; }
                });
                return globalTop.slice(0,3).map(function(m,idx){ return Object.assign({},m,{icon:['1','2','3'][idx]}); });
            }
        } catch(e) { console.warn('Firebase ranking failed:', e); }
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
        container.innerHTML = top3.map(function(m, idx){
            return '<div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 1.5rem;border-bottom:1px solid #f8fafc">' +
                '<div style="font-size:0.72rem;font-weight:700;color:#cbd5e1;font-family:monospace;width:20px;flex-shrink:0">0' + (idx+1) + '</div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.85rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + _escHtml(m.name) + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">' + _escHtml(m.company || 'Community - ' + m.count + ' uses') + '</div>' +
                '</div>' +
                '<div style="font-size:0.72rem;font-weight:700;color:#2563eb">' + m.count + '</div>' +
                '</div>';
        }).join('');
    }
}
window.updateTop3UI = updateTop3UI;

// ====================================================================
// BARRIER SECTION HELPER (card view — read only, no add button)
// ====================================================================
function _buildBarrierRows(vals, topTM) {
    if(!vals || vals.length === 0) return null;
    var rows = '';
    vals.forEach(function(v) {
        var condTemp = v.temperature != null ? v.temperature : '-';
        var condHum  = v.humidity    != null ? v.humidity    : '-';
        var condTM   = v.testMethod || topTM || '-';
        var isPending = !!v.pending;
        rows += '<tr style="border-bottom:' + (isPending ? 'none' : '1px solid var(--border-light,#f1f5f9)') + ';background:' + (isPending ? '#fefce8' : 'transparent') + '">' +
            '<td style="padding:4px 6px;font-weight:600;color:' + (isPending ? '#92400e' : 'var(--primary)') + ';font-family:monospace;font-size:0.8rem">' + v.value + '</td>' +
            '<td style="padding:4px 6px">' + v.thickness + ' \u00b5m</td>' +
            '<td style="padding:4px 6px">' + condTemp + (condTemp !== '-' ? '\u00b0C' : '') + '</td>' +
            '<td style="padding:4px 6px">' + condHum  + (condHum  !== '-' ? '%' : '') + '</td>' +
            '<td style="padding:4px 6px;color:var(--text-light);font-size:0.7rem;font-style:italic">' + _escHtml(condTM) + '</td>' +
            '</tr>';
        if(isPending) {
            rows += '<tr style="background:#fef9c3;border-bottom:1px solid #fcd34d">' +
                '<td colspan="5" style="padding:3px 8px">' +
                '<span style="font-size:0.68rem;color:#92400e;font-weight:600">PENDING</span>' +
                '<span style="font-size:0.68rem;color:#92400e;margin-left:6px">To be approved - visible only to you until admin review.</span>' +
                '</td></tr>';
        }
    });
    return rows;
}

function _barrierSection(label, unit, vals, topTM) {
    var rows = _buildBarrierRows(vals, topTM);
    var html = '<div style="margin:12px 0 6px">' +
        '<span style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">' + label + '</span>' +
        '<span style="font-size:0.68rem;color:var(--text-light);font-weight:400"> - ' + unit + '</span>' +
        '</div>';
    if(rows) {
        html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:0.75rem">' +
            '<thead><tr style="border-bottom:1px solid var(--border)">' +
            '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light)">Value</th>' +
            '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light)">Thickness</th>' +
            '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light)">Temp</th>' +
            '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light)">RH%</th>' +
            '<th style="text-align:left;padding:3px 6px;font-weight:600;color:var(--text-light)">Method</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    } else {
        html += '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic;padding:4px 0">No ' + label + ' data available.</div>';
    }
    return html;
}

// ====================================================================
// MATERIAL CARD HTML
// ====================================================================
function matCardHTML(m, q) {
    var isComm   = !!(m.isCommunity || (m.id && String(m.id).startsWith('fb_')));
    var verified = isVerifiedMaterial(m);
    var relScore = getReliabilityScore(m);
    var userVote = hasUserVoted(m.id);
    var arrOk    = Engine.validateArrhenius(m).valid;
    var idStr    = String(m.id);
    var hasEmail = !!(m.supplierEmail && m.supplierEmail.trim());

    function hl(str) {
        if(!q || !str) return _escHtml(str) || '';
        var safe = _escHtml(str);
        var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','gi');
        return safe.replace(re,'<mark style="background:#fef08a;color:#713f12;padding:0 2px;border-radius:2px">$1</mark>');
    }

    function firstValPill(vals, label) {
        if(vals && vals.length > 0) {
            return '<span style="font-size:0.7rem;font-weight:600;color:var(--primary);background:var(--primary-light,#eff6ff);border:1px solid var(--primary-border,#bfdbfe);border-radius:4px;padding:1px 7px;white-space:nowrap">' + label + ' ' + vals[0].value + '</span> ';
        }
        return '<span style="font-size:0.7rem;color:var(--text-light);background:var(--bg-secondary,#f8fafc);border:1px solid var(--border);border-radius:4px;padding:1px 7px;white-space:nowrap">' + label + ' -</span> ';
    }

    var headerPills = firstValPill(m.wvtrValues,'WVTR') + firstValPill(m.otrValues,'OTR');
    if(m.co2Values && m.co2Values.length > 0) headerPills += firstValPill(m.co2Values,'CO2');

    var badges = '';
    if(isComm)         badges += '<span class="badge badge-purple" style="font-size:0.65rem">Community</span> ';
    if(verified)       badges += '<span class="badge-verified" title="Verified by ' + _escAttr(verified.by) + '">Verified</span> ';
    if(m.isMetallized) badges += '<span class="badge badge-yellow" style="font-size:0.65rem">Metallized</span> ';
    if(arrOk)          badges += '<span class="badge badge-green" style="font-size:0.65rem">Arrhenius</span> ';

    var shareLabel = m.firebaseDocId ? 'Update community' : 'Share with community';
    var btns =
        '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();showMatModal(\'' + _escAttr(idStr) + '\')">Edit</button>' +
        '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();softDeleteMat(\'' + _escAttr(idStr) + '\')">Delete</button>' +
        '<button class="btn btn-sm ' + (m.firebaseDocId ? 'btn-success' : 'btn-primary') + '" onclick="event.stopPropagation();submitToFirebaseById(\'' + _escAttr(idStr) + '\')">' + shareLabel + '</button>' +
        '<button class="btn btn-sm btn-outline" ' +
            (hasEmail ? '' : 'style="opacity:0.4;cursor:not-allowed" title="No supplier email" ') +
            'onclick="event.stopPropagation();' +
            (hasEmail ? 'contactSupplier(\'' + _escAttr(m.name||'') + '\',\'' + _escAttr(m.company||'') + '\',\'' + _escAttr(m.supplierEmail||'') + '\')' : '') +
            '">Contact supplier</button>';

    var upStyle   = userVote === 'up'   ? 'background:var(--success-light);border-color:var(--success);color:var(--success)' : '';
    var downStyle = userVote === 'down' ? 'background:var(--danger-light);border-color:var(--danger);color:var(--danger)'   : '';
    var relLabel  = relScore !== null ? relScore + '%' : '-';
    var relClass  = relScore !== null ? (relScore >= 70 ? 'high' : relScore >= 40 ? 'medium' : 'low') : 'medium';

    var physItems = [];
    if(m.density)      physItems.push(['Density',      m.density + ' kg/m\u00b3']);
    if(m.meltingTemp)  physItems.push(['Melting temp',  m.meltingTemp + '\u00b0C' + (m.meltingTempMethod ? ' (' + _escHtml(m.meltingTempMethod) + ')' : '')]);
    if(m.gwp)          physItems.push(['GWP',           m.gwp + ' kg CO\u2082eq/kg']);
    if(m.haze != null) physItems.push(['Haze',          m.haze + (m.hazeUnit||'%')]);
    var physHTML = '';
    if(physItems.length > 0) {
        physHTML = '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:10px;padding-top:10px">' +
            '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Physical properties</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">' +
            physItems.map(function(p){
                return '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px">' +
                    '<div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">' + p[0] + '</div>' +
                    '<div style="font-size:0.8rem;font-weight:600">' + p[1] + '</div></div>';
            }).join('') + '</div></div>';
    }

    var hygroItems = [];
    if(m.hygroscopicBetaWVTR > 0) hygroItems.push(['Beta WVTR', m.hygroscopicBetaWVTR + ' - ref ' + (m.hygroscopicRefRHWVTR||50) + '% RH']);
    if(m.hygroscopicBetaOTR  > 0) hygroItems.push(['Beta OTR',  m.hygroscopicBetaOTR  + ' - ref ' + (m.hygroscopicRefRHOTR ||50) + '% RH']);
    if(m.hygroscopicBetaCO2  > 0) hygroItems.push(['Beta CO2',  m.hygroscopicBetaCO2  + ' - ref ' + (m.hygroscopicRefRHCO2 ||50) + '% RH']);
    var hygroHTML = '';
    if(hygroItems.length > 0) {
        hygroHTML = '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:10px;padding-top:10px">' +
            '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Hygroscopic correction</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">' +
            hygroItems.map(function(p){
                return '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px">' +
                    '<div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">' + p[0] + '</div>' +
                    '<div style="font-size:0.8rem;font-weight:600">' + p[1] + '</div></div>';
            }).join('') + '</div></div>';
    }

    return '<div class="material-item' + (verified ? ' verified-item' : '') + '" onclick="this.classList.toggle(\'expanded\')">' +
        '<div class="mat-header">' +
            '<div style="flex:1;min-width:0;overflow:hidden">' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                    '<h3 style="margin:0;font-size:0.9rem;font-weight:600">' + hl(m.name) + '</h3>' +
                    '<span style="font-size:0.7rem;font-weight:400;color:var(--text-light)">[' + _escHtml(m.family||'?') + ']</span>' +
                    (m.company ? '<span style="font-size:0.7rem;color:var(--text-light)">- ' + hl(m.company) + '</span>' : '') +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:4px">' + headerPills + badges + '</div>' +
            '</div>' +
            '<svg class="chevron" style="margin-left:8px;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</div>' +
        '<div class="mat-body"><div class="mat-body-content">' +
            '<div style="border-top:1px solid var(--border);padding-top:4px">' +
                _barrierSection('WVTR','g/m\u00b2\u00b7day', m.wvtrValues||[], m.testMethodWVTR||'') +
                '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:8px;padding-top:4px">' +
                _barrierSection('OTR','cc/m\u00b2\u00b7day\u00b7atm', m.otrValues||[], m.testMethodOTR||'') +
                '</div>' +
                ((m.co2Values && m.co2Values.length > 0) ?
                    '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:8px;padding-top:4px">' +
                    _barrierSection('CO\u2082TR','cc/m\u00b2\u00b7day\u00b7atm', m.co2Values||[], m.testMethodCO2||'') +
                    '</div>' : '') +
            '</div>' +
            physHTML + hygroHTML +
            '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:12px;padding-top:10px">' +
                '<div style="font-size:0.7rem;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Supplier</div>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px">' +
                    (m.company ? '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">Company</div><div style="font-size:0.8rem;font-weight:600">' + hl(m.company) + '</div></div>' : '') +
                    '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">Contact email</div>' +
                        (m.supplierEmail ? '<div style="font-size:0.78rem;font-weight:500;color:var(--primary)">' + _escHtml(m.supplierEmail) + '</div>' : '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic">Not available</div>') +
                    '</div>' +
                    '<div style="background:var(--bg-secondary,#f8fafc);border-radius:6px;padding:7px 10px"><div style="font-size:0.68rem;color:var(--text-light);margin-bottom:2px">TDS</div>' +
                        (m.tdsLink ? '<a href="' + _escAttr(m.tdsLink) + '" target="_blank" onclick="event.stopPropagation()" style="font-size:0.78rem;font-weight:500;color:var(--primary);text-decoration:none">View datasheet</a>' : '<div style="font-size:0.75rem;color:var(--text-light);font-style:italic">Not available</div>') +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="mat-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light,#f1f5f9)">' + btns + '</div>' +
            '<div class="mat-voting" style="margin-top:10px">' +
                '<div class="mat-voting-label"><span>Community reliability</span><span class="reliability-badge ' + relClass + '">' + relLabel + '</span></div>' +
                '<div class="mat-voting-buttons">' +
                    '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();voteReliability(\'' + _escAttr(idStr) + '\',\'up\')" style="' + upStyle + '" title="' + (userVote==='up'?'Remove vote':'Reliable') + '">+1</button>' +
                    '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();voteReliability(\'' + _escAttr(idStr) + '\',\'down\')" style="' + downStyle + '" title="' + (userVote==='down'?'Remove vote':'Unreliable') + '">-1</button>' +
                '</div>' +
            '</div>' +
        '</div></div></div>';
}

// ====================================================================
// FILTER + RENDER LIST
// ====================================================================
function matApplyFilters() {
    Engine.mode = State.mode;
    // FIX: use filter-specific IDs (ft-*) to avoid collision with modal IDs (mm-*)
    var q       = ((document.getElementById('ft-search')  ? document.getElementById('ft-search').value  : State.searchQuery) || '').trim().toLowerCase();
    var fc      = (document.getElementById('ft-company')  ? document.getElementById('ft-company').value  : '');
    var fperf   = (document.getElementById('ft-perf')     ? document.getElementById('ft-perf').value     : '');
    var fmethod = (document.getElementById('ft-method')   ? document.getElementById('ft-method').value   : '');
    var ffamily = (document.getElementById('ft-family')   ? document.getElementById('ft-family').value   : '');
    var ftype   = (document.getElementById('ft-type')     ? document.getElementById('ft-type').value     : '');

    var chipsEl = document.getElementById('ft-chips');
    if(chipsEl) {
        var chips = [];
        if(fc)      chips.push({ label:'Supplier: '+fc,                     clear:"document.getElementById('ft-company').value='';matApplyFilters()" });
        if(fperf)   chips.push({ label:State.mode.toUpperCase()+': '+fperf, clear:"document.getElementById('ft-perf').value='';matApplyFilters()" });
        if(fmethod) chips.push({ label:'Method: '+fmethod,                  clear:"document.getElementById('ft-method').value='';matApplyFilters()" });
        if(ffamily) chips.push({ label:'Family: '+ffamily,                  clear:"document.getElementById('ft-family').value='';matApplyFilters()" });
        if(ftype)   chips.push({ label:'Type: '+ftype,                      clear:"document.getElementById('ft-type').value='';matApplyFilters()" });
        chipsEl.innerHTML = chips.map(function(c){
            return '<span onclick="' + c.clear + '" style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;background:var(--primary-light);color:var(--primary);font-size:0.72rem;font-weight:600;cursor:pointer">\u00d7 ' + _escHtml(c.label) + '</span>';
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
        listEl.innerHTML = '<div class="empty-state"><p>No materials match these filters</p></div>';
        return;
    }
    listEl.innerHTML = filtered.map(function(m){ return matCardHTML(m, q); }).join('');
}

function onMatSearch(val) {
    State.searchQuery = val || '';
    matApplyFilters();
    setTimeout(function(){
        var input = document.getElementById('ft-search');
        if(input){ input.focus(); input.setSelectionRange(val.length, val.length); }
    }, 10);
}

// ====================================================================
// RENDER MATERIALS PAGE
// ====================================================================
function renderMaterials() {
    Engine.mode = State.mode;
    var currentLabel = State.mode === 'wvtr' ? 'WVTR' : 'OTR';
    var currentUnit  = State.mode === 'wvtr' ? 'g/m\u00b2\u00b7day' : 'cc/m\u00b2\u00b7day';

    var companies={}, methods={}, families={};
    DB.materials.forEach(function(m){
        if(m.company && m.company.trim()) companies[m.company.trim()] = true;
        var tm = State.mode==='wvtr'?(m.testMethodWVTR||''):(m.testMethodOTR||'');
        if(tm) methods[tm.trim()] = true;
        if(m.family) families[m.family] = true;
    });

    var compOpts = Object.keys(companies).sort().map(function(c){ return '<option value="'+_escAttr(c)+'">'+_escHtml(c)+'</option>'; }).join('');
    var methOpts = Object.keys(methods).sort().map(function(m){ return '<option value="'+_escAttr(m)+'">'+_escHtml(m)+'</option>'; }).join('');
    var famOpts  = Object.keys(families).sort().map(function(f){ return '<option value="'+_escAttr(f)+'">'+_escHtml(f)+'</option>'; }).join('');

    // FIX: filter IDs use ft-* prefix to avoid collision with modal mm-* IDs
    return '<div style="padding:0.25rem 0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">' +
            '<div style="font-size:1rem;font-weight:600">Materials <span class="badge badge-blue">' + DB.materials.length + '</span></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
                '<button class="btn btn-sm btn-primary" onclick="showMatModal()">+ Add material</button>' +
                '<button class="btn btn-sm btn-outline" onclick="showBulkImport()">Import CSV</button>' +
                '<button class="btn btn-sm btn-outline" onclick="showTrashPanel()" style="' + (_matTrash.length > 0 ? 'border-color:var(--danger);color:var(--danger)' : '') + '">' +
                    'Trash' + (_matTrash.length > 0 ? ' (' + _matTrash.length + ')' : '') + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="card" style="margin-bottom:0.75rem">' +
            '<div style="font-size:0.75rem;font-weight:600;color:var(--text-light);margin-bottom:0.6rem">Filters</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:0.6rem">' +
                '<div class="form-group" style="margin:0"><label>Supplier</label>' +
                    '<select class="form-input" id="ft-company" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All suppliers</option>' + compOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>' + currentLabel + ' level</label>' +
                    '<select class="form-input" id="ft-perf" onchange="matApplyFilters()" style="font-size:0.78rem">' +
                    '<option value="">Any</option>' +
                    '<option value="ultra">&lt; 0.1 ' + currentUnit + '</option>' +
                    '<option value="high">&lt; 1 ' + currentUnit + '</option>' +
                    '<option value="med">&lt; 10 ' + currentUnit + '</option>' +
                    '<option value="low">&gt; 10 ' + currentUnit + '</option></select></div>' +
                '<div class="form-group" style="margin:0"><label>Test method</label>' +
                    '<select class="form-input" id="ft-method" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All methods</option>' + methOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>Family</label>' +
                    '<select class="form-input" id="ft-family" onchange="matApplyFilters()" style="font-size:0.78rem"><option value="">All families</option>' + famOpts + '</select></div>' +
                '<div class="form-group" style="margin:0"><label>Type</label>' +
                    '<select class="form-input" id="ft-type" onchange="matApplyFilters()" style="font-size:0.78rem">' +
                    '<option value="">All types</option>' +
                    '<option value="community">Community only</option>' +
                    '<option value="verified">Verified only</option>' +
                    '<option value="metallized">Metallized only</option>' +
                    '<option value="arrhenius">Arrhenius ready</option></select></div>' +
            '</div>' +
            '<div id="ft-chips" style="display:flex;flex-wrap:wrap;gap:5px"></div>' +
        '</div>' +
        '<div style="position:relative;margin-bottom:0.75rem">' +
            '<input type="text" class="form-input" id="ft-search" style="padding-left:32px;font-size:0.82rem" ' +
                'placeholder="Search by name, supplier, value (e.g. wvtr &lt; 2)..." ' +
                'value="' + _escAttr(State.searchQuery) + '" oninput="onMatSearch(this.value)">' +
        '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-light);margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center">' +
            '<span id="mat-result-label">Showing <strong>' + DB.materials.length + '</strong> materials</span>' +
            '<span>WVTR \u2013 OTR \u2013 CO\u2082TR</span>' +
        '</div>' +
        '<div id="mat-list" style="display:flex;flex-direction:column;gap:6px"></div>' +
    '</div>';
}

// ====================================================================
// MODAL BARRIER SECTION HELPER (modal — with editable rows + add form)
// FIX: all modal IDs use mm-* prefix to avoid collision with ft-* filter IDs
// ====================================================================
function _modalBarrierSection(type, mat, isCommMat, isDefaultMat) {
    var labels  = { wvtr:'WVTR', otr:'OTR', co2:'CO\u2082TR' };
    var units   = { wvtr:'g/m\u00b2\u00b7day', otr:'cc/m\u00b2\u00b7day\u00b7atm', co2:'cc/m\u00b2\u00b7day\u00b7atm' };
    var valKeys = { wvtr:'wvtrValues', otr:'otrValues', co2:'co2Values' };
    var tmKeys  = { wvtr:'testMethodWVTR', otr:'testMethodOTR', co2:'testMethodCO2' };
    var ctmOpts = {
        wvtr: ['ASTM F1249','ISO 15106-3','ASTM E96','JIS K7129','MOCON PERMATRAN','DIN 53122'],
        otr:  ['ASTM D3985','ASTM D1927','ISO 15106-2','JIS K7126','MOCON OXTRAN'],
        co2:  ['ASTM D1434','ISO 15105-1','ISO 15105-2','MOCON']
    };
    var label  = labels[type];
    var unit   = units[type];
    var vals   = mat ? (mat[valKeys[type]] || []) : [];
    var topTM  = mat ? (mat[tmKeys[type]] || '') : '';
    var roData = isCommMat || isDefaultMat;

    var tmOptsHTML = '<option value="">-- method --</option>';
    ctmOpts[type].forEach(function(t){ tmOptsHTML += '<option value="'+_escAttr(t)+'">'+_escHtml(t)+'</option>'; });

    var html = '<div style="border-top:1px solid var(--border-light,#f1f5f9);margin-top:14px;padding-top:12px">' +
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
            '</tr></thead><tbody id="mm-' + type + '-tbody">';
        vals.forEach(function(v, ri) {
            var condTemp = v.temperature != null ? v.temperature : '-';
            var condHum  = v.humidity    != null ? v.humidity    : '-';
            var condTM   = v.testMethod || topTM || '-';
            if(roData) {
                html += '<tr style="border-bottom:1px solid var(--border-light,#f1f5f9);background:#f8fafc">' +
                    '<td style="padding:4px 5px;font-weight:600;color:var(--primary);font-family:monospace">' + v.value + '</td>' +
                    '<td style="padding:4px 5px">' + v.thickness + ' \u00b5m</td>' +
                    '<td style="padding:4px 5px">' + condTemp + (condTemp!=='-'?'\u00b0C':'') + '</td>' +
                    '<td style="padding:4px 5px">' + condHum  + (condHum !=='-'?'%' :'') + '</td>' +
                    '<td style="padding:4px 5px;color:var(--text-light);font-size:0.7rem;font-style:italic">' + _escHtml(condTM) + '</td>' +
                    '</tr>';
            } else {
                var tmSelOpts = '<option value="">-- method --</option>';
                ctmOpts[type].forEach(function(t){
                    tmSelOpts += '<option value="'+_escAttr(t)+'"'+(condTM===t?' selected':'')+'>' + _escHtml(t) + '</option>';
                });
                if(condTM && condTM!=='-' && ctmOpts[type].indexOf(condTM)<0)
                    tmSelOpts += '<option value="'+_escAttr(condTM)+'" selected>'+_escHtml(condTM)+'</option>';
                html += '<tr style="border-bottom:1px solid var(--border-light,#f1f5f9)" id="mm-'+type+'-row-'+ri+'">' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input mm-val" data-type="'+type+'" data-ri="'+ri+'" value="'+v.value+'" style="font-size:0.75rem;padding:3px 6px;width:70px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input mm-thick" data-type="'+type+'" data-ri="'+ri+'" value="'+v.thickness+'" style="font-size:0.75rem;padding:3px 6px;width:70px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input mm-temp" data-type="'+type+'" data-ri="'+ri+'" value="'+(v.temperature!=null?v.temperature:'')+'" placeholder="23" style="font-size:0.75rem;padding:3px 6px;width:55px"></td>' +
                    '<td style="padding:3px 4px"><input type="number" step="any" class="form-input mm-hum" data-type="'+type+'" data-ri="'+ri+'" value="'+(v.humidity!=null?v.humidity:'')+'" placeholder="50" style="font-size:0.75rem;padding:3px 6px;width:55px"></td>' +
                    '<td style="padding:3px 4px"><select class="form-input mm-method" data-type="'+type+'" data-ri="'+ri+'" style="font-size:0.72rem;padding:3px 5px">'+tmSelOpts+'</select></td>' +
                    '<td style="padding:3px 4px"><button type="button" style="border:none;background:none;color:var(--danger);cursor:pointer;font-size:0.85rem;padding:2px 5px" onclick="document.getElementById(\'mm-'+type+'-row-'+ri+'\').remove()">\u00d7</button></td>' +
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
        (isCommMat ? '<div style="font-size:0.68rem;color:#92400e;background:#fef3c7;border-radius:4px;padding:4px 7px;margin-bottom:7px">Pending approval - visible in yellow until admin approves.</div>' : '') +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:5px;margin-bottom:5px">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">' + label + ' value</label>' +
                '<input type="number" step="any" class="form-input" id="mm-'+type+'-new-val" placeholder="0" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Thickness (\u00b5m)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-'+type+'-new-thick" placeholder="0" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Test method</label>' +
                '<select class="form-input" id="mm-'+type+'-new-method" style="font-size:0.72rem;padding:3px 5px">' + tmOptsHTML + '</select></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Temp (\u00b0C)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-'+type+'-new-temp" placeholder="23" style="font-size:0.75rem;padding:3px 7px"></div>' +
            '<div class="form-group" style="margin:0"><label style="font-size:0.65rem">Humidity (%RH)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-'+type+'-new-hum" placeholder="50" style="font-size:0.75rem;padding:3px 7px"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    return html;
}

function matModalHygroToggle() {
    var cb = document.getElementById('mm-hygroscopic');
    var fields = document.getElementById('mm-hygro-fields');
    if(!cb || !fields) return;
    fields.style.display = cb.checked ? 'block' : 'none';
}

// ====================================================================
// ADD / EDIT MATERIAL MODAL
// FIX: all modal IDs use mm-* prefix to avoid collision with ft-* filter IDs
// ====================================================================
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
    var tdsRO   = isDefaultMat               ? ' disabled readonly style="opacity:0.6;cursor:not-allowed;background:#f1f5f9"' : '';

    var familyOpts = '<option value="">Select family...</option>';
    for(var fam in POLYMER_FAMILIES){
        var sel = (mat && mat.family === fam) ? ' selected' : '';
        familyOpts += '<option value="'+_escAttr(fam)+'"'+sel+'>'+_escHtml(fam)+'</option>';
    }
    var metallizedCheck = mat && mat.isMetallized ? 'checked' : '';

    var banner = '';
    if(isCommMat) {
        banner = '<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:8px;padding:0.6rem 0.9rem;margin-bottom:0.9rem">' +
            '<div style="font-size:0.82rem;font-weight:700;color:#1e40af">Community material</div>' +
            '<div style="font-size:0.72rem;color:#3b82f6;margin-top:0.2rem">Barrier data protected. You can add new conditions (pending approval) and edit email and TDS link.</div>' +
            '</div>';
    } else if(isDefaultMat) {
        banner = '<div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:8px;padding:0.65rem 0.9rem;margin-bottom:0.9rem">' +
            '<div style="font-size:0.82rem;font-weight:700;color:#92400e">Built-in material</div>' +
            '<div style="font-size:0.72rem;color:#a16207;margin-top:0.2rem">Existing data protected. You can add new conditions below.</div>' +
            '</div>';
    }

    var hygroRO = (isCommMat || isDefaultMat) ? ' disabled readonly style="opacity:0.6;cursor:not-allowed;background:#f1f5f9"' : '';

    var hasHygro = mat && (mat.hygroscopicBetaWVTR > 0 || mat.hygroscopicBetaOTR > 0 || mat.hygroscopicBetaCO2 > 0);
    var isRO = isCommMat || isDefaultMat;

    var modalBody =
        banner +
        '<div class="form-group"><label>Name *</label><input type="text" class="form-input" id="mm-name" value="'+_escAttr(mat?mat.name:'')+'"'+RO+'></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div class="form-group" style="margin:0"><label>Material family</label><select class="form-input" id="mm-family"'+RO+'>'+familyOpts+'</select></div>' +
            '<div class="form-group" style="margin:0"><label>Company name</label><input type="text" class="form-input" id="mm-company" value="'+_escAttr(mat?mat.company||'':'')+'" placeholder="e.g. DuPont, 3M..."'+RO+'></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
            '<div class="form-group" style="margin:0"><label>Contact email <span style="font-size:0.65rem;color:var(--text-light)">(always editable)</span></label>' +
                '<input type="email" class="form-input" id="mm-email" value="'+_escAttr(mat&&mat.supplierEmail?mat.supplierEmail:'')+'" placeholder="supplier@company.com"></div>' +
            '<div class="form-group" style="margin:0"><label>TDS link <span style="font-size:0.65rem;color:var(--text-light)">(always editable)</span></label>' +
                '<input type="url" class="form-input" id="mm-tdslink" value="'+_escAttr(mat?mat.tdsLink||'':'')+'" placeholder="https://"'+tdsRO+'></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
            '<div class="form-group" style="margin:0"><label>Density (kg/m\u00b3)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-density" value="'+(mat&&mat.density?mat.density:'')+'" placeholder="e.g. 1400"'+RO+'></div>' +
            '<div class="form-group" style="margin:0"><label>GWP (kg CO\u2082eq/kg)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-gwp" value="'+(mat&&mat.gwp?mat.gwp:'')+'" placeholder="e.g. 2.15"'+RO+'></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' +
            '<div class="form-group" style="margin:0"><label>Haze (%)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-haze" value="'+(mat&&mat.haze!=null?mat.haze:'')+'" placeholder="e.g. 2.5"'+RO+'></div>' +
            '<div class="form-group" style="margin:0"><label>Melting temp (\u00b0C)</label>' +
                '<input type="number" step="any" class="form-input" id="mm-melting-temp" value="'+(mat&&mat.meltingTemp?mat.meltingTemp:'')+'" placeholder="e.g. 260"'+RO+'></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">' +

        // FIX: metallized card — use label+for instead of onclick on container (accessibility)
        '<label for="mm-metallized" style="padding:12px 14px;background:#fefce8;border:1.5px solid #fcd34d;border-radius:10px;display:flex;align-items:flex-start;gap:10px;cursor:'+(isRO?'not-allowed':'pointer')+'">' +
            '<input type="checkbox" id="mm-metallized" '+metallizedCheck+ROcheck+' style="width:18px;height:18px;margin-top:2px;flex-shrink:0;cursor:'+(isRO?'not-allowed':'pointer')+'">' +
            '<div>' +
                '<div style="font-size:0.82rem;font-weight:700;color:#78350f">Metallized / Coated film</div>' +
                '<div style="font-size:0.72rem;color:#92400e;margin-top:2px;line-height:1.4">Barrier is independent of substrate thickness (AlOx, SiOx, Al foil)</div>' +
            '</div>' +
        '</label>' +

        // FIX: hygroscopic card — single style attribute, merged sizing + cursor
        '<label for="mm-hygroscopic" style="padding:12px 14px;background:#f0f9ff;border:1.5px solid #7dd3fc;border-radius:10px;display:flex;align-items:flex-start;gap:10px;cursor:'+(isRO?'not-allowed':'pointer')+'">' +
            '<input type="checkbox" id="mm-hygroscopic" '+(hasHygro?'checked':'')+
                (isRO ? ' disabled' : '') +
                ' onchange="matModalHygroToggle()"' +
                ' style="width:18px;height:18px;margin-top:2px;flex-shrink:0;cursor:'+(isRO?'not-allowed':'pointer')+(isRO?';opacity:0.6':'')+'">' +
            '<div>' +
                '<div style="font-size:0.82rem;font-weight:700;color:#0c4a6e">Hygroscopic material</div>' +
                '<div style="font-size:0.72rem;color:#075985;margin-top:2px;line-height:1.4">Barrier depends on relative humidity (EVOH, PA, cellulose)</div>' +
            '</div>' +
        '</label>' +

        '</div>' +

        '<div id="mm-hygro-fields" style="display:' + (hasHygro?'block':'none') + ';background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 14px;margin-bottom:12px">' +
            '<div style="font-size:0.75rem;font-weight:600;color:#0369a1;margin-bottom:10px">Hygroscopic correction coefficients</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                '<div style="font-size:0.68rem;font-weight:600;color:#0369a1;margin-bottom:6px">WVTR Beta</div>' +
                '<div style="font-size:0.68rem;font-weight:600;color:#0369a1;margin-bottom:6px">OTR Beta</div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Beta (%/RH)</label>' +
                    '<input type="number" step="0.001" class="form-input" id="mm-beta-wvtr" value="'+(mat&&mat.hygroscopicBetaWVTR>0?mat.hygroscopicBetaWVTR:'')+'" placeholder="e.g. 0.034"'+hygroRO+'></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Beta (%/RH)</label>' +
                    '<input type="number" step="0.001" class="form-input" id="mm-beta-otr" value="'+(mat&&mat.hygroscopicBetaOTR>0?mat.hygroscopicBetaOTR:'')+'" placeholder="e.g. 0.055"'+hygroRO+'></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Ref RH (%)</label>' +
                    '<input type="number" class="form-input" id="mm-refrh-wvtr" value="'+(mat&&mat.hygroscopicRefRHWVTR?mat.hygroscopicRefRHWVTR:50)+'" placeholder="50"'+hygroRO+'></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Ref RH (%)</label>' +
                    '<input type="number" class="form-input" id="mm-refrh-otr" value="'+(mat&&mat.hygroscopicRefRHOTR?mat.hygroscopicRefRHOTR:50)+'" placeholder="50"'+hygroRO+'></div>' +
            '</div>' +
            '<div style="border-top:1px solid #bae6fd;margin-top:10px;padding-top:10px">' +
            '<div style="font-size:0.68rem;font-weight:600;color:#0369a1;margin-bottom:6px">CO\u2082 Beta</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Beta (%/RH)</label>' +
                    '<input type="number" step="0.001" class="form-input" id="mm-beta-co2" value="'+(mat&&mat.hygroscopicBetaCO2>0?mat.hygroscopicBetaCO2:'')+'" placeholder="e.g. 0.040"'+hygroRO+'></div>' +
                '<div class="form-group" style="margin:0"><label style="font-size:0.68rem">Ref RH (%)</label>' +
                    '<input type="number" class="form-input" id="mm-refrh-co2" value="'+(mat&&mat.hygroscopicRefRHCO2?mat.hygroscopicRefRHCO2:50)+'" placeholder="50"'+hygroRO+'></div>' +
            '</div></div>' +
            '<div style="font-size:0.68rem;color:#0369a1;margin-top:8px">Beta = % increase in permeability per 1% RH increase. Reference RH = condition at which the listed values were measured.</div>' +
        '</div>' +
        _modalBarrierSection('wvtr', mat, isCommMat, isDefaultMat) +
        _modalBarrierSection('otr',  mat, isCommMat, isDefaultMat) +
        _modalBarrierSection('co2',  mat, isCommMat, isDefaultMat);

    Modal.open(
        editId !== undefined ? 'Edit Material' : 'Add Material',
        modalBody,
        function() {
            var name    = document.getElementById('mm-name').value.trim();
            if(!name){ alert('Enter material name'); return false; }
            var family        = document.getElementById('mm-family').value;
            var company       = document.getElementById('mm-company').value.trim();
            var tdsLink       = document.getElementById('mm-tdslink').value.trim();
            var supplierEmail = document.getElementById('mm-email') ? document.getElementById('mm-email').value.trim() : '';
            var density       = parseFloat(document.getElementById('mm-density').value) || null;
            var gwp           = parseFloat(document.getElementById('mm-gwp').value) || null;
            // FIX: haze NaN — use same pattern as other fields
            var hazeRaw       = parseFloat(document.getElementById('mm-haze').value);
            var haze          = isNaN(hazeRaw) ? null : hazeRaw;
            var meltingTemp   = parseFloat(document.getElementById('mm-melting-temp').value) || null;
            if(tdsLink && !tdsLink.startsWith('http')){ alert('TDS Link must start with http:// or https://'); return false; }
            var isMetallized  = document.getElementById('mm-metallized') ? document.getElementById('mm-metallized').checked : false;

            // Community: only email + TDS saved; new conditions go to pending
            if(isCommMat && mat) {
                ['wvtr','otr','co2'].forEach(function(type) {
                    var nv  = parseFloat(document.getElementById('mm-'+type+'-new-val').value);
                    var nt  = parseFloat(document.getElementById('mm-'+type+'-new-thick').value);
                    var ntp = parseFloat(document.getElementById('mm-'+type+'-new-temp').value);
                    var nh  = parseFloat(document.getElementById('mm-'+type+'-new-hum').value);
                    var nm  = document.getElementById('mm-'+type+'-new-method').value.trim();
                    if(!isNaN(nv)&&nv>=0&&!isNaN(nt)&&nt>0&&!isNaN(ntp)&&!isNaN(nh)) {
                        var entry = { value:nv, thickness:nt, temperature:ntp, humidity:nh };
                        if(nm) entry.testMethod = nm;
                        savePendingCondition(mat, type, entry);
                    }
                });
                DB.updateMat(editId, { supplierEmail: supplierEmail, tdsLink: tdsLink });
                render();
                setTimeout(function(){
                    var t = document.createElement('div');
                    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#92400e;color:#fff;padding:0.75rem 1.25rem;border-radius:10px;font-size:0.82rem;z-index:9999';
                    t.textContent = 'Condition saved \u2014 highlighted in yellow, pending admin approval.';
                    document.body.appendChild(t);
                    setTimeout(function(){ if(t.parentNode) t.remove(); }, 5000);
                }, 300);
                return true;
            }

            function collectRows(type) {
                var rows = [];
                // FIX: use mm-* class selectors for modal rows
                var valEls   = document.querySelectorAll('.mm-val[data-type="'+type+'"]');
                var thickEls = document.querySelectorAll('.mm-thick[data-type="'+type+'"]');
                var tempEls  = document.querySelectorAll('.mm-temp[data-type="'+type+'"]');
                var humEls   = document.querySelectorAll('.mm-hum[data-type="'+type+'"]');
                var methEls  = document.querySelectorAll('.mm-method[data-type="'+type+'"]');
                for(var i=0; i<valEls.length; i++) {
                    var v=parseFloat(valEls[i].value), t=parseFloat(thickEls[i].value),
                        te=parseFloat(tempEls[i].value), h=parseFloat(humEls[i].value),
                        mt=methEls[i]?methEls[i].value.trim():'';
                    if(isNaN(v)||v<0||isNaN(t)||t<=0||isNaN(te)||isNaN(h)) continue;
                    var obj={value:v,thickness:t,temperature:te,humidity:h};
                    if(mt) obj.testMethod=mt;
                    rows.push(obj);
                }
                var nv=parseFloat(document.getElementById('mm-'+type+'-new-val').value);
                var nt=parseFloat(document.getElementById('mm-'+type+'-new-thick').value);
                var ntp=parseFloat(document.getElementById('mm-'+type+'-new-temp').value);
                var nh=parseFloat(document.getElementById('mm-'+type+'-new-hum').value);
                var nm=document.getElementById('mm-'+type+'-new-method').value.trim();
                if(!isNaN(nv)&&nv>=0&&!isNaN(nt)&&nt>0&&!isNaN(ntp)&&!isNaN(nh)) {
                    var e={value:nv,thickness:nt,temperature:ntp,humidity:nh};
                    if(nm) e.testMethod=nm;
                    rows.push(e);
                }
                return rows;
            }

            function collectReadOnlyPlusNew(type) {
                var existing = mat ? (mat[{wvtr:'wvtrValues',otr:'otrValues',co2:'co2Values'}[type]] || []) : [];
                var nv=parseFloat(document.getElementById('mm-'+type+'-new-val').value);
                var nt=parseFloat(document.getElementById('mm-'+type+'-new-thick').value);
                var ntp=parseFloat(document.getElementById('mm-'+type+'-new-temp').value);
                var nh=parseFloat(document.getElementById('mm-'+type+'-new-hum').value);
                var nm=document.getElementById('mm-'+type+'-new-method').value.trim();
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

            var betaWVTR  = parseFloat(document.getElementById('mm-beta-wvtr').value)  || 0;
            var refRHWVTR = parseFloat(document.getElementById('mm-refrh-wvtr').value) || 50;
            var betaOTR   = parseFloat(document.getElementById('mm-beta-otr').value)   || 0;
            var refRHOTR  = parseFloat(document.getElementById('mm-refrh-otr').value)  || 50;
            var betaCO2   = parseFloat(document.getElementById('mm-beta-co2').value)   || 0;
            var refRHCO2  = parseFloat(document.getElementById('mm-refrh-co2').value)  || 50;

            var matData = {
                name: name, family: family || getFamily(name), company: company,
                tdsLink: tdsLink, supplierEmail: supplierEmail, isMetallized: isMetallized,
                density: density, gwp: gwp, haze: haze, meltingTemp: meltingTemp,
                hygroscopicBetaWVTR: betaWVTR, hygroscopicRefRHWVTR: refRHWVTR,
                hygroscopicBetaOTR:  betaOTR,  hygroscopicRefRHOTR:  refRHOTR,
                hygroscopicBetaCO2:  betaCO2,  hygroscopicRefRHCO2:  refRHCO2,
                isHygroscopic: (betaWVTR > 0 || betaOTR > 0 || betaCO2 > 0),
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
// BULK IMPORT
// ====================================================================
function showBulkImport() {
    Modal.open('Bulk Import (CSV)',
        '<p style="font-size:.78rem;color:var(--text-light);margin-bottom:.75rem">' +
        '<strong>CSV format:</strong><br>' +
        'Name,Family,TestMethod,IsMetallized,WVTR_Value,WVTR_Thickness,OTR_Value,OTR_Thickness,Temp1,Hum1[,Temp2,Hum2,...]<br><br>' +
        '<strong>Example:</strong><br>PET,PET,ASTM F1249,false,1.0,500,150,500,23,50,38,50</p>' +
        '<div class="import-area"><textarea id="bulk-data" placeholder="PET,PET,ASTM F1249,false,1.0,500,150,500,23,50"></textarea></div>' +
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
                    var wvtr=parseFloat(cols[4])||0, wvtrT=parseFloat(cols[5])||0;
                    var otr =parseFloat(cols[6])||0, otrT =parseFloat(cols[7])||0;
                    var validConditions = [];
                    for(var i=8; i<cols.length; i+=2){
                        var te=parseFloat(cols[i]), h=parseFloat(cols[i+1]);
                        if(!isNaN(te)&&!isNaN(h)) validConditions.push({temperature:te,humidity:h});
                    }
                    if(name && validConditions.length > 0){
                        DB.addMat({ name:name, family:family, testMethod:testMethod, isMetallized:isMetallized,
                            wvtrValues:[{value:wvtr,thickness:wvtrT}], otrValues:[{value:otr,thickness:otrT}],
                            co2Values:[], validConditions:validConditions });
                        count++;
                    }
                }
                alert('Imported ' + count + ' materials'); render(); return true;
            } catch(e){ alert('Import error: ' + e.message); return false; }
        }
    );
}

function importFile(input) {
    var file = input.files[0]; if(!file) return;
    var reader = new FileReader();
    reader.onload = function(e){
        try {
            var data = JSON.parse(e.target.result);
            if(data.materials){ DB.importAll(JSON.stringify(data)); alert('Imported ' + data.materials.length + ' materials'); Modal.close(); render(); }
        } catch(err){ alert('File import error: ' + err.message); }
    };
    reader.readAsText(file);
}

// ====================================================================
// EXTERNAL materials.json LOADER
// ====================================================================
async function loadExternalMaterialsDB() {
    try {
        var res = await fetch('materials.json');
        if(!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        var externalMats = Array.isArray(data) ? data : (data.materials || []);
        if(!externalMats.length) return;

        var existingByFirebaseId = {}, existingByName = {};
        DB.materials.forEach(function(m){
            if(m.firebaseDocId) existingByFirebaseId[m.firebaseDocId] = m;
            existingByName[m.name.trim().toLowerCase()] = m;
        });

        var addedCount = 0;
        externalMats.forEach(function(em){
            if(!em || !em.name) return;
            var nameLower = em.name.trim().toLowerCase();
            if(em.firebaseDocId && existingByFirebaseId[em.firebaseDocId]) {
                var ex = existingByFirebaseId[em.firebaseDocId];
                if(em.hygroscopicBetaWVTR !== undefined) {
                    ex.hygroscopicBetaWVTR=em.hygroscopicBetaWVTR; ex.hygroscopicRefRHWVTR=em.hygroscopicRefRHWVTR;
                    ex.hygroscopicBetaOTR=em.hygroscopicBetaOTR;   ex.hygroscopicRefRHOTR=em.hygroscopicRefRHOTR;
                    ex.hygroscopicBetaCO2=em.hygroscopicBetaCO2;   ex.hygroscopicRefRHCO2=em.hygroscopicRefRHCO2;
                }
                return;
            }
            if(existingByName[nameLower]) {
                var exN = existingByName[nameLower];
                if(em.firebaseDocId) exN.firebaseDocId = em.firebaseDocId;
                if(em.hygroscopicBetaWVTR !== undefined) {
                    exN.hygroscopicBetaWVTR=em.hygroscopicBetaWVTR; exN.hygroscopicRefRHWVTR=em.hygroscopicRefRHWVTR;
                    exN.hygroscopicBetaOTR=em.hygroscopicBetaOTR;   exN.hygroscopicRefRHOTR=em.hygroscopicRefRHOTR;
                    exN.hygroscopicBetaCO2=em.hygroscopicBetaCO2;   exN.hygroscopicRefRHCO2=em.hygroscopicRefRHCO2;
                }
                return;
            }
            var newMat = Object.assign({}, em);
            if(em.firebaseDocId) {
                var numericIds = DB.materials.map(function(m){ return typeof m.id==='number'?m.id:0; });
                newMat.id = (numericIds.length ? Math.max.apply(null,numericIds) : 0) + 1 + addedCount;
            }
            newMat.family           = em.family || getFamily(em.name);
            newMat.isMetallized     = em.isMetallized || false;
            newMat.reliabilityVotes = em.reliabilityVotes || { up:0, down:0 };
            if(!newMat.co2Values) newMat.co2Values = [];
            DB.materials.push(newMat);
            existingByFirebaseId[newMat.firebaseDocId] = newMat;
            existingByName[nameLower] = newMat;
            addedCount++;
        });

        if(addedCount > 0) { DB.save(); render(); console.log('materials.json: added ' + addedCount); }
    } catch(e) { console.log('materials.json not loaded:', e.message); }
}

// ====================================================================
// APP INIT
// ====================================================================
