// ====================================================================
// ⚙️ ENGINE.JS - Core calculation engine, DB, State, constants
// ====================================================================

const Engine = {
  R_GAS: 8.314,
  mode: 'wvtr',

  calcHygroscopicCorrection: function(mat, condition, mode) {
    mode = mode || Engine.mode;
    var betaKey = mode === 'wvtr' ? 'hygroscopicBetaWVTR' : 'hygroscopicBetaOTR';
    var refKey  = mode === 'wvtr' ? 'hygroscopicRefRHWVTR' : 'hygroscopicRefRHOTR';
    var beta   = mat[betaKey];
    var refRH  = mat[refKey];

    if (!beta && mat.hygroscopicBeta > 0) {
      beta  = mat.hygroscopicBeta;
      refRH = mat.hygroscopicRefRH || 50;
    }
    if (!beta || beta <= 0) return { factor: 1, correction: 0, message: null };

    if (!refRH || refRH === 50) {
      var testRH = null;
      if (mat.validConditions && mat.validConditions.length > 0) {
        var bestMatch = mat.validConditions[0];
        var minTempDiff = Math.abs(mat.validConditions[0].temperature - condition.temperature);
        for (var i = 1; i < mat.validConditions.length; i++) {
          var diff = Math.abs(mat.validConditions[i].temperature - condition.temperature);
          if (diff < minTempDiff) { minTempDiff = diff; bestMatch = mat.validConditions[i]; }
        }
        testRH = bestMatch.humidity;
      }
      if (testRH !== null && Math.abs(testRH - condition.humidity) < 2)
        return { factor: 1, correction: 0, message: null };
      if (testRH !== null) refRH = testRH;
    }
    if (!refRH) refRH = 50;

    var rhDiff = condition.humidity - refRH;
    if (Math.abs(rhDiff) < 2) return { factor: 1, correction: 0, message: null };

    // FIX 6: Quadratic hygroscopic correction.
    // Linear β underestimates EVOH above 75–80% RH where diffusivity rises
    // super-linearly. Model: P_corrected = P_ref × exp(β·ΔRH + β₂·ΔRH²)
    // β₂ (hygroscopicBeta2) defaults to 0 → identical to original linear model.
    // Literature values for EVOH 32 mol% ethylene (Lagaron et al. 2001):
    //   β  ≈ 0.030 %RH⁻¹  β₂ ≈ 0.0003 %RH⁻² (significant above 75% RH)
    var beta2Key = mode === 'wvtr' ? 'hygroscopicBeta2WVTR' : 'hygroscopicBeta2OTR';
    var beta2    = mat[beta2Key] || mat.hygroscopicBeta2 || 0;

    var factor        = Math.exp(beta * rhDiff + beta2 * rhDiff * rhDiff);
    var correctionPct = (factor - 1) * 100;
    var quadNote      = beta2 > 0 ? ' (quadratic β₂ active)' : '';
    return {
      factor:        factor,
      correction:    correctionPct,
      message:       mat.name + ': +' + correctionPct.toFixed(1) + '% permeability at ' +
                     condition.humidity + '% RH vs ' + refRH + '% RH reference' + quadNote,
      isSignificant: Math.abs(correctionPct) > 10
    };
  },

  validateData: function(mat) {
    var errs = [];
    var vals = this.mode === 'wvtr' ? mat.wvtrValues : mat.otrValues;
    if (!vals || vals.length === 0) errs.push('No ' + (this.mode === 'wvtr' ? 'WVTR' : 'OTR') + ' data');

    if (vals && vals.length > 0) {
      var hasAnyCond = false;
      for (var ci = 0; ci < vals.length; ci++) {
        var c = Engine._getCondFromVal(vals[ci], mat, ci);
        if (c) { hasAnyCond = true; break; }
      }
      if (!hasAnyCond) errs.push('No test conditions');
    } else if (!mat.validConditions || mat.validConditions.length === 0) {
      errs.push('No test conditions');
    }

    for (var i = 0; i < (vals || []).length; i++) {
      var w = vals[i];
      if (!w || w.value == null || isNaN(w.value)) errs.push('Row ' + (i + 1) + ': value null/NaN');
      else if (w.value < 0) errs.push('Row ' + (i + 1) + ': negative value');
      if (!w || w.thickness == null || isNaN(w.thickness)) errs.push('Row ' + (i + 1) + ': thickness null/NaN');
      else if (w.thickness <= 0) errs.push('Row ' + (i + 1) + ': thickness must be > 0');
    }
    return errs;
  },

  getValues: function(mat) { return this.mode === 'wvtr' ? mat.wvtrValues : mat.otrValues; },

  _getCondFromVal: function(val, mat, idx) {
    if (val && val.temperature != null && val.humidity != null)
      return { temperature: val.temperature, humidity: val.humidity };
    if (mat.validConditions && mat.validConditions[idx] != null)
      return mat.validConditions[idx];
    return null;
  },

  _getAvailableConditions: function(mat) {
    var vals = this.getValues(mat);
    if (!vals || vals.length === 0) return [];
    var activeMethod = (typeof State !== 'undefined' && State.selectedTestMethod) ? State.selectedTestMethod.trim().toLowerCase() : '';
    var result = [];
    for (var i = 0; i < vals.length; i++) {
      var c = this._getCondFromVal(vals[i], mat, i);
      if (!c) continue;
      var rowTM = (vals[i].testMethod) ||
                  (mat.validConditions && mat.validConditions[i] && mat.validConditions[i].testMethod) ||
                  (Engine.mode === 'wvtr' ? mat.testMethodWVTR : mat.testMethodOTR) ||
                  (mat.testMethod) || '';
      if (activeMethod && rowTM && rowTM.trim().toLowerCase() !== activeMethod) continue;
      var already = false;
      for (var j = 0; j < result.length; j++) {
        if (Math.abs(result[j].temperature - c.temperature) < 0.01 &&
            Math.abs(result[j].humidity    - c.humidity)    < 0.01 &&
            (result[j].testMethod || '') === rowTM) { already = true; break; }
      }
      if (!already) {
        var condObj = { temperature: c.temperature, humidity: c.humidity };
        if (rowTM) condObj.testMethod = rowTM;
        result.push(condObj);
      }
    }
    return result;
  },

  getUnits: function() {
    return this.mode === 'wvtr'
      ? { value: 'g/m²·day',  label: 'WVTR' }
      : { value: 'cc/m²·day', label: 'OTR'  };
  },

  findCommonConditions: function(layers, materials, testMethodFilter) {
    var mats = layers
      .filter(function(l) { return l.mid !== null; })
      .map(function(l) { return materials.find(function(m) { return m.id === l.mid; }); })
      .filter(Boolean);
    if (mats.length === 0) return { conditions: [], error: null, warning: null, matInfo: null };

    var allE = [];
    for (var j = 0; j < mats.length; j++) {
      var v = Engine.validateData(mats[j]);
      for (var k = 0; k < v.length; k++) allE.push(v[k]);
    }
    if (allE.length > 0) return { conditions: [], error: allE.join('. '), warning: null, matInfo: null };

    var common = Engine._getAvailableConditions(mats[0]);
    for (var i = 1; i < mats.length; i++) {
      var nc = Engine._getAvailableConditions(mats[i]);
      common = common.filter(function(c) {
        return nc.some(function(n) {
          return Math.abs(n.temperature - c.temperature) < 0.01 &&
                 Math.abs(n.humidity    - c.humidity)    < 0.01;
        });
      });
    }

    var matInfo = mats.map(function(m) {
      var conds = Engine._getAvailableConditions(m);
      return {
        name:       m.name,
        conditions: conds.map(function(c) { return c.temperature + '°C/' + c.humidity + '%'; })
      };
    });
    if (common.length === 0)
      return { conditions: [], error: 'No common test conditions found', warning: null, matInfo: matInfo };
    return { conditions: common, error: null, warning: null, matInfo: matInfo };
  },

  // ====================================================================
  // FIX: calcLayerResistance ora usa regressione lineare su tutti i punti
  // che matchano la stessa condizione + test method invece di prendere
  // solo il primo. Questo rende il calcolo più accurato quando il DB
  // contiene misurazioni a spessori diversi per la stessa condizione.
  // Formula OLS con intercetta zero pesata per thickness:
  //   P = Σ(v_i × t_i²) / Σ(t_i²)
  // ====================================================================
  calcLayerResistance: function(layer, material, condition) {
    var vals = this.getValues(material);

    // Raccoglie TUTTI i punti che matchano condizione + testMethod
    var matchingPoints = [];
    for (var i = 0; i < vals.length; i++) {
      var c = Engine._getCondFromVal(vals[i], material, i);
      if (!c) continue;
      var condMatch =
        Math.abs(c.temperature - condition.temperature) < 0.01 &&
        Math.abs(c.humidity    - condition.humidity)    < 0.01;

      var rowMethod = (vals[i] && vals[i].testMethod) ||
                      (material.validConditions && material.validConditions[i] &&
                       material.validConditions[i].testMethod) ||
                      (Engine.mode === 'wvtr' ? material.testMethodWVTR : material.testMethodOTR) ||
                      (material.testMethod) || null;

      var methodMatch = !State.selectedTestMethod ||
                        !rowMethod ||
                        rowMethod.trim().toLowerCase() === State.selectedTestMethod.trim().toLowerCase();

      if (condMatch && methodMatch &&
          vals[i].value != null && !isNaN(vals[i].value) &&
          vals[i].thickness > 0) {
        matchingPoints.push({ value: vals[i].value, thickness: vals[i].thickness });
      }
    }

    if (matchingPoints.length === 0)
      return { resistance: null, error: 'Condition or test method not found' };

    // Calcola il coefficiente di permeabilità ottimale
    var permeabilityCoeff;
    if (matchingPoints.length === 1) {
      // Un solo punto → comportamento originale
      permeabilityCoeff = matchingPoints[0].value * matchingPoints[0].thickness;
    } else {
      // Più punti → regressione lineare OLS con intercetta zero pesata per thickness
      // Modello fisico: value = P / thickness  →  value * thickness = P (costante)
      // Stima ottimale: P = Σ(v_i * t_i²) / Σ(t_i²)
      var sumNum = 0, sumDen = 0;
      for (var j = 0; j < matchingPoints.length; j++) {
        var t = matchingPoints[j].thickness;
        var v = matchingPoints[j].value;
        sumNum += v * t * t;
        sumDen += t * t;
      }
      permeabilityCoeff = sumNum / sumDen;
    }

    if (permeabilityCoeff <= 0.00001)
      return { resistance: Infinity, transmissionAtThickness: 0, isBarrier: true, hygroCorrection: null };

    if (material.isMetallized) {
      // FIX 5: Metal thickness correction via empirical pinhole density model.
      // WVTR_eff = WVTR_ref × exp(−k_ph × (t_nm − t_ref_nm))
      // where k_ph ≈ 0.04 nm⁻¹ (Chatham 1996; Yanaka 2001 empirical fit).
      // t_ref_nm = 30 nm (typical measurement thickness for AlOx/SiOx data).
      // If metalThickness_nm is not set, falls back to original behaviour.
      var metalNm = material.metalThickness_nm || 0;
      var surfacePermeability = permeabilityCoeff;
      if (metalNm > 0) {
        var k_ph    = material.metalPinholeK || 0.04;   // nm⁻¹, literature default
        var t_ref   = material.metalRefThickness_nm || 30; // nm reference
        surfacePermeability = permeabilityCoeff * Math.exp(-k_ph * (metalNm - t_ref));
        if (surfacePermeability <= 0) surfacePermeability = 1e-9;
      }
      return {
        resistance:              1 / surfacePermeability,
        transmissionAtThickness: surfacePermeability,
        isBarrier:               surfacePermeability < 0.1,
        isMetallized:            true,
        metalThickness_nm:       metalNm,
        hygroCorrection:         null,
        pointsUsed:              matchingPoints.length
      };
    }

    var baseResistance   = layer.thick / permeabilityCoeff;
    var baseTransmission = 1 / baseResistance;
    var hygro            = Engine.calcHygroscopicCorrection(material, condition, Engine.mode);
    var finalTransmission = baseTransmission * hygro.factor;
    var finalResistance   = finalTransmission > 0 ? 1 / finalTransmission : Infinity;

    return {
      resistance:              finalResistance,
      transmissionAtThickness: finalTransmission,
      baseTransmission:        baseTransmission,
      isBarrier:               finalTransmission < 0.1,
      hygroCorrection:         hygro.factor !== 1 ? hygro : null,
      pointsUsed:              matchingPoints.length,
      permeabilityCoeff:       permeabilityCoeff
    };
  },

  calcTotal: function(layers, materials, condition) {
    var results = [];
    var totalR  = 0;
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (layer.mid === null || layer.thick <= 0)
        return { error: 'All layers must have material and thickness > 0' };
      var mat = null;
      for (var j = 0; j < materials.length; j++) {
        if (materials[j].id === layer.mid) { mat = materials[j]; break; }
      }
      if (!mat) return { error: 'Material not found for layer ' + (i + 1) };
      var res = Engine.calcLayerResistance(layer, mat, condition);
      if (res.error) return { error: res.error };
      if (res.resistance === null) return { error: 'Calculation failed' };
      results.push({
        layerIndex:              i,
        materialName:            mat.name,
        thickness:               layer.thick,
        resistance:              res.resistance,
        transmissionAtThickness: res.transmissionAtThickness,
        isBarrier:               res.isBarrier,
        hygroCorrection:         res.hygroCorrection || null,
        pointsUsed:              res.pointsUsed || 1
      });
      if (res.resistance === Infinity)
        return { total: 0, layers: results, isBarrier: true, error: null };
      totalR += res.resistance;
    }
    var total = totalR > 0 ? 1 / totalR : 0;
    for (var r = 0; r < results.length; r++) {
      results[r].resistancePct = totalR > 0 ? (results[r].resistance / totalR) * 100 : 0;
    }
    return { total: total, layers: results, totalResistance: totalR, isBarrier: false, error: null };
  },

  validateArrhenius: function(mat) {
    var vals = this.getValues(mat);
    var e    = this.validateData(mat);
    if (e.length > 0) return { valid: false, error: e.join('. ') };
    if (vals.length < 2) return { valid: false, error: 'Need 2+ data points' };
    var availConds = Engine._getAvailableConditions(mat);
    var temps = {};
    for (var i = 0; i < availConds.length; i++) temps[availConds[i].temperature] = true;
    if (Object.keys(temps).length < 2) return { valid: false, error: 'Need 2+ different temperatures' };
    var hums = availConds.map(function(c) { return c.humidity; });
    // FIX 8: tighter RH tolerance (2%) for hygroscopic materials (EVOH, Nylon,
    // regenerated cellulose) where 5% ΔRH can cause 30-40% variation in P,
    // confounding temperature effect with humidity effect in the regression.
    var isHygroscopic = false;
    if (mat.hygroscopicBetaWVTR > 0 || mat.hygroscopicBetaOTR > 0 || mat.hygroscopicBeta > 0)
      isHygroscopic = true;
    var rhTol = isHygroscopic ? 2 : 5;
    if (Math.max.apply(null, hums) - Math.min.apply(null, hums) > rhTol)
      return { valid: false, error: 'Humidity must be same (max ' + rhTol + '% diff' + (isHygroscopic ? ' — tighter tolerance for hygroscopic materials' : '') + ')' };
    for (var w = 0; w < vals.length; w++)
      if (vals[w].value <= 0) return { valid: false, error: 'All values must be > 0' };
    return { valid: true };
  },

  calcArrheniusParams: function(mat) {
    var v = this.validateArrhenius(mat);
    if (!v.valid) return { valid: false, error: v.error };
    var vals = this.getValues(mat);
    var R    = Engine.R_GAS;
    var dps  = [];
    for (var i = 0; i < vals.length; i++) {
      var c2 = Engine._getCondFromVal(vals[i], mat, i);
      if (!c2) continue;
      var tk = c2.temperature + 273.15;
      if (vals[i].value > 0) dps.push({ T_K: tk, trans: vals[i].value });
    }
    if (dps.length < 2) return { valid: false, error: 'Need 2+ valid points' };
    var sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (var d = 0; d < dps.length; d++) {
      var x = 1 / dps[d].T_K, y = Math.log(dps[d].trans);
      sx += x; sy += y; sxy += x * y; sx2 += x * x;
    }
    var slope     = (dps.length * sxy - sx * sy) / (dps.length * sx2 - sx * sx);
    var intercept = (sy - slope * sx) / dps.length;
    var Ea        = -slope * R;
    var A         = Math.exp(intercept);
    var ym = 0;
    for (var dd = 0; dd < dps.length; dd++) ym += Math.log(dps[dd].trans);
    ym /= dps.length;
    var ssT = 0, ssR = 0;
    for (var dp = 0; dp < dps.length; dp++) {
      var ya = Math.log(dps[dp].trans), yp = slope * (1 / dps[dp].T_K) + intercept;
      ssT += Math.pow(ya - ym, 2); ssR += Math.pow(ya - yp, 2);
    }
    var n      = dps.length;
    var rSq    = ssT > 0 ? 1 - ssR / ssT : 1;
    // FIX 4: 95% prediction interval on the Arrhenius regression.
    // In log-space: SE_residual = sqrt(SSR / (n-2))
    // SE_pred(x0) = SE_res × sqrt(1 + 1/n + (x0 - x_mean)² / Sxx)
    // PI_95 = t_{n-2,0.975} × SE_pred  (in log-space → factor on linear scale)
    // t critical values (two-tailed 95%) for small n:
    var tCrit  = [Infinity, Infinity, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262];
    var tc     = n >= 10 ? 1.960 : (tCrit[n] || 1.960);
    var Sxx    = sx2 - sx * sx / n;   // Σ(xi - x̄)²
    var xMean  = sx / n;
    var seRes  = n > 2 ? Math.sqrt(ssR / (n - 2)) : 0;
    return {
      valid: true, Ea: Ea, A: A, rSquared: rSq, dataPoints: dps,
      seResidual: seRes, tCrit: tc, Sxx: Sxx, xMean: xMean,
      // Helper: returns 95% PI bounds (linear scale) for a given target T [K]
      predInterval: function(T_K) {
        if (seRes === 0 || Sxx === 0) return null;
        var x0  = 1 / T_K;
        var sePred = seRes * Math.sqrt(1 + 1/n + Math.pow(x0 - xMean, 2) / Sxx);
        var yHat   = slope * x0 + intercept;
        return {
          lower: Math.exp(yHat - tc * sePred),
          upper: Math.exp(yHat + tc * sePred),
          seLog: sePred
        };
      }
    };
  },

  predict: function(A, Ea, tempC) {
    return A * Math.exp(-Ea / (Engine.R_GAS * (tempC + 273.15)));
  },

  applyArrhenius: function(mat, targetTempC) {
    var p = this.calcArrheniusParams(mat);
    if (!p.valid) return { error: p.error };
    var pred = this.predict(p.A, p.Ea, targetTempC);
    var minT = p.dataPoints[0].T_K - 273.15, maxT = p.dataPoints[0].T_K - 273.15;
    for (var i = 0; i < p.dataPoints.length; i++) {
      var t = p.dataPoints[i].T_K - 273.15;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
    return {
      Ea:             p.Ea, A: p.A, predicted: pred, targetTempC: targetTempC,
      minTemp:        minT, maxTemp: maxT,
      isExtrapolation: targetTempC < minT - 1 || targetTempC > maxT + 1,
      dataPoints:     p.dataPoints, rSquared: p.rSquared
    };
  },

  // ====================================================================
  // FIX: calcSensitivityCurve ora restituisce anche i punti misurati reali
  // del materiale alla condizione selezionata, per mostrarli nel grafico
  // ====================================================================
  calcSensitivityCurve: function(layers, materials, condition, targetLayerIdx, tMin, tMax, steps) {
    var targetLayer = layers[targetLayerIdx];
    if (!targetLayer || targetLayer.mid === null) return { error: 'Invalid target layer' };
    var mat = null;
    for (var m = 0; m < materials.length; m++) {
      if (materials[m].id === targetLayer.mid) { mat = materials[m]; break; }
    }
    if (!mat) return { error: 'Material not found' };

    var step   = (tMax - tMin) / steps;
    var points = [];
    for (var t = tMin; t <= tMax + step / 2; t += step) {
      var testLayers = layers.map(function(l, idx) {
        return idx === targetLayerIdx ? Object.assign({}, l, { thick: t }) : l;
      });
      var res = this.calcTotal(testLayers, materials, condition);
      if (!res.error) points.push({ thickness: t, total: res.total });
    }

    // Raccoglie i punti misurati reali per il layer target alla condizione selezionata
    var measuredPoints = [];
    var vals = this.getValues(mat);
    for (var vi = 0; vi < vals.length; vi++) {
      var c = Engine._getCondFromVal(vals[vi], mat, vi);
      if (!c) continue;
      var condMatch =
        Math.abs(c.temperature - condition.temperature) < 0.01 &&
        Math.abs(c.humidity    - condition.humidity)    < 0.01;
      var rowMethod = (vals[vi].testMethod) ||
                      (mat.validConditions && mat.validConditions[vi] &&
                       mat.validConditions[vi].testMethod) ||
                      (Engine.mode === 'wvtr' ? mat.testMethodWVTR : mat.testMethodOTR) || '';
      var methodMatch = !State.selectedTestMethod ||
                        !rowMethod ||
                        rowMethod.trim().toLowerCase() === State.selectedTestMethod.trim().toLowerCase();
      if (condMatch && methodMatch && vals[vi].value > 0 && vals[vi].thickness > 0) {
        // Calcola il valore del laminate completo usando lo spessore misurato
        var testLayersMeas = layers.map(function(l, idx) {
          return idx === targetLayerIdx
            ? Object.assign({}, l, { thick: vals[vi].thickness })
            : l;
        });
        var resMeas = this.calcTotal(testLayersMeas, materials, condition);
        if (!resMeas.error) {
          measuredPoints.push({
            thickness: vals[vi].thickness,
            total:     resMeas.total,
            value:     vals[vi].value,
            method:    rowMethod
          });
        }
      }
    }

    return { points: points, measuredPoints: measuredPoints, error: null };
  },

  optimizeForTarget: function(layers, materials, condition, targetValue, barrierLayerIdx) {
    var barrier = layers[barrierLayerIdx];
    if (!barrier || barrier.mid === null) return { error: 'Invalid barrier layer' };
    var mat = null;
    for (var m = 0; m < materials.length; m++) {
      if (materials[m].id === barrier.mid) { mat = materials[m]; break; }
    }
    if (!mat) return { error: 'Material not found' };
    var vals    = this.getValues(mat);
    var condIdx = -1;
    for (var i = 0; i < vals.length; i++) {
      var cv = Engine._getCondFromVal(vals[i], mat, i);
      if (!cv) continue;
      if (Math.abs(cv.temperature - condition.temperature) < 0.01 &&
          Math.abs(cv.humidity    - condition.humidity)    < 0.01) {
        condIdx = i; break;
      }
    }
    if (condIdx < 0) return { error: 'Condition not found' };

    // Usa il coefficiente di permeabilità ottimale (regressione su tutti i punti)
    var matchingPoints = [];
    for (var mi = 0; mi < vals.length; mi++) {
      var cmi = Engine._getCondFromVal(vals[mi], mat, mi);
      if (!cmi) continue;
      if (Math.abs(cmi.temperature - condition.temperature) < 0.01 &&
          Math.abs(cmi.humidity    - condition.humidity)    < 0.01 &&
          vals[mi].value > 0 && vals[mi].thickness > 0) {
        matchingPoints.push({ value: vals[mi].value, thickness: vals[mi].thickness });
      }
    }
    var permeabilityCoeff;
    if (matchingPoints.length === 1) {
      permeabilityCoeff = matchingPoints[0].value * matchingPoints[0].thickness;
    } else {
      var sumNum = 0, sumDen = 0;
      for (var j = 0; j < matchingPoints.length; j++) {
        var tt = matchingPoints[j].thickness;
        var vv = matchingPoints[j].value;
        sumNum += vv * tt * tt;
        sumDen += tt * tt;
      }
      permeabilityCoeff = sumNum / sumDen;
    }
    if (permeabilityCoeff <= 0) return { error: 'Reference value is 0' };

    var otherR = 0;
    for (var j2 = 0; j2 < layers.length; j2++) {
      if (j2 === barrierLayerIdx) continue;
      var l = layers[j2];
      if (l.mid === null || l.thick <= 0) continue;
      var mm = null;
      for (var k = 0; k < materials.length; k++) {
        if (materials[k].id === l.mid) { mm = materials[k]; break; }
      }
      if (!mm) continue;
      var res2 = this.calcLayerResistance(l, mm, condition);
      if (res2.resistance !== null && res2.resistance !== Infinity) otherR += res2.resistance;
    }
    var requiredTotalR = 1 / targetValue;
    var barrierR       = requiredTotalR - otherR;
    if (barrierR <= 0) return { thickness: 0.1, error: 'Target too high - other layers already sufficient' };
    var thickness = barrierR * permeabilityCoeff;
    return { thickness: Math.max(thickness, 0.1), targetResistance: barrierR, error: null };
  },

  checkRecyclability: function(layers, materials) {
    var families = {};
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].mid === null) continue;
      var mat = null;
      for (var j = 0; j < materials.length; j++) {
        if (materials[j].id === layers[i].mid) { mat = materials[j]; break; }
      }
      if (!mat) continue;
      if (mat.family) families[mat.family] = true;
    }
    var famList = Object.keys(families);
    return { recyclable: famList.length <= 1 && famList.length > 0, families: famList, monoStructure: famList.length === 1 };
  }
};

