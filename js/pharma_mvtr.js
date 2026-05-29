<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MVTR Pro System - ICH Q1A(R2) Compliance</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --bg: #f8fafc;
            --card: #ffffff;
            --text: #1e293b;
            --text-light: #64748b;
            --border: #e2e8f0;
            --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 2rem;
            border-radius: 1rem;
            margin-bottom: 2rem;
            box-shadow: var(--shadow-lg);
        }

        .header h1 {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.5rem;
        }

        .header p {
            opacity: 0.9;
            font-size: 0.95rem;
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(255,255,255,0.2);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-top: 0.5rem;
        }

        /* Grid Layout */
        .grid {
            display: grid;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
        .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
        .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

        /* Cards */
        .card {
            background: var(--card);
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid var(--border);
        }

        .card-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .card-title-icon {
            width: 2rem;
            height: 2rem;
            background: var(--primary);
            color: white;
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }

        /* Form Elements */
        .form-group {
            margin-bottom: 1rem;
        }

        .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 0.35rem;
        }

        .form-input {
            width: 100%;
            padding: 0.625rem 0.875rem;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            font-size: 0.95rem;
            transition: all 0.2s;
            font-family: inherit;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input.error {
            border-color: var(--danger);
        }

        .input-group {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .input-unit {
            font-size: 0.875rem;
            color: var(--text-light);
            font-weight: 500;
            white-space: nowrap;
        }

        .hint {
            font-size: 0.75rem;
            color: var(--text-light);
            margin-top: 0.25rem;
        }

        .error-message {
            font-size: 0.75rem;
            color: var(--danger);
            margin-top: 0.25rem;
            display: none;
        }

        .form-group.has-error .error-message {
            display: block;
        }

        /* Buttons */
        .btn {
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

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow);
        }

        .btn-success {
            background: var(--success);
            color: white;
        }

        .btn-success:hover {
            background: #059669;
        }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text);
        }

        .btn-outline:hover {
            background: var(--bg);
        }

        .btn-sm {
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
        }

        .btn-group {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-top: 1rem;
        }

        /* KPI Cards */
        .kpi-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem;
            border-radius: 0.75rem;
            position: relative;
            overflow: hidden;
        }

        .kpi-card.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .kpi-card.warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .kpi-card.danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

        .kpi-label {
            font-size: 0.875rem;
            opacity: 0.9;
            margin-bottom: 0.5rem;
        }

        .kpi-value {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 0.25rem;
        }

        .kpi-delta {
            font-size: 0.875rem;
            opacity: 0.9;
        }

        /* Tables */
        .table-container {
            overflow-x: auto;
            margin-top: 1rem;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .data-table th,
        .data-table td {
            padding: 0.875rem;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }

        .data-table th {
            background: var(--bg);
            font-weight: 700;
            color: var(--text);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }

        .data-table tr:hover {
            background: var(--bg);
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .status-pass {
            background: #d1fae5;
            color: #065f46;
        }

        .status-fail {
            background: #fee2e2;
            color: #991b1b;
        }

        /* Charts */
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }

        .chart-container.small {
            height: 250px;
        }

        /* Tabs */
        .tabs {
            display: flex;
            gap: 0.5rem;
            border-bottom: 2px solid var(--border);
            margin-bottom: 1.5rem;
        }

        .tab {
            padding: 0.75rem 1.25rem;
            background: none;
            border: none;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text-light);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }

        .tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* Progress Bars */
        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--border);
            border-radius: 9999px;
            overflow: hidden;
            margin-top: 0.5rem;
        }

        .progress-fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.5s ease;
        }

        .progress-fill.success { background: var(--success); }
        .progress-fill.warning { background: var(--warning); }
        .progress-fill.danger { background: var(--danger); }

        /* Tooltip */
        .tooltip {
            position: relative;
            display: inline-block;
            cursor: help;
        }

        .tooltip-icon {
            width: 1.25rem;
            height: 1.25rem;
            background: var(--text-light);
            color: white;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 700;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .header h1 { font-size: 1.5rem; }
            .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
        }

        /* Print */
        @media print {
            .no-print { display: none; }
            .card { break-inside: avoid; }
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-in {
            animation: fadeIn 0.5s ease-out;
        }

        /* Scenario Comparison */
        .scenario-card {
            border: 2px solid var(--border);
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
            transition: all 0.2s;
        }

        .scenario-card:hover {
            border-color: var(--primary);
            box-shadow: var(--shadow);
        }

        .scenario-card.active {
            border-color: var(--primary);
            background: rgba(37, 99, 235, 0.05);
        }

        .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }

        .scenario-name {
            font-weight: 700;
            font-size: 1rem;
        }

        .scenario-delete {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
            font-size: 1.25rem;
            line-height: 1;
        }

        /* Loading */
        .loading {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🧪 MVTR Pro System</h1>
            <p>Advanced Moisture Vapor Transmission Rate Analysis - ICH Q1A(R2) Compliant</p>
            <span class="badge">Enterprise Edition v2.0</span>
            <span class="badge">ISO 15106 Certified</span>
        </div>

        <!-- Main Controls -->
        <div class="grid grid-2">
            <!-- Input Parameters -->
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <div class="card-title-icon">⚙️</div>
                        Parametri di Input
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="resetForm()">
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
                            <input type="number" id="ph-wvtr" class="form-input" value="1.0" step="0.01" min="0">
                            <span class="input-unit">g/m²/day</span>
                        </div>
                        <div class="hint">Valore misurato a condizioni di riferimento</div>
                        <div class="error-message">Inserire un valore valido ≥ 0</div>
                    </div>

                    <div class="form-group" id="fg-tref">
                        <label class="form-label">Temperatura di Riferimento</label>
                        <div class="input-group">
                            <input type="number" id="ph-tref" class="form-input" value="38" step="0.5" min="-50" max="100">
                            <span class="input-unit">°C</span>
                        </div>
                        <div class="hint">Temperatura alla quale è stato misurato il WVTR</div>
                        <div class="error-message">Inserire una temperatura valida</div>
                    </div>

                    <div class="form-group" id="fg-rhref">
                        <label class="form-label">Umidità Relativa di Riferimento</label>
                        <div class="input-group">
                            <input type="number" id="ph-rhref" class="form-input" value="90" step="1" min="0" max="100">
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
                            <input type="number" id="ph-ea" class="form-input" value="35" step="1" min="0" max="150">
                            <span class="input-unit">kJ/mol</span>
                        </div>
                        <div class="hint">Eₐ = 0 disattiva la correzione di Arrhenius</div>
                        <div class="error-message">Inserire un valore valido</div>
                    </div>

                    <div class="form-group" id="fg-area">
                        <label class="form-label">Area Superficiale Cavità</label>
                        <div class="input-group">
                            <input type="number" id="ph-area" class="form-input" value="2.0" step="0.1" min="0.1">
                            <span class="input-unit">cm²</span>
                        </div>
                        <div class="hint">Area esposta al trasferimento di umidità</div>
                        <div class="error-message">Inserire un'area valida</div>
                    </div>

                    <div class="form-group" id="fg-crit">
                        <label class="form-label">Guadagno Critico di Umidità</label>
                        <div class="input-group">
                            <input type="number" id="ph-crit" class="form-input" value="2.0" step="0.1" min="0.1">
                            <span class="input-unit">mg/cavità</span>
                        </div>
                        <div class="hint">Limite massimo di umidità assorbita</div>
                        <div class="error-message">Inserire un valore valido</div>
                    </div>

                    <div class="form-group" id="fg-years">
                        <label class="form-label">Shelf Life Target</label>
                        <div class="input-group">
                            <input type="number" id="ph-years" class="form-input" value="2" step="0.5" min="0.5" max="10">
                            <span class="input-unit">anni</span>
                        </div>
                        <div class="hint">Durata di conservazione desiderata</div>
                        <div class="error-message">Inserire una durata valida</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nome Scenario</label>
                        <input type="text" id="scenario-name" class="form-input" placeholder="Es. Formulazione A" value="Scenario Base">
                        <div class="hint">Identificativo per il confronto scenari</div>
                    </div>
                </div>

                <div class="btn-group">
                    <button class="btn btn-primary" onclick="calculateAndRender()">
                        📊 Calcola e Visualizza
                    </button>
                    <button class="btn btn-success" onclick="saveScenario()">
                        💾 Salva Scenario
                    </button>
                    <button class="btn btn-outline" onclick="exportToCSV()">
                        📥 Export CSV
                    </button>
                    <button class="btn btn-outline" onclick="exportToPDF()">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            <!-- KPI Dashboard -->
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
                        <div class="kpi-value" id="kpi-pass-count">0/7</div>
                        <div class="kpi-delta" id="kpi-pass-percent">0% del totale</div>
                    </div>

                    <div class="kpi-card warning" id="kpi-max-ingress">
                        <div class="kpi-label">Max Ingresso Annuo</div>
                        <div class="kpi-value" id="kpi-max-ingress-val">0 mg</div>
                        <div class="kpi-delta">Nella zona più critica</div>
                    </div>

                    <div class="kpi-card" id="kpi-safety-margin">
                        <div class="kpi-label">Margine di Sicurezza</div>
                        <div class="kpi-value" id="kpi-safety-val">0%</div>
                        <div class="kpi-delta">Rispetto al limite critico</div>
                    </div>

                    <div class="kpi-card" id="kpi-arrhenius-factor">
                        <div class="kpi-label">Fattore di Arrhenius</div>
                        <div class="kpi-value" id="kpi-arr-val">1.0x</div>
                        <div class="kpi-delta">Accelerazione termica media</div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem;">
                    <div class="form-label">Stato Complessivo del Sistema</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="overall-progress" style="width: 0%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.875rem;">
                        <span id="overall-status">In attesa di calcolo...</span>
                        <span id="overall-percent">0%</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" onclick="switchTab('overview')">📊 Panoramica</button>
            <button class="tab" onclick="switchTab('detailed')">📋 Tabelle Dettagliate</button>
            <button class="tab" onclick="switchTab('charts')">📈 Grafici Avanzati</button>
            <button class="tab" onclick="switchTab('comparison')">🔀 Confronto Scenari</button>
            <button class="tab" onclick="switchTab('sensitivity')">🎯 Sensitivity Analysis</button>
        </div>

        <!-- Tab Contents -->
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
                        <canvas id="chart-overview"></canvas>
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
                        <canvas id="chart-factors"></canvas>
                    </div>
                    <div id="factors-summary" style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-light);">
                        <!-- Populated by JS -->
                    </div>
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
                    <table class="data-table" id="table-summary">
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
                        <tbody>
                            <!-- Populated by JS -->
                        </tbody>
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
                    <table class="data-table" id="table-detailed">
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
                        <tbody>
                            <!-- Populated by JS -->
                        </tbody>
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
                    <div id="calc-parameters" style="font-size: 0.875rem; line-height: 2;">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <div class="card-title-icon">📐</div>
                            Formule Utilizzate
                        </div>
                    </div>
                    <div style="font-size: 0.875rem; font-family: 'Courier New', monospace; background: var(--bg); padding: 1rem; border-radius: 0.5rem;">
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
                        <canvas id="chart-wvtr-comparison"></canvas>
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
                        <canvas id="chart-cumulative"></canvas>
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
                        <canvas id="chart-temp-rh-impact"></canvas>
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
                        <canvas id="chart-time-to-limit"></canvas>
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
                    <div id="scenarios-list">
                        <p style="color: var(--text-light); text-align: center; padding: 2rem;">
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
                        <canvas id="chart-scenario-comparison"></canvas>
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
                    <table class="data-table" id="table-scenario-comparison">
                        <thead>
                            <tr id="scenario-comparison-header">
                                <th>Parametro</th>
                            </tr>
                        </thead>
                        <tbody id="scenario-comparison-body">
                            <!-- Populated by JS -->
                        </tbody>
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
                            <input type="number" id="sens-ea-min" class="form-input" value="20" step="5">
                            <span style="padding: 0 0.5rem;">a</span>
                            <input type="number" id="sens-ea-max" class="form-input" value="50" step="5">
                            <span class="input-unit">kJ/mol</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="runSensitivityEA()">
                        Analizza
                    </button>
                    <div class="chart-container" style="margin-top: 1rem;">
                        <canvas id="chart-sensitivity-ea"></canvas>
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
                            <input type="number" id="sens-wvtr-min" class="form-input" value="0.5" step="0.1">
                            <span style="padding: 0 0.5rem;">a</span>
                            <input type="number" id="sens-wvtr-max" class="form-input" value="2.0" step="0.1">
                            <span class="input-unit">g/m²/day</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="runSensitivityWVTR()">
                        Analizza
                    </button>
                    <div class="chart-container" style="margin-top: 1rem;">
                        <canvas id="chart-sensitivity-wvtr"></canvas>
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
                    <canvas id="chart-tornado"></canvas>
                </div>
            </div>
        </div>
    </div>

    <script>
        // ============================================================================
        // MVTR PRO SYSTEM - ENTERPRISE EDITION
        // ============================================================================

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

        // Global state
        let currentResults = null;
        let savedScenarios = JSON.parse(localStorage.getItem('mvtr_scenarios') || '[]');
        let charts = {};

        // Constants
        const R_GAS = 8.314e-3; // kJ/(mol·K)
        const DAYS_PER_YEAR = 365;

        // ============================================================================
        // CORE CALCULATION FUNCTIONS
        // ============================================================================

        /**
         * Calcola il WVTR corretto per condizioni ICH target usando Arrhenius + RH
         */
        function wvtrAtICH(wvtr_ref, Ea_kJ, T_ref, RH_ref, T_target, RH_target) {
            const Tr = T_ref + 273.15;
            const Tt = T_target + 273.15;
            
            // Arrhenius factor
            const arrFactor = (Ea_kJ > 0) ? Math.exp((Ea_kJ / R_GAS) * (1/Tr - 1/Tt)) : 1;
            
            // RH driving force factor
            const rhFactor = (RH_ref > 0) ? (RH_target / RH_ref) : 1;
            
            return {
                wvtrEff: wvtr_ref * arrFactor * rhFactor,
                arrFactor: arrFactor,
                rhFactor: rhFactor
            };
        }

        /**
         * Esegue tutti i calcoli per le zone ICH
         */
        function performCalculations(params) {
            const areaM2 = params.cavity_cm2 / 10000; // cm² to m²
            const shelfDays = params.shelf_years * DAYS_PER_YEAR;
            
            const results = ICH_ZONES.map(zone => {
                const correction = wvtrAtICH(
                    params.wvtr_ref, 
                    params.Ea_kJ, 
                    params.T_ref, 
                    params.RH_ref, 
                    zone.T, 
                    zone.RH
                );
                
                const wvtrEff = correction.wvtrEff;
                const dailyIngress = wvtrEff * areaM2 * 1000; // mg/day
                const yearlyIngress = dailyIngress * DAYS_PER_YEAR; // mg/year
                const totalIngress = dailyIngress * shelfDays; // mg over shelf life
                const percentLimit = (totalIngress / params.critical_mg) * 100;
                const pass = totalIngress <= params.critical_mg;
                
                // Time to reach critical limit
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
            
            return results;
        }

        // ============================================================================
        // UI RENDERING FUNCTIONS
        // ============================================================================

        function calculateAndRender() {
            // Validate inputs
            if (!validateInputs()) return;
            
            // Get parameters
            const params = {
                wvtr_ref: parseFloat(document.getElementById('ph-wvtr').value),
                T_ref: parseFloat(document.getElementById('ph-tref').value),
                RH_ref: parseFloat(document.getElementById('ph-rhref').value),
                Ea_kJ: parseFloat(document.getElementById('ph-ea').value),
                cavity_cm2: parseFloat(document.getElementById('ph-area').value),
                critical_mg: parseFloat(document.getElementById('ph-crit').value),
                shelf_years: parseFloat(document.getElementById('ph-years').value),
                scenarioName: document.getElementById('scenario-name').value || 'Scenario Base'
            };
            
            // Perform calculations
            currentResults = {
                params: params,
                results: performCalculations(params),
                timestamp: new Date().toISOString()
            };
            
            // Update all views
            updateKPIDashboard();
            renderOverviewTab();
            renderDetailedTab();
            renderChartsTab();
            updateSensitivityCharts();
            
            // Scroll to results
            document.querySelector('.tabs').scrollIntoView({ behavior: 'smooth' });
        }

        function validateInputs() {
            const fields = [
                { id: 'ph-wvtr', min: 0, msg: 'WVTR deve essere ≥ 0' },
                { id: 'ph-tref', min: -50, max: 100, msg: 'Temperatura non valida' },
                { id: 'ph-rhref', min: 0, max: 100, msg: 'UR deve essere 0-100%' },
                { id: 'ph-ea', min: 0, max: 150, msg: 'Eₐ non valida' },
                { id: 'ph-area', min: 0.1, msg: 'Area deve essere > 0' },
                { id: 'ph-crit', min: 0.1, msg: 'Limite critico deve essere > 0' },
                { id: 'ph-years', min: 0.5, max: 10, msg: 'Shelf life non valida' }
            ];
            
            let isValid = true;
            fields.forEach(field => {
                const el = document.getElementById(field.id);
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

        function updateKPIDashboard() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            // Count passing zones
            const passCount = results.filter(r => r.pass).length;
            const totalZones = results.length;
            const passPercent = (passCount / totalZones * 100).toFixed(0);
            
            document.getElementById('kpi-pass-count').textContent = `${passCount}/${totalZones}`;
            document.getElementById('kpi-pass-percent').textContent = `${passPercent}% del totale`;
            
            // Update KPI card color
            const kpiCard = document.getElementById('kpi-zones-pass');
            if (passCount === totalZones) {
                kpiCard.className = 'kpi-card success';
            } else if (passCount === 0) {
                kpiCard.className = 'kpi-card danger';
            } else {
                kpiCard.className = 'kpi-card warning';
            }
            
            // Max ingress
            const maxIngress = Math.max(...results.map(r => r.yearlyIngress));
            const maxZone = results.find(r => r.yearlyIngress === maxIngress);
            document.getElementById('kpi-max-ingress-val').textContent = `${maxIngress.toFixed(2)} mg`;
            document.querySelector('#kpi-max-ingress .kpi-delta').textContent = `Nella ${maxZone.zone.label}`;
            
            // Safety margin
            const minSafety = Math.min(...results.map(r => 100 - r.percentLimit));
            const safetyEl = document.getElementById('kpi-safety-val');
            const safetyCard = document.getElementById('kpi-safety-margin');
            safetyEl.textContent = `${minSafety.toFixed(1)}%`;
            
            if (minSafety > 20) {
                safetyCard.className = 'kpi-card success';
            } else if (minSafety > 0) {
                safetyCard.className = 'kpi-card warning';
            } else {
                safetyCard.className = 'kpi-card danger';
            }
            
            // Arrhenius factor (average)
            const avgArrFactor = results.reduce((sum, r) => sum + r.arrFactor, 0) / results.length;
            document.getElementById('kpi-arr-val').textContent = `${avgArrFactor.toFixed(2)}x`;
            
            // Overall progress bar
            const overallPercent = passPercent;
            const progressFill = document.getElementById('overall-progress');
            const overallStatus = document.getElementById('overall-status');
            const overallPercentEl = document.getElementById('overall-percent');
            
            progressFill.style.width = `${overallPercent}%`;
            overallPercentEl.textContent = `${overallPercent}%`;
            
            if (overallPercent === 100) {
                progressFill.className = 'progress-fill success';
                overallStatus.textContent = '✓ Tutte le zone conformi';
                overallStatus.style.color = 'var(--success)';
            } else if (overallPercent > 50) {
                progressFill.className = 'progress-fill warning';
                overallStatus.textContent = '⚠ Alcune zone critiche';
                overallStatus.style.color = 'var(--warning)';
            } else {
                progressFill.className = 'progress-fill danger';
                overallStatus.textContent = '✗ Maggioranza non conforme';
                overallStatus.style.color = 'var(--danger)';
            }
        }

        function renderOverviewTab() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            
            // Summary table
            const tbody = document.querySelector('#table-summary tbody');
            tbody.innerHTML = results.map(r => `
                <tr style="${r.pass ? 'background: #f0fdf4' : 'background: #fef2f2'}">
                    <td><strong>${r.zone.label}</strong></td>
                    <td>${r.zone.T}°C / ${r.zone.RH}%<br><small style="color: var(--text-light)">${r.zone.desc}</small></td>
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
            
            // Overview chart
            renderOverviewChart();
            
            // Factors chart
            renderFactorsChart();
        }

        function renderDetailedTab() {
            if (!currentResults) return;
            
            const results = currentResults.results;
            const params = currentResults.params;
            
            // Detailed table
            const tbody = document.querySelector('#table-detailed tbody');
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
            
            // Calculation parameters
            const paramsDiv = document.getElementById('calc-parameters');
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

        // ============================================================================
        // CHART RENDERING FUNCTIONS
        // ============================================================================

        function renderOverviewChart() {
            const ctx = document.getElementById('chart-overview').getContext('2d');
            
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
            const ctx = document.getElementById('chart-factors').getContext('2d');
            
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
            
            // Factors summary
            const avgArr = (results.reduce((sum, r) => sum + r.arrFactor, 0) / results.length).toFixed(3);
            const avgRH = (results.reduce((sum, r) => sum + r.rhFactor, 0) / results.length).toFixed(3);
            const maxArr = Math.max(...results.map(r => r.arrFactor)).toFixed(3);
            const maxRH = Math.max(...results.map(r => r.rhFactor)).toFixed(3);
            
            document.getElementById('factors-summary').innerHTML = `
                <div><strong>Fattore di Arrhenius medio:</strong> ${avgArr}x (max: ${maxArr}x)</div>
                <div><strong>Fattore RH medio:</strong> ${avgRH}x (max: ${maxRH}x)</div>
                <div style="margin-top: 0.5rem; font-size: 0.8rem;">
                    Eₐ = ${currentResults.params.Ea_kJ} kJ/mol · T_ref = ${currentResults.params.T_ref}°C
                </div>
            `;
        }

        function renderWVTRComparisonChart() {
            const ctx = document.getElementById('chart-wvtr-comparison').getContext('2d');
            
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
            const ctx = document.getElementById('chart-cumulative').getContext('2d');
            
            if (charts.cumulative) charts.cumulative.destroy();
            
            const results = currentResults.results;
            const years = currentResults.params.shelf_years;
            
            // Calculate cumulative for each year
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
            
            // Add critical limit line
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
            const ctx = document.getElementById('chart-temp-rh-impact').getContext('2d');
            
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
                            r: Math.sqrt(r.wvtrEff) * 10, // Size based on WVTR
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
            const ctx = document.getElementById('chart-time-to-limit').getContext('2d');
            
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

        // ============================================================================
        // SCENARIO MANAGEMENT
        // ============================================================================

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
            const container = document.getElementById('scenarios-list');
            
            if (savedScenarios.length === 0) {
                container.innerHTML = `
                    <p style="color: var(--text-light); text-align: center; padding: 2rem;">
                        Nessun scenario salvato. Configura i parametri e clicca "Salva Scenario".
                    </p>
                `;
                return;
            }
            
            container.innerHTML = savedScenarios.map(s => `
                <div class="scenario-card" data-id="${s.id}">
                    <div class="scenario-header">
                        <div class="scenario-name">${s.name}</div>
                        <button class="scenario-delete" onclick="deleteScenario(${s.id})">×</button>
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">
                        WVTR: ${s.params.wvtr_ref} · Eₐ: ${s.params.Ea_kJ} · Shelf: ${s.params.shelf_years} anni
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-light);">
                        Salvato: ${new Date(s.savedAt).toLocaleString()}
                    </div>
                    <button class="btn btn-primary btn-sm" style="margin-top: 0.5rem; width: 100%;" onclick="loadScenario(${s.id})">
                        Carica Scenario
                    </button>
                </div>
            `).join('');
            
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
            
            // Load parameters into form
            document.getElementById('ph-wvtr').value = scenario.params.wvtr_ref;
            document.getElementById('ph-tref').value = scenario.params.T_ref;
            document.getElementById('ph-rhref').value = scenario.params.RH_ref;
            document.getElementById('ph-ea').value = scenario.params.Ea_kJ;
            document.getElementById('ph-area').value = scenario.params.cavity_cm2;
            document.getElementById('ph-crit').value = scenario.params.critical_mg;
            document.getElementById('ph-years').value = scenario.params.shelf_years;
            document.getElementById('scenario-name').value = scenario.params.scenarioName;
            
            // Recalculate
            calculateAndRender();
            
            // Switch to overview tab
            switchTab('overview');
        }

        function updateScenarioComparison() {
            if (savedScenarios.length < 2) {
                document.getElementById('scenario-comparison-body').innerHTML = `
                    <tr><td colspan="${savedScenarios.length + 1}" style="text-align: center; color: var(--text-light);">
                        Salva almeno 2 scenari per il confronto
                    </td></tr>
                `;
                return;
            }
            
            // Update header
            const headerRow = document.getElementById('scenario-comparison-header');
            headerRow.innerHTML = '<th>Parametro</th>' + 
                savedScenarios.map(s => `<th>${s.name}</th>`).join('');
            
            // Update body
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
            
            const tbody = document.getElementById('scenario-comparison-body');
            tbody.innerHTML = params.map(p => `
                <tr>
                    <td><strong>${p.label}</strong></td>
                    ${savedScenarios.map(s => {
                        const val = p.calc ? p.calc(s) : s.params[p.key];
                        return `<td>${val}${p.unit}</td>`;
                    }).join('')}
                </tr>
            `).join('');
            
            // Update comparison chart
            renderScenarioComparisonChart();
        }

        function renderScenarioComparisonChart() {
            const ctx = document.getElementById('chart-scenario-comparison').getContext('2d');
            
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

        // ============================================================================
        // SENSITIVITY ANALYSIS
        // ============================================================================

        function runSensitivityEA() {
            if (!currentResults) {
                alert('Esegui prima un calcolo base!');
                return;
            }
            
            const min = parseFloat(document.getElementById('sens-ea-min').value);
            const max = parseFloat(document.getElementById('sens-ea-max').value);
            const steps = 7;
            const step = (max - min) / (steps - 1);
            
            const eaValues = [];
            const maxIngressValues = [];
            const passCounts = [];
            
            for (let i = 0; i < steps; i++) {
                const ea = min + (step * i);
                eaValues.push(ea);
                
                // Recalculate with this EA
                const tempResults = performCalculations({
                    ...currentResults.params,
                    Ea_kJ: ea
                });
                
                maxIngressValues.push(Math.max(...tempResults.map(r => r.totalIngress)));
                passCounts.push(tempResults.filter(r => r.pass).length);
            }
            
            // Render chart
            const ctx = document.getElementById('chart-sensitivity-ea').getContext('2d');
            
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
            
            const min = parseFloat(document.getElementById('sens-wvtr-min').value);
            const max = parseFloat(document.getElementById('sens-wvtr-max').value);
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
            
            const ctx = document.getElementById('chart-sensitivity-wvtr').getContext('2d');
            
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
            // Auto-run sensitivity on first calculation
            if (currentResults && !charts.sensEA) {
                runSensitivityEA();
                runSensitivityWVTR();
                renderTornadoChart();
            }
        }

        function renderTornadoChart() {
            if (!currentResults) return;
            
            const ctx = document.getElementById('chart-tornado').getContext('2d');
            
            if (charts.tornado) charts.tornado.destroy();
            
            const baseParams = currentResults.params;
            const baseResults = currentResults.results;
            const baseMaxIngress = Math.max(...baseResults.map(r => r.totalIngress));
            
            // Test variations
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

        // ============================================================================
        // EXPORT FUNCTIONS
        // ============================================================================

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
            
            // Title
            doc.setFontSize(20);
            doc.text('MVTR Analysis Report', 20, 20);
            
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
            
            // Parameters
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
            
            // Results table
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
            
            // Save
            doc.save(`MVTR_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        }

        // ============================================================================
        // UTILITY FUNCTIONS
        // ============================================================================

        function switchTab(tabName) {
            // Update tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Resize charts if needed
            if (tabName === 'charts' && currentResults) {
                setTimeout(() => {
                    Object.values(charts).forEach(chart => chart.resize());
                }, 100);
            }
        }

        function resetForm() {
            if (confirm('Resettare tutti i parametri ai valori default?')) {
                document.getElementById('ph-wvtr').value = 1.0;
                document.getElementById('ph-tref').value = 38;
                document.getElementById('ph-rhref').value = 90;
                document.getElementById('ph-ea').value = 35;
                document.getElementById('ph-area').value = 2.0;
                document.getElementById('ph-crit').value = 2.0;
                document.getElementById('ph-years').value = 2;
                document.getElementById('scenario-name').value = 'Scenario Base';
                
                // Clear errors
                document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
                
                // Recalculate
                calculateAndRender();
            }
        }

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            renderScenariosList();
            
            // Auto-calculate if there's saved state
            const savedState = localStorage.getItem('mvtr_current_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                document.getElementById('ph-wvtr').value = state.wvtr_ref || 1.0;
                document.getElementById('ph-tref').value = state.T_ref || 38;
                document.getElementById('ph-rhref').value = state.RH_ref || 90;
                document.getElementById('ph-ea').value = state.Ea_kJ || 35;
                document.getElementById('ph-area').value = state.cavity_cm2 || 2.0;
                document.getElementById('ph-crit').value = state.critical_mg || 2.0;
                document.getElementById('ph-years').value = state.shelf_years || 2;
                
                calculateAndRender();
            }
        });

        // Save current state on beforeunload
        window.addEventListener('beforeunload', () => {
            if (currentResults) {
                localStorage.setItem('mvtr_current_state', JSON.stringify(currentResults.params));
            }
        });
    </script>
</body>
</html>
