const persistenceService = require('./persistence.service');
const { calculateSummary } = require('./report.service');
const { getNormalizedPhone, parseAmount } = require('../utils/validation');

function extractTransactionData(text = '') {
  const normalizedText = String(text).toLowerCase().trim();

  let tipo = 'outro';
  let valor = null;
  let categoria = 'geral';

  if (
    normalizedText.includes('gastei') ||
    normalizedText.includes('paguei') ||
    normalizedText.includes('comprei')
  ) {
    tipo = 'saida';
  }

  if (
    normalizedText.includes('vendi') ||
    normalizedText.includes('recebi') ||
    normalizedText.includes('ganhei') ||
    normalizedText.includes('entrou')
  ) {
    tipo = 'entrada';
  }

  const amountMatch = normalizedText.match(/(\d+[.,]?\d*)/);
  if (amountMatch) {
    valor = amountMatch[1].replace(',', '.');
  }

  if (normalizedText.includes('mercado')) categoria = 'mercado';
  else if (normalizedText.includes('gasolina')) categoria = 'transporte';
  else if (normalizedText.includes('aluguel')) categoria = 'moradia';
  else if (normalizedText.includes('fornecedor')) categoria = 'fornecedor';
  else if (normalizedText.includes('pix')) categoria = 'pix';
  else if (normalizedText.includes('cartao')) categoria = 'cartao';
  else if (normalizedText.includes('cliente')) categoria = 'cliente';
  else if (normalizedText.includes('restaurante')) categoria = 'restaurante';
  else if (normalizedText.includes('luz')) categoria = 'energia';
  else if (normalizedText.includes('agua')) categoria = 'agua';
  else if (normalizedText.includes('internet')) categoria = 'internet';

  return { tipo, valor, categoria };
}

async function getAllTransactions() {
  return persistenceService.listTransactions();
}

async function getTransactionsByPhone(phone = '') {
  return persistenceService.listTransactions({ phone: getNormalizedPhone(phone) });
}

async function getUsers(phone = '') {
  return persistenceService.listUsers({ phone: getNormalizedPhone(phone) });
}

async function getSummaryByPhone(phone = '') {
  const transactions = await getTransactionsByPhone(phone);
  return calculateSummary(transactions);
}

async function createTransactionRecord(data = {}) {
  return persistenceService.createTransaction({
    ...data,
    telefone: getNormalizedPhone(data.telefone || ''),
    valor: parseAmount(data.valor)
  });
}

async function getUniquePhones() {
  return persistenceService.listUniquePhones();
}

module.exports = {
  createTransactionRecord,
  extractTransactionData,
  getAllTransactions,
  getSummaryByPhone,
  getTransactionsByPhone,
  getUniquePhones,
  getUsers
};
