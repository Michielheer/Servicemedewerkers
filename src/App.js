import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css';

// Hardcoded data - Standaard matten (productnummer start met 00M)
const HARDCODED_STANDAARD_MATTEN = [
  {
    productnummer: "00M001",
    mat_type: "Standaard mat 60x90",
    afdeling: "Ingang",
    ligplaats: "Hoofdingang",
    aantal: 2,
    aanwezig: true,
    schoon_onbeschadigd: true,
    vuilgraad_label: "Schoon",
    barcode: "",
    opmerkingen: ""
  },
  {
    productnummer: "00M002", 
    mat_type: "Standaard mat 90x120",
    afdeling: "Kantoor",
    ligplaats: "Receptie",
    aantal: 1,
    aanwezig: true,
    schoon_onbeschadigd: false,
    vuilgraad_label: "Licht vervuild",
    barcode: "",
    opmerkingen: "Vervangen nodig"
  }
];

// Logomatten (productnummer start met L)
const HARDCODED_LOGOMATTEN = [
  {
    productnummer: "L001",
    mat_type: "Logo mat Lavans",
    afdeling: "Ingang",
    ligplaats: "Hoofdingang",
    aantal: 1,
    aanwezig: true,
    schoon_onbeschadigd: true,
    vuilgraad_label: "Schoon",
    barcode: "0300522",
    opmerkingen: ""
  },
  {
    productnummer: "L002",
    mat_type: "Logo mat Klant",
    afdeling: "Receptie",
    ligplaats: "Receptie",
    aantal: 1,
    aanwezig: false,
    schoon_onbeschadigd: false,
    vuilgraad_label: "Sterk vervuild",
    barcode: "0300623",
    opmerkingen: "Niet aanwezig"
  }
];

// Wissers data (zoals in Streamlit app)
const HARDCODED_WISSERS = [
  {
    artikel: "Snelwisser 50 cm",
    aantal_geteld: 0,
    waarvan_gebruikt: 0
  },
  {
    artikel: "Steel met clip snelwisser aluminium",
    aantal_geteld: 0,
    waarvan_gebruikt: 0
  },
  {
    artikel: "Opvangbak snelwisser 50 cm",
    aantal_geteld: 0,
    waarvan_gebruikt: 0
  }
];

// Toebehoren data
const HARDCODED_TOEBEHOREN = [
  {
    artikel: "Rooster opvangbak 50 cm",
    vervangen: false,
    aantal: 0
  },
  {
    artikel: "Muursteun snelwisser",
    vervangen: false,
    aantal: 0
  }
];

