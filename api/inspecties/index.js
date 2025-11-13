const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const startTime = Date.now();
  const requestBody = JSON.stringify(req.body);
  
  try {
    const {
      relatienummer,
      klantnaam,
      contactpersoon,
      contact_email,
      inspecteur,
      datum,
      tijd,
      standaard_matten_data,
      logomatten_data,
      wissers_data,
      toebehoren_data,
      matten_concurrenten,
      wissers_concurrenten,
      algemeen_values
    } = req.body;

    // Validatie
    if (!relatienummer || !klantnaam) {
      context.res = {
        status: 400,
        body: { error: 'Relatienummer en klantnaam zijn verplicht.' }
      };
      return;
    }

    const pool = await getPool();
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();

      // 1. Insert hoofdrecord Inspectie
      const inspectieResult = await transaction.request()
        .input('relatienummer', sql.NVarChar(50), relatienummer)
        .input('klantnaam', sql.NVarChar(200), klantnaam)
        .input('contactpersoon', sql.NVarChar(200), contactpersoon || null)
        .input('contactEmail', sql.NVarChar(200), contact_email || null)
        .input('inspecteur', sql.NVarChar(100), inspecteur || null)
        .input('datum', sql.Date, datum || new Date())
        .input('tijd', sql.Time, tijd || new Date().toTimeString().split(' ')[0])
        .query(`
          INSERT INTO dbo.Inspecties 
            (Relatienummer, Klantnaam, Contactpersoon, ContactEmail, Inspecteur, InspectieDatum, InspectieTijd)
          OUTPUT INSERTED.InspectieID
          VALUES 
            (@relatienummer, @klantnaam, @contactpersoon, @contactEmail, @inspecteur, @datum, @tijd);
        `);

      const inspectieID = inspectieResult.recordset[0].InspectieID;

      // 2. Insert Standaard Matten
      if (standaard_matten_data && standaard_matten_data.length > 0) {
        for (const mat of standaard_matten_data) {
          await transaction.request()
            .input('inspectieID', sql.Int, inspectieID)
            .input('matType', sql.NVarChar(200), mat.mat_type || '')
            .input('afdeling', sql.NVarChar(100), mat.afdeling || '')
            .input('ligplaats', sql.NVarChar(100), mat.ligplaats || '')
            .input('aantal', sql.Int, mat.aantal || 0)
            .input('aanwezig', sql.Bit, mat.aanwezig || false)
            .input('schoon', sql.Bit, mat.schoon_onbeschadigd || false)
            .input('vuilgraad', sql.NVarChar(50), mat.vuilgraad_label || null)
            .query(`
              INSERT INTO dbo.InspectieStandaardMatten 
                (InspectieID, MatType, Afdeling, Ligplaats, Aantal, Aanwezig, SchoonOnbeschadigd, Vuilgraad)
              VALUES 
                (@inspectieID, @matType, @afdeling, @ligplaats, @aantal, @aanwezig, @schoon, @vuilgraad);
            `);
        }
      }

      // 3. Insert Logomatten
      if (logomatten_data && logomatten_data.length > 0) {
        for (const mat of logomatten_data) {
          await transaction.request()
            .input('inspectieID', sql.Int, inspectieID)
            .input('matType', sql.NVarChar(200), mat.mat_type || '')
            .input('afdeling', sql.NVarChar(100), mat.afdeling || '')
            .input('ligplaats', sql.NVarChar(100), mat.ligplaats || '')
            .input('aantal', sql.Int, mat.aantal || 0)
            .input('aanwezig', sql.Bit, mat.aanwezig || false)
            .input('schoon', sql.Bit, mat.schoon_onbeschadigd || false)
            .input('vuilgraad', sql.NVarChar(50), mat.vuilgraad_label || null)
            .input('barcode', sql.NVarChar(50), mat.barcode || null)
            .input('leeftijd', sql.NVarChar(50), mat.leeftijd || null)
            .query(`
              INSERT INTO dbo.InspectieLogomatten 
                (InspectieID, MatType, Afdeling, Ligplaats, Aantal, Aanwezig, SchoonOnbeschadigd, Vuilgraad, Barcode, Leeftijd)
              VALUES 
                (@inspectieID, @matType, @afdeling, @ligplaats, @aantal, @aanwezig, @schoon, @vuilgraad, @barcode, @leeftijd);
            `);
        }
      }

      // 4. Insert Wissers
      if (wissers_data && wissers_data.length > 0) {
        for (const wisser of wissers_data) {
          await transaction.request()
            .input('inspectieID', sql.Int, inspectieID)
            .input('artikel', sql.NVarChar(200), wisser.artikel || '')
            .input('aantalGeteld', sql.Int, wisser.aantal_geteld || 0)
            .input('waarvanGebruikt', sql.Int, wisser.waarvan_gebruikt || 0)
            .query(`
              INSERT INTO dbo.InspectieWissers 
                (InspectieID, Artikel, AantalGeteld, WaarvanGebruikt)
              VALUES 
                (@inspectieID, @artikel, @aantalGeteld, @waarvanGebruikt);
            `);
        }
      }

      // 5. Insert Toebehoren
      if (toebehoren_data && toebehoren_data.length > 0) {
        for (const item of toebehoren_data) {
          await transaction.request()
            .input('inspectieID', sql.Int, inspectieID)
            .input('artikel', sql.NVarChar(200), item.artikel || '')
            .input('vervangen', sql.Bit, item.vervangen || false)
            .input('aantal', sql.Int, item.aantal || 0)
            .query(`
              INSERT INTO dbo.InspectieToebehoren 
                (InspectieID, Artikel, Vervangen, Aantal)
              VALUES 
                (@inspectieID, @artikel, @vervangen, @aantal);
            `);
        }
      }

      // 6. Insert Concurrenten info
      if (matten_concurrenten || wissers_concurrenten) {
        await transaction.request()
          .input('inspectieID', sql.Int, inspectieID)
          .input('andereMatAanwezig', sql.NVarChar(10), matten_concurrenten?.andere_mat_aanwezig || 'Nee')
          .input('andereMatConcurrent', sql.NVarChar(200), matten_concurrenten?.andere_mat_concurrent || null)
          .input('aantalConcurrent', sql.Int, matten_concurrenten?.aantal_concurrent || 0)
          .input('aantalKoop', sql.Int, matten_concurrenten?.aantal_koop || 0)
          .input('wissersConcurrent', sql.NVarChar(10), wissers_concurrenten?.wissers_concurrent || 'Nee')
          .input('wissersConcurrentNaam', sql.NVarChar(200), wissers_concurrenten?.wissers_concurrent_concurrent || null)
          .input('andereZaken', sql.NVarChar(sql.MAX), wissers_concurrenten?.andere_zaken || null)
          .query(`
            INSERT INTO dbo.InspectieConcurrenten 
              (InspectieID, AndereMatAanwezig, AndereMatConcurrent, AantalConcurrent, AantalKoop, 
               WissersConcurrent, WissersConcurrentNaam, AndereZaken)
            VALUES 
              (@inspectieID, @andereMatAanwezig, @andereMatConcurrent, @aantalConcurrent, @aantalKoop,
               @wissersConcurrent, @wissersConcurrentNaam, @andereZaken);
          `);
      }

      // 7. Insert Algemene velden
      if (algemeen_values && typeof algemeen_values === 'object') {
        for (const [key, value] of Object.entries(algemeen_values)) {
          await transaction.request()
            .input('inspectieID', sql.Int, inspectieID)
            .input('veldNaam', sql.NVarChar(100), key)
            .input('veldWaarde', sql.NVarChar(sql.MAX), String(value || ''))
            .query(`
              INSERT INTO dbo.InspectieAlgemeen (InspectieID, VeldNaam, VeldWaarde)
              VALUES (@inspectieID, @veldNaam, @veldWaarde);
            `);
        }
      }

      await transaction.commit();

      // Log success
      const duration = Date.now() - startTime;
      await pool.request()
        .input('endpoint', sql.NVarChar(100), '/api/inspecties')
        .input('method', sql.NVarChar(10), 'POST')
        .input('statusCode', sql.Int, 200)
        .input('requestBody', sql.NVarChar(sql.MAX), requestBody)
        .input('responseBody', sql.NVarChar(sql.MAX), JSON.stringify({ inspectieID }))
        .input('durationMs', sql.Int, duration)
        .input('inspectieID', sql.Int, inspectieID)
        .query(`
          INSERT INTO dbo.ApiLogs (Endpoint, Method, StatusCode, RequestBody, ResponseBody, DurationMs, InspectieID)
          VALUES (@endpoint, @method, @statusCode, @requestBody, @responseBody, @durationMs, @inspectieID);
        `);

      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          success: true,
          inspectieID,
          message: 'Inspectie succesvol opgeslagen in database!'
        }
      };

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    context.log.error('Inspectie API fout:', error);
    
    // Log error
    const duration = Date.now() - startTime;
    try {
      const pool = await getPool();
      await pool.request()
        .input('endpoint', sql.NVarChar(100), '/api/inspecties')
        .input('method', sql.NVarChar(10), 'POST')
        .input('statusCode', sql.Int, 500)
        .input('requestBody', sql.NVarChar(sql.MAX), requestBody)
        .input('errorMessage', sql.NVarChar(sql.MAX), error.message)
        .input('durationMs', sql.Int, duration)
        .query(`
          INSERT INTO dbo.ApiLogs (Endpoint, Method, StatusCode, RequestBody, ErrorMessage, DurationMs)
          VALUES (@endpoint, @method, @statusCode, @requestBody, @errorMessage, @durationMs);
        `);
    } catch (logError) {
      context.log.error('Logging fout:', logError);
    }

    context.res = {
      status: 500,
      body: {
        error: 'Inspectie kon niet worden opgeslagen.',
        details: error.message,
        code: error.code
      }
    };
  }
};

