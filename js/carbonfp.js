// ====================================================================
// carbonfp.js  v4.2  —  Carbon Footprint Estimator
// Layout: verticale - Layer Breakdown (full width) → Donut chart (sotto)
// Methodology: stile allineato a shelflife.js
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
  return t;
}

function _cfpUpdateAll() {
  var rows      = _cfpBuildRows();
  var totalPerM2= _cfpTotals(rows);
  var areaCm2   = window._cfpArea || 400;
  var totalUnit = totalPerM2 * areaCm2/1e4;

  for (var i=0;i<rows.length;i++) {
    var r=rows[i];
    var pct = totalPerM2>0 ? ((r.co2PerM2/totalPerM2)*100).toFixed(1)+'%' : '—';
    _cfpSet('cfp-mass-'+i,  (r.massPerM2*1000).toFixed(2));
    _cfpSet('cfp-co2-'+i,   (r.co2PerM2 *1000).toFixed(3));
    _cfpSet('cfp-pct-'+i,   pct);
  }

  _cfpSet('cfp-kpi-m2',   (totalPerM2*1000).toFixed(2));
  _cfpSet('cfp-kpi-unit', (totalUnit *1000).toFixed(2));
  _cfpSet('cfp-total-footer', (totalPerM2*1000).toFixed(3));

  var uLbl = document.getElementById('cfp-unit-area-lbl');
  if (uLbl) uLbl.textContent = 'g CO₂eq / unit (' + areaCm2 + ' cm²)';

  _cfpDrawDonut(rows, totalPerM2);
}

function _cfpSet(id, v) { var e=document.getElementById(id); if(e) e.textContent=v; }

