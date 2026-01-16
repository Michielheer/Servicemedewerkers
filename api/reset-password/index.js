/**
 * Wachtwoord Reset API
 * Stelt een nieuw wachtwoord in met een geldige reset token
 */

const { getPool, sql } = require('../shared/db');
const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  context.log('Reset Password API aangeroepen');

  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Token en nieuw wachtwoord zijn verplicht' 
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
          error: 'Wachtwoord moet minimaal 8 tekens zijn' 
        })
      };
      return;
    }

    const pool = await getPool();

    // Zoek geldige token
    const tokenResult = await pool.request()
      .input('token', sql.NVarChar(100), token)
      .query(`
        SELECT t.TokenID, t.GebruikerID, t.GeldigTot, t.Gebruikt, g.Naam, g.Gebruikersnaam
        FROM dbo.WachtwoordResetTokens t
        JOIN dbo.AppGebruikers g ON t.GebruikerID = g.GebruikerID
        WHERE t.Token = @token
      `);

    if (tokenResult.recordset.length === 0) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Ongeldige of verlopen reset-link' 
        })
      };
      return;
    }

    const resetToken = tokenResult.recordset[0];

    // Check of token al gebruikt is
    if (resetToken.Gebruikt) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Deze reset-link is al gebruikt' 
        })
      };
      return;
    }

    // Check of token nog geldig is
    if (new Date(resetToken.GeldigTot) < new Date()) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Deze reset-link is verlopen. Vraag een nieuwe aan.' 
        })
      };
      return;
    }

    // Hash nieuw wachtwoord
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update wachtwoord
    await pool.request()
      .input('userId', sql.Int, resetToken.GebruikerID)
      .input('hash', sql.NVarChar(255), newHash)
      .query(`
        UPDATE dbo.AppGebruikers 
        SET WachtwoordHash = @hash, UpdatedAt = GETDATE(), AantalLoginPogingen = 0
        WHERE GebruikerID = @userId
      `);

    // Markeer token als gebruikt
    await pool.request()
      .input('tokenId', sql.Int, resetToken.TokenID)
      .query(`
        UPDATE dbo.WachtwoordResetTokens 
        SET Gebruikt = 1
        WHERE TokenID = @tokenId
      `);

    context.log(`Wachtwoord gereset voor ${resetToken.Gebruikersnaam}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Wachtwoord succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.',
        username: resetToken.Gebruikersnaam
      })
    };

  } catch (error) {
    context.log.error('Reset Password API fout:', error);
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