// ====================================================================
// 🧬 POLYMER FAMILIES
// ====================================================================
var POLYMER_FAMILIES = {
  PE:    ['LDPE', 'HDPE', 'LLDPE', 'Polyethylene'],
  PP:    ['PP', 'BOPP', 'Polypropylene', 'CPP'],
  PET:   ['PET', 'PETG', 'Polyester'],
  PA:    ['Nylon 6', 'Nylon 6.6', 'Polyamide', 'PA', 'MXD6'],
  EVOH:  ['EVOH'],
  PVC:   ['PVC', 'PVDC'],
  PU:    ['Polyurethane', 'TPU'],
  PS:    ['PS', 'EPS', 'XPS'],
  PC:    ['Polycarbonate'],
  AL:    ['Aluminum', 'Alu', 'Stainless Steel'],
  PTFE:  ['PTFE', 'GORE-TEX'],
  Paper: ['Paper', 'Kraft', 'Cardboard', 'Cellulose', 'Plywood', 'OSB'],
  Other: ['Other']
};

function getFamily(name) {
  var n = name.toLowerCase();
  for (var fam in POLYMER_FAMILIES) {
    var kw = POLYMER_FAMILIES[fam];
    for (var k = 0; k < kw.length; k++) {
      if (n.indexOf(kw[k].toLowerCase()) >= 0) return fam;
    }
  }
  return 'Other';
}