// Hardcoded contactpersonen data
const HARDCODED_CONTACTPERSONEN = [
  {
    voornaam: "Jan",
    tussenvoegsel: "",
    achternaam: "Jansen",
    email: "jan.jansen@bedrijf.nl",
    telefoon: "06-12345678",
    klantenportaal: "jan.jansen",
    nog_in_dienst: true,
    routecontact: true
  },
  {
    voornaam: "Piet",
    tussenvoegsel: "van",
    achternaam: "Pietersen",
    email: "piet.pietersen@bedrijf.nl",
    telefoon: "06-87654321",
    klantenportaal: "",
    nog_in_dienst: true,
    routecontact: false
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('inspectie');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    relatienummer: '',
    klantnaam: '',
    contactpersoon: '',
    contact_email: '',
    inspecteur: '',
    datum: format(new Date(), 'yyyy-MM-dd'),
    tijd: format(new Date(), 'HH:mm'),
    algemeen_values: {}
  });

  // Concurrenten state
  const [mattenConcurrenten, setMattenConcurrenten] = useState({
    andere_mat_aanwezig: 'Nee',
    andere_mat_concurrent: '',
    aantal_concurrent: 0,
    aantal_koop: 0
  });

  const [wissersConcurrenten, setWissersConcurrenten] = useState({
    wissers_concurrent: 'Nee',
    wissers_concurrent_concurrent: '',
    wissers_concurrent_toelichting: '',
    andere_zaken: ''
  });

  // Data state
  const [standaardMattenData, setStandaardMattenData] = useState([]);
  const [logomattenData, setLogomattenData] = useState([]);
  const [wissersData, setWissersData] = useState([]);
  const [toebehorenData, setToebehorenData] = useState([]);
  const [todoList, setTodoList] = useState([]);
  const [klantenserviceTodoList, setKlantenserviceTodoList] = useState([]);
  const [contactpersonen, setContactpersonen] = useState([]);

  // Helper functies
  const formatNaam = (voornaam, tussenvoegsel, achternaam) => {
    const v = voornaam && voornaam !== 'None' ? voornaam : '';
    const t = tussenvoegsel && tussenvoegsel !== 'None' ? tussenvoegsel : '';
    const a = achternaam && achternaam !== 'None' ? achternaam : '';
    return `${v} ${t} ${a}`.replace(/\s+/g, ' ').trim();
  };

  const berekenLeeftijd = (barcode) => {
    if (!barcode || barcode.toString().length < 7) {
      return '-';
    }
    
    try {
      const barcodeStr = barcode.toString().trim();
      
      if (barcodeStr.length >= 7) {
        const maandDigit = barcodeStr[4];
        const jaarDigits = barcodeStr.slice(5, 7);
        
        const maand = parseInt(maandDigit);
        const jaar = parseInt(jaarDigits);
        
        if (maand < 1 || maand > 12) {
          return `Onbekend (maand ${maand} ongeldig)`;
        }
        
        const volledigJaar = 2000 + jaar;
        const productieDatum = new Date(volledigJaar, maand - 1, 1);
        const vandaag = new Date();
        const leeftijdDagen = Math.floor((vandaag - productieDatum) / (1000 * 60 * 60 * 24));
        const leeftijdMaanden = Math.floor(leeftijdDagen / 30);
        
        if (leeftijdMaanden < 0) {
          return 'Onbekend (toekomstige datum)';
        }
        
        if (leeftijdMaanden < 12) {
          return `${leeftijdMaanden} maanden`;
        } else {
          const leeftijdJaren = Math.floor(leeftijdMaanden / 12);
          const resterendeMaanden = leeftijdMaanden % 12;
          if (resterendeMaanden === 0) {
            return `${leeftijdJaren} jaar`;
          } else {
            return `${leeftijdJaren} jaar en ${resterendeMaanden} maanden`;
          }
        }
      } else {
        return 'Onbekend (te kort)';
      }
    } catch (e) {
      return `Onbekend (fout: ${e})`;
    }
  };

  const toBool = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const v = val.trim().toLowerCase();
      if (['true', 'ja', '1', 'yes'].includes(v)) return true;
      if (['false', 'nee', '0', 'no', ''].includes(v)) return false;
      return false;
    }
    if (typeof val === 'number') return val === 1;
    return false;
  };

  const boolToJaNee = (val) => {
    return val ? 'Ja' : 'Nee';
  };

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const loadData = () => {
    // Laad hardcoded data
    setStandaardMattenData([...HARDCODED_STANDAARD_MATTEN]);
    setLogomattenData([...HARDCODED_LOGOMATTEN]);
    setWissersData([...HARDCODED_WISSERS]);
    setToebehorenData([...HARDCODED_TOEBEHOREN]);
    setContactpersonen([...HARDCODED_CONTACTPERSONEN]);
  };

  const saveInspectie = async () => {
    try {
      setLoading(true);
      
      const inspectieData = {
        id: Date.now(),
        relatienummer: formData.relatienummer,
        klantnaam: formData.klantnaam,
        contactpersoon: formData.contactpersoon,
        contact_email: formData.contact_email,
        inspecteur: formData.inspecteur,
        datum: formData.datum,
        tijd: formData.tijd,
        standaard_matten_data: standaardMattenData,
        logomatten_data: logomattenData,
        wissers_data: wissersData,
        toebehoren_data: toebehorenData,
        matten_concurrenten: mattenConcurrenten,
        wissers_concurrenten: wissersConcurrenten,
        algemeen_values: formData.algemeen_values,
        created_at: new Date().toISOString()
      };

      showMessage('Inspectie succesvol opgeslagen!', 'success');
      
      // Genereer to-do's
      generateTodosSlim();
      
    } catch (error) {
      showMessage(`Fout bij opslaan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Nieuwe slimme to-do logica
  const generateTodosSlim = () => {
    const serviceTodos = [];
    const klantenserviceTodos = [];

    // Matten (standaard en logo)
    [...standaardMattenData, ...logomattenData].forEach(mat => {
      const matNaam = mat.mat_type || 'Onbekend';
      const afdeling = mat.afdeling || '';
      const ligplaats = mat.ligplaats || '';
      const locatie = (afdeling || ligplaats) ? ` (${afdeling}, ${ligplaats})` : '';
      if (!mat.aanwezig) {
        serviceTodos.push(`Controleer waarom mat '${matNaam}'${locatie} niet aanwezig is.`);
      }
      if ((mat.aantal ?? 1) === 0) {
        serviceTodos.push(`Controleer of mat '${matNaam}'${locatie} verwijderd moet worden.`);
      }
      if (mat.vuilgraad_label === 'Sterk vervuild') {
        serviceTodos.push(`Mat '${matNaam}'${locatie} vervangen of reinigen (sterk vervuild).`);
      }
      if (mat.schoon_onbeschadigd === false) {
        serviceTodos.push(`Mat '${matNaam}'${locatie} inspecteren op schade.`);
      }
      if ((mat.opmerkingen || '').trim()) {
        serviceTodos.push(`Controleer opmerking bij mat '${matNaam}'${locatie}: ${mat.opmerkingen}`);
      }
      if (afdeling === 'Algemeen' && ligplaats === 'Algemeen') {
        serviceTodos.push(`Ligplaats controleren en aanpassen in TMS voor mat ${matNaam} (nu: Algemeen/Algemeen).`);
      }
      // Jaarcheck logomatten: alleen voor logomatten
      if (mat.barcode && matNaam.toLowerCase().includes('logo')) {
        const leeftijdStr = berekenLeeftijd(mat.barcode);
        const match = leeftijdStr.match(/(\d+) jaar/);
        if (match && parseInt(match[1]) >= 3) {
          serviceTodos.push(`Controleer logomat '${matNaam}' (ouder dan 3 jaar)`);
          klantenserviceTodos.push(`Logomat ouder dan 3 jaar bij klant '${matNaam}': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen.`);
          if (parseInt(match[1]) >= 4) {
            const repScore = mat.representativiteitsscore ?? 100;
            if (repScore < 70) {
              serviceTodos.push(`Logomat '${matNaam}'${locatie} moet vervangen worden: ouder dan 4 jaar en representativiteitsscore te laag.`);
            }
          }
        }
      }
    });

    // Wissers
    wissersData.forEach(wisser => {
      const wisserType = wisser.artikel || 'Onbekend';
      if ((wisser.aantal_geteld ?? 0) === 0) {
        serviceTodos.push(`Controleer of wisser van type '${wisserType}' verwijderd moet worden.`);
      }
      if ((wisser.opmerkingen || '').trim()) {
        serviceTodos.push(`Controleer opmerking bij wisser van type '${wisserType}': ${wisser.opmerkingen}`);
      }
      // Upsell kans bij hoog verbruik (optioneel, als vuil percentage beschikbaar is)
      if (wisser.vuil_percentage !== undefined && wisser.vuil_percentage !== null) {
        const perc = parseFloat(wisser.vuil_percentage);
        if (!isNaN(perc) && perc > 70) {
          serviceTodos.push(`Upsell kans: ${wisserType} heeft hoog verbruik (${perc}% vuil). Overweeg extra wissers aan te bieden.`);
        }
      }
    });

    // Toebehoren
    toebehorenData.forEach(acc => {
      const accType = acc.artikel || 'Onbekend';
      const aantal = acc.aantal ?? 0;
      if (acc.vervangen && aantal > 0) {
        serviceTodos.push(`Vervang ${aantal}x '${accType}' bij wissers.`);
      }
      if ((acc.opmerkingen || '').trim()) {
        serviceTodos.push(`Controleer opmerking bij toebehoren '${accType}': ${acc.opmerkingen}`);
      }
    });

    setTodoList(serviceTodos.map(text => ({ text, done: false })));
    setKlantenserviceTodoList(klantenserviceTodos.map(text => ({ text, done: false })));
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      
      const element = document.getElementById('rapport-content');
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`rapport_${formData.relatienummer}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      showMessage('PDF succesvol gegenereerd!', 'success');
      
    } catch (error) {
      showMessage(`Fout bij genereren PDF: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStandaardMatData = (index, field, value) => {
    const newData = [...standaardMattenData];
    newData[index] = { ...newData[index], [field]: value };
    setStandaardMattenData(newData);
  };

  const updateLogomatData = (index, field, value) => {
    const newData = [...logomattenData];
    newData[index] = { ...newData[index], [field]: value };
    setLogomattenData(newData);
  };

  const updateWisserData = (index, field, value) => {
    const newData = [...wissersData];
    newData[index] = { ...newData[index], [field]: value };
    setWissersData(newData);
  };

  const updateToebehorenData = (index, field, value) => {
    const newData = [...toebehorenData];
    newData[index] = { ...newData[index], [field]: value };
    setToebehorenData(newData);
  };

  const updateContactpersoon = (index, field, value) => {
    const newData = [...contactpersonen];
    newData[index] = { ...newData[index], [field]: value };
    setContactpersonen(newData);
  };

  const updateAlgemeenValue = (key, value) => {
    setFormData(prev => ({
      ...prev,
      algemeen_values: {
        ...prev.algemeen_values,
        [key]: value
      }
    }));
  };

  const addContactpersoon = () => {
    setContactpersonen([...contactpersonen, {
      voornaam: '',
      tussenvoegsel: '',
      achternaam: '',
      email: '',
      telefoon: '',
      klantenportaal: '',
      nog_in_dienst: true,
      routecontact: false
    }]);
  };

  const removeContactpersoon = (index) => {
    const newData = [...contactpersonen];
    newData.splice(index, 1);
    setContactpersonen(newData);
  };

  const saveContactWijzigingen = () => {
    const nieuweTodos = [];
    
    contactpersonen.forEach(contact => {
      const naam = formatNaam(contact.voornaam, contact.tussenvoegsel, contact.achternaam);
      
      // Check voor nieuwe contactpersonen
      if (contact.nog_in_dienst && !contact.email) {
        nieuweTodos.push(`Nieuwe contactpersoon toevoegen: ${naam}`);
      }
      
      // Check voor klantportaal uitnodiging
      if (contact.nog_in_dienst && !contact.klantenportaal) {
        nieuweTodos.push(`Uitnodigen klantportaal voor ${contact.email}`);
      }
      
      // Check voor niet meer in dienst
      if (!contact.nog_in_dienst) {
        nieuweTodos.push(`Contactpersoon ${naam} (${contact.email}) is niet meer in dienst. Controleer en update CRM.`);
      }
    });
    
    setKlantenserviceTodoList(nieuweTodos.map(text => ({ text, done: false })));
    showMessage('Wijzigingen gelogd en to-do\'s voor klantenservice toegevoegd!', 'success');
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderInspectieForm = () => (
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

  const renderTodoList = () => (
    <div className="card">
      <h2>To-Do Lijsten</h2>
      
      <div className="card">
        <h3>Service To-Do's</h3>
        <ul>
          {todoList.map((todo, index) => (
            <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={(e) => {
                  const newList = [...todoList];
                  newList[index].done = e.target.checked;
                  setTodoList(newList);
                }}
              />
              {todo.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Klantenservice To-Do's</h3>
        <ul>
          {klantenserviceTodoList.map((todo, index) => (
            <li key={index} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={(e) => {
                  const newList = [...klantenserviceTodoList];
                  newList[index].done = e.target.checked;
                  setKlantenserviceTodoList(newList);
                }}
              />
              {todo.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderContactpersonen = () => (
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



  return (
    <div className="App">
      <div className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <img src="/Logo-Lavans-png.png" alt="Lavans logo" style={{ maxWidth: 250, marginBottom: 10 }} />
        <h1>Lavans Service App</h1>
        <p>Ideaal Servicemoment</p>
      </div>

      <div className="container">
        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'inspectie' ? 'active' : ''}`}
            onClick={() => setActiveTab('inspectie')}
          >
            Inspectie
          </button>
          <button
            className={`tab ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            To-Do's
          </button>
          <button
            className={`tab ${activeTab === 'contactpersonen' ? 'active' : ''}`}
            onClick={() => setActiveTab('contactpersonen')}
          >
            Contactpersonen
          </button>

        </div>

        {activeTab === 'inspectie' && renderInspectieForm()}
        {activeTab === 'todos' && renderTodoList()}
        {activeTab === 'contactpersonen' && renderContactpersonen()}

        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{modalTitle}</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  ×
                </button>
              </div>
              <div dangerouslySetInnerHTML={{ __html: modalContent }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 