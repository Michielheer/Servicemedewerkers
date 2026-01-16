/**
 * Wachtwoord Vergeten API
 * Stuurt een reset-link naar het e-mailadres van de gebruiker
 */

const { getPool, sql } = require('../shared/db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email service
const sendResetEmail = async (to, resetUrl, naam) => {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'receptie@lavans.nl';
  const FROM_NAME = process.env.FROM_NAME || 'Lavans Service App';

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP niet geconfigureerd - email niet verzonden');
    return { success: false, message: 'SMTP niet geconfigureerd' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E3A8A; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
          display: inline-block; 
          padding: 15px 30px; 
          background: #1E3A8A; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer { padding: 20px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Lavans Service App</h1>
        </div>
        <div class="content">
          <p>Beste ${naam || 'medewerker'},</p>
          
          <p>Je hebt een verzoek ingediend om je wachtwoord te resetten voor de Lavans Service App.</p>
          
          <p><a href="${resetUrl}" class="button">Wachtwoord resetten</a></p>
          
          <p>Of kopieer deze link:</p>
          <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
            ${resetUrl}
          </p>
          
          <p><strong>Let op:</strong> Deze link is 1 uur geldig.</p>
          
          <p>Heb je geen wachtwoord reset aangevraagd? Dan kun je deze e-mail negeren.</p>
        </div>
        <div class="footer">
          <p>Lavans BV - Deze e-mail is automatisch verzonden.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: 'Wachtwoord resetten - Lavans Service App',
      html: htmlContent
    });
    return { success: true };
  } catch (error) {
    console.error('Email verzenden mislukt:', error);
    return { success: false, error: error.message };
  }
};

module.exports = async function (context, req) {
  context.log('Forgot Password API aangeroepen');

  try {
    const { username, email } = req.body || {};

    if (!username && !email) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Gebruikersnaam of e-mailadres is verplicht' 
        })
      };
      return;
    }

    const pool = await getPool();

    // Zoek gebruiker op gebruikersnaam of email
    let query = '';
    let param = '';
    
    if (username) {
      query = `
        SELECT GebruikerID, Gebruikersnaam, Email, Naam
        FROM dbo.AppGebruikers
        WHERE UPPER(Gebruikersnaam) = @param AND Actief = 1
      `;
      param = username.trim().toUpperCase();
    } else {
      query = `
        SELECT GebruikerID, Gebruikersnaam, Email, Naam
        FROM dbo.AppGebruikers
        WHERE LOWER(Email) = @param AND Actief = 1
      `;
      param = email.trim().toLowerCase();
    }

    const result = await pool.request()
      .input('param', sql.NVarChar(255), param)
      .query(query);

    // Altijd succes response (voorkomt dat aanvallers weten of account bestaat)
    if (result.recordset.length === 0 || !result.recordset[0].Email) {
      context.log('Gebruiker niet gevonden of geen email ingesteld');
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Als het account bestaat met een gekoppeld e-mailadres, ontvang je een reset-link.'
        })
      };
      return;
    }

    const user = result.recordset[0];

    // Genereer unieke token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 uur geldig

    // Sla token op in database
    await pool.request()
      .input('userId', sql.Int, user.GebruikerID)
      .input('token', sql.NVarChar(100), token)
      .input('email', sql.NVarChar(255), user.Email)
      .input('expires', sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO dbo.WachtwoordResetTokens (GebruikerID, Token, Email, GeldigTot)
        VALUES (@userId, @token, @email, @expires)
      `);

    // Bouw reset URL
    const baseUrl = process.env.APP_URL || 'https://agreeable-bush-0adda8c03.3.azurestaticapps.net';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Verstuur email
    const emailResult = await sendResetEmail(user.Email, resetUrl, user.Naam);
    
    if (!emailResult.success) {
      context.log.warn('Email kon niet worden verzonden:', emailResult.error || emailResult.message);
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Als het account bestaat met een gekoppeld e-mailadres, ontvang je een reset-link.'
      })
    };

  } catch (error) {
    context.log.error('Forgot Password API fout:', error);
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

