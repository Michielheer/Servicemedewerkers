import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css';
import InspectieTab from './InspectieTab';
import TodoTab from './TodoTab';
import ContactpersonenTab from './ContactpersonenTab';

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
  },
  {
    productnummer: "00M003",
    mat_type: "Standaard mat 120x180",
    afdeling: "Magazijn",
    ligplaats: "Ingang magazijn",
    aantal: 3,
    aanwezig: false,
    schoon_onbeschadigd: false,
    vuilgraad_label: "Sterk vervuild",
    barcode: "",
    opmerkingen: "Niet aanwezig - controleren"
  },
  {
    productnummer: "00M004",
    mat_type: "Standaard mat 60x90",
    afdeling: "Algemeen",
    ligplaats: "Algemeen",
    aantal: 1,
    aanwezig: true,
    schoon_onbeschadigd: true,
    vuilgraad_label: "Schoon",
    barcode: "",
    opmerkingen: "Ligplaats aanpassen in TMS"
  },
  {
    productnummer: "00M005",
    mat_type: "Standaard mat 90x120",
    afdeling: "Kantine",
    ligplaats: "Ingang kantine",
    aantal: 2,
    aanwezig: true,
    schoon_onbeschadigd: false,
    vuilgraad_label: "Licht vervuild",
    barcode: "",
    opmerkingen: "Reinigen nodig"
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
  },
  {
    productnummer: "L003",
    mat_type: "Logo mat Oud (3+ jaar)",
    afdeling: "Kantoor",
    ligplaats: "Kantoor ingang",
    aantal: 1,
    aanwezig: true,
    schoon_onbeschadigd: true,
    vuilgraad_label: "Schoon",
    barcode: "0300120", // januari 2020 - 4+ jaar oud
    opmerkingen: "Ouder dan 4 jaar - vervangen"
  },
  {
    productnummer: "L004",
    mat_type: "Logo mat Klant 2",
    afdeling: "Algemeen",
    ligplaats: "Algemeen",
    aantal: 1,
    aanwezig: true,
    schoon_onbeschadigd: false,
    vuilgraad_label: "Licht vervuild",
    barcode: "0300321", // maart 2021 - 3+ jaar oud
    opmerkingen: "Ligplaats aanpassen"
  },
  {
    productnummer: "L005",
    mat_type: "Logo mat Klant 3",
    afdeling: "Magazijn",
    ligplaats: "Magazijn ingang",
    aantal: 2,
    aanwezig: true,
    schoon_onbeschadigd: true,
    vuilgraad_label: "Schoon",
    barcode: "0300622", // juni 2022 - 2 jaar oud
    opmerkingen: ""
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
  },
  {
    artikel: "Snelwisser 40 cm",
    aantal_geteld: 0,
    waarvan_gebruikt: 0
  },
  {
    artikel: "Steel met clip snelwisser kunststof",
    aantal_geteld: 0,
    waarvan_gebruikt: 0
  },
  {
    artikel: "Opvangbak snelwisser 40 cm",
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
  },
  {
    artikel: "Rooster opvangbak 40 cm",
    vervangen: false,
    aantal: 0
  },
  {
    artikel: "Muursteun snelwisser kunststof",
    vervangen: false,
    aantal: 0
  },
  {
    artikel: "Clip snelwisser aluminium",
    vervangen: false,
    aantal: 0
  },
  {
    artikel: "Clip snelwisser kunststof",
    vervangen: false,
    aantal: 0
  }
];

// Hardcoded CRM klanten data (zoals uit database)
const HARDCODED_CRM_KLANTEN = [
  {
    relatienummer: "K001",
    klantnaam: "Multihuur BV",
    adres: "Hoofdstraat 123",
    postcode: "1234 AB",
    plaats: "Amsterdam",
    telefoon: "020-1234567",
    email: "info@multihuur.nl",
    contactpersonen: [
      {
        voornaam: "Julian",
        tussenvoegsel: "",
        achternaam: "Vervoort",
        email: "verhuur@multihuur.nl",
        telefoon: "06-12345678",
        functie: "Facility Manager",
        routecontact: true,
        klantenportaal: "julian.vervoort",
        nog_in_dienst: true
      },
      {
        voornaam: "Lisa",
        tussenvoegsel: "",
        achternaam: "Jansen",
        email: "lisa@multihuur.nl",
        telefoon: "06-87654321",
        functie: "Receptie",
        routecontact: false,
        klantenportaal: "",
        nog_in_dienst: true
      }
    ]
  },
  {
    relatienummer: "K002",
    klantnaam: "TechCorp Nederland",
    adres: "Innovatielaan 45",
    postcode: "5678 CD",
    plaats: "Utrecht",
    telefoon: "030-9876543",
    email: "contact@techcorp.nl",
    contactpersonen: [
      {
        voornaam: "Mark",
        tussenvoegsel: "van der",
        achternaam: "Berg",
        email: "mark.berg@techcorp.nl",
        telefoon: "06-11223344",
        functie: "IT Manager",
        routecontact: true,
        klantenportaal: "mark.berg",
        nog_in_dienst: true
      }
    ]
  },
  {
    relatienummer: "K003",
    klantnaam: "Retail Solutions BV",
    adres: "Winkelstraat 789",
    postcode: "9012 EF",
    plaats: "Rotterdam",
    telefoon: "010-5555555",
    email: "info@retailsolutions.nl",
    contactpersonen: [
      {
        voornaam: "Sarah",
        tussenvoegsel: "de",
        achternaam: "Vries",
        email: "sarah.vries@retailsolutions.nl",
        telefoon: "06-55667788",
        functie: "Operations Manager",
        routecontact: true,
        klantenportaal: "sarah.vries",
        nog_in_dienst: true
      },
      {
        voornaam: "Peter",
        tussenvoegsel: "",
        achternaam: "Smit",
        email: "peter.smit@retailsolutions.nl",
        telefoon: "06-99887766",
        functie: "Magazijn Manager",
        routecontact: false,
        klantenportaal: "",
        nog_in_dienst: false
      }
    ]
  },
  {
    relatienummer: "K004",
    klantnaam: "Healthcare Plus",
    adres: "Ziekenhuisweg 321",
    postcode: "3456 GH",
    plaats: "Den Haag",
    telefoon: "070-1111111",
    email: "faciliteiten@healthcareplus.nl",
    contactpersonen: [
      {
        voornaam: "Dr. Anna",
        tussenvoegsel: "",
        achternaam: "Bakker",
        email: "a.bakker@healthcareplus.nl",
        telefoon: "06-33445566",
        functie: "Facility Director",
        routecontact: true,
        klantenportaal: "anna.bakker",
        nog_in_dienst: true
      }
    ]
  },
  {
    relatienummer: "K005",
    klantnaam: "Logistics Pro",
    adres: "Distributieweg 654",
    postcode: "7890 IJ",
    plaats: "Eindhoven",
    telefoon: "040-2222222",
    email: "logistics@logisticspro.nl",
    contactpersonen: [
      {
        voornaam: "Tom",
        tussenvoegsel: "van",
        achternaam: "Dijk",
        email: "tom.dijk@logisticspro.nl",
        telefoon: "06-77889900",
        functie: "Warehouse Manager",
        routecontact: true,
        klantenportaal: "tom.dijk",
        nog_in_dienst: true
      }
    ]
  }
];

