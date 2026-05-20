// ====================================================================
// 🏠 HOME PATCH — sostituisce renderHome() in render.js
// Aggiunge: New in Community + Recently Updated accanto a Most Used
// ====================================================================

// ── Helper: vai al materiale nel DB ──────────────────────────────────
function goToMaterial(matName) {
    State.tab = 'materials';
    State.searchQuery = matName;
    renderNav();
    renderContent();
    postNavRender();
    // Dopo il render applica il filtro di ricerca
    setTimeout(function() {
        var input = document.getElementById('mat-search');
        if (input) {
            input.value = matName;
            onMatSearch(matName);
        }
    }, 200);
}

// ── Widget: ultimi 10 materiali aggiunti alla community ───────────────
async function renderNewCommunityMaterials() {
    var container = document.getElementById('new-community-list');
    if (!container) return;

    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';

    var items = [];

    // Prima cerca in Firebase
    if (window.communityDB && window.fbQuery && window.fbOrderBy && window.fbGetDocs && window.fbCollection) {
        try {
            var { query, orderBy, limit, getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
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
                    createdAt: data.createdAt || '',
                    id:        'fb_' + d.id
                });
            });
        } catch(e) {
            console.warn('New community fetch failed:', e);
        }
    }

    // Fallback locale
    if (items.length === 0) {
        items = DB.materials
            .filter(function(m) { return m.isCommunity && m.createdAt; })
            .sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); })
            .slice(0, 10)
            .map(function(m) {
                return { name: m.name, company: m.company || '', family: m.family || '', createdAt: m.createdAt || '', id: m.id };
            });
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No community materials yet</div>';
        return;
    }

    container.innerHTML = items.map(function(m) {
        var dateStr = '';
        if (m.createdAt) {
            try { dateStr = new Date(m.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }); }
            catch(e) { dateStr = m.createdAt.slice(0, 10); }
        }
        var escapedName = (m.name || '').replace(/'/g, "\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.7rem 1.25rem;border-bottom:1px solid #f8fafc;transition:background 0.15s" ' +
               'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.name || '') + '</div>' +
                '<div style="font-size:0.68rem;color:#94a3b8;margin-top:0.1rem">' +
                    (m.company ? m.company + ' · ' : '') + (m.family || '') +
                '</div>' +
            '</div>' +
            (dateStr ? '<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0">' + dateStr + '</div>' : '') +
            '<button onclick="goToMaterial(\'' + escapedName + '\')" ' +
                'style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer;flex-shrink:0;transition:all 0.15s" ' +
                'onmouseover="this.style.background=\'#dbeafe\'" onmouseout="this.style.background=\'#eff6ff\'">View →</button>' +
        '</div>';
    }).join('');
}

// ── Widget: ultimi 10 materiali aggiornati nella community ────────────
async function renderUpdatedCommunityMaterials() {
    var container = document.getElementById('updated-community-list');
    if (!container) return;

    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';

    var items = [];

    if (window.communityDB && window.fbQuery && window.fbOrderBy && window.fbGetDocs && window.fbCollection) {
        try {
            var { query, orderBy, limit, getDocs, collection, where } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            // Materiali che hanno updatedAt diverso da createdAt (= modificati)
            var q = query(
                collection(window.communityDB, "materials"),
                orderBy("updatedAt", "desc"),
                limit(15) // ne prendiamo 15 per poi filtrare i solo-creati
            );
            var snap = await getDocs(q);
            snap.forEach(function(d) {
                var data = d.data();
                // Considera "aggiornato" solo se updatedAt esiste ed è diverso da createdAt
                var isUpdated = data.updatedAt && data.createdAt && data.updatedAt !== data.createdAt;
                if (isUpdated) {
                    items.push({
                        name:      data.name      || 'Unknown',
                        company:   data.company   || '',
                        family:    data.family    || '',
                        updatedAt: data.updatedAt || '',
                        id:        'fb_' + d.id
                    });
                }
            });
            items = items.slice(0, 10);
        } catch(e) {
            console.warn('Updated community fetch failed:', e);
        }
    }

    // Fallback locale
    if (items.length === 0) {
        items = DB.materials
            .filter(function(m) { return m.isCommunity && m.updatedAt && m.createdAt && m.updatedAt !== m.createdAt; })
            .sort(function(a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); })
            .slice(0, 10)
            .map(function(m) {
                return { name: m.name, company: m.company || '', family: m.family || '', updatedAt: m.updatedAt || '', id: m.id };
            });
    }

    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No updates yet</div>';
        return;
    }

    container.innerHTML = items.map(function(m) {
        var dateStr = '';
        if (m.updatedAt) {
            try { dateStr = new Date(m.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }); }
            catch(e) { dateStr = m.updatedAt.slice(0, 10); }
        }
        var escapedName = (m.name || '').replace(/'/g, "\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.7rem 1.25rem;border-bottom:1px solid #f8fafc;transition:background 0.15s" ' +
               'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.name || '') + '</div>' +
                '<div style="font-size:0.68rem;color:#94a3b8;margin-top:0.1rem">' +
                    (m.company ? m.company + ' · ' : '') + (m.family || '') +
                '</div>' +
            '</div>' +
            (dateStr ? '<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0">' + dateStr + '</div>' : '') +
            '<button onclick="goToMaterial(\'' + escapedName + '\')" ' +
                'style="background:#fffbeb;border:1px solid #fde68a;color:#d97706;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer;flex-shrink:0;transition:all 0.15s" ' +
                'onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'#fffbeb\'">View →</button>' +
        '</div>';
    }).join('');
}

