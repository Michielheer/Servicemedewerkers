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
      SELECT
        relatienummer = UPPER(REPLACE(REPLACE(ISNULL(k.relatienummer, ''), ' ', ''), '[', '')),
        klantnaam = ISNULL(k.klantnaam, ''),
        adres = ISNULL(k.adres, ''),
        postcode = ISNULL(k.postcode, ''),
        plaats = ISNULL(k.plaats, ''),
        telefoon = ISNULL(k.telefoon, ''),
        email = ISNULL(k.email, ''),
        actief = ISNULL(k.actief, 1)
      FROM dbo.Klanten k
      WHERE (@rel IS NULL OR k.relatienummer = @rel)
        AND (@search IS NULL OR k.klantnaam LIKE @search OR k.relatienummer LIKE @search)
      ORDER BY k.klantnaam;
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
      body: { error: 'Klanten konden niet worden opgehaald.' }
    };
  }
};

