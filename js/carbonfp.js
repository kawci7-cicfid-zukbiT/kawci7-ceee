// ====================================================================
// carbonfp.js  v4  —  Carbon Footprint Estimator
// Renders into #app-content
// MODIFICHE APPLICATE:
// - Rimossa sezione "CO₂eq per unit vs. Package Surface Area" (slider + grafico)
// - Rimossa funzionalità di salvataggio (pulsanti, logica, indicatori)
// - Layout ottimizzato per visibilità completa delle informazioni
// ====================================================================

var CFP_DEFAULTS = [
  { key:'PET',        density:1380, gwp:2.15 },
  { key:'BOPP',       density: 910, gwp:1.85 },
  { key:'OPP',        density: 910, gwp:1.85 },
  { key:'PP',         density: 910, gwp:1.85 },
  { key:'LDPE',       density: 950, gwp:1.90 },
  { key:'LLDPE',      density: 925, gwp:1.90 },
  { key:'PE',         density: 950, gwp:1.90 },
  { key:'HDPE',       density: 960, gwp:1.80 },
  { key:'PA',         density:1130, gwp:6.80 },
  { key:'NYLON',      density:1130, gwp:6.80 },
  { key:'EVOH',       density:1190, gwp:3.20 },
  { key:'PVC',        density:1380, gwp:2.80 },
  { key:'PVDC',       density:1700, gwp:4.50 },
  { key:'ALU',        density:2700, gwp:8.10 },
  { key:'ALUMINUM',   density:2700, gwp:8.10 },
  { key:'FOIL',       density:2700, gwp:8.10 },
  { key:'MET',        density:1380, gwp:2.40 },
  { key:'PAPER',      density: 700, gwp:0.90 },
  { key:'KRAFT',      density: 700, gwp:0.90 },
  { key:'PLA',        density:1240, gwp:0.50 },
  { key:'CELLOPHANE', density:1420, gwp:2.80 }
];

var CFP_PALETTE = [
  '#2563eb','#dc2626','#16a34a','#d97706',
  '#7c3aed','#0891b2','#ea580c','#db2777',
  '#0d9488','#9333ea'
];

function cfpDefaults(mat) {
  if (mat && mat.density && mat.gwp)
    return { density:mat.density, gwp:mat.gwp, isDefault:false };
  var name = ((mat ? mat.name:'') + ' ' + (mat ? mat.family||'':'')).toUpperCase();
  for (var i=0; i<CFP_DEFAULTS.length; i++)
    if (name.indexOf(CFP_DEFAULTS[i].key) !== -1)
      return { density:CFP_DEFAULTS[i].density, gwp:CFP_DEFAULTS[i].gwp, isDefault:true };
  return { density:1000, gwp:2.0, isDefault:true };
}

// Public API (used by shelflife etc.)
function calcCarbonFootprint(layers, mats, areaM2) {
  areaM2 = areaM2 || 1;
  var result = { layers:[], totalPerM2:0, totalPerUnit:0, areaM2:areaM2 };
  for (var i=0; i<layers.length; i++) {
    var l=layers[i], mat=mats[l.matId];
    if (!mat || !l.thickness) continue;
    var d=cfpDefaults(mat), thickM=l.thickness*1e-6, mass=d.density*thickM, co2=mass*d.gwp;
    result.layers.push({ name:mat.name, thickness:l.thickness, density:d.density, gwp:d.gwp,
      massPerM2:mass, co2PerM2:co2, isDefault:d.isDefault });
    result.totalPerM2 += co2;
  }
  result.totalPerUnit = result.totalPerM2 * areaM2;
  return result;
}

// ── Internal helpers ────────────────────────────────────────────────
function _cfpBuildRows() {
  var layers  = (typeof State!=='undefined' && State.layers) ? State.layers : [];
  var allMats = (typeof DB!=='undefined') ? DB.materials : [];
  var mats={};
  for (var i=0;i<allMats.length;i++) mats[allMats[i].id]=allMats[i];
  var rows=[];
  for (var i=0;i<layers.length;i++) {
    var l=layers[i], mat=mats[l.mid]||null;
    if (!mat || !l.thick) continue;
    var d=cfpDefaults(mat);
    var ov=(window._cfpEdit||{})[i];
    if (ov) {
      if (ov.density>0) { d.density=ov.density; d.isDefault=false; }
      if (ov.gwp>0)     { d.gwp=ov.gwp;         d.isDefault=false; }
    }
    var mass=d.density*l.thick*1e-6;
    rows.push({ idx:i, matId:l.mid, name:mat.name, thickness:l.thick,
      density:d.density, gwp:d.gwp, isDefault:d.isDefault,
      massPerM2:mass, co2PerM2:mass*d.gwp });
  }
  return rows;
}