// ====================================================================
// 🏠 renderHome — versione aggiornata con 3 widget community
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

    <!-- COMMUNITY WIDGETS ROW (3 colonne) -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2rem">

        <!-- 1. Most Used Materials -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">This Month</div>
                    <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Most Used</div>
                </div>
                <div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div>
            </div>
            <div id="top3-ranking" style="padding:0.25rem 0">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading rankings...</div>
            </div>
        </div>

        <!-- 2. New in Community -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>
                    <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-top:0.1rem">New Materials</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem">
                    <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:badgePulse 2s infinite"></div>
                    <span style="font-size:0.65rem;color:#94a3b8">last 10</span>
                </div>
            </div>
            <div id="new-community-list" style="max-height:280px;overflow-y:auto;padding:0.25rem 0">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>
            </div>
        </div>

        <!-- 3. Recently Updated -->
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <div style="padding:1rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
                <div>
                    <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>
                    <div style="font-size:0.88rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Recently Updated</div>
                </div>
                <div style="display:flex;align-items:center;gap:0.4rem">
                    <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></div>
                    <span style="font-size:0.65rem;color:#94a3b8">last 10</span>
                </div>
            </div>
            <div id="updated-community-list" style="max-height:280px;overflow-y:auto;padding:0.25rem 0">
                <div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>
            </div>
        </div>

    </div>

    <!-- CAPABILITIES -->
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">
        <div style="padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9">
            <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Platform</div>
            <div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin-top:0.15rem">Core Capabilities</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr)">
            ${[
                { label: 'Multilayer Resistance Model', desc: 'Series resistance calculation per ISO/ASTM' },
                { label: 'Arrhenius Temperature Fit', desc: 'R² validated prediction at untested temperatures' },
                { label: 'Shelf Life Engine', desc: 'GAB isotherm + oxidation kinetics' },
                { label: 'Sensitivity & Optimization', desc: 'Thickness sweep and cost optimizer' },
            ].map(function(f) {
                return '<div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 1.5rem;border-bottom:1px solid #f8fafc;border-right:1px solid #f8fafc">' +
                    '<div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div>' +
                    '<div>' +
                        '<div style="font-size:0.82rem;font-weight:600;color:#0f172a">' + f.label + '</div>' +
                        '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.1rem">' + f.desc + '</div>' +
                    '</div>' +
                '</div>';
            }).join('')}
        </div>
    </div>

    <!-- FOOTER -->
    <div style="padding:1.5rem 0;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
        <div style="font-size:0.72rem;color:#94a3b8;line-height:1.4">
            <strong style="color:#64748b">Disclaimer:</strong> For R&D and engineering use only.
            Results require laboratory validation per ASTM F1249 / ISO 15106 standards.
        </div>
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
    `;
}

// ====================================================================
// 🎬 INIT HOME ANIMATIONS — aggiornata per caricare i 3 widget
// ====================================================================
function initHomeAnimations() {
    if (State.tab !== 'home') return;

    // Carica i 3 widget in parallelo
    if (window.communityDB || DB.materials.some(function(m){ return m.isCommunity; })) {
        updateTop3UI();
        renderNewCommunityMaterials();
        renderUpdatedCommunityMaterials();
    } else {
        // Riprova dopo che Firebase si connette
        var attempts = 0;
        var interval = setInterval(function() {
            attempts++;
            if (window.communityDB || attempts > 20) {
                clearInterval(interval);
                updateTop3UI();
                renderNewCommunityMaterials();
                renderUpdatedCommunityMaterials();
            }
        }, 300);
    }

    // Animazioni esistenti
    var featuresSection = document.getElementById('featuresSection');
    if (featuresSection) {
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    entry.target.querySelectorAll('.feature-card').forEach(function(c, i) {
                        setTimeout(function(){ c.classList.add('visible'); }, i * 100);
                    });
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        obs.observe(featuresSection);
    }

    initDemoCharts();
    initCountUp();
}
