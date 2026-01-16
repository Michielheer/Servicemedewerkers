/**
 * Login API - Veilige authenticatie via database
 * Wachtwoorden worden gehashed opgeslagen met bcrypt
 * Login kan met gebruikersnaam (bijv. AOOR) of e-mailadres
 */

const { getPool, sql } = require('../shared/db');
const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  context.log('Login API aangeroepen');

  try {
    const { email, password, username } = req.body || {};
    
    // Ondersteun zowel 'email' als 'username' parameter
    const loginId = username || email;

    if (!loginId || !password) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Gebruikersnaam en wachtwoord zijn verplicht' 
        })
      };
      return;
    }

    const normalizedLoginId = loginId.trim().toUpperCase();
    const pool = await getPool();

    // Check of de gebruikerstabel bestaat
    const tableCheck = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID('dbo.AppGebruikers','U') IS NOT NULL THEN 1 ELSE 0 END AS HasTable
    `);
    const hasTable = tableCheck.recordset[0].HasTable === 1;

    let user = null;
    let passwordValid = false;

    if (hasTable) {
      // Haal gebruiker uit database - zoek op Gebruikersnaam OF Email
      const result = await pool.request()
        .input('loginId', sql.NVarChar(255), normalizedLoginId)
        .input('loginIdLower', sql.NVarChar(255), loginId.trim().toLowerCase())
        .query(`
          SELECT GebruikerID, Gebruikersnaam, WachtwoordHash, Naam, Rol, Actief
          FROM dbo.AppGebruikers
          WHERE (UPPER(Gebruikersnaam) = @loginId OR LOWER(ISNULL(Email,'')) = @loginIdLower) 
            AND Actief = 1
        `);

      if (result.recordset.length > 0) {
        const dbUser = result.recordset[0];
        
        // Vergelijk wachtwoord met hash
        passwordValid = await bcrypt.compare(password, dbUser.WachtwoordHash);
        
        if (passwordValid) {
          user = {
            name: dbUser.Naam,
            username: dbUser.Gebruikersnaam,
            role: dbUser.Rol,
            initials: dbUser.Gebruikersnaam
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
            .input('loginId', sql.NVarChar(255), normalizedLoginId)
            .query(`
              UPDATE dbo.AppGebruikers 
              SET AantalLoginPogingen = AantalLoginPogingen + 1
              WHERE UPPER(Gebruikersnaam) = @loginId
            `);
        }
      }
    }
    
    // Fallback naar hardcoded users als tabel niet bestaat
    if (!user && !hasTable) {
      const fallbackUsers = [
        { username: 'MHEE', password: 'Herfst2025!', name: 'Michiel Heerkens', role: 'Service Manager' },
        { username: 'THEE', password: 'Herfst2025!', name: 'Tijn Heerkens', role: 'ServiceMedewerker' },
        { username: 'RHEN', password: 'Winter2025!', name: 'Roberto Hendrikse', role: 'ServiceMedewerker' }
      ];

      const fallbackUser = fallbackUsers.find(u => 
        u.username.toUpperCase() === normalizedLoginId
      );
      
      if (fallbackUser && password === fallbackUser.password) {
        user = {
          name: fallbackUser.name,
          username: fallbackUser.username,
          role: fallbackUser.role,
          initials: fallbackUser.username
        };
        passwordValid = true;
      }
    }

    if (!user || !passwordValid) {
      context.log(`Login mislukt voor ${normalizedLoginId}`);
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Onjuiste combinatie van gebruikersnaam en wachtwoord' 
        })
      };
      return;
    }

    context.log(`Login succesvol: ${normalizedLoginId}`);
    
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
