// ====================================================================
// 🏠 HOME PATCH — sostituisce renderHome() e initHomeAnimations()
// Widget: Most Used (top 10) + New in Community + Recently Updated
// ====================================================================
// Override vecchia funzione che sovrascriveva il widget
window.updateTop3UI = async function() {
    renderMostUsedMaterials();
};
// ── Naviga al materiale nel DB ────────────────────────────────────────
function goToMaterial(matName) {
    State.tab = 'materials';
    State.searchQuery = matName;
    renderNav();
    renderContent();
    postNavRender();
    setTimeout(function() {
        var input = document.getElementById('mat-search');
        if (input) { input.value = matName; onMatSearch(matName); }
    }, 200);
}

// ====================================================================
// 📊 Widget 1 — Top 10 Most Used (questo mese, community)
// ====================================================================
async function renderMostUsedMaterials() {
    var container = document.getElementById('top3-ranking');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';

    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var items = [];

    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } =
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var q = query(
                collection(window.communityDB, "materials"),
                orderBy("usageCount", "desc"),
                limit(10)
            );
            var snap = await getDocs(q);
            snap.forEach(function(d) {
                var data = d.data();
                if (data.lastUsageMonth === currentMonth && (data.usageCount || 0) > 0) {
                    items.push({
                        name:      data.name    || 'Unknown',
                        company:   data.company || '',
                        count:     data.usageCount || 0
                    });
                }
            });
        } catch(e) { console.warn('Most used fetch failed:', e); }
    }

    // Fallback locale
    if (items.length === 0) {
        items = DB.materials
            .filter(function(m){ return m.lastUsageMonth === currentMonth && (m.usageCount||0) > 0; })
            .sort(function(a,b){ return (b.usageCount||0)-(a.usageCount||0); })
            .slice(0,10)
            .map(function(m){ return { name:m.name, company:m.company||'', count:m.usageCount||0 }; });
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.78rem">Start calculating to see rankings</div>';
        return;
    }

    var medals = ['🥇','🥈','🥉'];
    container.innerHTML = items.map(function(m, idx) {
        var escapedName = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc;transition:background 0.15s" ' +
               'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="font-size:' + (idx < 3 ? '1rem' : '0.7rem') + ';width:20px;text-align:center;flex-shrink:0">' +
                (idx < 3 ? medals[idx] : '<span style="color:#cbd5e1;font-weight:700;font-family:monospace">' + String(idx+1).padStart(2,'0') + '</span>') +
            '</div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.name||'') + '</div>' +
                (m.company ? '<div style="font-size:0.68rem;color:#94a3b8;margin-top:0.1rem">' + m.company + '</div>' : '') +
            '</div>' +
            '<div style="font-size:0.72rem;font-weight:700;color:#2563eb;flex-shrink:0;margin-right:0.5rem">' + m.count + ' uses</div>' +
            '<button onclick="goToMaterial(\'' + escapedName + '\')" ' +
                'style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer;flex-shrink:0;transition:all 0.15s" ' +
                'onmouseover="this.style.background=\'#dbeafe\'" onmouseout="this.style.background=\'#eff6ff\'">View →</button>' +
        '</div>';
    }).join('');
}

// ====================================================================
// 🆕 Widget 2 — Last 10 New in Community
// ====================================================================
async function renderNewCommunityMaterials() {
    var container = document.getElementById('new-community-list');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';

    var items = [];

    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } =
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var q = query(
                collection(window.communityDB, "materials"),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            var snap = await getDocs(q);
            snap.forEach(function(d) {
                var data = d.data();
                items.push({
                    name:      data.name      || 'Unknown',
                    company:   data.company   || '',
                    family:    data.family    || '',
                    createdAt: data.createdAt || ''
                });
            });
        } catch(e) { console.warn('New community fetch failed:', e); }
    }

    if (items.length === 0) {
        items = DB.materials
            .filter(function(m){ return m.isCommunity && m.createdAt; })
            .sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); })
            .slice(0,10)
            .map(function(m){ return { name:m.name, company:m.company||'', family:m.family||'', createdAt:m.createdAt||'' }; });
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No community materials yet</div>';
        return;
    }

    container.innerHTML = items.map(function(m) {
        var dateStr = '';
        if (m.createdAt) {
            try { dateStr = new Date(m.createdAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'2-digit'}); }
            catch(e) { dateStr = m.createdAt.slice(0,10); }
        }
        var escapedName = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc;transition:background 0.15s" ' +
               'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.name||'') + '</div>' +
                '<div style="font-size:0.68rem;color:#94a3b8;margin-top:0.1rem">' + (m.company ? m.company+' · ' : '') + (m.family||'') + '</div>' +
            '</div>' +
            (dateStr ? '<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0;margin-right:0.5rem">' + dateStr + '</div>' : '') +
            '<button onclick="goToMaterial(\'' + escapedName + '\')" ' +
                'style="background:#f0fdf4;border:1px solid #86efac;color:#16a34a;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer;flex-shrink:0;transition:all 0.15s" ' +
                'onmouseover="this.style.background=\'#dcfce7\'" onmouseout="this.style.background=\'#f0fdf4\'">View →</button>' +
        '</div>';
    }).join('');
}

