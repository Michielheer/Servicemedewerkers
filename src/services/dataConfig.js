const DEFAULT_CONFIG = {
  mode: process.env.REACT_APP_DATA_MODE || 'api',
  endpoints: {
    contactsCsv: '/data/Contactpersonenlavans.csv',
    standaardMattenCsv: '/data/matten_standaard.csv',
    logoMattenCsv: '/data/matten_logo.csv',
    wissersCsv: '/data/wissers.csv',
    toebehorenCsv: '/data/toebehoren.csv',
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '/api',
    contactsApi: (process.env.REACT_APP_API_BASE_URL || '/api').replace(/\/$/, '') + '/contactpersonen',
    materialenApi: (process.env.REACT_APP_API_BASE_URL || '/api').replace(/\/$/, '') + '/materialen',
    klantenApi: (process.env.REACT_APP_API_BASE_URL || '/api').replace(/\/$/, '') + '/klanten'
  }
};

export const getDataConfig = () => {
  if (typeof window !== 'undefined' && window.__LAVANS_DATA_CONFIG__) {
    return {
      ...DEFAULT_CONFIG,
      ...window.__LAVANS_DATA_CONFIG__
    };
  }
  return DEFAULT_CONFIG;
};

export default DEFAULT_CONFIG;

