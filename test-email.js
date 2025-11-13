// Test script voor Brevo SMTP
const nodemailer = require('nodemailer');

const testEmail = async () => {
  console.log('🔧 Brevo SMTP Test gestart...\n');

  // Je Brevo credentials
  const config = {
    host: 'smtp-relay.brevo.com',
    port: 587,
    user: '9b8f93001@smtp-brevo.com',
    pass: '4COf0V35LNvwBX7a',
    from: 'michiel.heerkens@lavans.nl',
    fromName: 'Lavans Service'
  };

  try {
    // Maak transporter
    console.log('📡 Verbinden met Brevo SMTP...');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    // Verifieer verbinding
    console.log('🔐 Authenticatie testen...');
    await transporter.verify();
    console.log('✅ SMTP verbinding succesvol!\n');

    // Verstuur test email
    console.log('📧 Test email versturen...');
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to: 'michiel.heerkens@gmail.com',
      subject: '🧪 Brevo SMTP Test - Lavans Inspectie App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff;">✅ Brevo SMTP Werkt!</h1>
          <p>Deze test email is succesvol verzonden via Brevo SMTP.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>SMTP Server:</strong> ${config.host}</p>
            <p><strong>Port:</strong> ${config.port}</p>
            <p><strong>Login:</strong> ${config.user}</p>
            <p><strong>From:</strong> ${config.from}</p>
          </div>
          <p>Je kunt nu emails versturen vanuit de Lavans Inspectie App! 🎉</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            Dit is een geautomatiseerde test email van de Lavans Service applicatie.
          </p>
        </div>
      `
    });

    console.log('✅ Email verzonden!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Ontvanger:', 'michiel.heerkens@gmail.com');
    console.log('\n🎉 Test geslaagd! Brevo SMTP werkt perfect.\n');
    console.log('📋 Volgende stappen:');
    console.log('   1. Check je inbox (michiel.heerkens@gmail.com)');
    console.log('   2. Voeg de SMTP credentials toe aan Azure Configuration');
    console.log('   3. Deploy de app en test in productie\n');

  } catch (error) {
    console.error('\n❌ Test mislukt!');
    console.error('Fout:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 Authenticatie fout:');
      console.error('   - Controleer of SMTP_USER en SMTP_PASS correct zijn');
      console.error('   - Ga naar Brevo → SMTP & API → SMTP Settings');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🌐 Verbinding fout:');
      console.error('   - Controleer je internetverbinding');
      console.error('   - Controleer of smtp-relay.brevo.com bereikbaar is');
    } else {
      console.error('\n⚠️ Onbekende fout:', error);
    }
  }
};

// Run test
testEmail();

