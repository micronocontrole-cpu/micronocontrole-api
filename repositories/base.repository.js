const { query } = require('../db/mysql');

async function fetchAll(sql, params = []) {
  return query(sql, params);
}

async function fetchOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function execute(sql, params = []) {
  return query(sql, params);
}

module.exports = {
  execute,
  fetchAll,
  fetchOne
};
