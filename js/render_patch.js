// ====================================================================
// render_patch.js  v8
// ====================================================================
(function () {

  var _orig = window.renderContent;

  window.renderContent = function () {
    var c   = document.getElementById('app-content');
    var tab = (typeof State !== 'undefined') ? State.tab : '';

    switch (tab) {

      case 'carbonfp':
        if (typeof window.renderCarbonFootprint === 'function') {
          window.renderCarbonFootprint();
        }
        break;

      case 'headspace':
        // MAP/O₂ Evolution requires OTR mode — block if WVTR
        if ((typeof State !== 'undefined') && State.mode === 'wvtr') {
          if (c) c.innerHTML = _renderMapBlocked();
        } else {
          if (c && typeof window.renderHeadspace === 'function') {
            c.innerHTML = window.renderHeadspace();
          }
        }
        break;

      case 'pharma-mvtr':
        if (c && typeof window.renderPharmaMVTR === 'function') {
          c.innerHTML = window.renderPharmaMVTR();
        }
        break;

      case 'pharma-uptake':
        if (c && typeof window.renderPharmaUptake === 'function') {
          c.innerHTML = window.renderPharmaUptake();
        }
        break;

      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

  // ── Blocked page shown when mode is WVTR ──────────────────────────
  function _renderMapBlocked() {
    return '<div style="max-width:520px;margin:3rem auto;text-align:center;padding:0 1rem">' +

      // Icon
      '<div style="width:64px;height:64px;border-radius:50%;background:#fee2e2;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" ' +
      'style="width:30px;height:30px">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' +
      '</svg></div>' +

      // Title
      '<h2 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin:0 0 0.5rem">OTR mode required</h2>' +

      // Explanation
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.6;margin:0 0 1.5rem">' +
      '<strong>MAP / O₂ Evolution</strong> models how oxygen concentration changes ' +
      'inside a sealed package over time — it needs the film\'s <strong>OTR</strong> ' +
      '(Oxygen Transmission Rate) as input.<br><br>' +
      'You are currently in <strong>WVTR</strong> mode. ' +
      'Switch to <strong>OTR</strong> using the selector at the top of the page.</p>' +

      // Switch button
      '<button onclick="setMode(\'otr\')" ' +
      'style="background:#2563eb;color:#fff;border:none;border-radius:8px;' +
      'padding:0.65rem 1.5rem;font-size:0.88rem;font-weight:600;cursor:pointer">' +
      'Switch to OTR →</button>' +

      '</div>';
  }

})();
