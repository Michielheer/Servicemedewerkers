const { getPool, sql } = require('../shared/db');

// Professionele rapport template voor publieke webpagina
const generateEmailTemplate = (inspectieData) => {
  const {
    inspectieID,
    klantnaam,
    contactpersoon,
    inspecteur,
    datum,
    tijd,
    standaardMatten,
    logomatten,
    wissers,
    toebehoren,
    sanitair,
    poetsdoeken,
    bedrijfskleding,
    problemen,
    algemeenOpmerkingen,
    contactpersonenWijzigingen,
    portalUsers
  } = inspectieData;

  const formatDatum = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatKorteDatum = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Helper functie voor activiteitentabel
  const renderActivityRow = (label, icon, juist, verbetering) => {
    const juistVal = juist !== undefined && juist !== null ? juist : '-';
    const verbeteringVal = verbetering !== undefined && verbetering !== null ? verbetering : '-';
    const hasIssue = verbetering && verbetering > 0;
    
    return `
      <tr class="activity-row ${hasIssue ? 'has-issue' : ''}">
        <td class="activity-name">
          <span class="activity-icon">${icon}</span>
          ${label}
        </td>
        <td class="activity-value good">${juistVal}</td>
        <td class="activity-value ${hasIssue ? 'warning' : ''}">${verbeteringVal}</td>
      </tr>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Rapport #${inspectieID} - ${klantnaam} | Lavans</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0052CC;
      --primary-dark: #003d99;
      --primary-light: #e6f0ff;
      --success: #0d7a3e;
      --success-bg: #e8f5ee;
      --warning: #b35c00;
      --warning-bg: #fff4e6;
      --text-primary: #1a1a2e;
      --text-secondary: #5c5c7a;
      --text-muted: #8a8aa3;
      --border: #e2e8f0;
      --bg-subtle: #f8fafc;
      --white: #ffffff;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
      --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
      --radius-sm: 6px;
      --radius-md: 12px;
      --radius-lg: 16px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }

    .page-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* Hero Header */
    .hero-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      padding: 48px 40px;
      color: var(--white);
      position: relative;
      overflow: hidden;
    }

    .hero-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }

    .hero-header::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
      border-radius: 50%;
    }

    .hero-content {
      position: relative;
      z-index: 1;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
    }

    .hero-title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .hero-subtitle {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
    }

    .hero-meta {
      display: flex;
      gap: 24px;
      margin-top: 28px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }

    .hero-meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hero-meta-label {
      font-size: 12px;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .hero-meta-value {
      font-size: 15px;
      font-weight: 600;
    }

    /* Main Content */
    .main-content {
      background: var(--white);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .content-body {
      padding: 40px;
    }

    /* Greeting */
    .greeting {
      font-size: 18px;
      color: var(--text-primary);
      margin-bottom: 24px;
    }

    .greeting strong {
      color: var(--primary);
    }

    /* Intro Card */
    .intro-card {
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      margin-bottom: 32px;
      border: 1px solid var(--border);
    }

    .intro-card p {
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .intro-card ul {
      margin: 0;
      padding-left: 20px;
      color: var(--text-secondary);
    }

    .intro-card li {
      margin: 8px 0;
    }

    /* Section */
    .section {
      margin-bottom: 36px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--border);
    }

    .section-icon {
      width: 36px;
      height: 36px;
      background: var(--primary-light);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }

    /* Activity Table */
    .activity-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--border);
    }

    .activity-table thead {
      background: var(--bg-subtle);
    }

    .activity-table th {
      padding: 14px 20px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    .activity-table th:not(:first-child) {
      text-align: center;
    }

    .activity-row {
      transition: background-color 0.2s;
    }

    .activity-row:hover {
      background: var(--bg-subtle);
    }

    .activity-row.has-issue {
      background: var(--warning-bg);
    }

    .activity-row.has-issue:hover {
      background: #ffedd5;
    }

    .activity-name {
      padding: 16px 20px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border);
    }

    .activity-icon {
      width: 32px;
      height: 32px;
      background: var(--primary-light);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .activity-value {
      padding: 16px 20px;
      text-align: center;
      font-weight: 600;
      font-size: 15px;
      border-bottom: 1px solid var(--border);
    }

    .activity-value.good {
      color: var(--success);
    }

    .activity-value.warning {
      color: var(--warning);
    }

    /* Status Cards */
    .status-card {
      border-radius: var(--radius-md);
      padding: 24px;
      margin-bottom: 20px;
    }

    .status-card.success {
      background: var(--success-bg);
      border: 1px solid #b7e4c7;
    }

    .status-card.warning {
      background: var(--warning-bg);
      border: 1px solid #fed7aa;
    }

    .status-card.info {
      background: var(--primary-light);
      border: 1px solid #bfdbfe;
    }

    .status-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .status-card-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .status-card.success .status-card-icon {
      background: var(--success);
      color: white;
    }

    .status-card.warning .status-card-icon {
      background: var(--warning);
      color: white;
    }

    .status-card.info .status-card-icon {
      background: var(--primary);
      color: white;
    }

    .status-card-title {
      font-size: 16px;
      font-weight: 700;
    }

    .status-card.success .status-card-title {
      color: var(--success);
    }

    .status-card.warning .status-card-title {
      color: var(--warning);
    }

    .status-card.info .status-card-title {
      color: var(--primary);
    }

    .status-card-content {
      color: var(--text-secondary);
      font-size: 15px;
    }

    .status-card-content ul {
      margin: 12px 0 0 0;
      padding-left: 20px;
    }

    .status-card-content li {
      margin: 8px 0;
    }

    /* Check List */
    .check-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .check-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }

    .check-list li:last-child {
      border-bottom: none;
    }

    .check-icon {
      width: 24px;
      height: 24px;
      background: var(--success);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .check-text strong {
      color: var(--text-primary);
    }

    .check-text span {
      color: var(--text-secondary);
    }

    /* Portal Table */
    .portal-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 20px;
      font-size: 14px;
    }

    .portal-table th {
      background: rgba(0,82,204,0.1);
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: var(--primary);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .portal-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.active {
      background: var(--success-bg);
      color: var(--success);
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #dc2626;
    }

    /* Footer */
    .report-footer {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 2px solid var(--border);
    }

    .footer-signature {
      margin-bottom: 32px;
    }

    .footer-signature p {
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .signature-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .signature-role {
      color: var(--text-muted);
      font-size: 14px;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
    }

    .footer-logo img {
      height: 40px;
      width: auto;
    }

    .footer-contact {
      text-align: right;
    }

    .footer-contact a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }

    .footer-contact a:hover {
      color: var(--primary-dark);
    }

    .footer-disclaimer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .section {
      animation: fadeInUp 0.5s ease-out forwards;
    }

    .section:nth-child(1) { animation-delay: 0.1s; }
    .section:nth-child(2) { animation-delay: 0.2s; }
    .section:nth-child(3) { animation-delay: 0.3s; }
    .section:nth-child(4) { animation-delay: 0.4s; }

    /* Responsive */
    @media (max-width: 640px) {
      body {
        padding: 16px;
      }

      .hero-header {
        padding: 32px 24px;
      }

      .hero-title {
        font-size: 24px;
      }

      .hero-meta {
        flex-direction: column;
        gap: 16px;
      }

      .content-body {
        padding: 24px;
      }

      .activity-table th,
      .activity-name,
      .activity-value {
        padding: 12px;
      }

      .activity-icon {
        display: none;
      }

      .footer-brand {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }

      .footer-contact {
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Hero Header -->
    <header class="hero-header">
      <div class="hero-content">
        <div class="hero-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          Service Rapport #${inspectieID}
        </div>
        <h1 class="hero-title">${klantnaam}</h1>
        <p class="hero-subtitle">${formatDatum(datum)}</p>
        
        <div class="hero-meta">
          <div class="hero-meta-item">
            <span class="hero-meta-label">Inspecteur</span>
            <span class="hero-meta-value">${inspecteur}</span>
          </div>
          <div class="hero-meta-item">
            <span class="hero-meta-label">Gesproken met</span>
            <span class="hero-meta-value">${contactpersoon || 'Meerdere contactpersonen'}</span>
          </div>
          <div class="hero-meta-item">
            <span class="hero-meta-label">Rapportdatum</span>
            <span class="hero-meta-value">${formatKorteDatum(datum)}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-body">
        
        <p class="greeting">Beste <strong>${contactpersoon || 'relatie'}</strong>,</p>
        
        <div class="intro-card">
          <p>We hebben een <strong>service moment</strong> uitgevoerd bij ${klantnaam}. Hierbij controleren we of:</p>
          <ul>
            <li>Alles goed staat en ons systeem overeenkomt met de werkelijkheid</li>
            <li>Er verbeteringen zijn die we kunnen doorvoeren</li>
          </ul>
        </div>

        <!-- Samenvatting -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="2"/>
                <path d="M9 12h6M9 16h6"/>
              </svg>
            </div>
            <h2 class="section-title">Samenvatting</h2>
          </div>
          
          <table class="activity-table">
            <thead>
              <tr>
                <th>Activiteit</th>
                <th>In orde</th>
                <th>Aandacht nodig</th>
              </tr>
            </thead>
            <tbody>
              ${renderActivityRow('Matten', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>', standaardMatten?.juist, standaardMatten?.verbetering)}
              ${renderActivityRow('Wissers', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>', wissers?.juist, wissers?.verbetering)}
              ${renderActivityRow('Sanitair', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>', sanitair?.juist, sanitair?.verbetering)}
              ${renderActivityRow('Poetsdoeken', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', poetsdoeken?.juist, poetsdoeken?.verbetering)}
              ${renderActivityRow('Bedrijfskleding', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 4 8 2 3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47c.06.37.32.67.67.8L8 12V21a1 1 0 001 1h6a1 1 0 001-1V12l4.47-2.04c.35-.13.61-.43.67-.8l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>', bedrijfskleding?.juist, bedrijfskleding?.verbetering)}
              ${renderActivityRow('Contactpersonen', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>', contactpersonenWijzigingen?.juist, contactpersonenWijzigingen?.verbetering)}
            </tbody>
          </table>
        </div>

        <!-- Wat ging goed -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: var(--success-bg);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <h2 class="section-title">Wat hebben we gecontroleerd</h2>
          </div>
          
          <ul class="check-list">
            <li>
              <span class="check-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <span class="check-text">
                <strong>Ligplaats juist</strong> — <span>Producten staan waar ze horen</span>
              </span>
            </li>
            <li>
              <span class="check-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <span class="check-text">
                <strong>Bezoekritme juist</strong> — <span>Wisselfrequentie komt overeen</span>
              </span>
            </li>
            <li>
              <span class="check-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <span class="check-text">
                <strong>Producten in goede staat</strong> — <span>Geen beschadigingen of vervuiling</span>
              </span>
            </li>
            <li>
              <span class="check-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
              <span class="check-text">
                <strong>Bereikbaarheid</strong> — <span>Contactgegevens zijn actueel</span>
              </span>
            </li>
          </ul>
        </div>

        ${problemen && problemen.length > 0 ? `
        <!-- Aandachtspunten -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: var(--warning-bg);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h2 class="section-title">Aandachtspunten</h2>
          </div>
          
          ${problemen.map(p => `
          <div class="status-card warning">
            <div class="status-card-header">
              <div class="status-card-icon">!</div>
              <h3 class="status-card-title">${p.categorie.replace(/[^\w\s]/g, '').trim()}</h3>
            </div>
            <div class="status-card-content">
              <ul>
                ${p.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
          `).join('')}
        </div>
        ` : `
        <div class="status-card success">
          <div class="status-card-header">
            <div class="status-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 class="status-card-title">Alles ziet er uitstekend uit!</h3>
          </div>
          <div class="status-card-content">
            <p>We hebben geen verbeterpunten geconstateerd. Alles loopt perfect!</p>
          </div>
        </div>
        `}

        ${contactpersonenWijzigingen && contactpersonenWijzigingen.wijzigingen && contactpersonenWijzigingen.wijzigingen.length > 0 ? `
        <!-- Contactgegevens -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h2 class="section-title">Wijzigingen Contactgegevens</h2>
          </div>
          
          <div class="status-card info">
            <div class="status-card-content">
              ${contactpersonenWijzigingen.wijzigingen.map(w => `
                <p style="margin: 12px 0;">
                  <strong>${w.type.replace(/[^\w\s]/g, '').trim()}:</strong> ${w.beschrijving}
                </p>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}

        ${portalUsers && portalUsers.length > 0 ? `
        <!-- Klantenportaal -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon" style="background: var(--primary-light);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h6v6H9z"/>
              </svg>
            </div>
            <h2 class="section-title">Klantenportaal</h2>
          </div>
          
          <div class="status-card info">
            <div class="status-card-content">
              <p>In het klantenportaal kunt u zelf wijzigingen doorvoeren en abonnementen beheren.</p>
              
              <table class="portal-table">
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Status</th>
                    <th>Laatste login</th>
                  </tr>
                </thead>
                <tbody>
                  ${portalUsers.map(user => `
                    <tr>
                      <td>${user.naam}</td>
                      <td>
                        <span class="status-badge ${user.hasAccess ? 'active' : 'inactive'}">
                          ${user.hasAccess ? 'Actief' : 'Geen toegang'}
                        </span>
                      </td>
                      <td>${user.lastLogin || 'Nooit'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <p style="margin-top: 16px; font-size: 14px; color: var(--text-muted);">
                Wilt u toegang aanvragen of uw wachtwoord resetten? Neem contact met ons op.
              </p>
            </div>
          </div>
        </div>
        ` : ''}

        ${algemeenOpmerkingen && Object.keys(algemeenOpmerkingen).length > 0 ? `
        <!-- Opmerkingen -->
        <div class="section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <h2 class="section-title">Opmerkingen</h2>
          </div>
          
          <div class="intro-card">
            ${Object.entries(algemeenOpmerkingen)
              .filter(([key, value]) => value && value.trim())
              .map(([key, value]) => `
                <p style="margin: 12px 0;">
                  <strong>${key.replace(/_/g, ' ')}:</strong><br>
                  ${value}
                </p>
              `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <footer class="report-footer">
          <div class="footer-signature">
            <p>Heeft u vragen over dit rapport of wilt u een wijziging doorgeven? Neem dan gerust contact met ons op.</p>
            <p style="margin-top: 24px;">Met vriendelijke groet,</p>
            <p class="signature-name">${inspecteur}</p>
            <p class="signature-role">Lavans Service Team</p>
          </div>
          
          <div class="footer-brand">
            <div class="footer-logo">
              <img src="https://www.lavans.nl/wp-content/uploads/2021/03/Logo-Lavans-png.png" alt="Lavans">
            </div>
            <div class="footer-contact">
              <p><a href="https://www.lavans.nl">www.lavans.nl</a></p>
              <p><a href="mailto:receptie@lavans.nl">receptie@lavans.nl</a></p>
            </div>
          </div>
          
          <p class="footer-disclaimer">
            Dit is een geautomatiseerd rapport op basis van onze service-inspectie.
          </p>
        </footer>

      </div>
    </main>
  </div>
</body>
</html>
  `;
};

module.exports = async function (context, req) {
  try {
    const inspectieID = parseInt(req.params.inspectieID);
    const token = req.params.token || null;

    if (!inspectieID || isNaN(inspectieID)) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
        body: '<h1>❌ Ongeldige Inspectie ID</h1><p>Gebruik: /api/preview-email/{inspectieID}</p>'
      };
      return;
    }

    const pool = await getPool();

    // Bepaal of token-validatie vereist is (tabel bestaat)
    const tokenTableCheck = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.InspectieRapportTokens','U') IS NOT NULL THEN 1 ELSE 0 END AS HasTokenTable;
    `);
    const hasTokenTable = tokenTableCheck.recordset[0].HasTokenTable === 1;

    if (hasTokenTable) {
      if (!token) {
        context.res = {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
          body: '<h1>Rapportlink ongeldig</h1><p>Deze rapportlink is onvolledig of verlopen. Vraag eventueel een nieuw rapport op.</p>'
        };
        return;
      }

      const tokenResult = await pool.request()
        .input('inspectieID', sql.Int, inspectieID)
        .input('token', sql.UniqueIdentifier, token)
        .query(`
          SELECT Token, GeldigTot, Used
          FROM dbo.InspectieRapportTokens
          WHERE InspectieID = @inspectieID
            AND Token = @token
        `);

      if (tokenResult.recordset.length === 0) {
        context.res = {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
          body: '<h1>Rapportlink ongeldig</h1><p>Deze rapportlink is ongeldig of verlopen. Vraag eventueel een nieuw rapport op.</p>'
        };
        return;
      }

      const tokenRow = tokenResult.recordset[0];
      if (tokenRow.GeldigTot && new Date(tokenRow.GeldigTot) < new Date()) {
        context.res = {
          status: 410,
          headers: { 'Content-Type': 'text/html' },
          body: '<h1>Rapportlink verlopen</h1><p>Deze rapportlink is verlopen. Vraag eventueel een nieuw rapport op.</p>'
        };
        return;
      }

      // Markeer token optioneel als gebruikt (maar laat hergebruik technisch toe)
      await pool.request()
        .input('inspectieID', sql.Int, inspectieID)
        .input('token', sql.UniqueIdentifier, token)
        .query(`
          UPDATE dbo.InspectieRapportTokens
          SET Used = 1
          WHERE InspectieID = @inspectieID AND Token = @token AND Used = 0;
        `);
    }

    // Haal inspectie op
    const inspectieResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT 
          i.InspectieID,
          i.Relatienummer,
          i.Klantnaam,
          i.Contactpersoon,
          i.ContactEmail,
          i.Inspecteur,
          i.InspectieDatum,
          i.InspectieTijd
        FROM dbo.Inspecties i
        WHERE i.InspectieID = @id
      `);

    if (inspectieResult.recordset.length === 0) {
      context.res = {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
        body: `<h1>❌ Inspectie #${inspectieID} niet gevonden</h1><p>Deze inspectie bestaat niet in de database.</p>`
      };
      return;
    }

    const inspectie = inspectieResult.recordset[0];

    // Haal aantallen en status op voor activiteitentabel
    const countsResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.InspectieStandaardMatten WHERE InspectieID = @id) AS totaalMatten,
          (SELECT COUNT(*) FROM dbo.InspectieStandaardMatten WHERE InspectieID = @id AND Aanwezig = 1 AND SchoonOnbeschadigd = 1) AS mattenJuist,
          (SELECT COUNT(*) FROM dbo.InspectieStandaardMatten WHERE InspectieID = @id AND (Aanwezig = 0 OR SchoonOnbeschadigd = 0 OR Vuilgraad IN ('Sterk vervuild', 'Licht vervuild'))) AS mattenVerbetering,
          (SELECT COUNT(*) FROM dbo.InspectieLogomatten WHERE InspectieID = @id) AS logomatten,
          (SELECT COUNT(*) FROM dbo.InspectieWissers WHERE InspectieID = @id) AS totaalWissers,
          (SELECT COUNT(*) FROM dbo.InspectieToebehoren WHERE InspectieID = @id) AS toebehoren
      `);

    const counts = countsResult.recordset[0];

    // Maak activiteiten object met juist/verbetering
    const standaardMatten = {
      juist: counts.mattenJuist || 0,
      verbetering: counts.mattenVerbetering || 0
    };

    const wissers = {
      juist: counts.totaalWissers || 0,
      verbetering: 0
    };

    // Haal problemen op en groepeer per categorie
    const problemenMattenResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT 
          'De mat [' + ISNULL(Afdeling, 'onbekend') + ' & ' + ISNULL(Ligplaats, 'onbekend') + '] ' + 
          CASE 
            WHEN Aanwezig = 0 THEN 'was niet aanwezig. We nemen contact op om dit te bespreken.'
            WHEN SchoonOnbeschadigd = 0 THEN 'was beschadigd. Deze willen we gaan vervangen.'
            WHEN Vuilgraad = 'Sterk vervuild' THEN 'was erg sterk vervuild. Overweeg de wisselfrequentie aan te passen.'
            WHEN Vuilgraad = 'Licht vervuild' THEN 'was licht vervuild.'
          END AS Probleem
        FROM dbo.InspectieStandaardMatten
        WHERE InspectieID = @id
          AND (Aanwezig = 0 OR SchoonOnbeschadigd = 0 OR Vuilgraad IN ('Sterk vervuild', 'Licht vervuild'))
        
        UNION ALL
        
        SELECT 
          'De logo mat op [' + ISNULL(Afdeling, 'onbekend') + ' & ' + ISNULL(Ligplaats, 'onbekend') + '] ' +
          CASE 
            WHEN Aanwezig = 0 THEN 'was niet aanwezig.'
            WHEN SchoonOnbeschadigd = 0 THEN 'is versleten. Deze willen we gaan vervangen voor een nieuw exemplaar.'
            WHEN Vuilgraad = 'Sterk vervuild' THEN 'was sterk vervuild.'
          END AS Probleem
        FROM dbo.InspectieLogomatten
        WHERE InspectieID = @id
          AND (Aanwezig = 0 OR SchoonOnbeschadigd = 0 OR Vuilgraad IN ('Sterk vervuild', 'Licht vervuild'))
      `);

    const problemen = [];
    
    const mattenProblemen = problemenMattenResult.recordset.map(r => r.Probleem).filter(p => p);
    if (mattenProblemen.length > 0) {
      problemen.push({
        categorie: '🧹 Matten',
        items: mattenProblemen
      });
    }

    // Haal algemene opmerkingen op
    const algemeenResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT VeldNaam, VeldWaarde
        FROM dbo.InspectieAlgemeen
        WHERE InspectieID = @id
      `);

    const algemeenOpmerkingen = {};
    algemeenResult.recordset.forEach(row => {
      algemeenOpmerkingen[row.VeldNaam] = row.VeldWaarde;
    });

    // Haal contactpersonen wijzigingen op (indien beschikbaar)
    let contactpersonenWijzigingen = null;
    try {
      const wijzigingenResult = await pool.request()
        .input('id', sql.Int, inspectieID)
        .query(`
          SELECT 
            COUNT(*) as totaal,
            SUM(CASE WHEN actie = 'bijgewerkt' THEN 1 ELSE 0 END) as bijgewerkt,
            SUM(CASE WHEN actie = 'nieuw_routecontact' THEN 1 ELSE 0 END) as routecontact,
            SUM(CASE WHEN actie = 'nieuw' THEN 1 ELSE 0 END) as nieuw,
            SUM(CASE WHEN actie = 'afgemeld' THEN 1 ELSE 0 END) as afgemeld
          FROM dbo.contactpersonen_wijzigingen
          WHERE inspectie_id = @id
        `);

      if (wijzigingenResult.recordset.length > 0 && wijzigingenResult.recordset[0].totaal > 0) {
        const stats = wijzigingenResult.recordset[0];
        const wijzigingen = [];
        
        if (stats.bijgewerkt > 0) {
          wijzigingen.push({
            type: '✏️ Bijgewerkt',
            beschrijving: `We hebben ${stats.bijgewerkt} contactgegevens bijgewerkt, nu kunnen we jullie weer goed bereiken`
          });
        }
        if (stats.routecontact > 0) {
          wijzigingen.push({
            type: '📍 Routecontact',
            beschrijving: `We hebben ${stats.routecontact} nieuwe route contacten, dit zijn de mensen die we op de hoogte brengen als er iets in onze planning wijzigt`
          });
        }
        if (stats.nieuw > 0) {
          wijzigingen.push({
            type: '➕ Nieuw',
            beschrijving: `We hebben ${stats.nieuw} nieuwe contactpersonen toegevoegd`
          });
        }
        if (stats.afgemeld > 0) {
          wijzigingen.push({
            type: '➖ Afgemeld',
            beschrijving: `We hebben ${stats.afgemeld} contactpersonen afgemeld, omdat die niet meer bij jullie werken`
          });
        }

        if (wijzigingen.length > 0) {
          contactpersonenWijzigingen = {
            juist: stats.totaal - (stats.nieuw + stats.bijgewerkt),
            verbetering: stats.nieuw + stats.bijgewerkt,
            wijzigingen: wijzigingen
          };
        }
      }
    } catch (err) {
      console.log('Contactpersonen wijzigingen tabel niet gevonden:', err.message);
    }

    // Haal portal users op (indien beschikbaar)
    let portalUsers = [];
    try {
      const portalResult = await pool.request()
        .input('rel', sql.NVarChar(50), inspectie.Relatienummer)
        .query(`
          SELECT 
            naam,
            email,
            CASE WHEN portal_toegang = 1 THEN 1 ELSE 0 END as hasAccess,
            CONVERT(VARCHAR, laatste_inlog, 105) as lastLogin
          FROM dbo.Contactpersonen
          WHERE UPPER(REPLACE(REPLACE(relatienummer, ' ', ''), '[', '')) = UPPER(REPLACE(REPLACE(@rel, ' ', ''), '[', ''))
            AND nog_in_dienst = 1
            AND email IS NOT NULL
            AND email <> ''
          ORDER BY routecontact DESC, beslisser DESC
        `);

      if (portalResult.recordset.length > 0) {
        portalUsers = portalResult.recordset.map(user => ({
          naam: user.naam,
          hasAccess: user.hasAccess === 1,
          lastLogin: user.lastLogin || 'Nooit'
        }));
      }
    } catch (err) {
      console.log('Portal users info niet gevonden:', err.message);
    }

    // Genereer email HTML
    const emailData = {
      inspectieID: inspectie.InspectieID,
      klantnaam: inspectie.Klantnaam,
      contactpersoon: inspectie.Contactpersoon,
      inspecteur: inspectie.Inspecteur,
      datum: inspectie.InspectieDatum,
      tijd: inspectie.InspectieTijd,
      standaardMatten: standaardMatten,
      logomatten: counts.logomatten,
      wissers: wissers,
      toebehoren: counts.toebehoren,
      sanitair: null,
      poetsdoeken: null,
      bedrijfskleding: null,
      problemen,
      algemeenOpmerkingen,
      contactpersonenWijzigingen: contactpersonenWijzigingen,
      portalUsers: portalUsers
    };

    const htmlContent = generateEmailTemplate(emailData);

    // Return als HTML zodat je het in browser kunt zien
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: htmlContent
    };

  } catch (error) {
    context.log.error('Preview Email API fout:', error);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>❌ Server Fout</h1><p>${error.message}</p>`
    };
  }
};

