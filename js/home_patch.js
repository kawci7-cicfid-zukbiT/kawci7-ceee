// ====================================================================
// HOME PATCH
// ====================================================================
window.updateTop3UI = async function() { renderMostUsedMaterials(); };

function goToMaterial(matName) {
    onGroupClick('community');
    setTimeout(function() {
        onSubTabClick('materials');
        State.searchQuery = matName;
        setTimeout(function() {
            var input = document.getElementById('mat-search');
            if (input) { input.value = matName; onMatSearch(matName); }
        }, 200);
    }, 50);
}

// ====================================================================
// Widget 1 — Top 10 Most Used
// ====================================================================
async function renderMostUsedMaterials() {
    var container = document.getElementById('top3-ranking');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';
    var currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0');
    var items = [];
    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var snap = await getDocs(query(collection(window.communityDB, "materials"), orderBy("usageCount", "desc"), limit(10)));
            snap.forEach(function(d) {
                var data = d.data();
                if (data.lastUsageMonth === currentMonth && (data.usageCount || 0) > 0)
                    items.push({ name: data.name||'Unknown', company: data.company||'', count: data.usageCount||0 });
            });
        } catch(e) { console.warn('Most used fetch failed:', e); }
    }
    if (items.length === 0) {
        items = DB.materials.filter(function(m){ return m.lastUsageMonth === currentMonth && (m.usageCount||0) > 0; })
            .sort(function(a,b){ return (b.usageCount||0)-(a.usageCount||0); }).slice(0,10)
            .map(function(m){ return { name:m.name, company:m.company||'', count:m.usageCount||0 }; });
    }
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.78rem">Start calculating to see rankings</div>';
        return;
    }
    var medals = ['🥇','🥈','🥉'];
    container.innerHTML = items.map(function(m, idx) {
        var en = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="font-size:'+(idx<3?'1rem':'0.7rem')+';width:20px;text-align:center;flex-shrink:0">'+(idx<3?medals[idx]:'<span style="color:#cbd5e1;font-weight:700;font-family:monospace">'+String(idx+1).padStart(2,'0')+'</span>')+'</div>' +
            '<div style="flex:1;min-width:0"><div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(m.name||'')+'</div>'+(m.company?'<div style="font-size:0.68rem;color:#94a3b8">'+m.company+'</div>':'')+'</div>' +
            '<div style="font-size:0.72rem;font-weight:700;color:#2563eb;flex-shrink:0;margin-right:0.5rem">'+m.count+' uses</div>' +
            '<button onclick="goToMaterial(\''+en+'\')" style="background:#eff6ff;border:1px solid #bfdbfe;color:#2563eb;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer">View</button>' +
            '</div>';
    }).join('');
}

// ====================================================================
// Widget 2 — New in Community
// ====================================================================
async function renderNewCommunityMaterials() {
    var container = document.getElementById('new-community-list');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';
    var items = [];
    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var snap = await getDocs(query(collection(window.communityDB, "materials"), orderBy("createdAt", "desc"), limit(10)));
            snap.forEach(function(d) {
                var data = d.data();
                items.push({ name: data.name||'Unknown', company: data.company||'', family: data.family||'', createdAt: data.createdAt||'' });
            });
        } catch(e) { console.warn('New community fetch failed:', e); }
    }
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No community materials yet</div>';
        return;
    }
    container.innerHTML = items.map(function(m) {
        var dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '';
        var en = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0"><div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(m.name||'')+'</div><div style="font-size:0.68rem;color:#94a3b8">'+(m.company?m.company+' · ':'')+m.family+'</div></div>' +
            (dateStr?'<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0;margin-right:0.5rem">'+dateStr+'</div>':'') +
            '<button onclick="goToMaterial(\''+en+'\')" style="background:#f0fdf4;border:1px solid #86efac;color:#16a34a;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer">View</button>' +
            '</div>';
    }).join('');
}

