// ====================================================================
// render_patch.js  —  renderContent() extension for new tabs
// Load AFTER render.js and all feature JS files in index.html.
//
// Intercepts the renderContent() call and routes new tab IDs to
// their dedicated render functions, falling through to the original
// renderContent for existing tabs.
//
// Required load order in index.html:
//   <script src="engine.js"></script>
//   <script src="materials.js"></script>
//   <script src="render.js"></script>       ← defines original renderContent
//   <script src="charts.js"></script>
//   <script src="shelflife.js"></script>
//   <script src="company.js"></script>
//   <script src="carbonfp.js"></script>     ← new
//   <script src="headspace.js"></script>    ← new
//   <script src="pharma_mvtr.js"></script>  ← new
//   <script src="pharma_uptake.js"></script>← new
//   <script src="nav.js"></script>          ← new (must be last)
//   <script src="render_patch.js"></script> ← this file (must be last)
// ====================================================================

(function () {
  // Store reference to the original renderContent defined in render.js
  var _originalRenderContent = window.renderContent;

  // New tab → render function mapping
  var NEW_TAB_RENDERERS = {
    'carbonfp':      function () { if (typeof renderCarbonFootprint  === 'function') renderCarbonFootprint();  },
    'headspace':     function () { if (typeof renderHeadspace         === 'function') renderHeadspace();         },
    'pharma-mvtr':   function () { if (typeof renderPharmaMVTR        === 'function') renderPharmaMVTR();        },
    'pharma-uptake': function () { if (typeof renderPharmaUptake      === 'function') renderPharmaUptake();      }
  };

  window.renderContent = function () {
    var tab = (typeof State !== 'undefined') ? State.tab : '';

    if (NEW_TAB_RENDERERS[tab]) {
      NEW_TAB_RENDERERS[tab]();
    } else {
      // Fall through to original handler for: home, calc, sensitivity,
      // arrhenius, shelflife, materials, laminates, mat-company, lam-company
      if (typeof _originalRenderContent === 'function') {
        _originalRenderContent();
      }
    }
  };
})();
