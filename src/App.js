import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import './App.css';
import InspectieTab from './InspectieTab';
import TodoTab from './TodoTab';
import ContactpersonenTab from './ContactpersonenTab';
import LoginScreen from './LoginScreen';

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

const AUTH_USERS = [
  {
    email: 'michiel.heerkens@lavans.nl',
    password: 'Herfst2025!',
    name: 'Michiel Heerkens',
    role: 'Service Manager',
    initials: 'MH',
    shortName: 'Michiel'
  },
  {
    email: 'tijn.heerkens@lavans.nl',
    password: 'Herfst2025!',
    name: 'Tijn Heerkens',
    role: 'Servicemedewerker',
    initials: 'TH',
    shortName: 'Tijn'
  }
];


function App() {
  const [activeTab, setActiveTab] = useState('inspectie');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    relatienummer: 'K001',
    klantnaam: 'Multihuur BV',
    contactpersoon: 'Julian Vervoort',
    contact_email: 'verhuur@multihuur.nl',
    inspecteur: 'Angelo',
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

  const loadData = useCallback(() => {
    // Laad hardcoded data
    setStandaardMattenData([...HARDCODED_STANDAARD_MATTEN]);
    setLogomattenData([...HARDCODED_LOGOMATTEN]);
    setWissersData([...HARDCODED_WISSERS]);
    setToebehorenData([...HARDCODED_TOEBEHOREN]);
    
    // Laad standaard klant contactpersonen (Multihuur BV)
    const defaultKlant = HARDCODED_CRM_KLANTEN.find(k => k.relatienummer === 'K001');
    if (defaultKlant) {
      setContactpersonen(defaultKlant.contactpersonen);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('lavans_auth_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setIsAuthenticated(true);
        setFormData(prev => ({
          ...prev,
          inspecteur: parsed.shortName || parsed.name || prev.inspecteur
        }));
      } catch (error) {
        console.warn('Kon opgeslagen gebruiker niet lezen:', error);
        localStorage.removeItem('lavans_auth_user');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setStandaardMattenData([]);
      setLogomattenData([]);
      setWissersData([]);
      setToebehorenData([]);
      setTodoList([]);
      setKlantenserviceTodoList([]);
      setContactpersonen([]);
      setSelectedKlant(null);
      setKlantSearchTerm('');
      setShowKlantDropdown(false);
    }
  }, [
    isAuthenticated,
    loadData,
    setContactpersonen,
    setKlantenserviceTodoList,
    setKlantSearchTerm,
    setLogomattenData,
    setSelectedKlant,
    setShowKlantDropdown,
    setStandaardMattenData,
    setTodoList,
    setToebehorenData,
    setWissersData
  ]);

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

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();
      const user = AUTH_USERS.find(u => u.email === normalizedEmail);

      if (!user || user.password !== normalizedPassword) {
        showMessage('Onjuiste combinatie van e-mailadres en wachtwoord.', 'error');
        return false;
      }

      const userInfo = {
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.initials,
        shortName: user.shortName
      };

      setIsAuthenticated(true);
      setCurrentUser(userInfo);
      localStorage.setItem('lavans_auth_user', JSON.stringify(userInfo));

      setFormData(prev => ({
        ...prev,
        inspecteur: user.shortName || user.name,
        datum: format(new Date(), 'yyyy-MM-dd'),
        tijd: format(new Date(), 'HH:mm')
      }));
      setActiveTab('inspectie');
      showMessage(`Welkom terug, ${user.shortName || user.name}!`, 'success');
      return true;
    } catch (error) {
      console.error('Login fout:', error);
      showMessage('Er ging iets mis tijdens het inloggen. Probeer het opnieuw.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lavans_auth_user');
    localStorage.removeItem('lavans_laatste_inspectie');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setFormData({
      relatienummer: 'K001',
      klantnaam: 'Multihuur BV',
      contactpersoon: 'Julian Vervoort',
      contact_email: 'verhuur@multihuur.nl',
      inspecteur: 'Angelo',
      datum: format(new Date(), 'yyyy-MM-dd'),
      tijd: format(new Date(), 'HH:mm'),
      algemeen_values: {}
    });
    showMessage('Je bent uitgelogd.', 'info');
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

      localStorage.setItem('lavans_laatste_inspectie', JSON.stringify(inspectieData));

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

  const sendToTMS = async () => {
    try {
      setLoading(true);
      
      const inspectieData = {
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
        todo_list: todoList,
        klantenservice_todo_list: klantenserviceTodoList,
        created_at: new Date().toISOString()
      };

      // Simuleer API call naar TMS
      const response = await fetch('/api/tms/inspectie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspectieData)
      });

      if (response.ok) {
        showMessage('Inspectie succesvol naar TMS gestuurd!', 'success');
      } else {
        throw new Error('TMS API error');
      }
      
    } catch (error) {
      // Fallback: simuleer succesvolle verzending
      showMessage('Inspectie succesvol naar TMS gestuurd! (Simulatie)', 'success');
      console.log('TMS Data:', {
        relatienummer: formData.relatienummer,
        klantnaam: formData.klantnaam,
        inspecteur: formData.inspecteur,
        datum: formData.datum,
        matten: standaardMattenData.length + logomattenData.length,
        wissers: wissersData.length,
        todos: todoList.length
      });
    } finally {
      setLoading(false);
    }
  };

  const generateExportRapport = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 20;
    let yPosition = 20;
    
    // Lavans kleuren
    const lavansBlue = [0, 51, 102]; // #003366
    const lavansLightBlue = [230, 240, 250]; // #E6F0FA
    const lavansGreen = [0, 128, 64]; // #008040
    
    // Helper function to add text with line breaks - compact voor 1 A4
    const addText = (text, fontSize = 10, isBold = false, color = [0, 0, 0]) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setTextColor(color[0], color[1], color[2]);
      
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      lines.forEach(line => {
        pdf.text(line, margin, yPosition);
        yPosition += 4; // Compactere regelafstand
      });
      yPosition += 1;
    };

    // Helper function to add colored box - compact voor 1 A4
    const addColoredBox = (text, fontSize = 10, isBold = true, bgColor = lavansBlue) => {
      // Colored background - kleiner
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      pdf.rect(margin - 1, yPosition - 2, pageWidth - 2 * margin + 2, 6, 'F');
      
      // White text
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setTextColor(255, 255, 255);
      pdf.text(text, margin, yPosition + 1);
      
      yPosition += 8; // Compactere box hoogte
    };

    // Header met logo plaats - compact
    pdf.setFillColor(lavansLightBlue[0], lavansLightBlue[1], lavansLightBlue[2]);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    // Logo placeholder (tekst voor nu) - compact
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(lavansBlue[0], lavansBlue[1], lavansBlue[2]);
    pdf.text('LAVANS', 20, 10);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Service Inspectie Rapport', 20, 16);
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 20, 21);
    
    yPosition = 35;
    
    // Klant informatie - compact
    addColoredBox('KLANT INFORMATIE', 10, true);
    addText(`${formData.klantnaam} (${formData.relatienummer}) | ${formData.contactpersoon} | ${formData.inspecteur} | ${formData.datum} ${formData.tijd}`, 9);
    addText('', 8);

    // Samenvatting bevindingen - compact
    addColoredBox('SAMENVATTING', 10, true);
    
    // Tel bevindingen
    let totalIssues = 0;
    let criticalIssues = 0;
    let mattenIssues = 0;
    let wissersIssues = 0;
    
    // Tel alle bevindingen
    [...standaardMattenData, ...logomattenData].forEach(mat => {
      if (!mat.aanwezig) {
        mattenIssues++;
        totalIssues++;
        criticalIssues++;
      }
      if (mat.vuilgraad_label === 'Sterk vervuild') {
        mattenIssues++;
        totalIssues++;
        criticalIssues++;
      }
      if (mat.schoon_onbeschadigd === false) {
        mattenIssues++;
        totalIssues++;
      }
      if (mat.opmerkingen && mat.opmerkingen.trim()) {
        mattenIssues++;
        totalIssues++;
      }
    });

    wissersData.forEach(wisser => {
      if (wisser.aantal_geteld === 0) {
        wissersIssues++;
        totalIssues++;
      }
    });

    // Status bepaling
    let status = 'GOED';
    let statusColor = lavansGreen;
    if (criticalIssues > 0) {
      status = 'ATTENTIE NODIG';
      statusColor = [255, 140, 0]; // Oranje
    } else if (totalIssues > 5) {
      status = 'CONTROLE AANBEVOLEN';
      statusColor = [255, 193, 7]; // Geel
    }

    addText(`Status: ${status} | Totaal: ${totalIssues} | Kritiek: ${criticalIssues} | Matten: ${mattenIssues} | Wissers: ${wissersIssues}`, 9, true, statusColor);
    addText('', 8);

    // Detail bevindingen - compact
    addColoredBox('BEVINDINGEN', 10, true);
    
    // Matten
    const mattenBevindingen = [];
    [...standaardMattenData, ...logomattenData].forEach(mat => {
      if (!mat.aanwezig) {
        mattenBevindingen.push(`• ${mat.mat_type} niet aanwezig (${mat.afdeling}, ${mat.ligplaats})`);
      }
      if (mat.vuilgraad_label === 'Sterk vervuild') {
        mattenBevindingen.push(`• ${mat.mat_type} sterk vervuild - vervangen`);
      }
      if (mat.schoon_onbeschadigd === false) {
        mattenBevindingen.push(`• ${mat.mat_type} heeft schade`);
      }
      if (mat.opmerkingen && mat.opmerkingen.trim()) {
        mattenBevindingen.push(`• ${mat.mat_type}: ${mat.opmerkingen}`);
      }
    });

    if (mattenBevindingen.length > 0) {
      addText('MATTEN:', 9, true, lavansBlue);
      mattenBevindingen.forEach(bevinding => addText(bevinding, 8));
    }

    // Wissers
    const wissersBevindingen = [];
    wissersData.forEach(wisser => {
      if (wisser.aantal_geteld === 0) {
        wissersBevindingen.push(`• ${wisser.artikel} niet aanwezig`);
      }
    });

    if (wissersBevindingen.length > 0) {
      addText('WISSERS:', 9, true, lavansBlue);
      wissersBevindingen.forEach(bevinding => addText(bevinding, 8));
    }

    // Actiepunten - compact
    if (todoList.length > 0) {
      addColoredBox('ACTIEPUNTEN', 10, true);
      addText('VOOR LAVANS SERVICE:', 9, true, lavansBlue);
      todoList.slice(0, 3).forEach(todo => { // Max 3 items voor ruimte
        if (!todo.done) {
          addText(`• ${todo.text.length > 60 ? todo.text.substring(0, 60) + '...' : todo.text}`, 8);
        }
      });
      if (todoList.length > 3) {
        addText(`... en ${todoList.length - 3} andere actiepunten`, 8);
      }
    }

    // Klant feedback - compact
    if (formData.algemeen_values.klant_feedback && formData.algemeen_values.klant_feedback.trim()) {
      addColoredBox('KLANT FEEDBACK', 10, true);
      const feedback = formData.algemeen_values.klant_feedback;
      addText(feedback.length > 80 ? feedback.substring(0, 80) + '...' : feedback, 8);
    }

    // Volgende stappen - compact
    addColoredBox('VOLGENDE STAPPEN', 10, true);
    addText('• Lavans neemt bevindingen in behandeling • Kritieke issues binnen 24u • Overige in volgende ronde • Vragen via accountmanager', 8);

    // Footer met styling - compact
    // Footer achtergrond
    pdf.setFillColor(lavansLightBlue[0], lavansLightBlue[1], lavansLightBlue[2]);
    pdf.rect(0, yPosition - 5, pageWidth, 297 - yPosition + 5, 'F');
    
    // Footer tekst - compact
    addText('Lavans Service | Vragen via accountmanager | Gegenereerd: ' + format(new Date(), 'dd-MM-yyyy HH:mm'), 7, false, lavansBlue);

    // Save PDF
    const fileName = `lavans_inspectie_${formData.relatienummer}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    pdf.save(fileName);
    showMessage('Klantrapport succesvol gegenereerd!', 'success');
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

  if (!isAuthenticated) {
    return (
      <div className="App">
        <div className="header">
          <div className="header-top">
            <div className="header-brand">
              <img 
                src="/Logo-Lavans-png.png" 
                alt="Lavans logo" 
                className="header-logo"
              />
            </div>
          </div>
          <h1>Lavans Service App</h1>
          <p>Ideaal Servicemoment</p>
        </div>

        <div className="container">
          {message && (
            <div className={`alert alert-${messageType}`}>
              {message}
            </div>
          )}

          <LoginScreen
            onLogin={handleLogin}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <div className="header-top">
          <div className="header-brand">
            <img 
              src="/Logo-Lavans-png.png" 
              alt="Lavans logo" 
              className="header-logo"
            />
          </div>
          {currentUser && (
            <div className="header-user">
              <div className="header-user-initials">
                {currentUser.initials || (currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : '?')}
              </div>
              <div className="header-user-info">
                <span>{currentUser.name}</span>
                <span>{currentUser.role}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-small logout-btn"
                onClick={handleLogout}
              >
                Uitloggen
              </button>
            </div>
          )}
        </div>
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
            sendToTMS={sendToTMS}
            generateExportRapport={generateExportRapport}
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

      </div>
    </div>
  );
}

export default App; 