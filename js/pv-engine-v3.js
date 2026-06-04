// ====================================================================
// MOISTURE-ENGINE V3  — DOM-free physics core
// ====================================================================
// New in v3 vs v2:
//  (1) Nonlinear sorption: GAB isotherm per encapsulant type
//      RH_int = solveGAB(I / m_enc, GABparams)  — same equation as ShelfLife
//  (2) Oxygen channel: OTR barrier + O2 degradation + H2O/O2 synergy
//      WVTR + OTR + lifetime in one engine — the killer combination
//  (3) UV distinction: G_UV = G × uvFraction (default 0.05 = ~UV-A band);
//      note: use NASA POWER ALLSKY_SFC_UV_A for per-location precision
//  (4) edgeFactor: the 8× amplification is now a named, citable param
//      (literature range 2-20×; Kempe 2018, Coyle 2013)
//  (5) Auto-fit: fitTech() minimises log-error vs benchmarks (Nelder-Mead)
// ====================================================================

const R = 8.314, T_REF = 298.15, P_ATM = 101325;
const PO2_EXT = 0.21 * P_ATM;   // partial pressure O2 in air (Pa), constant driving force

// --- Saturation vapour pressure (Pa), Magnus ---
function Psat(T) { return 610.94 * Math.exp((17.625 * T) / (T + 243.04)); }

// ================================================================
// (1) NON-LINEAR SORPTION  — GAB isotherm (same as ShelfLife.js)
// ================================================================
// encapsulant absorbs water; internal RH follows GAB isotherm
// M (g water / g dry) = Mm*C*K*aw / [(1-Kaw)(1-Kaw+CKaw)]
// Invert by bisection to get aw = internal RH fraction.

const ENCAPSULANT_DB = {
  eva:  { name:"EVA",  Mm:0.018, C:9.0,  K:0.84, rho:960,  note:"~0.3% saturation MC; Kempe/IEC approx." },
  poe:  { name:"POE",  Mm:0.009, C:11.0, K:0.87, rho:900,  note:"Lower sorption than EVA; IEC 62716 data." },
  tpu:  { name:"TPU",  Mm:0.065, C:6.5,  K:0.80, rho:1180, note:"Higher sorption; used in flexible modules." },
  pvb:  { name:"PVB",  Mm:0.022, C:8.5,  K:0.86, rho:1080, note:"Used in glass-glass; lower permeance." },
  none: { name:"Open", Mm:0.50,  C:2.0,  K:0.98, rho:1,    note:"Bare cell – equilibrates instantly." }
};

// Solve GAB for water activity aw given moisture content M [g/g]; bisection
function solveGAB(M, gab) {
  if (!gab || M <= 0) return 0;
  let lo = 0.001, hi = 0.999;
  for (let i = 0; i < 60; i++) {
    const aw = (lo + hi) / 2;
    const denom = (1 - gab.K * aw) * (1 - gab.K * aw + gab.C * gab.K * aw);
    if (denom <= 0) break;
    const Mc = gab.Mm * gab.C * gab.K * aw / denom;
    (Mc < M) ? (lo = aw) : (hi = aw);
  }
  return (lo + hi) / 2;
}

// encapsulant mass per m² (g/m²) from thickness (mm) and type
function encMass(type, thickMm) {
  const e = ENCAPSULANT_DB[type] || ENCAPSULANT_DB.eva;
  return e.rho * thickMm;          // ρ [g/m³ * mm → 1000 * g/cm³ * mm/10] = ρ[g/cm³]*100*mm = ρ*thickMm*1000/10 ... 
  // Actually: rho [g/cm³], thick [mm] → mass = rho [g/cm³] * thick [mm] * 0.1 [cm/mm] * 10000 [cm²/m²] = rho*thick*1000 [g/m²]
}
// Fix: rho in g/cm³, thick in mm
function encMassG(type, thickMm) {
  const e = ENCAPSULANT_DB[type] || ENCAPSULANT_DB.eva;
  return e.rho * thickMm * 100;    // g/cm³ × mm × (10mm/cm) × (1cm²/(100mm²)) × 10000mm²/m² = rho*thickMm*100
}

