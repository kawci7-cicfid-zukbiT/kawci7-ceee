// ====================================================================
// render_patch.js  v6  —  Clean router, no legacy fallbacks
// Load LAST in index.html, after all feature files and nav.js
// ====================================================================
(function () {

  var _orig = window.renderContent;

  window.renderContent = function () {
    var c   = document.getElementById('app-content');
    var tab = (typeof State !== 'undefined') ? State.tab : '';

    switch (tab) {

      // ── Food Analysis ──────────────────────────────────────────
      case 'carbonfp':
        if (c && typeof renderCarbonFootprintPage === 'function') {
          c.innerHTML = renderCarbonFootprintPage();
        }
        break;

      case 'headspace':
        if (c && typeof renderHeadspace === 'function') {
          c.innerHTML = renderHeadspace();
        }
        break;

      // ── Biomedical Analysis ────────────────────────────────────
      case 'pharma-mvtr':
        if (c && typeof renderPharmaMVTR === 'function') {
          c.innerHTML = renderPharmaMVTR();
        }
        break;

      case 'pharma-uptake':
        if (c && typeof renderPharmaUptake === 'function') {
          c.innerHTML = renderPharmaUptake();
        }
        break;

      // ── All existing tabs → original handler ───────────────────
      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

})();
