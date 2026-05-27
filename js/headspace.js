// ====================================================================
// 🧪 HEADSPACE.JS — Headspace O₂ Calculator (Improved)
// Layout & patterns aligned with shelflife.js
// Features: O₂ ingress/respiration balance, Arrhenius/Q10, 
//           Logistics Chain, Chart.js, PDF export, textbook methodology
// ====================================================================

// ====================================================================
// 🥩 PRODUCT PRESETS — Predefined food templates for headspace modeling
// ====================================================================
const HS_PRESETS = {
  'fresh-meat': {
    name: "Fresh Meat (MAP 70% O₂)", type: "respiring",
    o2_initial: 70, o2_limit: 5, k_resp: 10, resp_order: 'zero',
    Ea: 75000, Q10: 2.3, label: "Fresh meat in high-O₂ MAP"
  },
  'chilled-meat': {
    name: "Chilled Cooked Meat", type: "respiring",
    o2_initial: 2, o2_limit: 1, k_resp: 5, resp_order: 'zero',
    Ea: 65000, Q10: 2.0, label: "Low-O₂ cooked meat products"
  },
  'cheese': {
    name: "Cheese (Vacuum)", type: "respiring",
    o2_initial: 0, o2_limit: 1, k_resp: 2, resp_order: 'first',
    Ea: 55000, Q10: 1.8, label: "Vacuum-packed cheese"
  },
  'coffee': {
    name: "Roasted Coffee (N₂ Flushed)", type: "inert",
    o2_initial: 0, o2_limit: 1, k_resp: 0, resp_order: 'zero',
    Ea: 0, Q10: 1.0, label: "Nitrogen-flushed coffee"
  },
  'berries': {
    name: "Fresh Berries", type: "respiring",
    o2_initial: 21, o2_limit: 3, k_resp: 30, resp_order: 'first',
    Ea: 80000, Q10: 2.5, label: "High-respiration fresh fruit"
  },
  'salad': {
    name: "Fresh-Cut Salad", type: "respiring",
    o2_initial: 21, o2_limit: 3, k_resp: 50, resp_order: 'first',
    Ea: 85000, Q10: 2.8, label: "Minimally processed leafy greens"
  },
  'nuts': {
    name: "Nuts & Seeds", type: "oxidative",
    o2_initial: 0, o2_limit: 0.5, k_resp: 0, resp_order: 'zero',
    Ea: 90000, Q10: 2.5, label: "Lipid oxidation sensitive products"
  },
  'custom': {
    name: "Custom Product", type: "respiring",
    o2_initial: 21, o2_limit: 1, k_resp: 5, resp_order: 'zero',
    Ea: 60000, Q10: 2.0, label: "Define your own parameters"
  }
};

