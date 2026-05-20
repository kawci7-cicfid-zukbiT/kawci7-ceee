// ====================================================================
//  COMPANY.JS - Private Company Database
// Codice accesso · Materiali & Laminati aziendali · Firestore isolato
// ====================================================================

// ====================================================================
// 🔑 STATO COMPANY (persiste in localStorage)
// ====================================================================
var CompanyState = {
    companyId:   null,
    companyName: null,
    role:        null,   // 'admin' | 'member'
    joinedAt:    null,
    expiresAt:   null,   // null = forever

    load: function() {
        try {
            var s = JSON.parse(localStorage.getItem('wvtr_company') || 'null');
            if (!s) return false;
            if (s.expiresAt && new Date(s.expiresAt) < new Date()) {
                this.clear();
                return false;
            }
            this.companyId   = s.companyId;
            this.companyName = s.companyName;
            this.role        = s.role;
            this.joinedAt    = s.joinedAt;
            this.expiresAt   = s.expiresAt;
            return true;
        } catch(e) { return false; }
    },

    save: function() {
        localStorage.setItem('wvtr_company', JSON.stringify({
            companyId:   this.companyId,
            companyName: this.companyName,
            role:        this.role,
            joinedAt:    this.joinedAt,
            expiresAt:   this.expiresAt
        }));
    },

    clear: function() {
        this.companyId = this.companyName = this.role = this.joinedAt = this.expiresAt = null;
        localStorage.removeItem('wvtr_company');
    },

    isActive: function() {
        if (!this.companyId) return false;
        if (this.expiresAt && new Date(this.expiresAt) < new Date()) { this.clear(); return false; }
        return true;
    },

    daysLeft: function() {
        if (!this.expiresAt) return null;
        var diff = new Date(this.expiresAt) - new Date();
        return Math.max(0, Math.ceil(diff / 86400000));
    }
};

