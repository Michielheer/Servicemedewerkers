const { getPool, sql } = require('../shared/db');
const nodemailer = require('nodemailer');

// Email service via Brevo SMTP
const sendEmail = async (to, subject, htmlContent) => {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'inspectie@lavans.nl';
  const FROM_NAME = process.env.FROM_NAME || 'Lavans Service';
  
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP credentials niet ingesteld. Email wordt NIET verzonden.');
    console.log('📧 Email preview:', { to, subject, htmlContent: htmlContent.substring(0, 200) });
    return { success: false, message: 'SMTP niet geconfigureerd', preview: true };
  }

  try {
    // Maak SMTP transporter aan
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // true voor 465, false voor andere poorten
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    // Verstuur email
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: htmlContent
    });

    console.log('Email verzonden:', info.messageId);
    return { 
      success: true, 
      message: 'Email verzonden',
      messageId: info.messageId 
    };
  } catch (error) {
    console.error('Email versturen mislukt:', error);
    throw error;
  }
};

// Genereer KORTE notificatie email met link naar webpagina
const generateShortEmailTemplate = (inspectieData) => {
  const {
    inspectieID,
    klantnaam,
    contactpersoon,
    inspecteur,
    datum,
    standaardMatten,
    wissers,
    problemen
  } = inspectieData;

  const formatDatum = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const totaalGeinspecteerd = (standaardMatten?.juist || 0) + (standaardMatten?.verbetering || 0) + (wissers?.juist || 0) + (wissers?.verbetering || 0);
  const aantalProblemen = (problemen && problemen.length > 0) ? problemen.reduce((sum, p) => sum + p.items.length, 0) : 0;

  const rapportUrl = `https://agreeable-bush-0adda8c03.3.azurestaticapps.net/rapport/${inspectieID}`;

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .header-logo {
      max-height: 60px;
      margin-bottom: 30px;
    }
    h1 {
      color: #007bff;
      font-size: 28px;
      margin: 0 0 15px 0;
    }
    .intro {
      font-size: 16px;
      color: #666;
      margin: 20px 0;
    }
    .highlight-box {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 8px;
      margin: 30px 0;
      border-left: 4px solid #007bff;
    }
    .highlight-box p {
      margin: 10px 0;
      font-size: 15px;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 25px 0;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 36px;
      font-weight: bold;
      color: #007bff;
      display: block;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 50px;
      font-size: 18px;
      font-weight: bold;
      margin: 30px 0;
      box-shadow: 0 4px 15px rgba(0,123,255,0.3);
      transition: all 0.3s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,123,255,0.4);
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      margin: 10px 0;
    }
    .status-success {
      background: #d4edda;
      color: #155724;
    }
    .status-warning {
      background: #fff3cd;
      color: #856404;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      font-size: 13px;
      color: #6c757d;
    }
    .signature {
      margin-top: 30px;
      text-align: left;
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <img src="https://www.lavans.nl/wp-content/uploads/2021/03/Logo-Lavans-png.png" alt="Lavans" class="header-logo">
    
    <h1>✅ Service Bezoek Afgerond</h1>
    
    <p class="intro">Beste ${contactpersoon || 'relatie'},</p>
    
    <p class="intro">We hebben een service bezoek uitgevoerd bij <strong>${klantnaam}</strong>.</p>
    
    <div class="highlight-box">
      <p><strong>📅 Datum:</strong> ${formatDatum(datum)}</p>
      <p><strong>👤 Inspecteur:</strong> ${inspecteur}</p>
      
      ${aantalProblemen === 0 ? `
        <div class="status-badge status-success">
          🎉 Alles in orde!
        </div>
      ` : `
        <div class="status-badge status-warning">
          ⚠️ ${aantalProblemen} aandachtspunt${aantalProblemen > 1 ? 'en' : ''}
        </div>
      `}
    </div>
    
    <div class="stats">
      <div class="stat">
        <span class="stat-number">${totaalGeinspecteerd}</span>
        <span class="stat-label">Items gecontroleerd</span>
      </div>
      <div class="stat">
        <span class="stat-number">${aantalProblemen}</span>
        <span class="stat-label">Aandachtspunten</span>
      </div>
    </div>
    
    <p style="font-size: 16px; margin: 30px 0 20px 0;">
      Wil je het <strong>volledige rapport</strong> bekijken met alle details?
    </p>
    
    <a href="${rapportUrl}" class="cta-button">
      📄 Bekijk Volledig Rapport
    </a>
    
    <p style="font-size: 13px; color: #999; margin-top: 15px;">
      Of kopieer deze link: <br>
      <a href="${rapportUrl}" style="color: #007bff; word-break: break-all;">${rapportUrl}</a>
    </p>
    
    <div class="signature">
      <p>Vragen? Neem gerust contact met ons op.</p>
      <p style="margin-top: 20px;">
        Met vriendelijke groet,<br>
        <strong style="font-size: 16px;">${inspecteur}</strong><br>
        <span style="color: #6c757d;">Lavans Service Team</span>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Lavans B.V.</strong></p>
      <p>🌐 <a href="https://www.lavans.nl" style="color: #007bff; text-decoration: none;">www.lavans.nl</a> | 
         ✉️ <a href="mailto:info@lavans.nl" style="color: #007bff; text-decoration: none;">info@lavans.nl</a></p>
      <p style="font-size: 11px; margin-top: 15px; color: #999;">
        Dit is een geautomatiseerde notificatie van uw service bezoek.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

// Genereer VOLLEDIGE email template (bestaande)
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

  // Helper functie voor activiteitentabel
  const renderActivityRow = (label, juist, verbetering) => {
    const juistVal = juist !== undefined && juist !== null ? juist : 'n.v.t';
    const verbeteringVal = verbetering !== undefined && verbetering !== null ? verbetering : 'n.v.t';
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${label}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #28a745;">${juistVal}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: bold; color: #ffc107;">${verbeteringVal}</td>
      </tr>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background: white;
      border-radius: 8px;
      padding: 35px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #007bff;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header-logo {
      max-height: 50px;
      width: auto;
    }
    h1 {
      color: #007bff;
      margin: 0;
      font-size: 24px;
      flex: 1;
    }
    .intro-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #495057;
      font-size: 20px;
      border-bottom: 2px solid #007bff;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .meta-box {
      background: #e7f3ff;
      padding: 15px 20px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .meta-box p {
      margin: 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white;
      border: 1px solid #dee2e6;
    }
    th {
      background: #007bff;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
    }
    .info-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px 20px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .info-box h3 {
      margin-top: 0;
      color: #856404;
      font-size: 16px;
    }
    .info-box ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .info-box li {
      margin: 8px 0;
    }
    .success-box {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px 20px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .tip-box {
      background: #d1ecf1;
      border-left: 4px solid #17a2b8;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .tip-box h3 {
      margin-top: 0;
      color: #0c5460;
      font-size: 18px;
    }
    .portal-table {
      margin-top: 15px;
      font-size: 14px;
    }
    .feedback-section {
      text-align: center;
      margin: 30px 0;
      padding: 25px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .feedback-section h3 {
      color: #495057;
      margin-bottom: 15px;
    }
    .emoji-buttons {
      font-size: 32px;
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 15px;
    }
    .emoji-link {
      text-decoration: none;
      transition: transform 0.2s;
      display: inline-block;
    }
    .emoji-link:hover {
      transform: scale(1.2);
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      font-size: 13px;
      color: #6c757d;
      text-align: center;
    }
    .highlight-text {
      background: #fff3cd;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Service Rapport</h1>
      <img src="https://www.lavans.nl/wp-content/uploads/2021/03/Logo-Lavans-png.png" alt="Lavans" class="header-logo">
    </div>
    
    <p>Beste ${contactpersoon || 'relatie'},</p>
    
    <div class="intro-section">
      <p style="margin: 0 0 10px 0;">We hebben een <strong>service moment</strong> gedaan bij ${klantnaam}.</p>
      <p style="margin: 5px 0;">Hierin checken we of:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Alles goed staat en ons systeem overeenkomt met de werkelijkheid</li>
        <li>Of we nog verbeteringen zien die we kunnen doorgeven</li>
      </ul>
    </div>

    <div class="section">
      <h2>📋 Wat hebben we gedaan?</h2>
      <div class="meta-box">
        <p><strong>Datum:</strong> ${formatDatum(datum)}</p>
        <p><strong>Inspecteur:</strong> ${inspecteur}</p>
        <p><strong>Gesproken met:</strong> ${contactpersoon || 'meerdere contactpersonen'}</p>
      </div>
    </div>

    <div class="section">
      <h2>Samenvattend</h2>
      <table>
        <thead>
          <tr>
            <th>Activiteit</th>
            <th style="text-align: center;">✅ Juist</th>
            <th style="text-align: center;">⚠️ Verbetering mogelijk</th>
          </tr>
        </thead>
        <tbody>
          ${renderActivityRow('Matten', standaardMatten?.juist, standaardMatten?.verbetering)}
          ${renderActivityRow('Wissers', wissers?.juist, wissers?.verbetering)}
          ${renderActivityRow('Sanitair', sanitair?.juist, sanitair?.verbetering)}
          ${renderActivityRow('Poetsdoeken', poetsdoeken?.juist, poetsdoeken?.verbetering)}
          ${renderActivityRow('Bedrijfskleding', bedrijfskleding?.juist, bedrijfskleding?.verbetering)}
          ${renderActivityRow('Contactpersonen', contactpersonenWijzigingen?.juist, contactpersonenWijzigingen?.verbetering)}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3 style="color: #28a745; font-size: 16px;">✅ De zaken die we gecontroleerd hebben en juist zijn:</h3>
      <ul style="line-height: 1.8;">
        <li><strong>Ligplaats juist</strong> - Producten staan waar ze horen</li>
        <li><strong>Bezoekritme juist</strong> - Wisselfrequentie komt overeen</li>
        <li><strong>Producten in goede staat</strong> - Geen beschadigingen of vervuiling</li>
        <li><strong>We kunnen jullie bereiken</strong> - Contactgegevens zijn actueel</li>
      </ul>
    </div>

    ${problemen && problemen.length > 0 ? `
    <div class="section">
      <h2>⚠️ Wat is ons opgevallen?</h2>
      <p>Er konden zaken ook beter, dit is ons opgevallen:</p>
      
      ${problemen.map(p => `
        <div class="info-box">
          <h3>${p.categorie}</h3>
          <ul>
            ${p.items.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="success-box">
      <p style="margin: 0;"><strong>🎉 Alles ziet er uitstekend uit!</strong></p>
      <p style="margin: 10px 0 0 0;">We hebben geen verbeterpunten geconstateerd. Alles loopt perfect!</p>
    </div>
    `}

    ${contactpersonenWijzigingen && contactpersonenWijzigingen.wijzigingen && contactpersonenWijzigingen.wijzigingen.length > 0 ? `
    <div class="section">
      <h2>👥 Contactgegevens</h2>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff;">
        ${contactpersonenWijzigingen.wijzigingen.map(w => `
          <p style="margin: 10px 0;">
            <strong>${w.type}:</strong> ${w.beschrijving}
          </p>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${portalUsers && portalUsers.length > 0 ? `
    <div class="tip-box">
      <h3>💡 Pro tip: Klantenportaal</h3>
      <p>We zien dat niet iedereen toegang heeft tot het klantenportaal, of al lang niet meer heeft ingelogd. 
      In het klantenportaal kan je zelf wijzigingen doorvoeren en abonnementen beheren.</p>
      
      <table class="portal-table">
        <thead>
          <tr>
            <th>Naam</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Laatste inlogpoging</th>
          </tr>
        </thead>
        <tbody>
          ${portalUsers.map(user => `
            <tr>
              <td>${user.naam}</td>
              <td style="text-align: center;">
                ${user.hasAccess ? '✅ Toegang' : '❌ Geen toegang'}
              </td>
              <td style="text-align: center;">${user.lastLogin || 'Nooit'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p style="margin-top: 15px; font-size: 14px;">
        <em>Wil je toegang aanvragen of je wachtwoord resetten? Neem contact met ons op!</em>
      </p>
    </div>
    ` : ''}

    ${algemeenOpmerkingen && Object.keys(algemeenOpmerkingen).length > 0 ? `
    <div class="section">
      <h2>📝 Algemene Opmerkingen</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #6c757d;">
        ${Object.entries(algemeenOpmerkingen)
          .filter(([key, value]) => value && value.trim())
          .map(([key, value]) => `
            <p style="margin: 10px 0;">
              <strong>${key.replace(/_/g, ' ')}:</strong><br>
              ${value}
            </p>
          `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="feedback-section">
      <h3>Help ons verbeteren!</h3>
      <p>Wat vond je van deze mail?</p>
      <div class="emoji-buttons">
        <a href="mailto:feedback@lavans.nl?subject=Feedback Service Rapport - Zeer tevreden&body=Inspectie ID: ${inspectieID}%0D%0A%0D%0AIk ben zeer tevreden!" class="emoji-link" title="Zeer tevreden">😍</a>
        <a href="mailto:feedback@lavans.nl?subject=Feedback Service Rapport - Tevreden&body=Inspectie ID: ${inspectieID}%0D%0A%0D%0AIk ben tevreden!" class="emoji-link" title="Tevreden">🙂</a>
        <a href="mailto:feedback@lavans.nl?subject=Feedback Service Rapport - Neutraal&body=Inspectie ID: ${inspectieID}%0D%0A%0D%0AIk sta neutraal." class="emoji-link" title="Neutraal">😐</a>
        <a href="mailto:feedback@lavans.nl?subject=Feedback Service Rapport - Ontevreden&body=Inspectie ID: ${inspectieID}%0D%0A%0D%0AIk ben ontevreden omdat..." class="emoji-link" title="Ontevreden">🙁</a>
      </div>
    </div>

    <div class="section">
      <p>Heeft u vragen over dit rapport of wilt u een wijziging doorgeven? Neem dan gerust contact met ons op.</p>
      <p style="margin-top: 20px;">Met vriendelijke groet,<br>
      <strong style="font-size: 16px;">${inspecteur}</strong><br>
      <span style="color: #6c757d;">Lavans Service Team</span></p>
    </div>

    <div class="footer">
      <p><strong>Lavans B.V.</strong></p>
      <p>🌐 <a href="https://www.lavans.nl" style="color: #007bff; text-decoration: none;">www.lavans.nl</a> | 
         ✉️ <a href="mailto:info@lavans.nl" style="color: #007bff; text-decoration: none;">info@lavans.nl</a></p>
      <p style="font-size: 11px; margin-top: 15px; color: #999;">
        Dit is een geautomatiseerd rapport op basis van onze service-inspectie.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = async function (context, req) {
  try {
    const { inspectieID, emailType = 'full' } = req.body;  // 'short' of 'full'

    if (!inspectieID) {
      context.res = {
        status: 400,
        body: { error: 'InspectieID is verplicht.' }
      };
      return;
    }

    const pool = await getPool();

    // Haal inspectie + contactpersoon op
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
        body: { error: 'Inspectie niet gevonden.' }
      };
      return;
    }

    const inspectie = inspectieResult.recordset[0];

    // Haal routecontact email op (als ContactEmail leeg is)
    let recipientEmail = inspectie.ContactEmail;
    
    if (!recipientEmail) {
      const contactResult = await pool.request()
        .input('rel', sql.NVarChar(50), inspectie.Relatienummer)
        .query(`
          SELECT TOP 1 email
          FROM dbo.Contactpersonen WITH (NOLOCK)
          WHERE UPPER(REPLACE(REPLACE(relatienummer, ' ', ''), '[', '')) = UPPER(REPLACE(REPLACE(@rel, ' ', ''), '[', ''))
            AND routecontact = 1
            AND nog_in_dienst = 1
            AND email IS NOT NULL
            AND email <> ''
          ORDER BY routecontact DESC, beslisser DESC
        `);

      if (contactResult.recordset.length > 0) {
        recipientEmail = contactResult.recordset[0].email;
      }
    }

    if (!recipientEmail) {
      context.res = {
        status: 400,
        body: { error: 'Geen geldig email adres gevonden voor routecontact.' }
      };
      return;
    }

    // TEST MODE: Override recipient voor testdoeleinden
    const TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
    const TEST_EMAIL = process.env.EMAIL_TEST_RECIPIENT || 'michiel@datametrics.nl';
    
    if (TEST_MODE) {
      console.log(`🧪 TEST MODE: Email wordt verzonden naar ${TEST_EMAIL} in plaats van ${recipientEmail}`);
      recipientEmail = TEST_EMAIL;
    }

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

    // Voor wissers hebben we nu nog geen detailstatus, dus alles telt als "juist"
    const wissers = {
      juist: counts.totaalWissers || 0,
      verbetering: 0
    };

    // Haal problemen op en groepeer per categorie (nu alleen matten / logomatten)
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
      console.log('Contactpersonen wijzigingen tabel niet gevonden of fout:', err.message);
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

    // Genereer email
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
      sanitair: null, // Kan later worden uitgebreid
      poetsdoeken: null, // Kan later worden uitgebreid
      bedrijfskleding: null, // Kan later worden uitgebreid
      problemen,
      algemeenOpmerkingen,
      contactpersonenWijzigingen: contactpersonenWijzigingen,
      portalUsers: portalUsers
    };

    // Kies template op basis van type
    let htmlContent;
    let subject;
    
    if (emailType === 'short') {
      htmlContent = generateShortEmailTemplate(emailData);
      subject = `✅ Service Bezoek Afgerond - ${inspectie.Klantnaam}`;
    } else {
      htmlContent = generateEmailTemplate(emailData);
      subject = `Service Rapport - ${inspectie.Klantnaam} (${new Date(inspectie.InspectieDatum).toLocaleDateString('nl-NL')})`;
    }

    // Verstuur email
    const emailResult = await sendEmail(recipientEmail, subject, htmlContent);

    // Log email verzending
    await pool.request()
      .input('inspectieID', sql.Int, inspectieID)
      .input('recipient', sql.NVarChar(200), recipientEmail)
      .input('subject', sql.NVarChar(500), subject)
      .input('success', sql.Bit, emailResult.success ? 1 : 0)
      .query(`
        INSERT INTO dbo.ApiLogs (Endpoint, Method, StatusCode, RequestBody, ResponseBody, InspectieID)
        VALUES ('/api/send-inspectie-email', 'POST', ${emailResult.success ? 200 : 500}, 
                @recipient, @subject, @inspectieID)
      `);

    context.res = {
      status: 200,
      body: {
        success: emailResult.success,
        message: emailResult.success 
          ? `${emailType === 'short' ? 'Korte notificatie' : 'Volledig rapport'} email succesvol verzonden!` 
          : 'Email preview gegenereerd (SMTP niet geconfigureerd)',
        recipient: recipientEmail,
        emailType: emailType,
        rapportUrl: emailType === 'short' ? `https://agreeable-bush-0adda8c03.3.azurestaticapps.net/rapport/${inspectieID}` : null,
        preview: emailResult.preview || false,
        messageId: emailResult.messageId || null
      }
    };

  } catch (error) {
    context.log.error('Send Email API fout:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Email kon niet worden verzonden.',
        details: error.message
      }
    };
  }
};

