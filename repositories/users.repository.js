const { execute, fetchAll, fetchOne } = require('./base.repository');

function normalizeUserRow(row = {}) {
  return {
    id: row.id,
    telefone: row.phone || '',
    nome: row.name || '',
    email: row.email || '',
    plano_id: row.plan_id || null,
    plano: row.plan_name || 'teste',
    status: row.status || 'ativo',
    primeiro_registro: row.first_transaction_at || row.created_at || null,
    total_registros: Number(row.total_transactions || 0),
    criado_em: row.created_at || null,
    atualizado_em: row.updated_at || null
  };
}

async function findUserByPhone(phone) {
  const row = await fetchOne(
    `
      SELECT
        u.*,
        p.name AS plan_name
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      WHERE u.phone = ?
      LIMIT 1
    `,
    [phone]
  );

  return row ? normalizeUserRow(row) : null;
}

async function createUser({ phone, name = '', email = '' }) {
  await execute(
    `
      INSERT INTO users (phone, name, email, status, created_at, updated_at)
      VALUES (?, ?, ?, 'ativo', NOW(), NOW())
    `,
    [phone, name || null, email || null]
  );

  return findUserByPhone(phone);
}

async function updateUser(userId, { name = '', email = '' }) {
  await execute(
    `
      UPDATE users
      SET name = ?, email = ?, updated_at = NOW()
      WHERE id = ?
    `,
    [name || null, email || null, userId]
  );
}

async function upsertUserByPhone({ phone, name = '', email = '' }) {
  const existing = await findUserByPhone(phone);

  if (!existing) {
    return createUser({ phone, name, email });
  }

  await updateUser(existing.id, {
    name: existing.nome || name,
    email: existing.email || email
  });

  return findUserByPhone(phone);
}

async function listUsers({ phone = '' } = {}) {
  const params = [];
  let whereClause = '';

  if (phone) {
    whereClause = 'WHERE u.phone = ?';
    params.push(phone);
  }

  const rows = await fetchAll(
    `
      SELECT
        u.id,
        u.phone,
        u.name,
        u.email,
        u.plan_id,
        u.status,
        u.created_at,
        u.updated_at,
        p.name AS plan_name,
        MIN(t.created_at) AS first_transaction_at,
        COUNT(t.id) AS total_transactions
      FROM users u
      LEFT JOIN plans p ON p.id = u.plan_id
      LEFT JOIN transactions t ON t.user_id = u.id
      ${whereClause}
      GROUP BY
        u.id, u.phone, u.name, u.email, u.plan_id, u.status, u.created_at, u.updated_at, p.name
      ORDER BY u.created_at DESC
    `,
    params
  );

  return rows.map(normalizeUserRow);
}

module.exports = {
  createUser,
  findUserByPhone,
  listUsers,
  updateUser,
  upsertUserByPhone
};
