import React from 'react';

const ContactpersonenTab = ({
  contactpersonen,
  setContactpersonen,
  addContactpersoon,
  removeContactpersoon,
  updateContactpersoon,
  saveContactWijzigingen,
  formatNaam
}) => (
  <div className="card">
    <h2>Contactpersoon Aanpassing</h2>
    <p>Controleer hieronder of de juiste contactpersonen in het systeem staan. Pas aan waar nodig.</p>
    <p><strong>Let op:</strong> Zet 'Nog in dienst' uit als iemand niet meer actief is.</p>
    <div className="card">
      <h3>Contactpersonen Overzicht</h3>
      {contactpersonen.map((contact, index) => (
        <div key={index} className="card" style={{ marginBottom: '20px', border: '1px solid #ddd' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4>{formatNaam(contact.voornaam, contact.tussenvoegsel, contact.achternaam)}</h4>
            <button 
              className="btn btn-danger" 
              onClick={() => removeContactpersoon(index)}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Verwijderen
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Voornaam:</label>
              <input
                type="text"
                className="form-control"
                value={contact.voornaam}
                onChange={(e) => updateContactpersoon(index, 'voornaam', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Tussenvoegsel:</label>
              <input
                type="text"
                className="form-control"
                value={contact.tussenvoegsel}
                onChange={(e) => updateContactpersoon(index, 'tussenvoegsel', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Achternaam:</label>
              <input
                type="text"
                className="form-control"
                value={contact.achternaam}
                onChange={(e) => updateContactpersoon(index, 'achternaam', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>E-mailadres:</label>
              <input
                type="email"
                className="form-control"
                value={contact.email}
                onChange={(e) => updateContactpersoon(index, 'email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Telefoonnummer:</label>
              <input
                type="text"
                className="form-control"
                value={contact.telefoon}
                onChange={(e) => updateContactpersoon(index, 'telefoon', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Klantenportaal gebruikersnaam:</label>
              <input
                type="text"
                className="form-control"
                value={contact.klantenportaal}
                onChange={(e) => updateContactpersoon(index, 'klantenportaal', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <div className="checkbox-group" style={{ marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={contact.nog_in_dienst}
                onChange={(e) => updateContactpersoon(index, 'nog_in_dienst', e.target.checked)}
              />
              <span>Nog in dienst</span>
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                checked={contact.routecontact}
                onChange={(e) => updateContactpersoon(index, 'routecontact', e.target.checked)}
              />
              <span>Routecontact (op de hoogte houden van leveringswijzigingen)</span>
            </div>
            <div className="checkbox-group" style={{ marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={contact.nog_in_dienst && contact.klantenportaal}
                disabled
              />
              <span>Toegang klantportaal</span>
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={addContactpersoon}>
        ➕ Nieuwe contactpersoon toevoegen
      </button>
      <div style={{ marginTop: '20px' }}>
        <p><strong>Let op:</strong> Alle wijzigingen worden pas gelogd als je op onderstaande knop drukt.</p>
        <button className="btn btn-success" onClick={saveContactWijzigingen}>
          Log wijzigingen naar klantenservice to-do
        </button>
      </div>
    </div>
  </div>
);

export default ContactpersonenTab; 