// ====================================================================
// 🔐 GENERATORE CODICE ACCESSO
// ====================================================================
function generateCompanyCode(durationDays) {
    // Formato: XXXX-XXXX-XXXX-XXXX (64-bit entropy)
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O,0,I,1 ambigui
    var code  = '';
    for (var i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += '-';
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    var expiresAt = null;
    if (durationDays === 30)  expiresAt = new Date(Date.now() + 30  * 86400000).toISOString();
    if (durationDays === 180) expiresAt = new Date(Date.now() + 180 * 86400000).toISOString();
    // null = forever

    return { code: code, expiresAt: expiresAt };
}

// ====================================================================
// 🔥 FIRESTORE HELPERS (company sub-collections)
// ====================================================================
function compCol(sub) {
    // companies/{companyId}/{sub}
    return window.fbCollection(
        window.communityDB,
        'companies', CompanyState.companyId, sub
    );
}

async function saveCompanyMaterial(mat) {
    if (!CompanyState.isActive() || !window.communityDB) return { success: false, error: 'Not in a company' };
    try {
        var payload = {
            name: mat.name, family: mat.family || 'Other',
            testMethodWVTR: mat.testMethodWVTR || '', testMethodOTR: mat.testMethodOTR || '',
            isMetallized: mat.isMetallized || false,
            hygroscopicBetaWVTR: mat.hygroscopicBetaWVTR || 0,
            hygroscopicRefRHWVTR: mat.hygroscopicRefRHWVTR || 50,
            hygroscopicBetaOTR: mat.hygroscopicBetaOTR || 0,
            hygroscopicRefRHOTR: mat.hygroscopicRefRHOTR || 50,
            wvtrValues: mat.wvtrValues || [], otrValues: mat.otrValues || [],
            validConditions: mat.validConditions || [],
            company: mat.company || '', tdsLink: mat.tdsLink || '',
            sharedBy: window.getOrCreateUserId(),
            updatedAt: new Date().toISOString()
        };
        var ref;
        if (mat._companyDocId) {
            ref = window.fbDoc(window.communityDB, 'companies', CompanyState.companyId, 'materials', mat._companyDocId);
            await window.fbUpdateDoc(ref, payload);
            return { success: true, id: mat._companyDocId };
        } else {
            payload.createdAt = new Date().toISOString();
            var docRef = await window.fbAddDoc(compCol('materials'), payload);
            return { success: true, id: docRef.id };
        }
    } catch(e) { return { success: false, error: e.message }; }
}

async function loadCompanyMaterials() {
    if (!CompanyState.isActive() || !window.communityDB) return [];
    try {
        var q   = window.fbQuery(compCol('materials'), window.fbOrderBy('createdAt', 'desc'));
        var snap = await window.fbGetDocs(q);
        var mats = [];
        snap.forEach(function(d) {
            var data = d.data();
            mats.push(Object.assign({}, data, {
                id: 'co_' + d.id,
                _companyDocId: d.id,
                isCompany: true,
                isCommunity: false,
                reliabilityVotes: data.reliabilityVotes || { up: 0, down: 0 },
                usageCount: data.usageCount || 0
            }));
        });
        return mats;
    } catch(e) { console.warn('loadCompanyMaterials error:', e); return []; }
}

async function saveCompanyLaminate(lam) {
    if (!CompanyState.isActive() || !window.communityDB) return { success: false, error: 'Not in a company' };
    try {
        var payload = {
            name: lam.name, total: lam.total, totalThickness: lam.totalThickness,
            humidity: lam.humidity, temperature: lam.temperature, mode: lam.mode,
            recyclable: lam.recyclable, monoStructure: lam.monoStructure,
            layerCount: lam.layerCount, layers: lam.layers || [],
            sharedBy: window.getOrCreateUserId(),
            updatedAt: new Date().toISOString()
        };
        var ref;
        if (lam._companyLamId) {
            ref = window.fbDoc(window.communityDB, 'companies', CompanyState.companyId, 'laminates', lam._companyLamId);
            await window.fbUpdateDoc(ref, payload);
            return { success: true, id: lam._companyLamId };
        } else {
            payload.createdAt = new Date().toISOString();
            var docRef = await window.fbAddDoc(compCol('laminates'), payload);
            return { success: true, id: docRef.id };
        }
    } catch(e) { return { success: false, error: e.message }; }
}

async function loadCompanyLaminates() {
    if (!CompanyState.isActive() || !window.communityDB) return [];
    try {
        var q   = window.fbQuery(compCol('laminates'), window.fbOrderBy('createdAt', 'desc'));
        var snap = await window.fbGetDocs(q);
        var lams = [];
        snap.forEach(function(d) {
            var data = d.data();
            lams.push(Object.assign({}, data, {
                id: 'col_' + d.id,
                _companyLamId: d.id,
                isCompany: true
            }));
        });
        return lams;
    } catch(e) { console.warn('loadCompanyLaminates error:', e); return []; }
}

async function deleteCompanyMaterial(docId) {
    if (!CompanyState.isActive() || !window.communityDB) return;
    try {
        var { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await deleteDoc(window.fbDoc(window.communityDB, 'companies', CompanyState.companyId, 'materials', docId));
    } catch(e) { console.warn('deleteCompanyMaterial error:', e); }
}

async function deleteCompanyLaminate(docId) {
    if (!CompanyState.isActive() || !window.communityDB) return;
    try {
        var { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await deleteDoc(window.fbDoc(window.communityDB, 'companies', CompanyState.companyId, 'laminates', docId));
    } catch(e) { console.warn('deleteCompanyLaminate error:', e); }
}

// ====================================================================
// 🏗️ CREA AZIENDA — scrive il documento companies/{id}
// ====================================================================
async function createCompany(companyName, durationDays) {
    if (!window.communityDB) { alert('Database not connected'); return; }
    var gen       = generateCompanyCode(durationDays);
    var companyId = 'co_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();

    try {
        var ref = window.fbDoc(window.communityDB, 'companies', companyId);
        var { setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await setDoc(ref, {
            name:      companyName,
            code:      gen.code,
            expiresAt: gen.expiresAt,
            createdAt: new Date().toISOString(),
            createdBy: window.getOrCreateUserId()
        });

        CompanyState.companyId   = companyId;
        CompanyState.companyName = companyName;
        CompanyState.role        = 'admin';
        CompanyState.joinedAt    = new Date().toISOString();
        CompanyState.expiresAt   = gen.expiresAt;
        CompanyState.save();

        showCompanyCreatedModal(companyName, gen.code, gen.expiresAt);
    } catch(e) { alert('Error creating company: ' + e.message); }
}

// ====================================================================
// 🔓 JOIN AZIENDA — cerca il codice in tutti i companies
// ====================================================================
async function joinCompany(inputCode) {
    if (!window.communityDB) { alert('Database not connected'); return; }
    var cleanCode = inputCode.trim().toUpperCase().replace(/\s/g, '');

    try {
        var { getDocs, collection, query, where } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        var q    = query(collection(window.communityDB, 'companies'), where('code', '==', cleanCode));
        var snap = await getDocs(q);

        if (snap.empty) { alert('❌ Code not found. Check and try again.'); return; }

        var d    = snap.docs[0];
        var data = d.data();

        // Controlla scadenza
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
            alert('❌ This access code has expired.'); return;
        }

        CompanyState.companyId   = d.id;
        CompanyState.companyName = data.name;
        CompanyState.role        = 'member';
        CompanyState.joinedAt    = new Date().toISOString();
        CompanyState.expiresAt   = data.expiresAt || null;
        CompanyState.save();

        Modal.close();
        showCompanyToast('✅ Joined <strong>' + data.name + '</strong> successfully!', '#15803d');
        setTimeout(function() { render(); }, 400);
    } catch(e) { alert('Error joining company: ' + e.message); }
}

// ====================================================================
// 🖥️ MODAL: Gestione Company (principale)
// ====================================================================
function showCompanyModal() {
    var isActive = CompanyState.isActive();
    var daysLeft = CompanyState.daysLeft();

    var body = '';

    // ── DISCLAIMER ──────────────────────────────────────────────────
    body +=
        '<div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:10px;padding:0.85rem 1rem;margin-bottom:1.25rem">' +
            '<div style="display:flex;gap:0.5rem;align-items:flex-start">' +
                '<span style="font-size:1.1rem;flex-shrink:0">⚠️</span>' +
                '<div>' +
                    '<div style="font-size:0.82rem;font-weight:700;color:#92400e;margin-bottom:0.3rem">Important Disclaimer</div>' +
                    '<div style="font-size:0.75rem;color:#78350f;line-height:1.55">' +
                        '<strong>Do not enter sensitive or confidential company data</strong> in this shared space. ' +
                        'This database is intended exclusively for <strong>packaging material technical parameters</strong> ' +
                        '(WVTR, OTR, thickness, test conditions). ' +
                        'Do not share: trade secrets, proprietary formulations, customer data, pricing, contracts, or any ' +
                        'personally identifiable information. ' +
                        'All data entered is stored on shared servers and accessible to all members of your company group.' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    if (isActive) {
        // ── STATO ATTIVO ─────────────────────────────────────────────
        var expiryLabel = daysLeft === null
            ? '<span style="color:#16a34a;font-weight:600">Never expires</span>'
            : daysLeft > 0
                ? '<span style="color:#d97706;font-weight:600">' + daysLeft + ' days left</span>'
                : '<span style="color:#dc2626;font-weight:600">Expired</span>';

        body +=
            '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:1rem;margin-bottom:1rem">' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">' +
                    '<span style="font-size:1.1rem"></span>' +
                    '<strong style="font-size:0.92rem;color:#0f172a">' + CompanyState.companyName + '</strong>' +
                    '<span class="badge badge-green" style="margin-left:auto">' + CompanyState.role + '</span>' +
                '</div>' +
                '<div style="font-size:0.75rem;color:#64748b">Access: ' + expiryLabel + '</div>' +
            '</div>' +

            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem">' +
                '<button class="btn btn-outline" onclick="Modal.close();showCompanyDB()" style="font-size:0.82rem">' +
                    '📦 View Company DB' +
                '</button>' +
                (CompanyState.role === 'admin'
                    ? '<button class="btn btn-outline" onclick="showCompanyCodeManager()" style="font-size:0.82rem">🔑 Manage Code</button>'
                    : '<div></div>') +
            '</div>' +

            '<button class="btn btn-danger btn-full" onclick="leaveCompany()" style="font-size:0.82rem">' +
                '🚪 Leave Company' +
            '</button>';
    } else {
        // ── NESSUNA COMPANY ──────────────────────────────────────────
        body +=
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">' +

                // JOIN
                '<div style="border:1.5px solid var(--border);border-radius:10px;padding:1rem">' +
                    '<div style="font-weight:700;font-size:0.88rem;margin-bottom:0.3rem">🔓 Join a Company</div>' +
                    '<div style="font-size:0.72rem;color:var(--text-light);margin-bottom:0.75rem">Enter the access code provided by your company admin.</div>' +
                    '<div class="form-group" style="margin:0">' +
                        '<label>Access Code</label>' +
                        '<input type="text" id="co-join-code" class="form-input" placeholder="XXXX-XXXX-XXXX-XXXX" ' +
                            'style="font-family:monospace;letter-spacing:0.08em;text-transform:uppercase" ' +
                            'oninput="this.value=this.value.toUpperCase()">' +
                    '</div>' +
                    '<button class="btn btn-primary btn-full" onclick="joinCompany(document.getElementById(\'co-join-code\').value)" style="margin-top:0.75rem;font-size:0.82rem">' +
                        'Join →' +
                    '</button>' +
                '</div>' +

                // CREATE
                '<div style="border:1.5px solid var(--border);border-radius:10px;padding:1rem">' +
                    '<div style="font-weight:700;font-size:0.88rem;margin-bottom:0.3rem">🏗️ Create Company DB</div>' +
                    '<div style="font-size:0.72rem;color:var(--text-light);margin-bottom:0.75rem">Create a private space for your team.</div>' +
                    '<div class="form-group" style="margin-bottom:0.5rem">' +
                        '<label>Company Name</label>' +
                        '<input type="text" id="co-create-name" class="form-input" placeholder="e.g. Acme Packaging">' +
                    '</div>' +
                    '<div class="form-group" style="margin-bottom:0.75rem">' +
                        '<label>Access Duration</label>' +
                        '<select id="co-create-duration" class="form-input">' +
                            '<option value="30">30 days</option>' +
                            '<option value="180">180 days</option>' +
                            '<option value="0">Forever</option>' +
                        '</select>' +
                    '</div>' +
                    '<button class="btn btn-success btn-full" onclick="createCompanyFromModal()" style="font-size:0.82rem">' +
                        'Create →' +
                    '</button>' +
                '</div>' +

            '</div>';
    }

    Modal.open(' Company Database', body, function() { return true; });
    // Nascondi il pulsante Save del modal (non serve qui)
    var footer = document.getElementById('modal-footer');
    if (footer) footer.style.display = 'none';
}

function createCompanyFromModal() {
    var name     = (document.getElementById('co-create-name')?.value || '').trim();
    var duration = parseInt(document.getElementById('co-create-duration')?.value || '0');
    if (!name) { alert('Enter a company name'); return; }
    Modal.close();
    createCompany(name, duration || null);
}

// ====================================================================
// 🎉 MODAL: Company creata con successo (mostra il codice)
// ====================================================================
function showCompanyCreatedModal(name, code, expiresAt) {
    var expiryStr = expiresAt
        ? 'Expires: ' + new Date(expiresAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})
        : 'Never expires';

    var body =
        '<div style="text-align:center;margin-bottom:1.25rem">' +
            '<div style="font-size:2rem;margin-bottom:0.5rem"></div>' +
            '<div style="font-size:1rem;font-weight:700;color:#0f172a">Company created!</div>' +
            '<div style="font-size:0.78rem;color:#64748b;margin-top:0.25rem">' + name + '</div>' +
        '</div>' +

        '<div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;padding:1.25rem;text-align:center;margin-bottom:1rem">' +
            '<div style="font-size:0.7rem;font-weight:700;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">Access Code</div>' +
            '<div id="co-code-display" style="font-family:monospace;font-size:1.5rem;font-weight:800;letter-spacing:0.12em;color:#0f172a;margin-bottom:0.5rem">' + code + '</div>' +
            '<div style="font-size:0.72rem;color:#94a3b8">' + expiryStr + '</div>' +
            '<button onclick="copyCompanyCode(\'' + code + '\')" class="btn btn-outline" style="margin-top:0.75rem;font-size:0.78rem">' +
                '📋 Copy Code' +
            '</button>' +
        '</div>' +

        '<div style="background:#fef3c7;border-radius:8px;padding:0.75rem;font-size:0.75rem;color:#78350f;line-height:1.5;margin-bottom:1rem">' +
            '<strong>Share this code with your colleagues.</strong> They will use it to join this private database. ' +
            'Store it safely — it cannot be recovered if lost, but you can generate a new one from the Company settings.' +
        '</div>' +

        '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:0.75rem;font-size:0.73rem;color:#7f1d1d;line-height:1.5">' +
            '⚠️ <strong>Reminder:</strong> Only share technical packaging data (WVTR, OTR, laminates). ' +
            'Never enter confidential business information, personal data, or trade secrets.' +
        '</div>';

    Modal.open(' Company Created', body, function() { return true; });
    var footer = document.getElementById('modal-footer');
    if (footer) footer.style.display = 'none';
}

function copyCompanyCode(code) {
    navigator.clipboard.writeText(code).then(function() {
        showCompanyToast('✅ Code copied to clipboard!', '#15803d');
    }).catch(function() {
        prompt('Copy this code:', code);
    });
}

// ====================================================================
// 🔑 MODAL: Gestione codice (solo admin)
// ====================================================================
async function showCompanyCodeManager() {
    if (!CompanyState.isActive() || !window.communityDB) return;
    try {
        var ref  = window.fbDoc(window.communityDB, 'companies', CompanyState.companyId);
        var snap = await window.fbGetDoc(ref);
        if (!snap.exists()) { alert('Company not found'); return; }
        var data     = snap.data();
        var code     = data.code || '—';
        var expStr   = data.expiresAt
            ? new Date(data.expiresAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
            : 'Never';

        var body =
            '<div style="margin-bottom:1rem">' +
                '<div style="font-size:0.72rem;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.4rem">Current Code</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:0.75rem">' +
                    '<span id="co-current-code" style="font-family:monospace;font-size:1.1rem;font-weight:700;letter-spacing:0.1em;flex:1">' + code + '</span>' +
                    '<button onclick="copyCompanyCode(\'' + code + '\')" class="btn btn-sm btn-outline">📋 Copy</button>' +
                '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.3rem">Expires: ' + expStr + '</div>' +
            '</div>' +
            '<div style="border-top:1px solid var(--border);padding-top:1rem">' +
                '<div style="font-size:0.82rem;font-weight:600;margin-bottom:0.5rem">Generate New Code</div>' +
                '<div class="form-group">' +
                    '<label>New Duration</label>' +
                    '<select id="co-regen-duration" class="form-input">' +
                        '<option value="30">30 days</option>' +
                        '<option value="180">180 days</option>' +
                        '<option value="0">Forever</option>' +
                    '</select>' +
                '</div>' +
                '<div style="background:#fee2e2;border-radius:6px;padding:0.5rem 0.7rem;font-size:0.72rem;color:#7f1d1d;margin-bottom:0.75rem">' +
                    '⚠️ Generating a new code will invalidate the old one immediately.' +
                '</div>' +
                '<button class="btn btn-warning btn-full" onclick="regenerateCompanyCode()" style="font-size:0.82rem">🔄 Generate New Code</button>' +
            '</div>';

        Modal.open('🔑 Manage Access Code', body, function() { return true; });
        var footer = document.getElementById('modal-footer');
        if (footer) footer.style.display = 'none';
    } catch(e) { alert('Error: ' + e.message); }
}

async function regenerateCompanyCode() {
    if (!CompanyState.isActive() || CompanyState.role !== 'admin') return;
    var duration = parseInt(document.getElementById('co-regen-duration')?.value || '0');
    if (!confirm('This will invalidate the current code. Continue?')) return;
    var gen = generateCompanyCode(duration || null);
    try {
        var ref = window.fbDoc(window.communityDB, 'companies', CompanyState.companyId);
        await window.fbUpdateDoc(ref, { code: gen.code, expiresAt: gen.expiresAt });
        CompanyState.expiresAt = gen.expiresAt;
        CompanyState.save();
        Modal.close();
        showCompanyCreatedModal(CompanyState.companyName, gen.code, gen.expiresAt);
    } catch(e) { alert('Error: ' + e.message); }
}

// ====================================================================
// 📦 TAB: Company DB (materiali + laminati)
// ====================================================================
var _companyMats  = [];
var _companyLams  = [];
var _companyLoaded = false;

async function showCompanyDB() {
    State.tab = 'company';
    renderNav();
    document.getElementById('app-content').innerHTML = renderCompanyDB();
    // Carica dati
    _companyLoaded = false;
    await refreshCompanyDB();
}

function renderCompanyDB() {
    if (!CompanyState.isActive()) {
        return '<div class="card"><div class="empty-state"><p>You are not in a company. <button class="btn btn-primary" onclick="showCompanyModal()">Join or Create</button></p></div></div>';
    }

    var daysLeft  = CompanyState.daysLeft();
    var expiryBadge = daysLeft === null
        ? '<span class="badge badge-green">∞ Forever</span>'
        : daysLeft > 30
            ? '<span class="badge badge-green">' + daysLeft + 'd left</span>'
            : daysLeft > 0
                ? '<span class="badge badge-yellow">' + daysLeft + 'd left</span>'
                : '<span class="badge badge-red">Expired</span>';

    return `
<div style="max-width:1100px;margin:0 auto">
    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem">
        <div>
            <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b">Private</div>
            <h2 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0.1rem 0"> ${CompanyState.companyName}</h2>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem">
                <span class="badge badge-blue">${CompanyState.role}</span>
                ${expiryBadge}
            </div>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="showCompanyModal()" style="font-size:0.8rem">⚙️ Settings</button>
            <button class="btn btn-primary" onclick="shareCurrentCalcToCompany()" style="font-size:0.8rem">+ Share Laminate</button>
        </div>
    </div>

    <!-- DISCLAIMER COMPATTO -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:0.6rem 0.85rem;margin-bottom:1.25rem;font-size:0.72rem;color:#78350f;display:flex;gap:0.5rem;align-items:center">
        <span style="flex-shrink:0">⚠️</span>
        <span>This space is for <strong>technical packaging data only</strong>. Do not enter confidential business information, personal data, or trade secrets.</span>
    </div>

    <!-- TABS MATERIALS / LAMINATES -->
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem" id="co-tab-btns">
        <button id="co-tab-mat" class="btn btn-primary" onclick="switchCompanyTab('materials')" style="font-size:0.82rem">📦 Materials</button>
        <button id="co-tab-lam" class="btn btn-outline" onclick="switchCompanyTab('laminates')" style="font-size:0.82rem">🧱 Laminates</button>
    </div>

    <!-- MATERIALS LIST -->
    <div id="co-materials-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
            <span id="co-mat-count" style="font-size:0.82rem;color:var(--text-light)">Loading...</span>
            <button class="btn btn-sm btn-outline" onclick="showShareMaterialToCompany()" style="font-size:0.78rem">+ Add Material</button>
        </div>
        <div id="co-mat-list" style="display:flex;flex-direction:column;gap:0.5rem">
            <div class="empty-state"><p>Loading company materials...</p></div>
        </div>
    </div>

    <!-- LAMINATES LIST -->
    <div id="co-laminates-panel" style="display:none">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
            <span id="co-lam-count" style="font-size:0.82rem;color:var(--text-light)">Loading...</span>
            <button class="btn btn-sm btn-outline" onclick="shareCurrentCalcToCompany()" style="font-size:0.78rem">+ Share Current</button>
        </div>
        <div id="co-lam-list" style="display:flex;flex-direction:column;gap:0.5rem">
            <div class="empty-state"><p>Loading company laminates...</p></div>
        </div>
    </div>
</div>`;
}

function switchCompanyTab(tab) {
    var matPanel = document.getElementById('co-materials-panel');
    var lamPanel = document.getElementById('co-laminates-panel');
    var matBtn   = document.getElementById('co-tab-mat');
    var lamBtn   = document.getElementById('co-tab-lam');
    if (!matPanel || !lamPanel) return;
    if (tab === 'materials') {
        matPanel.style.display = 'block'; lamPanel.style.display = 'none';
        if(matBtn){ matBtn.className='btn btn-primary'; } if(lamBtn){ lamBtn.className='btn btn-outline'; }
    } else {
        matPanel.style.display = 'none'; lamPanel.style.display = 'block';
        if(matBtn){ matBtn.className='btn btn-outline'; } if(lamBtn){ lamBtn.className='btn btn-primary'; }
    }
}

async function refreshCompanyDB() {
    _companyMats = await loadCompanyMaterials();
    _companyLams = await loadCompanyLaminates();
    _companyLoaded = true;
    renderCompanyMatList();
    renderCompanyLamList();
}

function renderCompanyMatList() {
    var listEl  = document.getElementById('co-mat-list');
    var countEl = document.getElementById('co-mat-count');
    if (!listEl) return;
    if (countEl) countEl.innerHTML = '<strong>' + _companyMats.length + '</strong> materials in company DB';
    if (_companyMats.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No materials shared yet.<br><button class="btn btn-sm btn-primary" onclick="showShareMaterialToCompany()">+ Add first material</button></p></div>';
        return;
    }
    listEl.innerHTML = _companyMats.map(function(m) {
        var unit = State.mode === 'wvtr' ? 'g/m²·day' : 'cc/m²·day';
        var vals = State.mode === 'wvtr' ? (m.wvtrValues||[]) : (m.otrValues||[]);
        var firstVal = vals[0] ? vals[0].value + ' ' + unit : '—';
        return '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:0.85rem 1rem;display:flex;align-items:center;gap:0.75rem">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#2563eb;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.85rem;font-weight:600;color:#0f172a">' + m.name + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.15rem">' +
                    (m.family||'') + (m.company ? ' · ' + m.company : '') + ' · ' + firstVal +
                '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline" onclick="useCompanyMaterial(\'' + String(m.id) + '\')" style="font-size:0.72rem">Use in Calc</button>' +
            (CompanyState.role === 'admin' || m.sharedBy === window.getOrCreateUserId()
                ? '<button class="btn btn-sm btn-danger" onclick="removeCompanyMaterial(\'' + m._companyDocId + '\')" style="font-size:0.72rem">🗑️</button>'
                : '') +
        '</div>';
    }).join('');
}

function renderCompanyLamList() {
    var listEl  = document.getElementById('co-lam-list');
    var countEl = document.getElementById('co-lam-count');
    if (!listEl) return;
    if (countEl) countEl.innerHTML = '<strong>' + _companyLams.length + '</strong> laminates in company DB';
    if (_companyLams.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No laminates shared yet.<br><button class="btn btn-sm btn-primary" onclick="shareCurrentCalcToCompany()">+ Share current calculation</button></p></div>';
        return;
    }
    var unit = State.mode === 'wvtr' ? 'g/m²·day' : 'cc/m²·day';
    listEl.innerHTML = _companyLams.map(function(l) {
        return '<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:0.85rem 1rem;display:flex;align-items:center;gap:0.75rem">' +
            '<div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;flex-shrink:0"></div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-size:0.85rem;font-weight:600;color:#0f172a">' + l.name + '</div>' +
                '<div style="font-size:0.72rem;color:#94a3b8;margin-top:0.15rem">' +
                    (l.total ? l.total.toFixed(4) + ' ' + unit : '') +
                    ' · ' + (l.totalThickness||0) + 'µm' +
                    ' · ' + (l.temperature||'?') + '°C/' + (l.humidity||'?') + '%' +
                '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline" onclick="loadCompanyLaminateInCalc(\'' + String(l.id) + '\')" style="font-size:0.72rem">Load in Calc</button>' +
            (CompanyState.role === 'admin' || l.sharedBy === window.getOrCreateUserId()
                ? '<button class="btn btn-sm btn-danger" onclick="removeCompanyLaminate(\'' + l._companyLamId + '\')" style="font-size:0.72rem">🗑️</button>'
                : '') +
        '</div>';
    }).join('');
}

// ====================================================================
// ➕ CONDIVIDI materiale nella company
// ====================================================================
function showShareMaterialToCompany() {
    var opts = '<option value="">Select material...</option>';
    DB.materials.forEach(function(m) {
        opts += '<option value="' + m.id + '">' + m.name + (m.company ? ' (' + m.company + ')' : '') + '</option>';
    });
    var body =
        '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:0.6rem;margin-bottom:1rem;font-size:0.72rem;color:#78350f">' +
            '⚠️ Only share technical data. No confidential business information.' +
        '</div>' +
        '<div class="form-group"><label>Select Material to Share</label>' +
            '<select class="form-input" id="co-share-mat-id">' + opts + '</select>' +
        '</div>';

    Modal.open('📦 Share Material with Company', body, function() {
        var id  = document.getElementById('co-share-mat-id')?.value;
        if (!id) { alert('Select a material'); return false; }
        var mat = DB.materials.find(function(m){ return String(m.id) === String(id); });
        if (!mat) { alert('Material not found'); return false; }
        saveCompanyMaterial(mat).then(function(res) {
            if (res.success) {
                mat._companyDocId = res.id;
                showCompanyToast('✅ <strong>' + mat.name + '</strong> shared with company!', '#15803d');
                refreshCompanyDB();
            } else { alert('Error: ' + res.error); }
        });
        return true;
    });
}

// ====================================================================
// ➕ CONDIVIDI laminato calcolato nella company
// ====================================================================
function shareCurrentCalcToCompany() {
    if (!State.calcResult || !State.calcResult.total || State.calcResult.total <= 0) {
        alert('Calculate a laminate first in the Calculator tab.');
        return;
    }
    var body =
        '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:0.6rem;margin-bottom:1rem;font-size:0.72rem;color:#78350f">' +
            '⚠️ Only share technical data. No confidential business information.' +
        '</div>' +
        '<div class="form-group"><label>Laminate Name</label>' +
            '<input type="text" id="co-lam-name" class="form-input" value="' + (State.laminateName||'') + '" placeholder="e.g. Coffee pouch structure">' +
        '</div>' +
        '<div style="background:#f8fafc;border-radius:6px;padding:0.6rem;font-size:0.75rem;color:var(--text-light)">' +
            State.mode.toUpperCase() + ': <strong>' + (State.calcResult.total.toFixed(6)) + '</strong> ' + getUnit() +
            ' · ' + State.layers.length + ' layers' +
        '</div>';

    Modal.open('🧱 Share Laminate with Company', body, function() {
        var name = document.getElementById('co-lam-name')?.value.trim();
        if (!name) { alert('Enter a name'); return false; }
        var tt = 0;
        State.layers.forEach(function(l){ tt += (l.thick||0); });
        var rec = Engine.checkRecyclability(State.layers, DB.materials);
        var lam = {
            name: name, total: State.calcResult.total, totalThickness: tt,
            humidity: State.selCond?.humidity || 0, temperature: State.selCond?.temperature || 0,
            mode: State.mode, recyclable: rec.recyclable, monoStructure: rec.monoStructure,
            layerCount: State.layers.length, layers: JSON.parse(JSON.stringify(State.layers))
        };
        saveCompanyLaminate(lam).then(function(res) {
            if (res.success) {
                showCompanyToast('✅ <strong>' + name + '</strong> shared with company!', '#15803d');
                if (State.tab === 'company') refreshCompanyDB();
            } else { alert('Error: ' + res.error); }
        });
        return true;
    });
}

// ====================================================================
// 🔄 USA materiale company nel Calculator
// ====================================================================
function useCompanyMaterial(matId) {
    var mat = _companyMats.find(function(m){ return String(m.id) === String(matId); });
    if (!mat) return;
    // Aggiunge al DB locale se non c'è già
    var existing = DB.materials.find(function(m){ return m._companyDocId === mat._companyDocId; });
    if (!existing) {
        var newMat = Object.assign({}, mat);
        newMat.id = 'co_' + mat._companyDocId;
        DB.materials.push(newMat);
    }
    State.tab = 'calc';
    renderNav();
    renderContent();
    showCompanyToast('✅ <strong>' + mat.name + '</strong> available in Calculator!', '#2563eb');
}

// ====================================================================
// 🔄 CARICA laminato company nel Calculator
// ====================================================================
function loadCompanyLaminateInCalc(lamId) {
    var lam = _companyLams.find(function(l){ return String(l.id) === String(lamId); });
    if (!lam) return;
    State.layers      = JSON.parse(JSON.stringify(lam.layers || [{mid:null,thick:0}]));
    State.laminateName = lam.name;
    State.selCond     = { temperature: lam.temperature, humidity: lam.humidity };
    State.calcResult  = { total: lam.total, layers: [], error: null };
    State.tab = 'calc';
    renderNav();
    renderContent();
    showCompanyToast('✅ Laminate <strong>' + lam.name + '</strong> loaded in Calculator!', '#8b5cf6');
}

// ====================================================================
// 🗑️ RIMUOVI materiale/laminato company
// ====================================================================
async function removeCompanyMaterial(docId) {
    if (!confirm('Remove this material from the company database?')) return;
    await deleteCompanyMaterial(docId);
    showCompanyToast('🗑️ Material removed', '#64748b');
    refreshCompanyDB();
}

async function removeCompanyLaminate(docId) {
    if (!confirm('Remove this laminate from the company database?')) return;
    await deleteCompanyLaminate(docId);
    showCompanyToast('🗑️ Laminate removed', '#64748b');
    refreshCompanyDB();
}

// ====================================================================
// 🚪 LASCIA company
// ====================================================================
function leaveCompany() {
    if (!confirm('Leave ' + CompanyState.companyName + '? Your local data is not affected.')) return;
    CompanyState.clear();
    Modal.close();
    showCompanyToast('👋 You have left the company database.', '#64748b');
    setTimeout(function(){ render(); }, 400);
}

// ====================================================================
// 🔔 TOAST
// ====================================================================
function showCompanyToast(html, bg) {
    var old = document.getElementById('co-toast'); if(old) old.remove();
    var t   = document.createElement('div');
    t.id    = 'co-toast';
    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:' + bg + ';color:#fff;padding:0.75rem 1.25rem;border-radius:10px;font-size:0.82rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.25);animation:fadeIn 0.2s ease';
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(function(){ if(t.parentNode) t.remove(); }, 4000);
}

// ====================================================================
// 🚀 INIT — carica stato company all'avvio
// ====================================================================
CompanyState.load();
