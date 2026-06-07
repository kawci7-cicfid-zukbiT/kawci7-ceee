// ====================================================================
// 🎯 TOUR.JS v2 — Guided onboarding tour for WVTR/OTR Calculator
// Focus: Calculator workflow (dettagliato), altri strumenti (accennati)
// Aggiungere in index.html DOPO tutti gli altri script:
//   <script src="js/tour.js"></script>
// ====================================================================

(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────────────────
  var CSS = `
    #tour-overlay {
      position: fixed; inset: 0; z-index: 9000;
      pointer-events: none;
    }
    #tour-overlay.hidden { display: none; }

    .tour-curtain {
      position: fixed; background: rgba(0,0,0,0.52);
      pointer-events: none;
    }
    #tour-curtain-top    { top:0; left:0; right:0; }
    #tour-curtain-bottom { bottom:0; left:0; right:0; }
    #tour-curtain-left   { }
    #tour-curtain-right  { }

    #tour-highlight {
      position: fixed; border-radius: 6px; z-index: 9001;
      box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37,99,235,.25);
      pointer-events: none;
      transition: top .3s, left .3s, width .3s, height .3s;
    }

    #tour-bubble {
      position: fixed; z-index: 9010;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 12px rgba(37,99,235,.12);
      width: 360px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #tour-bubble.hidden { display: none; }

    #tour-bubble-header {
      background: linear-gradient(135deg, #0f172a, #2563eb, #38bdf8);
      padding: .9rem 1.1rem .75rem;
      display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem;
    }
    #tour-bubble-step {
      font-size: .65rem; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: rgba(255,255,255,.65); margin-bottom: .2rem;
    }
    #tour-bubble-close {
      background: rgba(255,255,255,.15); border: none; cursor: pointer;
      color: #fff; font-size: .8rem; border-radius: 50%;
      width: 24px; height: 24px; min-width: 24px;
      display: flex; align-items: center; justify-content: center;
      line-height: 1; flex-shrink: 0; margin-top: 2px;
    }
    #tour-bubble-close:hover { background: rgba(255,255,255,.3); }

    #tour-bubble-icon { font-size: 1.5rem; margin-bottom: .25rem; display: block; }
    #tour-bubble-title { font-size: .9rem; font-weight: 700; color: #fff; margin: 0; line-height: 1.25; }

    #tour-bubble-body { padding: 1rem 1.1rem .85rem; }
    #tour-bubble-text { font-size: .82rem; color: #475569; line-height: 1.55; margin: 0; }
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
      flex-wrap: nowrap; min-height: 56px;
    }
    #tour-progress-dots { display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; max-width: 160px; }
    .tour-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #e2e8f0; transition: background .25s, transform .25s;
    }
    .tour-dot.active { background: #2563eb; transform: scale(1.3); }
    .tour-dot.done   { background: #93c5fd; }

    #tour-bubble-actions { display: flex; gap: .45rem; flex-shrink: 0; }
    .tour-btn {
      border: none; border-radius: 7px; cursor: pointer;
      font-size: .78rem; font-weight: 600; padding: .4rem .85rem;
      transition: opacity .15s, transform .1s;
    }
    .tour-btn:active { transform: scale(.96); }
    .tour-btn-secondary { background: #f1f5f9; color: #475569; }
    .tour-btn-secondary:hover { background: #e2e8f0; }
    .tour-btn-primary {
      background: linear-gradient(135deg,#2563eb,#3b82f6);
      color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,.35);
    }
    .tour-btn-primary:hover { opacity: .9; }

    #tour-arrow {
      position: fixed; z-index: 9009; width: 0; height: 0; pointer-events: none;
      transition: top .3s, left .3s;
    }
    #tour-arrow.arrow-top    { border-left:9px solid transparent; border-right:9px solid transparent; border-bottom:10px solid #fff; }
    #tour-arrow.arrow-bottom { border-left:9px solid transparent; border-right:9px solid transparent; border-top:10px solid #fff; }
    #tour-arrow.arrow-left   { border-top:9px solid transparent; border-bottom:9px solid transparent; border-right:10px solid #fff; }
    #tour-arrow.arrow-right  { border-top:9px solid transparent; border-bottom:9px solid transparent; border-left:10px solid #fff; }
    #tour-arrow.hidden { display: none; }

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
      50%     { box-shadow: 0 4px 28px rgba(37,99,235,.75); }
    }

    #tour-done-card {
      position: fixed; inset: 0; z-index: 9020;
      background: rgba(0,0,0,.55);
      align-items: center; justify-content: center;
      display: none;
    }
    #tour-done-card.show { display: flex; }
    #tour-done-inner {
      background: #fff; border-radius: 18px;
      padding: 2.5rem 2rem; text-align: center; max-width: 340px;
      box-shadow: 0 30px 80px rgba(0,0,0,.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #tour-done-inner .done-emoji { font-size: 3rem; margin-bottom: .75rem; display: block; }
    #tour-done-inner h3 { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; }
    #tour-done-inner p  { font-size: .84rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.55; }
    #tour-done-inner button {
      background: linear-gradient(135deg,#2563eb,#3b82f6);
      color: #fff; border: none; border-radius: 8px;
      padding: .6rem 1.5rem; font-size: .85rem; font-weight: 700; cursor: pointer;
    }
  `;

  // ── Tour Steps ───────────────────────────────────────────────────────
  var STEPS = [

    // ── 0: Welcome + WVTR/OTR mode ────────────────────────────────────
    {
      nav: function () { _goHome(); },
      waitSelector: '#nav-tabs',
      spotSelector: '.mode-toggle',
      title: 'Welcome! Choose your gas',
      icon: '',
      text: 'First, select <strong>WVTR</strong> (water vapour) or <strong>OTR</strong> (oxygen) at the top. This determines which barrier property the app calculates, and filters every database and tool accordingly.',
      tip: '\uD83D\uDCA1 WVTR = moisture barrier \u00B7 OTR = oxygen barrier. You can switch at any time.'
    },

    // ── 1: Navigation overview ────────────────────────────────────────
    {
      nav: function () { _goHome(); },
      waitSelector: '#nav-tabs',
      spotSelector: '#nav-tabs',
      title: 'The main menu',
      icon: '',
      text: 'The top bar groups every tool into sections: <strong>Calculator</strong>, <strong>Food</strong>, <strong>Biomedical</strong>, <strong>Photovoltaic</strong>, and two databases. Click any section to reveal its sub-menu.',
      tip: '\uD83D\uDCA1 Each section opens a row of sub-tabs right below.'
    },

    // ── 2: Open Calculator ────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '#nav-subtabs',
      title: 'Open the Calculator',
    icon: '',
      text: 'Click <strong>Calculator \u2192 Laminate Calculator</strong>. This is the core tool: you model a multi-layer laminate and the app computes its total barrier performance.',
    },

    // ── 3: Materials Source ───────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '#filter-matsource',
      title: 'Step 1 \u2014 Choose the database',
     icon: '',
      text: 'Pick where to source materials from: the <strong>General Database</strong> (community-contributed data) or your private <strong>Company DB</strong> if your organisation is connected.',
      tip: '\uD83D\uDCA1 Most users start with the General Database.'
    },

    // ── 4: Test Method filter ─────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-testmethod',
      spotSelector: '#filter-testmethod',
      title: 'Step 2 \u2014 Filter by test method',
     icon: '',
      text: 'Select a <strong>test standard</strong> (e.g. ASTM F1249, ISO 15106). This filters the material list so only results tested with the same method appear \u2014 ensuring comparability.',
      tip: '\uD83D\uDCA1 Leave \u201CAll test methods\u201D if you want the full list.'
    },

    // ── 5: Select material ────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '.layer-card',
      title: 'Step 3 \u2014 Select a material',
   icon: '',
      text: 'In the <strong>Layer 1</strong> row, open the material dropdown and pick a film (e.g. PET, PE, EVOH). Each layer represents one physical film in your laminate stack.',
      tip: '\uD83D\uDCA1 The dropdown only shows materials compatible with the current filters and test conditions.'
    },

    // ── 6: Enter thickness ────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '.layer-card',
      title: 'Step 4 \u2014 Enter thickness (\u00B5m)',
     icon: '',
      text: 'Next to the material, type the <strong>thickness in micrometres</strong>. Barrier performance scales with thickness \u2014 this value is essential for the calculation.',
      tip: '\uD83D\uDCA1 Typical films range from 10 \u00B5m (thin coating) to 200 \u00B5m (rigid sheet).'
    },

    // ── 7: Add more layers ────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '.btn-full',
      title: 'Step 5 \u2014 Add more layers',
     icon: '',
      text: 'Click <strong>+ Add Layer</strong> to model a multi-layer laminate. Real packaging typically has 2\u20135 layers (e.g. PET / adhesive / EVOH / PE).',
    },

    // ── 8: Test conditions ────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '.card:nth-child(2)',
      title: 'Step 6 \u2014 Select test conditions',
      icon: '',
      text: 'In the <strong>Test Conditions</strong> panel, choose the temperature and humidity for the evaluation (e.g. 23\u00B0C / 50% RH).',
      tip: '\uD83D\uDCA1 Only conditions available for ALL selected materials appear here.'
    },

    // ── 9: Calculate ──────────────────────────────────────────────────
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource',
      spotSelector: '.btn-danger',
      title: 'Step 7 \u2014 Calculate!',
      icon: '',
      text: 'Hit <strong>Calculate</strong> to run the barrier model. The Result panel shows the total WVTR or OTR, plus the resistance contribution of each individual layer and interactive charts.',
      tip: '\uD83D\uDCA1 Enable Auto-calculate to recompute instantly every time you change a value.'
    },

    // ── 10: Other tools (overview) ────────────────────────────────────
    {
      nav: function () { _goHome(); },
      waitSelector: '#nav-tabs',
      spotSelector: '#nav-tabs',
      title: 'Explore more tools',
     icon: '',
      text: 'Beyond the Calculator you\u2019ll find many more modules:'
          + '<br><br><strong>\u00B7 Sensitivity & Arrhenius</strong> \u2014 optimise thickness, predict at other temperatures'
          + '<br><strong>\u00B7 Shelf Life</strong> \u2014 estimate product shelf life from barrier data'
          + '<br><strong>\u00B7 Food tools</strong> \u2014 MAP / O\u2082, Carbon Footprint, PPWR labelling'
          + '<br><strong>\u00B7 Biomedical</strong> \u2014 MVTR per ICH zones, desiccant sizing'
          + '<br><strong>\u00B7 Photovoltaic</strong> \u2014 PV module moisture degradation'
          + '<br><strong>\u00B7 Databases</strong> \u2014 community & company material / laminate libraries',
    },

    // ── 11: Done ──────────────────────────────────────────────────────
    {
      nav: function () { _goHome(); },
      waitSelector: null,
      spotSelector: null,
      title: 'You\u2019re ready! ',
    icon: '',
      text: 'The workflow is simple: <strong>choose gas \u2192 pick database \u2192 add layers + thickness \u2192 set conditions \u2192 Calculate</strong>.<br><br>Restart this tour anytime from the button at the bottom right.'
    }
  ];

  // ── State ───────────────────────────────────────────────────────────
  var currentStep     = 0;
  var isRunning       = false;
  var _pollTimer      = null;
  var _currentSpotSel = null;
  var _scrollRAF      = null;

  // ── DOM refs ────────────────────────────────────────────────────────
  var overlay, highlight, bubble, arrow;
  var curtainTop, curtainBottom, curtainLeft, curtainRight;
  var startBtn, doneCard;

  // ── Helpers ─────────────────────────────────────────────────────────
  function _goHome() {
    try { if (typeof onGroupClick === 'function') onGroupClick('home'); } catch(e){}
  }

  function _refreshPosition() {
    if (!isRunning || !_currentSpotSel) return;
    var el = document.querySelector(_currentSpotSel);
    if (!el) return;
    var rect = el.getBoundingClientRect();
    _spotlight(rect);
    _positionBubble(rect);
  }

  function _onScroll() {
    if (!isRunning) return;
    if (_scrollRAF) cancelAnimationFrame(_scrollRAF);
    _scrollRAF = requestAnimationFrame(_refreshPosition);
  }

  function _injectCSS() {
    if (document.getElementById('tour-css')) return;
    var s = document.createElement('style');
    s.id = 'tour-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _buildDOM() {
    if (document.getElementById('tour-overlay')) {
      overlay       = document.getElementById('tour-overlay');
      curtainTop    = document.getElementById('tour-curtain-top');
      curtainBottom = document.getElementById('tour-curtain-bottom');
      curtainLeft   = document.getElementById('tour-curtain-left');
      curtainRight  = document.getElementById('tour-curtain-right');
      highlight     = document.getElementById('tour-highlight');
      arrow         = document.getElementById('tour-arrow');
      bubble        = document.getElementById('tour-bubble');
      startBtn      = document.getElementById('tour-start-btn');
      doneCard      = document.getElementById('tour-done-card');
      return;
    }

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

    highlight = document.createElement('div');
    highlight.id = 'tour-highlight';
    document.body.appendChild(highlight);

    arrow = document.createElement('div');
    arrow.id = 'tour-arrow';
    arrow.className = 'hidden';
    document.body.appendChild(arrow);

    bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    bubble.className = 'hidden';
    bubble.innerHTML =
      '<div id="tour-bubble-header">' +
        '<div style="flex:1">' +
          '<div id="tour-bubble-step"></div>' +
          '<span id="tour-bubble-icon"></span>' +
          '<p id="tour-bubble-title"></p>' +
        '</div>' +
        '<button id="tour-bubble-close">\u2715</button>' +
      '</div>' +
      '<div id="tour-bubble-body">' +
        '<p id="tour-bubble-text"></p>' +
        '<div id="tour-bubble-tip"></div>' +
      '</div>' +
      '<div id="tour-bubble-footer">' +
        '<div id="tour-progress-dots"></div>' +
        '<div id="tour-bubble-actions">' +
          '<button class="tour-btn tour-btn-secondary" id="tour-btn-back">\u2190 Back</button>' +
          '<button class="tour-btn tour-btn-primary"   id="tour-btn-next">Next \u2192</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bubble);

    document.getElementById('tour-bubble-close').addEventListener('click', function(e) {
      e.stopPropagation(); Tour.stop();
    });
    document.getElementById('tour-btn-next').addEventListener('click', function(e) {
      e.stopPropagation(); Tour.next();
    });
    document.getElementById('tour-btn-back').addEventListener('click', function(e) {
      e.stopPropagation(); Tour.prev();
    });

    startBtn = document.createElement('button');
    startBtn.id = 'tour-start-btn';
    startBtn.innerHTML = '\u25B6 Take the tour';
    startBtn.addEventListener('click', function() { Tour.start(); });
    document.body.appendChild(startBtn);

    doneCard = document.createElement('div');
    doneCard.id = 'tour-done-card';
    doneCard.innerHTML =
      '<div id="tour-done-inner">' +
        '<span class="done-emoji">\uD83C\uDF89</span>' +
        '<h3>Tour complete!</h3>' +
        '<p>You\'ve seen the full Calculator workflow and all the available tools.<br>Time to run your first analysis!</p>' +
        '<button id="tour-done-go">Go to Calculator \u2192</button>' +
      '</div>';
    document.body.appendChild(doneCard);
    document.getElementById('tour-done-go').addEventListener('click', function() {
      Tour.closeDone();
      try { onGroupClick('calculator'); } catch(e){}
    });
  }

  // ── Spotlight ───────────────────────────────────────────────────────
  function _spotlight(rect) {
    var p = 6;
    var t = Math.max(rect.top - p, 0);
    var b = rect.bottom + p;
    var l = Math.max(rect.left - p, 0);
    var r = rect.right + p;
    var W = window.innerWidth;
    var H = window.innerHeight;

    curtainTop.style.cssText    = 'top:0;left:0;right:0;height:' + t + 'px';
    curtainBottom.style.cssText = 'top:' + Math.min(b,H) + 'px;left:0;right:0;bottom:0';
    curtainLeft.style.cssText   = 'top:' + t + 'px;left:0;width:' + l + 'px;height:' + (Math.min(b,H)-t) + 'px';
    curtainRight.style.cssText  = 'top:' + t + 'px;left:' + Math.min(r,W) + 'px;right:0;height:' + (Math.min(b,H)-t) + 'px';

    highlight.style.top    = t + 'px';
    highlight.style.left   = l + 'px';
    highlight.style.width  = (r - l) + 'px';
    highlight.style.height = (b - t) + 'px';
  }

  function _spotlightNone() {
    curtainTop.style.cssText    = 'top:0;left:0;right:0;bottom:0';
    curtainBottom.style.cssText = 'display:none';
    curtainLeft.style.cssText   = 'display:none';
    curtainRight.style.cssText  = 'display:none';
    highlight.style.cssText     = 'width:0;height:0;top:0;left:0';
  }

  // ── Bubble positioning ──────────────────────────────────────────────
  function _positionBubble(rect) {
    var bw = 368; var bh = 280;
    var W  = window.innerWidth; var H = window.innerHeight;
    var pad = 12;
    arrow.className = 'hidden';

    if (!rect) {
      bubble.style.top       = '50%';
      bubble.style.left      = '50%';
      bubble.style.transform = 'translate(-50%,-50%)';
      return;
    }

    bubble.style.transform = 'none';
    var cx = (rect.left + rect.right) / 2;
    var placement, bTop, bLeft;

    if (rect.bottom + pad + bh < H) {
      placement = 'below'; bTop = rect.bottom + pad;
      bLeft = Math.min(Math.max(cx - bw/2, 8), W - bw - 8);
    } else if (rect.top - pad - bh > 0) {
      placement = 'above'; bTop = rect.top - pad - bh;
      bLeft = Math.min(Math.max(cx - bw/2, 8), W - bw - 8);
    } else if (rect.right + pad + bw < W) {
      placement = 'right'; bLeft = rect.right + pad;
      bTop = Math.min(Math.max(rect.top, 8), H - bh - 8);
    } else {
      placement = 'left'; bLeft = Math.max(rect.left - pad - bw, 8);
      bTop = Math.min(Math.max(rect.top, 8), H - bh - 8);
    }

    bubble.style.top  = bTop + 'px';
    bubble.style.left = bLeft + 'px';

    var ax, ay, ac;
    if (placement === 'below')      { ac='arrow-top';    ax=cx-9; ay=rect.bottom+pad-11; }
    else if (placement === 'above') { ac='arrow-bottom'; ax=cx-9; ay=rect.top-pad; }
    else if (placement === 'right') { ac='arrow-left';   ax=rect.right+pad-11; ay=bTop+(bh/4); }
    else                            { ac='arrow-right';  ax=rect.left-pad; ay=bTop+(bh/4); }

    arrow.className  = ac;
    arrow.style.left = ax + 'px';
    arrow.style.top  = ay + 'px';
  }

  // ── Step rendering ──────────────────────────────────────────────────
  function _renderStep(idx) {
    var step  = STEPS[idx];
    var total = STEPS.length;

    document.getElementById('tour-bubble-step').textContent = 'Step ' + (idx+1) + ' of ' + total;
    document.getElementById('tour-bubble-icon').textContent = step.icon || '\uD83D\uDCCC';
    document.getElementById('tour-bubble-title').innerHTML  = step.title;
    document.getElementById('tour-bubble-text').innerHTML   = step.text;

    var tipEl = document.getElementById('tour-bubble-tip');
    if (step.tip) { tipEl.innerHTML = step.tip; tipEl.style.display = 'block'; }
    else          { tipEl.style.display = 'none'; }

    var dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<div class="tour-dot ' + (i < idx ? 'done' : i === idx ? 'active' : '') + '"></div>';
    }
    document.getElementById('tour-progress-dots').innerHTML = dots;

    var backBtn = document.getElementById('tour-btn-back');
    var nextBtn = document.getElementById('tour-btn-next');
    backBtn.style.display = idx === 0 ? 'none' : 'inline-block';
    nextBtn.textContent   = idx === total - 1 ? 'Finish \u2713' : 'Next \u2192';
  }

  // ── Polling: wait for selector ──────────────────────────────────────
  function _waitForElement(selector, timeout, cb) {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (!selector) { cb(null); return; }

    var elapsed = 0;
    var interval = 80;
    _pollTimer = setInterval(function () {
      if (!isRunning) { clearInterval(_pollTimer); _pollTimer = null; return; }
      var el = document.querySelector(selector);
      if (el) {
        var r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          clearInterval(_pollTimer); _pollTimer = null;
          cb(el); return;
        }
      }
      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(_pollTimer); _pollTimer = null;
        cb(null);
      }
    }, interval);
  }

  // ── Show step ───────────────────────────────────────────────────────
  function _showStep(idx) {
    if (!isRunning) return;
    var step = STEPS[idx];

    _renderStep(idx);
    bubble.classList.remove('hidden');
    bubble.style.top       = '50%';
    bubble.style.left      = '50%';
    bubble.style.transform = 'translate(-50%,-50%)';
    arrow.className = 'hidden';

    if (typeof step.nav === 'function') {
      try { step.nav(); } catch(e) { /* ignore */ }
    }

    _waitForElement(step.waitSelector, 2500, function(sentinel) {
      if (!isRunning) return;

      var spotEl = step.spotSelector ? document.querySelector(step.spotSelector) : null;

      if (spotEl) {
        _currentSpotSel = step.spotSelector;
        spotEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(function () {
          if (!isRunning) return;
          var rect = spotEl.getBoundingClientRect();
          _spotlight(rect);
          _positionBubble(rect);
        }, 80);
      } else {
        _currentSpotSel = null;
        _spotlightNone();
        _positionBubble(null);
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────────
  window.Tour = {
    start: function () {
      _injectCSS();
      _buildDOM();
      isRunning   = true;
      currentStep = 0;
      overlay.classList.remove('hidden');
      if (startBtn) startBtn.classList.add('hidden');
      _showStep(0);
      window.addEventListener('scroll', _onScroll, { passive: true });
      document.addEventListener('scroll', _onScroll, { passive: true, capture: true });
    },

    next: function () {
      if (!isRunning) return;
      if (currentStep >= STEPS.length - 1) {
        Tour.stop();
        if (doneCard) doneCard.classList.add('show');
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
      _currentSpotSel = null;
      if (_scrollRAF) { cancelAnimationFrame(_scrollRAF); _scrollRAF = null; }
      window.removeEventListener('scroll', _onScroll);
      document.removeEventListener('scroll', _onScroll, { capture: true });
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
      if (overlay)      overlay.classList.add('hidden');
      if (bubble)       bubble.classList.add('hidden');
      if (arrow)        arrow.className = 'hidden';
      if (highlight)    highlight.style.cssText = 'width:0;height:0';
      if (curtainTop)    curtainTop.style.cssText    = 'display:none';
      if (curtainBottom) curtainBottom.style.cssText = 'display:none';
      if (curtainLeft)   curtainLeft.style.cssText   = 'display:none';
      if (curtainRight)  curtainRight.style.cssText  = 'display:none';
      if (startBtn) startBtn.classList.remove('hidden');
      try { localStorage.setItem('wvtr_tour_seen', '1'); } catch(e){}
    },

    closeDone: function () {
      if (doneCard) doneCard.classList.remove('show');
    }
  };

  // ── Auto-start on first visit ───────────────────────────────────────
  function _init() {
    _injectCSS();
    _buildDOM();
    var seen = false;
    try { seen = !!localStorage.getItem('wvtr_tour_seen'); } catch(e){}
    if (!seen) setTimeout(function () { Tour.start(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(_init, 600); });
  } else {
    setTimeout(_init, 600);
  }

})();
