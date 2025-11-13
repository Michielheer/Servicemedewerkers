const { getPool, sql } = require('../shared/db');

// Email service (SendGrid of fallback naar console.log voor development)
const sendEmail = async (to, subject, htmlContent) => {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'inspectie@lavans.nl';
  
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY niet ingesteld. Email wordt NIET verzonden.');
    console.log('📧 Email preview:', { to, subject, htmlContent: htmlContent.substring(0, 200) });
    return { success: false, message: 'SendGrid niet geconfigureerd', preview: true };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject
        }],
        from: { 
          email: FROM_EMAIL,
          name: 'Lavans Service'
        },
        content: [{
          type: 'text/html',
          value: htmlContent
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid fout: ${response.status} - ${error}`);
    }

    return { success: true, message: 'Email verzonden' };
  } catch (error) {
    console.error('Email versturen mislukt:', error);
    throw error;
  }
};

// Genereer HTML email template
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
    problemen
  } = inspectieData;

  const formatDatum = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
      max-width: 650px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #007bff;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    h1 {
      color: #007bff;
      margin: 0;
      font-size: 24px;
    }
    .meta {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }
    .meta p {
      margin: 5px 0;
    }
    .section {
      margin: 25px 0;
    }
    .section h2 {
      color: #495057;
      font-size: 18px;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
    }
    .stat-box {
      background: #e7f3ff;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      flex: 1;
      min-width: 120px;
    }
    .stat-number {
      font-size: 28px;
      font-weight: bold;
      color: #007bff;
      display: block;
    }
    .stat-label {
      font-size: 13px;
      color: #666;
      display: block;
      margin-top: 5px;
    }
    .problem-list {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .problem-list ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .problem-list li {
      margin: 8px 0;
    }
    .success-message {
      background: #d4edda;
      border-left: 4px solid #28a745;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      font-size: 13px;
      color: #6c757d;
      text-align: center;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 25px;
      text-decoration: none;
      border-radius: 5px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🔍 Service Inspectie Rapport</h1>
    </div>
    
    <p>Beste ${contactpersoon || 'relatie'},</p>
    
    <p>We hebben vandaag een <strong>service-inspectie</strong> uitgevoerd bij ${klantnaam}. 
    Hieronder vindt u een overzicht van onze bevindingen.</p>
    
    <div class="meta">
      <p><strong>📋 Inspectie #${inspectieID}</strong></p>
      <p><strong>📅 Datum:</strong> ${formatDatum(datum)} om ${tijd || 'onbekend'}</p>
      <p><strong>👤 Inspecteur:</strong> ${inspecteur}</p>
    </div>

    <div class="section">
      <h2>📊 Inspectie Resultaten</h2>
      <div class="stats">
        <div class="stat-box">
          <span class="stat-number">${standaardMatten || 0}</span>
          <span class="stat-label">Standaard Matten</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${logomatten || 0}</span>
          <span class="stat-label">Logomatten</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${wissers || 0}</span>
          <span class="stat-label">Wissers</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${toebehoren || 0}</span>
          <span class="stat-label">Toebehoren</span>
        </div>
      </div>
    </div>

    ${problemen && problemen.length > 0 ? `
    <div class="section">
      <h2>⚠️ Aandachtspunten</h2>
      <div class="problem-list">
        <p><strong>Tijdens de inspectie zijn de volgende punten geconstateerd:</strong></p>
        <ul>
          ${problemen.map(p => `<li>${p}</li>`).join('')}
        </ul>
        <p style="margin-top: 15px;"><em>Onze klantenservice neemt contact met u op voor eventuele vervolgacties.</em></p>
      </div>
    </div>
    ` : `
    <div class="success-message">
      <p><strong>✅ Alles in orde!</strong></p>
      <p>Tijdens de inspectie zijn geen bijzonderheden geconstateerd. Alle materialen zijn in goede staat.</p>
    </div>
    `}

    <div class="section">
      <p>Heeft u vragen over dit rapport of wilt u een wijziging doorgeven? Neem dan contact met ons op.</p>
      <p>Met vriendelijke groet,<br>
      <strong>${inspecteur}</strong><br>
      Lavans Service Team</p>
    </div>

    <div class="footer">
      <p>Lavans B.V. | www.lavans.nl | info@lavans.nl</p>
      <p style="font-size: 11px; margin-top: 10px;">
        Dit is een geautomatiseerd rapport. Reacties op deze email worden niet verwerkt.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = async function (context, req) {
  try {
    const { inspectieID } = req.body;

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

    // Haal aantallen en problemen op
    const countsResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.InspectieStandaardMatten WHERE InspectieID = @id) AS standaardMatten,
          (SELECT COUNT(*) FROM dbo.InspectieLogomatten WHERE InspectieID = @id) AS logomatten,
          (SELECT COUNT(*) FROM dbo.InspectieWissers WHERE InspectieID = @id) AS wissers,
          (SELECT COUNT(*) FROM dbo.InspectieToebehoren WHERE InspectieID = @id) AS toebehoren
      `);

    const counts = countsResult.recordset[0];

    // Haal problemen op
    const problemenResult = await pool.request()
      .input('id', sql.Int, inspectieID)
      .query(`
        SELECT 'Mat ' + MatType + ' in ' + ISNULL(Afdeling, 'onbekende afdeling') + ': ' + 
               CASE 
                 WHEN Aanwezig = 0 THEN 'niet aanwezig'
                 WHEN SchoonOnbeschadigd = 0 THEN 'beschadigd of vuil'
                 WHEN Vuilgraad = 'Sterk vervuild' THEN 'sterk vervuild'
                 WHEN Vuilgraad = 'Licht vervuild' THEN 'licht vervuild'
               END AS Probleem
        FROM dbo.InspectieStandaardMatten
        WHERE InspectieID = @id
          AND (Aanwezig = 0 OR SchoonOnbeschadigd = 0 OR Vuilgraad IN ('Sterk vervuild', 'Licht vervuild'))
        
        UNION ALL
        
        SELECT 'Logomat ' + MatType + ' in ' + ISNULL(Afdeling, 'onbekende afdeling') + ': ' + 
               CASE 
                 WHEN Aanwezig = 0 THEN 'niet aanwezig'
                 WHEN SchoonOnbeschadigd = 0 THEN 'beschadigd of vuil'
                 WHEN Vuilgraad = 'Sterk vervuild' THEN 'sterk vervuild'
                 WHEN Vuilgraad = 'Licht vervuild' THEN 'licht vervuild'
               END AS Probleem
        FROM dbo.InspectieLogomatten
        WHERE InspectieID = @id
          AND (Aanwezig = 0 OR SchoonOnbeschadigd = 0 OR Vuilgraad IN ('Sterk vervuild', 'Licht vervuild'))
      `);

    const problemen = problemenResult.recordset.map(r => r.Probleem);

    // Genereer email
    const emailData = {
      inspectieID: inspectie.InspectieID,
      klantnaam: inspectie.Klantnaam,
      contactpersoon: inspectie.Contactpersoon,
      inspecteur: inspectie.Inspecteur,
      datum: inspectie.InspectieDatum,
      tijd: inspectie.InspectieTijd,
      standaardMatten: counts.standaardMatten,
      logomatten: counts.logomatten,
      wissers: counts.wissers,
      toebehoren: counts.toebehoren,
      problemen
    };

    const htmlContent = generateEmailTemplate(emailData);
    const subject = `Service Inspectie Rapport - ${inspectie.Klantnaam} (${new Date(inspectie.InspectieDatum).toLocaleDateString('nl-NL')})`;

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
          ? `Email verzonden naar ${recipientEmail}` 
          : 'Email preview gegenereerd (SendGrid niet geconfigureerd)',
        recipient: recipientEmail,
        preview: emailResult.preview || false
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