// ================================================================
// BARRIER — WVTR or OTR — normalised to permeance
// ================================================================
// val: barrier value at test conditions
//   WVTR: g/m²/day @(Ttest°C, RHtest%RH)  — standard 38°C/90%RH
//   OTR:  cc/m²/day @(Ttest°C, 100%O2)    — standard ASTM D3985 23°C/100%O2
function makeBarrier(val, Ttest, RHorO2frac, EaPerm, type) {
  EaPerm = EaPerm != null ? EaPerm : (type === 'otr' ? 30000 : 30000);
  const isOTR = (type === 'otr');
  const pTest = isOTR
    ? (RHorO2frac / 100) * P_ATM           // e.g. 100% O2 -> 101325 Pa
    : (RHorO2frac / 100) * Psat(Ttest);    // water vapour partial pressure at test
  const K_day = val / Math.max(pTest, 1e-9);   // g/(m²·day·Pa) or cc/(m²·day·Pa)
  const K_h   = K_day / 24;
  return {
    val, Ttest, EaPerm, type: type||'wvtr',
    K(T) { return K_h * Math.exp(-EaPerm / R * (1/(T+273.15) - 1/(Ttest+273.15))); }
  };
}

// ================================================================
// (2) CELL TECHNOLOGY DATABASE
// ================================================================
// k_m : moisture degradation [/h at RH=1, Tref]
// k_o2: oxidative degradation [/h per (cc/m²/h) of O2 flux]; for O2+H2O synergy
// k_syn: synergistic H2O×O2 factor [/h per (RH_int × J_O2_normalised)]
// k_t : thermal degradation [/h at Tref, no moisture/O2]
// k_uv: UV degradation [/h per unit (G_UV/1000)]  — G_UV = G × uvFraction
// Sources cited. All values screening-grade; refit using benchmark() → fitTech().
const PV_TECH_DB = {
  perovskite: {
    name:"Perovskite", k_m:3.6e-4, Ea_m:40000,
    k_o2:8e-7, Ea_o2:35000, k_syn:2e-9,
    k_t:2.2e-7, Ea_t:80000, k_uv:6e-6,
    source:"Tsuji 2024 (Materials 17,3002); Mariotti 2025 (WVTR 0.005→4200h DH); " +
           "Jeong/Emery 2024 (Nat.Commun, RSC EES): pass IEC 61215 DH 1000h encapsulated. " +
           "O2 channel: perovskite superoxide formation (Aristidou 2017 Nat.Commun)."
  },
  opv: {
    name:"Organic (OPV)", k_m:1.8e-4, Ea_m:38000,
    k_o2:4e-6, Ea_o2:32000, k_syn:6e-9,
    k_t:1.5e-7, Ea_t:70000, k_uv:2.2e-5,
    source:"Kettle 2022 (Prog.PV 30): moisture+O2+UV all critical for OPV; " +
           "k_uv elevated because photobleaching is a major degradation mode."
  },
  cigs: {
    name:"CIGS", k_m:7e-5, Ea_m:55000,
    k_o2:3e-7, Ea_o2:40000, k_syn:5e-10,
    k_t:8e-8, Ea_t:70000, k_uv:3e-6,
    source:"Coyle 2013 (Prog.PV, Life Prediction CIGS): moisture-ingress kinetics, DH/Miami accel 15-50x. " +
           "Shell minimodules >50% loss 168h bare (Kempe docs); ALD 3% loss 1000h; B-Dry >3000h."
  },
  cdte: {
    name:"CdTe", k_m:6e-5, Ea_m:60000,
    k_o2:8e-8, Ea_o2:40000, k_syn:1e-10,
    k_t:7e-8, Ea_t:70000, k_uv:3e-6,
    source:"Kettle 2022; DH study: frameless CdTe + edge sealant ~98% at 2000h (lag-time property)."
  },
  csi: {
    name:"Crystalline Silicon", k_m:2.8e-7, Ea_m:60000,
    k_o2:5e-9, Ea_o2:40000, k_syn:1e-11,
    k_t:8e-8, Ea_t:60000, k_uv:2.5e-5,
    source:"Jordan & Kurtz 2016 (Compendium, Prog.PV 24): x-Si median 0.5-0.6%/yr, mean 0.7-0.8%/yr. " +
           "O2 and moisture act indirectly (corrosion/PID/delamination)."
  }
};

// ================================================================
// BENCHMARKS — cited reference points for calibration
// ================================================================
const Y = 24 * 365.25;

