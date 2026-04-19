const { normalizePhone } = require('../utils/phone');
const { isMysqlConfigured, testConnection } = require('../db/mysql');
const legacyJsonRepository = require('../repositories/legacy-json.repository');
const usersRepository = require('../repositories/users.repository');
const transactionsRepository = require('../repositories/transactions.repository');
const paymentsRepository = require('../repositories/payments.repository');

let mysqlAvailable = false;
let migrationAttempted = false;

function normalizeLegacyTransaction(item = {}) {
  return {
    telefone: normalizePhone(item.telefone || ''),
    nome: item.nome || '',
    mensagem_original: item.mensagem_original || '',
    tipo: item.tipo || 'outro',
    valor: Number(item.valor || 0),
    categoria: item.categoria || 'geral',
    origem: item.origem || item.source || 'webhook',
    data: item.data || item.criado_em || null,
    criado_em: item.data || item.criado_em || null
  };
}

function aggregateUsersFromTransactions(transactions = []) {
  const map = new Map();

  for (const item of transactions) {
    const phone = normalizePhone(item.telefone || item.phone || '');
    if (!phone) continue;

    if (!map.has(phone)) {
      map.set(phone, {
        telefone: phone,
        nome: item.nome || '',
        plano: 'teste',
        status: 'ativo',
        primeiro_registro: item.data || item.criado_em || null,
        total_registros: 0
      });
    }

    const current = map.get(phone);
    current.total_registros += 1;

    if (!current.nome && item.nome) {
      current.nome = item.nome;
    }

    const createdAt = item.data || item.criado_em || null;
    if (createdAt && (!current.primeiro_registro || createdAt < current.primeiro_registro)) {
      current.primeiro_registro = createdAt;
    }
  }

  return Array.from(map.values());
}

async function initPersistence() {
  if (!isMysqlConfigured()) {
    console.log('[startup][db] MySQL nao configurado. Fallback temporario: dados.json');
    mysqlAvailable = false;
    return;
  }

  try {
    await testConnection();
    mysqlAvailable = true;
    console.log('[startup][db] MySQL conectado com sucesso');
    await migrateLegacyJsonIfNeeded();
  } catch (error) {
    mysqlAvailable = false;
    console.error('[startup][db] Falha ao conectar no MySQL. Fallback temporario: dados.json');
    console.error('[startup][db] Detalhe:', error.message || error);
  }
}

function isMysqlReady() {
  return mysqlAvailable;
}

async function migrateLegacyJsonIfNeeded() {
  if (!mysqlAvailable || migrationAttempted) return;
  migrationAttempted = true;

  const existingTransactions = await transactionsRepository.countTransactions();
  if (existingTransactions > 0) {
    console.log('[startup][db] Migracao legada ignorada: transactions ja possui dados');
    return;
  }

  const legacyTransactions = legacyJsonRepository
    .readTransactions()
    .map(normalizeLegacyTransaction)
    .filter(item => item.telefone);

  if (!legacyTransactions.length) {
    console.log('[startup][db] Nenhum dado legado encontrado para migracao');
    return;
  }

  for (const item of legacyTransactions) {
    const user = await usersRepository.upsertUserByPhone({
      phone: item.telefone,
      name: item.nome || ''
    });

    await transactionsRepository.createTransaction({
      userId: user?.id || null,
      phone: item.telefone,
      source: item.origem || 'webhook',
      originalMessage: item.mensagem_original || '',
      type: item.tipo || 'outro',
      amount: Number(item.valor || 0),
      category: item.categoria || 'geral',
      createdAt: item.data || item.criado_em || null
    });
  }

  console.log(`[startup][db] Migracao legada concluida: ${legacyTransactions.length} transacoes importadas do dados.json`);
}

async function listTransactions({ phone = '' } = {}) {
  const normalizedPhone = normalizePhone(phone);

  if (mysqlAvailable) {
    return transactionsRepository.listTransactions({ phone: normalizedPhone });
  }

  return legacyJsonRepository
    .readTransactions()
    .map(normalizeLegacyTransaction)
    .filter(item => !normalizedPhone || item.telefone === normalizedPhone);
}

async function listUsers({ phone = '' } = {}) {
  const normalizedPhone = normalizePhone(phone);

  if (mysqlAvailable) {
    return usersRepository.listUsers({ phone: normalizedPhone });
  }

  return aggregateUsersFromTransactions(
    await listTransactions({ phone: normalizedPhone })
  );
}

async function listUniquePhones() {
  if (mysqlAvailable) {
    return transactionsRepository.listUniquePhones();
  }

  const transactions = await listTransactions();
  return [...new Set(transactions.map(item => item.telefone).filter(Boolean))];
}

async function createTransaction(data = {}) {
  const normalized = {
    telefone: normalizePhone(data.telefone || ''),
    nome: data.nome || '',
    mensagem_original: data.mensagem_original || '',
    tipo: data.tipo || 'outro',
    valor: Number(data.valor || 0),
    categoria: data.categoria || 'geral',
    origem: data.origem || 'webhook',
    data: data.data || null
  };

  if (!normalized.telefone) {
    throw new Error('Telefone e obrigatorio para salvar transacao');
  }

  if (mysqlAvailable) {
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

    return;
  }

  legacyJsonRepository.appendTransaction(normalized);
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
  if (!mysqlAvailable) {
    return;
  }

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
  if (!mysqlAvailable) {
    return;
  }

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
  isMysqlConfigured,
  isMysqlReady,
  listTransactions,
  listUniquePhones,
  listUsers,
  migrateLegacyJsonIfNeeded,
  registerMercadoPagoWebhook,
  savePayment
};
