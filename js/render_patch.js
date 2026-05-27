// ====================================================================
// render_patch.js  —  renderContent() extension for new tabs
// Fixes two issues:
//   1. New tab renderers wrote to #content but the app uses #app-content
//   2. New tabs were missing methodology sections
// ====================================================================
(function () {

  // Store reference to the original renderContent defined in render.js
  var _originalRenderContent = window.renderContent;

  // ──────────────────────────────────────────────────────────────────
  // METHODOLOGY BUILDERS
  // ──────────────────────────────────────────────────────────────────

  function _cfpMethodology() {
    return `
<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:#fff">
<div style="padding:1.2rem 1.5rem">
<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem">
Understanding Carbon Footprint Estimation
</h2>
<div style="font-size:0.92rem;line-height:1.75;color:#334155;font-family:Georgia,'Times New Roman',serif">

<p>Every gram of polymer film or aluminium foil in a packaging structure carries an embedded carbon cost — the cumulative greenhouse gas emissions generated throughout its production, from oil well or bauxite mine through polymerisation, extrusion, and conversion. This tool estimates that <em>cradle-to-gate</em> footprint using a simple but physically grounded mass-balance model.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">The core formula</h3>
<p>For each layer the calculator performs three sequential steps:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  Mass (kg/m²) = density (kg/m³) × thickness (µm) × 10⁻⁶<br><br>
  CO₂eq (kg/m²) = mass × GWP (kg CO₂eq / kg polymer)<br><br>
  Total = Σ CO₂eq_layer &nbsp;|&nbsp; Per unit = Total × package area (m²)
</div>

<p>The density converts a geometric thickness measurement into an actual mass per unit surface area. The GWP (Global Warming Potential) coefficient then converts that mass into an equivalent mass of CO₂, accounting for the entire upstream energy and chemical burden of producing that material. All GWP values are sourced from publicly available EPD databases — primarily PlasticsEurope Eco-profiles and Ecoinvent 3.x — and represent European-average production conditions.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Default values and the "est." flag</h3>
<p>When a material record in the database does not carry explicit density and GWP fields, the calculator falls back to a keyword-based lookup table. It scans the material name and family for recognisable polymer abbreviations (PET, LDPE, PA, EVOH, ALU, etc.) and assigns the closest tabulated default. Rows resolved this way are marked <strong>est.</strong> to signal that the result is a first-order estimate, not a measured value.</p>

<div style="background:var(--warning-light);padding:0.75rem 1rem;border-radius:8px;border-left:3px solid var(--warning);margin:1rem 0;font-family:sans-serif;font-size:0.88rem">
<strong>How to improve accuracy:</strong> Add <code>density</code> (kg/m³) and <code>gwp</code> (kg CO₂eq/kg) fields to the material record in the database. Supplier-specific EPD values can differ substantially from industry averages, especially for recycled-content grades or bio-based polymers.
</div>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Interpreting the equivalences</h3>
<p>Two familiar equivalences are shown beneath the main results. The <em>km driven by car</em> figure uses the European passenger-car average of approximately 170 g CO₂/km. The <em>smartphone charges</em> figure uses a 21 g CO₂ per full charge estimate (average grid, 50 Wh battery). These are illustrative order-of-magnitude anchors, not certified offsets.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Scope and limitations</h3>
<p>This model covers <strong>cradle-to-gate</strong> only: raw material extraction plus polymer production. It intentionally excludes conversion processing (printing, lamination, form-fill-seal), distribution, use phase, and end-of-life. A full product-level LCA would require those additional modules and site-specific data. For official environmental product declarations or carbon labelling, use ISO 14040/14044-compliant software with certified background datasets.</p>

<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif">
<strong>Disclaimer:</strong> Results are indicative estimates for early-stage design screening. They must not be used for public environmental claims, carbon offsetting, or regulatory submissions without independent verification against ISO 14067 or equivalent standards.
</div>

</div>
</div>
</div>`;
  }

  function _headspaceMethodology() {
    return `
<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:#fff">
<div style="padding:1.2rem 1.5rem">
<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem">
Understanding the Headspace O₂ Model
</h2>
<div style="font-size:0.92rem;line-height:1.75;color:#334155;font-family:Georgia,'Times New Roman',serif">

<p>A sealed package is not a closed system. Oxygen molecules from the external atmosphere permeate continuously through the polymer film, driven by the partial-pressure gradient between the 20.95% O₂ outside and whatever concentration exists inside. Simultaneously, the product itself may consume oxygen through respiration (fresh produce) or oxidative metabolism. This calculator solves both fluxes simultaneously to predict how internal O₂ evolves over time.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">The mass-balance differential equation</h3>
<p>At any instant, the net rate of change of the O₂ volume inside the headspace is:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  dO₂/dt = OTR_eff · A − R_resp &nbsp;(cm³/day)<br><br>
  OTR_eff = OTR_film · A · (pO₂_ext − pO₂_int) / pO₂_ext<br><br>
  R_resp = k_resp · W &nbsp;[zero-order] &nbsp;or&nbsp; k_resp · W · O₂_frac &nbsp;[first-order]
</div>

<p>The <strong>driving-force correction</strong> scales the nominal film OTR by the actual partial-pressure gradient. When the headspace is flushed with nitrogen and contains nearly zero O₂, the full driving force is active and ingress is fastest. As O₂ accumulates inside, the gradient collapses and the ingress rate decreases — this is the critical non-linearity the model captures.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Zero-order vs first-order respiration</h3>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin:0.8rem 0;font-family:sans-serif;font-size:0.88rem">
  <div style="background:var(--primary-light);padding:0.7rem;border-radius:8px;border-left:3px solid var(--primary)">
    <strong>Zero-order (constant)</strong><br>
    The product consumes a fixed volume of O₂ per kg per day regardless of how much O₂ is present. Typical for processed or dried foods where respiration is chemical rather than biological.
  </div>
  <div style="background:#fdf4ff;padding:0.7rem;border-radius:8px;border-left:3px solid var(--purple)">
    <strong>First-order (∝ O₂)</strong><br>
    Consumption scales with the current O₂ fraction. Typical for living tissues (berries, salad, mushrooms) where cellular respiration is oxygen-limited.
  </div>
</div>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Numerical integration method</h3>
<p>The calculator uses explicit Euler integration with a half-day time step. At each step, the current internal O₂ fraction is used to compute both the ingress flux and the respiration sink, and the net change is accumulated. Simulation halts when the O₂ trajectory crosses the user-defined shelf-life limit — either rising (MAP-packaged meat losing modified atmosphere) or falling (fresh produce consuming all available O₂).</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Product presets</h3>
<p>The built-in presets encode typical starting and critical O₂ levels plus representative respiration rates from published food science literature. They are starting points for calibration, not validated targets — actual rates vary widely with cultivar, temperature, post-harvest treatment, and packaging history.</p>

<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif">
<strong>Disclaimer:</strong> This model is a screening tool for MAP design. Regulatory O₂ limits and microbial safety assessments for modified-atmosphere packaging must be validated by accredited laboratory testing and comply with applicable food safety legislation.
</div>

</div>
</div>
</div>`;
  }

  function _pharmaMVTRMethodology() {
    return `
<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:#fff">
<div style="padding:1.2rem 1.5rem">
<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem">
Understanding MVTR at ICH Conditions
</h2>
<div style="font-size:0.92rem;line-height:1.75;color:#334155;font-family:Georgia,'Times New Roman',serif">

<p>Pharmaceutical packaging must protect the drug substance across a global supply chain that spans temperate European warehouses, subtropical Mediterranean distribution hubs, and hot-humid South-East Asian pharmacies. ICH Q1A(R2) codifies this range into discrete climatic zones, each defined by a representative long-term temperature and relative humidity. This calculator predicts the effective MVTR of a barrier film at every zone and checks whether the resulting moisture ingress per blister cavity remains within the critical tolerance over the intended shelf life.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Arrhenius temperature correction</h3>
<p>Polymer permeability increases exponentially with temperature because thermal energy allows chain segments to fluctuate more widely, momentarily opening free-volume gaps through which gas molecules can hop. The Arrhenius equation captures this:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  WVTR(T) = WVTR_ref × exp( Eₐ/R × (1/T_ref − 1/T_ich) )<br><br>
  where R = 8.314×10⁻³ kJ·mol⁻¹·K⁻¹ and T in Kelvin
</div>

<p>The activation energy Eₐ encodes how sensitive a specific polymer is to temperature. Glassy barrier polymers like PVDC have high Eₐ (45–55 kJ/mol) and change dramatically with temperature. Semicrystalline polyolefins like LDPE have lower Eₐ (30–40 kJ/mol) and are less sensitive.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Relative humidity driving-force scaling</h3>
<p>Beyond temperature, the water-vapor partial pressure difference across the film drives ingress. At constant temperature, WVTR scales roughly linearly with the external RH because the driving force is proportional to the vapour-pressure gradient. The model applies:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  WVTR_eff = WVTR_corrected(T) × ( RH_ich / RH_ref )
</div>

<p>This is a first-order approximation that works well when the internal package RH is near zero (dry desiccant-containing packs or very dry drug substances). For products where the internal RH is not negligible, the net driving force should be computed as (RH_ext − RH_int) / RH_ext.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Moisture ingress per cavity</h3>
<p>Once WVTR_eff is known for a given zone, the total moisture entering one blister cavity over the shelf life is:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  m (mg) = WVTR_eff (g/m²·day) × A_cavity (m²) × days × 1000
</div>

<p>The PASS/FAIL verdict compares this value against the critical moisture gain limit you supply. For solid oral dosage forms, typical limits range from 0.5 mg (moisture-sensitive actives) to 5 mg (robust tablets). The ICH Accelerated condition (40°C/75% RH, 6 months) is often the defining constraint for Zone IVa markets.</p>

<div style="background:var(--warning-light);padding:0.75rem 1rem;border-radius:8px;border-left:3px solid var(--warning);margin:1rem 0;font-family:sans-serif;font-size:0.88rem">
<strong>Important:</strong> This calculation assumes the film is the only moisture pathway. Real blister packs also admit moisture through the heat-seal boundary (lidding-to-forming film interface) and through any micro-cracks formed during thermoforming. These contributions require physical leak testing per USP &lt;671&gt; or equivalent.
</div>

<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif">
<strong>Regulatory note:</strong> ICH Q1A(R2) zone assignments and stability testing protocols are defined by the relevant regulatory authority. Consult your local dossier requirements and validate predictions with real-time or accelerated stability studies before submitting registration dossiers.
</div>

</div>
</div>
</div>`;
  }

  function _pharmaUptakeMethodology() {
    return `
<div class="card methodology-card" style="margin-top:1.5rem;border-left:4px solid var(--primary);background:#fff">
<div style="padding:1.2rem 1.5rem">
<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.5rem;margin-bottom:1rem">
Understanding the Drug Moisture Uptake Model
</h2>
<div style="font-size:0.92rem;line-height:1.75;color:#334155;font-family:Georgia,'Times New Roman',serif">

<p>Moisture is one of the primary causes of drug degradation. Water molecules catalyse hydrolysis reactions that break covalent bonds in the active pharmaceutical ingredient, accelerate polymorphic transitions that alter bioavailability, and plasticise film coatings that control release kinetics. Predicting when a drug product will cross its critical moisture threshold — and therefore its specification limit — is central to setting an evidence-based shelf life.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Linear moisture ingress model</h3>
<p>Under the assumptions that (a) the drug substance acts as an infinite sink for water (internal RH ≈ 0) and (b) the barrier film is the rate-limiting transport step, moisture content increases linearly with time:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  dMC/dt = (WVTR_eff × A × RH_ext/100) / W_drug × 100 &nbsp;(%/day)<br><br>
  Shelf life = ΔMC_crit / (dMC/dt)
</div>

<p>The sink assumption is valid for very dry, hygroscopic APIs (initial MC ≤ 0.5%, critical MC ≤ 2%). For more benign drugs at higher humidity, the internal vapour pressure is non-negligible and the effective driving force is reduced. In those cases the linear model is conservative — it overpredicts ingress rate and underpredicts shelf life.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Arrhenius temperature correction</h3>
<p>The effective WVTR at the selected ICH storage condition is derived from the reference measurement using the same Arrhenius framework as the MVTR/ICH tool. Setting Eₐ = 0 disables temperature correction and the model uses the reference WVTR directly, scaled only by the RH ratio.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Chemical degradation overlay (first-order kinetics)</h3>
<p>In parallel with moisture accumulation, the tool can model potency loss via first-order degradation kinetics. This is the standard model used in ICH Q1E for establishing re-test periods and shelf lives:</p>

<div style="background:#f8fafc;padding:1.1rem;border-radius:6px;font-family:monospace;font-size:0.92rem;text-align:center;border:1px dashed var(--border);margin:1rem 0;color:#0f172a">
  P(t) = 100 × exp(−k × t)<br><br>
  ICH potency limit: P(t₉₀) ≥ 90% &nbsp;→&nbsp; t₉₀ = ln(100/90) / k ≈ 0.1054 / k
</div>

<p>The rate constant k is specific to the drug substance, storage temperature, and degradation pathway (hydrolysis, oxidation, photodegradation). Values are typically extracted from accelerated stability data using the Arrhenius relationship. The limiting factor display in the result panel identifies whether moisture uptake or chemical degradation is the binding constraint on shelf life — enabling the packaging engineer to focus optimisation effort on the right variable.</p>

<h3 style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:1.05rem;color:var(--primary-dark);margin:1.2rem 0 0.5rem;font-weight:700">Typical critical moisture content values</h3>
<table style="width:100%;border-collapse:collapse;margin:0.75rem 0;font-family:sans-serif;font-size:0.85rem">
  <thead><tr style="background:var(--primary-light)">
    <th style="padding:0.5rem 0.7rem;text-align:left">Dosage form / API type</th>
    <th style="padding:0.5rem 0.7rem;text-align:left">Typical ΔMC limit</th>
    <th style="padding:0.5rem 0.7rem;text-align:left">Rationale</th>
  </tr></thead>
  <tbody>
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:0.45rem 0.7rem">Highly hygroscopic API</td><td style="padding:0.45rem 0.7rem">0.5 – 1.0%</td><td style="padding:0.45rem 0.7rem">Hydrolysis or polymorphism risk</td></tr>
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:0.45rem 0.7rem">Standard compressed tablet</td><td style="padding:0.45rem 0.7rem">1.0 – 3.0%</td><td style="padding:0.45rem 0.7rem">Disintegration / hardness</td></tr>
    <tr style="border-bottom:1px solid var(--border)"><td style="padding:0.45rem 0.7rem">Film-coated tablet</td><td style="padding:0.45rem 0.7rem">0.5 – 1.5%</td><td style="padding:0.45rem 0.7rem">Coat integrity</td></tr>
    <tr><td style="padding:0.45rem 0.7rem">Lyophilised product</td><td style="padding:0.45rem 0.7rem">0.5 – 1.0%</td><td style="padding:0.45rem 0.7rem">Reconstitution / stability</td></tr>
  </tbody>
</table>

<div style="margin-top:1.5rem;padding:0.9rem;background:var(--bg);border-radius:8px;font-size:0.88rem;color:var(--text-light);border-left:4px solid var(--primary);font-family:sans-serif">
<strong>Regulatory note:</strong> Shelf life claims in regulatory dossiers must be supported by real-time stability data or, where accelerated data are used, by a validated predictive model accepted by the relevant authority. This tool is intended for internal feasibility screening under ICH Q1A(R2) guidance only.
</div>

</div>
</div>
</div>`;
  }

  // ──────────────────────────────────────────────────────────────────
  // FIXED RENDER FUNCTIONS
  // Each function writes into #app-content (the real app container)
  // and appends a methodology section.
  // ──────────────────────────────────────────────────────────────────

  function _renderCarbonFootprintFixed() {
    var c = document.getElementById('app-content');
    if (!c) return;

    var mats   = {};
    var allMats = (typeof DB !== 'undefined') ? DB.materials : [];
    for (var i = 0; i < allMats.length; i++) mats[allMats[i].id] = allMats[i];

    var layers = (typeof State !== 'undefined' && State.layers) ? State.layers : [];
    var area   = (typeof State !== 'undefined' && State.cfpArea) ? State.cfpArea : 0.04;

    // Use calcCarbonFootprint if available
    var cfp = null;
    if (layers.length > 0 && typeof calcCarbonFootprint === 'function') {
      cfp = calcCarbonFootprint(layers.map(function(l) {
        return { matId: l.mid, thickness: l.thick };
      }), mats, area);
    }

    var html = '<div style="max-width:900px;margin:0 auto">';
    html += '<div class="card">';
    html += '<h2 style="display:flex;align-items:center;gap:0.5rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--primary)"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 8v4l3 3"/></svg>Carbon Footprint Estimator</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Cradle-to-gate CO₂eq for the current laminate structure. Based on EPD values (PlasticsEurope / Ecoinvent). <strong>Not suitable for official LCA declarations.</strong></p>';

    // Package area input
    html += '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap">';
    html += '<label style="font-size:0.8rem;font-weight:600">Package surface area</label>';
    html += '<input type="number" id="cfp-area-input" value="' + (area * 1e4).toFixed(0) + '" min="1" step="1" class="form-input" style="width:100px">';
    html += '<span style="font-size:0.8rem">cm²</span>';
    html += '<button class="btn btn-sm btn-primary" onclick="onCfpAreaChangeFixed()">Update</button>';
    html += '</div>';

    if (!cfp || cfp.layers.length === 0) {
      html += '<div class="alert alert-info">No laminate defined yet. Build a structure in the <strong>Calculator</strong> tab first.</div>';
    } else {
      // Table
      html += '<div style="overflow-x:auto"><table class="cfp-table">';
      html += '<thead><tr><th>Layer</th><th>Thickness (µm)</th><th>Density (kg/m³)</th><th>GWP (kg CO₂eq/kg)</th><th>Mass (g/m²)</th><th>CO₂eq (g/m²)</th></tr></thead><tbody>';
      for (var j = 0; j < cfp.layers.length; j++) {
        var r = cfp.layers[j];
        html += '<tr' + (r.isDefault ? ' class="cfp-default"' : '') + '>';
        html += '<td>' + r.name + (r.isDefault ? ' <span class="cfp-est">est.</span>' : '') + '</td>';
        html += '<td>' + r.thickness + '</td>';
        html += '<td>' + r.density + '</td>';
        html += '<td>' + r.gwp.toFixed(2) + '</td>';
        html += '<td>' + (r.massPerM2 * 1000).toFixed(2) + '</td>';
        html += '<td>' + (r.co2PerM2 * 1000).toFixed(3) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';

      // Results
      html += '<div class="cfp-results" style="margin:1rem 0">';
      html += '<div class="cfp-result-card"><div class="cfp-result-val">' + (cfp.totalPerM2 * 1000).toFixed(1) + '</div><div class="cfp-result-lbl">g CO₂eq / m²</div></div>';
      html += '<div class="cfp-result-card cfp-accent"><div class="cfp-result-val">' + (cfp.totalPerUnit * 1000).toFixed(2) + '</div><div class="cfp-result-lbl">g CO₂eq / unit  (' + (area * 1e4).toFixed(0) + ' cm²)</div></div>';
      html += '</div>';

      var gPerUnit = cfp.totalPerUnit * 1000;
      html += '<div class="cfp-equiv">≈ ' + (gPerUnit / 170).toFixed(2) + ' km driven by car · or ' + (gPerUnit / 21).toFixed(2) + ' charges of a smartphone</div>';

      var hasDefaults = cfp.layers.some(function(r){ return r.isDefault; });
      if (hasDefaults) {
        html += '<div class="cfp-note" style="margin-top:0.75rem">⚠ Rows marked <em>est.</em> use default GWP values. Add <code>density</code> and <code>gwp</code> fields to the material record for precise values.</div>';
      }
    }

    html += '</div>'; // card
    html += _cfpMethodology();
    html += '</div>'; // max-width wrapper
    c.innerHTML = html;
  }

  // Expose the area-change handler globally
  window.onCfpAreaChangeFixed = function() {
    var v = parseFloat(document.getElementById('cfp-area-input').value);
    if (isNaN(v) || v <= 0) return;
    if (typeof State !== 'undefined') State.cfpArea = v / 1e4;
    _renderCarbonFootprintFixed();
  };

  function _renderHeadspaceFixed() {
    var c = document.getElementById('app-content');
    if (!c) return;

    var hs = (typeof State !== 'undefined' && State.headspace) ? State.headspace : {
      preset: 'coffee', otr_film: 1.0, area_cm2: 600, headspace_ml: 200,
      o2_initial: 0, o2_limit: 1, k_resp: 0, resp_order: 'zero', product_kg: 0.25, days: 365
    };

    var HS_PRESETS_LOCAL = (typeof HS_PRESETS !== 'undefined') ? HS_PRESETS : {
      'fresh-meat':   { o2_initial:70, o2_limit:5,  k_resp:10, resp_order:'zero',  label:'Fresh meat (MAP 70% O₂)' },
      'chilled-meat': { o2_initial:2,  o2_limit:1,  k_resp:5,  resp_order:'zero',  label:'Chilled cooked meat' },
      'cheese':       { o2_initial:0,  o2_limit:1,  k_resp:2,  resp_order:'first', label:'Cheese (vacuum)' },
      'coffee':       { o2_initial:0,  o2_limit:1,  k_resp:0,  resp_order:'zero',  label:'Roasted coffee (flushed N₂)' },
      'berries':      { o2_initial:21, o2_limit:3,  k_resp:30, resp_order:'first', label:'Fresh berries' },
      'salad':        { o2_initial:21, o2_limit:3,  k_resp:50, resp_order:'first', label:'Fresh-cut salad' },
      'custom':       { o2_initial:21, o2_limit:1,  k_resp:5,  resp_order:'zero',  label:'Custom' }
    };

    var presetOpts = '';
    for (var k in HS_PRESETS_LOCAL) {
      presetOpts += '<option value="' + k + '"' + (hs.preset === k ? ' selected' : '') + '>' + HS_PRESETS_LOCAL[k].label + '</option>';
    }

    function field(id, label, val, unit, step) {
      return '<div class="ph-field"><label>' + label + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
        '" step="' + (step||'any') + '" min="0" class="form-input"> <span class="ph-unit">' + unit + '</span></div></div>';
    }

    var html = '<div style="max-width:900px;margin:0 auto">';
    html += '<div class="card">';
    html += '<h2 style="display:flex;align-items:center;gap:0.5rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--primary)"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>Headspace O₂ Calculator</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Model O₂ evolution inside a sealed package: ingress through the film vs. product respiration.</p>';

    html += '<div class="form-group"><label>Product preset</label><select id="hs-preset" class="form-input" onchange="onHsPresetFixed()">' + presetOpts + '</select></div>';

    html += '<div class="pharma-grid">';
    html += field('hs-otr',    'Film OTR',            hs.otr_film,     'cm³/m²/day', 0.01);
    html += field('hs-area',   'Package inner area',  hs.area_cm2,     'cm²',        1);
    html += field('hs-vol',    'Headspace volume',    hs.headspace_ml, 'mL',         1);
    html += field('hs-o2init', 'Initial O₂',          hs.o2_initial,   '%',          0.1);
    html += field('hs-o2limit','O₂ shelf-life limit', hs.o2_limit,     '%',          0.1);
    html += field('hs-kresp',  'O₂ consumption rate', hs.k_resp,       'cm³/kg·day', 0.1);
    html += field('hs-prodkg', 'Product mass',        hs.product_kg,   'kg',         0.01);
    html += field('hs-days',   'Simulation duration', hs.days,         'days',       1);
    html += '<div class="ph-field"><label>Respiration order</label><select id="hs-order" class="form-input">';
    html += '<option value="zero"'  + (hs.resp_order === 'zero'  ? ' selected' : '') + '>Zero-order (constant)</option>';
    html += '<option value="first"' + (hs.resp_order === 'first' ? ' selected' : '') + '>First-order (∝ O₂)</option>';
    html += '</select></div>';
    html += '</div>';

    html += '<button class="btn btn-primary" onclick="onHsCalcFixed()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="hs-results" style="margin-top:1rem"></div>';
    html += '</div>'; // card

    html += _headspaceMethodology();
    html += '</div>';
    c.innerHTML = html;

    // Auto-calculate
    setTimeout(onHsCalcFixed, 100);
  }

  window.onHsPresetFixed = function() {
    var k = document.getElementById('hs-preset') ? document.getElementById('hs-preset').value : '';
    var p = (typeof HS_PRESETS !== 'undefined') ? HS_PRESETS[k] : null;
    if (!p) return;
    var set = function(id, v) { var e = document.getElementById(id); if (e) e.value = v; };
    set('hs-o2init',  p.o2_initial);
    set('hs-o2limit', p.o2_limit);
    set('hs-kresp',   p.k_resp);
    var ord = document.getElementById('hs-order'); if (ord) ord.value = p.resp_order;
  };

  window.onHsCalcFixed = function() {
    if (typeof calcHeadspace !== 'function') return;
    var get = function(id) { var e = document.getElementById(id); return e ? (parseFloat(e.value) || 0) : 0; };
    var params = {
      preset:       document.getElementById('hs-preset') ? document.getElementById('hs-preset').value : 'custom',
      otr_film:     get('hs-otr'), area_cm2:     get('hs-area'),
      headspace_ml: get('hs-vol'), o2_initial:   get('hs-o2init'),
      o2_limit:     get('hs-o2limit'), k_resp:    get('hs-kresp'),
      product_kg:   get('hs-prodkg'), resp_order: document.getElementById('hs-order') ? document.getElementById('hs-order').value : 'zero',
      days:         get('hs-days')
    };
    if (typeof State !== 'undefined') State.headspace = params;
    var res = calcHeadspace(params);
    var el = document.getElementById('hs-results');
    if (!el) return;

    var slText = res.shelfLifeDay !== null
      ? '<strong>' + res.shelfLifeDay.toFixed(0) + ' days</strong>'
      : '> ' + params.days + ' days (limit not reached)';

    var html = '<div class="ph-result-box">';
    html += '<div class="ph-kpi"><span class="ph-kpi-val">' + slText + '</span><span class="ph-kpi-lbl">Estimated shelf life</span></div>';
    html += '<div class="ph-kpi"><span class="ph-kpi-val">' + res.finalO2.toFixed(1) + '%</span><span class="ph-kpi-lbl">Final O₂ at day ' + params.days + '</span></div>';
    html += '</div>';
    if (typeof renderHsChart === 'function') {
      html += renderHsChart(res.timeline, params.o2_limit, params.o2_initial);
    }
    el.innerHTML = html;
  };

  function _renderPharmaMVTRFixed() {
    var c = document.getElementById('app-content');
    if (!c) return;

    var st = (typeof State !== 'undefined' && State.pharmaMVTR) ? State.pharmaMVTR : {
      wvtr_ref:1.0, T_ref:38, RH_ref:90, Ea_kJ:35, cavity_cm2:2.0, critical_mg:2.0, shelf_years:2
    };

    function field(id, label, val, unit, step) {
      return '<div class="ph-field"><label>' + label + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
        '" step="' + (step||'any') + '" min="0" class="form-input"> <span class="ph-unit">' + unit + '</span></div></div>';
    }

    var html = '<div style="max-width:960px;margin:0 auto">';
    html += '<div class="card">';
    html += '<h2 style="display:flex;align-items:center;gap:0.5rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--primary)"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>MVTR at ICH Conditions</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Calculate effective moisture vapor transmission rate across all ICH Q1A(R2) climatic zones.</p>';

    html += '<div class="pharma-grid">';
    html += '<div class="ph-section-title">Reference measurement (from datasheet or DB)</div>';
    html += field('ph-wvtr',  'WVTR (reference)',     st.wvtr_ref,    'g/m²/day', 0.01);
    html += field('ph-tref',  'Reference temperature',st.T_ref,       '°C',       0.5);
    html += field('ph-rhref', 'Reference RH',         st.RH_ref,      '%',        1);
    html += field('ph-ea',    'Activation energy Eₐ', st.Ea_kJ,       'kJ/mol',   1);
    html += '<div class="ph-hint">Eₐ = 0 disables Arrhenius correction (RH scaling only).<br>Typical values: PET 30–40 · PVDC 45–55 · PA 40–50 kJ/mol</div>';
    html += '<div class="ph-section-title">Blister geometry & criticality</div>';
    html += field('ph-area',  'Cavity surface area',   st.cavity_cm2,  'cm²',   0.1);
    html += field('ph-crit',  'Critical moisture gain',st.critical_mg, 'mg/cavity', 0.1);
    html += field('ph-years', 'Target shelf life',     st.shelf_years, 'years', 0.5);
    html += '</div>';

    html += '<button class="btn btn-primary" onclick="onPharmaMVTRCalcFixed()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="ph-results" style="margin-top:1rem"></div>';
    html += '</div>'; // card

    html += _pharmaMVTRMethodology();
    html += '</div>';
    c.innerHTML = html;
    setTimeout(onPharmaMVTRCalcFixed, 100);
  }

  window.onPharmaMVTRCalcFixed = function() {
    var get = function(id) { var e = document.getElementById(id); return e ? (parseFloat(e.value) || 0) : 0; };
    if (typeof wvtrAtCondition !== 'function' || typeof ICH_ZONES === 'undefined') {
      if (typeof onPharmaMVTRCalc === 'function') { onPharmaMVTRCalc(); return; }
      return;
    }
    var p = {
      wvtr_ref:get('ph-wvtr'), T_ref:get('ph-tref'), RH_ref:get('ph-rhref'),
      Ea_kJ:get('ph-ea'), cavity_cm2:get('ph-area'), critical_mg:get('ph-crit'), shelf_years:get('ph-years')
    };
    if (typeof State !== 'undefined') State.pharmaMVTR = p;
    var areaM2 = p.cavity_cm2 / 1e4;
    var shelfDays = p.shelf_years * 365;
    var rows = ICH_ZONES.map(function(z) {
      var wvtrEff = wvtrAtCondition(p.wvtr_ref, p.Ea_kJ, p.T_ref, p.RH_ref, z.T, z.RH);
      var ingress = wvtrEff * areaM2 * z.days * 1000;
      var total   = ingress * (shelfDays / z.days);
      return { zone:z, wvtrEff:wvtrEff, ingressPerYear:ingress, total:total, pass:total <= p.critical_mg };
    });
    if (typeof renderPharmaMVTRResults === 'function') renderPharmaMVTRResults(rows, p);
  };

  function _renderPharmaUptakeFixed() {
    var c = document.getElementById('app-content');
    if (!c) return;

    var st = (typeof State !== 'undefined' && State.pharmaUptake) ? State.pharmaUptake : {
      wvtr_ref:1.0, T_ref:38, RH_ref:90, Ea_kJ:35, ich_zone:'IVa', cavity_cm2:2.0,
      drug_mass_mg:200, mc_initial:0.5, delta_mc_crit:1.5, deg_model:'hydrolysis', k_deg_day:0.0003, sim_days:730
    };

    function field(id, label, val, unit, step) {
      return '<div class="ph-field"><label>' + label + '</label>' +
        '<div class="ph-input-row"><input type="number" id="' + id + '" value="' + val +
        '" step="' + (step||'any') + '" min="0" class="form-input"> <span class="ph-unit">' + unit + '</span></div></div>';
    }

    var zones = (typeof ICH_ZONES !== 'undefined') ? ICH_ZONES : (typeof UPTAKE_ICH_ZONES !== 'undefined' ? UPTAKE_ICH_ZONES : []);
    var zoneOpts = zones.map(function(z) {
      return '<option value="' + z.id + '"' + (st.ich_zone === z.id ? ' selected':'') + '>' + z.label + ' — ' + z.T + '°C / ' + z.RH + '% RH</option>';
    }).join('');

    var html = '<div style="max-width:960px;margin:0 auto">';
    html += '<div class="card">';
    html += '<h2 style="display:flex;align-items:center;gap:0.5rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:var(--primary)"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>Drug Moisture Uptake</h2>';
    html += '<p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem">Predict moisture content evolution and estimate shelf life limited by critical moisture gain or chemical degradation (ICH Q1A(R2)).</p>';

    html += '<div class="pharma-grid">';
    html += '<div class="ph-section-title">Barrier film (WVTR reference)</div>';
    html += field('pu-wvtr',  'WVTR reference',        st.wvtr_ref,     'g/m²/day', 0.01);
    html += field('pu-tref',  'Reference temperature', st.T_ref,        '°C',       0.5);
    html += field('pu-rhref', 'Reference RH',          st.RH_ref,       '%',        1);
    html += field('pu-ea',    'Activation energy Eₐ',  st.Ea_kJ,        'kJ/mol',   1);
    html += '<div class="ph-section-title">Storage conditions (ICH zone)</div>';
    html += '<div class="ph-field"><label>ICH zone</label><select id="pu-zone" class="form-input">' + zoneOpts + '</select></div>';
    html += '<div class="ph-section-title">Drug / dosage form</div>';
    html += field('pu-area',   'Cavity surface area',      st.cavity_cm2,   'cm²',  0.1);
    html += field('pu-dmass',  'Drug mass per cavity',     st.drug_mass_mg, 'mg',   1);
    html += field('pu-mcinit', 'Initial moisture content', st.mc_initial,   '%',    0.01);
    html += field('pu-dmcrit', 'Allowable moisture gain',  st.delta_mc_crit,'%',    0.1);
    html += '<div class="ph-hint">Typical limits: hygroscopic APIs 0.5–1% · tablets 1–3% · lyophilised 0.5%</div>';
    html += '<div class="ph-section-title">Chemical degradation (optional)</div>';
    html += '<div class="ph-field"><label>Model</label><select id="pu-degmodel" class="form-input">';
    html += '<option value="none"'       + (st.deg_model==='none'       ?' selected':'') + '>None</option>';
    html += '<option value="hydrolysis"' + (st.deg_model==='hydrolysis' ?' selected':'') + '>Hydrolysis (first-order)</option>';
    html += '<option value="oxidation"'  + (st.deg_model==='oxidation'  ?' selected':'') + '>Oxidation (first-order)</option>';
    html += '</select></div>';
    html += field('pu-kdeg',    'Rate constant k',       st.k_deg_day, '/day',  0.0001);
    html += '<div class="ph-hint">ICH limit: ≥ 90% potency. k = ln(100/90) / t₉₀</div>';
    html += field('pu-simdays', 'Simulation duration',  st.sim_days,  'days',  30);
    html += '</div>';

    html += '<button class="btn btn-primary" onclick="onPharmaUptakeCalcFixed()" style="margin-top:0.75rem">Calculate</button>';
    html += '<div id="pu-results" style="margin-top:1rem"></div>';
    html += '</div>'; // card

    html += _pharmaUptakeMethodology();
    html += '</div>';
    c.innerHTML = html;
    setTimeout(onPharmaUptakeCalcFixed, 100);
  }

  window.onPharmaUptakeCalcFixed = function() {
    if (typeof onPharmaUptakeCalc === 'function') { onPharmaUptakeCalc(); return; }
  };

  // ──────────────────────────────────────────────────────────────────
  // PATCHED renderContent
  // ──────────────────────────────────────────────────────────────────
  var NEW_TAB_RENDERERS = {
    'carbonfp':      _renderCarbonFootprintFixed,
    'headspace':     _renderHeadspaceFixed,
    'pharma-mvtr':   _renderPharmaMVTRFixed,
    'pharma-uptake': _renderPharmaUptakeFixed
  };

  window.renderContent = function () {
    var tab = (typeof State !== 'undefined') ? State.tab : '';
    if (NEW_TAB_RENDERERS[tab]) {
      NEW_TAB_RENDERERS[tab]();
    } else {
      if (typeof _originalRenderContent === 'function') {
        _originalRenderContent();
      }
    }
  };

})();