const BENCHMARKS = [
  { id:"Perovskite, bare, DH 85/85 (dark)", tech:"perovskite",
    front:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100}, back:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100},
    encap:{type:"none",thickMm:0.01}, edge:{D:200,Q:0,gSeal:2e-7,edgeFactor:5},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:600, steps:3000, obsT80h:60, observed:"T80 ~16-125h (Tsuji 2024)" },

  { id:"Perovskite, encapsulated glass+PIB+desiccant, DH 85/85", tech:"perovskite",
    front:{wvtr:0.001,Tt:38,RHt:90, otr:0.05,OTt:23,O2t:100}, back:{wvtr:0.001,Tt:38,RHt:90, otr:0.05,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:6,Q:5,gSeal:2e-8,edgeFactor:6},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:10000, steps:4000, obsT80h:4000, observed:"T80 >1000-5000h (Tsuji/Emery 2024)" },

  { id:"CIGS, bare cells, 85C/100%RH", tech:"cigs",
    front:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100}, back:{wvtr:5000,Tt:38,RHt:90, otr:50,OTt:23,O2t:100},
    encap:{type:"none",thickMm:0.01}, edge:{D:200,Q:0,gSeal:2e-7,edgeFactor:5},
    env:{Tair:85,RH:100,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:600, steps:3000, obsT80h:90, observed:">50% loss at 168h (Kempe/Shell)" },

  { id:"CIGS, glass-glass + ALD + desiccant edge, DH", tech:"cigs",
    front:{wvtr:0.001,Tt:38,RHt:90, otr:0.01,OTt:23,O2t:100}, back:{wvtr:0.0001,Tt:38,RHt:90, otr:0.001,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:6,Q:6,gSeal:2e-8,edgeFactor:6},
    env:{Tair:85,RH:85,G:0,uvFraction:0.05}, tDelta:0, sorbC:null,
    horizonH:9*Y, steps:4000, obsT80h:2*Y, observed:"~3% loss at 1000h (Coyle 2013)" },

  { id:"c-Si field, moderate climate, glass-backsheet", tech:"csi",
    front:{wvtr:0.0001,Tt:38,RHt:90, otr:0.001,OTt:23,O2t:100}, back:{wvtr:1.5,Tt:38,RHt:90, otr:100,OTt:23,O2t:100},
    encap:{type:"eva",thickMm:0.5}, edge:{D:120,Q:0.5,gSeal:1e-7,edgeFactor:5},
    env:{Tair:20,RH:65,G:180,uvFraction:0.05}, tDelta:18, sorbC:null,
    horizonH:45*Y, steps:5000, obsT80h:40*Y, observed:"0.5%/yr median → T80 ~40yr (Jordan & Kurtz 2016)" }
];

