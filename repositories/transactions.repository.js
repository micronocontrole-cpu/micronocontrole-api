const { execute, fetchAll, fetchOne } = require('./base.repository');

function normalizeTransactionRow(row = {}) {
  return {
    id: row.id || null,
    user_id: row.user_id || null,
    telefone: row.phone || '',
    nome: row.user_name || row.name || '',
    mensagem_original: row.original_message || '',
    tipo: row.type || 'outro',
    valor: Number(row.amount || 0),
    categoria: row.category || 'geral',
    origem: row.source || '',
    data: row.created_at || null,
    criado_em: row.created_at || null
  };
}

async function countTransactions() {
  const row = await fetchOne('SELECT COUNT(*) AS total FROM transactions');
  return Number(row?.total || 0);
}

async function createTransaction({
  userId = null,
  phone,
  source = 'webhook',
  originalMessage = '',
  type = 'outro',
  amount = 0,
  category = 'geral',
  createdAt = null
}) {
  await execute(
    `
      INSERT INTO transactions (
        user_id, phone, source, original_message, type, amount, category, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
    `,
    [userId, phone, source, originalMessage, type, Number(amount || 0), category, createdAt]
  );
}

async function listTransactions({ phone = '' } = {}) {
  const params = [];
  let whereClause = '';

  if (phone) {
    whereClause = 'WHERE t.phone = ?';
    params.push(phone);
  }

  const rows = await fetchAll(
    `
      SELECT
        t.*,
        u.name AS user_name
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      ${whereClause}
      ORDER BY t.created_at ASC, t.id ASC
    `,
    params
  );

  return rows.map(normalizeTransactionRow);
}

async function listUniquePhones() {
  const rows = await fetchAll(
    `
      SELECT DISTINCT phone
      FROM transactions
      WHERE phone IS NOT NULL AND phone <> ''
      ORDER BY phone ASC
    `
  );

  return rows.map(row => row.phone).filter(Boolean);
}

module.exports = {
  countTransactions,
  createTransaction,
  listTransactions,
  listUniquePhones,
  normalizeTransactionRow
};
