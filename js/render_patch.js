// ====================================================================
// render_patch.js  v11
// Load LAST in index.html, after all feature files and nav.js
//
// Changes from v10:
//   + 'ppwr-label' added to COMING_SOON_META and switch
//   Everything else is identical to v10.
// ====================================================================
(function () {

  var _orig = window.renderContent;

  window.renderContent = function () {
    var tab = (typeof State !== 'undefined') ? State.tab : '';

    switch (tab) {

      // ── Food Analysis ────────────────────────────────────────────
      case 'carbonfp':
        if (typeof window.renderCarbonFootprint === 'function')
          window.renderCarbonFootprint();
        break;

      case 'headspace':
        if ((typeof State !== 'undefined') && State.mode === 'wvtr') {
          var c = document.getElementById('app-content');
          if (c) c.innerHTML = _renderMapBlocked();
        } else {
          var c = document.getElementById('app-content');
          if (c && typeof window.renderHeadspace === 'function')
            c.innerHTML = window.renderHeadspace();
        }
        break;

      // ── Biomedical Analysis — COMING SOON ────────────────────────
      case 'pharma-mvtr':
      case 'pharma-uptake':
      // ── Regulatory — COMING SOON ─────────────────────────────────
      case 'ppwr-label':
        var c = document.getElementById('app-content');
        if (c) c.innerHTML = _renderComingSoon(tab);
        break;

      // ── All existing tabs ────────────────────────────────────────
      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

  // ── Coming Soon page ─────────────────────────────────────────────
  var COMING_SOON_META = {
    'pharma-mvtr': {
      icon:  '',
      title: 'MVTR at ICH Conditions',
      desc:  'Effective moisture vapor transmission rate across all ICH Q1A(R2) climatic zones, with Arrhenius correction and per-cavity ingress calculation.'
    },
    'pharma-uptake': {
      icon:  '',
      title: 'Drug Moisture Uptake',
      desc:  'Moisture content evolution inside a blister cavity over time, shelf life limited by critical moisture gain or first-order chemical degradation.'
    },
    'ppwr-label': {
      icon:  '',
      title: 'PPWR Label Generator',
      desc:  'Automatic material classification per Decision 97/129/EC and national labelling rules (FR, IT, DE, ES). Generates the labelling specification for each target market based on the laminate layer structure.'
    }
  };

  function _renderComingSoon(tab) {
    var meta = COMING_SOON_META[tab] || { icon: '', title: 'Coming Soon', desc: '' };
    return '<div style="max-width:480px;margin:4rem auto;text-align:center;padding:0 1rem">' +

      // Badge
      '<div style="display:inline-flex;align-items:center;gap:0.4rem;' +
      'background:#fef3c7;color:#d97706;border:1px solid #fde68a;' +
      'border-radius:20px;padding:0.3rem 0.9rem;font-size:0.72rem;' +
      'font-weight:700;letter-spacing:0.06em;text-transform:uppercase;' +
      'margin-bottom:1.5rem"> Coming Soon</div>' +

      // Icon
      '<div style="font-size:3rem;margin-bottom:1rem;line-height:1">' + meta.icon + '</div>' +

      // Title
      '<h2 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem">' +
      meta.title + '</h2>' +

      // Description
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.65;margin:0 0 2rem">' +
      meta.desc + '</p>' +

      // Divider
      '<div style="width:48px;height:3px;background:var(--primary);border-radius:2px;margin:0 auto 1.5rem"></div>' +

      // Note
      '<p style="font-size:0.75rem;color:#94a3b8;line-height:1.5">' +
      'This analysis module is under development.<br>' +
      'It will be available in an upcoming release.</p>' +

      '</div>';
  }

  // ── OTR required page (MAP blocked in WVTR mode) ─────────────────
  function _renderMapBlocked() {
    return '<div style="max-width:520px;margin:3rem auto;text-align:center;padding:0 1rem">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:#fee2e2;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="width:30px;height:30px">' +
      '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' +
      '</svg></div>' +
      '<h2 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin:0 0 0.5rem">OTR mode required</h2>' +
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.6;margin:0 0 1.5rem">' +
      '<strong>MAP / O₂ Evolution</strong> models how oxygen concentration changes ' +
      'inside a sealed package over time — it needs the film\'s <strong>OTR</strong> as input.<br><br>' +
      'You are currently in <strong>WVTR</strong> mode. ' +
      'Switch to <strong>OTR</strong> using the selector at the top of the page.</p>' +
      '<button onclick="setMode(\'otr\')" ' +
      'style="background:#2563eb;color:#fff;border:none;border-radius:8px;' +
      'padding:0.65rem 1.5rem;font-size:0.88rem;font-weight:600;cursor:pointer">' +
      'Switch to OTR →</button>' +
      '</div>';
  }

})();
