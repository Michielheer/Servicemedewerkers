const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const relatienummer = (req.query.relatienummer || '').trim().toUpperCase();
  const search = (req.query.search || '').trim();

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('rel', sql.NVarChar(50), relatienummer || null);
    request.input('search', sql.NVarChar(200), search ? `%${search}%` : null);

    // Zoeken: TOP 50 voor snelheid, specifiek relatienummer: geen limiet
    const topClause = relatienummer ? '' : 'TOP 50';
    
    const result = await request.query(`
      WITH normalized AS (
        SELECT TOP 1000
          rel_norm = UPPER(REPLACE(REPLACE(ISNULL(Relatienummer, ''), ' ', ''), '[', '')),
          naam = ISNULL(Naam, ''),
          adres = ISNULL(Adres, '')
        FROM dbo.DatamodelExcel1 WITH (NOLOCK)
        WHERE Relatienummer IS NOT NULL 
          AND Relatienummer <> ''
          AND (@rel IS NULL OR UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) = @rel)
          AND (@search IS NULL 
               OR Naam LIKE @search 
               OR UPPER(REPLACE(REPLACE(Relatienummer, ' ', ''), '[', '')) LIKE @search)
      )
      SELECT ${topClause}
        relatienummer = rel_norm,
        klantnaam = MAX(naam),
        adres = MAX(adres),
        postcode = '',
        plaats = '',
        telefoon = '',
        email = '',
        actief = 1
      FROM normalized
      GROUP BY rel_norm
      ORDER BY MAX(naam)
      OPTION (MAXDOP 1);
    `);

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

