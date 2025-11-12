const { getPool, sql } = require('../shared/db');

const NORMALIZE_REL_QUERY = `
WITH klanten AS (
  SELECT
    rel_norm = UPPER(REPLACE(REPLACE(ISNULL(d.Relatienummer, ''), ' ', ''), '[', '')),
    klantnaam = MAX(ISNULL(d.Naam, ''))
  FROM dbo.DatamodelExcel1 d
  WHERE d.Relatienummer IS NOT NULL AND d.Relatienummer <> ''
  GROUP BY UPPER(REPLACE(REPLACE(ISNULL(d.Relatienummer, ''), ' ', ''), '[', ''))
)
SELECT
  Relatienummer = UPPER(REPLACE(REPLACE(ISNULL(c.relatienummer, ''), ' ', ''), '[', '')),
  Voornaam = ISNULL(c.voornaam, ''),
  Tussenvoegsel = ISNULL(c.tussenvoegsel, ''),
  Achternaam = ISNULL(c.achternaam, ''),
  [Telefoonnummer] = ISNULL(c.telefoon, ''),
  [Mobiel nummer] = ISNULL(c.mobiel, ''),
  [E-mailadres] = ISNULL(c.email, ''),
  Relatie = ISNULL(k.klantnaam, ''),
  Functies = ISNULL(c.functie, ''),
  [Aanvullende functie omschrijving] = '',
  Routecontact = CASE WHEN c.routecontact = 1 THEN 'Ja' ELSE 'Nee' END,
  [Rol gebruiker] = '',
  [Rol beslisser] = CASE WHEN c.beslisser = 1 THEN 'Ja' ELSE 'Nee' END,
  [Operationeel contact] = CASE WHEN c.operationeel = 1 THEN 'Ja' ELSE 'Nee' END,
  [Financieel contact] = CASE WHEN c.financieel = 1 THEN 'Ja' ELSE 'Nee' END,
  Actief = CASE WHEN c.nog_in_dienst = 1 THEN 'Ja' ELSE 'Nee' END,
  [Klantenportaal gebruikersnaam] = ISNULL(c.klantenportaal, '')
FROM dbo.Contactpersonen c
LEFT JOIN klanten k
  ON k.rel_norm = UPPER(REPLACE(REPLACE(ISNULL(c.relatienummer, ''), ' ', ''), '[', ''))
WHERE (@rel IS NULL OR UPPER(REPLACE(REPLACE(ISNULL(c.relatienummer, ''), ' ', ''), '[', '')) = @rel)
  AND (@relatieKey IS NULL OR k.klantnaam = @relatieKey);
`;

module.exports = async function (context, req) {
  try {
    const pool = await getPool();
    const relatienummer = (req.query.relatienummer || '').trim().toUpperCase();
    const klantnaam = (req.query.klantnaam || '').trim();

    const request = pool.request();
    request.input('rel', sql.NVarChar(50), relatienummer || null);
    request.input('relatieKey', sql.NVarChar(200), klantnaam || null);

    const result = await request.query(NORMALIZE_REL_QUERY);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result.recordset
    };
  } catch (error) {
    context.log.error('Contactpersonen API fout:', error);
    context.res = {
      status: 500,
      body: { 
        error: 'Contactpersonen konden niet worden opgehaald.',
        details: error.message,
        code: error.code
      }
    };
  }
};

