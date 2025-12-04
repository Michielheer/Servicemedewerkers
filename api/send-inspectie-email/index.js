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

// Genereer KORTE notificatie email met link naar webpagina (professioneel, zonder emoji)
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

  const totaalGeinspecteerd =
    (standaardMatten?.juist || 0) +
    (standaardMatten?.verbetering || 0) +
    (wissers?.juist || 0) +
    (wissers?.verbetering || 0);
  const aantalProblemen = (problemen && problemen.length > 0) ? problemen.reduce((sum, p) => sum + p.items.length, 0) : 0;

  const rapportUrl = `https://agreeable-bush-0adda8c03.3.azurestaticapps.net/rapport/${inspectieID}`;

  // Eenvoudige helper voor samenvattende tabel
  const renderActivityRow = (label, data) => {
    const juistVal = data && typeof data.juist === 'number' ? data.juist : 'n.v.t';
    const verbeteringVal = data && typeof data.verbetering === 'number' ? data.verbetering : 'n.v.t';

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef;">${label}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${juistVal}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e9ecef; text-align: center;">${verbeteringVal}</td>
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
      font-size: 24px;
      margin: 0 0 8px 0;
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
    .summary-section {
      text-align: left;
      margin: 25px 0 0 0;
    }
    .summary-section h2 {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #495057;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    .summary-table th {
      background: #f1f3f5;
      padding: 10px;
      text-align: left;
      font-size: 13px;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
    }
    .summary-table td {
      font-size: 13px;
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
    
    <h1>Servicebezoek afgerond</h1>
    
    <p class="intro">Beste ${contactpersoon || 'relatie'},</p>
    
    <p class="intro">We hebben een service bezoek uitgevoerd bij <strong>${klantnaam}</strong>.</p>
    
    <div class="highlight-box">
      <p><strong>Datum:</strong> ${formatDatum(datum)}</p>
      <p><strong>Inspecteur:</strong> ${inspecteur}</p>
      
      ${aantalProblemen === 0 ? `
        <div class="status-badge status-success">
          Alles in orde
        </div>
      ` : `
        <div class="status-badge status-warning">
          ${aantalProblemen} aandachtspunt${aantalProblemen > 1 ? 'en' : ''} geconstateerd
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

    <div class="summary-section">
      <h2>Samenvattend</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>Activiteit</th>
            <th style="text-align: center;">Juist</th>
            <th style="text-align: center;">Verbetering mogelijk</th>
          </tr>
        </thead>
        <tbody>
          ${renderActivityRow('Matten', standaardMatten)}
          ${renderActivityRow('Wissers', wissers)}
        </tbody>
      </table>
    </div>

    <p style="font-size: 15px; margin: 25px 0 18px 0;">
      Wilt u het volledige servicerapport met alle details bekijken?
    </p>
    
    <a href="${rapportUrl}" class="cta-button">
      Volledig rapport bekijken
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

// Volledige email-template gebruikt nu dezelfde compacte layout als de korte versie
const generateEmailTemplate = (inspectieData) => {
  return generateShortEmailTemplate(inspectieData);
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