// ================================================================
// MAIN SIMULATION  (moisture inventory + GAB + OTR + multi-channel)
// ================================================================
function simulate(cfg) {
  const tech = PV_TECH_DB[cfg.tech];
  if (!tech) throw new Error("Unknown tech: " + cfg.tech);
  const env  = cfg.env, edge = cfg.edge;
  const tDelta = cfg.tDelta != null ? cfg.tDelta : 18;

  // encapsulant sorption setup (GAB)
  const encType  = cfg.encap ? cfg.encap.type  : "eva";
  const encThick = cfg.encap ? cfg.encap.thickMm : 0.5;
  const enc = ENCAPSULANT_DB[encType] || ENCAPSULANT_DB.eva;
  const mEnc = encMassG(encType, encThick); // g/m² of encapsulant per layer (one side)
  const mEncTotal = 2 * mEnc;              // front + back encapsulant

  // barriers
  const fW = cfg.front, bW = cfg.back;
  const frontW = makeBarrier(fW.wvtr, fW.Tt, fW.RHt, fW.Ea, 'wvtr');
  const backW  = makeBarrier(bW.wvtr, bW.Tt, bW.RHt, bW.Ea, 'wvtr');
  const frontO = makeBarrier(fW.otr  || 0.01, fW.OTt||23, fW.O2t||100, fW.EaO, 'otr');
  const backO  = makeBarrier(bW.otr  || 0.01, bW.OTt||23, bW.O2t||100, bW.EaO, 'otr');

  const uvFrac = env.uvFraction != null ? env.uvFraction : 0.05;
  // uvFraction: fraction of total G that is UV-A/B. Default 0.05 (≈UV band).
  // For per-location precision use NASA POWER ALLSKY_SFC_UV_A [W/m²] directly.

  const Tmod = env.Tair + tDelta;
  const TmodK = Tmod + 273.15;
  const KwFaces = frontW.K(Tmod) + backW.K(Tmod);   // g/(m²·h·Pa)
  const KoFaces = frontO.K(Tmod) + backO.K(Tmod);   // cc/(m²·h·Pa)

  const pExtW = (env.RH / 100) * Psat(env.Tair);    // external water vapour (Pa)
  // O2: constant driving force (atmospheric air, O2 consumed fast by cell → int≈0)
  const JO2_service = KoFaces * PO2_EXT;             // cc/(m²·h) steady-state O2 flux

  // degradation Arrhenius factors
  const arrM  = Math.exp(-tech.Ea_m  / R * (1/TmodK - 1/T_REF));
  const arrO2 = Math.exp(-(tech.Ea_o2||35000) / R * (1/TmodK - 1/T_REF));
  const arrT  = Math.exp(-tech.Ea_t  / R * (1/TmodK - 1/T_REF));
  const G_UV  = (env.G || 0) * uvFrac;

  // (4) edgeFactor — named, citable
  // Justification: post-breakthrough, moisture diffuses through the partially-
  // degraded edge encapsulant, which has higher effective permeance than the
  // face laminate (lateral diffusion path, lower activation energy, possible
  // delamination). Literature: Kempe 2018 Prog.PV; Coyle 2013 Prog.PV.
  // Default 6; adjust via cfg.edge.edgeFactor. Typical literature range: 2–20.
  const edgeFactor = edge.edgeFactor != null ? edge.edgeFactor : 6;

  const L = (cfg.geom && cfg.geom.L) ? cfg.geom.L : 1.6;
  const W = (cfg.geom && cfg.geom.W) ? cfg.geom.W : 1.0;
  const horizonH = cfg.horizonH, steps = cfg.steps || 4000;
  const dt = horizonH / steps;

  let I = 0, dose = 0, edgeCumW = 0, breakthrough = false, tBreak = null;
  const series = [];
  let t80=null, t90=null, t97=null;

  for (let s = 0; s <= steps; s++) {
    const t = s * dt;

    // (1) GAB sorption: convert I [g/m²] to internal RH fraction
    const Mdry = mEncTotal > 0 ? I / mEncTotal : 1;     // g water / g dry encapsulant
    let RHint = solveGAB(Mdry, enc);
    RHint = Math.min(RHint, env.RH / 100);              // can't exceed source

    const pIntW = RHint * Psat(Tmod);

    // face flux (signed)
    const Jface = KwFaces * (pExtW - pIntW);            // g/(m²·h)

    // edge breakthrough + (4) edgeFactor
    if (!breakthrough) {
      const qSeal = (edge.gSeal != null ? edge.gSeal : 2e-8) * Math.max(pExtW - pIntW, 0);
      edgeCumW += qSeal * dt;
      if (edge.Q != null && edge.Q > 0 && edgeCumW >= edge.Q) { breakthrough = true; tBreak = t; }
      if (edge.Q === 0) { breakthrough = true; tBreak = 0; }
    }
    let Jedge = 0;
    if (breakthrough) {
      const frontMM = Math.sqrt(edge.D * Math.max(t - (tBreak||0), 0));
      const innerL = Math.max(0, L*1000 - 2*frontMM), innerW = Math.max(0, W*1000 - 2*frontMM);
      const aEdge = 1 - (innerL * innerW) / (L*1000 * W*1000);
      Jedge = aEdge * KwFaces * edgeFactor * (pExtW - pIntW);
    }

    I = Math.max(0, I + (Jface + Jedge) * dt);

    // degradation channels
    const rM   = tech.k_m   * RHint * arrM;
    const rO2  = tech.k_o2  * JO2_service * arrO2;     // proportional to O2 flux (cc/m²/h)
    const rSyn = (tech.k_syn||0) * RHint * JO2_service; // H2O × O2 synergy
    const rT   = tech.k_t   * arrT;
    const rUV  = tech.k_uv  * (G_UV / 1000);
    const ret = Math.exp(-dose);          // compute BEFORE this step's addition
    if (s % Math.max(1, Math.ceil(steps/400)) === 0) series.push({t, ret, RHint, I});
    if (t80  === null && ret <= 0.80) t80  = t;
    if (t90  === null && ret <= 0.90) t90  = t;
    if (t97  === null && ret <= 0.97) t97  = t;

    dose += (rM + rO2 + rSyn + rT + rUV) * dt;
  }
  // channel breakdown at T80
  const arrMr  = tech.k_m * 0.65 * arrM;  // 0.65 = representative avg RH_int
  const arrO2r = tech.k_o2  * JO2_service * arrO2;
  const rTr    = tech.k_t   * arrT;
  const rUVr   = tech.k_uv  * (G_UV / 1000);
  const totR   = arrMr + arrO2r + rTr + rUVr;
  return {
    t80, t90, t97, series, tBreak,
    channelFractions: totR > 0 ? {
      moisture: (arrMr/totR*100).toFixed(1)+'%',
      oxygen:   (arrO2r/totR*100).toFixed(1)+'%',
      thermal:  (rTr/totR*100).toFixed(1)+'%',
      uv:       (rUVr/totR*100).toFixed(1)+'%'
    } : null
  };
}

