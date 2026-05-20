// ====================================================================
// 🧪 SHELFLIFE.JS - Shelf Life Engine: PRODUCTS_DB + SL object
// ====================================================================

// ====================================================================
// 🥐 PRODUCTS DATABASE
// ====================================================================
const PRODUCTS_DB = {
  biscuits: {
    name: "Biscuits / Crackers", type: "moisture",
    M_init: 3, M_crit: 6, GAB: { M_m: 0.045, C: 12.5, K: 0.85 }, Ea: 60000
  },
  coffee: {
    name: "Ground Coffee", type: "moisture",
    M_init: 3, M_crit: 5, GAB: { M_m: 0.035, C: 15.0, K: 0.88 }, Ea: 55000
  },
  pasta: {
    name: "Dried Pasta", type: "moisture",
    M_init: 10, M_crit: 14, GAB: { M_m: 0.055, C: 10.0, K: 0.92 }, Ea: 45000
  },
  milk_powder: {
    name: "Milk Powder", type: "moisture",
    M_init: 2.5, M_crit: 4, GAB: { M_m: 0.028, C: 18.0, K: 0.82 }, Ea: 50000
  },
  chips: {
    name: "Potato Chips (Fried)", type: "otx",
    fat_kg: 0.3, O2_crit: 400, Ea: 85000, Q10: 2.5
  },
  nuts: {
    name: "Nuts / Seeds", type: "otx",
    fat_kg: 0.6, O2_crit: 600, Ea: 75000, Q10: 2.2
  },
  oils: {
    name: "Cooking Oils", type: "otx",
    fat_kg: 1.0, O2_crit: 800, Ea: 80000, Q10: 2.0
  },
  custom: {
    name: "Custom Product", type: "moisture",
    M_init: 5, M_crit: 10, GAB: { M_m: 0.04, C: 10, K: 0.8 }, Ea: 50000
  }
};

