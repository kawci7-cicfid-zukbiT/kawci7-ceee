// ====================================================================
// render_patch.js  v5 — FIXED ROUTER for headspace/carbonfp
// MODIFICA CRITICA: Forza uso di window.renderHeadspace se disponibile
// ====================================================================
(function () {

  console.log('🔄 render_patch.js loaded');

  var _orig = window.renderContent;

  // ──────────────────────────────────────────────────────────────────
  // HEADSPACE — FIXED: Explicit window. checks + debug logging
  // ──────────────────────────────────────────────────────────────────
  function _renderHeadspaceLegacy() {
    console.log('⚠️ Using LEGACY headspace renderer (fallback)');
    var c = document.getElementById('app-content'); if (!c) return;
    
    // Minimal legacy render - just to show something
    c.innerHTML = '<div class="card"><h2>Headspace O₂ Calculator</h2><p>Loading...</p></div>';
    
    // Try to call new renderer anyway as last resort
    if (typeof window.renderHeadspace === 'function') {
      setTimeout(function() {
        console.log('🔄 Last resort: calling window.renderHeadspace()');
        window.renderHeadspace();
      }, 50);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PHARMA MVTR (unchanged)
  // ──────────────────────────────────────────────────────────────────
  function _renderPharmaMVTR() {
    var c = document.getElementById('app-content'); if (!c) return;
    c.innerHTML = '<div class="card"><h2>MVTR at ICH Conditions</h2><p>Coming soon...</p></div>';
  }

  // ──────────────────────────────────────────────────────────────────
  // PHARMA UPTAKE (unchanged)
  // ──────────────────────────────────────────────────────────────────
  function _renderPharmaUptake() {
    var c = document.getElementById('app-content'); if (!c) return;
    c.innerHTML = '<div class="card"><h2>Drug Moisture Uptake</h2><p>Coming soon...</p></div>';
  }

  // ──────────────────────────────────────────────────────────────────
  // ROUTER — FIXED with explicit window. checks
  // ──────────────────────────────────────────────────────────────────
  var ROUTES = {
    'carbonfp': function () {
      console.log('🎯 Route: carbonfp');
      if (typeof window.renderCarbonFootprint === 'function') {
        window.renderCarbonFootprint();
      } else if (typeof _orig === 'function') {
        _orig();
      }
    },
    
    'headspace': function () {
      console.log('🎯 Route: headspace');
      console.log('  window.renderHeadspace:', typeof window.renderHeadspace);
      console.log('  window.HS:', typeof window.HS);
      
      // ✅ CRITICAL: Use window. prefix for global scope
      if (typeof window.renderHeadspace === 'function' && typeof window.HS === 'object') {
        console.log('✅ Calling NEW shelflife-style renderer');
        try {
          window.renderHeadspace();
        } catch(e) {
          console.error('❌ Error in new renderer:', e);
          _renderHeadspaceLegacy();
        }
      } else {
        console.log('⚠️ Falling back to LEGACY renderer');
        _renderHeadspaceLegacy();
      }
    },
    
    'pharma-mvtr': function () {
      console.log('🎯 Route: pharma-mvtr');
      if (typeof window.renderPharmaMVTR === 'function') {
        window.renderPharmaMVTR();
      } else {
        _renderPharmaMVTR();
      }
    },
    
    'pharma-uptake': function () {
      console.log('🎯 Route: pharma-uptake');
      if (typeof window.renderPharmaUptake === 'function') {
        window.renderPharmaUptake();
      } else {
        _renderPharmaUptake();
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // OVERRIDE renderContent
  // ──────────────────────────────────────────────────────────────────
  window.renderContent = function () {
    var tab = (typeof State !== 'undefined') ? State.tab : '';
    console.log('🔄 renderContent() called | State.tab =', tab);
    
    if (ROUTES[tab]) {
      ROUTES[tab]();
    } else {
      console.warn('⚠️ No route for tab:', tab);
      if (typeof _orig === 'function') _orig();
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // DEBUG: Auto-fix if headspace tab is active but wrong content shown
  // ──────────────────────────────────────────────────────────────────
  setTimeout(function() {
    if (typeof State !== 'undefined' && State.tab === 'headspace') {
      var content = document.getElementById('app-content');
      if (content) {
        // Check if content looks like carbonfp (wrong)
        var isWrong = content.querySelector('#cfp-kpi-m2') || content.querySelector('Layer Breakdown');
        if (isWrong && typeof window.renderHeadspace === 'function') {
          console.log('🚨 Auto-fix: headspace tab showing wrong content — forcing re-render');
          window.renderHeadspace();
        }
      }
    }
  }, 500);

  console.log('✅ render_patch.js initialized');

})();
