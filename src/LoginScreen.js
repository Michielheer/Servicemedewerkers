import React, { useState } from 'react';

const LoginScreen = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await onLogin({ email, password });
    if (success) {
      setPassword('');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="card login-card">
        <h2>Inloggen</h2>
        <p className="login-subtitle">
          Log in met je Lavans account om inspecties, to-do&apos;s en rapportages te beheren.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">E-mailadres</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder="naam@lavans.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
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
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;