function _cfpTotals(rows) {
  var t=0; for (var i=0;i<rows.length;i++) t+=rows[i].co2PerM2;
  return t; // kg/m²
}

// ── Live update (called after every cell/slider change) ─────────────
function _cfpUpdateAll() {
  var rows      = _cfpBuildRows();
  var totalPerM2= _cfpTotals(rows);          // kg/m²
  var areaCm2   = window._cfpArea || 400;
  var totalUnit = totalPerM2 * areaCm2/1e4;  // kg/unit

  // Derived cells in table
  for (var i=0;i<rows.length;i++) {
    var r=rows[i];
    var pct = totalPerM2>0 ? ((r.co2PerM2/totalPerM2)*100).toFixed(1)+'%' : '—';
    _cfpSet('cfp-mass-'+i,  (r.massPerM2*1000).toFixed(2));
    _cfpSet('cfp-co2-'+i,   (r.co2PerM2 *1000).toFixed(3));
    _cfpSet('cfp-pct-'+i,   pct);
  }

  // KPI cards
  _cfpSet('cfp-kpi-m2',   (totalPerM2*1000).toFixed(2));
  _cfpSet('cfp-kpi-unit', (totalUnit *1000).toFixed(2));
  _cfpSet('cfp-total-footer', (totalPerM2*1000).toFixed(3));

  // Unit label under KPI
  var uLbl = document.getElementById('cfp-unit-area-lbl');
  if (uLbl) uLbl.textContent = 'g CO₂eq / unit (' + areaCm2 + ' cm²)';

  _cfpDrawDonut(rows, totalPerM2);
  // Sensitivity chart removed
}

function _cfpSet(id, v) { var e=document.getElementById(id); if(e) e.textContent=v; }

