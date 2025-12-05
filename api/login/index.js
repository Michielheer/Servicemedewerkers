/**
 * Login API - Authenticatie via backend
 * Wachtwoorden uit Azure env vars, met fallback voor ontwikkeling
 */

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

    // Gebruikers met wachtwoorden uit env vars OF fallback
    const users = [
      {
        email: 'michiel.heerkens@lavans.nl',
        password: process.env.AUTH_PWD_MICHIEL || 'Herfst2025!',
        name: 'Michiel Heerkens',
        role: 'Service Manager',
        initials: 'MH',
        shortName: 'Michiel'
      },
      {
        email: 'tijn.heerkens@lavans.nl',
        password: process.env.AUTH_PWD_TIJN || 'Herfst2025!',
        name: 'Tijn Heerkens',
        role: 'Servicemedewerker',
        initials: 'TH',
        shortName: 'Tijn'
      },
      {
        email: 'roberto.hendrikse@lavans.nl',
        password: process.env.AUTH_PWD_ROBERTO || 'Winter2025!',
        name: 'Roberto Hendrikse',
        role: 'Servicemedewerker',
        initials: 'RH',
        shortName: 'Roberto'
      }
    ];

    // Zoek gebruiker
    const user = users.find(u => u.email === normalizedEmail);

    if (!user) {
      context.log(`Login mislukt: gebruiker niet gevonden - ${normalizedEmail}`);
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

    // Vergelijk wachtwoord
    if (password !== user.password) {
      context.log(`Login mislukt: verkeerd wachtwoord voor ${normalizedEmail}`);
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

    // Succesvolle login - stuur gebruikersinfo (zonder wachtwoord!)
    context.log(`Login succesvol: ${normalizedEmail}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          initials: user.initials,
          shortName: user.shortName
        }
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