function _cfpDrawDonut(rows, totalPerM2) {
  var canvas=document.getElementById('cfp-donut');
  if (!canvas || typeof Chart==='undefined') return;
  if (window._cfpDonutChart) { window._cfpDonutChart.destroy(); window._cfpDonutChart=null; }
  if (!rows.length || totalPerM2<=0) return;

  var dataValues = rows.map(function(r){ return +(r.co2PerM2*1000).toFixed(4); });

  window._cfpDonutChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: rows.map(function(r){ return r.name; }),
      datasets: [{
        data: dataValues,
        backgroundColor: CFP_PALETTE.slice(0,rows.length),
        borderColor: '#fff', borderWidth: 2, hoverOffset: 6
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'65%',
      plugins: {
        legend: {
          position:'bottom',
          labels: {
            boxWidth:12, padding:12, font:{ size:11 },
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

function cfpCellChange(idx) {
  if (!window._cfpEdit) window._cfpEdit={};
  var d=parseFloat(document.getElementById('cfp-d-'+idx)?document.getElementById('cfp-d-'+idx).value:0);
  var g=parseFloat(document.getElementById('cfp-g-'+idx)?document.getElementById('cfp-g-'+idx).value:0);
  window._cfpEdit[idx]={ density:isNaN(d)?0:d, gwp:isNaN(g)?0:g };
  _cfpUpdateAll();
}

function renderCarbonFootprint() {
  var c=document.getElementById('app-content'); if (!c) return;
  window._cfpEdit={};
  if (typeof State!=='undefined'&&State.cfpArea) window._cfpArea=State.cfpArea*1e4;
  var area=window._cfpArea||400;

  var rows=_cfpBuildRows();
  var totalPerM2=_cfpTotals(rows);
  var totalUnit=totalPerM2*area/1e4;
  var hasRows=rows.length>0;

  var html='<div style="max-width:1100px;margin:0 auto;padding:1.5rem">';

  // ── Page title ────────────────────────────────────────────────────
  html+='<div style="margin-bottom:1.5rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.3rem">Food Analysis</div>';
  html+='<h1 style="font-size:1.4rem;font-weight:800;color:var(--text);margin:0 0 0.35rem;letter-spacing:-0.01em">Carbon Footprint Estimator</h1>';
  html+='<p style="font-size:0.82rem;color:var(--text-light);margin:0;line-height:1.5;max-width:700px">Cradle-to-gate CO₂eq for the current laminate structure, based on EPD values (PlasticsEurope / Ecoinvent 3.x).</p>';
  html+='</div>';

  if (!hasRows) {
    html+='<div class="card"><div class="alert alert-info" style="margin:0">No laminate configured. Go to the <strong>Calculator</strong> tab, build a layer structure, then return here.</div></div>';
    html+='</div>'; c.innerHTML=html; return;
  }

  // ── Two main KPIs ──────────────────────────────────────────────────
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem;margin-bottom:1.5rem">';

  // KPI 1: per m²
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.4rem">Total CO₂eq per m²</div>';
  html+='<div style="font-size:2.4rem;font-weight:800;color:var(--primary);line-height:1;margin-bottom:0.4rem" id="cfp-kpi-m2">'+(totalPerM2*1000).toFixed(2)+'</div>';
  html+='<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.6rem">g CO₂eq / m² of laminate</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);padding-top:0.6rem;border-top:1px solid var(--border)">Independent of package size.</div>';
  html+='</div>';

  // KPI 2: per unit
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem">';
  html+='<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-light);margin-bottom:0.4rem">Total CO₂eq per unit</div>';
  html+='<div style="font-size:2.4rem;font-weight:800;color:#7c3aed;line-height:1;margin-bottom:0.4rem" id="cfp-kpi-unit">'+(totalUnit*1000).toFixed(2)+'</div>';
  html+='<div style="font-size:0.8rem;color:var(--text-light);margin-bottom:0.6rem" id="cfp-unit-area-lbl">g CO₂eq / unit ('+area+' cm²)</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);padding-top:0.6rem;border-top:1px solid var(--border)">Based on current surface area.</div>';
  html+='</div>';

  html+='</div>';

  // ── LAYER BREAKDOWN (FULL WIDTH - TOP) ────────────────────────────
  html+='<div style="margin-bottom:1.25rem">';
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
  
  // Header
  html+='<div style="padding:0.9rem 1.1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.6rem">';
  html+='<div>';
  html+='<div style="font-size:0.9rem;font-weight:700;color:var(--text)">Layer Breakdown</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-top:0.1rem">Edit Density and GWP to override EPD defaults</div>';
  html+='</div>';
  html+='<div style="display:flex;align-items:center;gap:0.6rem;font-size:0.7rem;color:var(--text-light)">';
  html+='<span style="display:inline-flex;align-items:center;gap:0.3rem"><span style="width:10px;height:10px;border-radius:2px;background:#fef3c7;border:1px solid #fcd34d;display:inline-block"></span>Estimated default</span>';
  html+='</div>';
  html+='</div>';

  // Table - COLONNE COMPATTE CON PERCENTUALI
  html+='<div style="overflow-x:auto">';
  html+='<table style="width:100%;border-collapse:collapse;font-size:0.75rem">';
  html+='<thead><tr style="background:#f8fafc;border-bottom:2px solid var(--border)">';
  var cols=[
    {label:'Material',     align:'left',   color:'var(--text)',       w:'38%'},
    {label:'µm',           align:'center', color:'var(--text-light)', w:'7%'},
    {label:'Density',      align:'center', color:'#2563eb',           w:'13%'},
    {label:'GWP',          align:'center', color:'#2563eb',           w:'13%'},
    {label:'Mass',         align:'right',  color:'var(--text-light)', w:'10%'},
    {label:'CO₂eq',        align:'right',  color:'#7c3aed',           w:'11%'},
    {label:'Share',        align:'right',  color:'var(--text-light)', w:'8%'}
  ];
  for (var ci=0;ci<cols.length;ci++) {
    var co=cols[ci];
    html+='<th style="padding:0.65rem 0.5rem;text-align:'+co.align+';font-weight:700;color:'+co.color+';white-space:nowrap;width:'+co.w+';font-size:0.72rem">'+co.label+'</th>';
  }
  html+='</tr></thead><tbody>';

  for (var ri=0;ri<rows.length;ri++) {
    var r=rows[ri];
    var clr=CFP_PALETTE[ri%CFP_PALETTE.length];
    var pct=totalPerM2>0?((r.co2PerM2/totalPerM2)*100).toFixed(1):'0';
    var iBg=r.isDefault?'#fffbeb':'#f0fdf4';
    var iBorder=r.isDefault?'#fcd34d':'#86efac';

    html+='<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">';

    // Material name
    html+='<td style="padding:0.7rem 0.5rem;vertical-align:middle">';
    html+='<div style="display:flex;align-items:center;gap:0.45rem">';
    html+='<span style="width:8px;height:8px;border-radius:50%;background:'+clr+';flex-shrink:0"></span>';
    html+='<span style="font-weight:600;color:var(--text);line-height:1.2;font-size:0.78rem">'+r.name+'</span>';
    html+='<span id="cfp-est-'+ri+'" style="display:'+(r.isDefault?'inline':'none')+';background:#fef3c7;color:#d97706;padding:1px 4px;border-radius:3px;font-size:0.58rem;font-weight:700;flex-shrink:0">est.</span>';
    html+='</div></td>';

    // Thickness
    html+='<td style="padding:0.7rem 0.5rem;text-align:center;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums;font-weight:500;font-size:0.78rem">'+r.thickness+'</td>';

    // Density input
    var inputStyle='width:100%;padding:0.3rem 0.35rem;border-radius:5px;font-size:0.73rem;text-align:center;border:1.5px solid '+iBorder+';background:'+iBg+';outline:none;transition:all 0.15s;box-sizing:border-box;font-weight:500';
    html+='<td style="padding:0.45rem 0.5rem;vertical-align:middle">';
    html+='<input type="number" id="cfp-d-'+ri+'" value="'+r.density+'" min="1" step="1" oninput="cfpCellChange('+ri+')" style="'+inputStyle+'" onfocus="this.style.borderColor=\'var(--primary)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\''+iBorder+'\';this.style.background=\''+iBg+'\'">';
    html+='</td>';

    // GWP input
    html+='<td style="padding:0.45rem 0.5rem;vertical-align:middle">';
    html+='<input type="number" id="cfp-g-'+ri+'" value="'+r.gwp.toFixed(2)+'" min="0" step="0.01" oninput="cfpCellChange('+ri+')" style="'+inputStyle+'" onfocus="this.style.borderColor=\'var(--primary)\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\''+iBorder+'\';this.style.background=\''+iBg+'\'">';
    html+='</td>';

    // Mass
    html+='<td style="padding:0.7rem 0.5rem;text-align:right;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums;font-weight:500;font-size:0.78rem"><span id="cfp-mass-'+ri+'">'+(r.massPerM2*1000).toFixed(2)+'</span></td>';

    // CO2
    html+='<td style="padding:0.7rem 0.5rem;text-align:right;font-weight:700;color:'+clr+';vertical-align:middle;font-variant-numeric:tabular-nums;font-size:0.78rem"><span id="cfp-co2-'+ri+'">'+(r.co2PerM2*1000).toFixed(3)+'</span></td>';

    // Share %
    html+='<td style="padding:0.7rem 0.5rem;text-align:right;color:var(--text-light);vertical-align:middle;font-variant-numeric:tabular-nums;font-weight:600;font-size:0.78rem"><span id="cfp-pct-'+ri+'">'+pct+'%</span></td>';

    html+='</tr>';
  }

  // Footer total
  html+='<tr style="background:var(--primary);font-weight:700">';
  html+='<td colspan="4" style="padding:0.65rem 0.5rem;text-align:right;color:rgba(255,255,255,0.9);font-size:0.78rem">TOTAL</td>';
  html+='<td colspan="3" style="padding:0.65rem 0.5rem;text-align:right;color:#fff;font-size:0.9rem;font-variant-numeric:tabular-nums"><span id="cfp-total-footer">'+(totalPerM2*1000).toFixed(3)+'</span> <span style="font-size:0.68rem;color:rgba(255,255,255,0.85);font-weight:500">g CO₂eq/m²</span></td>';
  html+='</tr>';

  html+='</tbody></table></div></div></div>';

  // ── CO₂eq DISTRIBUTION CHART (FULL WIDTH - BELOW) ─────────────────
  html+='<div style="margin-bottom:1.25rem">';
  html+='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.1rem">';
  html+='<div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:0.3rem;text-align:center">CO₂eq Distribution</div>';
  html+='<div style="font-size:0.72rem;color:var(--text-light);margin-bottom:0.9rem;text-align:center">Relative contribution by material layer</div>';
  html+='<div style="height:300px;position:relative;max-width:500px;margin:0 auto"><canvas id="cfp-donut"></canvas></div>';
  html+='</div></div>';

  // ── Methodology (stile shelflife.js) ─────────────────────────────
  html+=_cfpMethodologyHTML();
  html+='</div>';
  
  c.innerHTML=html;

  setTimeout(function(){
    var r2=_cfpBuildRows(), t2=_cfpTotals(r2);
    _cfpDrawDonut(r2,t2);
  },100);
}

// ── Methodology HTML (STILE ALLINEATO A SHELFLIFE.JS) ───────────────
function _cfpMethodologyHTML() {
  return `
<div class="card" style="margin-top:1rem; border-left:4px solid var(--primary); background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
  <div style="padding:1.2rem 1.5rem;">
    <h2 style="font-family:Georgia, 'Times New Roman', serif; font-size:1.3rem; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:0.5rem; margin-bottom:1.2rem;">
      Carbon Footprint: Methodology &amp; Scope
    </h2>
    <div style="font-size:0.95rem; line-height:1.8; color:#334155; font-family:Georgia, 'Times New Roman', serif;">

      <p>Estimating the carbon footprint of flexible packaging requires a systematic approach that balances scientific rigor with practical usability. This calculator implements a cradle-to-gate mass-balance model aligned with ISO 14040/14044 principles, designed for early-stage packaging design and material comparison.</p>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:1.5rem; font-weight:700;">Core Calculation Model</h3>
      <p>For each layer in the laminate structure, the carbon footprint is computed through a two-step mass-balance equation:</p>

      <div style="background:var(--primary-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--primary); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
        <strong>Step 1 — Mass per unit area:</strong><br>
        Mass (kg/m²) = density (kg/m³) × thickness (µm) × 10⁻⁶
      </div>

      <div style="background:var(--primary-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--primary); margin:0.5rem 0 1rem 0; font-family:sans-serif; font-size:0.9rem;">
        <strong>Step 2 — CO₂eq contribution:</strong><br>
        CO₂eq (kg/m²) = Mass × GWP (kg CO₂eq / kg material)
      </div>

      <p>The total footprint per square meter is the sum of all layer contributions. To obtain the per-unit value, multiply by the package surface area:</p>

      <div style="background:#f8fafc; padding:1.1rem; border-radius:6px; font-family:monospace; font-size:0.95rem; text-align:center; border:1px dashed var(--border); margin:1rem 0; color:#0f172a;">
        Total CO₂eq/unit = Σ(CO₂eq_layer) × package area (m²)
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Data Sources &amp; Default Values</h3>
      <p>When a material record does not include explicit density or Global Warming Potential (GWP) fields, the calculator resolves them from a curated keyword lookup table derived from:</p>

      <ul style="margin:0.5rem 0 1rem 1.5rem; padding-left:0.5rem;">
        <li><strong>PlasticsEurope Eco-profiles:</strong> Industry-average LCA data for polymer production in Europe, covering extraction, polymerization, and compounding stages.</li>
        <li><strong>Ecoinvent 3.x:</strong> Peer-reviewed background datasets for energy, transport, and upstream processes, ensuring methodological consistency across the supply chain.</li>
      </ul>

      <div style="background:var(--warning-light); padding:0.8rem 1rem; border-radius:8px; border-left:3px solid var(--warning); margin:1rem 0; font-family:sans-serif; font-size:0.9rem;">
        <strong>⚠️ Estimated values:</strong> Rows flagged with <em>est.</em> use database defaults. For supplier-specific accuracy, enter verified density and GWP values directly in the table — results update live.
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Per-m² vs. Per-unit Results</h3>
      <p>Understanding the distinction between these two metrics is essential for correct interpretation:</p>

      <table style="width:100%; border-collapse:collapse; margin:1rem 0; font-family:sans-serif; font-size:0.88rem;">
        <thead>
          <tr style="background:#f1f5f9; border-bottom:2px solid var(--border);">
            <th style="padding:0.6rem; text-align:left; width:30%;">Metric</th>
            <th style="padding:0.6rem; text-align:left; width:70%;">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:0.6rem; font-weight:bold; color:var(--primary-dark);">CO₂eq / m²</td>
            <td>Characterizes the material combination itself. Independent of package geometry. Use this to compare laminate structures.</td>
          </tr>
          <tr>
            <td style="padding:0.6rem; font-weight:bold; color:var(--purple);">CO₂eq / unit</td>
            <td>Represents the footprint of one finished package. Scales linearly with surface area. Use this for product-level comparisons.</td>
          </tr>
        </tbody>
      </table>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">System Boundaries &amp; Exclusions</h3>
      <p>This calculator adopts a <strong>cradle-to-gate</strong> scope, covering:</p>
      <ul style="margin:0.5rem 0 1rem 1.5rem; padding-left:0.5rem;">
        <li>✓ Raw material extraction (fossil feedstocks, biomass, minerals)</li>
        <li>✓ Polymer production and compounding</li>
        <li>✓ Film extrusion and metallization (where applicable)</li>
      </ul>

      <p>The following stages are <strong>explicitly excluded</strong> and must be assessed separately for a full product LCA:</p>
      <ul style="margin:0.5rem 0 1rem 1.5rem; padding-left:0.5rem; color:var(--text-light);">
        <li>✗ Conversion processes: printing, lamination, pouch forming</li>
        <li>✗ Distribution: transport, warehousing, retail logistics</li>
        <li>✗ Use phase: consumer handling, storage conditions</li>
        <li>✗ End-of-life: collection, recycling, incineration, landfill</li>
      </ul>

      <div style="background:#f0fdf4; padding:1rem; border-radius:8px; border-left:3px solid var(--success); margin:1.2rem 0; font-family:sans-serif; font-size:0.9rem;">
        <strong style="color:#16a34a; font-size:0.95rem;">💡 Practical Example:</strong><br>
        A 3-layer pouch (PET 12µm / Alu 9µm / PE 50µm) with total area 0.04 m²:
        <ul style="margin-top:0.5rem; margin-left:1rem;">
          <li>PET: 1380 kg/m³ × 12µm × 2.15 GWP = 0.036 kg CO₂eq/m²</li>
          <li>Alu: 2700 kg/m³ × 9µm × 8.10 GWP = 0.197 kg CO₂eq/m²</li>
          <li>PE: 950 kg/m³ × 50µm × 1.90 GWP = 0.090 kg CO₂eq/m²</li>
          <li><strong>Total:</strong> 0.323 kg CO₂eq/m² × 0.04 m² = <strong>12.9 g CO₂eq per pouch</strong></li>
        </ul>
      </div>

      <h3 style="font-family:-apple-system, BlinkMacSystemFont, sans-serif; font-size:1.1rem; color:var(--primary-dark); margin-top:2rem; font-weight:700;">Standards Alignment</h3>
      <p>The methodology and reporting structure align with international frameworks:</p>
      <p style="margin-left:1.2rem; color:var(--text-light); font-size:0.88rem; font-family:sans-serif;">
        • <strong>ISO 14040/14044:</strong> Life Cycle Assessment — Principles and Framework<br>
        • <strong>ISO 14067:</strong> Carbon Footprint of Products — Requirements and Guidelines<br>
        • <strong>GHG Protocol Product Standard:</strong> Corporate accounting for product emissions<br>
        • <strong>EN 15804+A2:</strong> Sustainability of construction works — EPD core rules (for material-level data)
      </p>

      <div style="margin-top:2rem; padding:0.9rem; background:var(--bg); border-radius:8px; font-size:0.88rem; color:var(--text-light); border-left:4px solid var(--primary); font-family:sans-serif;">
        <strong>Disclaimer:</strong> Results are indicative estimates intended for early-stage design screening and internal comparison only. They must not be used as the basis for public environmental claims, carbon offsetting, or regulatory submissions without independent verification against ISO 14067 or equivalent standards. Supplier-specific data and full life-cycle boundaries are required for compliance-grade declarations.
      </div>

    </div>
  </div>
</div>
`;
}

function onCfpAreaChange() {
  var v=parseFloat(document.getElementById('cfp-area-input')?document.getElementById('cfp-area-input').value:0);
  if (isNaN(v)||v<=0) return;
  if (typeof State!=='undefined') State.cfpArea=v/1e4;
  window._cfpArea=v;
  renderCarbonFootprint();
}