// ====================================================================
// 📦 HS OBJECT — Encapsulated headspace logic (aligned with SL pattern)
// ====================================================================
const HS = {
  // Internal state
  _manualOverride: false,
  _barrierSource: 'calc',
  _currentChainMode: 'single',

  // ------------------------------------------------------------------
  // 🔀 UI TOGGLES & STATE MANAGEMENT
  // ------------------------------------------------------------------

  /** Toggle manual OTR override */
  toggleManualOverride(checked) {
    this._manualOverride = !!checked;
    const panel = document.getElementById('hs-panel-manual');
    if (panel) panel.style.display = checked ? 'block' : 'none';

    // Disable/enable source buttons
    ['calc', 'db', 'company'].forEach(key => {
      const btn = document.getElementById('hs-src-btn-' + key);
      if (!btn) return;
      btn.disabled = checked;
      btn.style.opacity = checked ? '0.35' : '1';
      btn.style.cursor = checked ? 'not-allowed' : 'pointer';
    });

    // Hide source panels when override is active
    ['calc', 'db', 'company'].forEach(p => {
      const el = document.getElementById('hs-panel-' + p);
      if (el) el.style.display = checked ? 'none' : (p === this._barrierSource ? 'block' : 'none');
    });

    if (checked) {
      this.onManualRateChange();
    } else {
      this.setBarrierSource(this._barrierSource);
    }
  },

  /** Set barrier rate source: 'calc' | 'db' | 'company' */
  setBarrierSource(src) {
    if (!['calc', 'db', 'company'].includes(src)) return;
    this._barrierSource = src;

    // Update button styles
    ['calc', 'db', 'company'].forEach(key => {
      const btn = document.getElementById(`hs-src-btn-${key}`);
      if (!btn) return;
      if (key === src) {
        btn.className = 'btn btn-sm';
        btn.style.cssText = 'background:var(--primary);color:#fff;border:none;font-size:0.75rem';
      } else {
        btn.className = 'btn btn-sm btn-outline';
        btn.style.cssText = 'font-size:0.75rem';
        if (key === 'company' && !(typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive())) {
          btn.style.opacity = '0.5';
          btn.disabled = true;
        }
      }
    });

    // Show/hide panels
    ['calc', 'db', 'company'].forEach(p => {
      const el = document.getElementById(`hs-panel-${p}`);
      if (el) el.style.display = (p === src) ? 'block' : 'none';
    });

    // Update summary
    if (src === 'calc' && !this._manualOverride) {
      const rate = parseFloat(State.calcResult?.total || 0);
      this._updateRateSummary(rate > 0 ? rate.toFixed(6) : '-');
    }
  },

  /** Toggle packaging geometry mode */
  togglePkgMode() {
    const mode = document.querySelector('input[name="hs-pkg-geom"]:checked')?.value || 'auto';
    const geomSel = document.getElementById('hs-geom-selector');
    const dimsSel = document.getElementById('hs-dims-selector');
    const manInp  = document.getElementById('hs-manual-area-input');

    if (mode === 'auto') {
      if (geomSel) geomSel.style.display = 'grid';
      if (dimsSel) dimsSel.style.display = 'block';
      if (manInp)  manInp.style.display  = 'none';
      this.onShapeChange();
    } else {
      if (geomSel) geomSel.style.display = 'none';
      if (dimsSel) dimsSel.style.display = 'none';
      if (manInp)  manInp.style.display  = 'block';
    }
    this.calcArea();
  },

  /** Handle shape selection change */
  onShapeChange() {
    const sel = document.getElementById('hs-shape');
    if (!sel) return;
    const type = sel.value;

    const pouchDims  = document.getElementById('hs-dims-pouch');
    const bottleDims = document.getElementById('hs-dims-bottle');

    if (type === 'bottle') {
      if (pouchDims)  pouchDims.style.display  = 'none';
      if (bottleDims) bottleDims.style.display = 'grid';
    } else {
      if (pouchDims)  pouchDims.style.display  = 'grid';
      if (bottleDims) bottleDims.style.display = 'none';
    }
    this.calcArea();
  },

  /** Handle package type change (updates labels & defaults) */
  onPkgChange() {
    const sel = document.getElementById('hs-shape');
    if (!sel) return;
    const type = sel.value;

    const pouchDims  = document.getElementById('hs-dims-pouch');
    const bottleDims = document.getElementById('hs-dims-bottle');
    if (type === 'bottle') {
      if (pouchDims)  pouchDims.style.display  = 'none';
      if (bottleDims) bottleDims.style.display = 'grid';
    } else {
      if (pouchDims)  pouchDims.style.display  = 'grid';
      if (bottleDims) bottleDims.style.display = 'none';
    }

    // Update dimension labels and defaults
    const configs = {
      flat:     { w: 12, h: 17, d: 0,  l1: 'Width (cm)', l2: 'Height (cm)', l3: 'Depth/Gusset (cm)' },
      standup:  { w: 13, h: 22, d: 0,  l1: 'Width (cm)', l2: 'Height (cm)', l3: 'Gusset/Depth (cm)' },
      flow:     { w: 20, h: 12, d: 0,  l1: 'Fin Seal Length (cm)', l2: 'Web Width (cm)', l3: '—' },
      box:      { w: 10, h: 15, d: 5,  l1: 'Length (cm)', l2: 'Height (cm)', l3: 'Depth (cm)' },
      cylinder: { w: 0,  h: 12, d: 10, l1: '—', l2: 'Height (cm)', l3: 'Diameter (cm)' },
      tray:     { w: 15, h: 10, d: 3,  l1: 'Length (cm)', l2: 'Width (cm)', l3: 'Depth (cm)' },
      bottle:   { w: 0,  h: 0,  d: 0,  l1: '—', l2: '—', l3: '—' }
    };
    const cfg = configs[type] || configs.flat;

    if (pouchDims && pouchDims.style.display !== 'none') {
      const labels = pouchDims.querySelectorAll('label');
      ['hs-w', 'hs-h', 'hs-d'].forEach((id, i) => {
        const inp = document.getElementById(id);
        if (inp) inp.value = [cfg.w, cfg.h, cfg.d][i];
        if (labels[i]) labels[i].textContent = [cfg.l1, cfg.l2, cfg.l3][i];
      });
    }
    this.calcArea();
  },

  // ------------------------------------------------------------------
  // 📐 AREA & VOLUME CALCULATION
  // ------------------------------------------------------------------

  /** Calculate effective packaging area in m² */
  calcArea() {
    const mode = document.querySelector('input[name="hs-pkg-geom"]:checked')?.value || 'auto';
    let area = 0;

    if (mode === 'manual') {
      area = parseFloat(document.getElementById('hs-area-manual')?.value) || 0;
    } else {
      const type = document.getElementById('hs-shape')?.value || 'flat';
      const margin = parseFloat(document.getElementById('hs-margin')?.value) || 0;

      if (type === 'bottle') {
        const R_body     = parseFloat(document.getElementById('hs-bottle-body-r')?.value) || 3.5;
        const H_body     = parseFloat(document.getElementById('hs-bottle-body-h')?.value) || 16;
        const R_neck     = parseFloat(document.getElementById('hs-bottle-neck-r')?.value) || 1.2;
        const H_neck     = parseFloat(document.getElementById('hs-bottle-neck-h')?.value) || 4;
        const H_shoulder = parseFloat(document.getElementById('hs-bottle-shoulder-h')?.value) || 2.5;

        const areaBodyLat = 2 * Math.PI * R_body * H_body;
        const areaNeckLat = 2 * Math.PI * R_neck * H_neck;
        const slantH = Math.sqrt(Math.pow(R_body - R_neck, 2) + Math.pow(H_shoulder, 2));
        const areaShould = Math.PI * (R_body + R_neck) * slantH;
        const areaBottom = Math.PI * Math.pow(R_body, 2);
        const marginFactor = 1 + (margin / 100);

        area = (areaBodyLat + areaNeckLat + areaShould + areaBottom) * marginFactor / 10000;
      } else {
        const w = parseFloat(document.getElementById('hs-w')?.value) || 0;
        const h = parseFloat(document.getElementById('hs-h')?.value) || 0;
        const d = parseFloat(document.getElementById('hs-d')?.value) || 0;

        const wT = w + margin * 2, hT = h + margin * 2, dT = d + margin * 2;
        let areaCm2 = 0;

        switch(type) {
          case 'flat':     areaCm2 = 2 * wT * hT; break;
          case 'standup':  areaCm2 = 2 * wT * hT * 1.3; break;
          case 'flow':     areaCm2 = wT * hT * 2.2; break;
          case 'box':      areaCm2 = 2 * (wT * hT + wT * dT + hT * dT); break;
          case 'cylinder': areaCm2 = 2 * Math.PI * (d/2) * (d/2 + hT); break;
          case 'tray':     areaCm2 = (wT * hT) + 2 * (wT * dT) + 2 * (hT * dT); break;
          default:         areaCm2 = 2 * wT * hT;
        }
        area = areaCm2 / 10000;
      }
    }

    const display = document.getElementById('hs-area-display');
    const hidden  = document.getElementById('hs-area');
    if (display) display.textContent = area.toFixed(4) + ' m²';
    if (hidden)  hidden.value = area.toFixed(4);
  },

  /** Update area when manual input changes */
  updateManualArea() {
    const val = document.getElementById('hs-area-manual')?.value || '0';
    const display = document.getElementById('hs-area-display');
    const hidden  = document.getElementById('hs-area');
    if (display) display.textContent = val + ' m²';
    if (hidden)  hidden.value = val;
  },

  // ------------------------------------------------------------------
  // 🎯 PRODUCT & SAFE ZONE VISUALIZATION
  // ------------------------------------------------------------------

  /** Handle product preset change */
  onProductChange() {
    const prodKey = document.getElementById('hs-product')?.value;
    const prod = HS_PRESETS[prodKey];
    if (!prod) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    set('hs-o2init',  prod.o2_initial);
    set('hs-o2limit', prod.o2_limit);
    set('hs-kresp',   prod.k_resp);
    set('hs-ea',      prod.Ea ? (prod.Ea / 1000).toFixed(1) : '');
    set('hs-q10',     prod.Q10 ? prod.Q10.toFixed(2) : '');
    document.getElementById('hs-order').value = prod.resp_order;

    this.drawO2SafeZone();
    this.onEaInput(); // Update Ea/Q10 mutual exclusion
  },

  /** Draw O₂ safe zone visualization */
  drawO2SafeZone() {
    const init = parseFloat(document.getElementById('hs-o2init')?.value) || 0;
    const limit = parseFloat(document.getElementById('hs-o2limit')?.value) || 0;

    const vLabel = document.getElementById('hs-o2limit-val');
    const bar    = document.getElementById('hs-safe-green');
    const marker = document.getElementById('hs-safe-now');

    if (!vLabel || !bar || !marker) return;

    vLabel.textContent = limit + '%';
    const max = Math.max(limit * 1.5, init * 1.2, 20);
    bar.style.width = (limit / max * 100) + '%';
    marker.style.left = (init / max * 100) + '%';
  },

  // ------------------------------------------------------------------
  // 🔥 THERMAL ACCELERATION (Ea / Q10)
  // ------------------------------------------------------------------

  /** Handle Ea input - disable Q10 when Ea is set */
  onEaInput() {
    const ea = document.getElementById('hs-ea')?.value;
    const q10 = document.getElementById('hs-q10');
    const hint = document.getElementById('hs-ea-q10-hint');
    if (!q10 || !hint) return;

    if (ea && parseFloat(ea) > 0) {
      q10.disabled = true;
      q10.style.opacity = '0.4';
      q10.value = '';
      hint.textContent = 'Eₐ set — Q₁₀ disabled.';
    } else {
      q10.disabled = false;
      q10.style.opacity = '1';
      hint.textContent = 'Leave empty to use product default.';
    }
  },

  /** Handle Q10 input - disable Ea when Q10 is set */
  onQ10Input() {
    const q10 = document.getElementById('hs-q10')?.value;
    const ea = document.getElementById('hs-ea');
    const hint = document.getElementById('hs-ea-q10-hint');
    if (!ea || !hint) return;

    if (q10 && parseFloat(q10) > 0) {
      ea.disabled = true;
      ea.style.opacity = '0.4';
      ea.value = '';
      hint.textContent = 'Q₁₀ set — Eₐ disabled.';
    } else {
      ea.disabled = false;
      ea.style.opacity = '1';
      hint.textContent = 'Leave empty to use product default.';
    }
  },

  // ------------------------------------------------------------------
  // 🚚 LOGISTICS CHAIN MODE
  // ------------------------------------------------------------------

  /** Toggle between single condition and logistics chain */
  toggleCond(mode) {
    const singleDiv = document.getElementById('hs-cond-single');
    const chainDiv  = document.getElementById('hs-cond-chain');
    const btnSingle = document.getElementById('hs-btn-single');
    const btnChain  = document.getElementById('hs-btn-chain');

    if (singleDiv) singleDiv.style.display = (mode === 'single') ? 'block' : 'none';
    if (chainDiv)  chainDiv.style.display  = (mode === 'chain')  ? 'block' : 'none';

    const setActive = (btn, active) => {
      if (!btn) return;
      btn.style.background = active ? 'var(--primary)' : 'var(--bg)';
      btn.style.color = active ? '#fff' : 'var(--text-light)';
    };
    setActive(btnSingle, mode === 'single');
    setActive(btnChain, mode === 'chain');

    this._currentChainMode = mode;
  },

  /** Add a new row to the logistics chain table */
  addChainRow() {
    const tbody = document.getElementById('hs-chain-rows');
    if (!tbody) return;

    tbody.insertAdjacentHTML('beforeend', `
    <tr style="background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);animation:fadeIn 0.2s ease">
      <td style="padding:0.5rem">
        <input type="text" value="Storage"
          style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fafbfc">
      </td>
      <td style="padding:0.5rem">
        <input type="number" value="22" class="hs-ct"
          style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center">
      </td>
      <td style="padding:0.5rem">
        <input type="number" value="60" class="hs-cr"
          style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center">
      </td>
      <td style="padding:0.5rem">
        <input type="number" value="30" class="hs-cd"
          style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center">
      </td>
      <td style="padding:0.5rem;text-align:center">
        <span style="cursor:pointer;color:var(--danger);font-size:1.2rem;line-height:1"
          onclick="this.closest('tr').remove()">✕</span>
      </td>
    </tr>`);
  },

  // ------------------------------------------------------------------
  // 🧮 MATHEMATICAL CORE — Euler integration for O₂ balance
  // ------------------------------------------------------------------

  /** Get the active barrier rate (manual override or calculated) */
  _getActiveRate() {
    if (this._manualOverride) {
      return parseFloat(document.getElementById('hs-rate-manual')?.value || 0);
    }
    return parseFloat(State.calcResult?.total || 0);
  },

  /** Update the active rate summary display */
  _updateRateSummary(rateStr) {
    const el = document.getElementById('hs-active-rate');
    if (el) el.textContent = rateStr + ' cm³/m²·day';
  },

  onManualRateChange() {
    const rate = parseFloat(document.getElementById('hs-rate-manual')?.value) || 0;
    this._updateRateSummary(rate > 0 ? rate.toFixed(6) : '-');
  },

  /** Execute headspace O₂ calculation */
  calculate() {
    const prodKey = document.getElementById('hs-product')?.value;
    const prod = HS_PRESETS[prodKey];
    if (!prod) { alert('⚠️ Select a product type first'); return; }

    // 1. Get barrier rate
    const rateInput = this._getActiveRate();
    if (rateInput <= 0) {
      alert('No valid OTR. Select a laminate or enter manually.');
      return;
    }

    // 2. Geometry & product parameters
    const A = parseFloat(document.getElementById('hs-area')?.value) || 0.1;      // m²
    const V = parseFloat(document.getElementById('hs-vol')?.value) || 200;      // mL
    const W = parseFloat(document.getElementById('hs-prodkg')?.value) || 0.25;  // kg

    // 3. O₂ parameters
    const o2Init = parseFloat(document.getElementById('hs-o2init')?.value) || 21;
    const o2Limit = parseFloat(document.getElementById('hs-o2limit')?.value) || 1;
    const kResp = parseFloat(document.getElementById('hs-kresp')?.value) || 0;
    const respOrder = document.getElementById('hs-order')?.value || 'zero';

    // 4. Storage conditions (single or chain)
    let T_store = 25, RH_out = 65;
    const isChain = document.getElementById('hs-cond-chain')?.style.display !== 'none';

    if (isChain) {
      let totD = 0, wT = 0, wRH = 0;
      document.querySelectorAll('#hs-chain-rows tr').forEach(r => {
        const d = parseFloat(r.querySelector('.hs-cd')?.value) || 0;
        wT  += (parseFloat(r.querySelector('.hs-ct')?.value) || 0) * d;
        wRH += (parseFloat(r.querySelector('.hs-cr')?.value) || 0) * d;
        totD += d;
      });
      if (totD > 0) {
        T_store = wT / totD;
        RH_out  = wRH / totD;
      }
    } else {
      T_store = parseFloat(document.getElementById('hs-temp')?.value) || 25;
      RH_out  = parseFloat(document.getElementById('hs-rh-ext')?.value) || 65;
    }

    // 5. Thermal acceleration (Arrhenius or Q10)
    const Ea_val = parseFloat(document.getElementById('hs-ea')?.value) || (prod.Ea ? prod.Ea / 1000 : 60);
    const Q10_val = parseFloat(document.getElementById('hs-q10')?.value) || (prod.Q10 || 2.0);
    const eaRaw   = document.getElementById('hs-ea')?.value;
    const q10Raw  = document.getElementById('hs-q10')?.value;
    const eaNum   = parseFloat(eaRaw);
    const q10Num  = parseFloat(q10Raw);

    let accel = 1;
    if (!isNaN(eaNum) && eaNum > 0 && !(q10Num > 0)) {
      const Ea_use = eaNum * 1000;
      accel = Math.exp(-(Ea_use / 8.314) * (1 / (T_store + 273.15) - 1 / 298.15));
    } else {
      const q10Use = (q10Num > 0) ? q10Num : (prod.Q10 || 2.0);
      accel = Math.pow(q10Use, (T_store - 25) / 10);
    }

    const effectiveRate = rateInput * accel;

    // 6. Run Euler integration
    const result = this._runSimulation({
      otrEff: effectiveRate, area: A, volume: V,
      o2Init: o2Init / 100, o2Limit: o2Limit / 100,
      kResp: kResp, productKg: W, respOrder: respOrder,
      pO2_ext: 0.2095, dt: 0.5, maxDays: parseFloat(document.getElementById('hs-days')?.value) || 365
    });

    this.renderResult(result, { o2Limit, isChain });
  },

  /** Internal simulation runner — Euler integration */
  _runSimulation(p) {
    let o2Frac = p.o2Init;
    const timeline = [];
    let shelfLifeDay = null;
    const steps = Math.ceil(p.maxDays / p.dt);

    for (let i = 0; i <= steps; i++) {
      const t = i * p.dt;
      const pO2_int = o2Frac;

      // O₂ ingress with driving force correction
      const otrEff = p.otrEff * p.area * Math.max(0, p.pO2_ext - pO2_int) / p.pO2_ext;

      // Product O₂ consumption
      let resp = 0;
      if (p.respOrder === 'zero') {
        resp = p.kResp * p.productKg;
      } else {
        resp = p.kResp * p.productKg * pO2_int;
      }

      // Net change
      const dVol = (otrEff - resp) * p.dt;
      const dFrac = dVol / p.volume;  // 1 cm³ ≈ 1 mL at STP
      o2Frac = Math.max(0, Math.min(1, o2Frac + dFrac));

      // Record every full day
      if (i % 2 === 0) {
        timeline.push({ t: t, o2: o2Frac * 100 });
      }

      // Detect shelf-life limit crossing
      if (shelfLifeDay === null) {
        if (p.o2Init <= p.o2Limit && o2Frac * 100 >= p.o2Limit * 100) shelfLifeDay = t;
        if (p.o2Init >  p.o2Limit && o2Frac * 100 <= p.o2Limit * 100) shelfLifeDay = t;
      }
    }

    return {
      timeline: timeline,
      shelfLifeDay: shelfLifeDay,
      finalO2: o2Frac * 100
    };
  },

  // ------------------------------------------------------------------
  // 📊 RESULT RENDERING & CHARTS
  // ------------------------------------------------------------------

  /** Render the main result panel */
  renderResult(res, ctx) {
    const panel = document.getElementById('hs-result-panel');
    if (!panel) return;

    const months = res.shelfLifeDay !== null ? res.shelfLifeDay / 30.44 : null;
    const years  = res.shelfLifeDay !== null ? res.shelfLifeDay / 365.25 : null;
    const daysStr = res.shelfLifeDay !== null
      ? (typeof formatWithSigFigs === 'function' ? formatWithSigFigs(res.shelfLifeDay, 3) : res.shelfLifeDay.toFixed(1))
      : '> ' + ctx.o2Limit + '% limit not reached';

    panel.innerHTML = `
    <div style="animation:fadeIn 0.3s ease">
      <div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);border-radius:12px;margin-bottom:1rem">
        <div style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1.2">${daysStr} Days</div>
        ${months !== null ? `<div style="font-size:0.85rem;color:var(--text-light);margin-top:0.4rem;font-weight:500">≈ ${months.toFixed(1)} Months · ≈ ${years.toFixed(2)} Years</div>` : ''}
        <span class="badge badge-blue" style="margin-top:0.5rem">Headspace O₂ Evolution</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem">
        <div style="background:#f8fafc;padding:0.75rem;border-radius:8px;text-align:center">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.25rem">Final O₂</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--primary)">${res.finalO2.toFixed(1)}%</div>
        </div>
        <div style="background:#f8fafc;padding:0.75rem;border-radius:8px;text-align:center">
          <div style="font-size:0.7rem;color:var(--text-light);margin-bottom:0.25rem">Limit</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--danger)">${ctx.o2Limit}%</div>
        </div>
      </div>
    </div>`;

    // Trigger chart rendering
    const chartsContainer = document.getElementById('hs-charts-container');
    if (chartsContainer) {
      chartsContainer.style.display = 'block';
      requestAnimationFrame(() => { setTimeout(() => this.drawCharts(res, ctx), 100); });
    }

    // Logistics charts if chain mode
    const logisticsContainer = document.getElementById('hs-logistics-charts');
    if (logisticsContainer) {
      logisticsContainer.style.display = ctx.isChain ? 'block' : 'none';
      if (ctx.isChain) {
        requestAnimationFrame(() => { setTimeout(() => this.drawLogisticsCharts(res), 150); });
      }
    }
  },

  /** Draw main charts: O₂ Evolution + Temperature Sensitivity */
  drawCharts(res, ctx) {
    // Cleanup existing charts
    if (typeof destroyChart === 'function') {
      destroyChart('hsDecay');
      destroyChart('hsTemp');
    }

    // O₂ Evolution Chart
    const ctx1 = document.getElementById('hsDecayChart')?.getContext('2d');
    if (ctx1 && res.timeline?.length > 1 && typeof Chart !== 'undefined') {
      if (!window.chartInstances) window.chartInstances = {};
      window.chartInstances.hsDecay = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: res.timeline.map(h => h.t),
          datasets: [
            {
              label: 'Headspace O₂ (%)',
              data: res.timeline.map(h => h.o2),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,0.1)',
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              borderWidth: 2
            },
            {
              label: 'Shelf-life Limit',
              data: new Array(res.timeline.length).fill(ctx.o2Limit),
              borderColor: '#ef4444',
              borderDash: [6, 4],
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
          },
          scales: {
            x: { title: { display: true, text: 'Days' }, ticks: { font: { size: 9 } } },
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: 'O₂ Concentration (%)' },
              ticks: { font: { size: 9 }, callback: v => v + '%' }
            }
          }
        }
      });
    }

    // Temperature Sensitivity Chart
    const ctx2 = document.getElementById('hsTempChart')?.getContext('2d');
    if (ctx2 && typeof Chart !== 'undefined') {
      const Ea_kJ = parseFloat(document.getElementById('hs-ea')?.value) || 60;
      const Q10 = parseFloat(document.getElementById('hs-q10')?.value) || 2.0;
      const A = parseFloat(document.getElementById('hs-area')?.value) || 0.1;
      const V = parseFloat(document.getElementById('hs-vol')?.value) || 200;
      const W = parseFloat(document.getElementById('hs-prodkg')?.value) || 0.25;
      const baseRate = this._getActiveRate() || 0.5;
      const o2Init = parseFloat(document.getElementById('hs-o2init')?.value) || 21;
      const o2Limit = parseFloat(document.getElementById('hs-o2limit')?.value) || 1;
      const kResp = parseFloat(document.getElementById('hs-kresp')?.value) || 0;
      const respOrder = document.getElementById('hs-order')?.value || 'zero';

      const temps = Array.from({ length: 36 }, (_, i) => 15 + i);
      const daysArr = temps.map(T => {
        const eaIn = document.getElementById('hs-ea')?.value;
        const q10In = document.getElementById('hs-q10')?.value;
        const eaNum2 = parseFloat(eaIn);
        const q10Num2 = parseFloat(q10In);

        let acc = 1;
        if (!isNaN(eaNum2) && eaNum2 > 0 && !(q10Num2 > 0)) {
          acc = Math.exp(-(eaNum2 * 1000 / 8.314) * (1 / (T + 273.15) - 1 / 298.15));
        } else {
          const q10Use = (q10Num2 > 0) ? q10Num2 : Q10;
          acc = Math.pow(q10Use, (T - 25) / 10);
        }

        const effRate = baseRate * acc;
        // Quick estimate: days to reach limit
        const pO2_ext = 0.2095;
        const o2InitFrac = o2Init / 100;
        const o2LimitFrac = o2Limit / 100;

        if (respOrder === 'zero') {
          // Simplified: constant consumption
          const netRate = effRate * A * (pO2_ext - (o2InitFrac + o2LimitFrac)/2) / pO2_ext - kResp * W;
          if (netRate <= 0) return Infinity;
          const deltaO2 = Math.abs(o2LimitFrac - o2InitFrac) * V;
          return deltaO2 / netRate;
        } else {
          // First-order: more complex, use approximation
          return 365; // placeholder
        }
      });

      if (!window.chartInstances) window.chartInstances = {};
      window.chartInstances.hsTemp = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: temps,
          datasets: [{
            label: 'Shelf Life vs Temp',
            data: daysArr,
            borderColor: '#8b5cf6',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Storage °C' } },
            y: { title: { display: true, text: 'Days' } }
          }
        }
      });
    }
  },

  /** Draw logistics chain charts */
  drawLogisticsCharts(res) {
    if (typeof destroyChart === 'function') {
      destroyChart('hsChain');
      destroyChart('hsCumulative');
    }

    const rows = document.querySelectorAll('#hs-chain-rows tr');
    if (!rows.length) return;

    // Conditions Chart (Temp + RH per step)
    const ctx1 = document.getElementById('hsChainChart')?.getContext('2d');
    if (ctx1 && typeof Chart !== 'undefined') {
      const labels = [], temps = [], rhs = [];
      rows.forEach(r => {
        labels.push(r.querySelector('input[type="text"]')?.value || 'Step');
        temps.push(parseFloat(r.querySelector('.hs-ct')?.value) || 0);
        rhs.push(parseFloat(r.querySelector('.hs-cr')?.value) || 0);
      });

      if (!window.chartInstances) window.chartInstances = {};
      window.chartInstances.hsChain = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Temperature (°C)', data: temps, backgroundColor: 'rgba(37,99,235,0.7)', yAxisID: 'y' },
            { label: 'RH (%)', data: rhs, backgroundColor: 'rgba(239,68,68,0.7)', yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
          scales: {
            y: { position: 'left', title: { display: true, text: '°C' } },
            y1: { position: 'right', title: { display: true, text: 'RH %' } }
          }
        }
      });
    }

    // Cumulative Timeline Chart
    const ctx2 = document.getElementById('hsCumulativeChart')?.getContext('2d');
    if (ctx2 && typeof Chart !== 'undefined') {
      let cum = 0;
      const cumDays = [], cumLabels = [];
      rows.forEach((r, i) => {
        const d = parseFloat(r.querySelector('.hs-cd')?.value) || 0;
        cum += d;
        cumDays.push(cum);
        cumLabels.push(r.querySelector('input[type="text"]')?.value || `Step ${i + 1}`);
      });

      if (!window.chartInstances) window.chartInstances = {};
      window.chartInstances.hsCumulative = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: cumLabels,
          datasets: [{
            label: 'Cumulative Days',
            data: cumDays,
            borderColor: '#16a34a',
            fill: true,
            tension: 0.3,
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { title: { display: true, text: 'Days' } } }
        }
      });
    }
  },

  // ------------------------------------------------------------------
  // 📄 PDF EXPORT (aligned with SL.exportToPDF)
  // ------------------------------------------------------------------

  async exportToPDF(event) {
    const PDFLib = window.jspdf?.jsPDF || window.jspdf?.default || window.jsPDF;
    if (typeof PDFLib !== 'function') { alert('PDF library missing. Reload page.'); return; }
    if (typeof html2canvas !== 'function') { alert('Chart library missing. Reload page.'); return; }

    const btn = event?.target?.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generating PDF...'; }

    try {
      // Gather data
      const prodKey = document.getElementById('hs-product')?.value;
      const prod = HS_PRESETS[prodKey];
      const A = parseFloat(document.getElementById('hs-area')?.value) || 0.1;
      const V = parseFloat(document.getElementById('hs-vol')?.value) || 200;
      const W = parseFloat(document.getElementById('hs-prodkg')?.value) || 0.25;
      const o2Init = parseFloat(document.getElementById('hs-o2init')?.value) || 21;
      const o2Limit = parseFloat(document.getElementById('hs-o2limit')?.value) || 1;
      const T_store = parseFloat(document.getElementById('hs-temp')?.value) || 25;
      const Ea = parseFloat(document.getElementById('hs-ea')?.value) || 60;
      const Q10 = parseFloat(document.getElementById('hs-q10')?.value) || 2.0;
      const isChain = document.getElementById('hs-cond-chain')?.style.display !== 'none';
      const genDate = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
      const genISO = new Date().toISOString().slice(0, 10);

      // PDF init
      const pdf = new PDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const PW = 210, PH = 297, ML = 15, MR = 15, CW = PW - ML - MR;
      const C = {
        blue: [37, 99, 235], blueDark: [30, 64, 175], blueLight: [239, 246, 255],
        green: [22, 163, 74], greenL: [240, 253, 244],
        amber: [217, 119, 6], amberL: [255, 251, 235],
        red: [220, 38, 38], redL: [254, 242, 242],
        slate: [71, 85, 105], slateL: [248, 250, 252],
        border: [226, 232, 240], white: [255, 255, 255], black: [15, 23, 42]
      };
      let y = 0, pageNum = 0;
      const safe = s => String(s || '').replace(/[^\x20-\x7E]/g, '');

      const drawFooter = () => {
        pdf.setFillColor(...C.blueDark);
        pdf.rect(0, PH - 10, PW, 10, 'F');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.white);
        pdf.text('MAP / O₂ Evolution  |  wvtr-otr-calculator.com  |  For R&D use only', ML, PH - 3.5);
        pdf.text('Page ' + pdf.internal.getNumberOfPages(), PW - MR, PH - 3.5, { align: 'right' });
        pdf.setTextColor(...C.black);
      };

      const newPage = () => {
        if (pageNum > 0) drawFooter();
        pdf.addPage();
        pageNum++;
        y = ML;
      };

      const sectionTitle = (title, color = C.blue) => {
        y += 4;
        pdf.setFillColor(...color);
        pdf.rect(ML, y, 3, 6, 'F');
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...color);
        pdf.text(safe(title), ML + 5, y + 4.5);
        pdf.setTextColor(...C.black);
        y += 10;
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.3);
        pdf.line(ML, y - 2, PW - MR, y - 2);
        y += 2;
      };

      const kpiBox = (x, bw, bh, label, value, unit2, color, colorL) => {
        pdf.setFillColor(...colorL);
        pdf.setDrawColor(...color);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(x, y, bw, bh, 2, 2, 'FD');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.slate);
        pdf.text(safe(label), x + bw / 2, y + 5, { align: 'center' });
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...color);
        pdf.text(safe(value), x + bw / 2, y + 13, { align: 'center' });
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.slate);
        pdf.text(safe(unit2), x + bw / 2, y + 18, { align: 'center' });
        pdf.setTextColor(...C.black);
      };

      // PAGE 1 — COVER
      pageNum++;
      pdf.setFillColor(...C.blueDark);
      pdf.rect(0, 0, PW, 55, 'F');
      pdf.setFillColor(...C.blue);
      pdf.rect(0, 40, PW, 18, 'F');

      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...C.white);
      pdf.text('Headspace O₂ Analysis Report', ML, 22);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(186, 210, 255);
      pdf.text(safe(prod?.name || '—'), ML, 32);

      pdf.setFillColor(...C.white);
      pdf.roundedRect(PW - MR - 38, 8, 38, 10, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...C.blue);
      pdf.text('O₂ Model', PW - MR - 19, 14.5, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...C.white);
      pdf.text('Generated: ' + genDate + '  |  ' + (isChain ? 'Logistics Chain Mode' : 'Single Condition Mode'), ML, 50);
      pdf.setTextColor(...C.black);

      y = 65;

      // KPI boxes
      const kpiW = (CW - 9) / 4;
      const kpiH = 22;
      kpiBox(ML, kpiW, kpiH, 'SHELF LIFE', '—', 'Days', C.blue, C.blueLight);
      kpiBox(ML+kpiW+3, kpiW, kpiH, 'TEMPERATURE', T_store.toFixed(1)+'°C', 'Storage', C.amber, C.amberL);
      kpiBox(ML+kpiW*2+6, kpiW, kpiH, 'HEADSPACE', V.toFixed(0), 'mL', C.green, C.greenL);
      kpiBox(ML+kpiW*3+9, kpiW, kpiH, 'PRODUCT', safe(prod?.name?.split(' ')[0] || '—'), safe(prod?.type || '—'), C.slate, C.slateL);
      y += kpiH + 8;

      // Input parameters
      sectionTitle('Input Parameters');
      const pCols = ['Parameter', 'Value', 'Parameter', 'Value'];
      const pW = [45, 35, 45, 35];
      // Simple table header
      pdf.setFillColor(...C.blue);
      let cx = ML;
      pCols.forEach((col, i) => {
        pdf.rect(cx, y, pW[i], 7, 'F');
        cx += pW[i];
      });
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...C.white);
      cx = ML;
      pCols.forEach((col, i) => {
        pdf.text(safe(col), cx + 2, y + 4.8);
        cx += pW[i];
      });
      pdf.setTextColor(...C.black);
      y += 7;

      const params = [
        ['Initial O₂', o2Init + ' %', 'O₂ Limit', o2Limit + ' %'],
        ['Resp. Rate (k)', (parseFloat(document.getElementById('hs-kresp')?.value)||0).toFixed(2) + ' cm³/kg·day', 'Resp. Order', document.getElementById('hs-order')?.value || 'zero'],
        ['Surface Area', A.toFixed(4) + ' m²', 'Product Mass', W.toFixed(2) + ' kg'],
        ['Activation Energy', Ea + ' kJ/mol', 'Q₁₀ Factor', Q10.toFixed(2)],
        ['Film OTR', (this._getActiveRate()||0).toFixed(4) + ' cm³/m²·day', 'Condition Mode', isChain ? 'Logistics Chain' : 'Single'],
      ];
      params.forEach((row, idx) => {
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.2);
        let cx2 = ML;
        pW.forEach((w, i) => {
          pdf.rect(cx2, y, w, 6.5, 'S');
          pdf.setFontSize(7.5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...C.black);
          pdf.text(safe(row[i] || '—'), cx2 + 2, y + 4.5);
          cx2 += w;
        });
        y += 6.5;
      });
      y += 4;

      // Methodology summary
      if (y > PH - 60) { newPage(); } else { y += 2; }
      sectionTitle('Methodology Summary');
      const methodLines = [
        'Headspace O₂ evolution is simulated via Euler integration of the mass balance:',
        'dO₂/dt = (OTR_eff × A) − k_resp × W × f(O₂)',
        'where OTR_eff includes driving-force correction: (pO₂_ext − pO₂_int) / pO₂_ext.',
        'Thermal scaling applied via Arrhenius or Q₁₀ rule. Simulation stops when O₂ reaches the defined shelf-life limit.'
      ];
      methodLines.forEach(line => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.slate);
        pdf.text(safe(line), ML, y);
        y += 5;
      });
      pdf.setTextColor(...C.black);
      y += 3;

      drawFooter();

      // PAGES 2+ — CHARTS
      const chartConfigs = [
        { id: 'hsDecayChart', title: 'Headspace O₂ Evolution', desc: 'O₂ concentration (%) vs storage days. Shelf-life limit shown as dashed line.' },
        { id: 'hsTempChart', title: 'Shelf Life vs Temperature', desc: 'Predicted shelf life across temperature range 15–50°C.' },
        { id: 'hsChainChart', title: 'Logistics Chain Conditions', desc: 'Temperature and RH profile per supply chain step.' },
        { id: 'hsCumulativeChart', title: 'Cumulative Timeline', desc: 'Accumulated days across the full supply chain.' }
      ];

      for (let ci = 0; ci < chartConfigs.length; ci++) {
        const cfg = chartConfigs[ci];
        const canvas = document.getElementById(cfg.id);
        if (!canvas || canvas.offsetParent === null || canvas.width === 0) continue;

        newPage();
        sectionTitle(cfg.title);

        pdf.setFillColor(...C.slateL);
        pdf.setDrawColor(...C.border);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(ML, y, CW, 8, 1, 1, 'FD');
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.slate);
        pdf.text(safe(cfg.desc), ML + 3, y + 5.2);
        pdf.setTextColor(...C.black);
        y += 12;

        try {
          const cc = await html2canvas(canvas, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const img = cc.toDataURL('image/png');
          const maxH = PH - y - 30;
          const h = Math.min(CW * (cc.height / cc.width), maxH);
          pdf.setFillColor(...C.white);
          pdf.setDrawColor(...C.border);
          pdf.setLineWidth(0.4);
          pdf.roundedRect(ML - 1, y - 1, CW + 2, h + 2, 2, 2, 'FD');
          pdf.addImage(img, 'PNG', ML, y, CW, h);
          y += h + 6;
        } catch (e) {
          pdf.setFontSize(8);
          pdf.setTextColor(...C.slate);
          pdf.text('Chart not available for this configuration.', ML, y + 5);
          pdf.setTextColor(...C.black);
          y += 12;
        }
        drawFooter();
      }

      // FINAL PAGE — DISCLAIMER
      newPage();
      sectionTitle('Important Disclaimer & Model Limitations', C.red);

      const disclaimerSections = [
        {
          title: 'For Research & Development Use Only',
          body: 'This report and the underlying calculations are intended exclusively for internal R&D screening, packaging concept development, and educational purposes. Results must not be used as the sole basis for commercial shelf-life labeling, regulatory submissions, or product safety declarations.'
        },
        {
          title: 'Laboratory Validation Required',
          body: 'All predictive model outputs require independent validation through accredited laboratory testing. Relevant standards include: ASTM F1249 / ISO 15106-3 (Water Vapor), ASTM D3985 / ISO 15106-2 (Oxygen), ISO 18787 (Water Activity).'
        },
        {
          title: 'Model Assumptions & Limitations',
          body: 'The model assumes: (1) steady-state permeation through defect-free films; (2) ideal series resistance of laminate layers; (3) uniform, constant storage conditions; (4) no seal degradation or mechanical damage; (5) homogeneous product respiration. Real-world performance may deviate due to package geometry, seal integrity, humidity cycling, and supply chain variability.'
        },
        {
          title: 'Regulatory Compliance',
          body: 'This tool does not constitute regulatory advice. Commercial shelf-life declarations must comply with applicable regulations including EU Regulation 1169/2011 (food labeling), FDA 21 CFR Part 101 (US), and sector-specific guidelines. Consult a qualified food scientist before product launch.'
        }
      ];

      disclaimerSections.forEach((sec) => {
        if (y > PH - 45) { newPage(); }
        pdf.setFillColor(...C.redL);
        pdf.setDrawColor(...C.red);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(ML, y, CW, 7, 1, 1, 'FD');
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...C.red);
        pdf.text(safe(sec.title), ML + 3, y + 4.8);
        pdf.setTextColor(...C.black);
        y += 9;
        const bodyLines = pdf.splitTextToSize(safe(sec.body), CW - 4);
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...C.slate);
        bodyLines.forEach(line => {
          if (y > PH - 20) { newPage(); }
          pdf.text(line, ML + 2, y);
          y += 4.5;
        });
        pdf.setTextColor(...C.black);
        y += 5;
      });

      // Final stamp
      if (y > PH - 25) { newPage(); }
      pdf.setFillColor(...C.blueDark);
      pdf.roundedRect(ML, y, CW, 14, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...C.white);
      pdf.text('Report generated on ' + genDate + '  |  MAP / O₂ Evolution  |  wvtr-otr-calculator.com', ML + CW/2, y + 5.5, { align: 'center' });
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(186, 210, 255);
      pdf.text('Methodology aligned with ASTM F1249, ASTM D3985, ISO 15106', ML + CW/2, y + 10.5, { align: 'center' });
      pdf.setTextColor(...C.black);

      drawFooter();

      // Save
      const safeName = (prod?.name || 'HeadspaceReport').replace(/[^a-z0-9]+/gi, '_').slice(0, 30);
      pdf.save('HeadspaceO2_' + safeName + '_' + genISO + '.pdf');

    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF generation failed. Check console for details.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:0.4rem"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export Full Report (PDF)';
      }
    }
  }
};

