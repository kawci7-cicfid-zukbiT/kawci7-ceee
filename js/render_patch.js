// ====================================================================
// render_patch.js  v9
// All 4 new renderers write directly to #app-content (void pattern)
// Load LAST in index.html, after all feature files and nav.js
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
          // renderHeadspace() returns a string
          var c = document.getElementById('app-content');
          if (c && typeof window.renderHeadspace === 'function')
            c.innerHTML = window.renderHeadspace();
        }
        break;

      // ── Biomedical Analysis ──────────────────────────────────────
      case 'pharma-mvtr':
        if (typeof window.renderPharmaMVTR === 'function')
          window.renderPharmaMVTR();
        break;

      case 'pharma-uptake':
        if (typeof window.renderPharmaUptake === 'function')
          window.renderPharmaUptake();
        break;

      // ── All existing tabs ────────────────────────────────────────
      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

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
