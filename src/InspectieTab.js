import React from 'react';

const InspectieTab = ({
  formData,
  setFormData,
  mattenConcurrenten,
  setMattenConcurrenten,
  wissersConcurrenten,
  setWissersConcurrenten,
  standaardMattenData,
  setStandaardMattenData,
  logomattenData,
  setLogomattenData,
  wissersData,
  setWissersData,
  toebehorenData,
  setToebehorenData,
  updateStandaardMatData,
  updateLogomatData,
  updateWisserData,
  updateToebehorenData,
  updateAlgemeenValue,
  berekenLeeftijd,
  toBool,
  boolToJaNee,
  saveInspectie,
  generatePDF,
  loading
}) => (
  <div className="card">
    <h2>Inspectie Formulier</h2>
    
    <div className="form-group">
      <label>Relatienummer:</label>
      <input
        type="text"
        className="form-control"
        value={formData.relatienummer}
        onChange={(e) => setFormData({...formData, relatienummer: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Klantnaam:</label>
      <input
        type="text"
        className="form-control"
        value={formData.klantnaam}
        onChange={(e) => setFormData({...formData, klantnaam: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Contactpersoon:</label>
      <input
        type="text"
        className="form-control"
        value={formData.contactpersoon}
        onChange={(e) => setFormData({...formData, contactpersoon: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Contact Email:</label>
      <input
        type="email"
        className="form-control"
        value={formData.contact_email}
        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Inspecteur:</label>
      <input
        type="text"
        className="form-control"
        value={formData.inspecteur}
        onChange={(e) => setFormData({...formData, inspecteur: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Datum:</label>
      <input
        type="date"
        className="form-control"
        value={formData.datum}
        onChange={(e) => setFormData({...formData, datum: e.target.value})}
      />
    </div>

    <div className="form-group">
      <label>Tijd:</label>
      <input
        type="time"
        className="form-control"
        value={formData.tijd}
        onChange={(e) => setFormData({...formData, tijd: e.target.value})}
      />
    </div>

    <div className="card">
      <h3>Algemeen</h3>
      <div className="form-group">
        <label>Opmerkingen:</label>
        <textarea
          className="form-control"
          rows="3"
          value={formData.algemeen_values.opmerkingen || ''}
          onChange={(e) => updateAlgemeenValue('opmerkingen', e.target.value)}
        />
      </div>
    </div>

    <div className="card">
      <h3>Matten</h3>
      
      {/* Concurrenten sectie voor matten */}
      <div className="form-group">
        <label>Zien we matten van de concurrent liggen?</label>
        <div className="checkbox-group">
          <input
            type="radio"
            name="andere_mat_aanwezig"
            value="Nee"
            checked={mattenConcurrenten.andere_mat_aanwezig === 'Nee'}
            onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, andere_mat_aanwezig: e.target.value})}
          />
          <span>Nee</span>
          <input
            type="radio"
            name="andere_mat_aanwezig"
            value="Ja"
            checked={mattenConcurrenten.andere_mat_aanwezig === 'Ja'}
            onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, andere_mat_aanwezig: e.target.value})}
          />
          <span>Ja</span>
        </div>
      </div>

      {mattenConcurrenten.andere_mat_aanwezig === 'Ja' && (
        <div className="form-group">
          <label>Van welke concurrent?</label>
          <select
            className="form-control"
            value={mattenConcurrenten.andere_mat_concurrent}
            onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, andere_mat_concurrent: e.target.value})}
          >
            <option value="">Selecteer concurrent</option>
            <option value="CWS">CWS</option>
            <option value="ELIS">ELIS</option>
            <option value="Quality Service">Quality Service</option>
            <option value="Vendrig">Vendrig</option>
            <option value="Mewa">Mewa</option>
            <option value="Anders">Anders namelijk:</option>
          </select>
          {mattenConcurrenten.andere_mat_concurrent === 'Anders' && (
            <input
              type="text"
              className="form-control"
              placeholder="Welke andere concurrent?"
              value={mattenConcurrenten.andere_mat_concurrent === 'Anders' ? '' : mattenConcurrenten.andere_mat_concurrent}
              onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, andere_mat_concurrent: e.target.value})}
            />
          )}
          <label>Aantal matten van concurrent:</label>
          <input
            type="number"
            className="form-control"
            min="0"
            value={mattenConcurrenten.aantal_concurrent}
            onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, aantal_concurrent: parseInt(e.target.value) || 0})}
          />
        </div>
      )}

      <div className="form-group">
        <label>Aantal koop matten:</label>
        <input
          type="number"
          className="form-control"
          min="0"
          value={mattenConcurrenten.aantal_koop}
          onChange={(e) => setMattenConcurrenten({...mattenConcurrenten, aantal_koop: parseInt(e.target.value) || 0})}
        />
      </div>

      {/* Standaard matten sectie */}
      <h4>Standaard Matten</h4>
      <div className="responsive-table">
        <table className="table">
          <thead>
            <tr>
              <th>Productnummer</th>
              <th>Productomschrijving</th>
              <th>Afdeling</th>
              <th>Ligplaats</th>
              <th>Aantal</th>
              <th>Aanwezig</th>
              <th>Schoon/Onbeschadigd</th>
              <th>Vuilgraad</th>
              <th>Opmerkingen</th>
            </tr>
          </thead>
          <tbody>
            {standaardMattenData.map((mat, index) => (
              <tr key={index}>
                <td>{mat.productnummer}</td>
                <td>{mat.mat_type}</td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.afdeling}
                    onChange={(e) => updateStandaardMatData(index, 'afdeling', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.ligplaats}
                    onChange={(e) => updateStandaardMatData(index, 'ligplaats', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={mat.aantal}
                    onChange={(e) => updateStandaardMatData(index, 'aantal', parseInt(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={toBool(mat.aanwezig)}
                      onChange={(e) => updateStandaardMatData(index, 'aanwezig', e.target.checked)}
                    />
                    <span>{boolToJaNee(toBool(mat.aanwezig))}</span>
                  </div>
                </td>
                <td>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={toBool(mat.schoon_onbeschadigd)}
                      onChange={(e) => updateStandaardMatData(index, 'schoon_onbeschadigd', e.target.checked)}
                    />
                    <span>{boolToJaNee(toBool(mat.schoon_onbeschadigd))}</span>
                  </div>
                </td>
                <td>
                  <select
                    className="form-control"
                    value={mat.vuilgraad_label}
                    onChange={(e) => updateStandaardMatData(index, 'vuilgraad_label', e.target.value)}
                  >
                    <option value="">Selecteer</option>
                    <option value="Schoon">Schoon</option>
                    <option value="Licht vervuild">Licht vervuild</option>
                    <option value="Sterk vervuild">Sterk vervuild</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.opmerkingen || ''}
                    onChange={(e) => updateStandaardMatData(index, 'opmerkingen', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Logomatten sectie */}
      <h4>Logomatten</h4>
      <div className="responsive-table">
        <table className="table">
          <thead>
            <tr>
              <th>Productnummer</th>
              <th>Productomschrijving</th>
              <th>Afdeling</th>
              <th>Ligplaats</th>
              <th>Aantal</th>
              <th>Aanwezig</th>
              <th>Schoon/Onbeschadigd</th>
              <th>Vuilgraad</th>
              <th>Barcode</th>
              <th>Leeftijd</th>
              <th>Opmerkingen</th>
            </tr>
          </thead>
          <tbody>
            {logomattenData.map((mat, index) => (
              <tr key={index}>
                <td>{mat.productnummer}</td>
                <td>{mat.mat_type}</td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.afdeling}
                    onChange={(e) => updateLogomatData(index, 'afdeling', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.ligplaats}
                    onChange={(e) => updateLogomatData(index, 'ligplaats', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={mat.aantal}
                    onChange={(e) => updateLogomatData(index, 'aantal', parseInt(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={toBool(mat.aanwezig)}
                      onChange={(e) => updateLogomatData(index, 'aanwezig', e.target.checked)}
                    />
                    <span>{boolToJaNee(toBool(mat.aanwezig))}</span>
                  </div>
                </td>
                <td>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={toBool(mat.schoon_onbeschadigd)}
                      onChange={(e) => updateLogomatData(index, 'schoon_onbeschadigd', e.target.checked)}
                    />
                    <span>{boolToJaNee(toBool(mat.schoon_onbeschadigd))}</span>
                  </div>
                </td>
                <td>
                  <select
                    className="form-control"
                    value={mat.vuilgraad_label}
                    onChange={(e) => updateLogomatData(index, 'vuilgraad_label', e.target.value)}
                  >
                    <option value="">Selecteer</option>
                    <option value="Schoon">Schoon</option>
                    <option value="Licht vervuild">Licht vervuild</option>
                    <option value="Sterk vervuild">Sterk vervuild</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.barcode || ''}
                    onChange={(e) => updateLogomatData(index, 'barcode', e.target.value)}
                    placeholder="Vul barcode in (bijv. 0300522)"
                  />
                </td>
                <td>{berekenLeeftijd(mat.barcode)}</td>
                <td>
                  <input
                    type="text"
                    className="form-control"
                    value={mat.opmerkingen || ''}
                    onChange={(e) => updateLogomatData(index, 'opmerkingen', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="card">
      <h3>Wissers</h3>
      
      {/* Concurrenten sectie voor wissers */}
      <div className="form-group">
        <label>Zien we wissers van concurrenten staan?</label>
        <div className="checkbox-group">
          <input
            type="radio"
            name="wissers_concurrent"
            value="Nee"
            checked={wissersConcurrenten.wissers_concurrent === 'Nee'}
            onChange={(e) => setWissersConcurrenten({...wissersConcurrenten, wissers_concurrent: e.target.value})}
          />
          <span>Nee</span>
          <input
            type="radio"
            name="wissers_concurrent"
            value="Ja"
            checked={wissersConcurrenten.wissers_concurrent === 'Ja'}
            onChange={(e) => setWissersConcurrenten({...wissersConcurrenten, wissers_concurrent: e.target.value})}
          />
          <span>Ja</span>
        </div>
      </div>

      {wissersConcurrenten.wissers_concurrent === 'Ja' && (
        <div className="form-group">
          <label>Van welke concurrent?</label>
          <select
            className="form-control"
            value={wissersConcurrenten.wissers_concurrent_concurrent}
            onChange={(e) => setWissersConcurrenten({...wissersConcurrenten, wissers_concurrent_concurrent: e.target.value})}
          >
            <option value="">Selecteer concurrent</option>
            <option value="CWS">CWS</option>
            <option value="ELIS">ELIS</option>
            <option value="Quality Service">Quality Service</option>
            <option value="Vendrig">Vendrig</option>
            <option value="Mewa">Mewa</option>
            <option value="Anders">Anders namelijk:</option>
          </select>
          {wissersConcurrenten.wissers_concurrent_concurrent === 'Anders' && (
            <input
              type="text"
              className="form-control"
              placeholder="Welke andere concurrent?"
              value={wissersConcurrenten.wissers_concurrent_concurrent === 'Anders' ? '' : wissersConcurrenten.wissers_concurrent_concurrent}
              onChange={(e) => setWissersConcurrenten({...wissersConcurrenten, wissers_concurrent_concurrent: e.target.value})}
            />
          )}
        </div>
      )}

      <div className="form-group">
        <label>Zie je andere schoonmaakmiddelen staan?</label>
        <textarea
          className="form-control"
          rows="3"
          value={wissersConcurrenten.andere_zaken}
          onChange={(e) => setWissersConcurrenten({...wissersConcurrenten, andere_zaken: e.target.value})}
          placeholder="Bezems, wissers van andere leveranciers, etc."
        />
      </div>

      {/* Wissers tabel */}
      <h4>Aantal wissers</h4>
      <div className="responsive-table">
        <table className="table">
          <thead>
            <tr>
              <th>Artikel</th>
              <th>Aantal geteld</th>
              <th>Waarvan gebruikt</th>
            </tr>
          </thead>
          <tbody>
            {wissersData.map((wisser, index) => (
              <tr key={index}>
                <td>{wisser.artikel}</td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={wisser.aantal_geteld}
                    onChange={(e) => updateWisserData(index, 'aantal_geteld', parseInt(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={wisser.waarvan_gebruikt}
                    onChange={(e) => updateWisserData(index, 'waarvan_gebruikt', parseInt(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toebehoren tabel */}
      <h4>Stelen en toebehoren</h4>
      <div className="responsive-table">
        <table className="table">
          <thead>
            <tr>
              <th>Artikel</th>
              <th>Vervangen</th>
              <th>Aantal</th>
            </tr>
          </thead>
          <tbody>
            {toebehorenData.map((toebehoren, index) => (
              <tr key={index}>
                <td>{toebehoren.artikel}</td>
                <td>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={toBool(toebehoren.vervangen)}
                      onChange={(e) => updateToebehorenData(index, 'vervangen', e.target.checked)}
                    />
                    <span>{boolToJaNee(toBool(toebehoren.vervangen))}</span>
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    value={toebehoren.aantal}
                    onChange={(e) => updateToebehorenData(index, 'aantal', parseInt(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="card">
      <h3>Feedback Klant</h3>
      <div className="form-group">
        <label>Heeft de klant feedback of opmerkingen?</label>
        <textarea
          className="form-control"
          rows="3"
          value={formData.algemeen_values.klant_feedback || ''}
          onChange={(e) => updateAlgemeenValue('klant_feedback', e.target.value)}
          placeholder="Vul hier eventuele feedback van de klant in..."
        />
      </div>
    </div>

    <div style={{ marginTop: '20px' }}>
      <button className="btn btn-primary" onClick={saveInspectie} disabled={loading}>
        {loading ? 'Opslaan...' : 'Inspectie Opslaan'}
      </button>
      <button className="btn btn-secondary" onClick={generatePDF} disabled={loading} style={{ marginLeft: '10px' }}>
        {loading ? 'Genereren...' : 'PDF Genereren'}
      </button>
    </div>
  </div>
);

export default InspectieTab; 