// ── Donut chart ──────────────────────────────────────────────────────
function _cfpDrawDonut(rows, totalPerM2) {
  var canvas=document.getElementById('cfp-donut');
  if (!canvas || typeof Chart==='undefined') return;
  if (window._cfpDonutChart) { window._cfpDonutChart.destroy(); window._cfpDonutChart=null; }
  if (!rows.length || totalPerM2<=0) return;

  window._cfpDonutChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: rows.map(function(r){ return r.name; }),
      datasets: [{
        data: rows.map(function(r){ return +(r.co2PerM2*1000).toFixed(4); }),
        backgroundColor: CFP_PALETTE.slice(0,rows.length),
        borderColor: '#fff', borderWidth: 2, hoverOffset: 6
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false, cutout:'70%',
      plugins: {
        legend: {
          position:'right',
          labels: {
            boxWidth:10, padding:8, font:{ size:11 },
            generateLabels: function(chart) {
              var ds=chart.data.datasets[0];
              var total=ds.data.reduce(function(a,b){return a+b;},0);
              return chart.data.labels.map(function(lbl,i){
                var pct=total>0?((ds.data[i]/total)*100).toFixed(1):'0';
                return { text:lbl+' — '+pct+'%',
                  fillStyle:ds.backgroundColor[i], strokeStyle:ds.backgroundColor[i],
                  lineWidth:0, index:i };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx){
              var tot=ctx.dataset.data.reduce(function(a,b){return a+b;},0);
              var pct=tot>0?((ctx.parsed/tot)*100).toFixed(1):'0';
              return ' '+ctx.label+': '+ctx.parsed.toFixed(3)+' g CO₂eq/m²  ('+pct+'%)';
            }
          }
        }
      }
    }
  });
}

// ── Public event handlers ────────────────────────────────────────────
function cfpCellChange(idx) {
  if (!window._cfpEdit) window._cfpEdit={};
  var d=parseFloat(document.getElementById('cfp-d-'+idx)?document.getElementById('cfp-d-'+idx).value:0);
  var g=parseFloat(document.getElementById('cfp-g-'+idx)?document.getElementById('cfp-g-'+idx).value:0);
  window._cfpEdit[idx]={ density:isNaN(d)?0:d, gwp:isNaN(g)?0:g };
  _cfpUpdateAll();
}

// Area functions kept for internal calculations but UI removed
function cfpAreaSlider(v) {
  window._cfpArea=parseFloat(v)||400;
  _cfpUpdateAll();
}

function cfpAreaInput(v) {
  var val=Math.max(10,Math.min(5000,parseFloat(v)||400));
  window._cfpArea=val;
  _cfpUpdateAll();
}

// ── Main render ──────────────────────────────────────────────────────
function renderCarbonFootprint() {
  var c=document.getElementById('app-content'); if (!c) return;
  window._cfpEdit={};
  if (typeof State!=='undefined'&&State.cfpArea) window._cfpArea=State.cfpArea*1e4;
  var area=window._cfpArea||400;

  var rows=_cfpBuildRows();
  var totalPerM2=_cfpTotals(rows);
  var totalUnit=totalPerM2*area/1e4;
  var hasRows=rows.length>0;

  var html='<div style="max-width:1080px;margin:0 auto;padding-bottom:2rem">';

  // ── Page title ────────────────────────────────────────────────────
  html+='<div style="margin-bottom:1.5rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Food Analysis</div>';
  html+='<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem;letter-spacing:-0.01em">Carbon Footprint Estimator</h1>';
  html+='<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:600px">Cradle-to-gate CO₂eq for the current laminate structure, based on EPD values (PlasticsEurope / Ecoinvent 3.x). Edit Density and GWP cells directly to override defaults — all results update live.</p>';
  html+='</div>';

  if (!hasRows) {
    html+='<div class="card"><div class="alert alert-info" style="margin:0">No laminate configured. Go to the <strong>Calculator</strong> tab, build a layer structure, then return here.</div></div>';
    html+='</div>'; c.innerHTML=html; return;
  }

  // ── Two main KPIs ──────────────────────────────────────────────────
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.85rem;margin-bottom:1.25rem">';

  // KPI 1: per m² (fixed — independent of area)
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.4rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.5rem">Total CO₂eq per m²</div>';
  html+='<div style="font-size:2.4rem;font-weight:800;color:var(--primary);line-height:1" id="cfp-kpi-m2">'+(totalPerM2*1000).toFixed(2)+'</div>';
  html+='<div style="font-size:0.75rem;color:var(--text-light);margin-top:0.3rem">g CO₂eq / m² of laminate</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border)">This value is independent of package size — it characterises the material combination itself.</div>';
  html+='</div>';

  // KPI 2: per unit (depends on area)
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.4rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.5rem">Total CO₂eq per unit</div>';
  html+='<div style="font-size:2.4rem;font-weight:800;color:#7c3aed;line-height:1" id="cfp-kpi-unit">'+(totalUnit*1000).toFixed(2)+'</div>';
  html+='<div style="font-size:0.75rem;color:var(--text-light);margin-top:0.3rem" id="cfp-unit-area-lbl">g CO₂eq / unit ('+area+' cm²)</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid var(--border)">Based on current package surface area.</div>';
  html+='</div>';

  html+='</div>'; // end KPI row

  // ── Layer breakdown (table left) + donut (right) ──────────────────
  html+='<div style="display:grid;grid-template-columns:1.15fr 1fr;gap:1rem;margin-bottom:1.25rem">';

  // LEFT — table
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
  html+='<div style="padding:0.85rem 1.1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">';
  html+='<div>';
  html+='<div style="font-size:0.85rem;font-weight:700;color:var(--text)">Layer Breakdown</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-top:0.1rem">Edit Density and GWP to override EPD defaults</div>';
  html+='</div>';
  html+='<div style="display:flex;align-items:center;gap:0.6rem;font-size:0.7rem;color:var(--text-light)">';
  html+='<span style="display:inline-flex;align-items:center;gap:0.25rem"><span style="width:10px;height:10px;border-radius:2px;background:#fef3c7;border:1px solid #fcd34d;display:inline-block"></span>Estimated default</span>';
  html+='</div>';
  html+='</div>';

  // Table — 7 columns (save button column removed)
  html+='<div style="overflow-x:auto">';
  html+='<table style="width:100%;border-collapse:collapse;font-size:0.78rem;min-width:500px">';
  html+='<thead><tr style="background:#f8fafc">';
  var cols=[
    {label:'Material',     align:'left',   color:'var(--text)',       w:'auto'},
    {label:'µm',           align:'right',  color:'var(--text-light)', w:'44px'},
    {label:'Density (kg/m³)', align:'center', color:'#2563eb',       w:'110px'},
    {label:'GWP (kg CO₂eq/kg)', align:'center', color:'#2563eb',    w:'120px'},
    {label:'Mass (g/m²)', align:'right',  color:'var(--text-light)', w:'80px'},
    {label:'CO₂eq (g/m²)',align:'right',  color:'#7c3aed',           w:'90px'},
    {label:'Share',        align:'right',  color:'var(--text-light)', w:'55px'}
  ];
  for (var ci=0;ci<cols.length;ci++) {
    var co=cols[ci];
    html+='<th style="padding:0.55rem '+(ci===0?'1rem':'0.5rem')+';text-align:'+co.align+';font-weight:700;color:'+co.color+';border-bottom:1.5px solid var(--border);white-space:nowrap;width:'+co.w+'">'+co.label+'</th>';
  }
  html+='</tr></thead><tbody>';

  for (var ri=0;ri<rows.length;ri++) {
    var r=rows[ri];
    var clr=CFP_PALETTE[ri%CFP_PALETTE.length];
    var pct=totalPerM2>0?((r.co2PerM2/totalPerM2)*100).toFixed(1):'0';
    var iBg=r.isDefault?'#fffbeb':'#f0fdf4';
    var iBorder=r.isDefault?'#fcd34d':'#86efac';

    html+='<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.1s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">';

    // Material name
    html+='<td style="padding:0.6rem 1rem;vertical-align:middle">';
    html+='<div style="display:flex;align-items:center;gap:0.5rem">';
    html+='<span style="width:9px;height:9px;border-radius:50%;background:'+clr+';flex-shrink:0"></span>';
    html+='<span style="font-weight:600;color:var(--text)">'+r.name+'</span>';
    html+='<span id="cfp-est-'+ri+'" style="display:'+(r.isDefault?'inline':'none')+';background:#fef3c7;color:#d97706;padding:1px 5px;border-radius:3px;font-size:0.62rem;font-weight:700;flex-shrink:0">est.</span>';
    html+='</div></td>';

    // Thickness
    html+='<td style="padding:0.6rem 0.5rem;text-align:right;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums">'+r.thickness+'</td>';

    // Density input
    var inputStyle='width:100%;padding:0.32rem 0.45rem;border-radius:6px;font-size:0.78rem;text-align:right;border:1.5px solid '+iBorder+';background:'+iBg+';outline:none;transition:border-color 0.15s;box-sizing:border-box';
    html+='<td style="padding:0.4rem 0.5rem;vertical-align:middle">';
    html+='<input type="number" id="cfp-d-'+ri+'" value="'+r.density+'" min="1" step="1" oninput="cfpCellChange('+ri+')" style="'+inputStyle+'" onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\''+iBorder+'\'">';
    html+='</td>';

    // GWP input
    html+='<td style="padding:0.4rem 0.5rem;vertical-align:middle">';
    html+='<input type="number" id="cfp-g-'+ri+'" value="'+r.gwp.toFixed(2)+'" min="0" step="0.01" oninput="cfpCellChange('+ri+')" style="'+inputStyle+'" onfocus="this.style.borderColor=\'var(--primary)\'" onblur="this.style.borderColor=\''+iBorder+'\'">';
    html+='</td>';

    // Mass
    html+='<td style="padding:0.6rem 0.5rem;text-align:right;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-mass-'+ri+'">'+(r.massPerM2*1000).toFixed(2)+'</span></td>';

    // CO2
    html+='<td style="padding:0.6rem 0.5rem;text-align:right;font-weight:600;color:'+clr+';vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-co2-'+ri+'">'+(r.co2PerM2*1000).toFixed(3)+'</span></td>';

    // Share %
    html+='<td style="padding:0.6rem 0.5rem;text-align:right;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums"><span id="cfp-pct-'+ri+'">'+pct+'%</span></td>';

    html+='</tr>';
  }

  // Footer total — colspan updated for 7 columns
  html+='<tr style="background:var(--primary)">';
  html+='<td colspan="4" style="padding:0.55rem 1rem;text-align:right;color:rgba(255,255,255,0.7);font-weight:600;font-size:0.72rem">TOTAL</td>';
  html+='<td style="padding:0.55rem 0.5rem;text-align:right;color:#fff;font-weight:800;font-size:0.88rem;font-variant-numeric:tabular-nums"><span id="cfp-total-footer">'+(totalPerM2*1000).toFixed(3)+'</span></td>';
  html+='<td colspan="2" style="padding:0.55rem 0.5rem;text-align:right;color:rgba(255,255,255,0.6);font-size:0.7rem">g CO₂eq/m²</td>';
  html+='</tr>';

  html+='</tbody></table></div></div>'; // end left card

  // RIGHT — donut
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem">';
  html+='<div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:0.25rem">CO₂eq Distribution</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-bottom:0.85rem">Relative contribution by material layer</div>';
  html+='<div style="height:280px"><canvas id="cfp-donut"></canvas></div>';
  html+='</div>';

  html+='</div>'; // end 2-col grid

  // ── Disclaimer ────────────────────────────────────────────────────
  html+=_cfpMethodologyHTML();
  html+='</div>'; // max-width
  c.innerHTML=html;

  setTimeout(function(){
    var r2=_cfpBuildRows(), t2=_cfpTotals(r2);
    _cfpDrawDonut(r2,t2);
  },80);
}

function _cfpMethodologyHTML() {
  return '<div class="card" style="margin-top:1rem;border-left:4px solid var(--primary);background:var(--card)">' +
    '<div style="padding:1.1rem 1.4rem">' +
    '<h2 style="font-family:Georgia,\'Times New Roman\',serif;font-size:1.05rem;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:0.4rem;margin-bottom:0.8rem">Methodology &amp; Scope</h2>' +
    '<div style="font-size:0.85rem;line-height:1.7;color:#334155;font-family:Georgia,\'Times New Roman\',serif">' +
    '<p>The calculation follows a cradle-to-gate mass-balance model. For each layer:</p>' +
    '<div style="background:#f8fafc;padding:0.85rem 1rem;border-radius:6px;font-family:monospace;font-size:0.82rem;border:1px dashed var(--border);margin:0.75rem 0;text-align:center;color:#0f172a">' +
      'Mass (kg/m²) = density (kg/m³) &times; thickness (µm) &times; 10⁻⁶<br><br>' +
      'CO₂eq (kg/m²) = mass &times; GWP (kg CO₂eq / kg material)<br><br>' +
      'Total = &Sigma; CO₂eq_layer &nbsp;&nbsp;|&nbsp;&nbsp; Per unit = Total &times; package area (m²)' +
    '</div>' +
    '<p><strong>Default values:</strong> When a material record does not carry explicit density and GWP fields, the calculator resolves them from a keyword lookup table derived from PlasticsEurope Eco-profiles and Ecoinvent 3.x (European-average production). These rows are flagged <em>est.</em>. To improve accuracy, type the supplier-specific values directly in the table — results update live.</p>' +
    '<p><strong>Per-unit vs. per-m² results:</strong> The per-m² figure characterises the material combination itself and is independent of package size. The per-unit figure is the product of the per-m² value and the selected surface area, and scales linearly with it.</p>' +
    '<p><strong>Scope:</strong> Cradle-to-gate only. The model excludes conversion processes (printing, lamination, form-fill-seal), transport, retail, consumer use, and end-of-life treatment. A full product-level LCA covering all life-cycle stages requires ISO 14040/14044-compliant software with certified background datasets.</p>' +
    '<div style="background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:0.7rem 0.9rem;margin-top:0.85rem;font-family:sans-serif;font-size:0.8rem;color:var(--text-light)">' +
      '<strong>Disclaimer:</strong> Results are indicative estimates intended for early-stage design screening and internal comparison only. They must not be used as the basis for public environmental claims, carbon offsetting, or regulatory submissions without independent verification against ISO 14067 or equivalent standards.' +
    '</div>' +
    '</div></div></div>';
}

// Legacy compatibility
function onCfpAreaChange() {
  var v=parseFloat(document.getElementById('cfp-area-input')?document.getElementById('cfp-area-input').value:0);
  if (isNaN(v)||v<=0) return;
  if (typeof State!=='undefined') State.cfpArea=v/1e4;
  window._cfpArea=v;
  renderCarbonFootprint();
}
