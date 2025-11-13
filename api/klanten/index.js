const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const relatienummer = (req.query.relatienummer || '').trim().toUpperCase();
  const search = (req.query.search || '').trim().toUpperCase();

  try {
    const pool = await getPool();
    const request = pool.request();

    // Zoeken: TOP 25 voor snelheid (genoeg voor dropdown)
    const topClause = relatienummer ? '' : 'TOP 25';
    
    // Super snelle query zonder CTE
    let query;
    if (relatienummer) {
      // Exacte match op relatienummer
      request.input('rel', sql.NVarChar(50), relatienummer);
      query = `
        SELECT DISTINCT TOP 1
          relatienummer = UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')),
          klantnaam = MAX(Naam),
          adres = MAX(Adres),
          postcode = '',
          plaats = '',
          telefoon = '',
          email = '',
          actief = 1
        FROM dbo.DatamodelExcel1 WITH (NOLOCK)
        WHERE UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) = @rel
        GROUP BY UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', ''))
        OPTION (MAXDOP 1);
      `;
    } else if (search) {
      // Zoeken op naam of nummer
      request.input('search', sql.NVarChar(200), `${search}%`);
      request.input('searchLike', sql.NVarChar(200), `%${search}%`);
      query = `
        SELECT ${topClause}
          relatienummer = UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')),
          klantnaam = MAX(Naam),
          adres = MAX(Adres),
          postcode = '',
          plaats = '',
          telefoon = '',
          email = '',
          actief = 1,
          relevantie = CASE 
            WHEN UPPER(Naam) LIKE @search THEN 1
            WHEN UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) LIKE @search THEN 1
            ELSE 2
          END
        FROM dbo.DatamodelExcel1 WITH (NOLOCK, INDEX(IX_DatamodelExcel1_Naam))
        WHERE (Naam LIKE @search OR UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) LIKE @search
               OR Naam LIKE @searchLike OR UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) LIKE @searchLike)
          AND Relatienummer IS NOT NULL
          AND Relatienummer <> ''
        GROUP BY UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', ''))
        ORDER BY MIN(CASE 
            WHEN UPPER(Naam) LIKE @search THEN 1
            WHEN UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) LIKE @search THEN 1
            ELSE 2
          END), MAX(Naam)
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