// ====================================================================
// 🔄 Widget 3 — Last 10 Recently Updated
// ====================================================================
async function renderUpdatedCommunityMaterials() {
    var container = document.getElementById('updated-community-list');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';

    var items = [];

    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } =
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var q = query(
                collection(window.communityDB, "materials"),
                orderBy("updatedAt", "desc"),
                limit(20)
            );
            var snap = await getDocs(q);
            snap.forEach(function(d) {
                var data = d.data();
                var isUpdated = data.updatedAt && data.createdAt && data.updatedAt !== data.createdAt;
                if (isUpdated && items.length < 10) {
                    items.push({
                        name:      data.name      || 'Unknown',
                        company:   data.company   || '',
                        family:    data.family    || '',
                        updatedAt: data.updatedAt || ''
                    });
                }
            });
        } catch(e) { console.warn('Updated community fetch failed:', e); }
    }

    if (items.length === 0) {
        items = DB.materials
            .filter(function(m){ return m.isCommunity && m.updatedAt && m.createdAt && m.updatedAt !== m.createdAt; })
            .sort(function(a,b){ return (b.updatedAt||'').localeCompare(a.updatedAt||''); })
            .slice(0,10)
            .map(function(m){ return { name:m.name, company:m.company||'', family:m.family||'', updatedAt:m.updatedAt||'' }; });
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No updates yet</div>';
        return;
    }

    container.innerHTML = items.map(function(m) {
        var dateStr = '';
        if (m.updatedAt) {
            try { dateStr = new Date(m.updatedAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'2-digit'}); }
            catch(e) { dateStr = m.updatedAt.slice(0,10); }
        }
        var escapedName = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc;transition:background 0.15s" ' +
               'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.name||'') + '</div>' +
                '<div style="font-size:0.68rem;color:#94a3b8;margin-top:0.1rem">' + (m.company ? m.company+' · ' : '') + (m.family||'') + '</div>' +
            '</div>' +
            (dateStr ? '<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0;margin-right:0.5rem">' + dateStr + '</div>' : '') +
            '<button onclick="goToMaterial(\'' + escapedName + '\')" ' +
                'style="background:#fffbeb;border:1px solid #fde68a;color:#d97706;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer;flex-shrink:0;transition:all 0.15s" ' +
                'onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'#fffbeb\'">View →</button>' +
        '</div>';
    }).join('');
}

