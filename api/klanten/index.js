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
      SELECT TOP 5000
        relatienummer = UPPER(REPLACE(REPLACE(ISNULL(d.Relatienummer, ''), ' ', ''), '[', '')),
        klantnaam = ISNULL(MAX(d.Naam), ''),
        adres = ISNULL(MAX(d.Adres), ''),
        postcode = '',
        plaats = '',
        telefoon = '',
        email = '',
        actief = 1
      FROM dbo.DatamodelExcel1 d
      WHERE d.Relatienummer IS NOT NULL 
        AND d.Relatienummer <> ''
        AND (@rel IS NULL OR UPPER(REPLACE(REPLACE(d.Relatienummer, ' ', ''), '[', '')) = @rel)
      GROUP BY UPPER(REPLACE(REPLACE(ISNULL(d.Relatienummer, ''), ' ', ''), '[', ''))
      HAVING @search IS NULL
         OR MAX(d.Naam) LIKE @search
         OR UPPER(REPLACE(REPLACE(d.Relatienummer, ' ', ''), '[', '')) LIKE @search
      ORDER BY MAX(d.Naam);
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

