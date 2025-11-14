const { getPool, sql } = require('../shared/db');

// Hergebruik de email template functie
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
    problemen,
    algemeenOpmerkingen
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
    .preview-banner {
      background: #17a2b8;
      color: white;
      padding: 15px;
      text-align: center;
      font-weight: bold;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="preview-banner">
      EMAIL PREVIEW - Dit is hoe de email eruit ziet
    </div>
    
    <div class="header">
      <h1>Service Inspectie Rapport</h1>
      <img src="https://www.lavans.nl/wp-content/uploads/2021/03/Logo-Lavans-png.png" alt="Lavans" class="header-logo">
    </div>
    
    <p>Beste ${contactpersoon || 'relatie'},</p>
    
    <p>We hebben een <strong>service-inspectie</strong> uitgevoerd bij ${klantnaam}. 
    Hieronder vindt u een overzicht van onze bevindingen.</p>
    
    <div class="meta">
      <p><strong>Datum:</strong> ${formatDatum(datum)}</p>
      <p><strong>Inspecteur:</strong> ${inspecteur}</p>
    </div>

    <div class="section">
      <h2>Geïnspecteerde Materialen</h2>
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
      <h2>Aandachtspunten</h2>
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
      <p><strong>Alles in orde!</strong></p>
      <p>Tijdens de inspectie zijn geen bijzonderheden geconstateerd. Alle materialen zijn in goede staat.</p>
    </div>
    `}

    ${algemeenOpmerkingen && Object.keys(algemeenOpmerkingen).length > 0 ? `
    <div class="section">
      <h2>Algemene Opmerkingen</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
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
    const inspectieID = parseInt(req.params.inspectieID);

    if (!inspectieID || isNaN(inspectieID)) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
        body: '<h1>❌ Ongeldige Inspectie ID</h1><p>Gebruik: /api/preview-email/{inspectieID}</p>'
      };
      return;
    }

    const pool = await getPool();

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

    // Haal aantallen op
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

    // Genereer email HTML
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
      problemen,
      algemeenOpmerkingen
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

