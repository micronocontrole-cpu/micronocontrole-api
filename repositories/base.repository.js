const { query } = require('../db/postgres');

async function fetchAll(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

async function fetchOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

async function execute(sql, params = []) {
  const result = await query(sql, params);
  return result;
}

module.exports = {
  execute,
  fetchAll,
  fetchOne
};