// ====================================================================
// 🏠 renderHome
// ====================================================================
function renderHome() {
    var totalMats     = DB.materials.length;
    var totalLams     = DB.laminates.length;
    var multiTempMats = 0;
    for (var i = 0; i < DB.materials.length; i++) {
        if (Engine.validateArrhenius(DB.materials[i]).valid) multiTempMats++;
    }

    return `
<div class="home-bg-glow"></div>
<div style="max-width:1100px;margin:0 auto;padding:0 0.5rem;position:relative;z-index:10;">

    <!-- HERO -->
    <div style="padding:3rem 2rem 2.5rem;margin-bottom:2rem;border-bottom:1px solid #e2e8f0">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem">
            <div>
                <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;color:#2563eb;text-transform:uppercase;margin-bottom:0.6rem">Packaging Engineering Tool</div>
                <h1 style="font-size:2.4rem;font-weight:800;color:#0f172a;line-height:1.15;margin:0 0 0.75rem 0;letter-spacing:-0.03em">WVTR / OTR<br>Calculator</h1>
                <p style="font-size:0.95rem;color:#64748b;margin:0;max-width:480px;line-height:1.6">Professional barrier analysis for multilayer packaging structures. Resistance model, Arrhenius prediction, shelf life estimation.</p>
            </div>
            <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=calc]').click()"
                style="background:#2563eb;color:#fff;border:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:background 0.2s;white-space:nowrap"
                onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
                Start Calculation →
            </button>
        </div>
    </div>

    <!-- KPI ROW -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2e8f0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">
        <div style="background:#fff;padding:1.5rem">
            <div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Total Materials</div>
            <div style="font-size:2.6rem;font-weight:800;color:#2563eb;line-height:1;margin-bottom:0.35rem">${totalMats}</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">In the database</div>
            <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=materials]').click()"
                style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Explore database →</button>
        </div>
        <div style="background:#fff;padding:1.5rem">
            <div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Arrhenius Ready</div>
            <div style="font-size:2.6rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.35rem">${multiTempMats}</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">Multi-temperature datasets</div>
            <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=arrhenius]').click()"
                style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Run analysis →</button>
        </div>
        <div style="background:#fff;padding:1.5rem">
            <div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Saved Laminates</div>
            <div style="font-size:2.6rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.35rem">${totalLams}</div>
            <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">Structures in your library</div>
            <button onclick="document.getElementById('nav-tabs').querySelector('[data-tab=laminates]').click()"
                style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">View library →</button>
        </div>
    </div>

    <!-- 3 COMMUNITY WIDGETS -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-bottom:2rem">

        <!-- Widget 1: Most Used this month (top 10) -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
            <div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div>
                    <div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">This Month</div>
                    <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Most Used</div>
                </div>
                <div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div>
            </div>
            <div id="top3-ranking" style="overflow-y:auto;max-height:320px;flex:1">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>
            </div>
        </div>

        <!-- Widget 2: New in Community (last 10) -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
            <div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div>
                    <div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>
                    <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">New Materials</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.35rem">
                    <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:badgePulse 2s infinite"></div>
                    <span style="font-size:0.62rem;color:#94a3b8">last 10</span>
                </div>
            </div>
            <div id="new-community-list" style="overflow-y:auto;max-height:320px;flex:1">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>
            </div>
        </div>

        <!-- Widget 3: Recently Updated (last 10) -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
            <div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div>
                    <div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>
                    <div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Recently Updated</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.35rem">
                    <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></div>
                    <span style="font-size:0.62rem;color:#94a3b8">last 10</span>
                </div>
            </div>
            <div id="updated-community-list" style="overflow-y:auto;max-height:320px;flex:1">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>
            </div>
        </div>

    </div>

    <!-- CAPABILITIES -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid #f1f5f9">
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Platform</div>
            <div style="font-size:0.9rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Core Capabilities</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr)">
            ${[
                { label:'Multilayer Resistance Model', desc:'Series resistance calculation per ISO/ASTM' },
                { label:'Arrhenius Temperature Fit',   desc:'R² validated prediction at untested temperatures' },
                { label:'Shelf Life Engine',           desc:'GAB isotherm + oxidation kinetics' },
                { label:'Sensitivity & Optimization',  desc:'Thickness sweep and cost optimizer' },
            ].map(function(f){
                return '<div style="display:flex;align-items:center;gap:0.9rem;padding:0.8rem 1.25rem;border-bottom:1px solid #f8fafc;border-right:1px solid #f8fafc">' +
                    '<div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div>' +
                    '<div><div style="font-size:0.8rem;font-weight:600;color:#0f172a">' + f.label + '</div>' +
                    '<div style="font-size:0.7rem;color:#94a3b8;margin-top:0.1rem">' + f.desc + '</div></div></div>';
            }).join('')}
        </div>
    </div>

    <!-- FOOTER -->
    <div style="padding:1.5rem 0;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
        <div style="font-size:0.72rem;color:#94a3b8;line-height:1.4">
            <strong style="color:#64748b">Disclaimer:</strong> For R&D and engineering use only. Results require laboratory validation per ASTM F1249 / ISO 15106 standards.
        </div>
        <a href="mailto:wvtrotrcalculator@gmail.com?subject=Feedback%20-%20WVTR%2FOTR%20Calculator"
           style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;color:#2563eb;text-decoration:none;background:#eff6ff;border:1px solid #bfdbfe;padding:0.3rem 0.65rem;border-radius:6px"
           onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,12 2,6"/>
            </svg>
            Send Feedback
        </a>
    </div>

</div>`;
}

// ====================================================================
// 🎬 initHomeAnimations — carica i 3 widget
// ====================================================================
function initHomeAnimations() {
    if (State.tab !== 'home') return;

    function loadWidgets() {
        renderMostUsedMaterials();
        renderNewCommunityMaterials();
        renderUpdatedCommunityMaterials();
    }

    if (window.communityDB) {
        loadWidgets();
    } else {
        var attempts = 0;
        var iv = setInterval(function() {
            attempts++;
            if (window.communityDB || attempts > 30) { clearInterval(iv); loadWidgets(); }
        }, 200);
    }

    // Animazioni varie
    document.querySelectorAll('.progress-fill').forEach(function(bar) {
        bar.style.animation = 'progressGrow 1.2s ease-out forwards';
    });

    initDemoCharts();
    initCountUp();
}
