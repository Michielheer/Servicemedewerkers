const { getPool, sql } = require('../shared/db');

module.exports = async function (context, req) {
  const relatienummer = (req.query.relatienummer || '').trim().toUpperCase();
  const search = (req.query.search || '').trim();

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('rel', sql.NVarChar(50), relatienummer || null);
    request.input('search', sql.NVarChar(200), search ? `%${search}%` : null);

    const result = await request.query(`
      WITH bron AS (
        SELECT
          rel_norm = UPPER(REPLACE(REPLACE(ISNULL(d.Relatienummer, ''), ' ', ''), '[', '')),
          naam = ISNULL(d.Naam, ''),
          adres = ISNULL(d.Adres, '')
        FROM dbo.DatamodelExcel1 d
        WHERE d.Relatienummer IS NOT NULL AND d.Relatienummer <> ''
      )
      SELECT
        relatienummer = b.rel_norm,
        klantnaam = MAX(b.naam),
        adres = MAX(b.adres),
        postcode = '',
        plaats = '',
        telefoon = '',
        email = '',
        actief = 1
      FROM bron b
      WHERE (@rel IS NULL OR b.rel_norm = @rel)
      GROUP BY b.rel_norm
      HAVING @search IS NULL
         OR MAX(b.naam) LIKE @search
         OR b.rel_norm LIKE @search
      ORDER BY MAX(b.naam);
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

