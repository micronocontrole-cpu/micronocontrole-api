const { databaseConfig } = require('../config');
const mysql = require('mysql2/promise');

let poolPromise = null;

function isMysqlConfigured() {
  return Boolean(
    databaseConfig.host &&
    databaseConfig.database &&
    databaseConfig.user
  );
}

async function getPool() {
  if (!isMysqlConfigured()) {
    throw new Error('MySQL nao configurado. Defina DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD.');
  }

  if (!poolPromise) {
    poolPromise = mysql.createPool({
      ...databaseConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return poolPromise;
}

async function query(sql, params = []) {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function testConnection() {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  getPool,
  isMysqlConfigured,
  query,
  testConnection
};
