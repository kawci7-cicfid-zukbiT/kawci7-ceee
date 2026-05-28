// ====================================================================
// nav.js  —  Two-level navigation
// Load AFTER app.js in index.html:
//   <script src="nav.js"></script>
//
// Top-level groups:
//   Home | Calculator | Food Analysis | Biomedical Analysis |
//   Community Database | Company Database
// ====================================================================
var NAV_GROUPS = [
  {
    id: 'home',
    label: ' Home',
    tabs: []
  },
  {
    id: 'calculator',
    label: ' Calculator',
    tabs: [
      { id: 'calc',        label: 'Laminate Calculator' },
      { id: 'sensitivity', label: 'Sensitivity & Optimizer' },
      { id: 'arrhenius',   label: 'Arrhenius Predictor'  }
    ]
  },
  {
    id: 'food',
    label: ' Food Analysis',
    tabs: [
      { id: 'shelflife',   label: 'Shelf Life'               },
      { id: 'carbonfp',    label: 'Carbon Footprint'         },
      { id: 'headspace', label: 'MAP / O₂ Evolution' },
      { id: 'ppwr-label', label: 'PPWR Label Generator' }
    ]
  },
  {
    id: 'biomedical',
    label: ' Biomedical Analysis',
    tabs: [
      { id: 'pharma-mvtr',   label: 'MVTR / ICH Conditions'  },
      { id: 'pharma-uptake', label: 'Drug Moisture Uptake'   }
    ]
  },
  {
    id: 'community',
    label: ' Community Database',
    tabs: [
      { id: 'materials',   label: 'Materials'  },
      { id: 'laminates',   label: 'Laminates'  }
    ]
  },
  {
    id: 'company',
    label: ' Company Database',
    tabs: [
      { id: 'mat-company', label: 'Materials'  },
      { id: 'lam-company', label: 'Laminates'  }
    ]
  }
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function getActiveGroup() {
  if (State.tab === 'home') return 'home';
  for (var i = 0; i < NAV_GROUPS.length; i++) {
    var g = NAV_GROUPS[i];
    for (var j = 0; j < g.tabs.length; j++) {
      if (g.tabs[j].id === State.tab) return g.id;
    }
  }
  // Default: first tab of calculator
  return 'calculator';
}

// ------------------------------------------------------------------
// renderNav  — overrides the function defined in app.js/render.js
// ------------------------------------------------------------------

function renderNav() {
  var activeGroup = getActiveGroup();

  // ── Top nav ──────────────────────────────────────────────────────
  var topHtml = '';
  for (var i = 0; i < NAV_GROUPS.length; i++) {
    var g = NAV_GROUPS[i];
    var isActive = (g.id === activeGroup);

    // Company DB: green dot when a company profile is active
    var dot = '';
    if (g.id === 'company' && typeof CompanyState !== 'undefined' && CompanyState.isActive()) {
      dot = '<span style="width:6px;height:6px;border-radius:50%;' +
            'background:#22c55e;display:inline-block;margin-right:5px;' +
            'vertical-align:middle"></span>';
    }

    topHtml += '<button class="nav-tab' + (isActive ? ' active' : '') +
      '" data-group="' + g.id + '"' +
      ' onclick="onGroupClick(\'' + g.id + '\')">' +
      dot + g.label + '</button>';
  }
  document.getElementById('nav-tabs').innerHTML = topHtml;

  // ── Sub nav ───────────────────────────────────────────────────────
  var subEl = document.getElementById('nav-subtabs');
  if (!subEl) return;

  var activeGroupObj = null;
  for (var k = 0; k < NAV_GROUPS.length; k++) {
    if (NAV_GROUPS[k].id === activeGroup) { activeGroupObj = NAV_GROUPS[k]; break; }
  }

  if (!activeGroupObj || activeGroupObj.tabs.length === 0) {
    subEl.style.display = 'none';
    return;
  }

  subEl.style.display = 'flex';
  var subHtml = '';
  for (var j = 0; j < activeGroupObj.tabs.length; j++) {
    var tab = activeGroupObj.tabs[j];
    subHtml += '<button class="nav-subtab' + (State.tab === tab.id ? ' active' : '') +
      '" onclick="onSubTabClick(\'' + tab.id + '\')">' + tab.label + '</button>';
  }
  subEl.innerHTML = subHtml;
}

// ------------------------------------------------------------------
// Click handlers
// ------------------------------------------------------------------

function onGroupClick(groupId) {
  if (groupId === 'home') {
    State.tab = 'home';
    renderNav();
    renderContent();
    if (typeof postNavRender === 'function') postNavRender();
    return;
  }

  var g = null;
  for (var i = 0; i < NAV_GROUPS.length; i++) {
    if (NAV_GROUPS[i].id === groupId) { g = NAV_GROUPS[i]; break; }
  }
  if (!g || g.tabs.length === 0) return;

  // Stay on current sub-tab if already inside this group
  var alreadyIn = false;
  for (var j = 0; j < g.tabs.length; j++) {
    if (g.tabs[j].id === State.tab) { alreadyIn = true; break; }
  }
  if (!alreadyIn) State.tab = g.tabs[0].id;

  renderNav();
  renderContent();
  if (typeof postNavRender === 'function') postNavRender();
}

function onSubTabClick(tabId) {
  State.tab = tabId;
  renderNav();
  renderContent();
  if (typeof postNavRender === 'function') postNavRender();
}
