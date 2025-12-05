/**
 * Login API - Veilige authenticatie via database
 * Wachtwoorden worden gehashed opgeslagen met bcrypt
 */

const { getPool, sql } = require('../shared/db');
const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  context.log('Login API aangeroepen');

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Email en wachtwoord zijn verplicht' 
        })
      };
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pool = await getPool();

    // Check of de gebruikerstabel bestaat
    const tableCheck = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.AppGebruikers','U') IS NOT NULL THEN 1 ELSE 0 END AS HasTable
    `);
    const hasTable = tableCheck.recordset[0].HasTable === 1;

    let user = null;
    let passwordValid = false;

    if (hasTable) {
      // Haal gebruiker uit database
      const result = await pool.request()
        .input('email', sql.NVarChar(255), normalizedEmail)
        .query(`
          SELECT GebruikerID, Email, WachtwoordHash, Naam, Rol, Initialen, KorteNaam, Actief
          FROM dbo.AppGebruikers
          WHERE Email = @email AND Actief = 1
        `);

      if (result.recordset.length > 0) {
        const dbUser = result.recordset[0];
        
        // Vergelijk wachtwoord met hash
        passwordValid = await bcrypt.compare(password, dbUser.WachtwoordHash);
        
        if (passwordValid) {
          user = {
            name: dbUser.Naam,
            email: dbUser.Email,
            role: dbUser.Rol,
            initials: dbUser.Initialen,
            shortName: dbUser.KorteNaam
          };

          // Update laatste login
          await pool.request()
            .input('id', sql.Int, dbUser.GebruikerID)
            .query(`
              UPDATE dbo.AppGebruikers 
              SET LaatsteLogin = GETDATE(), AantalLoginPogingen = 0
              WHERE GebruikerID = @id
            `);
        } else {
          // Verhoog login pogingen
          await pool.request()
            .input('email', sql.NVarChar(255), normalizedEmail)
            .query(`
              UPDATE dbo.AppGebruikers 
              SET AantalLoginPogingen = AantalLoginPogingen + 1
              WHERE Email = @email
            `);
        }
      }
    }
    
    // Fallback naar environment variables als tabel niet bestaat of user niet gevonden
    if (!user && !hasTable) {
      const envUsers = [
        { email: 'michiel.heerkens@lavans.nl', pwdKey: 'AUTH_PWD_MICHIEL', name: 'Michiel Heerkens', role: 'Service Manager', initials: 'MH', shortName: 'Michiel' },
        { email: 'tijn.heerkens@lavans.nl', pwdKey: 'AUTH_PWD_TIJN', name: 'Tijn Heerkens', role: 'Servicemedewerker', initials: 'TH', shortName: 'Tijn' },
        { email: 'roberto.hendrikse@lavans.nl', pwdKey: 'AUTH_PWD_ROBERTO', name: 'Roberto Hendrikse', role: 'Servicemedewerker', initials: 'RH', shortName: 'Roberto' }
      ];

      const envUser = envUsers.find(u => u.email === normalizedEmail);
      if (envUser) {
        // Probeer eerst env var
        let storedPwd = process.env[envUser.pwdKey];
        
        // TIJDELIJK: Fallback tot database is geconfigureerd
        // TODO: Verwijder deze fallback zodra AppGebruikers tabel bestaat
        if (!storedPwd) {
          const tempPasswords = {
            'michiel.heerkens@lavans.nl': 'Herfst2025!',
            'tijn.heerkens@lavans.nl': 'Herfst2025!',
            'roberto.hendrikse@lavans.nl': 'Winter2025!'
          };
          storedPwd = tempPasswords[normalizedEmail];
        }
        
        if (storedPwd && password === storedPwd) {
          user = {
            name: envUser.name,
            email: envUser.email,
            role: envUser.role,
            initials: envUser.initials,
            shortName: envUser.shortName
          };
          passwordValid = true;
        }
      }
    }

    if (!user || !passwordValid) {
      context.log(`Login mislukt voor ${normalizedEmail}`);
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Onjuiste combinatie van e-mailadres en wachtwoord' 
        })
      };
      return;
    }

    context.log(`Login succesvol: ${normalizedEmail}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user
      })
    };

  } catch (error) {
    context.log.error('Login API fout:', error);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: false, 
        error: 'Er ging iets mis. Probeer het opnieuw.' 
      })
    };
  }
};

