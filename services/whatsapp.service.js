const axios = require('axios');
const { integrationsConfig } = require('../config');
const transactionService = require('./transaction.service');
const { calculateSummary, formatCurrency } = require('./report.service');
const { getNormalizedPhone } = require('../utils/validation');

function isCommand(text = '') {
  const normalized = String(text).toLowerCase().trim();
  return ['ajuda', 'menu', 'resumo', 'saldo', 'listar'].includes(normalized);
}

function buildHelpResponse() {
  return (
    `*Micro no Controle*\n\n` +
    `Envie mensagens como:\n` +
    `- gastei 25 no mercado\n` +
    `- recebi 150 do cliente\n` +
    `- paguei 80 de aluguel\n\n` +
    `Comandos disponiveis:\n` +
    `- ajuda\n` +
    `- resumo\n` +
    `- saldo\n` +
    `- listar`
  );
}

function buildSummaryResponse(transactions = []) {
  const resumo = calculateSummary(transactions);

  return (
    `*Seu resumo financeiro*\n\n` +
    `Entradas: ${formatCurrency(resumo.entradas)}\n` +
    `Saidas: ${formatCurrency(resumo.saidas)}\n` +
    `Registros: ${resumo.total_registros}\n` +
    `Saldo: ${formatCurrency(resumo.saldo)}`
  );
}

function buildBalanceResponse(transactions = []) {
  const resumo = calculateSummary(transactions);
  return `Seu saldo atual e ${formatCurrency(resumo.saldo)}`;
}

function buildListResponse(transactions = []) {
  if (!transactions.length) {
    return 'Voce ainda nao tem lancamentos registrados.';
  }

  const recent = [...transactions].slice(-5).reverse();
  const lines = recent.map((item, index) => {
    const marker = item.tipo === 'entrada'
      ? '[entrada]'
      : item.tipo === 'saida'
        ? '[saida]'
        : '[outro]';

    return `${index + 1}. ${marker} ${formatCurrency(item.valor || 0)} - ${item.categoria || 'geral'}\n   ${item.mensagem_original || 'sem descricao'}`;
  });

  return `Seus ultimos lancamentos\n\n${lines.join('\n\n')}`;
}

function buildRegisterResponse(data = {}) {
  if (data.tipo === 'entrada') {
    return (
      `Entrada registrada!\n\n` +
      `Valor: ${formatCurrency(data.valor || 0)}\n` +
      `Categoria: ${data.categoria}\n\n` +
      `Digite resumo para ver seu financeiro.`
    );
  }

  if (data.tipo === 'saida') {
    return (
      `Saida registrada!\n\n` +
      `Valor: ${formatCurrency(data.valor || 0)}\n` +
      `Categoria: ${data.categoria}\n\n` +
      `Digite resumo para ver seu financeiro.`
    );
  }

  return `Nao consegui entender essa mensagem com seguranca.\n\nDigite ajuda para ver exemplos.`;
}

async function sendText(phone, message) {
  const normalizedPhone = getNormalizedPhone(phone);

  if (!normalizedPhone) {
    throw new Error('Telefone vazio ao tentar responder');
  }

  const { instance, token, clientToken } = integrationsConfig.zapi;
  if (!instance || !token || !clientToken) {
    throw new Error('Z-API nao configurada: preencha ZAPI_INSTANCE, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN');
  }

  const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;
  const payload = {
    phone: normalizedPhone,
    message
  };

  const response = await axios({
    method: 'post',
    url,
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken
    },
    data: payload,
    timeout: 15000
  });

  return response.data;
}

async function sendReminder() {
  const phones = await transactionService.getUniquePhones();

  if (!phones.length) {
    return {
      status: 'ok',
      mensagem: 'Nenhum usuario encontrado para lembrete.',
      enviados: 0
    };
  }

  const message =
    `*Micro no Controle*\n\n` +
    `Voce ja registrou seus gastos de hoje?\n\n` +
    `Exemplos:\n` +
    `- gastei 25 no mercado\n` +
    `- recebi 120 do cliente\n\n` +
    `Digite resumo para ver seu financeiro.`;

  let enviados = 0;
  let erros = 0;

  for (const phone of phones) {
    try {
      await sendText(phone, message);
      enviados += 1;
    } catch (error) {
      erros += 1;
      console.error('Erro ao enviar lembrete para:', phone, error.response?.data || error.message);
    }
  }

  return {
    status: 'ok',
    total_usuarios: phones.length,
    enviados,
    erros
  };
}

async function handleWebhook(body = {}) {
  const phone =
    body.phone ||
    body.from ||
    body.telefone ||
    body.visitor?.phone ||
    '';

  const message =
    body.text?.message ||
    body.text ||
    body.message ||
    body.body ||
    '';

  const normalizedPhone = getNormalizedPhone(phone);
  const cleanMessage = String(message).trim();
  const normalizedMessage = cleanMessage.toLowerCase();
  const fromMe = body.fromMe === true || body.fromMe === 'true';

  if (!cleanMessage || fromMe) {
    return;
  }

  let responseMessage = '';

  if (isCommand(normalizedMessage)) {
    const userTransactions = await transactionService.getTransactionsByPhone(normalizedPhone);

    if (normalizedMessage === 'ajuda' || normalizedMessage === 'menu') {
      responseMessage = buildHelpResponse();
    } else if (normalizedMessage === 'resumo') {
      responseMessage = buildSummaryResponse(userTransactions);
    } else if (normalizedMessage === 'saldo') {
      responseMessage = buildBalanceResponse(userTransactions);
    } else if (normalizedMessage === 'listar') {
      responseMessage = buildListResponse(userTransactions);
    }
  } else {
    const transactionData = transactionService.extractTransactionData(cleanMessage);
    const shouldSave =
      ['entrada', 'saida'].includes(transactionData.tipo) &&
      transactionData.valor !== null;

    if (shouldSave) {
      await transactionService.createTransactionRecord({
        origem: 'webhook',
        telefone: normalizedPhone,
        mensagem_original: cleanMessage,
        ...transactionData
      });
    }

    responseMessage = buildRegisterResponse(transactionData);
  }

  if (normalizedPhone && responseMessage) {
    await sendText(normalizedPhone, responseMessage);
  }
}

module.exports = {
  handleWebhook,
  sendReminder,
  sendText
};
