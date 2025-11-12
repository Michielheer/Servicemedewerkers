const { getPool, sql } = require('../shared/db');

const normalizeRel = (value) => {
  if (!value) return '';
  return value.replace(/[\[\]\s]/g, '').toUpperCase();
};

const isStandardMat = (activiteit, omschrijving) => {
  if ((activiteit || '').toLowerCase() !== 'matten') return false;
  if (!omschrijving) return false;
  return /^effekt\s*mat/i.test(omschrijving.trim());
};

const isLogoMat = (activiteit, omschrijving) => {
  if ((activiteit || '').toLowerCase() !== 'matten') return false;
  return !isStandardMat(activiteit, omschrijving);
};

const toBoolean = (value, positive = ['ja', 'yes', 'true', '1']) => {
  if (value === null || value === undefined) return false;
  return positive.includes(String(value).trim().toLowerCase());
};

module.exports = async function (context, req) {
  const relatienummer = normalizeRel((req.query.relatienummer || '').trim());

  if (!relatienummer) {
    context.res = {
      status: 400,
      body: { error: 'Parameter relatienummer is verplicht.' }
    };
    return;
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('rel', sql.NVarChar(50), relatienummer)
      .query(`
        SELECT
          Abonnementsregelnummer,
          Contractregelnummer,
          Relatienummer,
          Naam,
          Adres,
          Afdeling,
          Ligplaats,
          Activiteit,
          Productnummer_SG_product,
          Productnummer,
          Productomschrijving,
          Aantal,
          Bezoekritme,
          Actief,
          Startdatum,
          Bezoekritme_getal,
          [groep]
        FROM dbo.DatamodelExcel1
        WHERE UPPER(REPLACE(REPLACE(ISNULL(Relatienummer, ''), ' ', ''), '[', '')) = @rel
      `);

    const standaard = [];
    const logo = [];
    const wissers = [];
    const toebehoren = [];

    result.recordset.forEach((row) => {
      const activiteit = row.Activiteit || '';
      const omschrijving = row.Productomschrijving || '';
      const aantal = row.Aantal !== null && row.Aantal !== undefined ? Number(row.Aantal) : null;
      const actief = toBoolean(row.Actief, ['ja', 'yes', 'true', '1']);

      if (isStandardMat(activiteit, omschrijving)) {
        standaard.push({
          relatienummer,
          productnummer: row.Productnummer || '',
          mat_type: omschrijving,
          afdeling: row.Afdeling || '',
          ligplaats: row.Ligplaats || '',
          aantal: Number.isFinite(aantal) ? aantal : null,
          aanwezig: actief,
          schoon_onbeschadigd: true,
          vuilgraad_label: null,
          barcode: null,
          opmerkingen: `Contract ${row.Contractregelnummer || ''} | Abonnement ${row.Abonnementsregelnummer || ''}`
        });
        return;
      }

      if (isLogoMat(activiteit, omschrijving)) {
        logo.push({
          relatienummer,
          productnummer: row.Productnummer || '',
          mat_type: omschrijving,
          afdeling: row.Afdeling || '',
          ligplaats: row.Ligplaats || '',
          aantal: Number.isFinite(aantal) ? aantal : null,
          aanwezig: actief,
          schoon_onbeschadigd: true,
          vuilgraad_label: null,
          barcode: null,
          representativiteitsscore: null,
          opmerkingen: `Contract ${row.Contractregelnummer || ''} | Abonnement ${row.Abonnementsregelnummer || ''}`
        });
        return;
      }

      if ((activiteit || '').toLowerCase() === 'wissers') {
        const bezoekritme = row.Bezoekritme !== null && row.Bezoekritme !== undefined
          ? String(row.Bezoekritme).trim()
          : '';

        if (!bezoekritme) {
          // Toebehoren (wissers zonder bezoekritme)
          toebehoren.push({
            relatienummer,
            artikel: omschrijving,
            vervangen: false,
            aantal: Number.isFinite(aantal) ? aantal : null,
            opmerkingen: `Contract ${row.Contractregelnummer || ''} | Abonnement ${row.Abonnementsregelnummer || ''}`
          });
          return;
        }

        wissers.push({
          relatienummer,
          artikel: omschrijving,
          aantal_geteld: Number.isFinite(aantal) ? aantal : null,
          waarvan_gebruikt: 0,
          vuil_percentage: null,
          opmerkingen: `Contract ${row.Contractregelnummer || ''} | Abonnement ${row.Abonnementsregelnummer || ''}`
        });
      }
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        relatienummer,
        standaard,
        logo,
        wissers,
        toebehoren
      }
    };
  } catch (error) {
    context.log.error('Materiaal API fout:', error);
    context.res = {
      status: 500,
      body: { 
        error: 'Materiaalgegevens konden niet worden opgehaald.',
        details: error.message,
        code: error.code
      }
    };
  }
};

