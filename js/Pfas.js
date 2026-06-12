// ====================================================================
// PFAS.JS — PFAS verification status (admin-assigned badge)
// Load order: AFTER engine.js, BEFORE materials.js and ppwr_label.js
//
// Data model (on the material object, synced from Firestore):
//   mat.pfas = {
//     status:     'verified_free',          // only valid value for the badge
//     verifiedBy: 'admin',                  // who checked the documents
//     verifiedAt: '2026-06-12',             // ISO date of verification
//     expiresAt:  '2027-06-12',             // declaration validity end
//     docRef:     'PFAS-decl-supplier.pdf'  // internal reference
//   }
//
// SECURITY: the badge is trustworthy ONLY because Firestore Security
// Rules prevent anyone except the admin UID from writing the `pfas`
// field. Client-side code is informational — never the enforcement.
// ====================================================================

// Name patterns that suggest fluoropolymers / possible PFAS
var PFAS_NAME_RE = /PVDF|PTFE|FEP|\bPFA\b|FLUORO|PERFLUOR/i;

// ------------------------------------------------------------------
// Core status resolver — cross-analysis of name heuristic + admin badge
// Returns:
//   verified  true  → admin-verified PFAS-free, declaration still valid
//   expired   true  → was verified but the declaration has expired
//   flagged   true  → material NAME suggests a fluoropolymer
//   conflict  true  → flagged AND verified at the same time → re-check!
//   meta            → the raw pfas object (dates, docRef) or null
// ------------------------------------------------------------------
function getPfasStatus(mat) {
    var p = (mat && mat.pfas) ? mat.pfas : null;
    var flagged = PFAS_NAME_RE.test((mat && mat.name) || '');
    var verified = false, expired = false, meta = null;

    if (p && p.status === 'verified_free') {
        meta = p;
        if (p.expiresAt) {
            var exp = new Date(p.expiresAt);
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
        meta:     meta
    };
}

// ------------------------------------------------------------------
// Badge HTML for the material card (returns '' when nothing to show)
// ------------------------------------------------------------------
function pfasBadgeHTML(mat) {
    var st = getPfasStatus(mat);
    if (st.conflict) {
        return '<span class="badge" title="Name suggests a fluoropolymer but a PFAS-free badge is set — re-check the documentation" ' +
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
// Admin helper — call from the browser console while logged in as
// admin to set the badge (Firestore rules must allow YOUR uid only).
// Usage: setPfasVerified('fb_DOC_ID', '2027-06-12', 'PFAS-decl-xyz.pdf')
// ------------------------------------------------------------------
async function setPfasVerified(firebaseDocId, expiresAt, docRef) {
    if (!window.communityDB || !window.fbDoc || !window.fbUpdateDoc) {
        alert('Firestore not connected.'); return;
    }
    try {
        var ref = window.fbDoc(window.communityDB, 'materials', firebaseDocId);
        await window.fbUpdateDoc(ref, {
            pfas: {
                status: 'verified_free',
                verifiedBy: 'admin',
                verifiedAt: new Date().toISOString().slice(0,10),
                expiresAt: expiresAt || null,
                docRef: docRef || null
            }
        });
        console.log('PFAS badge set on', firebaseDocId);
    } catch (e) {
        // Firestore rules will reject non-admin writes here — by design
        alert('Write rejected (admin only): ' + e.message);
    }
}

async function clearPfasBadge(firebaseDocId) {
    if (!window.communityDB || !window.fbDoc || !window.fbUpdateDoc) return;
    try {
        var ref = window.fbDoc(window.communityDB, 'materials', firebaseDocId);
        await window.fbUpdateDoc(ref, { pfas: null });
        console.log('PFAS badge cleared on', firebaseDocId);
    } catch (e) { alert('Write rejected (admin only): ' + e.message); }
}
