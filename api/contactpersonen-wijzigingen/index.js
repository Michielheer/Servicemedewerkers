const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const startTime = Date.now();
  const endpoint = '/api/contactpersonen-wijzigingen';
  const method = 'POST';
  let statusCode = 200;
  let responseBody = {};
  let errorMessage = null;

  try {
    const {
      relatienummer,
      klantnaam,
      inspecteur,
      wijzigingen // Array van wijzigingen
    } = req.body;

    if (!relatienummer || !klantnaam || !wijzigingen || !Array.isArray(wijzigingen)) {
      statusCode = 400;
      responseBody = { error: 'Vereiste velden: relatienummer, klantnaam, wijzigingen (array)' };
      errorMessage = 'Missing required fields';
      
      context.res = {
        status: statusCode,
        body: responseBody
      };
      return;
    }

    const pool = await getPool();
    
    // Log elke wijziging
    for (const wijziging of wijzigingen) {
      await pool.request()
        .input('relatienummer', sql.NVarChar(50), relatienummer)
        .input('klantnaam', sql.NVarChar(200), klantnaam)
        .input('inspecteur', sql.NVarChar(100), inspecteur || null)
        .input('wijzigingType', sql.NVarChar(50), wijziging.type) // 'toevoegen', 'wijzigen', 'verwijderen'
        .input('contactVoornaam', sql.NVarChar(100), wijziging.voornaam || null)
        .input('contactTussenvoegsel', sql.NVarChar(50), wijziging.tussenvoegsel || null)
        .input('contactAchternaam', sql.NVarChar(100), wijziging.achternaam || null)
        .input('contactEmail', sql.NVarChar(200), wijziging.email || null)
        .input('contactTelefoon', sql.NVarChar(50), wijziging.telefoon || null)
        .input('contactFunctie', sql.NVarChar(100), wijziging.functie || null)
        .input('routecontact', sql.Bit, wijziging.routecontact ? 1 : 0)
        .input('nogInDienst', sql.Bit, wijziging.nog_in_dienst ? 1 : 0)
        .input('klantenportaal', sql.NVarChar(100), wijziging.klantenportaal || null)
        .input('omschrijving', sql.NVarChar(sql.MAX), wijziging.omschrijving || null)
        .query(`
          INSERT INTO dbo.ContactpersonenWijzigingen (
            Relatienummer,
            Klantnaam,
            Inspecteur,
            WijzigingType,
            ContactVoornaam,
            ContactTussenvoegsel,
            ContactAchternaam,
            ContactEmail,
            ContactTelefoon,
            ContactFunctie,
            Routecontact,
            NogInDienst,
            Klantenportaal,
            Omschrijving,
            WijzigingDatum
          ) VALUES (
            @relatienummer,
            @klantnaam,
            @inspecteur,
            @wijzigingType,
            @contactVoornaam,
            @contactTussenvoegsel,
            @contactAchternaam,
            @contactEmail,
            @contactTelefoon,
            @contactFunctie,
            @routecontact,
            @nogInDienst,
            @klantenportaal,
            @omschrijving,
            GETDATE()
          );
        `);
    }

    responseBody = {
      success: true,
      message: `${wijzigingen.length} wijziging(en) opgeslagen`,
      aantalWijzigingen: wijzigingen.length
    };

    context.res = {
      status: 200,
      body: responseBody
    };

  } catch (error) {
    statusCode = 500;
    errorMessage = error.message;
    responseBody = {
      error: 'Wijzigingen konden niet worden opgeslagen.',
      details: error.message
    };
    
    context.log.error('Contactpersonen Wijzigingen API fout:', error);
    
    context.res = {
      status: statusCode,
      body: responseBody
    };
  } finally {
    const duration = Date.now() - startTime;
    
    // Log de API call zelf
    try {
      const pool = await getPool();
      await pool.request()
        .input('endpoint', sql.NVarChar(100), endpoint)
        .input('method', sql.NVarChar(10), method)
        .input('statusCode', sql.Int, statusCode)
        .input('requestBody', sql.NVarChar(sql.MAX), JSON.stringify(req.body).substring(0, 4000))
        .input('responseBody', sql.NVarChar(sql.MAX), JSON.stringify(responseBody).substring(0, 4000))
        .input('errorMessage', sql.NVarChar(sql.MAX), errorMessage)
        .input('durationMs', sql.Int, duration)
        .query(`
          INSERT INTO dbo.ApiLogs (Endpoint, Method, StatusCode, RequestBody, ResponseBody, ErrorMessage, DurationMs)
          VALUES (@endpoint, @method, @statusCode, @requestBody, @responseBody, @errorMessage, @durationMs);
        `);
    } catch (logError) {
      context.log.error('Failed to log API call:', logError);
    }
  }
};

