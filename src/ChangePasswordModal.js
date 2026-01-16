import React, { useState } from 'react';

const ChangePasswordModal = ({ username, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    if (newPassword.length < 8) {
      setError('Nieuw wachtwoord moet minimaal 8 tekens zijn');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Er ging iets mis');
      }
    } catch (err) {
      setError('Er ging iets mis. Probeer het later opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Wachtwoord wijzigen</h3>
        
        {success ? (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            ✓ Wachtwoord succesvol gewijzigd!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Huidig wachtwoord
              </label>
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Nieuw wachtwoord
              </label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <small style={{ color: '#666' }}>Minimaal 8 tekens</small>
            </div>
            
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Bevestig nieuw wachtwoord
              </label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            {error && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8d7da', 
                color: '#721c24', 
                borderRadius: '6px',
                marginBottom: '15px'
              }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Bezig...' : 'Wijzigen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;

