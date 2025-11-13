const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const relatienummer = (req.query.relatienummer || '').trim().toUpperCase();
  const search = (req.query.search || '').trim().toUpperCase();

  try {
    const pool = await getPool();
    const request = pool.request();

    // Zoeken: TOP 25 voor snelheid (genoeg voor dropdown)
    const topClause = relatienummer ? '' : 'TOP 25';
    
    // Super snelle query met KlantenCache tabel (of vw_UniekeKlanten view)
    // Probeer eerst KlantenCache, fall back naar view, dan naar hoofdtabel
    let query;
    if (relatienummer) {
      // Exacte match op relatienummer
      request.input('rel', sql.NVarChar(50), relatienummer);
      query = `
        SELECT TOP 1
          relatienummer,
          klantnaam,
          adres,
          postcode = '',
          plaats = '',
          telefoon = '',
          email = '',
          actief = 1
        FROM dbo.KlantenCache WITH (NOLOCK)
        WHERE relatienummer = @rel
        OPTION (MAXDOP 1);
      `;
    } else if (search) {
      // Zoeken op naam of nummer - gebruik cache tabel
      request.input('search', sql.NVarChar(200), `${search}%`);
      request.input('searchLike', sql.NVarChar(200), `%${search}%`);
      query = `
        SELECT ${topClause}
          relatienummer,
          klantnaam,
          adres,
          postcode = '',
          plaats = '',
          telefoon = '',
          email = '',
          actief = 1,
          relevantie = CASE 
            WHEN UPPER(klantnaam) LIKE @search THEN 1
            WHEN relatienummer LIKE @search THEN 1
            ELSE 2
          END
        FROM dbo.KlantenCache WITH (NOLOCK)
        WHERE (klantnaam LIKE @search OR relatienummer LIKE @search
               OR klantnaam LIKE @searchLike OR relatienummer LIKE @searchLike)
        ORDER BY CASE 
            WHEN UPPER(klantnaam) LIKE @search THEN 1
            WHEN relatienummer LIKE @search THEN 1
            ELSE 2
          END, klantnaam
        OPTION (MAXDOP 1, FAST 25);
      `;
    } else {
      // Geen zoekterm - return leeg
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: []
      };
      return;
    }

    const result = await request.query(query);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result.recordset
    };
  } catch (error) {
    context.log.error('Klanten API fout:', error);
    context.res = {
      status: 500,
      body: { 
        error: 'Klanten konden niet worden opgehaald.',
        details: error.message,
        code: error.code
      }
    };
  }
};

