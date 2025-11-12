const sql = require('mssql');

let poolPromise = null;

const getConfig = () => {
  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;

  if (!server || !database || !user || !password) {
    throw new Error('SQL omgeving is niet volledig geconfigureerd. Controleer SQL_SERVER, SQL_DATABASE, SQL_USER en SQL_PASSWORD.');
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: false
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
};

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(getConfig());
  }
  return poolPromise;
};

module.exports = {
  sql,
  getPool
};

