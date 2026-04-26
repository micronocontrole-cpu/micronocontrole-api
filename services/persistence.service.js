const crypto = require('crypto');
const { normalizePhone } = require('../utils/phone');

const usersRepository = require('../repositories/users.repository');
const transactionsRepository = require('../repositories/transactions.repository');
const paymentsRepository = require('../repositories/payments.repository');

let postgresAvailable = false;
let migrationAttempted = false;

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function initPersistence() {
  if (!isPostgresConfigured()) {
    console.error('[startup][db] DATABASE_URL nao configurada. Configure o PostgreSQL no Railway.');
    postgresAvailable = false;
    return;
  }

  try {
    const postgres = require('../db/postgres');

    if (typeof postgres.testConnection === 'function') {
      await postgres.testConnection();
    }

    postgresAvailable = true;
    console.log('[startup][db] PostgreSQL conectado com sucesso');
  } catch (error) {
    postgresAvailable = false;
    console.error('[startup][db] Falha ao conectar no PostgreSQL');
    console.error('[startup][db] Detalhe:', error.message || error);
  }
}

function isMysqlReady() {
  // Mantido temporariamente para não quebrar imports antigos.
  return postgresAvailable;
}

function isMysqlConfigured() {
  // Mantido temporariamente para não quebrar imports antigos.
  return isPostgresConfigured();
}

async function migrateLegacyJsonIfNeeded() {
  migrationAttempted = true;
  console.log('[startup][db] Migracao JSON desativada. Projeto agora usa PostgreSQL.');
}

async function listTransactions({ phone = '' } = {}) {
  const normalizedPhone = normalizePhone(phone);
  return transactionsRepository.listTransactions({ phone: normalizedPhone });
}

async function listUsers({ phone = '' } = {}) {
  const normalizedPhone = normalizePhone(phone);
  return usersRepository.listUsers({ phone: normalizedPhone });
}

async function listUserProfiles({ phone = '' } = {}) {
  return listUsers({ phone });
}

async function updateUserProfileByPhone(phone, changes = {}) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  if (typeof usersRepository.updateUserByPhone === 'function') {
    return usersRepository.updateUserByPhone(normalizedPhone, changes);
  }

  const user = await usersRepository.upsertUserByPhone({
    phone: normalizedPhone,
    name: changes.nome || changes.name || '',
    email: changes.email || '',
    plan: changes.plano || changes.plan,
    status: changes.status,
    token: changes.token
  });

  return user;
}

async function regenerateUserTokenByPhone(phone) {
  const token = generateSecureToken();
  const user = await updateUserProfileByPhone(phone, { token });

  if (!user) {
    return null;
  }

  return {
    usuario: user,
    token
  };
}

async function findUserByToken(token = '') {
  const normalizedToken = String(token || '').trim();

  if (!normalizedToken) {
    return null;
  }

  if (typeof usersRepository.findUserByToken === 'function') {
    return usersRepository.findUserByToken(normalizedToken);
  }

  const users = await listUsers();
  return users.find(user => user.token === normalizedToken) || null;
}

async function listUniquePhones() {
  return transactionsRepository.listUniquePhones();
}

async function createTransaction(data = {}) {
  const normalized = {
    telefone: normalizePhone(data.telefone || data.phone || ''),
    nome: data.nome || data.name || '',
    mensagem_original: data.mensagem_original || data.originalMessage || '',
    tipo: data.tipo || data.type || 'outro',
    valor: Number(data.valor || data.amount || 0),
    categoria: data.categoria || data.category || 'geral',
    origem: data.origem || data.source || 'webhook',
    data: data.data || data.createdAt || null
  };

  if (!normalized.telefone) {
    throw new Error('Telefone e obrigatorio para salvar transacao');
  }

  const user = await usersRepository.upsertUserByPhone({
    phone: normalized.telefone,
    name: normalized.nome || ''
  });

  await transactionsRepository.createTransaction({
    userId: user?.id || null,
    phone: normalized.telefone,
    source: normalized.origem,
    originalMessage: normalized.mensagem_original,
    type: normalized.tipo,
    amount: normalized.valor,
    category: normalized.categoria,
    createdAt: normalized.data
  });
}

async function savePayment({
  phone = '',
  name = '',
  email = '',
  mercadopagoPaymentId = '',
  externalReference = '',
  amount = 0,
  status = 'pending',
  rawPayload = null
}) {
  const normalizedPhone = normalizePhone(phone || externalReference || '');

  const user = normalizedPhone
    ? await usersRepository.upsertUserByPhone({
        phone: normalizedPhone,
        name,
        email
      })
    : null;

  await paymentsRepository.createPayment({
    userId: user?.id || null,
    phone: normalizedPhone,
    mercadopagoPaymentId,
    externalReference,
    amount,
    status,
    rawPayload
  });
}

async function registerMercadoPagoWebhook(payload = {}) {
  const paymentId = String(
    payload.data?.id ||
    payload.id ||
    payload.resource?.id ||
    ''
  ).trim();

  const externalReference = String(
    payload.external_reference ||
    payload.data?.external_reference ||
    ''
  ).trim();

  const status = String(
    payload.status ||
    payload.data?.status ||
    payload.action ||
    'webhook_received'
  ).trim();

  const amount = Number(
    payload.transaction_amount ||
    payload.data?.transaction_amount ||
    0
  );

  const phone = normalizePhone(
    payload.phone ||
    externalReference ||
    payload.additional_info?.payer?.phone?.number ||
    ''
  );

  await paymentsRepository.updatePaymentByReference({
    mercadopagoPaymentId: paymentId,
    externalReference,
    phone,
    amount,
    status,
    rawPayload: payload
  });
}

module.exports = {
  createTransaction,
  initPersistence,

  // nomes antigos mantidos para não quebrar outras partes do projeto
  isMysqlConfigured,
  isMysqlReady,

  findUserByToken,
  generateSecureToken,
  listTransactions,
  listUniquePhones,
  listUserProfiles,
  listUsers,
  regenerateUserTokenByPhone,
  updateUserProfileByPhone,
  migrateLegacyJsonIfNeeded,
  registerMercadoPagoWebhook,
  savePayment
};