// ====================================================================
// Widget 3 — Recently Updated
// ====================================================================
async function renderUpdatedCommunityMaterials() {
    var container = document.getElementById('updated-community-list');
    if (!container) return;
    container.innerHTML = '<div style="padding:1rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div>';
    var items = [];
    if (window.communityDB) {
        try {
            var { query, orderBy, limit, getDocs, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            var snap = await getDocs(query(collection(window.communityDB, "materials"), orderBy("updatedAt", "desc"), limit(20)));
            snap.forEach(function(d) {
                var data = d.data();
                if (data.updatedAt && data.createdAt && data.updatedAt !== data.createdAt && items.length < 10)
                    items.push({ name: data.name||'Unknown', company: data.company||'', family: data.family||'', updatedAt: data.updatedAt||'' });
            });
        } catch(e) { console.warn('Updated community fetch failed:', e); }
    }
    if (items.length === 0) {
        container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#94a3b8;font-size:0.82rem">No updates yet</div>';
        return;
    }
    container.innerHTML = items.map(function(m) {
        var dateStr = m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '';
        var en = (m.name||'').replace(/'/g,"\\'");
        return '<div style="display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.25rem;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0"><div style="font-size:0.82rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(m.name||'')+'</div><div style="font-size:0.68rem;color:#94a3b8">'+(m.company?m.company+' · ':'')+m.family+'</div></div>' +
            (dateStr?'<div style="font-size:0.68rem;color:#cbd5e1;flex-shrink:0;margin-right:0.5rem">'+dateStr+'</div>':'') +
            '<button onclick="goToMaterial(\''+en+'\')" style="background:#fffbeb;border:1px solid #fde68a;color:#d97706;border-radius:6px;padding:0.2rem 0.55rem;font-size:0.68rem;font-weight:600;cursor:pointer">View</button>' +
            '</div>';
    }).join('');
}

// ====================================================================
// renderHome
// ====================================================================
function renderHome() {
    var totalMats = DB.materials.length;
    var totalLams = DB.laminates.length;
    var multiTempMats = 0;
    for (var i = 0; i < DB.materials.length; i++) {
        if (Engine.validateArrhenius(DB.materials[i]).valid) multiTempMats++;
    }

    return '<div class="home-bg-glow"></div>' +
    '<div style="max-width:1100px;margin:0 auto;padding:0 0.5rem;position:relative;z-index:10;">' +

    // HERO
    '<div style="padding:3rem 2rem 2.5rem;margin-bottom:2rem;border-bottom:1px solid #e2e8f0">' +
        '<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem">' +
            '<div>' +
                '<div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;color:#2563eb;text-transform:uppercase;margin-bottom:0.6rem">Packaging Engineering Tool</div>' +
                '<h1 style="font-size:2.4rem;font-weight:800;color:#0f172a;line-height:1.15;margin:0 0 0.75rem 0;letter-spacing:-0.03em">WVTR / OTR<br>Calculator</h1>' +
                '<p style="font-size:0.95rem;color:#64748b;margin:0;max-width:480px;line-height:1.6">Professional barrier analysis for multilayer packaging structures.</p>' +
            '</div>' +
            '<button onclick="onGroupClick(\'analysis\');setTimeout(function(){onSubTabClick(\'calc\');},50)" ' +
                'style="background:#2563eb;color:#fff;border:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;white-space:nowrap" ' +
                'onmouseover="this.style.background=\'#1d4ed8\'" onmouseout="this.style.background=\'#2563eb\'">' +
                'Start Calculation →' +
            '</button>' +
        '</div>' +
    '</div>' +

    // KPI ROW
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e2e8f0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">' +
        '<div style="background:#fff;padding:1.5rem">' +
            '<div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Total Materials</div>' +
            '<div style="font-size:2.6rem;font-weight:800;color:#2563eb;line-height:1;margin-bottom:0.35rem">' + totalMats + '</div>' +
            '<div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">In the database</div>' +
            '<button onclick="onGroupClick(\'community\');setTimeout(function(){onSubTabClick(\'materials\');},50)" style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Explore database →</button>' +
        '</div>' +
        '<div style="background:#fff;padding:1.5rem">' +
            '<div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Arrhenius Ready</div>' +
            '<div style="font-size:2.6rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.35rem">' + multiTempMats + '</div>' +
            '<div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">Multi-temperature datasets</div>' +
            '<button onclick="onGroupClick(\'analysis\');setTimeout(function(){onSubTabClick(\'arrhenius\');},50)" style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">Run analysis →</button>' +
        '</div>' +
        '<div style="background:#fff;padding:1.5rem">' +
            '<div style="font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:0.4rem">Saved Laminates</div>' +
            '<div style="font-size:2.6rem;font-weight:800;color:#0f172a;line-height:1;margin-bottom:0.35rem">' + totalLams + '</div>' +
            '<div style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem">Structures in your library</div>' +
            '<button onclick="onGroupClick(\'community\');setTimeout(function(){onSubTabClick(\'laminates\');},50)" style="font-size:0.75rem;color:#2563eb;background:none;border:none;cursor:pointer;padding:0;font-weight:600">View library →</button>' +
        '</div>' +
    '</div>' +

    // 3 COMMUNITY WIDGETS
    '<div class="home-widgets-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-bottom:2rem">' +

        // Widget 1: Most Used
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">' +
            '<div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
                '<div><div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">This Month</div>' +
                '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Most Used</div></div>' +
                '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div>' +
            '</div>' +
            '<div id="top3-ranking" style="overflow-y:auto;max-height:320px;flex:1"><div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div></div>' +
        '</div>' +

        // Widget 2: New Materials
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">' +
            '<div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
                '<div><div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>' +
                '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">New Materials</div></div>' +
                '<div style="display:flex;align-items:center;gap:0.35rem"><div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div><span style="font-size:0.62rem;color:#94a3b8">last 10</span></div>' +
            '</div>' +
            '<div id="new-community-list" style="overflow-y:auto;max-height:320px;flex:1"><div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div></div>' +
        '</div>' +

        // Widget 3: Recently Updated
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column">' +
            '<div style="padding:0.9rem 1.25rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">' +
                '<div><div style="font-size:0.62rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Community</div>' +
                '<div style="font-size:0.85rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Recently Updated</div></div>' +
                '<div style="display:flex;align-items:center;gap:0.35rem"><div style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></div><span style="font-size:0.62rem;color:#94a3b8">last 10</span></div>' +
            '</div>' +
            '<div id="updated-community-list" style="overflow-y:auto;max-height:320px;flex:1"><div style="padding:1.25rem;text-align:center;color:#94a3b8;font-size:0.78rem">Loading...</div></div>' +
        '</div>' +

    '</div>' +

    // CAPABILITIES
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:2rem">' +
        '<div style="padding:1rem 1.5rem;border-bottom:1px solid #f1f5f9">' +
            '<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b">Platform</div>' +
            '<div style="font-size:0.9rem;font-weight:700;color:#0f172a;margin-top:0.1rem">Core Capabilities</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,1fr)">' +
            '<div style="display:flex;align-items:center;gap:0.9rem;padding:0.8rem 1.25rem;border-bottom:1px solid #f8fafc;border-right:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.8rem;font-weight:600;color:#0f172a">Multilayer Resistance Model</div><div style="font-size:0.7rem;color:#94a3b8">Series resistance per ISO/ASTM</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:0.9rem;padding:0.8rem 1.25rem;border-bottom:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.8rem;font-weight:600;color:#0f172a">Arrhenius Temperature Fit</div><div style="font-size:0.7rem;color:#94a3b8">R² prediction at untested temperatures</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:0.9rem;padding:0.8rem 1.25rem;border-right:1px solid #f8fafc"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.8rem;font-weight:600;color:#0f172a">Shelf Life Engine</div><div style="font-size:0.7rem;color:#94a3b8">GAB isotherm + oxidation kinetics</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:0.9rem;padding:0.8rem 1.25rem"><div style="width:6px;height:6px;border-radius:50%;background:#2563eb;flex-shrink:0"></div><div><div style="font-size:0.8rem;font-weight:600;color:#0f172a">Sensitivity & Optimization</div><div style="font-size:0.7rem;color:#94a3b8">Thickness sweep and cost optimizer</div></div></div>' +
        '</div>' +
    '</div>' +

    // FOOTER
    '<div style="padding:1.5rem;font-size:0.7rem;color:#64748b;line-height:1.5;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">' +
    
    '<h4 style="margin:0 0 0.75rem 0;font-size:0.75rem;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem">TRADEMARK DISCLAIMER</h4>' +
    '<p style="margin:0 0 0.75rem 0">All product names, brand names, and trademarks mentioned on this platform are the property of their respective owners. The following are known registered trademarks or trademarks of their respective companies:</p>' +
    
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.35rem 0.5rem;margin:0.75rem 0">' +
        '<div><strong>AGC Chemicals:</strong> Fluon®</div>' +
        '<div><strong>Arkema:</strong> Pebax®, Rilsan®, Rilsamid®</div>' +
        '<div><strong>BASF:</strong> Ecoflex®, Ecovio®, Elastollan®, Styroflex®, Ultramid®</div>' +
        '<div><strong>Borealis:</strong> Borcycle®, Borpure®, Borstar®, Bornewables®, Queo®</div>' +
        '<div><strong>Celanese:</strong> Hytrel®, Zytel®</div>' +
        '<div><strong>Chemours:</strong> Teflon®, Tefzel®</div>' +
        '<div><strong>Chevron Phillips:</strong> Marlex®</div>' +
        '<div><strong>Covestro:</strong> Baymedix®, Desmopan®, Makrofol®, Makrolon®</div>' +
        '<div><strong>Daikin:</strong> Neoflon®</div>' +
        '<div><strong>Danimer Scientific:</strong> Nodax®</div>' +
        '<div><strong>DOMO Chemicals:</strong> Technyl®</div>' +
        '<div><strong>Dow:</strong> Affinity®, Bynel®, Dowlex®, Elvaloy®, Engage®, INNATE®, Nucrel®, Saran®, Surlyn®</div>' +
        '<div><strong>DuPont:</strong> Tedlar®, Tyvek®</div>' +
        '<div><strong>Eastman:</strong> Amphora®, Spectar®, Tenite®, Tritan®</div>' +
        '<div><strong>EMS-Chemie:</strong> Grilon®, Grivory®</div>' +
        '<div><strong>Envalior:</strong> Akulon®, Durethan®</div>' +
        '<div><strong>ExxonMobil:</strong> Escorene®, Exceed®, Vistamaxx®</div>' +
        '<div><strong>FKuR:</strong> BioFlex®</div>' +
        '<div><strong>Futamura / Innovia Films:</strong> NatureFlex®</div>' +
        '<div><strong>Honeywell:</strong> Aclar®, Capran®, Capron®</div>' +
        '<div><strong>Indorama Ventures:</strong> Melinex®, Mylar®</div>' +
        '<div><strong>Jindal Films:</strong> Bicor®, Treofan®</div>' +
        '<div><strong>Kuraray Co., Ltd.:</strong> EVAL™, Exceval™</div>' +
        '<div><strong>LG Chem:</strong> Lucene®</div>' +
        '<div><strong>Lubrizol:</strong> Estane®, Pellethane®, Tecoflex®</div>' +
        '<div><strong>LyondellBasell:</strong> Alathon®, Innoplen®, Lupolen®, Nextene®, Petrothene®</div>' +
        '<div><strong>Mitsubishi Chemical:</strong> Soarnol™</div>' +
        '<div><strong>Mitsubishi Polyester Film:</strong> Hostaphan®</div>' +
        '<div><strong>NatureWorks:</strong> Ingeo®</div>' +
        '<div><strong>Novamont:</strong> Mater-Bi®</div>' +
        '<div><strong>Prime Polymer:</strong> Evolue®</div>' +
        '<div><strong>SABIC:</strong> Lexan®</div>' +
        '<div><strong>SKC:</strong> Skyrol®</div>' +
        '<div><strong>Syensqo:</strong> Ixan®</div>' +
        '<div><strong>Teijin:</strong> Panlite®</div>' +
        '<div><strong>Terphane LLC:</strong> Terphane®</div>' +
        '<div><strong>Topas Advanced Polymers:</strong> Topas®</div>' +
        '<div><strong>Toray Industries:</strong> Lumirror®, Torayfan®</div>' +
        '<div><strong>TotalEnergies:</strong> Lacqtene®</div>' +
        '<div><strong>TotalEnergies Corbion:</strong> Luminy®</div>' +
        '<div><strong>Unitika / Coveris:</strong> Emblem®</div>' +
        '<div><strong>Zeon Corporation:</strong> Zeonex®, Zeonor®</div>' +
    '</div>' +
    
    '<p style="margin:0.75rem 0 0 0;font-size:0.68rem">Any other product or brand names mentioned on this platform that are not explicitly listed above are likewise the property of their respective owners and may be registered trademarks or trademarks in one or more jurisdictions. The absence of a trademark symbol does not imply that such names are free to use. This list is not exhaustive and may not reflect updates due to the addition of new materials over time.</p>' +
    
    '<h4 style="margin:1.25rem 0 0.5rem 0;font-size:0.75rem;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem">PLATFORM USE DISCLAIMER</h4>' +
    '<p style="margin:0 0 0.5rem 0;font-size:0.68rem">This platform is an independent technical tool intended solely to assist engineers and technical professionals in preliminary barrier performance analysis. It has no commercial relationship, partnership, affiliation, or formal contact with any of the film or material manufacturers whose products are referenced herein. All data presented is sourced from publicly available technical documentation and is provided for reference purposes only.</p>' +
    
    '<div style="margin-top:1rem;padding:0.6rem 0.75rem;background:#fff7ed;border-left:3px solid #f97316;border-radius:0 4px 4px 0;font-size:0.68rem;color:#9a3412">' +
        '<strong style="display:block;margin-bottom:0.25rem"> For R&D use only</strong>' +
        'Results require laboratory validation per ASTM F1249 / ISO 15106. All barrier performance values presented on this platform are indicative and must be independently verified through accredited laboratory testing before use in any product specification, regulatory submission, or commercial application. The platform operators accept no liability for decisions made on the basis of the data provided.' +
    '</div>' +
    
'</div>';
}

// ====================================================================
// initHomeAnimations
// ====================================================================
function initHomeAnimations() {
    if (State.tab !== 'home') return;
    function loadWidgets() {
        renderMostUsedMaterials();
        renderNewCommunityMaterials();
        renderUpdatedCommunityMaterials();
    }
    if (window.communityDB) { loadWidgets(); }
    else {
        var attempts = 0;
        var iv = setInterval(function() {
            attempts++;
            if (window.communityDB || attempts > 30) { clearInterval(iv); loadWidgets(); }
        }, 200);
    }
    initDemoCharts();
    initCountUp();
}
