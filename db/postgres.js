const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function testConnection() {
  const result = await pool.query('SELECT NOW()');
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  testConnection
};
