import React, { useState } from 'react';

const LoginScreen = ({ onLogin, loading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await onLogin({ username, password });
    if (success) {
      setPassword('');
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    if (!forgotUsername.trim()) {
      setForgotMessage('Vul je gebruikersnaam in');
      return;
    }
    
    setForgotLoading(true);
    setForgotMessage('');
    
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim().toUpperCase() })
      });
      
      const data = await response.json();
      setForgotMessage(data.message || 'Check je e-mail voor de reset-link.');
    } catch (error) {
      setForgotMessage('Er ging iets mis. Probeer het later opnieuw.');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="login-wrapper">
        <div className="card login-card">
          <h2>Wachtwoord vergeten</h2>
          <p className="login-subtitle">
            Vul je gebruikersnaam in. Als er een e-mailadres aan je account is gekoppeld, ontvang je een reset-link.
          </p>
          <form className="login-form" onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label htmlFor="forgot-username">Gebruikersnaam</label>
              <input
                id="forgot-username"
                type="text"
                className="form-control"
                placeholder="Bijv. AOOR"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value.toUpperCase())}
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            
            {forgotMessage && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '6px', 
                backgroundColor: '#d4edda', 
                color: '#155724',
                marginBottom: '15px'
              }}>
                {forgotMessage}
              </div>
            )}
            
            <div className="login-actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotMessage('');
                  setForgotUsername('');
                }}
                style={{ backgroundColor: '#6c757d', color: 'white' }}
              >
                Terug
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={forgotLoading}
              >
                {forgotLoading ? 'Bezig...' : 'Verstuur reset-link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <h2>Inloggen</h2>
        <p className="login-subtitle">
          Log in met je Lavans account om inspecties, to-do&apos;s en rapportages te beheren.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-username">Gebruikersnaam</label>
            <input
              id="login-username"
              type="text"
              className="form-control"
              placeholder="Bijv. AOOR"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              autoComplete="username"
              required
              style={{ textTransform: 'uppercase' }}
            />
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              Dit is je medewerkerscode (bijv. AOOR, MVER)
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Wachtwoord</label>
            <input
              id="login-password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="login-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Bezig...' : 'Inloggen'}
            </button>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9em'
              }}
            >
              Wachtwoord vergeten?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
