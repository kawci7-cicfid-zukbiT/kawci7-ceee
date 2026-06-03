# BarrierLab — AI Project Context

**Created by Lorenzo Venturelli**, industrial chemist, who built this platform to help packaging engineers and scientists design and evaluate barrier laminate films — replacing slow, expensive lab iterations with fast, science-based digital screening.

---

## What this app is

A browser-based tool for packaging professionals. It helps design multilayer barrier films and predict their real-world performance — moisture ingress, oxygen ingress, shelf life, desiccant sizing — without needing to run physical tests at every iteration.

No server. Everything runs in the browser. Data is saved in `localStorage`.

---

## Modules (tabs)

| Tab | What it does |
|-----|-------------|
| **Calculator** | Build a laminate layer by layer, compute combined WVTR and OTR using series resistance model. Starting point for all other modules. |
| **Sensitivity Analysis** | Sweep one layer's thickness across a range while locking the others. Shows where extra material actually helps vs. where it's wasted. |
| **Arrhenius Analysis** | Enter WVTR/OTR at 2+ temperatures → extracts activation energy (Eₐ) and predicts performance at any other temperature. |
| **ICH Compliance (MVTR)** | Checks if the laminate meets ICH Q1A(R2) across 7 global climatic zones. Gives pass/fail, safety margin, and years-to-limit per zone. |
| **Shelf Life** | Predicts product shelf life from barrier + product degradation kinetics. Moisture mode uses GAB isotherm (non-linear). Oxygen mode uses zero-order model. |
| **Headspace O₂** | Simulates oxygen concentration inside a sealed package over time: OTR ingress vs. product respiration/oxidation. |
| **Desiccant Sizing** | Calculates how much desiccant to put inside a pharma container based on film ingress + headspace moisture + product desorption. |
| **Carbon Footprint** | Estimates cradle-to-gate CO₂eq per m² and per package unit using GWP factors from PlasticsEurope / Ecoinvent. |

---

## How modules connect

The **Calculator** is always Step 1. After computing a WVTR/OTR it writes to `localStorage['mvtr_calc_result']`:

```javascript
window.saveCalcResult({
  total: 0.00215,        // WVTR g/m²/day
  laminateName: "PET/Al/LDPE",
  structure: "PET 12µm / Al 9µm / LDPE 60µm",
  tRef: 38,              // test temperature °C
  rhRef: 90              // test RH %
});
```

Every downstream module reads `localStorage['mvtr_calc_result']` first (survives reload), then falls back to the in-memory `State.calcResult` (lost on reload).

---

## Key scientific rules

- **Series resistance model:** `1/WVTR_total = Σ (thickness_i / WVTR_i)`
- **Arrhenius correction:** `F_T = exp[(Ea/R) × (1/T_ref − 1/T_target)]`
- **RH correction:** `F_RH = RH_target / RH_ref`
- **Reference conditions:** 38°C / 90% RH (ASTM F1249) — always the default fallback
- **Headspace moisture:** `Q_head = V(m³) × (RH/100) × Psat(Pa) / (R×T) × 18 × 1000` — result in **mg** (factor is ×1000, not ×1e6)

---

## What the AI can help with

- Explain how any calculation works
- Debug wrong results (wrong T/RH conditions, charts blank, values not passing between tabs)
- Add a new material, desiccant type, container preset, or ICH zone
- Extend or fix any module's JS logic
- Understand why a value persists or disappears across tab switches