function interp(series, tNow, dose, thr) {
  const need = -Math.log(thr);
  const n = series.length;
  if (n < 2) return tNow;
  const prev = series[n-2], curr = series[n-1];
  if (!prev) return tNow;
  const f = (dose - (-Math.log(prev.ret))) / ((-Math.log(curr.ret)) - (-Math.log(prev.ret)) || 1);
  return prev.t + f * (curr.t - prev.t);
}

// ================================================================
// BENCHMARK  — compare model vs literature
// ================================================================
function benchmark() {
  return BENCHMARKS.map(b => {
    const r = simulate(b);
    const toYr = h => h==null ? ">horizon" : h >= Y ? (h/Y).toFixed(1)+"yr" : Math.round(h)+"h";
    const ratio = (r.t80 && b.obsT80h) ? (r.t80/b.obsT80h).toFixed(2)+"x" : "—";
    return { case:b.id, tech:b.tech, predicted:toYr(r.t80), reference:toYr(b.obsT80h),
             ratio, channels:r.channelFractions, source:b.observed };
  });
}

// ================================================================
// (5) AUTO-FIT  — Nelder-Mead minimisation over [log k_m, log k_t, log k_uv]
// ================================================================
// fitTech('perovskite', benchmarks)  →  { k_m, k_t, k_uv, rmse }
function nelderMead(f, x0, opts) {
  const n = x0.length, alpha=1, gamma=2, rho=0.5, sigma=0.5;
  const imax = (opts && opts.imax) || 800, tol = (opts && opts.tol) || 1e-7;
  let s = [x0, ...x0.map((v,i) => x0.map((u,j) => j===i ? u+0.5 : u))];
  const fv = s.map(f);
  for (let it = 0; it < imax; it++) {
    const ord = [...Array(n+1).keys()].sort((a,b)=>fv[a]-fv[b]);
    s = ord.map(i=>s[i]); for (let i=0;i<=n;i++) fv[i]=fv[ord[i]];
    if (fv[n]-fv[0]<tol) break;
    const c = Array(n).fill(0); for (let i=0;i<n;i++) for (let j=0;j<n;j++) c[j]+=s[i][j]/n;
    const xr = c.map((v,j)=>v+alpha*(v-s[n][j])), fr=f(xr);
    if (fr<fv[0]) { const xe=c.map((v,j)=>v+gamma*(xr[j]-v)),fe=f(xe); if(fe<fr){s[n]=xe;fv[n]=fe;}else{s[n]=xr;fv[n]=fr;} }
    else if (fr<fv[n-1]) { s[n]=xr; fv[n]=fr; }
    else { const xc=c.map((v,j)=>v+rho*(s[n][j]-v)),fc=f(xc);
      if(fc<fv[n]){s[n]=xc;fv[n]=fc;}else{s=s.map((xi,i)=>i?s[0].map((v,j)=>v+sigma*(xi[j]-v)):xi);for(let i=1;i<=n;i++)fv[i]=f(s[i]);} }
  }
  return s[0];
}