// ====================================================================
// 📦 DEFAULT MATERIALS
// ====================================================================
var DEFAULT_MATERIALS = [
  { name: "Nylon 6 (multi-temp)",
    wvtrValues: [{ value: 10.0, thickness: 100 }, { value: 25.0, thickness: 100 }, { value: 50.0, thickness: 100 }],
    otrValues:  [{ value: 30,   thickness: 100 }, { value: 60,   thickness: 100 }, { value: 120,  thickness: 100 }],
    validConditions: [{ temperature: 23, humidity: 60 }, { temperature: 38, humidity: 60 }, { temperature: 50, humidity: 60 }] },
  { name: "LDPE (multi-temp)",
    wvtrValues: [{ value: 0.8, thickness: 100 }, { value: 1.5, thickness: 100 }, { value: 2.8, thickness: 100 }],
    otrValues:  [{ value: 800, thickness: 100 }, { value: 1200, thickness: 100 }, { value: 2000, thickness: 100 }],
    validConditions: [{ temperature: 20, humidity: 50 }, { temperature: 30, humidity: 50 }, { temperature: 40, humidity: 50 }] },
  { name: "EVOH (multi-temp)",
    wvtrValues: [{ value: 0.05, thickness: 100 }, { value: 0.15, thickness: 100 }, { value: 0.40, thickness: 100 }],
    otrValues:  [{ value: 0.5,  thickness: 100 }, { value: 1.5,  thickness: 100 }, { value: 4.0,  thickness: 100 }],
    validConditions: [{ temperature: 23, humidity: 50 }, { temperature: 38, humidity: 50 }, { temperature: 50, humidity: 50 }] },
  { name: "PP (multi-temp)",
    wvtrValues: [{ value: 0.5, thickness: 50 }, { value: 1.0, thickness: 50 }, { value: 2.0, thickness: 50 }],
    otrValues:  [{ value: 500, thickness: 50 }, { value: 800, thickness: 50 }, { value: 1500, thickness: 50 }],
    validConditions: [{ temperature: 25, humidity: 60 }, { temperature: 38, humidity: 60 }, { temperature: 50, humidity: 60 }] },
  { name: "Low-Density Polyethylene (LDPE)",
    wvtrValues: [{ value: 1.2, thickness: 100 }],
    otrValues:  [{ value: 7500, thickness: 100 }],
    validConditions: [{ temperature: 23, humidity: 50 }] },
  { name: "BOPP",
    wvtrValues: [{ value: 0.8, thickness: 50 }],
    otrValues:  [{ value: 2000, thickness: 50 }],
    validConditions: [{ temperature: 30, humidity: 60 }] },
  { name: "Polyurethane",
    wvtrValues: [{ value: 0.3, thickness: 200 }],
    otrValues:  [{ value: 100, thickness: 200 }],
    validConditions: [{ temperature: 30, humidity: 60 }] },
  { name: "Stainless Steel",
    wvtrValues: [{ value: 0.0, thickness: 500 }],
    otrValues:  [{ value: 0.0, thickness: 500 }],
    validConditions: [{ temperature: 30, humidity: 60 }] }
];

