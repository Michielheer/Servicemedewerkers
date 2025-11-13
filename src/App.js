import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import './App.css';
import InspectieTab from './InspectieTab';
import TodoTab from './TodoTab';
import ContactpersonenTab from './ContactpersonenTab';
import LoginScreen from './LoginScreen';
import { getDataConfig } from './services/dataConfig';

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

const CSV_SEPARATOR = ';';

const splitCsvLine = (line) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === CSV_SEPARATOR && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
};

const sanitizeCsvCell = (value) => {
  if (value === undefined || value === null) return '';
  let result = value;
  if (typeof result !== 'string') {
    result = String(result);
  }
  result = result.replace(/^\uFEFF/, '').trim();
  if (!result) return '';
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1);
  }
  return result.replace(/""/g, '"').trim();
};

const tidyName = (value) => {
  const text = sanitizeCsvCell(value)
    .replace(/[`´‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /^[-.\s]+$/.test(text)) {
    return '';
  }
  return text.replace(/^[-.\s]+|[-.\s]+$/g, '');
};

const sanitizePhone = (value) => {
  const phone = sanitizeCsvCell(value).replace(/[^0-9+]/g, ' ').replace(/\s+/g, ' ').trim();
  return phone;
};

const choosePhone = (phone, mobile) => {
  const primary = sanitizePhone(phone);
  if (primary) return primary;
  return sanitizePhone(mobile);
};

const normalizeRelatienummer = (value) => {
  const raw = sanitizeCsvCell(value);
  if (!raw) return '';
  const withoutBracket = raw.split('[')[0];
  const base = withoutBracket.split(/\s/)[0];
  return base.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
};

const normalizeRelatieKey = (value) => {
  const raw = sanitizeCsvCell(value);
  if (!raw) return '';
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' en ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
};

const booleanFromJaNee = (value) => {
  const normalized = sanitizeCsvCell(value).toLowerCase();
  if (!normalized) return false;
  return ['ja', 'yes', 'y', 'true', '1'].includes(normalized);
};

const parseNumber = (value, fallback = 0) => {
  const sanitized = sanitizeCsvCell(value);
  if (!sanitized) return fallback;
  const parsed = Number(sanitized.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCsvWithHeader = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];
  const header = splitCsvLine(lines[0]).map(sanitizeCsvCell);
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const columns = splitCsvLine(lines[i]);
    if (columns.length === 1 && columns[0].trim() === '') {
      continue;
    }
    if (columns.length !== header.length) {
      continue;
    }
    const record = {};
    header.forEach((key, index) => {
      record[key] = sanitizeCsvCell(columns[index]);
    });
    rows.push(record);
  }

  return rows;
};

const parseContactpersonenCsv = (csvText) => {
  return parseCsvWithHeader(csvText);
};

const computeContactPriority = (contact) => {
  let score = 0;
  if (contact.nog_in_dienst) score += 5;
  if (contact.routecontact) score += 4;
  if (contact.operationeel) score += 3;
  if (contact.financieel) score += 2;
  if (contact.beslisser) score += 1;
  if (contact.email) score += 0.5;
  return score;
};

const sortContacts = (contacts) =>
  [...contacts].sort((a, b) => computeContactPriority(b) - computeContactPriority(a));

const transformCsvRecord = (raw) => {
  const klantnaam = sanitizeCsvCell(raw.Relatie);
  const relatienummer = normalizeRelatienummer(raw.Relatienummer);

  if (!relatienummer && !klantnaam) {
    return null;
  }

  const contact = {
    bron: 'catalogus',
    relatienummer,
    relatienummerRaw: sanitizeCsvCell(raw.Relatienummer),
    relatieKey: normalizeRelatieKey(klantnaam),
    klantnaam,
    voornaam: tidyName(raw.Voornaam),
    tussenvoegsel: tidyName(raw.Tussenvoegsel),
    achternaam: tidyName(raw.Achternaam),
    email: sanitizeCsvCell(raw['E-mailadres']).toLowerCase(),
    telefoon: choosePhone(raw['Telefoonnummer'], raw['Mobiel nummer']),
    mobiel: sanitizePhone(raw['Mobiel nummer']),
    functie: sanitizeCsvCell(raw.Functies) || sanitizeCsvCell(raw['Aanvullende functie omschrijving']),
    routecontact: booleanFromJaNee(raw.Routecontact),
    operationeel: booleanFromJaNee(raw['Operationeel contact']),
    financieel: booleanFromJaNee(raw['Financieel contact']),
    beslisser: booleanFromJaNee(raw['Rol beslisser']),
    rolGebruiker: sanitizeCsvCell(raw['Rol gebruiker']),
    nog_in_dienst: booleanFromJaNee(raw.Actief),
    klantenportaal: sanitizeCsvCell(raw['Klantenportaal gebruikersnaam']),
  };

  if (!contact.voornaam && !contact.achternaam) {
    const fallback = tidyName(raw.Voornaam || raw.Achternaam || '');
    if (fallback.includes(' ')) {
      const parts = fallback.split(' ');
      contact.voornaam = parts.slice(0, -1).join(' ');
      contact.achternaam = parts.slice(-1).join('');
    } else {
      contact.voornaam = fallback;
    }
  }

  return contact;
};

const buildContactCatalogFromRecords = (records) => {
  const byRelatienummer = {};
  const byRelatie = {};

  records.forEach((record) => {
    const contact = transformCsvRecord(record);
    if (!contact) return;

    if (contact.relatienummer) {
      if (!byRelatienummer[contact.relatienummer]) {
        byRelatienummer[contact.relatienummer] = [];
      }
      byRelatienummer[contact.relatienummer].push(contact);
    }

    if (contact.relatieKey) {
      if (!byRelatie[contact.relatieKey]) {
        byRelatie[contact.relatieKey] = [];
      }
      byRelatie[contact.relatieKey].push(contact);
    }
  });

  Object.keys(byRelatienummer).forEach((key) => {
    byRelatienummer[key] = sortContacts(byRelatienummer[key]);
  });
  Object.keys(byRelatie).forEach((key) => {
    byRelatie[key] = sortContacts(byRelatie[key]);
  });

  return {
    byRelatienummer,
    byRelatie,
    total: Object.values(byRelatienummer).reduce((sum, list) => sum + list.length, 0),
  };
};

const cloneContactRecord = (record) => ({
  ...record,
  routecontact: !!record.routecontact,
  operationeel: !!record.operationeel,
  financieel: !!record.financieel,
  beslisser: !!record.beslisser,
  nog_in_dienst: record.nog_in_dienst !== false,
  bron: record.bron || 'handmatig',
});

const resolveContactsFromCatalog = (catalog, relatienummer, klantnaam, fallback = []) => {
  const hasCatalog = catalog && catalog.loaded;
  const normalizedRelNr = normalizeRelatienummer(relatienummer);
  const normalizedName = normalizeRelatieKey(klantnaam);

  if (hasCatalog && normalizedRelNr && catalog.byRelatienummer[normalizedRelNr]) {
    return catalog.byRelatienummer[normalizedRelNr].map(cloneContactRecord);
  }

  if (hasCatalog && normalizedName && catalog.byRelatie[normalizedName]) {
    return catalog.byRelatie[normalizedName].map(cloneContactRecord);
  }

  return (fallback || []).map(cloneContactRecord);
};

const getPrimaryContactForForm = (contacts, formatNaam) => {
  if (!contacts || contacts.length === 0) {
    return null;
  }
  const preferred =
    contacts.find((contact) => contact.routecontact) ||
    contacts.find((contact) => contact.operationeel) ||
    contacts[0];

  return {
    contact: preferred,
    displayName: formatNaam(
      preferred.voornaam,
      preferred.tussenvoegsel,
      preferred.achternaam
    ),
    email: preferred.email || '',
  };
};

const groupRowsByRelatienummer = (rows, transform) => {
  const grouped = {};
  rows.forEach((row) => {
    const rel = normalizeRelatienummer(row.relatienummer || row.Relatienummer);
    if (!rel) return;
    const transformed = transform(row, rel);
    if (!transformed) return;
    if (!grouped[rel]) {
      grouped[rel] = [];
    }
    grouped[rel].push(transformed);
  });
  return grouped;
};

const transformStandaardMatRecord = (row) => ({
  productnummer: row.productnummer || '',
  mat_type: row.mat_type || '',
  afdeling: row.afdeling || '',
  ligplaats: row.ligplaats || '',
  aantal: parseNumber(row.aantal, 0),
  aanwezig: booleanFromJaNee(row.aanwezig),
  schoon_onbeschadigd: booleanFromJaNee(row.schoon_onbeschadigd),
  vuilgraad_label: row.vuilgraad_label || '',
  barcode: row.barcode || '',
  opmerkingen: row.opmerkingen || ''
});

const transformLogomatRecord = (row) => ({
  productnummer: row.productnummer || '',
  mat_type: row.mat_type || '',
  afdeling: row.afdeling || '',
  ligplaats: row.ligplaats || '',
  aantal: parseNumber(row.aantal, 0),
  aanwezig: booleanFromJaNee(row.aanwezig),
  schoon_onbeschadigd: booleanFromJaNee(row.schoon_onbeschadigd),
  vuilgraad_label: row.vuilgraad_label || '',
  barcode: row.barcode || '',
  representativiteitsscore: parseNumber(row.representativiteitsscore, 100),
  opmerkingen: row.opmerkingen || ''
});

const transformWisserRecord = (row) => {
  const vuilStr = sanitizeCsvCell(row.vuil_percentage);
  const vuil_percentage = vuilStr ? parseNumber(vuilStr, 0) : null;
  return {
    artikel: row.artikel || '',
    aantal_geteld: parseNumber(row.aantal_geteld, 0),
    waarvan_gebruikt: parseNumber(row.waarvan_gebruikt, 0),
    vuil_percentage,
    opmerkingen: row.opmerkingen || ''
  };
};

const transformToebehorenRecord = (row) => ({
  artikel: row.artikel || '',
  vervangen: booleanFromJaNee(row.vervangen),
  aantal: parseNumber(row.aantal, 0),
  opmerkingen: row.opmerkingen || ''
});

const cloneRecords = (records) => records.map((record) => ({ ...record }));

function App() {
  const [activeTab, setActiveTab] = useState('inspectie');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const dataConfigRef = useRef(getDataConfig());

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
  const [klantenLoading, setKlantenLoading] = useState(false);

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
  const [klanten, setKlanten] = useState([]);
  const [contactCatalog, setContactCatalog] = useState({
    loaded: false,
    byRelatienummer: {},
    byRelatie: {},
    total: 0,
    error: null
  });
  const [materiaalCatalog, setMateriaalCatalog] = useState({
    loaded: false,
    standaard: {},
    logo: {},
    wissers: {},
    toebehoren: {},
    error: null
  });
  const catalogLoadingRef = useRef(false);
  const materiaalLoadingRef = useRef(false);
  const messageTimerRef = useRef(null);
  const lastLoadedKlantRef = useRef(null); // Track laatst geladen klant
  const [completionOverlay, setCompletionOverlay] = useState({
    visible: false,
    logged: false,
    summary: null,
  });
  const [loggingDatabase, setLoggingDatabase] = useState(false);
  const [lastSavedInspectie, setLastSavedInspectie] = useState(null);

  // Helper functies
  const formatNaam = useCallback((voornaam, tussenvoegsel, achternaam) => {
    const v = voornaam && voornaam !== 'None' ? voornaam : '';
    const t = tussenvoegsel && tussenvoegsel !== 'None' ? tussenvoegsel : '';
    const a = achternaam && achternaam !== 'None' ? achternaam : '';
    return `${v} ${t} ${a}`.replace(/\s+/g, ' ').trim();
  }, []);

  const berekenLeeftijd = useCallback((barcode) => {
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
  }, []);

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

  const showMessage = useCallback((text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = setTimeout(() => {
      setMessage('');
      setMessageType('');
      messageTimerRef.current = null;
    }, 5000);
  }, []);

  const loadContactCatalog = useCallback(async () => {
    if (contactCatalog.loaded || catalogLoadingRef.current) {
      return;
    }
    catalogLoadingRef.current = true;
    const config = dataConfigRef.current;
    try {
      let rows = [];
      if (config.mode === 'api') {
        const response = await fetch(config.endpoints.contactsApi, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`API laden mislukt (status ${response.status})`);
        }
        rows = await response.json();
      } else {
        const response = await fetch(config.endpoints.contactsCsv, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`CSV laden mislukt (status ${response.status})`);
        }
        const text = await response.text();
        rows = parseContactpersonenCsv(text);
      }
      const catalog = buildContactCatalogFromRecords(rows);

      setContactCatalog({
        loaded: true,
        byRelatienummer: catalog.byRelatienummer,
        byRelatie: catalog.byRelatie,
        total: catalog.total,
        error: null
      });
    } catch (error) {
      console.error('Fout bij inladen contactpersonen:', error);
      setContactCatalog({
        loaded: false,
        byRelatienummer: {},
        byRelatie: {},
        total: 0,
        error: error.message || 'Onbekende fout tijdens laden van contactpersonen'
      });
      showMessage('Kon contactpersonen uit CRM niet laden. Gebruik tijdelijk het handmatige overzicht.', 'error');
    } finally {
      catalogLoadingRef.current = false;
    }
  }, [
    contactCatalog.loaded,
    showMessage
  ]);

  const loadMateriaalCatalog = useCallback(async () => {
    if (materiaalCatalog.loaded || materiaalLoadingRef.current) {
      return;
    }
    materiaalLoadingRef.current = true;
    const config = dataConfigRef.current;
    if (config.mode === 'api') {
      setMateriaalCatalog({
        loaded: true,
        standaard: {},
        logo: {},
        wissers: {},
        toebehoren: {},
        error: null
      });
      materiaalLoadingRef.current = false;
      return;
    }
    try {
      const [standaardRes, logoRes, wissersRes, toebehorenRes] = await Promise.all([
        fetch(config.endpoints.standaardMattenCsv, { cache: 'no-store' }),
        fetch(config.endpoints.logoMattenCsv, { cache: 'no-store' }),
        fetch(config.endpoints.wissersCsv, { cache: 'no-store' }),
        fetch(config.endpoints.toebehorenCsv, { cache: 'no-store' })
      ]);

      const responses = [standaardRes, logoRes, wissersRes, toebehorenRes];
      const failed = responses.find((res) => !res.ok);
      if (failed) {
        throw new Error(`Materiaal CSV laden mislukt (status ${failed.status})`);
      }

      const [standaardText, logoText, wissersText, toebehorenText] = await Promise.all(
        responses.map((res) => res.text())
      );

      const standaardRows = parseCsvWithHeader(standaardText);
      const logoRows = parseCsvWithHeader(logoText);
      const wissersRows = parseCsvWithHeader(wissersText);
      const toebehorenRows = parseCsvWithHeader(toebehorenText);

      const standaard = groupRowsByRelatienummer(standaardRows, transformStandaardMatRecord);
      const logo = groupRowsByRelatienummer(logoRows, transformLogomatRecord);
      const wissers = groupRowsByRelatienummer(wissersRows, transformWisserRecord);
      const toebehoren = groupRowsByRelatienummer(toebehorenRows, transformToebehorenRecord);

      setMateriaalCatalog({
        loaded: true,
        standaard,
        logo,
        wissers,
        toebehoren,
        error: null
      });
    } catch (error) {
      console.error('Fout bij inladen materiaal CSVs:', error);
      setMateriaalCatalog({
        loaded: false,
        standaard: {},
        logo: {},
        wissers: {},
        toebehoren: {},
        error: error.message || 'Onbekende fout tijdens laden van materiaalgegevens'
      });
      showMessage('Kon materiaalgegevens niet laden. Gebruik eventueel handmatige invoer.', 'error');
    } finally {
      materiaalLoadingRef.current = false;
    }
  }, [materiaalCatalog.loaded, showMessage]);

  const analyseInspectie = useCallback((inspectieData) => {
    const serviceTodos = [];
    const klantenserviceTodos = [];

    let mattenIssues = 0;
    let wissersIssues = 0;
    let toebehorenIssues = 0;
    let criticalIssues = 0;

    const matten = [
      ...(inspectieData.standaard_matten_data || []),
      ...(inspectieData.logomatten_data || []),
    ];

    matten.forEach((mat) => {
      const matNaam = mat.mat_type || 'Onbekend';
      const afdeling = mat.afdeling || '';
      const ligplaats = mat.ligplaats || '';
      const locatieParts = [afdeling, ligplaats].filter(Boolean);
      const locatie = locatieParts.length ? ` (${locatieParts.join(', ')})` : '';
      const opmerkingen = (mat.opmerkingen || '').trim();
      const vuilgraad = (mat.vuilgraad_label || '').trim();

      if (mat.aanwezig === false) {
        serviceTodos.push(`Controleer waarom mat '${matNaam}'${locatie} niet aanwezig is.`);
        mattenIssues += 1;
        criticalIssues += 1;
      }

      if ((mat.aantal ?? 1) === 0) {
        serviceTodos.push(`Controleer of mat '${matNaam}'${locatie} verwijderd moet worden.`);
        mattenIssues += 1;
      }

      if (vuilgraad.toLowerCase() === 'sterk vervuild') {
        serviceTodos.push(`Mat '${matNaam}'${locatie} vervangen of reinigen (sterk vervuild).`);
        mattenIssues += 1;
        criticalIssues += 1;
      }

      if (mat.schoon_onbeschadigd === false) {
        serviceTodos.push(`Mat '${matNaam}'${locatie} inspecteren op schade.`);
        mattenIssues += 1;
      }

      if (opmerkingen) {
        serviceTodos.push(`Controleer opmerking bij mat '${matNaam}'${locatie}: ${opmerkingen}`);
        mattenIssues += 1;
      }

      if (afdeling === 'Algemeen' && ligplaats === 'Algemeen') {
        serviceTodos.push(`Ligplaats controleren en aanpassen in TMS voor mat ${matNaam} (nu: Algemeen/Algemeen).`);
        mattenIssues += 1;
      }

      if (mat.barcode && matNaam.toLowerCase().includes('logo')) {
        const leeftijdStr = berekenLeeftijd(mat.barcode);
        const match = leeftijdStr.match(/(\d+)\s*jaar/);
        if (match && parseInt(match[1], 10) >= 3) {
          klantenserviceTodos.push(
            `Logomat ouder dan 3 jaar bij klant '${matNaam}': plan nieuwe logomat, check of logo gelijk is gebleven, geef aan dat je een nieuwe gaat bestellen.`
          );
          if (parseInt(match[1], 10) >= 4) {
            const repScore = mat.representativiteitsscore ?? 100;
            if (repScore < 70) {
              serviceTodos.push(
                `Logomat '${matNaam}'${locatie} moet vervangen worden: ouder dan 4 jaar en representativiteitsscore te laag.`
              );
              mattenIssues += 1;
            }
          }
        }
      }
    });

    (inspectieData.wissers_data || []).forEach((wisser) => {
      const wisserType = wisser.artikel || 'Onbekend';
      if ((wisser.aantal_geteld ?? 0) === 0) {
        serviceTodos.push(`Controleer of wisser van type '${wisserType}' verwijderd moet worden.`);
        wissersIssues += 1;
      }

      if ((wisser.opmerkingen || '').trim()) {
        serviceTodos.push(`Controleer opmerking bij wisser van type '${wisserType}': ${wisser.opmerkingen}`);
        wissersIssues += 1;
      }

      if (wisser.vuil_percentage !== undefined && wisser.vuil_percentage !== null) {
        const perc = parseFloat(wisser.vuil_percentage);
        if (!Number.isNaN(perc) && perc > 70) {
          serviceTodos.push(
            `Upsell kans: ${wisserType} heeft hoog verbruik (${perc}% vuil). Overweeg extra wissers aan te bieden.`
          );
          wissersIssues += 1;
        }
      }
    });

    (inspectieData.toebehoren_data || []).forEach((acc) => {
      const accType = acc.artikel || 'Onbekend';
      const aantal = acc.aantal ?? 0;

      if (acc.vervangen && aantal > 0) {
        serviceTodos.push(`Vervang ${aantal}x '${accType}' bij wissers.`);
        toebehorenIssues += 1;
      }

      if ((acc.opmerkingen || '').trim()) {
        serviceTodos.push(`Controleer opmerking bij toebehoren '${accType}': ${acc.opmerkingen}`);
        toebehorenIssues += 1;
      }
    });

    const totalIssues = mattenIssues + wissersIssues + toebehorenIssues;

    let statusCode = 'success';
    let statusLabel = 'Inspectie afgerond';

    if (criticalIssues > 0) {
      statusCode = 'critical';
      statusLabel = 'Attentie nodig';
    } else if (totalIssues > 5) {
      statusCode = 'warning';
      statusLabel = 'Controle aanbevolen';
    }

    return {
      serviceTodos,
      klantenserviceTodos,
      summary: {
        klantnaam: inspectieData.klantnaam,
        relatienummer: inspectieData.relatienummer,
        inspecteur: inspectieData.inspecteur,
        datum: inspectieData.datum,
        tijd: inspectieData.tijd,
        createdAt: inspectieData.created_at,
        statusCode,
        statusLabel,
        totalIssues,
        criticalIssues,
        mattenIssues,
        wissersIssues,
        toebehorenIssues,
        serviceTodoCount: serviceTodos.length,
        klantenTodoCount: klantenserviceTodos.length,
        previewTodos: serviceTodos.slice(0, 3),
        klantenPreview: klantenserviceTodos.slice(0, 2),
      },
    };
  }, [berekenLeeftijd]);

  const hydrateKlantData = useCallback(
    (relatienummer, klantnaam, { fallbackContacts = [], updateContactFields = false } = {}) => {
      const normalizedRelNr = normalizeRelatienummer(relatienummer || '');
      const naamVoorKey = klantnaam || '';
      const config = dataConfigRef.current;
      
      // Voorkom dubbel laden van dezelfde klant
      const klantKey = `${normalizedRelNr}-${naamVoorKey}`;
      if (lastLoadedKlantRef.current === klantKey) {
        console.log('[Hydrate] Skip - klant al geladen:', klantKey);
        return;
      }
      
      console.log('[Hydrate] Laden klant:', klantKey);
      lastLoadedKlantRef.current = klantKey;

      if (contactCatalog.loaded) {
        const contactsFromCatalog = resolveContactsFromCatalog(
          contactCatalog,
          normalizedRelNr,
          naamVoorKey,
          fallbackContacts
        );

        setContactpersonen(cloneRecords(contactsFromCatalog));

        if (updateContactFields) {
          const primary = getPrimaryContactForForm(contactsFromCatalog, formatNaam);
          setFormData((prev) => {
            const nextName = primary ? primary.displayName : '';
            const nextEmail = primary ? primary.email : '';
            if (prev.contactpersoon === nextName && prev.contact_email === nextEmail) {
              return prev;
            }
            return {
              ...prev,
              contactpersoon: nextName,
              contact_email: nextEmail
            };
          });
        }
      } else if (fallbackContacts.length > 0) {
        const clonedFallback = cloneRecords(fallbackContacts);
        setContactpersonen(clonedFallback);
        if (updateContactFields) {
          const primary = getPrimaryContactForForm(clonedFallback, formatNaam);
          setFormData((prev) => {
            const nextName = primary ? primary.displayName : '';
            const nextEmail = primary ? primary.email : '';
            if (prev.contactpersoon === nextName && prev.contact_email === nextEmail) {
              return prev;
            }
            return {
              ...prev,
              contactpersoon: nextName,
              contact_email: nextEmail
            };
          });
        }
      } else if (updateContactFields) {
        setContactpersonen([]);
        setFormData((prev) => ({
          ...prev,
          contactpersoon: '',
          contact_email: ''
        }));
      }

      if (config.mode === 'api') {
        if (normalizedRelNr) {
          setLoading(true); // Toon loading indicator
          fetch(`${config.endpoints.materialenApi}?relatienummer=${encodeURIComponent(normalizedRelNr)}`, {
            cache: 'no-store'
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`Materiaal API fout (status ${res.status})`);
              }
              return res.json();
            })
            .then((data) => {
              const standaard = data?.standaard || [];
              const logo = data?.logo || [];
              const wissers = data?.wissers || [];
              const toebehoren = data?.toebehoren || [];

              setStandaardMattenData(cloneRecords(standaard));
              setLogomattenData(cloneRecords(logo));
              setWissersData(cloneRecords(wissers));
              setToebehorenData(cloneRecords(toebehoren));
              
              // Genereer TODO's direct na laden
              const inspectiePreview = {
                relatienummer: normalizedRelNr,
                klantnaam: naamVoorKey,
                standaard_matten_data: standaard,
                logomatten_data: logo,
                wissers_data: wissers,
                toebehoren_data: toebehoren,
                matten_concurrenten: mattenConcurrenten,
                wissers_concurrenten: wissersConcurrenten
              };
              
              const analyse = analyseInspectie(inspectiePreview);
              setTodoList(analyse.serviceTodos.map((text) => ({ text, done: false })));
              setKlantenserviceTodoList(analyse.klantenserviceTodos.map((text) => ({ text, done: false })));
              
              setLoading(false);
            })
            .catch((error) => {
              console.error('Materiaal API fout:', error);
              setStandaardMattenData([]);
              setLogomattenData([]);
              setWissersData([]);
              setToebehorenData([]);
              setTodoList([]);
              setKlantenserviceTodoList([]);
              setLoading(false);
            });
        } else {
          setStandaardMattenData([]);
          setLogomattenData([]);
          setWissersData([]);
          setToebehorenData([]);
          setTodoList([]);
          setKlantenserviceTodoList([]);
        }
      } else if (materiaalCatalog.loaded) {
        const standaard = materiaalCatalog.standaard[normalizedRelNr] || [];
        const logo = materiaalCatalog.logo[normalizedRelNr] || [];
        const wissers = materiaalCatalog.wissers[normalizedRelNr] || [];
        const toebehoren = materiaalCatalog.toebehoren[normalizedRelNr] || [];

        setStandaardMattenData(cloneRecords(standaard));
        setLogomattenData(cloneRecords(logo));
        setWissersData(cloneRecords(wissers));
        setToebehorenData(cloneRecords(toebehoren));
        
        // Genereer TODO's voor CSV mode
        const inspectiePreview = {
          relatienummer: normalizedRelNr,
          klantnaam: naamVoorKey,
          standaard_matten_data: standaard,
          logomatten_data: logo,
          wissers_data: wissers,
          toebehoren_data: toebehoren,
          matten_concurrenten: mattenConcurrenten,
          wissers_concurrenten: wissersConcurrenten
        };
        
        const analyse = analyseInspectie(inspectiePreview);
        setTodoList(analyse.serviceTodos.map((text) => ({ text, done: false })));
        setKlantenserviceTodoList(analyse.klantenserviceTodos.map((text) => ({ text, done: false })));
      } else {
        setStandaardMattenData([]);
        setLogomattenData([]);
        setWissersData([]);
        setToebehorenData([]);
        setTodoList([]);
        setKlantenserviceTodoList([]);
      }
    },
    [
      contactCatalog,
      formatNaam,
      materiaalCatalog,
      setContactpersonen,
      setFormData,
      setLogomattenData,
      setStandaardMattenData,
      setToebehorenData,
      setWissersData,
      mattenConcurrenten,
      wissersConcurrenten,
      analyseInspectie,
      setTodoList,
      setKlantenserviceTodoList,
      setLoading
    ]
  );

  const loadData = useCallback(async () => {
    await Promise.all([loadContactCatalog(), loadMateriaalCatalog()]);

    const activeRelatienummer = (selectedKlant?.relatienummer || formData.relatienummer || '').trim();
    const activeKlantnaam = selectedKlant?.klantnaam || formData.klantnaam || '';
    const fallbackContacts = selectedKlant?.contactpersonen || [];

    hydrateKlantData(activeRelatienummer, activeKlantnaam, {
      fallbackContacts,
      updateContactFields: true
    });
  }, [
    formData.klantnaam,
    formData.relatienummer,
    hydrateKlantData,
    loadContactCatalog,
    loadMateriaalCatalog,
    selectedKlant
  ]);

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

  useEffect(() => () => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!contactCatalog.loaded && !materiaalCatalog.loaded) return;

    const activeRelatienummer = (selectedKlant?.relatienummer || formData.relatienummer || '').trim();
    const activeKlantnaam = selectedKlant?.klantnaam || formData.klantnaam || '';
    
    // Check of deze klant al geladen is (voorkom dubbele call na handleKlantSelect)
    const klantKey = `${normalizeRelatienummer(activeRelatienummer)}-${activeKlantnaam}`;
    if (lastLoadedKlantRef.current === klantKey) {
      console.log('[useEffect] Skip - klant al geladen via handleKlantSelect');
      return;
    }
    
    const fallbackContacts = selectedKlant?.contactpersonen || [];
    const shouldUpdateContact = !selectedKlant;

    hydrateKlantData(activeRelatienummer, activeKlantnaam, {
      fallbackContacts,
      updateContactFields: shouldUpdateContact
    });
  }, [
    contactCatalog.loaded,
    formData.klantnaam,
    formData.relatienummer,
    hydrateKlantData,
    isAuthenticated,
    materiaalCatalog.loaded,
    selectedKlant
  ]);

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
      setContactCatalog({
        loaded: false,
        byRelatienummer: {},
        byRelatie: {},
        total: 0,
        error: null
      });
      setMateriaalCatalog({
        loaded: false,
        standaard: {},
        logo: {},
        wissers: {},
        toebehoren: {},
        error: null
      });
      catalogLoadingRef.current = false;
      materiaalLoadingRef.current = false;
    }
  }, [
    isAuthenticated,
    loadData,
    setContactpersonen,
    setKlantenserviceTodoList,
    setKlantSearchTerm,
    setLogomattenData,
    setMateriaalCatalog,
    setSelectedKlant,
    setShowKlantDropdown,
    setStandaardMattenData,
    setTodoList,
    setToebehorenData,
    setWissersData
  ]);

  // Klant selectie functies
  const handleKlantSelect = (klant) => {
    // Reset de lastLoaded ref zodat nieuwe klant WEL wordt geladen
    lastLoadedKlantRef.current = null;
    
    const fallbackContacts = klant.contactpersonen || [];
    const contactsPreview = contactCatalog.loaded
      ? resolveContactsFromCatalog(contactCatalog, klant.relatienummer, klant.klantnaam, fallbackContacts)
      : fallbackContacts;

    const primary = getPrimaryContactForForm(contactsPreview, formatNaam);

    setSelectedKlant(klant);
    setFormData(prev => ({
      ...prev,
      relatienummer: klant.relatienummer,
      klantnaam: klant.klantnaam,
      contactpersoon: primary ? primary.displayName : '',
      contact_email: primary ? primary.email : ''
    }));
    setKlantSearchTerm(klant.klantnaam);
    setShowKlantDropdown(false);

    hydrateKlantData(klant.relatienummer, klant.klantnaam, {
      fallbackContacts,
      updateContactFields: false
    });
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

  // Laad klanten alleen bij zoeken (search-on-type)
  useEffect(() => {
    if (!isAuthenticated) return;

    const config = getDataConfig();
    
    // Als er geen zoekterm is, toon niets
    if (!klantSearchTerm || klantSearchTerm.trim().length < 3) {
      setKlanten([]);
      return;
    }

    // Toon loading state tijdens typen
    setKlantenLoading(true);
    setKlanten([]);

    // Debounce: wacht 400ms na laatste toetsaanslag
    const timeoutId = setTimeout(async () => {
      if (config.mode === 'api') {
        try {
          const response = await fetch(
            `${config.endpoints.klantenApi}?search=${encodeURIComponent(klantSearchTerm)}`,
            { cache: 'no-store' }
          );
          if (response.ok) {
            const data = await response.json();
            setKlanten(data);
          } else {
            console.error('Klanten zoeken mislukt:', response.status);
            setKlanten([]);
          }
        } catch (error) {
          console.error('Fout bij zoeken klanten:', error);
          setKlanten([]);
        } finally {
          setKlantenLoading(false);
        }
      } else {
        // CSV mode: gebruik hardcoded data
        setKlanten(HARDCODED_CRM_KLANTEN);
        setKlantenLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, klantSearchTerm]);

  // Geen extra filtering nodig - API doet dit al
  const filteredKlanten = klanten;

  const saveInspectie = async () => {
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
        algemeen_values: formData.algemeen_values
      };

      // Validatie
      if (!inspectieData.relatienummer || !inspectieData.klantnaam) {
        showMessage('Selecteer eerst een klant voordat je de inspectie opslaat.', 'error');
        setLoading(false);
        return;
      }

      const config = getDataConfig();
      
      // POST naar API
      const response = await fetch(`${config.endpoints.apiBaseUrl}/inspecties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inspectieData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Opslaan mislukt');
      }

      const result = await response.json();
      const inspectieID = result.inspectieID;

      // Ook lokaal opslaan voor backup
      const fullInspectieData = {
        ...inspectieData,
        id: inspectieID,
        created_at: new Date().toISOString()
      };
      localStorage.setItem('lavans_laatste_inspectie', JSON.stringify(fullInspectieData));

      // Update TODO's op basis van analyse
      const analyse = analyseInspectie(fullInspectieData);
      setTodoList(analyse.serviceTodos.map((text) => ({ text, done: false })));
      setKlantenserviceTodoList(analyse.klantenserviceTodos.map((text) => ({ text, done: false })));
      
      setLastSavedInspectie(fullInspectieData);
      
      // Toon success melding met reset optie
      const resetForm = () => {
        // Reset alle form data
        setFormData({
          relatienummer: '',
          klantnaam: '',
          contactpersoon: '',
          contact_email: '',
          inspecteur: currentUser?.name || 'Angelo',
          datum: format(new Date(), 'yyyy-MM-dd'),
          tijd: format(new Date(), 'HH:mm'),
          algemeen_values: {}
        });
        setSelectedKlant(null);
        setKlantSearchTerm('');
        setStandaardMattenData([]);
        setLogomattenData([]);
        setWissersData([]);
        setToebehorenData([]);
        setMattenConcurrenten({
          andere_mat_aanwezig: 'Nee',
          andere_mat_concurrent: '',
          aantal_concurrent: 0,
          aantal_koop: 0
        });
        setWissersConcurrenten({
          wissers_concurrent: 'Nee',
          wissers_concurrent_concurrent: '',
          wissers_concurrent_toelichting: '',
          andere_zaken: ''
        });
        setContactpersonen([]);
      };
      
      // Show completion overlay
      setCompletionOverlay({
        visible: true,
        inspectieID,
        klantnaam: formData.klantnaam,
        onClose: resetForm
      });
      
      showMessage(`✅ Inspectie #${inspectieID} succesvol opgeslagen!`, 'success');
      
    } catch (error) {
      console.error('Inspectie opslaan fout:', error);
      showMessage(`❌ Fout bij opslaan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logInspectieNaarDatabase = async () => {
    if (!lastSavedInspectie) {
      showMessage('Geen inspectie om te loggen.', 'info');
      return;
    }

    try {
      setLoggingDatabase(true);

      await new Promise((resolve) => setTimeout(resolve, 1200));

      console.log('Simulatie database logging (Lavans 2025):', lastSavedInspectie);

      setCompletionOverlay((prev) => ({
        ...prev,
        logged: true,
      }));
    } catch (error) {
      showMessage('Loggen naar database is mislukt (simulatie).', 'error');
    } finally {
      setLoggingDatabase(false);
    }
  };

  const sluitCompletionOverlay = () => {
    setCompletionOverlay({
      visible: false,
      logged: false,
      summary: null,
    });
  };

  // sendToTMS functie verwijderd - inspectie wordt direct opgeslagen in database via saveInspectie

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

  const saveContactWijzigingen = async () => {
    setLoading(true);
    
    try {
      const nieuweTodos = [];
      const wijzigingen = [];
      
      contactpersonen.forEach(contact => {
        const naam = formatNaam(contact.voornaam, contact.tussenvoegsel, contact.achternaam);
        
        // Check voor nieuwe contactpersonen
        if (contact.nog_in_dienst && !contact.email) {
          nieuweTodos.push(`Nieuwe contactpersoon toevoegen: ${naam}`);
          wijzigingen.push({
            type: 'toevoegen',
            ...contact,
            omschrijving: `Nieuwe contactpersoon: ${naam} (email nog toevoegen)`
          });
        }
        
        // Check voor klantportaal uitnodiging
        if (contact.nog_in_dienst && !contact.klantenportaal && contact.email) {
          nieuweTodos.push(`Uitnodigen klantportaal voor ${contact.email}`);
          wijzigingen.push({
            type: 'wijzigen',
            ...contact,
            omschrijving: `Klantportaal uitnodigen voor ${contact.email}`
          });
        }
        
        // Check voor niet meer in dienst
        if (!contact.nog_in_dienst) {
          nieuweTodos.push(`Contactpersoon ${naam} (${contact.email}) is niet meer in dienst. Controleer en update CRM.`);
          wijzigingen.push({
            type: 'verwijderen',
            ...contact,
            omschrijving: `Contactpersoon ${naam} niet meer in dienst - verwijderen uit CRM`
          });
        }
      });
      
      // Stuur wijzigingen naar API als er wijzigingen zijn
      if (wijzigingen.length > 0) {
        const config = getDataConfig();
        const response = await fetch(`${config.endpoints.apiBaseUrl}/contactpersonen-wijzigingen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            relatienummer: formData.relatienummer,
            klantnaam: formData.klantnaam,
            inspecteur: formData.inspecteur,
            wijzigingen
          })
        });

        if (!response.ok) {
          throw new Error('Opslaan wijzigingen mislukt');
        }

        const result = await response.json();
        console.log('Contactpersoon wijzigingen opgeslagen:', result);
      }
      
      setKlantenserviceTodoList(nieuweTodos.map(text => ({ text, done: false })));
      showMessage(wijzigingen.length > 0 
        ? `✅ ${wijzigingen.length} wijziging(en) opgeslagen in database!`
        : 'Geen wijzigingen gevonden.', 
        wijzigingen.length > 0 ? 'success' : 'info'
      );
      
    } catch (error) {
      console.error('Fout bij opslaan contactpersoon wijzigingen:', error);
      showMessage(`❌ Fout bij opslaan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const completionSummary = completionOverlay.summary
    ? {
        ...completionOverlay.summary,
        plannedMomentLabel:
          completionOverlay.summary.plannedMomentLabel ||
          [completionOverlay.summary.datum, completionOverlay.summary.tijd].filter(Boolean).join(' • '),
      }
    : null;

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
            generateExportRapport={generateExportRapport}
            loading={loading}
            // Klant selectie props
            selectedKlant={selectedKlant}
            klantSearchTerm={klantSearchTerm}
            setKlantSearchTerm={setKlantSearchTerm}
            showKlantDropdown={showKlantDropdown}
            setShowKlantDropdown={setShowKlantDropdown}
            filteredKlanten={filteredKlanten}
            klantenLoading={klantenLoading}
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
      
      {/* Eenvoudige completion overlay */}
      {completionOverlay.visible && (
        <div className="completion-overlay" onClick={() => {
          setCompletionOverlay({ visible: false });
          if (completionOverlay.onClose) completionOverlay.onClose();
        }}>
          <div className="completion-card-simple" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3em', marginBottom: '20px' }}>✅</div>
              <h2 style={{ marginBottom: '15px', color: '#28a745' }}>Inspectie Afgerond!</h2>
              <p style={{ fontSize: '1.1em', marginBottom: '10px' }}>
                <strong>{completionOverlay.klantnaam}</strong>
              </p>
              <p style={{ color: '#666', marginBottom: '25px' }}>
                Inspectie #{completionOverlay.inspectieID} is opgeslagen in de database
              </p>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-success" 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const config = getDataConfig();
                      const response = await fetch(`${config.endpoints.apiBaseUrl}/send-inspectie-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ inspectieID: completionOverlay.inspectieID })
                      });
                      
                      const result = await response.json();
                      
                      if (response.ok && result.success) {
                        showMessage(`Email succesvol verzonden naar ${result.recipient || 'klant'}!`, 'success');
                      } else if (result.preview) {
                        showMessage('Email preview gegenereerd (SMTP niet geconfigureerd)', 'warning');
                      } else {
                        showMessage(`Email kon niet worden verzonden: ${result.error || 'Onbekende fout'}`, 'error');
                      }
                    } catch (error) {
                      console.error('Email versturen fout:', error);
                      showMessage(`❌ Email kon niet worden verzonden: ${error.message}`, 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ minWidth: '180px', fontSize: '1.05em' }}
                  disabled={loading}
                >
                  {loading ? '📧 Versturen...' : '📧 Email Versturen'}
                </button>
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setCompletionOverlay({ visible: false });
                    if (completionOverlay.onClose) completionOverlay.onClose();
                  }}
                  style={{ minWidth: '180px', fontSize: '1.05em' }}
                >
                  Nieuwe Inspectie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {completionOverlay.visible && completionSummary && (
        <div className="completion-overlay">
          <div
            className="completion-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
          >
            {completionOverlay.logged && (
              <div className="completion-toast success">
                ✅ Vastgelegd in database (simulatie)
              </div>
            )}
            <div className="completion-icon" aria-hidden="true">
              <span>✨</span>
            </div>
            <h2 id="completion-title">Inspectie opgeslagen</h2>
            <p className="completion-subtitle">
              Inspectie voor <strong>{completionSummary.klantnaam}</strong> ({completionSummary.relatienummer}) staat klaar voor opvolging.
            </p>
            <div className={`completion-status completion-status-${completionSummary.statusCode}`}>
              <span className="status-label">{completionSummary.statusLabel}</span>
              <span className="status-meta">
                {completionSummary.totalIssues} aandachtspunten • {completionSummary.criticalIssues} kritisch
              </span>
            </div>
            <div className="completion-meta">
              <div>
                <span className="meta-label">Servicemedewerker</span>
                <span className="meta-value">{completionSummary.inspecteur || '-'}</span>
              </div>
              <div>
                <span className="meta-label">Inspectiemoment</span>
                <span className="meta-value">{completionSummary.plannedMomentLabel || '-'}</span>
              </div>
              <div>
                <span className="meta-label">Opgeslagen op</span>
                <span className="meta-value">{completionSummary.savedAtLabel || '-'}</span>
              </div>
            </div>
            <div className="completion-metrics">
              <div className="completion-metric">
                <span className="metric-label">Service acties</span>
                <span className="metric-value">{completionSummary.serviceTodoCount}</span>
              </div>
              <div className="completion-metric">
                <span className="metric-label">Klantenservice</span>
                <span className="metric-value">{completionSummary.klantenTodoCount}</span>
              </div>
              <div className="completion-metric">
                <span className="metric-label">Kritiek</span>
                <span className="metric-value">{completionSummary.criticalIssues}</span>
              </div>
              <div className="completion-metric">
                <span className="metric-label">Matten issues</span>
                <span className="metric-value">{completionSummary.mattenIssues}</span>
              </div>
            </div>
            {completionSummary.previewTodos && completionSummary.previewTodos.length > 0 && (
              <div className="completion-highlights">
                <span className="highlights-label">Volgende stappen</span>
                <ul>
                  {completionSummary.previewTodos.map((todo, index) => (
                    <li key={`service-${index}`}>{todo}</li>
                  ))}
                </ul>
              </div>
            )}
            {completionSummary.klantenPreview && completionSummary.klantenPreview.length > 0 && (
              <div className="completion-highlights secondary">
                <span className="highlights-label">Voor klantenservice</span>
                <ul>
                  {completionSummary.klantenPreview.map((todo, index) => (
                    <li key={`klant-${index}`}>{todo}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="completion-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={logInspectieNaarDatabase}
                disabled={loggingDatabase || completionOverlay.logged}
              >
                {completionOverlay.logged
                  ? 'Gelogd in database'
                  : loggingDatabase
                    ? 'Logt naar database...'
                    : 'Log naar database'}
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => {
                  sluitCompletionOverlay();
                  setActiveTab('todos');
                }}
              >
                Bekijk to-do's
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={sluitCompletionOverlay}
              >
                Terug naar app
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 