// ====================================================================
// 📋 RENDER FUNCTIONS — Aligned with renderShelfLife pattern
// ====================================================================

/** Render the main Headspace Calculator page */
function renderHeadspace() {
  const currentRate = (State.calcResult?.total) ? State.calcResult.total.toFixed(6) : '';

  // Product options
  let prodOpts = '';
  for (const k in HS_PRESETS) {
    prodOpts += `<option value="${k}">${HS_PRESETS[k].label}</option>`;
  }

  const companyActive = typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive();

  return `
  <div class="grid grid-2" style="gap:1.2rem;align-items:start">

    <!-- === FORM INPUT (left column) === -->
    <div class="card" style="padding:0">

      <!-- Header -->
      <div style="padding:1rem;background:var(--bg);border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1rem;display:flex;align-items:center;gap:0.4rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          Modified Atmosphere
        </h2>
      </div>

      <!-- STEP 1: BARRIER RATE SOURCE -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 1. Film OTR Source
        </div>

        <!-- Source selector buttons -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;margin-bottom:0.75rem">
          <button id="hs-src-btn-calc" class="btn btn-sm" onclick="HS.setBarrierSource('calc')"
            style="font-size:0.75rem;background:var(--primary);color:#fff;border:none">From Calculator</button>
          <button id="hs-src-btn-db" class="btn btn-sm btn-outline" onclick="HS.setBarrierSource('db')"
            style="font-size:0.75rem">From Community DB</button>
          <button id="hs-src-btn-company" class="btn btn-sm btn-outline" onclick="HS.setBarrierSource('company')"
            style="font-size:0.75rem${companyActive ? '' : ';opacity:0.5;cursor:not-allowed'}"
            ${companyActive ? '' : 'disabled'}>From Company DB</button>
        </div>

        <!-- Panel: From Calculator -->
        <div id="hs-panel-calc">
          <div style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:0.6rem;font-size:0.75rem">
            <div style="font-weight:700;margin-bottom:0.15rem">${State.laminateName || 'No laminate calculated'}</div>
            <div style="color:var(--text-light);word-break:break-word;margin-bottom:0.3rem;min-height:1.2em">
              ${(State.layers?.filter(l => l.mid !== null && l.thick > 0).map(l => {
                const mat = DB.materials?.find(m => m.id === l.mid);
                return mat ? `${mat.name} (${l.thick}µm)` : null;
              }).filter(Boolean).join(' / ') || '—')}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>Calculated OTR:</span>
              <strong style="color:var(--primary)">${currentRate || '-'} cm³/m²·day</strong>
            </div>
          </div>
        </div>

        <!-- Panel: Community DB -->
        <div id="hs-panel-db" style="display:none">
          <div class="form-group" style="margin:0">
            <label style="font-size:0.75rem;font-weight:600">Select from Community DB</label>
            <select class="form-input" id="hs-db-lam-pick" onchange="HS.onDBLaminatePick?.(this.value)" style="font-size:0.78rem">
              <option value="">Loading...</option>
            </select>
          </div>
        </div>

        <!-- Panel: Company DB -->
        <div id="hs-panel-company" style="display:none">
          ${companyActive
            ? '<div class="form-group" style="margin:0"><label style="font-size:0.75rem;font-weight:600">Select from Company Laminates</label><select class="form-input" id="hs-co-lam-pick" onchange="HS.onCompanyLaminatePick?.(this.value)" style="font-size:0.78rem"><option value="">Loading...</option></select></div>'
            : '<div style="font-size:0.75rem;color:var(--text-light);padding:0.4rem 0">Join a company to access company laminates. <a href="#" onclick="showCompanyModal?.();return false" style="color:var(--primary)">Join now</a></div>'
          }
        </div>

        <!-- Manual override toggle -->
        <div style="margin-top:0.8rem;padding-top:0.6rem;border-top:1px dashed var(--border)">
          <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.75rem;color:var(--text-light)">
            <input type="checkbox" id="hs-manual-toggle" onchange="HS.toggleManualOverride(this.checked)">
            Override with manual OTR value
          </label>
        </div>

        <!-- Manual input panel -->
        <div id="hs-panel-manual" style="display:none;margin-top:0.5rem;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:0.6rem">
          <div style="font-size:0.72rem;font-weight:600;color:var(--text-light);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em">
            Manual input
          </div>
          <div class="grid grid-2" style="gap:0.5rem">
            <div class="form-group" style="margin:0">
              <label>OTR Value (cm³/m²·day)</label>
              <input type="number" id="hs-rate-manual" value="1.0" step="any" class="form-input" oninput="HS.onManualRateChange()">
            </div>
            <div class="form-group" style="margin:0">
              <label>Test Temperature (°C)</label>
              <input type="number" id="hs-rate-temp" value="23" class="form-input">
            </div>
            <div class="form-group" style="margin:0;grid-column:1/-1">
              <label>Test Humidity (%RH)</label>
              <input type="number" id="hs-rate-hum" value="50" class="form-input">
            </div>
          </div>
        </div>

        <!-- Active rate summary -->
        <div style="margin-top:0.8rem;background:var(--primary-light);border-radius:6px;padding:0.5rem 0.75rem;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.75rem;font-weight:600">Active OTR:</span>
          <strong id="hs-active-rate" style="color:var(--primary);font-size:0.9rem">${currentRate || '-'} cm³/m²·day</strong>
        </div>
      </div>

      <!-- STEP 2: THERMAL ACCELERATION -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 2. Thermal Acceleration
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:0.75rem">
          <div class="grid grid-2" style="gap:0.5rem;align-items:start">
            <div class="form-group" style="margin:0">
              <label>Activation Energy Eₐ (kJ/mol)</label>
              <div style="display:flex;gap:0.4rem;align-items:center">
                <input type="number" id="hs-ea" value="" step="0.1" class="form-input"
                  placeholder="Auto or 60" oninput="HS.onEaInput()" style="flex:1">
              </div>
            </div>
            <div class="form-group" style="margin:0">
              <label>Q₁₀ Factor</label>
              <input type="number" id="hs-q10" value="" step="0.1" class="form-input" placeholder="Auto or 2.0" oninput="HS.onQ10Input()">
            </div>
          </div>
          <div style="font-size:0.65rem;color:var(--text-light);margin-top:0.3rem" id="hs-ea-q10-hint">
            Leave empty to use product default.
          </div>
        </div>
      </div>

      <!-- STEP 3: PACKAGING DIMENSIONS -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--warning);font-weight:600;font-size:0.85rem">
          ▼ 3. Packaging Geometry
        </div>
        <div style="margin-bottom:0.5rem">
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.8rem;font-weight:500">
            <input type="radio" name="hs-pkg-geom" value="auto" checked onchange="HS.togglePkgMode()">
            Calculate from shape
          </label>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.8rem;font-weight:500;margin-top:0.2rem">
            <input type="radio" name="hs-pkg-geom" value="manual" onchange="HS.togglePkgMode()">
            Enter area manually
          </label>
        </div>

        <!-- Geometry selector -->
        <div id="hs-geom-selector" class="grid grid-2" style="margin-top:0.5rem;gap:0.4rem;align-items:start">
          <div class="form-group" style="margin:0">
            <label>Shape Type</label>
            <select class="form-input" id="hs-shape" onchange="HS.onPkgChange()">
              <option value="flat">Flat Pouch</option>
              <option value="standup">Stand-Up Pouch</option>
              <option value="flow">Flow Pack</option>
              <option value="box">Rectangular Box</option>
              <option value="cylinder">Cylindrical Jar</option>
              <option value="tray">Tray with Lid</option>
              <option value="bottle">Bottle</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label>Welding Margin (cm)</label>
            <input type="number" id="hs-margin" value="2" step="0.5" class="form-input" onchange="HS.calcArea()">
          </div>
        </div>

        <!-- Dimension inputs -->
        <div id="hs-dims-selector" style="margin-top:0.4rem">
          <div id="hs-dims-pouch" class="grid grid-2" style="gap:0.4rem">
            <div class="form-group" style="margin:0"><label>Width L (cm)</label><input type="number" id="hs-w" value="12" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Height H (cm)</label><input type="number" id="hs-h" value="17" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Depth / Diameter (cm)</label><input type="number" id="hs-d" value="0" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
          </div>
          <div id="hs-dims-bottle" class="grid grid-2" style="gap:0.4rem;display:none">
            <div class="form-group" style="margin:0"><label>Body Radius (cm)</label><input type="number" id="hs-bottle-body-r" value="3.5" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Body Height (cm)</label><input type="number" id="hs-bottle-body-h" value="16" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Neck Radius (cm)</label><input type="number" id="hs-bottle-neck-r" value="1.2" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0"><label>Neck Height (cm)</label><input type="number" id="hs-bottle-neck-h" value="4" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
            <div class="form-group" style="margin:0;grid-column:1/-1"><label>Shoulder Height (cm)</label><input type="number" id="hs-bottle-shoulder-h" value="2.5" step="0.1" class="form-input" oninput="HS.calcArea()"></div>
          </div>
        </div>

        <!-- Manual area input -->
        <div id="hs-manual-area-input" style="display:none;margin-top:0.5rem">
          <div class="form-group" style="margin:0">
            <label>Total Surface Area (m²)</label>
            <input type="number" id="hs-area-manual" value="0.06" step="0.001" class="form-input" oninput="HS.updateManualArea()">
          </div>
        </div>

        <!-- Area summary -->
        <div style="margin-top:0.5rem;display:flex;justify-content:space-between;align-items:center;background:var(--primary-light);padding:0.4rem;border-radius:6px">
          <span style="font-size:0.75rem;font-weight:500">→ Effective Area:</span>
          <strong id="hs-area-display" style="color:var(--primary)">0.0600 m²</strong>
        </div>
        <input type="hidden" id="hs-area" value="0.06">
      </div>

      <!-- STEP 4: PRODUCT & HEADSPACE -->
      <div style="padding:1rem;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--purple);font-weight:600;font-size:0.85rem">
          ▼ 4. Product & Headspace
        </div>
        <div class="form-group" style="margin:0">
          <label>Product Preset</label>
          <select id="hs-product" class="form-input" onchange="HS.onProductChange()">${prodOpts}</select>
        </div>
        <div class="grid grid-2" style="gap:0.5rem;margin-top:0.5rem">
          <div class="form-group" style="margin:0"><label>Headspace Volume (mL)</label><input type="number" id="hs-vol" value="200" class="form-input"></div>
          <div class="form-group" style="margin:0"><label>Product Mass (kg)</label><input type="number" id="hs-prodkg" value="0.25" step="0.01" class="form-input"></div>
          <div class="form-group" style="margin:0"><label>Initial O₂ (%)</label><input type="number" id="hs-o2init" value="21" class="form-input" oninput="HS.drawO2SafeZone()"></div>
          <div class="form-group" style="margin:0"><label>O₂ Shelf-life Limit (%)</label><input type="number" id="hs-o2limit" value="1" class="form-input" oninput="HS.drawO2SafeZone()"></div>
          <div class="form-group" style="margin:0"><label>Resp. Rate k (cm³/kg·day)</label><input type="number" id="hs-kresp" value="5" step="0.1" class="form-input"></div>
          <div class="form-group" style="margin:0">
            <label>Respiration Order</label>
            <select id="hs-order" class="form-input">
              <option value="zero">Zero-order (constant)</option>
              <option value="first">First-order (∝ O₂)</option>
            </select>
          </div>
        </div>

        <!-- O₂ Safe Zone Visualization -->
        <div style="margin-top:0.8rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.2rem">
            <span style="font-size:0.7rem;font-weight:600">O₂ Limit</span>
            <span id="hs-o2limit-val" style="font-size:0.7rem;color:var(--text-light)">1%</span>
          </div>
          <div style="position:relative;height:20px;background:#e2e8f0;border-radius:4px;overflow:hidden">
            <div id="hs-safe-green" style="position:absolute;left:0;top:0;bottom:0;background:var(--success);width:5%"></div>
            <div id="hs-safe-now" style="position:absolute;left:21%;top:-2px;bottom:-2px;width:2px;background:#fff;z-index:2"></div>
            <div id="hs-safe-crit" style="position:absolute;right:0;top:-2px;bottom:-2px;width:2px;background:var(--danger);z-index:2"></div>
          </div>
          <div style="font-size:0.65rem;color:var(--text-light);margin-top:0.3rem">
            Green zone = acceptable O₂ range. White marker = current initial O₂.
          </div>
        </div>
      </div>

      <!-- STEP 5: STORAGE & CALCULATE -->
      <div style="padding:1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;color:var(--primary);font-weight:600;font-size:0.85rem">
          ▼ 5. Storage Conditions
        </div>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">
          <button class="btn btn-sm" id="hs-btn-single" style="flex:1;background:var(--primary);color:#fff" onclick="HS.toggleCond('single')">Single Condition</button>
          <button class="btn btn-sm" id="hs-btn-chain" style="flex:1;background:var(--bg);color:var(--text-light)" onclick="HS.toggleCond('chain')">Logistics Chain</button>
        </div>

        <!-- Single condition inputs -->
        <div id="hs-cond-single">
          <div class="grid grid-2" style="gap:0.5rem">
            <div class="form-group" style="margin:0"><label>Storage Temp (°C)</label><input type="number" id="hs-temp" value="25" class="form-input"></div>
            <div class="form-group" style="margin:0"><label>External RH (%)</label><input type="number" id="hs-rh-ext" value="65" class="form-input"></div>
          </div>
        </div>

        <!-- Logistics chain table -->
        <div id="hs-cond-chain" style="display:none">
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:separate;border-spacing:0 5px;font-size:0.9rem">
              <thead>
                <tr>
                  <th style="padding:0.6rem 0.5rem;text-align:left;font-weight:600;width:35%">Step</th>
                  <th style="padding:0.6rem 0.3rem;text-align:center;font-weight:600;width:18%">°C</th>
                  <th style="padding:0.6rem 0.3rem;text-align:center;font-weight:600;width:18%">RH%</th>
                  <th style="padding:0.6rem 0.3rem;text-align:center;font-weight:600;width:18%">Days</th>
                  <th style="padding:0.6rem 0.3rem;width:40px"></th>
                </tr>
              </thead>
              <tbody id="hs-chain-rows">
                <tr style="background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
                  <td style="padding:0.5rem"><input type="text" value="Factory" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fafbfc"></td>
                  <td style="padding:0.5rem"><input type="number" value="22" class="hs-ct" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem"><input type="number" value="50" class="hs-cr" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem"><input type="number" value="2" class="hs-cd" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem;text-align:center"><span style="cursor:pointer;color:var(--danger);font-size:1.2rem;line-height:1" onclick="this.closest('tr').remove()">✕</span></td>
                </tr>
                <tr style="background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
                  <td style="padding:0.5rem"><input type="text" value="Transit" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fafbfc"></td>
                  <td style="padding:0.5rem"><input type="number" value="35" class="hs-ct" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem"><input type="number" value="85" class="hs-cr" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem"><input type="number" value="14" class="hs-cd" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
                  <td style="padding:0.5rem;text-align:center"><span style="cursor:pointer;color:var(--danger);font-size:1.2rem;line-height:1" onclick="this.closest('tr').remove()">✕</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-outline btn-full" style="margin-top:0.6rem;padding:0.6rem;font-size:0.85rem" onclick="HS.addChainRow()">+ Add Step</button>
        </div>

        <button class="btn btn-danger btn-full" onclick="HS.calculate()" style="margin-top:1rem;padding:0.8rem;font-size:0.9rem">
          ▶ Calculate Headspace O₂ Evolution
        </button>
      </div>
    </div>

    <!-- === RESULTS AREA (right column - sticky) === -->
    <div style="position:sticky;top:1rem;height:fit-content">
      <div class="card" id="hs-result-panel">
        <div style="text-align:center;padding:2rem;color:var(--text-light)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:0.5rem;opacity:0.3">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <p>Configure parameters and calculate to see O₂ evolution predictions</p>
        </div>
      </div>

      <!-- Charts containers (shown after calculation) -->
      <div id="hs-charts-container" style="display:none;margin-top:1rem">
        <div class="card" style="margin-bottom:1rem">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Headspace O₂ Evolution</h3>
          <div class="chart-mini" style="height:260px"><canvas id="hsDecayChart"></canvas></div>
        </div>
        <div class="card">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Shelf Life vs Temperature</h3>
          <div class="chart-mini" style="height:260px"><canvas id="hsTempChart"></canvas></div>
        </div>
      </div>

      <!-- Logistics charts (shown only for chain mode) -->
      <div id="hs-logistics-charts" style="display:none;margin-top:0.8rem">
        <div class="card"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Logistics Conditions</h3><div class="chart-mini" style="height:220px"><canvas id="hsChainChart"></canvas></div></div>
        <div class="card" style="margin-top:0.5rem"><h3 style="font-size:0.9rem;font-weight:600;margin-bottom:0.5rem">Cumulative Timeline</h3><div class="chart-mini" style="height:200px"><canvas id="hsCumulativeChart"></canvas></div></div>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      var btn = document.getElementById('hs-src-btn-company');
      if (btn && typeof CompanyState !== 'undefined' && CompanyState.isActive && CompanyState.isActive()) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }, 500);
  </script>

  <!-- EXPORT BUTTON (full width) -->
  <div class="card" style="margin-top:1.2rem;text-align:center">
    <button class="btn btn-primary btn-full" onclick="HS.exportToPDF(event)" style="padding:0.7rem;font-size:0.85rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:0.4rem">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Export Full Report (PDF)
    </button>
    <p style="font-size:0.7rem;color:var(--text-light);margin-top:0.4rem">
      Includes: laminate structure, parameters, O₂ evolution charts & methodology
    </p>
  </div>

  ${renderHeadspaceMethodology()}
  `;
}

