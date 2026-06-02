// ============================================================================
// MVTR PRO SYSTEM - MODULE VERSION
// ============================================================================

(function() {
    'use strict';

    // CSS Styles
    const STYLES = `
        .mvtr-container * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .mvtr-container {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .mvtr-container .header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 2rem;
            border-radius: 1rem;
            margin-bottom: 2rem;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }

        .mvtr-container .header h1 {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.5rem;
        }

        .mvtr-container .header p {
            opacity: 0.9;
            font-size: 0.95rem;
        }

        .mvtr-container .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(255,255,255,0.2);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-top: 0.5rem;
            margin-right: 0.5rem;
        }

        .mvtr-container .grid {
            display: grid;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .mvtr-container .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .mvtr-container .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .mvtr-container .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

        .mvtr-container .card {
            background: #ffffff;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            border: 1px solid #e2e8f0;
        }

        .mvtr-container .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid #e2e8f0;
        }

        .mvtr-container .card-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .mvtr-container .card-title-icon {
            width: 2rem;
            height: 2rem;
            background: #2563eb;
            color: white;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }

        .mvtr-container .form-group {
            margin-bottom: 1rem;
        }

        .mvtr-container .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.35rem;
        }

        .mvtr-container .form-input {
            width: 100%;
            padding: 0.625rem 0.875rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            font-size: 0.95rem;
            transition: all 0.2s;
            font-family: inherit;
        }

        .mvtr-container .form-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .mvtr-container .form-input.error {
            border-color: #ef4444;
        }

        .mvtr-container .input-group {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .mvtr-container .input-unit {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 500;
            white-space: nowrap;
        }

        .mvtr-container .hint {
            font-size: 0.75rem;
            color: #64748b;
            margin-top: 0.25rem;
        }

        .mvtr-container .error-message {
            font-size: 0.75rem;
            color: #ef4444;
            margin-top: 0.25rem;
            display: none;
        }

        .mvtr-container .form-group.has-error .error-message {
            display: block;
        }

        .mvtr-container .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
        }

        .mvtr-container .btn-primary {
            background: #2563eb;
            color: white;
        }

        .mvtr-container .btn-primary:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .mvtr-container .btn-success {
            background: #10b981;
            color: white;
        }

        .mvtr-container .btn-success:hover {
            background: #059669;
        }

        .mvtr-container .btn-outline {
            background: transparent;
            border: 1px solid #e2e8f0;
            color: #1e293b;
        }

        .mvtr-container .btn-outline:hover {
            background: #f8fafc;
        }

        .mvtr-container .btn-sm {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
        }

        .mvtr-container .btn-group {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }

        .mvtr-container .kpi-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 0.75rem;
            position: relative;
            overflow: hidden;
        }

        .mvtr-container .kpi-card.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .mvtr-container .kpi-card.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .mvtr-container .kpi-card.danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

        .mvtr-container .kpi-label {
            font-size: 0.875rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }

        .mvtr-container .kpi-value {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.25rem;
        }

        .mvtr-container .kpi-delta {
            font-size: 0.875rem;
            opacity: 0.9;
        }

        .mvtr-container .table-container {
            overflow-x: auto;
            margin-top: 1rem;
        }

        .mvtr-container .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .mvtr-container .data-table th,
        .mvtr-container .data-table td {
            padding: 0.875rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        .mvtr-container .data-table th {
            background: #f8fafc;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }

        .mvtr-container .data-table tr:hover {
            background: #f8fafc;
        }

        .mvtr-container .data-table tr:last-child td {
            border-bottom: none;
        }

        .mvtr-container .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .mvtr-container .status-pass {
            background: #d1fae5;
            color: #065f46;
        }

        .mvtr-container .status-fail {
            background: #fee2e2;
            color: #991b1b;
        }

        .mvtr-container .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        .mvtr-container .chart-container.small {
            height: 250px;
        }

        .mvtr-container .tabs {
            display: flex;
            gap: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 1.5rem;
        }

        .mvtr-container .tab {
            padding: 0.75rem 1.25rem;
            background: none;
            border: none;
            font-size: 0.95rem;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }

        .mvtr-container .tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
        }

        .mvtr-container .tab-content {
            display: none;
        }

        .mvtr-container .tab-content.active {
            display: block;
        }

        .mvtr-container .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 9999px;
            overflow: hidden;
            margin-top: 0.5rem;
        }

        .mvtr-container .progress-fill {
            height: 100%;
            background: #2563eb;
            transition: width 0.5s ease;
        }

        .mvtr-container .progress-fill.success { background: #10b981; }
        .mvtr-container .progress-fill.warning { background: #f59e0b; }
        .mvtr-container .progress-fill.danger { background: #ef4444; }

        .mvtr-container .tooltip {
            position: relative;
            display: inline-block;
            cursor: help;
        }

        .mvtr-container .tooltip-icon {
            width: 1.25rem;
            height: 1.25rem;
            background: #64748b;
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .mvtr-container .scenario-card {
            border: 2px solid #e2e8f0;
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
            transition: all 0.2s;
        }

        .mvtr-container .scenario-card:hover {
            border-color: #2563eb;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .mvtr-container .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }

        .mvtr-container .scenario-name {
            font-weight: 700;
            font-size: 1rem;
        }

        .mvtr-container .scenario-delete {
            background: none;
            border: none;
            color: #ef4444;
            cursor: pointer;
            font-size: 1.25rem;
            line-height: 1;
        }

        @media (max-width: 768px) {
            .mvtr-container { padding: 1rem; }
            .mvtr-container .header h1 { font-size: 1.5rem; }
            .mvtr-container .grid-2, .mvtr-container .grid-3, .mvtr-container .grid-4 { grid-template-columns: 1fr; }
        }

        @media print {
            .mvtr-container .no-print { display: none; }
            .mvtr-container .card { break-inside: avoid; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .mvtr-container .animate-in {
            animation: fadeIn 0.5s ease-out;
        }
    `;

    // HTML Template
    const HTML_TEMPLATE = `
        <div class="header">
            <h1>🧪 MVTR Pro System</h1>
            <p>Advanced Moisture Vapor Transmission Rate Analysis - ICH Q1A(R2) Compliant</p>
            <span class="badge">Enterprise Edition v2.0</span>
            <span class="badge">ISO 15106 Certified</span>
        </div>

        <div class="grid grid-2">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">⚙️</div>
                        Parametri di Input
                    </div>
                    <button class="btn btn-outline btn-sm mvtr-reset">
                        🔄 Reset
                    </button>
                </div>

                <div class="grid grid-2">
                    <div class="form-group" id="fg-wvtr">
                        <label class="form-label">
                            WVTR di Riferimento
                            <span class="tooltip">
                                <span class="tooltip-icon">?</span>
                            </span>
                        </label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-wvtr" value="1.0" step="0.01" min="0">
                            <span class="input-unit">g/m²/day</span>
                        </div>
                        <div class="hint">Valore misurato a condizioni di riferimento</div>
                        <div class="error-message">Inserire un valore valido ≥ 0</div>
                    </div>

                    <div class="form-group" id="fg-tref">
                        <label class="form-label">Temperatura di Riferimento</label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-tref" value="38" step="0.5" min="-50" max="100">
                            <span class="input-unit">°C</span>
                        </div>
                        <div class="hint">Temperatura alla quale è stato misurato il WVTR</div>
                        <div class="error-message">Inserire una temperatura valida</div>
                    </div>

                    <div class="form-group" id="fg-rhref">
                        <label class="form-label">Umidità Relativa di Riferimento</label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-rhref" value="90" step="1" min="0" max="100">
                            <span class="input-unit">%</span>
                        </div>
                        <div class="hint">UR% alla quale è stato misurato il WVTR</div>
                        <div class="error-message">Inserire un valore tra 0 e 100</div>
                    </div>

                    <div class="form-group" id="fg-ea">
                        <label class="form-label">
                            Energia di Attivazione (Eₐ)
                            <span class="tooltip">
                                <span class="tooltip-icon">?</span>
                            </span>
                        </label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-ea" value="35" step="1" min="0" max="150">
                            <span class="input-unit">kJ/mol</span>
                        </div>
                        <div class="hint">Eₐ = 0 disattiva la correzione di Arrhenius</div>
                        <div class="error-message">Inserire un valore valido</div>
                    </div>

                    <div class="form-group" id="fg-area">
                        <label class="form-label">Area Superficiale Cavità</label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-area" value="2.0" step="0.1" min="0.1">
                            <span class="input-unit">cm²</span>
                        </div>
                        <div class="hint">Area esposta al trasferimento di umidità</div>
                        <div class="error-message">Inserire un'area valida</div>
                    </div>

                    <div class="form-group" id="fg-crit">
                        <label class="form-label">Guadagno Critico di Umidità</label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-crit" value="2.0" step="0.1" min="0.1">
                            <span class="input-unit">mg/cavità</span>
                        </div>
                        <div class="hint">Limite massimo di umidità assorbita</div>
                        <div class="error-message">Inserire un valore valido</div>
                    </div>

                    <div class="form-group" id="fg-years">
                        <label class="form-label">Shelf Life Target</label>
                        <div class="input-group">
                            <input type="number" class="form-input ph-years" value="2" step="0.5" min="0.5" max="10">
                            <span class="input-unit">anni</span>
                        </div>
                        <div class="hint">Durata di conservazione desiderata</div>
                        <div class="error-message">Inserire una durata valida</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nome Scenario</label>
                        <input type="text" class="form-input scenario-name" placeholder="Es. Formulazione A" value="Scenario Base">
                        <div class="hint">Identificativo per il confronto scenari</div>
                    </div>
                </div>

                <div class="btn-group">
                    <button class="btn btn-primary mvtr-calculate">
                        📊 Calcola e Visualizza
                    </button>
                    <button class="btn btn-success mvtr-save">
                        💾 Salva Scenario
                    </button>
                    <button class="btn btn-outline mvtr-export-csv">
                        📥 Export CSV
                    </button>
                    <button class="btn btn-outline mvtr-export-pdf">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">📈</div>
                        KPI Dashboard
                    </div>
                </div>

                <div class="grid grid-2">
                    <div class="kpi-card" id="kpi-zones-pass">
                        <div class="kpi-label">Zone ICH Conformi</div>
                        <div class="kpi-value kpi-pass-count">0/7</div>
                        <div class="kpi-delta kpi-pass-percent">0% del totale</div>
                    </div>

                    <div class="kpi-card warning" id="kpi-max-ingress">
                        <div class="kpi-label">Max Ingresso Annuo</div>
                        <div class="kpi-value kpi-max-ingress-val">0 mg</div>
                        <div class="kpi-delta">Nella zona più critica</div>
                    </div>

                    <div class="kpi-card" id="kpi-safety-margin">
                        <div class="kpi-label">Margine di Sicurezza</div>
                        <div class="kpi-value kpi-safety-val">0%</div>
                        <div class="kpi-delta">Rispetto al limite critico</div>
                    </div>

                    <div class="kpi-card" id="kpi-arrhenius-factor">
                        <div class="kpi-label">Fattore di Arrhenius</div>
                        <div class="kpi-value kpi-arr-val">1.0x</div>
                        <div class="kpi-delta">Accelerazione termica media</div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem;">
                    <div class="form-label">Stato Complessivo del Sistema</div>
                    <div class="progress-bar">
                        <div class="progress-fill overall-progress" style="width: 0%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.875rem;">
                        <span class="overall-status">In attesa di calcolo...</span>
                        <span class="overall-percent">0%</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="overview">📊 Panoramica</button>
            <button class="tab" data-tab="detailed">📋 Tabelle Dettagliate</button>
            <button class="tab" data-tab="charts">📈 Grafici Avanzati</button>
            <button class="tab" data-tab="comparison">🔀 Confronto Scenari</button>
            <button class="tab" data-tab="sensitivity">🎯 Sensitivity Analysis</button>
        </div>

        <div id="tab-overview" class="tab-content active">
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">🌍</div>
                            Performance per Zona ICH
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-overview"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">⚡</div>
                            Fattori di Correzione
                        </div>
                    </div>
                    <div class="chart-container small">
                        <canvas class="chart-factors"></canvas>
                    </div>
                    <div class="factors-summary" style="margin-top: 1rem; font-size: 0.875rem; color: #64748b;"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">✅</div>
                        Risultati Sintetici
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table table-summary">
                        <thead>
                            <tr>
                                <th>Zona ICH</th>
                                <th>Condizioni</th>
                                <th>WVTR Effettivo</th>
                                <th>Ingresso/Anno</th>
                                <th>Totale Shelf Life</th>
                                <th>Stato</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-detailed" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon"></div>
                        Tabella Completa dei Calcoli
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table table-detailed">
                        <thead>
                            <tr>
                                <th>Zona</th>
                                <th>T (°C)</th>
                                <th>RH (%)</th>
                                <th>WVTR Ref</th>
                                <th>Fattore T</th>
                                <th>Fattore RH</th>
                                <th>WVTR Eff</th>
                                <th>Area (m²)</th>
                                <th>Ingresso Giornaliero</th>
                                <th>Ingresso Annuo</th>
                                <th>Totale Shelf Life</th>
                                <th>% Limite</th>
                                <th>Stato</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <div class="grid grid-2" style="margin-top: 1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">🧮</div>
                            Parametri di Calcolo
                        </div>
                    </div>
                    <div class="calc-parameters" style="font-size: 0.875rem; line-height: 2;"></div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">📐</div>
                            Formule Utilizzate
                        </div>
                    </div>
                    <div style="font-size: 0.875rem; font-family: 'Courier New', monospace; background: #f8fafc; padding: 1rem; border-radius: 0.5rem;">
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Equazione di Arrhenius:</strong><br>
                            k = A · exp(-Eₐ/RT)
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Fattore Temperatura:</strong><br>
                            F_T = exp[(Eₐ/R) · (1/T_ref - 1/T_target)]
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <strong>Fattore RH:</strong><br>
                            F_RH = RH_target / RH_ref
                        </div>
                        <div>
                            <strong>WVTR Effettivo:</strong><br>
                            WVTR_eff = WVTR_ref · F_T · F_RH
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-charts" class="tab-content">
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">📊</div>
                            Confronto WVTR per Zona
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-wvtr-comparison"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">💧</div>
                            Ingresso Umidità Cumulativo
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-cumulative"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">🌡️</div>
                            Influenza Temperatura vs Umidità
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-temp-rh-impact"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">⏱️</div>
                            Tempo al Limite Critico
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-time-to-limit"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-comparison" class="tab-content">
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">💾</div>
                            Scenari Salvati
                        </div>
                    </div>
                    <div class="scenarios-list">
                        <p style="color: #64748b; text-align: center; padding: 2rem;">
                            Nessun scenario salvato. Configura i parametri e clicca "Salva Scenario".
                        </p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">📊</div>
                            Confronto Grafico
                        </div>
                    </div>
                    <div class="chart-container">
                        <canvas class="chart-scenario-comparison"></canvas>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">📋</div>
                        Tabella Comparativa
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table table-scenario-comparison">
                        <thead>
                            <tr class="scenario-comparison-header">
                                <th>Parametro</th>
                            </tr>
                        </thead>
                        <tbody class="scenario-comparison-body"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tab-sensitivity" class="tab-content">
            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">🎚️</div>
                            Sensitivity: Energia di Attivazione
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Range Eₐ da analizzare</label>
                        <div class="input-group">
                            <input type="number" class="form-input sens-ea-min" value="20" step="5">
                            <span style="padding: 0 0.5rem;">a</span>
                            <input type="number" class="form-input sens-ea-max" value="50" step="5">
                            <span class="input-unit">kJ/mol</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm sens-ea-run">
                        Analizza
                    </button>
                    <div class="chart-container" style="margin-top: 1rem;">
                        <canvas class="chart-sensitivity-ea"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">🎚️</div>
                            Sensitivity: WVTR Reference
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Range WVTR da analizzare</label>
                        <div class="input-group">
                            <input type="number" class="form-input sens-wvtr-min" value="0.5" step="0.1">
                            <span style="padding: 0 0.5rem;">a</span>
                            <input type="number" class="form-input sens-wvtr-max" value="2.0" step="0.1">
                            <span class="input-unit">g/m²/day</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm sens-wvtr-run">
                        Analizza
                    </button>
                    <div class="chart-container" style="margin-top: 1rem;">
                        <canvas class="chart-sensitivity-wvtr"></canvas>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">📊</div>
                        Tornado Chart - Impatto Parametri
                    </div>
                </div>
                <div class="chart-container">
                    <canvas class="chart-tornado"></canvas>
                </div>
            </div>
        </div>
    `;

    // ICH Climatic Zones Definition
    const ICH_ZONES = [
        { id: 'I',    label: 'Zone I',          desc: 'Temperata',                    T: 21,  RH: 45 },
        { id: 'II',   label: 'Zone II',         desc: 'Subtropicale / Mediterranea',  T: 25,  RH: 60 },
        { id: 'IIIa', label: 'Zone IIIa',       desc: 'Calda secca',                  T: 40,  RH: 15 },
        { id: 'IVa',  label: 'Zone IVa',        desc: 'Calda umida',                  T: 40,  RH: 75 },
        { id: 'IVb',  label: 'Zone IVb',        desc: 'Calda molto umida (ASEAN)',    T: 30,  RH: 75 },
        { id: 'ACC',  label: 'Accelerata',      desc: 'Test accelerato ICH',          T: 40,  RH: 75 },
        { id: 'INT',  label: 'Intermedia',      desc: 'Test intermedio ICH',          T: 30,  RH: 65 }
    ];

    // Constants
    const R_GAS = 8.314e-3; // kJ/(mol·K)
    const DAYS_PER_YEAR = 365;

    // Load external dependencies
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Main render function
    window.renderPharmaMvtr = async function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }

        // Load dependencies
        try {
            await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        } catch (error) {
            console.error('Failed to load dependencies:', error);
            container.innerHTML = '<p style="color: red; padding: 2rem;">Errore nel caricamento delle dipendenze. Verifica la connessione internet.</p>';
            return;
        }

        // Inject styles
        if (!document.getElementById('mvtr-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'mvtr-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
        }

        // Create container
        container.innerHTML = `<div class="mvtr-container">${HTML_TEMPLATE}</div>`;
        const mvtrContainer = container.querySelector('.mvtr-container');

        // State
        let currentResults = null;
        let savedScenarios = JSON.parse(localStorage.getItem('mvtr_scenarios') || '[]');
        let charts = {};

        // Helper functions
        function getElement(selector) {
            return mvtrContainer.querySelector(selector);
        }

        function getAllElements(selector) {
            return mvtrContainer.querySelectorAll(selector);
        }

        // Core calculation functions
        function wvtrAtICH(wvtr_ref, Ea_kJ, T_ref, RH_ref, T_target, RH_target) {
            const Tr = T_ref + 273.15;
            const Tt = T_target + 273.15;
            
            const arrFactor = (Ea_kJ > 0) ? Math.exp((Ea_kJ / R_GAS) * (1/Tr - 1/Tt)) : 1;
            const rhFactor = (RH_ref > 0) ? (RH_target / RH_ref) : 1;
            
            return {
                wvtrEff: wvtr_ref * arrFactor * rhFactor,
                arrFactor: arrFactor,
                rhFactor: rhFactor
            };
        }

        function performCalculations(params) {
            const areaM2 = params.cavity_cm2 / 10000;
            const shelfDays = params.shelf_years * DAYS_PER_YEAR;
            
            return ICH_ZONES.map(zone => {
                const correction = wvtrAtICH(
                    params.wvtr_ref, 
                    params.Ea_kJ, 
                    params.T_ref, 
                    params.RH_ref, 
                    zone.T, 
                    zone.RH
                );
                
                const wvtrEff = correction.wvtrEff;
                const dailyIngress = wvtrEff * areaM2 * 1000;
                const yearlyIngress = dailyIngress * DAYS_PER_YEAR;
                const totalIngress = dailyIngress * shelfDays;
                const percentLimit = (totalIngress / params.critical_mg) * 100;
                const pass = totalIngress <= params.critical_mg;
                
                const daysToLimit = params.critical_mg / dailyIngress;
                const yearsToLimit = daysToLimit / DAYS_PER_YEAR;
                
                return {
                    zone: zone,
                    wvtr_ref: params.wvtr_ref,
                    wvtrEff: wvtrEff,
                    arrFactor: correction.arrFactor,
                    rhFactor: correction.rhFactor,
                    dailyIngress: dailyIngress,
                    yearlyIngress: yearlyIngress,
                    totalIngress: totalIngress,
                    percentLimit: percentLimit,
                    pass: pass,
                    daysToLimit: daysToLimit,
                    yearsToLimit: yearsToLimit,
                    areaM2: areaM2
                };
            });
        }

        // Validation
        function validateInputs() {
            const fields = [
                { selector: '.ph-wvtr', min: 0, msg: 'WVTR deve essere ≥ 0' },
                { selector: '.ph-tref', min: -50, max: 100, msg: 'Temperatura non valida' },
                { selector: '.ph-rhref', min: 0, max: 100, msg: 'UR deve essere 0-100%' },
                { selector: '.ph-ea', min: 0, max: 150, msg: 'Eₐ non valida' },
                { selector: '.ph-area', min: 0.1, msg: 'Area deve essere > 0' },
                { selector: '.ph-crit', min: 0.1, msg: 'Limite critico deve essere > 0' },
                { selector: '.ph-years', min: 0.5, max: 10, msg: 'Shelf life non valida' }
            ];
            
            let isValid = true;
            fields.forEach(field => {
                const el = getElement(field.selector);
                const fg = el.closest('.form-group');
                const val = parseFloat(el.value);
                
                if (isNaN(val) || val < field.min || (field.max && val > field.max)) {
                    fg.classList.add('has-error');
                    isValid = false;
                } else {
                    fg.classList.remove('has-error');
                }
            });
            
            return isValid;
        }

        // Main calculation and render
        function calculateAndRender() {
            if (!validateInputs()) return;
            
            const params = {
                wvtr_ref: parseFloat(getElement('.ph-wvtr').value),
                T_ref: parseFloat(getElement('.ph-tref').value),
                RH_ref: parseFloat(getElement('.ph-rhref').value),
                Ea_kJ: parseFloat(getElement('.ph-ea').value),
                cavity_cm2: parseFloat(getElement('.ph-area').value),
                critical_mg: parseFloat(getElement('.ph-crit').value),
                shelf_years: parseFloat(getElement('.ph-years').value),
                scenarioName: getElement('.scenario-name').value || 'Scenario Base'
            };
            
            currentResults = {
                params: params,
                results: performCalculations(params),
                timestamp: new Date().toISOString()
            };
            
            updateKPIDashboard();
            renderOverviewTab();
            renderDetailedTab();
            renderChartsTab();
            updateSensitivityCharts();
            
            getElement('.tabs').scrollIntoView({ behavior: 'smooth' });
        }

        // KPI Dashboard
        function updateKPIDashboard() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            const passCount = results.filter(r => r.pass).length;
            const totalZones = results.length;
            const passPercent = (passCount / totalZones * 100).toFixed(0);
            
            getElement('.kpi-pass-count').textContent = `${passCount}/${totalZones}`;
            getElement('.kpi-pass-percent').textContent = `${passPercent}% del totale`;
            
            const kpiCard = getElement('#kpi-zones-pass');
            if (passCount === totalZones) {
                kpiCard.className = 'kpi-card success';
            } else if (passCount === 0) {
                kpiCard.className = 'kpi-card danger';
            } else {
                kpiCard.className = 'kpi-card warning';
            }
            
            const maxIngress = Math.max(...results.map(r => r.yearlyIngress));
            const maxZone = results.find(r => r.yearlyIngress === maxIngress);
            getElement('.kpi-max-ingress-val').textContent = `${maxIngress.toFixed(2)} mg`;
            getElement('#kpi-max-ingress .kpi-delta').textContent = `Nella ${maxZone.zone.label}`;
            
            const minSafety = Math.min(...results.map(r => 100 - r.percentLimit));
            const safetyEl = getElement('.kpi-safety-val');
            const safetyCard = getElement('#kpi-safety-margin');
            safetyEl.textContent = `${minSafety.toFixed(1)}%`;
            
            if (minSafety > 20) {
                safetyCard.className = 'kpi-card success';
            } else if (minSafety > 0) {
                safetyCard.className = 'kpi-card warning';
            } else {
                safetyCard.className = 'kpi-card danger';
            }
            
            const avgArrFactor = results.reduce((sum, r) => sum + r.arrFactor, 0) / results.length;
            getElement('.kpi-arr-val').textContent = `${avgArrFactor.toFixed(2)}x`;
            
            const overallPercent = passPercent;
            const progressFill = getElement('.overall-progress');
            const overallStatus = getElement('.overall-status');
            const overallPercentEl = getElement('.overall-percent');
            
            progressFill.style.width = `${overallPercent}%`;
            overallPercentEl.textContent = `${overallPercent}%`;
            
            if (overallPercent === 100) {
                progressFill.className = 'progress-fill success';
                overallStatus.textContent = '✓ Tutte le zone conformi';
                overallStatus.style.color = '#10b981';
            } else if (overallPercent > 50) {
                progressFill.className = 'progress-fill warning';
                overallStatus.textContent = '⚠ Alcune zone critiche';
                overallStatus.style.color = '#f59e0b';
            } else {
                progressFill.className = 'progress-fill danger';
                overallStatus.textContent = '✗ Maggioranza non conforme';
                overallStatus.style.color = '#ef4444';
            }
        }

        // Tab rendering functions
        function renderOverviewTab() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            
            const tbody = getElement('.table-summary tbody');
            tbody.innerHTML = results.map(r => `
                <tr style="${r.pass ? 'background: #f0fdf4' : 'background: #fef2f2'}">
                    <td><strong>${r.zone.label}</strong></td>
                    <td>${r.zone.T}°C / ${r.zone.RH}%<br><small style="color: #64748b">${r.zone.desc}</small></td>
                    <td>${r.wvtrEff.toFixed(4)} g/m²/day</td>
                    <td>${r.yearlyIngress.toFixed(3)} mg</td>
                    <td><strong>${r.totalIngress.toFixed(3)} mg</strong></td>
                    <td>
                        ${r.pass 
                            ? '<span class="status-badge status-pass">✓ PASS</span>' 
                            : '<span class="status-badge status-fail">✗ FAIL</span>'}
                    </td>
                </tr>
            `).join('');
            
            renderOverviewChart();
            renderFactorsChart();
        }

        function renderDetailedTab() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            const tbody = getElement('.table-detailed tbody');
            tbody.innerHTML = results.map(r => `
                <tr>
                    <td><strong>${r.zone.label}</strong></td>
                    <td>${r.zone.T}</td>
                    <td>${r.zone.RH}</td>
                    <td>${r.wvtr_ref.toFixed(3)}</td>
                    <td>${r.arrFactor.toFixed(3)}</td>
                    <td>${r.rhFactor.toFixed(3)}</td>
                    <td><strong>${r.wvtrEff.toFixed(4)}</strong></td>
                    <td>${r.areaM2.toFixed(4)}</td>
                    <td>${r.dailyIngress.toFixed(4)} mg</td>
                    <td>${r.yearlyIngress.toFixed(3)} mg</td>
                    <td><strong>${r.totalIngress.toFixed(3)} mg</strong></td>
                    <td>${r.percentLimit.toFixed(1)}%</td>
                    <td>
                        ${r.pass 
                            ? '<span class="status-badge status-pass">✓ PASS</span>' 
                            : '<span class="status-badge status-fail">✗ FAIL</span>'}
                    </td>
                </tr>
            `).join('');
            
            const paramsDiv = getElement('.calc-parameters');
            paramsDiv.innerHTML = `
                <div><strong>WVTR Riferimento:</strong> ${params.wvtr_ref} g/m²/day</div>
                <div><strong>Temperatura Ref:</strong> ${params.T_ref}°C (${(params.T_ref + 273.15).toFixed(2)} K)</div>
                <div><strong>UR Riferimento:</strong> ${params.RH_ref}%</div>
                <div><strong>Energia di Attivazione:</strong> ${params.Ea_kJ} kJ/mol</div>
                <div><strong>Costante dei Gas (R):</strong> ${R_GAS} kJ/(mol·K)</div>
                <div><strong>Area Superficiale:</strong> ${params.cavity_cm2} cm² = ${(params.cavity_cm2/10000).toFixed(4)} m²</div>
                <div><strong>Shelf Life:</strong> ${params.shelf_years} anni = ${(params.shelf_years * 365).toFixed(0)} giorni</div>
                <div><strong>Limite Critico:</strong> ${params.critical_mg} mg/cavità</div>
            `;
        }

        function renderChartsTab() {
            if (!currentResults) return;
            
            renderWVTRComparisonChart();
            renderCumulativeChart();
            renderTempRHImpactChart();
            renderTimeToLimitChart();
        }

        // Chart rendering functions
        function renderOverviewChart() {
            const ctx = getElement('.chart-overview').getContext('2d');
            
            if (charts.overview) charts.overview.destroy();
            
            const results = currentResults.results;
            
            charts.overview = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: results.map(r => r.zone.label),
                    datasets: [
                        {
                            label: 'Ingresso Annuo (mg)',
                            data: results.map(r => r.yearlyIngress),
                            backgroundColor: results.map(r => r.pass ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                            borderColor: results.map(r => r.pass ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'),
                            borderWidth: 2
                        },
                        {
                            label: 'Limite Critico (mg)',
                            data: results.map(() => currentResults.params.critical_mg),
                            type: 'line',
                            borderColor: 'rgb(245, 158, 11)',
                            borderWidth: 3,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.y.toFixed(3) + ' mg';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Umidità (mg)'
                            }
                        }
                    }
                }
            });
        }

        function renderFactorsChart() {
            const ctx = getElement('.chart-factors').getContext('2d');
            
            if (charts.factors) charts.factors.destroy();
            
            const results = currentResults.results;
            
            charts.factors = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: results.map(r => r.zone.label),
                    datasets: [
                        {
                            label: 'Fattore Temperatura',
                            data: results.map(r => r.arrFactor),
                            borderColor: 'rgb(37, 99, 235)',
                            backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        },
                        {
                            label: 'Fattore RH',
                            data: results.map(r => r.rhFactor),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            const avgArr = (results.reduce((sum, r) => sum + r.arrFactor, 0) / results.length).toFixed(3);
            const avgRH = (results.reduce((sum, r) => sum + r.rhFactor, 0) / results.length).toFixed(3);
            const maxArr = Math.max(...results.map(r => r.arrFactor)).toFixed(3);
            const maxRH = Math.max(...results.map(r => r.rhFactor)).toFixed(3);
            
            getElement('.factors-summary').innerHTML = `
                <div><strong>Fattore di Arrhenius medio:</strong> ${avgArr}x (max: ${maxArr}x)</div>
                <div><strong>Fattore RH medio:</strong> ${avgRH}x (max: ${maxRH}x)</div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem;">
                    Eₐ = ${currentResults.params.Ea_kJ} kJ/mol · T_ref = ${currentResults.params.T_ref}°C
                </div>
            `;
        }

        function renderWVTRComparisonChart() {
            const ctx = getElement('.chart-wvtr-comparison').getContext('2d');
            
            if (charts.wvtrComp) charts.wvtrComp.destroy();
            
            const results = currentResults.results;
            
            charts.wvtrComp = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: results.map(r => r.zone.label),
                    datasets: [
                        {
                            label: 'WVTR Riferimento',
                            data: results.map(() => currentResults.params.wvtr_ref),
                            backgroundColor: 'rgba(100, 116, 139, 0.5)',
                        },
                        {
                            label: 'WVTR Effettivo',
                            data: results.map(r => r.wvtrEff),
                            backgroundColor: 'rgba(37, 99, 235, 0.7)',
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'WVTR (g/m²/day)'
                            }
                        }
                    }
                }
            });
        }

        function renderCumulativeChart() {
            const ctx = getElement('.chart-cumulative').getContext('2d');
            
            if (charts.cumulative) charts.cumulative.destroy();
            
            const results = currentResults.results;
            const years = currentResults.params.shelf_years;
            
            const labels = [];
            const datasets = [];
            
            for (let y = 1; y <= years; y++) {
                labels.push(`Anno ${y}`);
            }
            
            results.forEach(r => {
                const data = [];
                for (let y = 1; y <= years; y++) {
                    data.push(r.dailyIngress * 365 * y);
                }
                datasets.push({
                    label: r.zone.label,
                    data: data,
                    borderColor: r.pass ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                    backgroundColor: r.pass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    tension: 0.4
                });
            });
            
            const criticalData = labels.map(() => currentResults.params.critical_mg);
            datasets.push({
                label: 'Limite Critico',
                data: criticalData,
                borderColor: 'rgb(245, 158, 11)',
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
            
            charts.cumulative = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Umidità Cumulativa (mg)'
                            }
                        }
                    }
                }
            });
        }

        function renderTempRHImpactChart() {
            const ctx = getElement('.chart-temp-rh-impact').getContext('2d');
            
            if (charts.tempRh) charts.tempRh.destroy();
            
            const results = currentResults.results;
            
            charts.tempRh = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Zone ICH',
                        data: results.map(r => ({
                            x: r.zone.T,
                            y: r.zone.RH,
                            r: Math.sqrt(r.wvtrEff) * 10,
                            zone: r.zone.label,
                            wvtr: r.wvtrEff
                        })),
                        backgroundColor: results.map(r => r.pass ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                        borderColor: results.map(r => r.pass ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const point = context.raw;
                                    return [
                                        `Zona: ${point.zone}`,
                                        `Temperatura: ${point.x}°C`,
                                        `UR: ${point.y}%`,
                                        `WVTR: ${point.wvtr.toFixed(4)} g/m²/day`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Temperatura (°C)' }
                        },
                        y: {
                            title: { display: true, text: 'Umidità Relativa (%)' }
                        }
                    }
                }
            });
        }

        function renderTimeToLimitChart() {
            const ctx = getElement('.chart-time-to-limit').getContext('2d');
            
            if (charts.timeLimit) charts.timeLimit.destroy();
            
            const results = currentResults.results;
            
            charts.timeLimit = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: results.map(r => r.zone.label),
                    datasets: [{
                        label: 'Anni al Limite Critico',
                        data: results.map(r => r.yearsToLimit),
                        backgroundColor: results.map(r => {
                            if (r.yearsToLimit >= currentResults.params.shelf_years) return 'rgba(16, 185, 129, 0.7)';
                            if (r.yearsToLimit >= currentResults.params.shelf_years * 0.5) return 'rgba(245, 158, 11, 0.7)';
                            return 'rgba(239, 68, 68, 0.7)';
                        }),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Tempo (anni)'
                            }
                        }
                    }
                }
            });
        }

        // Scenario management
        function saveScenario() {
            if (!currentResults) {
                alert('Esegui prima un calcolo!');
                return;
            }
            
            const scenario = {
                id: Date.now(),
                name: currentResults.params.scenarioName,
                params: currentResults.params,
                results: currentResults.results,
                savedAt: new Date().toISOString()
            };
            
            savedScenarios.push(scenario);
            localStorage.setItem('mvtr_scenarios', JSON.stringify(savedScenarios));
            
            renderScenariosList();
            alert(`Scenario "${scenario.name}" salvato con successo!`);
        }

        function renderScenariosList() {
            const container = getElement('.scenarios-list');
            
            if (savedScenarios.length === 0) {
                container.innerHTML = `
                    <p style="color: #64748b; text-align: center; padding: 2rem;">
                        Nessun scenario salvato. Configura i parametri e clicca "Salva Scenario".
                    </p>
                `;
                return;
            }
            
            container.innerHTML = savedScenarios.map(s => `
                <div class="scenario-card" data-id="${s.id}">
                    <div class="scenario-header">
                        <div class="scenario-name">${s.name}</div>
                        <button class="scenario-delete" data-id="${s.id}">×</button>
                    </div>
                    <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">
                        WVTR: ${s.params.wvtr_ref} · Eₐ: ${s.params.Ea_kJ} · Shelf: ${s.params.shelf_years} anni
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        Salvato: ${new Date(s.savedAt).toLocaleString()}
                    </div>
                    <button class="btn btn-primary btn-sm scenario-load" style="margin-top: 0.5rem; width: 100%;" data-id="${s.id}">
                        Carica Scenario
                    </button>
                </div>
            `).join('');
            
            // Add event listeners
            getAllElements('.scenario-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.dataset.id);
                    deleteScenario(id);
                });
            });
            
            getAllElements('.scenario-load').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.target.dataset.id);
                    loadScenario(id);
                });
            });
            
            updateScenarioComparison();
        }

        function deleteScenario(id) {
            if (confirm('Eliminare questo scenario?')) {
                savedScenarios = savedScenarios.filter(s => s.id !== id);
                localStorage.setItem('mvtr_scenarios', JSON.stringify(savedScenarios));
                renderScenariosList();
            }
        }

        function loadScenario(id) {
            const scenario = savedScenarios.find(s => s.id === id);
            if (!scenario) return;
            
            getElement('.ph-wvtr').value = scenario.params.wvtr_ref;
            getElement('.ph-tref').value = scenario.params.T_ref;
            getElement('.ph-rhref').value = scenario.params.RH_ref;
            getElement('.ph-ea').value = scenario.params.Ea_kJ;
            getElement('.ph-area').value = scenario.params.cavity_cm2;
            getElement('.ph-crit').value = scenario.params.critical_mg;
            getElement('.ph-years').value = scenario.params.shelf_years;
            getElement('.scenario-name').value = scenario.params.scenarioName;
            
            calculateAndRender();
            switchTab('overview');
        }

        function updateScenarioComparison() {
            if (savedScenarios.length < 2) {
                getElement('.scenario-comparison-body').innerHTML = `
                    <tr><td colspan="${savedScenarios.length + 1}" style="text-align: center; color: #64748b;">
                        Salva almeno 2 scenari per il confronto
                    </td></tr>
                `;
                return;
            }
            
            const headerRow = getElement('.scenario-comparison-header');
            headerRow.innerHTML = '<th>Parametro</th>' + 
                savedScenarios.map(s => `<th>${s.name}</th>`).join('');
            
            const params = [
                { key: 'wvtr_ref', label: 'WVTR Riferimento', unit: 'g/m²/day' },
                { key: 'T_ref', label: 'Temperatura Ref', unit: '°C' },
                { key: 'RH_ref', label: 'UR Riferimento', unit: '%' },
                { key: 'Ea_kJ', label: 'Energia di Attivazione', unit: 'kJ/mol' },
                { key: 'cavity_cm2', label: 'Area Cavità', unit: 'cm²' },
                { key: 'critical_mg', label: 'Limite Critico', unit: 'mg' },
                { key: 'shelf_years', label: 'Shelf Life', unit: 'anni' },
                { key: 'passCount', label: 'Zone Conformi', unit: '/7', calc: s => s.results.filter(r => r.pass).length }
            ];
            
            const tbody = getElement('.scenario-comparison-body');
            tbody.innerHTML = params.map(p => `
                <tr>
                    <td><strong>${p.label}</strong></td>
                    ${savedScenarios.map(s => {
                        const val = p.calc ? p.calc(s) : s.params[p.key];
                        return `<td>${val}${p.unit}</td>`;
                    }).join('')}
                </tr>
            `).join('');
            
            renderScenarioComparisonChart();
        }

        function renderScenarioComparisonChart() {
            const ctx = getElement('.chart-scenario-comparison').getContext('2d');
            
            if (charts.scenarioComp) charts.scenarioComp.destroy();
            
            if (savedScenarios.length < 2) return;
            
            const zones = ICH_ZONES.map(z => z.label);
            
            charts.scenarioComp = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: zones,
                    datasets: savedScenarios.map((s, idx) => ({
                        label: s.name,
                        data: zones.map(zLabel => {
                            const result = s.results.find(r => r.zone.label === zLabel);
                            return result ? result.totalIngress : 0;
                        }),
                        backgroundColor: `hsla(${idx * 60}, 70%, 60%, 0.7)`,
                        borderColor: `hsl(${idx * 60}, 70%, 50%)`,
                        borderWidth: 2
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Umidità Totale (mg)'
                            }
                        }
                    }
                }
            });
        }

        // Sensitivity analysis
        function runSensitivityEA() {
            if (!currentResults) {
                alert('Esegui prima un calcolo base!');
                return;
            }
            
            const min = parseFloat(getElement('.sens-ea-min').value);
            const max = parseFloat(getElement('.sens-ea-max').value);
            const steps = 7;
            const step = (max - min) / (steps - 1);
            
            const eaValues = [];
            const maxIngressValues = [];
            const passCounts = [];
            
            for (let i = 0; i < steps; i++) {
                const ea = min + (step * i);
                eaValues.push(ea);
                
                const tempResults = performCalculations({
                    ...currentResults.params,
                    Ea_kJ: ea
                });
                
                maxIngressValues.push(Math.max(...tempResults.map(r => r.totalIngress)));
                passCounts.push(tempResults.filter(r => r.pass).length);
            }
            
            const ctx = getElement('.chart-sensitivity-ea').getContext('2d');
            
            if (charts.sensEA) charts.sensEA.destroy();
            
            charts.sensEA = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: eaValues.map(v => `${v} kJ/mol`),
                    datasets: [
                        {
                            label: 'Max Ingresso Totale (mg)',
                            data: maxIngressValues,
                            borderColor: 'rgb(37, 99, 235)',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Zone Conformi',
                            data: passCounts,
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Ingresso (mg)' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 0,
                            max: 7,
                            title: { display: true, text: 'Zone Conformi' }
                        }
                    }
                }
            });
        }

        function runSensitivityWVTR() {
            if (!currentResults) {
                alert('Esegui prima un calcolo base!');
                return;
            }
            
            const min = parseFloat(getElement('.sens-wvtr-min').value);
            const max = parseFloat(getElement('.sens-wvtr-max').value);
            const steps = 7;
            const step = (max - min) / (steps - 1);
            
            const wvtrValues = [];
            const maxIngressValues = [];
            const passCounts = [];
            
            for (let i = 0; i < steps; i++) {
                const wvtr = min + (step * i);
                wvtrValues.push(wvtr);
                
                const tempResults = performCalculations({
                    ...currentResults.params,
                    wvtr_ref: wvtr
                });
                
                maxIngressValues.push(Math.max(...tempResults.map(r => r.totalIngress)));
                passCounts.push(tempResults.filter(r => r.pass).length);
            }
            
            const ctx = getElement('.chart-sensitivity-wvtr').getContext('2d');
            
            if (charts.sensWVTR) charts.sensWVTR.destroy();
            
            charts.sensWVTR = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: wvtrValues.map(v => `${v} g/m²/d`),
                    datasets: [
                        {
                            label: 'Max Ingresso Totale (mg)',
                            data: maxIngressValues,
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: true,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Zone Conformi',
                            data: passCounts,
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Ingresso (mg)' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 0,
                            max: 7,
                            title: { display: true, text: 'Zone Conformi' }
                        }
                    }
                }
            });
        }

        function updateSensitivityCharts() {
            if (currentResults && !charts.sensEA) {
                runSensitivityEA();
                runSensitivityWVTR();
                renderTornadoChart();
            }
        }

        function renderTornadoChart() {
            if (!currentResults) return;
            
            const ctx = getElement('.chart-tornado').getContext('2d');
            
            if (charts.tornado) charts.tornado.destroy();
            
            const baseParams = currentResults.params;
            const baseResults = currentResults.results;
            const baseMaxIngress = Math.max(...baseResults.map(r => r.totalIngress));
            
            const variations = [
                { name: 'WVTR +20%', params: { ...baseParams, wvtr_ref: baseParams.wvtr_ref * 1.2 } },
                { name: 'WVTR -20%', params: { ...baseParams, wvtr_ref: baseParams.wvtr_ref * 0.8 } },
                { name: 'Eₐ +20%', params: { ...baseParams, Ea_kJ: baseParams.Ea_kJ * 1.2 } },
                { name: 'Eₐ -20%', params: { ...baseParams, Ea_kJ: baseParams.Ea_kJ * 0.8 } },
                { name: 'Temp +5°C', params: { ...baseParams, T_ref: baseParams.T_ref + 5 } },
                { name: 'Area +50%', params: { ...baseParams, cavity_cm2: baseParams.cavity_cm2 * 1.5 } }
            ];
            
            const labels = [];
            const data = [];
            const colors = [];
            
            variations.forEach(v => {
                const tempResults = performCalculations(v.params);
                const maxIngress = Math.max(...tempResults.map(r => r.totalIngress));
                const change = ((maxIngress - baseMaxIngress) / baseMaxIngress) * 100;
                
                labels.push(v.name);
                data.push(Math.abs(change));
                colors.push(change > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)');
            });
            
            charts.tornado = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Impatto su Max Ingresso (%)',
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 2
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Variazione % rispetto al base case'
                            }
                        }
                    }
                }
            });
        }

        // Export functions
        function exportToCSV() {
            if (!currentResults) {
                alert('Nessun dato da esportare!');
                return;
            }
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            let csv = 'MVTR Analysis Report\n';
            csv += `Generated: ${new Date().toISOString()}\n\n`;
            csv += 'Parameters\n';
            csv += `WVTR Reference,${params.wvtr_ref},g/m²/day\n`;
            csv += `Temperature Reference,${params.T_ref},°C\n`;
            csv += `RH Reference,${params.RH_ref},%\n`;
            csv += `Activation Energy,${params.Ea_kJ},kJ/mol\n`;
            csv += `Cavity Area,${params.cavity_cm2},cm²\n`;
            csv += `Critical Moisture,${params.critical_mg},mg\n`;
            csv += `Shelf Life,${params.shelf_years},years\n\n`;
            
            csv += 'Zone,T (°C),RH (%),WVTR Eff (g/m²/day),Daily Ingress (mg),Yearly Ingress (mg),Total Ingress (mg),% Limit,Status\n';
            
            results.forEach(r => {
                csv += `${r.zone.label},${r.zone.T},${r.zone.RH},${r.wvtrEff.toFixed(4)},`;
                csv += `${r.dailyIngress.toFixed(4)},${r.yearlyIngress.toFixed(3)},`;
                csv += `${r.totalIngress.toFixed(3)},${r.percentLimit.toFixed(1)}%,`;
                csv += `${r.pass ? 'PASS' : 'FAIL'}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MVTR_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }

        function exportToPDF() {
            if (!currentResults) {
                alert('Nessun dato da esportare!');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            doc.setFontSize(20);
            doc.text('MVTR Analysis Report', 20, 20);
            
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
            
            doc.setFontSize(14);
            doc.text('Parameters', 20, 45);
            
            doc.setFontSize(10);
            let y = 55;
            doc.text(`WVTR Reference: ${params.wvtr_ref} g/m²/day`, 20, y); y += 7;
            doc.text(`Temperature Reference: ${params.T_ref} °C`, 20, y); y += 7;
            doc.text(`RH Reference: ${params.RH_ref} %`, 20, y); y += 7;
            doc.text(`Activation Energy: ${params.Ea_kJ} kJ/mol`, 20, y); y += 7;
            doc.text(`Cavity Area: ${params.cavity_cm2} cm²`, 20, y); y += 7;
            doc.text(`Critical Moisture: ${params.critical_mg} mg`, 20, y); y += 7;
            doc.text(`Shelf Life: ${params.shelf_years} years`, 20, y); y += 15;
            
            doc.setFontSize(14);
            doc.text('Results by ICH Zone', 20, y); y += 10;
            
            doc.setFontSize(8);
            doc.text('Zone | T (°C) | RH (%) | WVTR Eff | Total Ingress (mg) | Status', 20, y); y += 7;
            
            doc.setLineWidth(0.5);
            doc.line(20, y, 190, y); y += 5;
            
            results.forEach(r => {
                const line = `${r.zone.label} | ${r.zone.T} | ${r.zone.RH} | ${r.wvtrEff.toFixed(3)} | ${r.totalIngress.toFixed(3)} | ${r.pass ? 'PASS' : 'FAIL'}`;
                doc.text(line, 20, y);
                y += 5;
            });
            
            doc.save(`MVTR_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        }

        // Utility functions
        function switchTab(tabName) {
            getAllElements('.tab').forEach(t => t.classList.remove('active'));
            getElement(`.tab[data-tab="${tabName}"]`).classList.add('active');
            
            getAllElements('.tab-content').forEach(c => c.classList.remove('active'));
            getElement(`#tab-${tabName}`).classList.add('active');
            
            if (tabName === 'charts' && currentResults) {
                setTimeout(() => {
                    Object.values(charts).forEach(chart => chart.resize());
                }, 100);
            }
        }

        function resetForm() {
            if (confirm('Resettare tutti i parametri ai valori default?')) {
                getElement('.ph-wvtr').value = 1.0;
                getElement('.ph-tref').value = 38;
                getElement('.ph-rhref').value = 90;
                getElement('.ph-ea').value = 35;
                getElement('.ph-area').value = 2.0;
                getElement('.ph-crit').value = 2.0;
                getElement('.ph-years').value = 2;
                getElement('.scenario-name').value = 'Scenario Base';
                
                getAllElements('.form-group').forEach(fg => fg.classList.remove('has-error'));
                
                calculateAndRender();
            }
        }

        // Event listeners
        getElement('.mvtr-calculate').addEventListener('click', calculateAndRender);
        getElement('.mvtr-save').addEventListener('click', saveScenario);
        getElement('.mvtr-export-csv').addEventListener('click', exportToCSV);
        getElement('.mvtr-export-pdf').addEventListener('click', exportToPDF);
        getElement('.mvtr-reset').addEventListener('click', resetForm);
        
        getAllElements('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                switchTab(e.target.dataset.tab);
            });
        });
        
        getElement('.sens-ea-run').addEventListener('click', runSensitivityEA);
        getElement('.sens-wvtr-run').addEventListener('click', runSensitivityWVTR);

        // Initialize
        renderScenariosList();
    };
})();
