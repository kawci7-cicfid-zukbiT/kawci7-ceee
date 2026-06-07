// ====================================================================
// render_patch.js  v13
// Load LAST in index.html, after all feature files and nav.js
//
// Changes from v12:
//   + pharma-mvtr bloccato in modalità OTR (richiede WVTR)
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

      // ── Biomedical Analysis ──────────────────────────────────────
      case 'pharma-mvtr':
        // Pharma MVTR funziona SOLO in modalità WVTR
        if ((typeof State !== 'undefined') && State.mode === 'otr') {
          var c = document.getElementById('app-content');
          if (c) c.innerHTML = _renderWvtrBlocked();
        } else {
          if (typeof window.renderPharmaMvtr === 'function')
            window.renderPharmaMvtr();
        }
        break;

      // ── Biomedical Analysis — Desiccant Sizing ───────────────────
      case 'pharma-uptake':
        // Desiccant sizing requires WVTR (moisture transmission rate)
        if ((typeof State !== 'undefined') && State.mode === 'otr') {
          var c = document.getElementById('app-content');
          if (c) c.innerHTML = _renderWvtrBlockedUptake();
        } else {
          if (typeof window.renderPharmaUptake === 'function')
            window.renderPharmaUptake();
        }
        break;
      // ── Regulatory — COMING SOON ─────────────────────────────────
      case 'ppwr-label':
        var c = document.getElementById('app-content');
        if (c) c.innerHTML = _renderComingSoon(tab);
        break;
// ── Photovoltaic ─────────────────────────────────── 
      case 'pv-lifetime':
        var c = document.getElementById('app-content');
        if (c) {
          // PV module simulates moisture ingress to the cells — WVTR mode required
          if ((typeof State !== 'undefined') && State.mode === 'otr') {
            c.innerHTML = _renderWvtrBlockedPV();
          } else if (typeof window.renderPVDegradation === 'function') {
            c.innerHTML = window.renderPVDegradation();
          } else {
            c.innerHTML = '<div class="alert alert-error" style="margin:2rem auto;max-width:480px">'
              + '<strong>pv-module.js not loaded.</strong></div>';
          }
        }
        break;
      // ── All existing tabs ────────────────────────────────────────
      default:
        if (typeof _orig === 'function') _orig();
        break;
    }
  };

  // ── Coming Soon page ─────────────────────────────────────────────
  var COMING_SOON_META = {
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

      '<div style="display:inline-flex;align-items:center;gap:0.4rem;' +
      'background:#fef3c7;color:#d97706;border:1px solid #fde68a;' +
      'border-radius:20px;padding:0.3rem 0.9rem;font-size:0.72rem;' +
      'font-weight:700;letter-spacing:0.06em;text-transform:uppercase;' +
      'margin-bottom:1.5rem"> Coming Soon</div>' +

      '<div style="font-size:3rem;margin-bottom:1rem;line-height:1">' + meta.icon + '</div>' +

      '<h2 style="font-size:1.25rem;font-weight:800;color:#0f172a;margin:0 0 0.75rem">' +
      meta.title + '</h2>' +

      '<p style="font-size:0.85rem;color:#64748b;line-height:1.65;margin:0 0 2rem">' +
      meta.desc + '</p>' +

      '<div style="width:48px;height:3px;background:var(--primary);border-radius:2px;margin:0 auto 1.5rem"></div>' +

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

  // ── WVTR required page (Pharma MVTR blocked in OTR mode) ─────────
  function _renderWvtrBlocked() {
    return '<div style="max-width:520px;margin:3rem auto;text-align:center;padding:0 1rem">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:#dbeafe;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:30px;height:30px">' +
      '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' +
      '</svg></div>' +
      '<h2 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin:0 0 0.5rem">WVTR mode required</h2>' +
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.6;margin:0 0 1.5rem">' +
      '<strong>MVTR / ICH Q1A(R2) Compliance</strong> evaluates moisture vapor transmission ' +
      'through packaging films across climatic zones — it needs the film\'s <strong>WVTR</strong> as input.<br><br>' +
      'You are currently in <strong>OTR</strong> mode. ' +
      'Switch to <strong>WVTR</strong> using the selector at the top of the page.</p>' +
      '<button onclick="setMode(\'wvtr\')" ' +
      'style="background:#2563eb;color:#fff;border:none;border-radius:8px;' +
      'padding:0.65rem 1.5rem;font-size:0.88rem;font-weight:600;cursor:pointer">' +
      'Switch to WVTR →</button>' +
      '</div>';
  }

  // ── WVTR required page (Desiccant Sizing blocked in OTR mode) ─────
  function _renderWvtrBlockedUptake() {
    return '<div style="max-width:520px;margin:3rem auto;text-align:center;padding:0 1rem">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:#dbeafe;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="width:30px;height:30px">' +
      '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' +
      '</svg></div>' +
      '<h2 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin:0 0 0.5rem">WVTR mode required</h2>' +
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.6;margin:0 0 1.5rem">' +
      '<strong>Desiccant Sizing Calculator</strong> determines the desiccant mass needed to keep ' +
      'moisture inside a pharmaceutical container below a critical threshold over the shelf life — ' +
      'it needs the film\'s <strong>WVTR</strong> as input.<br><br>' +
      'You are currently in <strong>OTR</strong> mode. ' +
      'Switch to <strong>WVTR</strong> using the selector at the top of the page.</p>' +
      '<button onclick="setMode(\'wvtr\')" ' +
      'style="background:#2563eb;color:#fff;border:none;border-radius:8px;' +
      'padding:0.65rem 1.5rem;font-size:0.88rem;font-weight:600;cursor:pointer">' +
      'Switch to WVTR →</button>' +
      '</div>';
  }

  // ── WVTR required page (PV Module blocked in OTR mode) ───────────
  function _renderWvtrBlockedPV() {
    return '<div style="max-width:520px;margin:3rem auto;text-align:center;padding:0 1rem">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:#fef3c7;' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" style="width:30px;height:30px">' +
      '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>' +
      '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
      '<line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>' +
      '</svg></div>' +
      '<h2 style="font-size:1.15rem;font-weight:700;color:#0f172a;margin:0 0 0.5rem">WVTR mode required</h2>' +
      '<p style="font-size:0.85rem;color:#64748b;line-height:1.6;margin:0 0 1.5rem">' +
      '<strong>Photovoltaic Module Simulator</strong> predicts how much humidity reaches the cells ' +
      'through the encapsulation stack — it needs the front and back sheets\' <strong>WVTR</strong> ' +
      '(water vapour transmission rate) as input.<br><br>' +
      'You are currently in <strong>OTR</strong> mode. ' +
      'Switch to <strong>WVTR</strong> using the selector at the top of the page.</p>' +
      '<button onclick="setMode(\'wvtr\')" ' +
      'style="background:#d97706;color:#fff;border:none;border-radius:8px;' +
      'padding:0.65rem 1.5rem;font-size:0.88rem;font-weight:600;cursor:pointer">' +
      'Switch to WVTR →</button>' +
      '</div>';
  }

})();
