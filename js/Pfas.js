// ====================================================================
// PFAS.JS — PFAS-free verification (static list, admin-maintained)
// Same model as VERIFIED_MATERIALS: a map keyed by EXACT material name.
// Only the site admin can edit this file on the server, which is what
// makes the badge trustworthy.
//
// Load order in index.html: AFTER engine.js, BEFORE materials.js
// and ppwr_label.js.
//
// HOW TO ADD A BADGE:
// 1. Receive and check the supplier documentation (signed PFAS
//    declaration for the specific grade, food-contact DoC, TOF report
//    if available).
// 2. Save the PDF in your records.
// 3. Add ONE entry below, keyed by the material name EXACTLY as it
//    appears in the database (same rule as VERIFIED_MATERIALS).
// 4. Upload this file to the server. Done.
// ====================================================================

window.PFAS_VERIFIED = {

   window.PFAS_VERIFIED = {
    'PET (Standard BOPET, uncoated) — multi-temp / Arrhenius': {
        by:         'Admin',
        verifiedAt: '2026-06-12',
        expiresAt:  '2027-06-12',
        docRef:     'PFAS-decl-SupplierX-HD200.pdf'
    },

};

// Name patterns that suggest fluoropolymers / possible PFAS
var PFAS_NAME_RE = /PVDF|PTFE|FEP|\bPFA\b|FLUORO|PERFLUOR/i;

// ------------------------------------------------------------------
// Core status resolver — cross-analysis of name heuristic + admin list
// Returns:
//   verified  true  → in PFAS_VERIFIED and the declaration is still valid
//   expired   true  → in PFAS_VERIFIED but the declaration has expired
//   flagged   true  → material NAME suggests a fluoropolymer
//   conflict  true  → flagged AND in the verified list → re-check!
//   meta            → the entry (dates, docRef) or null
// ------------------------------------------------------------------
function getPfasStatus(mat) {
    var name = (mat && mat.name) ? mat.name : '';
    var entry = (window.PFAS_VERIFIED && window.PFAS_VERIFIED[name]) || null;
    var flagged = PFAS_NAME_RE.test(name);
    var verified = false, expired = false;

    if (entry) {
        if (entry.expiresAt) {
            var exp = new Date(entry.expiresAt);
            if (!isNaN(exp.getTime()) && exp < new Date()) expired = true;
            else verified = true;
        } else {
            verified = true; // no expiry set → treat as valid
        }
    }

    return {
        verified: verified,
        expired:  expired,
        flagged:  flagged,
        conflict: (verified || expired) && flagged,
        meta:     entry
    };
}

// ------------------------------------------------------------------
// Badge HTML for the material card (returns '' when nothing to show)
// ------------------------------------------------------------------
function pfasBadgeHTML(mat) {
    var st = getPfasStatus(mat);
    if (st.conflict) {
        return '<span class="badge" title="Name suggests a fluoropolymer but the material is in the PFAS-free list — re-check the documentation" ' +
            'style="font-size:0.65rem;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5">PFAS conflict</span> ';
    }
    if (st.verified) {
        var tip = 'PFAS-free verified by site admin against supplier documentation' +
                  (st.meta && st.meta.verifiedAt ? ' (' + st.meta.verifiedAt + ')' : '') +
                  (st.meta && st.meta.expiresAt  ? ' — valid until ' + st.meta.expiresAt : '');
        return '<span class="badge" title="' + tip.replace(/"/g,'&quot;') + '" ' +
            'style="font-size:0.65rem;background:#dcfce7;color:#166534;border:1px solid #86efac">PFAS-free \u2713</span> ';
    }
    if (st.expired) {
        return '<span class="badge" title="PFAS-free declaration expired — request an updated declaration from the supplier" ' +
            'style="font-size:0.65rem;background:#fef3c7;color:#92400e;border:1px solid #fcd34d">PFAS decl. expired</span> ';
    }
    return ''; // unverified, unflagged → no badge (avoid clutter)
}

// ------------------------------------------------------------------
// Admin utility — list declarations expiring within N days.
// Run pfasExpiryCheck(60) in the browser console to see what needs
// renewing with the suppliers.
// ------------------------------------------------------------------
function pfasExpiryCheck(withinDays) {
    var days = withinDays || 60;
    var now = new Date();
    var limit = new Date(now.getTime() + days * 86400000);
    var out = [];
    for (var name in window.PFAS_VERIFIED) {
        var e = window.PFAS_VERIFIED[name];
        if (!e.expiresAt) continue;
        var exp = new Date(e.expiresAt);
        if (isNaN(exp.getTime())) continue;
        if (exp < now)        out.push({ name:name, expiresAt:e.expiresAt, status:'EXPIRED',  docRef:e.docRef||'' });
        else if (exp <= limit) out.push({ name:name, expiresAt:e.expiresAt, status:'EXPIRING', docRef:e.docRef||'' });
    }
    if (out.length) console.table(out);
    else console.log('No PFAS declarations expired or expiring within ' + days + ' days.');
    return out;
}