function fitTech(techKey, benchmarksSubset, quiet) {
  const params0 = [Math.log(PV_TECH_DB[techKey].k_m),
                   Math.log(PV_TECH_DB[techKey].k_t),
                   Math.log(PV_TECH_DB[techKey].k_uv)];
  const bms = (benchmarksSubset || BENCHMARKS).filter(b => b.tech === techKey && b.obsT80h);
  if (!bms.length) return null;
  const err = (lp) => {
    const techCopy = Object.assign({}, PV_TECH_DB[techKey],
      { k_m: Math.exp(lp[0]), k_t: Math.exp(lp[1]), k_uv: Math.exp(lp[2]) });
    const origTech = PV_TECH_DB[techKey];
    PV_TECH_DB[techKey] = techCopy;
    let e = 0;
    for (const b of bms) {
      const r = simulate(b);
      const pred = r.t80 || b.horizonH * 2;
      e += Math.pow(Math.log(pred / b.obsT80h), 2);
    }
    PV_TECH_DB[techKey] = origTech;
    return e;
  };
  const best = nelderMead(err, params0, { imax: 600 });
  const fitted = { k_m: Math.exp(best[0]), k_t: Math.exp(best[1]), k_uv: Math.exp(best[2]) };
  if (!quiet) {
    console.log(`fitTech(${techKey}):  k_m=${fitted.k_m.toExponential(2)}`+
      `  k_t=${fitted.k_t.toExponential(2)}  k_uv=${fitted.k_uv.toExponential(2)}`);
  }
  return fitted;
}

// ================================================================
// EXPORTS
// ================================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Psat, makeBarrier, solveGAB, ENCAPSULANT_DB, PV_TECH_DB, BENCHMARKS,
                     simulate, benchmark, fitTech, nelderMead };
}
if (typeof window !== "undefined") {
  window.MoistureEngine = { Psat, makeBarrier, solveGAB, ENCAPSULANT_DB, PV_TECH_DB, BENCHMARKS,
                            simulate, benchmark, fitTech, nelderMead };
}

// ================================================================
// NODE SELF-TEST  — demonstrable & citable
// ================================================================
if (typeof require !== "undefined" && require.main === module) {
  console.log("MOISTURE-ENGINE v3  |  WVTR + OTR + Lifetime  |  GAB isotherm + multi-channel\n");
  console.log("=".repeat(88));
  console.log("BENCHMARK vs ACADEMIC AGING DATA\n");
  for (const row of benchmark()) {
    console.log(`• ${row.case}`);
    console.log(`  Tech: ${row.tech}   |   Predicted T80: ${row.predicted}   |   Reference: ${row.reference}   |   ratio: ${row.ratio}`);
    if (row.channels) {
      const c = row.channels;
      console.log(`  Channels @ early-time: moisture ${c.moisture}  oxygen ${c.oxygen}  thermal ${c.thermal}  UV ${c.uv}`);
    }
    console.log(`  Source: ${row.source}`);
    console.log();
  }
  console.log("=".repeat(88));
  console.log("\nOTR DEMO — same perovskite encapsulated module but with bad OTR barrier:\n");
  const otrDemo = Object.assign({}, BENCHMARKS[1], {
    id:"Perovskite, glass + high-OTR film (bad O2 barrier)",
    front: Object.assign({}, BENCHMARKS[1].front, { otr:300, OTt:23, O2t:100 }),
    back:  Object.assign({}, BENCHMARKS[1].back,  { otr:500, OTt:23, O2t:100 })
  });
  const d = simulate(otrDemo);
  const Y2 = 24*365.25;
  const toYr = h => h==null?"—":h>=Y2?(h/Y2).toFixed(1)+"yr":Math.round(h)+"h";
  console.log(`  T80 with poor OTR: ${toYr(d.t80)}`);
  console.log(`  T80 with good OTR (from benchmark): ${toYr(simulate(BENCHMARKS[1]).t80)}`);
  if (d.channelFractions) console.log(`  Channels: moisture ${d.channelFractions.moisture}  O2 ${d.channelFractions.oxygen}  thermal ${d.channelFractions.thermal}  UV ${d.channelFractions.uv}`);
  console.log("\nAuto-fit perovskite k values on benchmarks:\n");
  fitTech('perovskite');
}
