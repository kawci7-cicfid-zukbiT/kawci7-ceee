// ====================================================================
// ADS.JS — side-rail AdSense banners, shown only on the PPWR page.
//
// WHY A SEPARATE MODULE:
// The app rewrites #app-content on every render. Ads must NOT live there
// (they'd be destroyed and recreated each render — an AdSense violation).
// This module creates two FIXED side rails in <body> ONCE, pushes each
// ad slot ONCE, then only toggles their visibility.
//
// SETUP:
// 1. In index.html <head>, ONCE, add the AdSense loader (replace the ID):
//    <script async
//      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
//      crossorigin="anonymous"></script>
// 2. In AdSense, create two Display ad units (160x600 "wide skyscraper"
//    works well for side rails) and copy their slot IDs below.
// 3. Load this file in index.html AFTER the AdSense loader:
//    <script src="js/ads.js"></script>
// 4. Call ppwrAdsSync() from your main render() — see note at the bottom.
// ====================================================================

var ADS_CONFIG = {
  client:     'ca-pub-8643763701588437',  // your AdSense publisher ID
  leftSlot:   'XXXXXXXXXX',               // slot ID of the LEFT ad unit
  rightSlot:  'XXXXXXXXXX',               // slot ID of the RIGHT ad unit
  minWidth:   1360,                        // hide rails below this viewport width (avoids overlap with the 960px content)
  railWidth:  160,
  railHeight: 600,
  ppwrTabKey: 'ppwr-label'                 // State.tab value of the PPWR page
};

var _adsActive = false;

function _adsConfigured() {
  return ADS_CONFIG.client.indexOf('XXXX') < 0 &&
         ADS_CONFIG.leftSlot.indexOf('XXXX') < 0 &&
         ADS_CONFIG.rightSlot.indexOf('XXXX') < 0;
}

// Create one side rail (idempotent — never recreates an existing one)
function _adsEnsureRail(side, slot) {
  var id = 'ppwr-ad-' + side;
  if (document.getElementById(id)) return;          // already created → leave it alone
  var rail = document.createElement('div');
  rail.id = id;
  rail.style.cssText =
    'position:fixed;top:96px;' + side + ':16px;' +
    'width:' + ADS_CONFIG.railWidth + 'px;z-index:40;display:none';
  var ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.cssText = 'display:inline-block;width:' + ADS_CONFIG.railWidth +
                      'px;height:' + ADS_CONFIG.railHeight + 'px';
  ins.setAttribute('data-ad-client', ADS_CONFIG.client);
  ins.setAttribute('data-ad-slot', slot);
  rail.appendChild(ins);
  document.body.appendChild(rail);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
}

// Apply current visibility (active on PPWR tab AND wide enough screen)
function _adsApply() {
  var show = _adsActive && window.innerWidth >= ADS_CONFIG.minWidth;
  ['left', 'right'].forEach(function (s) {
    var el = document.getElementById('ppwr-ad-' + s);
    if (el) el.style.display = show ? 'block' : 'none';
  });
}

// Public: show the rails (creates them on first call)
function ppwrAdsMount() {
  if (!_adsConfigured()) return;       // still has placeholder IDs → do nothing
  _adsEnsureRail('left',  ADS_CONFIG.leftSlot);
  _adsEnsureRail('right', ADS_CONFIG.rightSlot);
  _adsActive = true;
  _adsApply();
}

// Public: hide the rails (does not destroy them)
function ppwrAdsUnmount() {
  _adsActive = false;
  _adsApply();
}

// Public: single integration point — call from your main render().
// Shows the rails only when the PPWR tab is active.
function ppwrAdsSync() {
  var onPpwr = (typeof State !== 'undefined' && State.tab === ADS_CONFIG.ppwrTabKey);
  if (onPpwr) ppwrAdsMount();
  else        ppwrAdsUnmount();
}

window.addEventListener('resize', _adsApply);

// ── INTEGRATION ──────────────────────────────────────────────────────
// Add ONE line inside your main render() function (app.js / render.js),
// e.g. right after it sets State.tab / renders the content:
//
//     if (typeof ppwrAdsSync === 'function') ppwrAdsSync();
//
// That's it. The rails appear only on the PPWR page, only on screens
// wide enough not to overlap the content, and survive every re-render.
