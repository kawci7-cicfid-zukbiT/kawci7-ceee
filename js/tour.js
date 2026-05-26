// ====================================================================
// 🎯 TOUR.JS — Guided onboarding tour for WVTR/OTR Calculator
// Carica questo file DOPO tutti gli altri script in index.html:
//   <script src="js/tour.js"></script>
// ====================================================================

(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────────────────
  var CSS = `
    /* === TOUR OVERLAY === */
    #tour-overlay {
      position: fixed; inset: 0; z-index: 9000;
      pointer-events: none;
      transition: opacity .3s;
    }
    #tour-overlay.hidden { opacity: 0; }

    /* Spotlight: 4 dark rects around the highlighted element */
    .tour-curtain {
      position: fixed; background: rgba(0,0,0,0.55);
      transition: all .35s cubic-bezier(.4,0,.2,1);
      pointer-events: all;
    }
    #tour-curtain-top    { top:0; left:0; right:0; }
    #tour-curtain-bottom { bottom:0; left:0; right:0; }
    #tour-curtain-left   { }
    #tour-curtain-right  { }

    /* Highlight ring */
    #tour-highlight {
      position: fixed; border-radius: 6px; z-index: 9001;
      box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37,99,235,.25);
      pointer-events: none;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }

    /* Tooltip bubble */
    #tour-bubble {
      position: fixed; z-index: 9010;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 12px rgba(37,99,235,.12);
      width: 320px;
      padding: 0;
      overflow: hidden;
      transition: all .35s cubic-bezier(.4,0,.2,1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #tour-bubble-header {
      background: linear-gradient(135deg, #0f172a, #2563eb, #38bdf8);
      padding: .9rem 1.1rem .75rem;
      display: flex; align-items: center; justify-content: space-between;
    }
    #tour-bubble-step {
      font-size: .65rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: rgba(255,255,255,.65);
    }
    #tour-bubble-close {
      background: rgba(255,255,255,.15); border: none; cursor: pointer;
      color: #fff; font-size: .8rem; border-radius: 50%;
      width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
      line-height:1;
    }
    #tour-bubble-close:hover { background: rgba(255,255,255,.28); }

    #tour-bubble-icon {
      font-size: 1.6rem; margin: .1rem 0 .3rem;
    }
    #tour-bubble-title {
      font-size: .92rem; font-weight: 700; color: #fff; margin: 0;
      line-height: 1.25;
    }

    #tour-bubble-body {
      padding: 1rem 1.1rem .85rem;
    }
    #tour-bubble-text {
      font-size: .82rem; color: #475569; line-height: 1.55; margin: 0;
    }
    #tour-bubble-tip {
      margin-top: .65rem;
      background: #eff6ff; border-left: 3px solid #2563eb;
      border-radius: 0 6px 6px 0;
      padding: .45rem .65rem;
      font-size: .74rem; color: #1d4ed8; line-height: 1.45;
      display: none;
    }

    #tour-bubble-footer {
      padding: .75rem 1.1rem;
      border-top: 1px solid #f1f5f9;
      display: flex; align-items: center; justify-content: space-between; gap: .5rem;
    }
    #tour-progress-dots {
      display: flex; gap: .35rem; align-items: center;
    }
    .tour-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #e2e8f0; transition: background .25s, transform .25s;
    }
    .tour-dot.active { background: #2563eb; transform: scale(1.3); }
    .tour-dot.done   { background: #93c5fd; }

    #tour-bubble-actions { display: flex; gap: .45rem; }
    .tour-btn {
      border: none; border-radius: 7px; cursor: pointer;
      font-size: .78rem; font-weight: 600; padding: .4rem .85rem;
      transition: opacity .15s, transform .1s;
    }
    .tour-btn:active { transform: scale(.96); }
    .tour-btn-secondary {
      background: #f1f5f9; color: #475569;
    }
    .tour-btn-secondary:hover { background: #e2e8f0; }
    .tour-btn-primary {
      background: linear-gradient(135deg,#2563eb,#3b82f6);
      color: #fff;
      box-shadow: 0 2px 8px rgba(37,99,235,.35);
    }
    .tour-btn-primary:hover { opacity: .9; }

    /* Arrow */
    #tour-arrow {
      position: fixed; z-index: 9009;
      width: 0; height: 0;
      pointer-events: none;
      transition: all .35s cubic-bezier(.4,0,.2,1);
    }
    #tour-arrow.arrow-top {
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-bottom: 10px solid #fff;
    }
    #tour-arrow.arrow-bottom {
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 10px solid #fff;
    }
    #tour-arrow.arrow-left {
      border-top: 9px solid transparent;
      border-bottom: 9px solid transparent;
      border-right: 10px solid #fff;
    }
    #tour-arrow.arrow-right {
      border-top: 9px solid transparent;
      border-bottom: 9px solid transparent;
      border-left: 10px solid #fff;
    }

    /* Start button (bottom-right) */
    #tour-start-btn {
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 8999;
      background: linear-gradient(135deg,#0f172a,#2563eb);
      color: #fff; border: none; border-radius: 50px;
      padding: .65rem 1.2rem;
      font-size: .82rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: .5rem;
      box-shadow: 0 4px 20px rgba(37,99,235,.45);
      animation: tour-pulse 2.5s infinite;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #tour-start-btn:hover { opacity: .9; }
    #tour-start-btn.hidden { display: none; }

    @keyframes tour-pulse {
      0%,100% { box-shadow: 0 4px 20px rgba(37,99,235,.45); }
      50%      { box-shadow: 0 4px 28px rgba(37,99,235,.75); }
    }

    /* Completion card */
    #tour-done-card {
      position: fixed; inset: 0; z-index: 9020;
      background: rgba(0,0,0,.55); display: none;
      align-items: center; justify-content: center;
    }
    #tour-done-card.show { display: flex; }
    #tour-done-inner {
      background: #fff; border-radius: 18px;
      padding: 2.5rem 2rem; text-align: center; max-width: 340px;
      box-shadow: 0 30px 80px rgba(0,0,0,.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #tour-done-inner .done-emoji { font-size: 3rem; margin-bottom: .75rem; }
    #tour-done-inner h3 { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; }
    #tour-done-inner p  { font-size: .84rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.55; }
    #tour-done-inner button {
      background: linear-gradient(135deg,#2563eb,#3b82f6);
      color: #fff; border: none; border-radius: 8px;
      padding: .6rem 1.5rem; font-size: .85rem; font-weight: 700;
      cursor: pointer;
    }
  `;

  // ── Tour Steps ───────────────────────────────────────────────────────
  // selector: CSS selector of element to spotlight (null = center screen)
  // nav: optional function to call BEFORE showing this step (to navigate to right page)
  var STEPS = [
    {
      selector: '.mode-toggle',
      title: 'First step: choose the gas',
      icon: '',
      text: 'Start by choosing what you want to measure: <strong>WVTR</strong> (water vapor) or <strong>OTR</strong> (oxygen). This choice affects all calculations across the app.',
      tip: ' WVTR = moisture barrier · OTR = oxygen barrier',
      nav: function () { _goHome(); }
    },
    {
      selector: '#nav-tabs',
      title: 'Main navigation',
      icon: '',
      text: 'The top bar has <strong>4 sections</strong>: <em>Home</em>, <em>Analysis</em>, <em>Community Database</em> and <em>Company Database</em>. Click each one to explore its tools.',
      tip: ' Each section opens a sub-menu below with specific tools.',
      nav: function () { _goHome(); }
    },
    {
      selector: '#nav-subtabs',
      title: 'Sub-menu: Analysis tools',
      icon: '',
      text: 'When you click <strong>Analysis</strong>, a second row appears with 5 tools: Calculator, Sensitivity, Shelf Life, Arrhenius and Compare.',
      tip: ' Start from Calculator — it\'s the core of the app.',
      nav: function () { onGroupClick('analysis'); }
    },
    {
      selector: '.card',
      title: 'Calculator: build your laminate',
      icon: '',
      text: 'In <strong>Calculator</strong> you add one or more material layers, set their thickness, then click <em>Calculate</em>. The app computes the total WVTR/OTR of your laminate stack.',
      tip: ' Each layer needs a material from the database + a thickness in µm.',
      nav: function () { onSubTabClick('calc'); }
    },
    {
      selector: '.card',
      title: 'Sensitivity analysis',
      icon: '',
      text: '<strong>Sensitivity</strong> shows how the result changes as you vary thickness or conditions. Ideal for optimizing your laminate before going to the lab.',
      nav: function () { onSubTabClick('sensitivity'); }
    },
    {
      selector: '.card',
      title: 'Shelf Life',
      icon: '',
      text: 'Enter product weight, area, rate and storage conditions — the tool tells you the <strong>expected shelf life</strong> of your packaging.',
      nav: function () { onSubTabClick('shelflife'); }
    },
    {
      selector: '#nav-subtabs',
      title: 'Community Database',
      icon: '',
      text: 'The <strong>Community Database</strong> contains <em>Materials</em> and <em>Laminates</em> shared by all users. You can search, vote on reliability, and add your own data.',
      tip: ' The green dot on Company Database means your company data is active.',
      nav: function () { onGroupClick('community'); }
    },
    {
      selector: '#mat-search',
      title: 'Search & explore materials',
      icon: '',
      text: 'Use the search bar to find any material by name. You can filter by family, test method and more. Click a material to see its data points and use it in calculations.',
      nav: function () { onSubTabClick('materials'); }
    },
    {
      selector: '#nav-subtabs',
      title: 'Company Database',
      icon: '',
      text: 'In <strong>Company Database</strong> you can upload and manage <em>private</em> materials and laminates — only visible to your team, not shared with the community.',
      nav: function () { onGroupClick('company'); }
    },
    {
      selector: null,
      title: 'You\'re ready! ',
      icon: '',
      text: 'Now you know all the main sections. Start with <strong>Calculator</strong> → add materials → run an analysis. You can restart this tour anytime from the button at the bottom right.',
      nav: function () { _goHome(); }
    }
  ];

  // ── State ────────────────────────────────────────────────────────────
  var currentStep = 0;
  var isRunning   = false;

  // ── DOM refs (built lazily) ──────────────────────────────────────────
  var overlay, highlight, bubble, arrow;
  var curtainTop, curtainBottom, curtainLeft, curtainRight;
  var startBtn, doneCard;

  // ── Helpers ──────────────────────────────────────────────────────────
  function _goHome() {
    if (typeof onGroupClick === 'function') {
      try { onGroupClick('home'); } catch (e) { /* ignore */ }
    }
  }

  function _injectCSS() {
    if (document.getElementById('tour-css')) return;
    var s = document.createElement('style');
    s.id = 'tour-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _buildDOM() {
    if (document.getElementById('tour-overlay')) return;

    // Overlay + curtains
    overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.className = 'hidden';
    overlay.innerHTML =
      '<div id="tour-curtain-top"    class="tour-curtain"></div>' +
      '<div id="tour-curtain-bottom" class="tour-curtain"></div>' +
      '<div id="tour-curtain-left"   class="tour-curtain"></div>' +
      '<div id="tour-curtain-right"  class="tour-curtain"></div>';
    document.body.appendChild(overlay);

    curtainTop    = document.getElementById('tour-curtain-top');
    curtainBottom = document.getElementById('tour-curtain-bottom');
    curtainLeft   = document.getElementById('tour-curtain-left');
    curtainRight  = document.getElementById('tour-curtain-right');

    // Highlight ring
    highlight = document.createElement('div');
    highlight.id = 'tour-highlight';
    document.body.appendChild(highlight);

    // Arrow
    arrow = document.createElement('div');
    arrow.id = 'tour-arrow';
    document.body.appendChild(arrow);

    // Bubble
    bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    bubble.innerHTML =
      '<div id="tour-bubble-header">' +
        '<div>' +
          '<div id="tour-bubble-step"></div>' +
          '<div id="tour-bubble-icon"></div>' +
          '<p id="tour-bubble-title"></p>' +
        '</div>' +
        '<button id="tour-bubble-close" onclick="Tour.stop()">✕</button>' +
      '</div>' +
      '<div id="tour-bubble-body">' +
        '<p id="tour-bubble-text"></p>' +
        '<div id="tour-bubble-tip"></div>' +
      '</div>' +
      '<div id="tour-bubble-footer">' +
        '<div id="tour-progress-dots"></div>' +
        '<div id="tour-bubble-actions">' +
          '<button class="tour-btn tour-btn-secondary" id="tour-btn-back">← Back</button>' +
          '<button class="tour-btn tour-btn-primary"   id="tour-btn-next">Next →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bubble);

    document.getElementById('tour-btn-next').onclick = function () { Tour.next(); };
    document.getElementById('tour-btn-back').onclick = function () { Tour.prev(); };

    // Start button
    startBtn = document.createElement('button');
    startBtn.id = 'tour-start-btn';
    startBtn.innerHTML = '▶ Take the tour';
    startBtn.onclick = function () { Tour.start(); };
    document.body.appendChild(startBtn);

    // Done card
    doneCard = document.createElement('div');
    doneCard.id = 'tour-done-card';
    doneCard.innerHTML =
      '<div id="tour-done-inner">' +
        '<div class="done-emoji">🎓</div>' +
        '<h3>Tour complete!</h3>' +
        '<p>You\'ve seen all the main sections of the WVTR/OTR Calculator.<br>Time to run your first analysis!</p>' +
        '<button onclick="Tour.closeDone(); onGroupClick(\'analysis\');">Go to Calculator →</button>' +
      '</div>';
    document.body.appendChild(doneCard);
  }

  // Spotlight: position the 4 curtains around the target rect
  function _spotlight(rect, padding) {
    padding = padding || 6;
    var t = rect.top    - padding;
    var b = rect.bottom + padding;
    var l = rect.left   - padding;
    var r = rect.right  + padding;
    var W = window.innerWidth;
    var H = window.innerHeight;

    curtainTop.style.cssText    = 'top:0;left:0;right:0;height:' + Math.max(0,t) + 'px';
    curtainBottom.style.cssText = 'bottom:0;left:0;right:0;top:' + Math.min(H,b) + 'px';
    curtainLeft.style.cssText   = 'top:' + Math.max(0,t) + 'px;left:0;width:' + Math.max(0,l) + 'px;height:' + (Math.min(H,b)-Math.max(0,t)) + 'px';
    curtainRight.style.cssText  = 'top:' + Math.max(0,t) + 'px;left:' + Math.min(W,r) + 'px;right:0;height:' + (Math.min(H,b)-Math.max(0,t)) + 'px';

    highlight.style.cssText = 'top:' + t + 'px;left:' + l + 'px;width:' + (r-l) + 'px;height:' + (b-t) + 'px';
  }

  // Full-screen dark (no highlight)
  function _spotlightNone() {
    var W = window.innerWidth; var H = window.innerHeight;
    curtainTop.style.cssText    = 'top:0;left:0;right:0;height:' + H/2 + 'px';
    curtainBottom.style.cssText = 'bottom:0;left:0;right:0;top:' + H/2 + 'px';
    curtainLeft.style.cssText   = 'top:0;left:0;width:0;height:0';
    curtainRight.style.cssText  = 'top:0;left:0;width:0;height:0';
    highlight.style.cssText     = 'top:' + H/2 + 'px;left:' + W/2 + 'px;width:0;height:0';
  }

  // Position bubble + arrow relative to the target rect
  function _positionBubble(rect) {
    var bw = 320; var bh = 220; // approx bubble size
    var W  = window.innerWidth; var H = window.innerHeight;
    var pad = 14;

    // Clear arrow classes
    arrow.className = '';

    if (!rect) {
      // Center
      bubble.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
      arrow.style.cssText  = 'display:none';
      return;
    }

    var cx = (rect.left + rect.right) / 2;
    var placement, bTop, bLeft;

    // Try below
    if (rect.bottom + pad + bh < H) {
      placement = 'below';
      bTop  = rect.bottom + pad;
      bLeft = Math.min(Math.max(cx - bw/2, 8), W - bw - 8);
    }
    // Try above
    else if (rect.top - pad - bh > 0) {
      placement = 'above';
      bTop  = rect.top - pad - bh;
      bLeft = Math.min(Math.max(cx - bw/2, 8), W - bw - 8);
    }
    // Try right
    else if (rect.right + pad + bw < W) {
      placement = 'right';
      bLeft = rect.right + pad;
      bTop  = Math.min(Math.max(rect.top, 8), H - bh - 8);
    }
    // Fallback left
    else {
      placement = 'left';
      bLeft = rect.left - pad - bw;
      bTop  = Math.min(Math.max(rect.top, 8), H - bh - 8);
    }

    bubble.style.cssText = 'top:' + bTop + 'px;left:' + bLeft + 'px;transform:none';

    // Arrow
    var ax, ay, ac;
    if (placement === 'below') {
      ac = 'arrow-top';
      ax = cx - 9;
      ay = rect.bottom + pad - 10;
    } else if (placement === 'above') {
      ac = 'arrow-bottom';
      ax = cx - 9;
      ay = rect.top - pad;
    } else if (placement === 'right') {
      ac = 'arrow-left';
      ax = rect.right + pad - 10;
      ay = rect.top + (rect.height/2) - 9;
    } else {
      ac = 'arrow-right';
      ax = rect.left - pad;
      ay = rect.top + (rect.height/2) - 9;
    }
    arrow.className = ac;
    arrow.style.cssText = 'left:' + ax + 'px;top:' + ay + 'px;display:block';
  }

  // Render step content
  function _renderStep(idx) {
    var step  = STEPS[idx];
    var total = STEPS.length;

    document.getElementById('tour-bubble-step').textContent  = 'Step ' + (idx+1) + ' of ' + total;
    document.getElementById('tour-bubble-icon').textContent  = step.icon || '📌';
    document.getElementById('tour-bubble-title').innerHTML   = step.title;
    document.getElementById('tour-bubble-text').innerHTML    = step.text;

    var tipEl = document.getElementById('tour-bubble-tip');
    if (step.tip) {
      tipEl.innerHTML     = step.tip;
      tipEl.style.display = 'block';
    } else {
      tipEl.style.display = 'none';
    }

    // Progress dots
    var dots = '';
    for (var i = 0; i < total; i++) {
      var cls = i < idx ? 'done' : (i === idx ? 'active' : '');
      dots += '<div class="tour-dot ' + cls + '"></div>';
    }
    document.getElementById('tour-progress-dots').innerHTML = dots;

    // Buttons
    var backBtn = document.getElementById('tour-btn-back');
    var nextBtn = document.getElementById('tour-btn-next');
    backBtn.style.display = idx === 0 ? 'none' : 'block';
    nextBtn.textContent   = idx === total - 1 ? 'Finish ✓' : 'Next →';
  }

  // Polls until `selector` appears in DOM (or timeout), then calls back
  function _waitForElement(selector, timeout, cb) {
    if (!selector) { cb(null); return; }
    var elapsed = 0;
    var interval = 80;
    var timer = setInterval(function () {
      var el = document.querySelector(selector);
      // Element must exist AND have a non-zero bounding box
      if (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          clearInterval(timer);
          cb(el);
          return;
        }
      }
      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        cb(null); // give up, show bubble centered
      }
    }, interval);
  }

  // Show a step
  function _showStep(idx) {
    var step = STEPS[idx];

    // Render bubble content immediately so user sees something
    _renderStep(idx);

    // Trigger navigation first
    if (typeof step.nav === 'function') {
      try { step.nav(); } catch (e) { /* ignore */ }
    }

    if (step.selector) {
      // Poll until the element is in the DOM and visible (up to 2 s)
      _waitForElement(step.selector, 2000, function (el) {
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          // One extra tick to let scroll settle
          setTimeout(function () {
            var rect = el.getBoundingClientRect();
            _spotlight(rect, 6);
            _positionBubble(rect);
          }, 80);
        } else {
          // Element not found: show bubble centered, no spotlight
          _spotlightNone();
          _positionBubble(null);
        }
      });
    } else {
      // Step has no target element (e.g. final step)
      setTimeout(function () {
        _spotlightNone();
        _positionBubble(null);
      }, 400);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.Tour = {
    start: function () {
      _injectCSS();
      _buildDOM();

      isRunning   = true;
      currentStep = 0;

      overlay.classList.remove('hidden');
      bubble.style.display  = 'block';
      startBtn.classList.add('hidden');

      _showStep(0);
    },

    next: function () {
      if (!isRunning) return;
      if (currentStep >= STEPS.length - 1) {
        Tour.stop();
        doneCard.classList.add('show');
        return;
      }
      currentStep++;
      _showStep(currentStep);
    },

    prev: function () {
      if (!isRunning || currentStep === 0) return;
      currentStep--;
      _showStep(currentStep);
    },

    stop: function () {
      isRunning = false;
      if (overlay)  overlay.classList.add('hidden');
      if (bubble)   bubble.style.display  = 'none';
      if (arrow)    arrow.style.cssText   = 'display:none';
      if (startBtn) startBtn.classList.remove('hidden');
      localStorage.setItem('wvtr_tour_seen', '1');
    },

    closeDone: function () {
      if (doneCard) doneCard.classList.remove('show');
    }
  };

  // ── Auto-show on first visit ─────────────────────────────────────────
  function _autoStart() {
    _injectCSS();
    _buildDOM();

    var seen = localStorage.getItem('wvtr_tour_seen');
    if (!seen) {
      // Small delay so the app can finish rendering
      setTimeout(function () { Tour.start(); }, 1800);
    }
  }

  // Wait for the app to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(_autoStart, 500);
    });
  } else {
    setTimeout(_autoStart, 500);
  }

})();
