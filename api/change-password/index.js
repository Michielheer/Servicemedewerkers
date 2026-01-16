/**
 * Wachtwoord Wijzigen API
 * Gebruiker kan eigen wachtwoord wijzigen (moet ingelogd zijn)
 */

const { getPool, sql } = require('../shared/db');
const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  context.log('Change Password API aangeroepen');

  try {
    const { username, currentPassword, newPassword } = req.body || {};

    if (!username || !currentPassword || !newPassword) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Gebruikersnaam, huidig wachtwoord en nieuw wachtwoord zijn verplicht' 
        })
      };
      return;
    }

    // Valideer nieuw wachtwoord
    if (newPassword.length < 8) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Nieuw wachtwoord moet minimaal 8 tekens zijn' 
        })
      };
      return;
    }

    const pool = await getPool();
    const normalizedUsername = username.trim().toUpperCase();

    // Haal gebruiker op
    const result = await pool.request()
      .input('username', sql.NVarChar(20), normalizedUsername)
      .query(`
        SELECT GebruikerID, Gebruikersnaam, WachtwoordHash, Naam
        FROM dbo.AppGebruikers
        WHERE UPPER(Gebruikersnaam) = @username AND Actief = 1
      `);

    if (result.recordset.length === 0) {
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Gebruiker niet gevonden' 
        })
      };
      return;
    }

    const user = result.recordset[0];

    // Controleer huidig wachtwoord
    const passwordValid = await bcrypt.compare(currentPassword, user.WachtwoordHash);
    if (!passwordValid) {
      context.res = {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Huidig wachtwoord is onjuist' 
        })
      };
      return;
    }

    // Hash nieuw wachtwoord
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update wachtwoord
    await pool.request()
      .input('id', sql.Int, user.GebruikerID)
      .input('hash', sql.NVarChar(255), newHash)
      .query(`
        UPDATE dbo.AppGebruikers 
        SET WachtwoordHash = @hash, UpdatedAt = GETDATE()
        WHERE GebruikerID = @id
      `);

    context.log(`Wachtwoord gewijzigd voor ${normalizedUsername}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Wachtwoord succesvol gewijzigd'
      })
    };

  } catch (error) {
    context.log.error('Change Password API fout:', error);
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