for (var di = 0; di < DEFAULT_MATERIALS.length; di++) {
  DEFAULT_MATERIALS[di].id     = di;
  DEFAULT_MATERIALS[di].family = getFamily(DEFAULT_MATERIALS[di].name);
}

// ====================================================================
// 🗂️ DEFAULT LAMINATES
// ====================================================================
// Note: legacy hardcoded laminates removed. The curated preset library is
// now defined in materials.js (PRESET_LAMINATES) and loaded once at first
// launch via loadPresetLaminates(), referencing real material IDs from
// materials.json. This avoids "ghost" laminates with broken material refs.
var DEFAULT_LAMINATES = [];

// ====================================================================
// 🗄️ DB - Local database with localStorage persistence
// ====================================================================
var DB = {
  materials: [],
  laminates: [],
  version:   '3.0',
  dbLastSync: null,

  load: function() {
    this.materials = DEFAULT_MATERIALS.slice();
    this.laminates = DEFAULT_LAMINATES.slice();
    try {
      var savedMats = localStorage.getItem('wvtr_mats_v3');
      if (savedMats) {
        var userMats    = JSON.parse(savedMats);
        var existingIds = new Set(this.materials.map(function(m) { return String(m.id); }));
        for (var i = 0; i < userMats.length; i++) {
          var um = userMats[i];
          if (um.isCompany) continue;
          var idx = this.materials.findIndex(function(m) { return String(m.id) === String(um.id); });
          if (idx !== -1) {
            this.materials[idx] = Object.assign({}, um, {
              id:            this.materials[idx].id,
              firebaseDocId: this.materials[idx].firebaseDocId || um.firebaseDocId
            });
          } else if (!existingIds.has(String(um.id))) {
            this.materials.push(um);
            existingIds.add(String(um.id));
          }
        }
      }
      var savedLams = localStorage.getItem('wvtr_lams_v3');
      if (savedLams) {
        var userLams    = JSON.parse(savedLams);
        var defaultLamIds = new Set(DEFAULT_LAMINATES.map(function(l) { return l.id; }));
        for (var j = 0; j < userLams.length; j++) {
          var ul = userLams[j];
          if (!defaultLamIds.has(ul.id) && !this.laminates.some(function(l) { return l.id === ul.id; }))
            this.laminates.push(ul);
        }
      }
      var lastSync = localStorage.getItem('wvtr_db_sync_v3');
      if (lastSync) this.dbLastSync = new Date(lastSync);
    } catch (e) { console.warn('Load error:', e); }

    for (var m = 0; m < this.materials.length; m++) {
      var mat = this.materials[m];
      if (mat.hygroscopicBeta > 0 && !mat.hygroscopicBetaWVTR) {
        mat.hygroscopicBetaWVTR = mat.hygroscopicBeta;
        mat.hygroscopicRefRHWVTR = mat.hygroscopicRefRH || 50;
      }
    }
  },

  save: function() {
    try {
      var uniqueLocal = new Map();
      for (var i = this.materials.length - 1; i >= 0; i--) {
        var m        = this.materials[i];
        var isDefault = DEFAULT_MATERIALS.some(function(d) { return d.id === m.id; });
        if (isDefault) continue;
        if (m.isCompany) continue;
        var key = String(m.id);
        if (!uniqueLocal.has(key)) uniqueLocal.set(key, m);
      }
      localStorage.setItem('wvtr_mats_v3', JSON.stringify(Array.from(uniqueLocal.values())));
      var defaultLamIds = new Set(DEFAULT_LAMINATES.map(function(l) { return l.id; }));
      var userLams = this.laminates.filter(function(l) { return !defaultLamIds.has(l.id); });
      localStorage.setItem('wvtr_lams_v3', JSON.stringify(userLams));
    } catch (e) { console.warn('Save error:', e); }
  },

  saveState: function(state) {
    try {
      localStorage.setItem('wvtr_state_v3', JSON.stringify({
        layers: state.layers, selCond: state.selCond,
        mode:   state.mode,   timestamp: Date.now()
      }));
    } catch (e) {}
  },

  loadState: function() {
    try {
      var s = localStorage.getItem('wvtr_state_v3');
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  },

  addMat: function(m) {
    var maxId = 0;
    for (var i = 0; i < this.materials.length; i++)
      if (this.materials[i].id > maxId) maxId = this.materials[i].id;
    m.id     = maxId + 1;
    m.family = m.family || getFamily(m.name);
    if (!m.reliabilityVotes) m.reliabilityVotes = { up: 0, down: 0 };
    m.company = m.company || '';
    m.tdsLink = m.tdsLink || '';
    this.materials.push(m);
    this.save();
    return m.id;
  },

  updateMat: function(id, m) {
    var targetId = String(id);
    var updated  = false;
    for (var i = 0; i < this.materials.length; i++) {
      if (String(this.materials[i].id) === targetId) {
        var existing = this.materials[i];
        var locked   = {
          id:             existing.id,
          firebaseDocId:  existing.firebaseDocId,
          reliabilityVotes: m.reliabilityVotes || existing.reliabilityVotes,
          usageCount:     m.usageCount || existing.usageCount || 0,
          lastUsageMonth: m.lastUsageMonth || existing.lastUsageMonth || ''
        };
        this.materials[i] = Object.assign({}, existing, m, locked, { updatedAt: new Date().toISOString() });
        updated = true;
        break;
      }
    }
    if (updated) this.save();
    return updated;
  },

  deleteMat: function(id) {
    this.materials = this.materials.filter(function(x) { return x.id !== id; });
    this.save();
  },

  addLam: function(l) {
    l.id = Date.now();
    this.laminates.push(l);
    this.save();
    if (window.saveLaminateToCloud) window.saveLaminateToCloud(l);
    return l.id;
  },

  deleteLam: function(id) {
    var lam = this.laminates.find(function(x) { return x.id === id; });
    if (lam && lam._cloudId && window.deleteLaminateFromCloud) window.deleteLaminateFromCloud(lam._cloudId);
    this.laminates = this.laminates.filter(function(x) { return x.id !== id; });
    this.save();
  },

  importMats: function(mats) {
    for (var i = 0; i < mats.length; i++) {
      mats[i].id     = Math.max.apply(null, this.materials.map(function(x) { return x.id; })) + 1;
      mats[i].family = getFamily(mats[i].name);
      this.materials.push(mats[i]);
    }
    this.save();
  },

  exportAll: function() {
    return JSON.stringify({
      materials:  this.materials,
      laminates:  this.laminates,
      version:    this.version,
      exportDate: new Date().toISOString()
    });
  },

  importAll: function(dataStr) {
    try {
      var parsed = JSON.parse(dataStr);
      if (parsed.materials) this.materials = parsed.materials;
      if (parsed.laminates) this.laminates = parsed.laminates;
      this.save();
      return true;
    } catch (e) { return false; }
  },

  deduplicateMaterials: function() {
    var seen = [];
    var result = [];
    for (var i = 0; i < this.materials.length; i++) {
      var mat = this.materials[i];
      var nameLower = mat.name.trim().toLowerCase();
      var dupeIdx = -1;
      for (var j = 0; j < seen.length; j++) {
        var s = seen[j];
        if (mat.firebaseDocId && s.firebaseDocId && mat.firebaseDocId === s.firebaseDocId) {
          dupeIdx = j; break;
        }
        if (s.name.trim().toLowerCase() === nameLower &&
            !!s.isCompany === !!mat.isCompany) {
          dupeIdx = j; break;
        }
      }
      if (dupeIdx === -1) {
        seen.push(mat);
        result.push(mat);
      } else {
        var existing = seen[dupeIdx];
        var timeA = new Date(mat.updatedAt || 0).getTime();
        var timeB = new Date(existing.updatedAt || 0).getTime();
        var winner = (timeA > timeB) ? mat : existing;
        var loser  = (timeA > timeB) ? existing : mat;
        winner.firebaseDocId = winner.firebaseDocId || loser.firebaseDocId;
        winner.isCommunity   = winner.isCommunity   || loser.isCommunity;
        seen[dupeIdx]   = winner;
        result[dupeIdx] = winner;
      }
    }
    this.materials = result;
    return this.materials;
  }
};
window.DB = DB;

// ====================================================================
// 🔄 STATE
// ====================================================================
var State = {
  tab:                'home',
  layers:             [{ mid: null, thick: 0 }],
  selCond:            null,
  laminateName:       '',
  autoCalc:           false,
  calcResult:         null,
  calcError:          null,
  searchQuery:        '',
  mode:               'wvtr',
  sensLayerIdx:       0,
  targetValue:        0.5,
  compareIds:         [],
  selectedTestMethod: ''
};

// ====================================================================
// 🎨 CONSTANTS
// ====================================================================
var LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

var TABS = [
  { id: 'home',       label: 'Home' },
  { id: 'calc',       label: 'Calculator' },
  { id: 'sensitivity',label: 'Sensitivity' },
  { id: 'shelflife',  label: 'Shelf Life' },
  { id: 'arrhenius',  label: 'Arrhenius' },
  { id: 'compare',    label: 'Compare laminates' },
  { id: 'materials',  label: 'Materials DB' },
  { id: 'laminates',   label: 'Laminates DB' },
  { id: 'mat-company', label: 'Materials Company DB' },
  { id: 'lam-company', label: 'Laminates Company DB' }
];

var chartInstances = {};
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}
