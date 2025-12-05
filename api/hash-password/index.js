/**
 * Helper API om wachtwoorden te hashen
 * Gebruik: POST /api/hash-password met { "password": "jouw_wachtwoord" }
 * 
 * BELANGRIJK: Verwijder of beveilig deze API na setup!
 */

const bcrypt = require('bcryptjs');

module.exports = async function (context, req) {
  try {
    const { password } = req.body || {};

    if (!password) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Password is verplicht',
          usage: 'POST met { "password": "jouw_wachtwoord" }'
        })
      };
      return;
    }

    // Hash het wachtwoord met bcrypt (10 salt rounds)
    const hash = await bcrypt.hash(password, 10);

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        hash: hash,
        sqlInsert: `-- Voer dit uit in SQL Server:\nUPDATE dbo.AppGebruikers SET WachtwoordHash = '${hash}' WHERE Email = 'EMAIL_HIER';`
      })
    };

  } catch (error) {
    context.log.error('Hash password fout:', error);
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

