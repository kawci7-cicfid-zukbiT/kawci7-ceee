// ====================================================================
// render_patch.js  v7  —  Clean router
// Handles both patterns:
//   - renderCarbonFootprint()  → writes directly to #app-content (void)
//   - renderHeadspace()        → returns HTML string
//   - renderPharmaMVTR()       → returns HTML string
//   - renderPharmaUptake()     → returns HTML string
// Load LAST in index.html, after all feature files and nav.js
// ====================================================================
(function () {

  var _orig = window.renderContent;

  window.renderContent = function () {
    var c   = document.getElementById('app-content');
    var tab = (typeof State !== 'undefined') ? State.tab : '';

    switch (tab) {

      // ── Food Analysis ────────────────────────────────────────────
      case 'carbonfp':
        // renderCarbonFootprint() writes directly to #app-content
        if (typeof window.renderCarbonFootprint === 'function') {
          window.renderCarbonFootprint();
        }
        break;

      case 'headspace':
        // renderHeadspace() returns an HTML string
        if (c && typeof window.renderHeadspace === 'function') {
          c.innerHTML = window.renderHeadspace();
        }
        break;

      // ── Biomedical Analysis ──────────────────────────────────────
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

      // ── All existing tabs → original handler ─────────────────────
      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

})();