// ====================================================================
// 📦 SL OBJECT - All shelf life logic
// ====================================================================
const SL = {

  // ------------------------------------------------------------------
  // UI TOGGLES
  // ------------------------------------------------------------------
  toggleSource() {
    const src = document.querySelector('input[name="sl-source"]:checked')?.value;
    const mb  = document.getElementById('sl-manual-block');
    if (mb) mb.style.display = src === 'manual' ? 'block' : 'none';
  },

  togglePkgMode() {
    const m       = document.querySelector('input[name="pkg-geom"]:checked')?.value;
    const geomSel = document.getElementById('geom-selector');
    const dimsSel = document.getElementById('dims-selector');
    const manInp  = document.getElementById('manual-area-input');
    if (m === 'auto') {
      if (geomSel) geomSel.style.display = 'grid';
      if (dimsSel) dimsSel.style.display = 'block';
      if (manInp)  manInp.style.display  = 'none';
      this.onShapeChange();
    } else {
      if (geomSel) geomSel.style.display = 'none';
      if (dimsSel) dimsSel.style.display = 'none';
      if (manInp)  manInp.style.display  = 'block';
    }
  },

  onPkgChange() {
    const sel  = document.getElementById('sl-shape');
    if (!sel) return;
    const type = sel.value;
    const pouchDims  = document.getElementById('dims-pouch');
    const bottleDims = document.getElementById('dims-bottle');
    if (type === 'bottle') {
      if (pouchDims)  pouchDims.style.display  = 'none';
      if (bottleDims) bottleDims.style.display = 'grid';
    } else {
      if (pouchDims)  pouchDims.style.display  = 'grid';
      if (bottleDims) bottleDims.style.display = 'none';
    }
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
      const wInp = document.getElementById('sl-w');
      const hInp = document.getElementById('sl-h');
      const dInp = document.getElementById('sl-d');
      const labels = pouchDims.querySelectorAll('label');
      if (wInp) wInp.value = cfg.w;
      if (hInp) hInp.value = cfg.h;
      if (dInp) dInp.value = cfg.d;
      if (labels[0]) labels[0].textContent = cfg.l1;
      if (labels[1]) labels[1].textContent = cfg.l2;
      if (labels[2]) labels[2].textContent = cfg.l3;
    }
    this.calcArea();
  },

  onShapeChange() {
    const sel  = document.getElementById('sl-shape');
    if (!sel) return;
    const type = sel.value;
    const pouchDims  = document.getElementById('dims-pouch');
    const bottleDims = document.getElementById('dims-bottle');
    if (type === 'bottle') {
      if (pouchDims)  pouchDims.style.display  = 'none';
      if (bottleDims) bottleDims.style.display = 'grid';
    } else {
      if (pouchDims)  pouchDims.style.display  = 'grid';
      if (bottleDims) bottleDims.style.display = 'none';
    }
    this.calcArea();
  },

  // ------------------------------------------------------------------
  // AREA CALCULATION
  // ------------------------------------------------------------------
  calcArea() {
    const mode = document.querySelector('input[name="pkg-geom"]:checked')?.value;
    let area   = 0;
    if (mode === 'manual') {
      area = parseFloat(document.getElementById('sl-area-manual')?.value) || 0;
    } else {
      const type = document.getElementById('sl-shape')?.value || 'flat';
      const m    = parseFloat(document.getElementById('sl-margin')?.value) || 0;
      if (type === 'bottle') {
        const R_body      = parseFloat(document.getElementById('sl-bottle-body-r')?.value)     || 3.5;
        const H_body      = parseFloat(document.getElementById('sl-bottle-body-h')?.value)     || 16;
        const R_neck      = parseFloat(document.getElementById('sl-bottle-neck-r')?.value)     || 1.2;
        const H_neck      = parseFloat(document.getElementById('sl-bottle-neck-h')?.value)     || 4;
        const H_shoulder  = parseFloat(document.getElementById('sl-bottle-shoulder-h')?.value) || 2.5;
        const areaBodyLat = 2 * Math.PI * R_body * H_body;
        const areaNeckLat = 2 * Math.PI * R_neck * H_neck;
        const slantH      = Math.sqrt(Math.pow(R_body - R_neck, 2) + Math.pow(H_shoulder, 2));
        const areaShould  = Math.PI * (R_body + R_neck) * slantH;
        const areaBottom  = Math.PI * Math.pow(R_body, 2);
        const mF          = 1 + (m / 100);
        area = (areaBodyLat + areaNeckLat + areaShould + areaBottom) * mF / 10000;
      } else {
        const w = parseFloat(document.getElementById('sl-w')?.value) || 0;
        const h = parseFloat(document.getElementById('sl-h')?.value) || 0;
        const d = parseFloat(document.getElementById('sl-d')?.value) || 0;
        const wT = w + m * 2, hT = h + m * 2, dT = d + m * 2;
        let areaCm2 = 0;
        if (type === 'flat')     areaCm2 = 2 * wT * hT;
        else if (type === 'standup')  areaCm2 = 2 * wT * hT * 1.3;
        else if (type === 'flow')     areaCm2 = wT * hT * 2.2;
        else if (type === 'box')      areaCm2 = 2 * (wT * hT + wT * dT + hT * dT);
        else if (type === 'cylinder') areaCm2 = 2 * Math.PI * (d / 2) * (d / 2 + hT);
        else if (type === 'tray')     areaCm2 = (wT * hT) + 2 * (wT * dT) + 2 * (hT * dT);
        area = areaCm2 / 10000;
      }
    }
    const aD = document.getElementById('sl-area-display');
    const aI = document.getElementById('sl-area');
    if (aD) aD.textContent = area.toFixed(4) + ' m²';
    if (aI) aI.value       = area.toFixed(4);
  },

  updateManualArea() {
    const v  = document.getElementById('sl-area-manual')?.value;
    const aD = document.getElementById('sl-area-display');
    const aI = document.getElementById('sl-area');
    if (aD) aD.textContent = v + ' m²';
    if (aI) aI.value       = v;
  },

  // ------------------------------------------------------------------
  // PRODUCT CHANGE
  // ------------------------------------------------------------------
  onProductChange() {
    const prodKey = document.getElementById('sl-product')?.value;
    const p       = PRODUCTS_DB[prodKey];
    if (!p) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    if (p.type === 'moisture') {
      set('sl-minit', p.M_init); set('sl-mcrit', p.M_crit);
      set('sl-ea', p.Ea ? (p.Ea / 1000).toFixed(1) : '');
    } else {
      set('sl-minit', ''); set('sl-mcrit', '');
      set('sl-ea', p.Ea ? (p.Ea / 1000).toFixed(1) : '');
    }
    this.drawSafeZone();
  },

  drawSafeZone() {
    const init   = parseFloat(document.getElementById('sl-minit')?.value) || 0;
    const crit   = parseFloat(document.getElementById('sl-mcrit')?.value) || 0;
    const vLabel = document.getElementById('sl-mcrit-val');
    const bar    = document.getElementById('sl-safe-green');
    const marker = document.getElementById('sl-safe-now');
    if (!vLabel || !bar || !marker) return;
    vLabel.textContent = crit + '%';
    const max  = Math.max(crit * 1.5, 20);
    bar.style.width    = (crit / max * 100) + '%';
    marker.style.left  = (init / max * 100) + '%';
  },

  // ------------------------------------------------------------------
  // Ea / Q10 mutual exclusivity
  // ------------------------------------------------------------------
  onEaInput() {
    const ea   = document.getElementById('sl-ea')?.value;
    const q10  = document.getElementById('sl-q10');
    const hint = document.getElementById('sl-ea-q10-hint');
    if (!q10 || !hint) return;
    if (ea && parseFloat(ea) > 0) {
      q10.disabled = true; q10.style.opacity = '0.4'; q10.value = '';
      hint.textContent = 'Eₐ set — Q₁₀ disabled.';
    } else {
      q10.disabled = false; q10.style.opacity = '1';
      hint.textContent = 'Leave empty to use product default.';
    }
  },

  onQ10Input() {
    const q10  = document.getElementById('sl-q10')?.value;
    const ea   = document.getElementById('sl-ea');
    const hint = document.getElementById('sl-ea-q10-hint');
    if (!ea || !hint) return;
    if (q10 && parseFloat(q10) > 0) {
      ea.disabled = true; ea.style.opacity = '0.4'; ea.value = '';
      hint.textContent = 'Q₁₀ set — Eₐ disabled.';
    } else {
      ea.disabled = false; ea.style.opacity = '1';
      hint.textContent = 'Leave empty to use product default.';
    }
  },

  // ------------------------------------------------------------------
  // CONDITION MODE TOGGLE (Single / Chain)
  // ------------------------------------------------------------------
  toggleCond(mode) {
    const singleDiv = document.getElementById('sl-cond-single');
    const chainDiv  = document.getElementById('sl-cond-chain');
    const btnSingle = document.getElementById('btn-single');
    const btnChain  = document.getElementById('btn-chain');
    if (singleDiv) singleDiv.style.display = mode === 'single' ? 'block' : 'none';
    if (chainDiv)  chainDiv.style.display  = mode === 'chain'  ? 'block' : 'none';
    if (btnSingle) { btnSingle.style.background = mode === 'single' ? 'var(--primary)' : 'var(--bg)'; btnSingle.style.color = mode === 'single' ? '#fff' : 'var(--text-light)'; }
    if (btnChain)  { btnChain.style.background  = mode === 'chain'  ? 'var(--primary)' : 'var(--bg)'; btnChain.style.color  = mode === 'chain'  ? '#fff' : 'var(--text-light)'; }
  },

  addChainRow() {
    const tbody = document.getElementById('sl-chain-rows');
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', `
    <tr style="background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);animation:fadeIn 0.2s ease">
      <td style="padding:0.5rem"><input type="text" value="Storage" style="width:100%;padding:0.55rem 0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;background:#fafbfc"></td>
      <td style="padding:0.5rem"><input type="number" value="22" class="sl-ct" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
      <td style="padding:0.5rem"><input type="number" value="60" class="sl-cr" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
      <td style="padding:0.5rem"><input type="number" value="30" class="sl-cd" style="width:100%;padding:0.55rem 0.4rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;text-align:center"></td>
      <td style="padding:0.5rem;text-align:center"><span style="cursor:pointer;color:var(--danger);font-size:1.2rem;line-height:1" onclick="this.closest('tr').remove()">✕</span></td>
    </tr>`);
  },

  // ------------------------------------------------------------------
  // GAB SOLVER
  // ------------------------------------------------------------------
  solveGAB(M, params) {
    if (!params || !params.M_m || !params.C || !params.K) return 0.5;
    let low = 0.01, high = 0.99;
    for (let i = 0; i < 50; i++) {
      const aw    = (low + high) / 2;
      const denom = (1 - params.K * aw) * (1 - params.K * aw + params.C * params.K * aw);
      if (denom === 0) break;
      const Mc = (params.M_m * params.C * params.K * aw) / denom;
      if (Mc < M) low = aw; else high = aw;
    }
    return (low + high) / 2;
  },

  // ------------------------------------------------------------------
  // MAIN CALCULATE
  // ------------------------------------------------------------------
  calculate() {
    const prodKey = document.getElementById('sl-product')?.value;
    const prod    = PRODUCTS_DB[prodKey];
    if (!prod) { alert('⚠️ Select a product type first'); return; }

    // 1. Rate
    const src = document.querySelector('input[name="sl-source"]:checked')?.value;
    let rateInput = 0;
    if (src === 'manual') {
      rateInput = parseFloat(document.getElementById('sl-rate-manual')?.value) || 0;
      if (rateInput <= 0) { alert('Enter a valid rate'); return; }
    } else {
      rateInput = parseFloat(State.calcResult?.total) || 0;
      if (rateInput <= 0) { alert('No calculated rate. Use manual or calculate laminate first.'); return; }
    }

    // 2. Area & Weight
    const A = parseFloat(document.getElementById('sl-area')?.value)   || 0.1;
    const W = parseFloat(document.getElementById('sl-weight')?.value) || 100;

    // 3. Conditions
    let T_store = 25, RH_out = 65;
    const isChain = document.getElementById('sl-cond-chain')?.style.display !== 'none';
    if (isChain) {
      let totD = 0, wT = 0, wRH = 0;
      document.querySelectorAll('#sl-chain-rows tr').forEach(r => {
        const d = parseFloat(r.querySelector('.sl-cd')?.value) || 0;
        wT  += (parseFloat(r.querySelector('.sl-ct')?.value) || 0) * d;
        wRH += (parseFloat(r.querySelector('.sl-cr')?.value) || 0) * d;
        totD += d;
      });
      if (totD > 0) { T_store = wT / totD; RH_out = wRH / totD; }
    } else {
      T_store = parseFloat(document.getElementById('sl-temp')?.value)   || 25;
      RH_out  = parseFloat(document.getElementById('sl-rh-ext')?.value) || 65;
    }

    // 4. Thermal acceleration
    const Ea_val = parseFloat(document.getElementById('sl-ea')?.value) || (prod.Ea ? prod.Ea / 1000 : 60);
    const Q10_val = parseFloat(document.getElementById('sl-q10')?.value) || (prod.Q10 || 2.0);
    const Ea_J   = Ea_val * 1000;
    const eaInput   = document.getElementById('sl-ea')?.value;
    const eaDisabled = document.getElementById('sl-ea')?.disabled;
    let accel = 1;
    if (eaInput && parseFloat(eaInput) > 0 && !eaDisabled)
      accel = Math.exp(-(Ea_J / 8.314) * (1 / (T_store + 273.15) - 1 / 298.15));
    else
      accel = Math.pow(Q10_val, (T_store - 25) / 10);

    // 5. Hygroscopic correction
    let hygroFactor = 1;
    const hygroMsg  = [];
    if (State.layers && State.selCond) {
      for (let li = 0; li < State.layers.length; li++) {
        const layer = State.layers[li]; if (!layer.mid) continue;
        const mat   = DB.materials.find(m => m.id === layer.mid); if (!mat) continue;
        const isW   = (State.mode || 'wvtr') === 'wvtr';
        const beta  = isW ? (mat.hygroscopicBetaWVTR || 0) : (mat.hygroscopicBetaOTR || 0);
        if (beta <= 0) continue;
        let testRH = 50;
        if (mat.validConditions && mat.validConditions.length > 0) {
          let bc = mat.validConditions[0], md = Math.abs(mat.validConditions[0].temperature - (parseFloat(document.getElementById('sl-temp')?.value) || 25));
          for (let ci = 0; ci < mat.validConditions.length; ci++) {
            const dif = Math.abs(mat.validConditions[ci].temperature - T_store);
            if (dif < md) { md = dif; bc = mat.validConditions[ci]; }
          }
          testRH = bc.humidity;
        }
        const rhDiff = RH_out - testRH;
        const f      = Math.exp(beta * rhDiff);
        if (Math.abs(rhDiff) > 2) {
          hygroFactor *= f;
          hygroMsg.push(mat.name + ': ×' + f.toFixed(2) + ' @ ' + RH_out.toFixed(0) + '% RH vs ' + testRH + '% RH test');
        } else {
          hygroMsg.push(mat.name + ': ⚠ hygroscopic (β=' + beta + ') — calculated at test RH (' + testRH + '%), no correction applied');
        }
      }
    }

    const effectiveRate = rateInput * accel * hygroFactor;

    // 6. Simulation
    let result = {
      days: 0, history: [], mode: State.mode, type: prod.type,
      hygroWarning: hygroMsg.length ? { message: 'Hygroscopic correction applied', details: hygroMsg } : null,
      isChain: isChain
    };

    if (prod.type === 'moisture') {
      const M_crit = parseFloat(document.getElementById('sl-mcrit')?.value) || prod.M_crit;
      const M_init = parseFloat(document.getElementById('sl-minit')?.value) || prod.M_init;
      if (M_crit <= M_init) { alert('⚠️ Critical moisture must be > initial'); return; }
      const T_test_std = 23;
      const Psat_std   = 0.61094 * Math.exp((17.625 * T_test_std) / (T_test_std + 243.04)) * 1000;
      const dP_std     = Psat_std * 0.50;
      const Psat       = 0.61094 * Math.exp((17.625 * T_store) / (T_store + 243.04)) * 1000;
      let M = M_init, t = 0;
      result.history = [{ t: 0, M: M, quality: 100 }];
      while (M < M_crit && t < 5000) {
        const aw    = this.solveGAB(M / 100, prod.GAB);
        const RH_in = aw * 100;
        const dP    = Psat * Math.max((RH_out - RH_in), 1) / 100;
        const dM    = (effectiveRate * (dP / dP_std) * A) / W * 100;
        M += dM; t++;
        result.history.push({ t, M: Math.min(M, M_crit), quality: Math.max(0, 100 - ((M - M_init) / (M_crit - M_init)) * 100) });
      }
      result.days   = t;
      result.M_crit = M_crit;
      result.M_init = M_init;
    } else {
      const fatKg  = prod.fat_kg  || 0.3;
      const O2_crit = prod.O2_crit || 400;
      const totalO2 = O2_crit * fatKg;
      const dayO2   = effectiveRate * A * 0.21;
      if (dayO2 <= 0) {
        result.days = Infinity;
      } else {
        const days = totalO2 / dayO2;
        for (let d = 0; d <= Math.min(days * 1.2, 3650); d += 5)
          result.history.push({ t: d, quality: Math.max(0, 100 - ((dayO2 * d) / totalO2) * 100) });
        result.days = Math.round(days);
      }
      result.type = 'otx';
    }
    this.renderResult(result);
  },

  // ------------------------------------------------------------------
  // RENDER RESULT PANEL
  // ------------------------------------------------------------------
  renderResult(res) {
    const panel = document.getElementById('sl-result-panel');
    if (!panel) return;
    const months = res.days / 30.44, years = res.days / 365.25;
    const unit   = res.mode === 'wvtr' ? 'Moisture Gain' : 'Lipid Oxidation';
    const daysStr = isFinite(res.days) ? formatWithSigFigs(res.days, getDisplayPrecision()) : '∞';
    panel.innerHTML = `
    <div style="animation:fadeIn 0.3s ease">
      <div style="text-align:center;padding:1.25rem;background:linear-gradient(135deg,var(--primary-light),#e0f2fe);border-radius:12px;margin-bottom:1rem">
        <div style="font-size:2.2rem;font-weight:800;color:var(--primary);line-height:1.2">${daysStr} Days</div>
        <div style="font-size:0.85rem;color:var(--text-light);margin-top:0.4rem;font-weight:500">≈ ${months.toFixed(1)} Months · ≈ ${years.toFixed(2)} Years</div>
        <span class="badge badge-blue" style="margin-top:0.5rem">${unit}</span>
      </div>
    </div>`;
    if (res.hygroWarning) {
      panel.innerHTML += `<div class="alert alert-warning" style="margin-top:0.5rem;font-size:0.75rem;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:8px;padding:0.6rem 0.8rem">
        <strong style="font-weight:700">⚠️ ${res.hygroWarning.message}</strong><br>
        ${res.hygroWarning.details.map(d => `<span style="display:block;margin-top:0.2rem;color:#92400e;font-weight:500">• ${d}</span>`).join('')}
      </div>`;
    }
    const chartsContainer = document.getElementById('sl-charts-container');
    if (chartsContainer) {
      chartsContainer.style.display = 'block';
      requestAnimationFrame(() => { setTimeout(() => this.drawCharts(res), 100); });
    }
    const logisticsContainer = document.getElementById('sl-logistics-charts');
    if (logisticsContainer) {
      if (res.isChain) {
        logisticsContainer.style.display = 'block';
        requestAnimationFrame(() => { setTimeout(() => this.drawLogisticsCharts(res), 150); });
      } else {
        logisticsContainer.style.display = 'none';
      }
    }
  },

  // ------------------------------------------------------------------
  // MAIN CHARTS (Quality Decay + Temp curve)
  // ------------------------------------------------------------------
  drawCharts(res) {
    destroyChart('slDecay'); destroyChart('slTemp');
    const ctx1 = document.getElementById('slDecayChart')?.getContext('2d');
    if (ctx1 && res.history?.length > 1 && typeof Chart !== 'undefined') {
      chartInstances.slDecay = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: res.history.map(h => h.t),
          datasets: [
            { label: 'Quality (%)', data: res.history.map(h => h.quality),
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
              fill: true, tension: 0.35, pointRadius: 2, borderWidth: 2 },
            { label: 'Critical (0%)', data: new Array(res.history.length).fill(0),
              borderColor: '#ef4444', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, fill: false }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
          scales: {
            x: { title: { display: true, text: 'Days' }, ticks: { font: { size: 9 } } },
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Quality %' },
                 ticks: { font: { size: 9 }, callback: v => v + '%' } }
          }
        }
      });
    }
    const ctx2 = document.getElementById('slTempChart')?.getContext('2d');
    if (ctx2 && typeof Chart !== 'undefined') {
      const Ea_kJ  = parseFloat(document.getElementById('sl-ea')?.value) || 60;
      const Q10    = parseFloat(document.getElementById('sl-q10')?.value) || 2.0;
      const A      = parseFloat(document.getElementById('sl-area')?.value) || 0.1;
      const W      = parseFloat(document.getElementById('sl-weight')?.value) || 100;
      const srcEl  = document.querySelector('input[name="sl-source"]:checked');
      const src    = srcEl ? srcEl.value : 'calc';
      let baseRate = src === 'manual' ? (parseFloat(document.getElementById('sl-rate-manual')?.value) || 0) : (parseFloat(State.calcResult?.total) || 0.5);
      const temps  = Array.from({ length: 36 }, (_, i) => 15 + i);
      const daysArr = temps.map(T => {
        const eaIn = document.getElementById('sl-ea')?.value;
        const eaDis = document.getElementById('sl-ea')?.disabled;
        let acc = 1;
        if (eaIn && parseFloat(eaIn) > 0 && !eaDis) acc = Math.exp(-(Ea_kJ * 1000 / 8.314) * (1 / (T + 273.15) - 1 / 298.15));
        else acc = Math.pow(Q10, (T - 25) / 10);
        const rate = baseRate * acc;
        if (res.type === 'moisture') return ((res.M_crit || 8) - (res.M_init || 3)) / 100 * W / (rate * A);
        else return ((PRODUCTS_DB[document.getElementById('sl-product')?.value]?.O2_crit || 400) *
                     (PRODUCTS_DB[document.getElementById('sl-product')?.value]?.fat_kg  || 0.3) * 0.21) / (rate * A);
      });
      chartInstances.slTemp = new Chart(ctx2, {
        type: 'line',
        data: { labels: temps, datasets: [{ label: 'Shelf Life vs Temp', data: daysArr, borderColor: '#8b5cf6', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                   scales: { x: { title: { display: true, text: 'Storage °C' } }, y: { title: { display: true, text: 'Days' } } } }
      });
    }
  },

  // ------------------------------------------------------------------
  // LOGISTICS CHAIN CHARTS
  // ------------------------------------------------------------------
  drawLogisticsCharts(res) {
    destroyChart('slChain'); destroyChart('slCumulative'); destroyChart('slStepImpact'); destroyChart('slMoistureAcc');
    const rows = document.querySelectorAll('#sl-chain-rows tr');
    if (!rows.length) return;

    const ctx1 = document.getElementById('slChainChart')?.getContext('2d');
    if (ctx1 && typeof Chart !== 'undefined') {
      const labels = [], temps = [], rhs = [];
      rows.forEach(r => {
        labels.push(r.querySelector('input[type="text"]')?.value || 'Step');
        temps.push(parseFloat(r.querySelector('.sl-ct')?.value) || 0);
        rhs.push(parseFloat(r.querySelector('.sl-cr')?.value) || 0);
      });
      chartInstances.slChain = new Chart(ctx1, {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Temperature (°C)', data: temps, backgroundColor: 'rgba(59,130,246,0.7)', yAxisID: 'y' },
          { label: 'RH (%)',           data: rhs,   backgroundColor: 'rgba(239,68,68,0.7)',  yAxisID: 'y1' }
        ]},
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } } },
          scales: { y: { position: 'left', title: { display: true, text: '°C' } }, y1: { position: 'right', title: { display: true, text: 'RH %' } } }
        }
      });
    }
    this.drawStepImpactChart(res);
    if (res && res.type === 'moisture') this.drawMoistureAccumulationChart(res);

    const ctx2 = document.getElementById('slCumulativeChart')?.getContext('2d');
    if (ctx2 && typeof Chart !== 'undefined') {
      let cum = 0;
      const cumDays = [], cumLabels = [];
      rows.forEach((r, i) => {
        const d = parseFloat(r.querySelector('.sl-cd')?.value) || 0;
        cum += d;
        cumDays.push(cum);
        cumLabels.push(r.querySelector('input[type="text"]')?.value || ('Step' + (i + 1)));
      });
      chartInstances.slCumulative = new Chart(ctx2, {
        type: 'line',
        data: { labels: cumLabels, datasets: [{ label: 'Cumulative Days', data: cumDays, borderColor: '#16a34a', fill: true, tension: 0.3, pointRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: 'Days' } } } }
      });
    }
  },

  // ------------------------------------------------------------------
  // STEP IMPACT CHART
  // ------------------------------------------------------------------
  drawStepImpactChart(res) {
    destroyChart('slStepImpact');
    const canvas = document.getElementById('slStepImpactChart');
    if (!canvas || !res || typeof Chart === 'undefined') return;
    const ctx  = canvas.getContext('2d');
    const rows = document.querySelectorAll('#sl-chain-rows tr');
    if (!rows.length) return;
    const A      = parseFloat(document.getElementById('sl-area')?.value)   || 0.1;
    const W      = parseFloat(document.getElementById('sl-weight')?.value) || 100;
    const prodKey = document.getElementById('sl-product')?.value;
    const prod    = PRODUCTS_DB[prodKey]; if (!prod) return;
    let totalAllowed = 0;
    if (prod.type === 'moisture') {
      const Mc = parseFloat(document.getElementById('sl-mcrit')?.value) || prod.M_crit;
      const Mi = parseFloat(document.getElementById('sl-minit')?.value) || prod.M_init;
      totalAllowed = (Mc - Mi) / 100 * W;
    } else {
      totalAllowed = (prod.O2_crit || 400) * (prod.fat_kg || 0.3);
    }
    const srcEl  = document.querySelector('input[name="sl-source"]:checked');
    const src    = srcEl ? srcEl.value : 'calc';
    let baseRate = src === 'manual' ? (parseFloat(document.getElementById('sl-rate-manual')?.value) || 0) : (parseFloat(State.calcResult?.total) || 0.5);
    if (!baseRate || baseRate <= 0) baseRate = 0.5;

    const labels = [], consumptionPct = [], details = [];
    let cumConsumed = 0;
    rows.forEach((r, idx) => {
      const name  = r.querySelector('input[type="text"]')?.value || ('Step' + (idx + 1));
      const T     = parseFloat(r.querySelector('.sl-ct')?.value) || 25;
      const RH    = parseFloat(r.querySelector('.sl-cr')?.value) || 65;
      const days  = parseFloat(r.querySelector('.sl-cd')?.value) || 1;
      const Ea_kJ = parseFloat(document.getElementById('sl-ea')?.value) || 60;
      const Q10   = parseFloat(document.getElementById('sl-q10')?.value) || 2.0;
      const eaIn  = document.getElementById('sl-ea')?.value;
      const eaDis = document.getElementById('sl-ea')?.disabled;
      let accel   = 1;
      if (eaIn && parseFloat(eaIn) > 0 && !eaDis)
        accel = Math.exp(-(Ea_kJ * 1000 / 8.314) * (1 / (T + 273.15) - 1 / 298.15));
      else
        accel = Math.pow(Q10, (T - 25) / 10);
      let hygroFactor = 1;
      if (State.layers) {
        State.layers.forEach(layer => {
          if (!layer.mid) return;
          const mat = DB.materials.find(m => m.id === layer.mid); if (!mat) return;
          const beta = (State.mode || 'wvtr') === 'wvtr' ? (mat.hygroscopicBetaWVTR || 0) : (mat.hygroscopicBetaOTR || 0);
          if (beta > 0) {
            let testRH = 50;
            if (mat.validConditions && mat.validConditions.length > 0) {
              let bc = mat.validConditions[0], md = Math.abs(mat.validConditions[0].temperature - T);
              mat.validConditions.forEach((c, ci) => { const d2 = Math.abs(c.temperature - T); if (d2 < md) { md = d2; bc = c; } });
              testRH = bc.humidity;
            }
            hygroFactor *= Math.exp(beta * (RH - testRH));
          }
        });
      }
      const effRate    = baseRate * accel * hygroFactor;
      const transferred = effRate * A * days * (res && res.type === 'otx' ? 0.21 : 1);
      const pct        = totalAllowed > 0 ? (transferred / totalAllowed) * 100 : 0;
      labels.push(name);
      consumptionPct.push(parseFloat(pct.toFixed(1)));
      cumConsumed += pct;
      details.push({ name, T, RH, days, pct: pct.toFixed(1), cumulative: cumConsumed.toFixed(1) });
    });

    const colors = consumptionPct.map(p => p >= 30 ? 'rgba(239,68,68,0.85)' : p >= 15 ? 'rgba(245,158,11,0.85)' : 'rgba(59,130,246,0.7)');
    chartInstances.slStepImpact = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Consumed (%)', data: consumptionPct, backgroundColor: colors, borderColor: colors, borderWidth: 1, borderRadius: 6 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => { const d = details[ctx.dataIndex]; return `${d.name}: ${d.pct}% (Cum: ${d.cumulative}%)`; } } } },
        scales: { x: { beginAtZero: true, max: 100, title: { display: true, text: '% of Total Shelf Life' }, ticks: { callback: v => v + '%' } } }
      }
    });
  },

  // ------------------------------------------------------------------
  // MOISTURE ACCUMULATION CHART
  // ------------------------------------------------------------------
  drawMoistureAccumulationChart(res) {
    destroyChart('slMoistureAcc');
    const canvas = document.getElementById('slMoistureAccChart');
    if (!canvas || !res || res.type !== 'moisture' || typeof Chart === 'undefined') return;
    const ctx     = canvas.getContext('2d');
    const rows    = document.querySelectorAll('#sl-chain-rows tr');
    if (!rows.length) return;
    const prodKey = document.getElementById('sl-product')?.value;
    const prod    = PRODUCTS_DB[prodKey]; if (!prod || prod.type !== 'moisture') return;
    const M_crit  = parseFloat(document.getElementById('sl-mcrit')?.value) || prod.M_crit;
    const M_init  = parseFloat(document.getElementById('sl-minit')?.value) || prod.M_init;
    const A       = parseFloat(document.getElementById('sl-area')?.value)   || 0.1;
    const W       = parseFloat(document.getElementById('sl-weight')?.value) || 100;
    const srcEl   = document.querySelector('input[name="sl-source"]:checked');
    let baseRate  = srcEl?.value === 'manual'
      ? (parseFloat(document.getElementById('sl-rate-manual')?.value) || 0)
      : (parseFloat(State.calcResult?.total) || 0);
    if (!baseRate || baseRate <= 0) baseRate = 0.5;

    const T_test_std = 23;
    const Psat_std   = 0.61094 * Math.exp((17.625 * T_test_std) / (T_test_std + 243.04)) * 1000;
    const dP_std     = Psat_std * 0.50;

    const labels = [], moisturePoints = [], pointDetails = [];
    let M_current = M_init, dayCounter = 0;

    rows.forEach((r, idx) => {
      const name   = r.querySelector('input[type="text"]')?.value || ('Step' + (idx + 1));
      const T      = parseFloat(r.querySelector('.sl-ct')?.value) || 25;
      const RH_out = parseFloat(r.querySelector('.sl-cr')?.value) || 65;
      const days   = parseFloat(r.querySelector('.sl-cd')?.value) || 1;
      const Psat   = 0.61094 * Math.exp((17.625 * T) / (T + 243.04)) * 1000;
      const Ea_kJ  = parseFloat(document.getElementById('sl-ea')?.value) || 60;
      const Q10    = parseFloat(document.getElementById('sl-q10')?.value) || 2.0;
      const eaIn   = document.getElementById('sl-ea')?.value;
      const eaDis  = document.getElementById('sl-ea')?.disabled;
      let accel    = 1;
      if (eaIn && parseFloat(eaIn) > 0 && !eaDis)
        accel = Math.exp(-(Ea_kJ * 1000 / 8.314) * (1 / (T + 273.15) - 1 / 298.15));
      else
        accel = Math.pow(Q10, (T - 25) / 10);
      let hygroFactor = 1;
      if (State.layers) {
        State.layers.forEach(layer => {
          if (!layer.mid) return;
          const mat  = DB.materials.find(m => m.id === layer.mid); if (!mat) return;
          const beta = mat.hygroscopicBetaWVTR || 0;
          const refRH = mat.hygroscopicRefRHWVTR || 50;
          if (beta > 0) hygroFactor *= Math.exp(beta * (RH_out - refRH));
        });
      }
      const effRate = baseRate * accel * hygroFactor;
      const step    = Math.max(1, Math.floor(days / 8));
      for (let d = 0; d < days; d++) {
        const aw_cur = Math.min(0.99, Math.max(0.01, M_current / M_crit * 0.85));
        const RH_in  = aw_cur * 100;
        const dP     = Psat * Math.max((RH_out - RH_in), 1) / 100;
        const dM     = (effRate * (dP / dP_std) * A) / W * 100;
        M_current    = Math.min(M_current + dM, M_crit * 1.5);
        dayCounter++;
        if (d % step === 0 || d === days - 1) {
          labels.push(name + '+' + (d + 1) + 'd');
          moisturePoints.push(parseFloat(M_current.toFixed(2)));
          pointDetails.push({ day: dayCounter, M: M_current, step: name });
        }
      }
      labels.push(name);
      moisturePoints.push(parseFloat(M_current.toFixed(2)));
      pointDetails.push({ day: dayCounter, M: M_current, step: name, isEnd: true });
    });

    const maxMoisture = moisturePoints.length > 0 ? Math.max(...moisturePoints) : M_crit;
    try {
      chartInstances.slMoistureAcc = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Internal Moisture (%)', data: moisturePoints,
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)',
              fill: true, tension: 0.35,
              pointRadius: ctx => pointDetails[ctx.dataIndex]?.isEnd ? 5 : 3,
              pointHoverRadius: 7,
              pointBackgroundColor: ctx => moisturePoints[ctx.dataIndex] >= M_crit ? '#ef4444' : '#3b82f6',
              pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5 },
            { label: 'Critical Limit', data: new Array(labels.length).fill(M_crit),
              borderColor: '#ef4444', borderDash: [6, 4], borderWidth: 2.5, pointRadius: 0, fill: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 }, padding: 10 } },
            tooltip: { callbacks: { label: function(ctx) {
              const val    = ctx.parsed.y;
              const detail = pointDetails[ctx.dataIndex];
              const status = val >= M_crit ? ' 🔴 ABOVE LIMIT' : val >= M_crit * 0.9 ? ' 🟡 WARNING' : ' 🟢 Safe';
              return [` ${ctx.dataset.label}: ${val.toFixed(2)}%${status}`, ` Day ${detail?.day || ctx.dataIndex}`, ` Step: ${detail?.step || ''}`];
            }}}
          },
          scales: {
            x: { title: { display: true, text: 'Logistics Chain Progress', font: { size: 10 } }, ticks: { font: { size: 8 }, maxRotation: 45 }, grid: { display: false } },
            y: { beginAtZero: true, max: Math.max(M_crit * 1.3, maxMoisture * 1.1),
                 title: { display: true, text: 'Moisture Content (%)', font: { size: 10 } },
                 ticks: { callback: v => v.toFixed(1) + '%', font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
          }
        }
      });
    } catch (e) { console.error('❌ Moisture Accumulation chart error:', e); }
  },

  // ------------------------------------------------------------------
  // EXPORT TO PDF
  // ------------------------------------------------------------------
  async exportToPDF(event) {
    const PDFLib = window.jspdf?.jsPDF || window.jspdf?.default || window.jsPDF;
    if (typeof PDFLib !== 'function') { alert('PDF library missing. Reload page.'); return; }
    if (typeof html2canvas !== 'function') { alert('Chart library missing. Reload page.'); return; }

    const chartConfigs = [
      { id: 'slDecayChart',       title: 'Quality Decay Over Time',     desc: 'Product quality vs storage days' },
      { id: 'slTempChart',        title: 'Shelf Life vs Temperature',    desc: 'Predicted shelf life across temperatures' },
      { id: 'slChainChart',       title: 'Logistics Conditions',         desc: 'Temperature and RH profile' },
      { id: 'slStepImpactChart',  title: 'Shelf Life Consumed per Step', desc: 'Percentage used in each phase' },
      { id: 'slMoistureAccChart', title: 'Moisture Accumulation',        desc: 'Internal moisture growth' },
      { id: 'slCumulativeChart',  title: 'Cumulative Timeline',          desc: 'Accumulated days across steps' }
    ];

    const btn = event?.target?.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Generating PDF...'; }

    try {
      const lamName    = State?.laminateName || 'Unnamed Laminate';
      const layers     = (State?.layers || []).filter(l => l?.mid != null);
      const structureStr = layers.length
        ? layers.map(l => { const m = DB?.materials?.find(x => x?.id === l.mid); return m ? `${m.name} (${l.thick}um)` : null; }).filter(Boolean).join(' / ')
        : 'N/A';
      const prodKey  = document.getElementById('sl-product')?.value;
      const prod     = PRODUCTS_DB[prodKey];
      const A        = parseFloat(document.getElementById('sl-area')?.value)   || 0.1;
      const W        = parseFloat(document.getElementById('sl-weight')?.value) || 100;
      const M_crit   = parseFloat(document.getElementById('sl-mcrit')?.value)  || (prod?.M_crit || 6);
      const M_init   = parseFloat(document.getElementById('sl-minit')?.value)  || (prod?.M_init || 3);
      const T_store  = parseFloat(document.getElementById('sl-temp')?.value)   || 25;
      const RH_ext   = parseFloat(document.getElementById('sl-rh-ext')?.value) || 65;
      const Ea       = parseFloat(document.getElementById('sl-ea')?.value)     || 60;
      const Q10      = parseFloat(document.getElementById('sl-q10')?.value)    || 2.0;
      const beta     = 0.03;
      const isChain  = document.getElementById('sl-cond-chain')?.style.display !== 'none';
      const unit     = State?.mode === 'wvtr' ? 'g/m2/day' : 'cc/m2/day/atm';
      const genDate  = new Date().toLocaleDateString('it-IT');

      const pdf = new PDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: false });
      pdf.setFont('helvetica', 'normal');
      const PW = 210, PH = 297, ML = 15, MR = 15, MT = 15, MB = 15, CW = PW - ML - MR;
      let y = MT;

      const newPage = () => { pdf.addPage(); y = MT; drawFooter(); };
      const addText = (txt, x, fs, bold = false, maxW = CW) => {
        pdf.setFontSize(fs); pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        const safeTxt = String(txt).replace(/[^\x20-\x7E]/g, '');
        const lines   = pdf.splitTextToSize(safeTxt, maxW);
        const lh      = fs * 0.4;
        pdf.text(lines, x, y); y += lines.length * lh + 2;
      };
      const addLine = () => { pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3); pdf.line(ML, y, PW - MR, y); y += 3; };
      const addSectionTitle = (title) => {
        y += 5; pdf.setFillColor(240, 240, 240); pdf.rect(ML, y - 2, CW, 7, 'F');
        pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.text(title, ML + 2, y + 3); y += 8;
      };
      const addKeyValue = (key, value) => {
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.text(key, ML, y);
        pdf.setFont('helvetica', 'bold'); pdf.text(String(value).replace(/[^\x20-\x7E]/g, ''), ML + 80, y); y += 5;
      };
      const drawFooter = () => {
        const pg = pdf.internal.getNumberOfPages();
        pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(150, 150, 150);
        pdf.text('WVTR/OTR Calculator - R&D Use Only', ML, PH - 8);
        pdf.text('Page ' + pg, PW - MR, PH - 8, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
      };

      // Page 1: header + data
      pdf.setFillColor(50, 100, 180); pdf.rect(0, 0, PW, 30, 'F');
      pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text('WVTR/OTR Shelf Life Calculator', ML, 15);
      pdf.setFontSize(11); pdf.text('Predictive Packaging Analysis', ML, 22);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(220, 230, 255);
      pdf.text('Generated: ' + genDate, PW - MR, 26, { align: 'right' });
      pdf.text('Mode: ' + (State?.mode || 'N/A').toUpperCase() + ' | Unit: ' + unit, PW - MR, 29, { align: 'right' });
      y = 38; pdf.setTextColor(0, 0, 0);

      addSectionTitle('Laminate Structure');
      addKeyValue('Name:', lamName);
      addKeyValue('Structure:', structureStr);
      addKeyValue('Layers:', layers.length);
      addKeyValue('Total Thickness:', layers.reduce((s, l) => s + (l.thick || 0), 0) + ' um');
      addLine();
      addSectionTitle('Packaging and Product Data');
      addKeyValue('Product:', prod?.name || 'N/A');
      addKeyValue('Weight:', W + ' g');
      addKeyValue('Surface Area:', A.toFixed(4) + ' m2');
      addKeyValue('Moisture Range:', M_init + '% to ' + M_crit + '%');
      addLine();
      addSectionTitle('Storage Conditions');
      addKeyValue('Temperature:', T_store.toFixed(1) + ' C');
      addKeyValue('External RH:', RH_ext.toFixed(0) + ' %');
      addKeyValue('Activation Energy:', Ea + ' kJ/mol');
      addKeyValue('Q10 Factor:', Q10.toFixed(2));
      addKeyValue('Mode:', isChain ? 'Supply Chain' : 'Single Condition');
      drawFooter();

      // Page 2: formulas
      newPage();
      pdf.setFillColor(245, 245, 245); pdf.rect(0, 0, PW, 12, 'F');
      pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
      pdf.text('Mathematical Models and Methodology', ML, 8);
      y = 20;
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.text('Core Shelf Life Equation', ML, y); y += 6;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      const eq1 = 't = (W x DeltaM) / (A x P x Deltap x f(T,RH))';
      pdf.setFillColor(250, 250, 250); pdf.setDrawColor(180, 180, 180); pdf.roundedRect(ML, y, CW, 12, 2, 2, 'FD');
      pdf.setFont('courier', 'normal'); pdf.setTextColor(0, 100, 180); pdf.text(eq1, ML + CW / 2, y + 7, { align: 'center' });
      y += 16; pdf.setTextColor(0, 0, 0);
      addKeyValue('Ea (kJ/mol):', Ea); addKeyValue('Q10:', Q10.toFixed(2));
      drawFooter();

      // Charts pages
      for (let i = 0; i < chartConfigs.length; i += 2) {
        newPage();
        const firstChart  = chartConfigs[i];
        const secondChart = chartConfigs[i + 1];
        const chartHeight = 110, gap = 10;

        pdf.setFillColor(245, 245, 245); pdf.rect(ML, y - 2, CW, 8, 'F');
        pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
        pdf.text(firstChart.title.replace(/[^\x20-\x7E]/g, ''), ML + 2, y + 4);
        y += 10;
        pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100);
        pdf.text(firstChart.desc.replace(/[^\x20-\x7E]/g, ''), ML, y);
        y += 6;
        try {
          const canvas1 = document.getElementById(firstChart.id);
          if (canvas1 && canvas1.offsetParent !== null && canvas1.width > 0) {
            const cc1  = await html2canvas(canvas1, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const img1 = cc1.toDataURL('image/png');
            const h1   = Math.min(CW * (cc1.height / cc1.width), chartHeight);
            pdf.addImage(img1, 'PNG', ML, y, CW, h1);
            y += h1 + gap;
          }
        } catch (e) { y += chartHeight; }

        if (secondChart) {
          pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.5); pdf.line(ML, y, PW - MR, y); y += 8;
          pdf.setFillColor(245, 245, 245); pdf.rect(ML, y - 2, CW, 8, 'F');
          pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
          pdf.text(secondChart.title.replace(/[^\x20-\x7E]/g, ''), ML + 2, y + 4);
          y += 10;
          pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100);
          pdf.text(secondChart.desc.replace(/[^\x20-\x7E]/g, ''), ML, y);
          y += 6; pdf.setTextColor(0, 0, 0);
          try {
            const canvas2 = document.getElementById(secondChart.id);
            if (canvas2 && canvas2.offsetParent !== null && canvas2.width > 0) {
              const cc2  = await html2canvas(canvas2, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
              const img2 = cc2.toDataURL('image/png');
              const h2   = Math.min(CW * (cc2.height / cc2.width), chartHeight);
              pdf.addImage(img2, 'PNG', ML, y, CW, h2);
              y += h2;
            }
          } catch (e) { /* skip */ }
        }
        drawFooter();
      }

      // Disclaimer page
      newPage();
      pdf.setFillColor(50, 60, 80); pdf.rect(0, 0, PW, 15, 'F');
      pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text('Important Notes and Disclaimer', ML, 9);
      y = 25; pdf.setTextColor(0, 0, 0);
      const notes = ['This report is for R&D and internal use only.', 'Results require real-time validation per ASTM F1249 / ISO 15106.', '', 'Model assumptions:', '- Steady-state permeation', '- Ideal laminate adhesion', '- Constant storage conditions', '', 'Not modeled: seal integrity, physical damage, temperature cycling.'];
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      notes.forEach(line => { if (line === '') { y += 4; } else { pdf.text(line.replace(/[^\x20-\x7E]/g, ''), ML, y); y += 5; } });
      drawFooter();

      const safeName = lamName.replace(/[^a-z0-9]+/gi, '_').slice(0, 30) || 'Report';
      pdf.save('ShelfLife_' + safeName + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF generation failed. Check console.');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Export Full Report (PDF)'; }
    }
  }
};