// Hardcoded contactpersonen data (voor backward compatibility)
const HARDCODED_CONTACTPERSONEN = [];

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

  // Klant selectie state
  const [selectedKlant, setSelectedKlant] = useState(null);
  const [klantSearchTerm, setKlantSearchTerm] = useState('');
  const [showKlantDropdown, setShowKlantDropdown] = useState(false);

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

  // Klant selectie functies
  const handleKlantSelect = (klant) => {
    setSelectedKlant(klant);
    setFormData(prev => ({
      ...prev,
      relatienummer: klant.relatienummer,
      klantnaam: klant.klantnaam,
      contactpersoon: klant.contactpersonen.find(cp => cp.routecontact)?.voornaam + ' ' + 
                     (klant.contactpersonen.find(cp => cp.routecontact)?.tussenvoegsel || '') + ' ' + 
                     klant.contactpersonen.find(cp => cp.routecontact)?.achternaam || '',
      contact_email: klant.contactpersonen.find(cp => cp.routecontact)?.email || ''
    }));
    setContactpersonen(klant.contactpersonen);
    setKlantSearchTerm(klant.klantnaam);
    setShowKlantDropdown(false);
  };

  const filteredKlanten = HARDCODED_CRM_KLANTEN.filter(klant => 
    klant.klantnaam.toLowerCase().includes(klantSearchTerm.toLowerCase()) ||
    klant.relatienummer.toLowerCase().includes(klantSearchTerm.toLowerCase())
  );

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

  return (
    <div className="App">
      <div className="header">
        <img 
          src="/Logo-Lavans-png.png" 
          alt="Lavans logo" 
          className="header-logo"
        />
        <h1>Lavans Service App</h1>
        <p>Ideaal Servicemoment</p>
      </div>

      <div className="container">
        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}

        <div className="tabs-container">
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
        </div>

        {activeTab === 'inspectie' && (
          <InspectieTab
            formData={formData}
            setFormData={setFormData}
            mattenConcurrenten={mattenConcurrenten}
            setMattenConcurrenten={setMattenConcurrenten}
            wissersConcurrenten={wissersConcurrenten}
            setWissersConcurrenten={setWissersConcurrenten}
            standaardMattenData={standaardMattenData}
            setStandaardMattenData={setStandaardMattenData}
            logomattenData={logomattenData}
            setLogomattenData={setLogomattenData}
            wissersData={wissersData}
            setWissersData={setWissersData}
            toebehorenData={toebehorenData}
            setToebehorenData={setToebehorenData}
            updateStandaardMatData={updateStandaardMatData}
            updateLogomatData={updateLogomatData}
            updateWisserData={updateWisserData}
            updateToebehorenData={updateToebehorenData}
            updateAlgemeenValue={updateAlgemeenValue}
            berekenLeeftijd={berekenLeeftijd}
            toBool={toBool}
            boolToJaNee={boolToJaNee}
            saveInspectie={saveInspectie}
            generatePDF={generatePDF}
            loading={loading}
            // Klant selectie props
            selectedKlant={selectedKlant}
            klantSearchTerm={klantSearchTerm}
            setKlantSearchTerm={setKlantSearchTerm}
            showKlantDropdown={showKlantDropdown}
            setShowKlantDropdown={setShowKlantDropdown}
            filteredKlanten={filteredKlanten}
            handleKlantSelect={handleKlantSelect}
          />
        )}
        {activeTab === 'todos' && (
          <TodoTab
            todoList={todoList}
            setTodoList={setTodoList}
            klantenserviceTodoList={klantenserviceTodoList}
            setKlantenserviceTodoList={setKlantenserviceTodoList}
          />
        )}
        {activeTab === 'contactpersonen' && (
          <ContactpersonenTab
            contactpersonen={contactpersonen}
            setContactpersonen={setContactpersonen}
            addContactpersoon={addContactpersoon}
            removeContactpersoon={removeContactpersoon}
            updateContactpersoon={updateContactpersoon}
            saveContactWijzigingen={saveContactWijzigingen}
            formatNaam={formatNaam}
          />
        )}

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