/** Render methodology section (textbook style, aligned with shelflife.js) */
function renderHeadspaceMethodology() {
  return `
<div class="card" style="margin-top:1rem; border-left:4px solid var(--primary); background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
  <div style="padding:1.2rem 1.5rem;">
    <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.3rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1.2rem;">
      Mechanics of Headspace O₂ Evolution
    </h2>
    <div style="font-size:0.95rem; line-height:1.8; color:#334155; font-family:Georgia, 'Times New Roman', serif;">

      <p>Understanding how oxygen concentration evolves inside a sealed food package is fundamental to predicting shelf life, preventing spoilage, and designing effective modified atmosphere packaging (MAP). This calculator models the dynamic balance between two opposing fluxes: oxygen entering through the packaging film, and oxygen being consumed by the product itself.</p>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:1.5rem; font-weight:700;">The Core Balance: Ingress vs. Consumption</h3>
      <p>At any moment in time, the rate of change of oxygen in the headspace is governed by a simple mass balance:</p>

      <div style="background:var(--primary-light); padding:0.9rem 1.1rem; border-radius:8px; border-left:3px solid var(--primary); margin:1rem 0; font-family:sans-serif; font-size:0.92rem; line-height:1.6;">
        <strong>General Equation:</strong><br>
        dO₂/dt = (O₂ ingress through film) − (O₂ consumption by product)
      </div>

      <p>The ingress term depends on the film's oxygen transmission rate (OTR), the package surface area, and critically the driving force created by the difference in oxygen partial pressure between the external atmosphere and the headspace itself. As the internal O₂ concentration changes, so does this driving force, making the system inherently non-linear.</p>

      <div style="background:#f8fafc; padding:1rem 1.2rem; border-radius:6px; font-family:monospace; font-size:0.9rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a; line-height:1.7;">
        OTR<sub>eff</sub> = OTR<sub>film</sub> × A × (pO₂<sub>ext</sub> − pO₂<sub>int</sub>) / pO₂<sub>ext</sub>
      </div>

      <p>The consumption term reflects the product's respiration or oxidative activity. Two kinetic models are supported:</p>

      <ul style="margin:0.6rem 0 1rem 1.5rem; padding-left:0.5rem;">
        <li><strong>Zero-order:</strong> Consumption rate is constant, independent of O₂ concentration. Typical for fresh meats or products with enzyme limited respiration.</li>
        <li><strong>First-order:</strong> Consumption rate is proportional to the current O₂ concentration. Typical for fresh produce, where respiration slows as O₂ becomes limiting.</li>
      </ul>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Numerical Solution via Euler Integration</h3>
      <p>Because the driving force and (in first-order mode) the consumption rate both depend on the instantaneous O₂ concentration, the governing equation cannot be solved in closed form. Instead, the calculator uses a stepwise Euler integration:</p>

      <div style="background:#f0fdf4; padding:1rem 1.2rem; border-radius:8px; border-left:3px solid var(--success); margin:1.2rem 0; font-family:sans-serif; font-size:0.92rem; line-height:1.6;">
        <strong style="color:#16a34a; font-size:0.95rem;">💡 How the simulation works:</strong><br>
        <ol style="margin-top:0.5rem; margin-left:1rem; padding-left:0.5rem;">
          <li>Start with the initial O₂ fraction (e.g., 21% for air, 0% for N₂-flushed).</li>
          <li>At each time step (Δt = 0.5 days):
            <ul style="margin-left:1rem; margin-top:0.3rem;">
              <li>Compute effective OTR using current internal O₂</li>
              <li>Compute product consumption using current O₂ (if first-order)</li>
              <li>Update O₂ fraction: O₂<sub>new</sub> = O₂<sub>old</sub> + (ingress − consumption) × Δt / V</li>
            </ul>
          </li>
          <li>Record O₂ value at each full day for plotting.</li>
          <li>Stop when O₂ crosses the defined shelf-life limit.</li>
        </ol>
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Temperature Effects: Arrhenius & Q₁₀</h3>
      <p>Both film permeability and product respiration are temperature dependent. The calculator supports two widely used models for thermal acceleration:</p>

      <table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:2px solid var(--border);">
            <th style="padding:0.6rem; text-align:left; width:25%;">Model</th>
            <th style="padding:0.6rem; text-align:left; width:45%;">Equation</th>
            <th style="padding:0.6rem; text-align:left; width:30%;">When to Use</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:0.6rem; font-weight:bold; color:var(--primary-dark);">Arrhenius</td>
            <td style="font-family:monospace; font-size:0.85rem">k(T) = k₀ × exp[−Eₐ/R × (1/T − 1/T₀)]</td>
            <td>When activation energy Eₐ is known from literature or testing</td>
          </tr>
          <tr>
            <td style="padding:0.6rem; font-weight:bold; color:var(--purple);">Q₁₀ Rule</td>
            <td style="font-family:monospace; font-size:0.85rem">k(T) = k₀ × Q₁₀<sup>(T−T₀)/10</sup></td>
            <td>For rapid estimates when only a temperature coefficient is available</td>
          </tr>
        </tbody>
      </table>

      <p>When you enter a value for Eₐ, the Q₁₀ field is automatically disabled (and vice versa), ensuring a single, unambiguous thermal model is applied.</p>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Logistics Chain Mode</h3>
      <p>Real-world supply chains expose packages to varying temperature and humidity conditions. The Logistics Chain mode allows you to define multiple sequential steps each with its own duration, temperature, and relative humidity and computes a weighted-average storage condition for the simulation.</p>

      <div style="background:var(--warning-light); padding:0.85rem 1rem; border-radius:8px; border-left:3px solid var(--warning); margin:1rem 0; font-family:sans-serif; font-size:0.9rem; line-height:1.6;">
        <strong>⚠️ Important note:</strong> The current implementation uses a time-weighted average of temperature and RH across all chain steps. For more advanced modeling (e.g., stepwise simulation with dynamic OTR changes), a full transient solver would be required.
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Practical Example: Fresh Berries in MAP</h3>
      <p>Consider a 250 g clamshell of fresh strawberries with a headspace of 200 mL, packaged in a film with OTR = 30 cm³/m²·day at 23°C. The product respires at k = 30 cm³/kg·day (first-order), with an initial headspace O₂ of 21% and a shelf-life limit of 3% O₂.</p>

      <ul style="margin:0.5rem 0 1rem 1.5rem; padding-left:0.5rem;">
        <li><strong>Day 0:</strong> High driving force (21% external − 21% internal ≈ 0) → minimal ingress; high respiration → O₂ drops rapidly.</li>
        <li><strong>Day 3:</strong> Internal O₂ ≈ 8%; driving force increases → ingress rises; respiration slows (first-order) → net change moderates.</li>
        <li><strong>Day 7:</strong> Internal O₂ ≈ 3.2%; approaching limit; ingress ≈ consumption → system nears steady state.</li>
        <li><strong>Day 8:</strong> O₂ crosses 3% limit → shelf life estimated at ~7.5 days at 25°C.</li>
      </ul>

      <p>If storage temperature rises to 35°C, thermal acceleration (Q₁₀ = 2.5) increases both OTR and respiration by ~2.4×, shortening shelf life to ~3 days—highlighting the critical importance of cold-chain integrity.</p>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Standards Alignment & Limitations</h3>
      <p>The methodology aligns with key testing standards:</p>
      <p style="margin-left:1.2rem; color:var(--text-light); font-size:0.88rem; font-family:sans-serif;">
        • <strong>ASTM D3985 / ISO 15106-2:</strong> Oxygen transmission rate measurement<br>
        • <strong>ISO 18787:</strong> Water activity determination (relevant for coupled moisture/O₂ models)<br>
        • <strong>ASTM F1249:</strong> Water vapor transmission (for integrated WVTR/OTR design)
      </p>

      <div style="margin-top:2rem; padding:0.95rem 1.1rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif; line-height:1.6;">
        <strong>Disclaimer:</strong> This calculator provides indicative estimates for R&D screening and educational purposes. Predictive modeling does not replace real-time shelf-life testing. Commercial claims require validation per ISO 15106, ASTM standards, and applicable food safety regulations (e.g., EU 1169/2011, FDA 21 CFR). Consult a qualified packaging scientist before product launch.
      </div>

    </div>
  </div>
</div>
`;
}

