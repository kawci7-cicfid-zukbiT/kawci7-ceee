// ====================================================================
// 🎯 TOUR.JS — Guided onboarding tour for WVTR/OTR Calculator
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
      pointer-events: none; /* FIX: mai bloccare i click */
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
      width: 320px;
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
    }
    #tour-progress-dots { display: flex; gap: .35rem; align-items: center; }
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
      50%      { box-shadow: 0 4px 28px rgba(37,99,235,.75); }
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
  // IMPORTANTE: ogni step con `nav` aspetta che `waitSelector` compaia nel DOM
  // dopo la navigazione, così il polling non trova mai l'elemento sbagliato.
  var STEPS = [
    {
      nav: function () { _goHome(); },
      waitSelector: '#nav-tabs',        // presente nella home
      spotSelector: '.mode-toggle',
      title: 'Step 1: choose the gas',
      icon: '',
      text: 'Start by choosing what you want to measure: <strong>WVTR</strong> (water vapor) or <strong>OTR</strong> (oxygen). This choice affects all calculations.',
      tip: ' WVTR = moisture barrier · OTR = oxygen barrier'
    },
    {
      nav: function () { _goHome(); },
      waitSelector: '#nav-tabs',
      spotSelector: '#nav-tabs',
      title: 'Main navigation',
      icon: '',
      text: 'The top bar has <strong>4 sections</strong>: Home, Analysis, Community Database and Company Database. Click one to explore.',
      tip: ' Each section reveals a sub-menu below with specific tools.'
    },
    {
      nav: function () { onGroupClick('analysis'); },
      waitSelector: '#nav-subtabs',     // appare solo dopo onGroupClick('analysis')
      spotSelector: '#nav-subtabs',
      title: 'Sub-menu: Analysis tools',
      icon: '',
      text: 'When you click <strong>Analysis</strong>, a second row appears with 5 tools: Calculator, Sensitivity, Shelf Life, Arrhenius and Compare.',
      tip: ' Start from Calculator — it\'s the core of the app.'
    },
    {
      nav: function () { onSubTabClick('calc'); },
      waitSelector: '#filter-matsource', // id univoco dentro renderCalc()
      spotSelector: '#filter-matsource',
      title: 'Calculator: build your laminate',
      icon: '',
      text: 'Add one or more material layers, set their thickness, pick test conditions and click <em>Calculate</em>. The app computes the total WVTR/OTR of your laminate stack.',
      tip: ' Each layer needs a material from the database + a thickness in µm.'
    },
    {
      nav: function () { onSubTabClick('sensitivity'); },
      waitSelector: '#sens-layer',       // id univoco in renderSensitivity()
      spotSelector: '#app-content',
      title: 'Sensitivity analysis',
      icon: '',
      text: '<strong>Sensitivity</strong> shows how the result changes as you vary thickness or conditions. Ideal for optimizing your laminate before going to the lab.'
    },
    {
      nav: function () { onSubTabClick('shelflife'); },
      waitSelector: '#sl-weight',        // id univoco in renderShelfLife()
      spotSelector: '#app-content',
      title: 'Shelf Life',
      icon: '',
      text: 'Enter product weight, area, rate and storage conditions — the tool tells you the <strong>expected shelf life</strong> of your packaging.'
    },
    {
      nav: function () { onGroupClick('community'); },
      waitSelector: '#nav-subtabs',
      spotSelector: '#nav-subtabs',
      title: 'Community Database',
      icon: '',
      text: 'The <strong>Community Database</strong> contains Materials and Laminates shared by all users. You can search, vote on reliability, and add your own data.',
      tip: ' The green dot on Company Database means your company data is active.'
    },
    {
      nav: function () { onSubTabClick('materials'); },
      waitSelector: '#mat-search',       // id della barra di ricerca materiali
      spotSelector: '#mat-search',
      title: 'Search & explore materials',
      icon: '',
      text: 'Use the search bar to find any material by name. Filter by family or test method. Click a material to see its data and use it in calculations.'
    },
    {
      nav: function () { onGroupClick('company'); },
      waitSelector: '#nav-subtabs',
      spotSelector: '#nav-subtabs',
      title: 'Company Database',
      icon: '',
      text: 'In <strong>Company Database</strong> you can manage <em>private</em> materials and laminates — only visible to your team, never shared with the community.'
    },
    {
      nav: function () { _goHome(); },
      waitSelector: null,               // step finale: nessun elemento da aspettare
      spotSelector: null,
      title: 'You\'re ready! ',
      icon: '',
      text: 'You\'ve seen all the main sections. Start with <strong>Calculator</strong> → add materials → run your first analysis. You can restart this tour anytime from the button at the bottom right.'
    }
  ];

  // ── State ────────────────────────────────────────────────────────────
  var currentStep     = 0;
  var isRunning       = false;
  var _pollTimer      = null;  // timer polling attivo
  var _currentSpotSel = null;  // selettore dell'elemento evidenziato ora
  var _scrollRAF      = null;  // rAF per aggiornamento scroll

  // ── DOM refs ─────────────────────────────────────────────────────────
  var overlay, highlight, bubble, arrow;
  var curtainTop, curtainBottom, curtainLeft, curtainRight;
  var startBtn, doneCard;

  // ── Helpers ──────────────────────────────────────────────────────────
  function _goHome() {
    try { if (typeof onGroupClick === 'function') onGroupClick('home'); } catch(e){}
  }

  // Ricalcola spotlight + bubble seguendo l'elemento anche dopo lo scroll
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
      // già costruito: recupera ref
      overlay      = document.getElementById('tour-overlay');
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
        '<button id="tour-bubble-close">✕</button>' +
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
    startBtn.innerHTML = '▶ Take the tour';
    startBtn.addEventListener('click', function() { Tour.start(); });
    document.body.appendChild(startBtn);

    doneCard = document.createElement('div');
    doneCard.id = 'tour-done-card';
    doneCard.innerHTML =
      '<div id="tour-done-inner">' +
        '<span class="done-emoji"></span>' +
        '<h3>Tour complete!</h3>' +
        '<p>You\'ve seen all the main sections of the WVTR/OTR Calculator.<br>Time to run your first analysis!</p>' +
        '<button id="tour-done-go">Go to Calculator →</button>' +
      '</div>';
    document.body.appendChild(doneCard);
    document.getElementById('tour-done-go').addEventListener('click', function() {
      Tour.closeDone();
      try { onGroupClick('analysis'); } catch(e){}
    });
  }

  // ── Spotlight ────────────────────────────────────────────────────────
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

  // ── Bubble positioning ───────────────────────────────────────────────
  function _positionBubble(rect) {
    var bw = 328; var bh = 260;
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
    if (placement === 'below')  { ac='arrow-top';    ax=cx-9; ay=rect.bottom+pad-11; }
    else if (placement==='above') { ac='arrow-bottom'; ax=cx-9; ay=rect.top-pad; }
    else if (placement==='right') { ac='arrow-left';   ax=rect.right+pad-11; ay=bTop+(bh/4); }
    else                          { ac='arrow-right';  ax=rect.left-pad; ay=bTop+(bh/4); }

    arrow.className = ac;
    arrow.style.left = ax + 'px';
    arrow.style.top  = ay + 'px';
  }

  // ── Step rendering ───────────────────────────────────────────────────
  function _renderStep(idx) {
    var step  = STEPS[idx];
    var total = STEPS.length;

    document.getElementById('tour-bubble-step').textContent = 'Step ' + (idx+1) + ' of ' + total;
    document.getElementById('tour-bubble-icon').textContent = step.icon || '📌';
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
    nextBtn.textContent   = idx === total - 1 ? 'Finish ✓' : 'Next →';
  }

  // ── Polling: aspetta che `selector` esista ed abbia dimensioni reali,
  //    ma SOLO dopo che `nav()` ha cambiato pagina.
  //    `navTabId` = State.tab atteso dopo la nav, oppure null.
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

  // ── Show step ────────────────────────────────────────────────────────
  function _showStep(idx) {
    if (!isRunning) return;
    var step = STEPS[idx];

    // 1. Mostra subito il contenuto nel bubble
    _renderStep(idx);
    bubble.classList.remove('hidden');
    // Posiziona il bubble al centro mentre aspettiamo il DOM
    bubble.style.top       = '50%';
    bubble.style.left      = '50%';
    bubble.style.transform = 'translate(-50%,-50%)';
    arrow.className = 'hidden';

    // 2. Naviga
    if (typeof step.nav === 'function') {
      try { step.nav(); } catch(e) { /* ignore */ }
    }

    // 3. Aspetta che l'elemento "sentinella" compaia nel DOM
    //    (distinto dal spotSelector, serve solo a capire che la pagina è pronta)
    _waitForElement(step.waitSelector, 2500, function(sentinel) {
      if (!isRunning) return;

      // 4. Ora cerca l'elemento da evidenziare
      var spotEl = step.spotSelector ? document.querySelector(step.spotSelector) : null;

      if (spotEl) {
        _currentSpotSel = step.spotSelector;  // traccia l'elemento per lo scroll
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

  // ── Public API ───────────────────────────────────────────────────────
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
      // Cancella polling eventualmente attivo
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
      // Nasconde tutto senza mai bloccare i click
      if (overlay)   overlay.classList.add('hidden');
      if (bubble)    bubble.classList.add('hidden');
      if (arrow)     arrow.className = 'hidden';
      if (highlight) highlight.style.cssText = 'width:0;height:0';
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

  // ── Auto-avvio al primo accesso ──────────────────────────────────────
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