// ====================================================================
// 🔄 LEGACY COMPATIBILITY WRAPPERS
// ====================================================================

// Keep old function names working for backward compatibility
function onHsPreset() { HS.onProductChange(); }
function onHsCalc() { HS.calculate(); }

// Optional: load laminate from DB (stub - implement if needed)
HS.onDBLaminatePick = function(val) {
  if (!val) return;
  // Placeholder: integrate with your laminate DB loader
  console.log('DB laminate selected:', val);
};

HS.onCompanyLaminatePick = async function(val) {
  if (!val) return;
  try {
    // Placeholder: integrate with your company laminate loader
    console.log('Company laminate selected:', val);
  } catch(e) {
    console.warn('Company laminate pick error:', e);
  }
};
// ====================================================================
// 🔧 GLOBAL EXPOSURE & DEBUG FALLBACK (temporaneo)
// ====================================================================

// Forza esposizione globale esplicita (per sicurezza)
if (typeof window !== 'undefined') {
  window.HS = HS;
  window.renderHeadspace = renderHeadspace;
  window.renderHeadspaceMethodology = renderHeadspaceMethodology;
  window.HS_PRESETS = HS_PRESETS;
}

// Debug: se State.tab è 'headspace' ma il renderer non è stato chiamato, forza manualmente
(function() {
  if (typeof State !== 'undefined' && State.tab === 'headspace') {
    setTimeout(function() {
      var content = document.getElementById('app-content');
      // Se il contenuto non contiene elementi specifici di headspace, forza re-render
      if (content && !content.querySelector('#hs-product') && !content.querySelector('#hs-result-panel')) {
        console.log('🔄 Headspace tab active but renderer not called — forcing renderHeadspace()');
        if (typeof renderHeadspace === 'function') {
          renderHeadspace();
        }
      }
    }, 200);
  }
})();
