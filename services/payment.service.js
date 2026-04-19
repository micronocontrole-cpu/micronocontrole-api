const axios = require('axios');
const { integrationsConfig } = require('../config');
const persistenceService = require('./persistence.service');
const { getNormalizedPhone, isPositiveAmount, parseAmount } = require('../utils/validation');

function ensureMercadoPagoConfigured() {
  if (!integrationsConfig.mercadopago.accessToken) {
    const error = new Error('MP_ACCESS_TOKEN nao configurado');
    error.statusCode = 500;
    throw error;
  }
}

async function testMercadoPagoConnection() {
  ensureMercadoPagoConfigured();

  const response = await axios.get('https://api.mercadopago.com/users/me', {
    headers: {
      Authorization: `Bearer ${integrationsConfig.mercadopago.accessToken}`
    },
    timeout: 15000
  });

  return {
    status: 'ok',
    mensagem: 'Mercado Pago conectado com sucesso',
    usuario: {
      id: response.data.id,
      nickname: response.data.nickname,
      email: response.data.email,
      country_id: response.data.country_id,
      site_id: response.data.site_id
    }
  };
}

async function createPixPayment({
  name = '',
  email = '',
  phone = '',
  amount = 0,
  description = 'Assinatura Micro no Controle',
  isTest = false
}) {
  ensureMercadoPagoConfigured();

  const normalizedPhone = getNormalizedPhone(phone);
  const normalizedAmount = parseAmount(amount);

  if (!isTest && (!name || !email || !normalizedPhone || !isPositiveAmount(normalizedAmount))) {
    const error = new Error('Campos obrigatorios: nome, email, telefone, valor');
    error.statusCode = 400;
    throw error;
  }

  if (!isPositiveAmount(normalizedAmount)) {
    const error = new Error('Valor invalido');
    error.statusCode = 400;
    throw error;
  }

  const requestBody = {
    transaction_amount: normalizedAmount,
    description,
    payment_method_id: 'pix',
    payer: {
      email: email || 'comprador_teste@email.com',
      first_name: name || 'Cliente Micro'
    },
    external_reference: normalizedPhone || `teste_${Date.now()}`,
    notification_url: 'https://micronocontrole.com.br/api/webhook-mercadopago'
  };

  const idempotencyKey = isTest
    ? `pix-teste-${Date.now()}`
    : `pix-${normalizedPhone}-${Date.now()}`;

  const response = await axios.post(
    'https://api.mercadopago.com/v1/payments',
    requestBody,
    {
      headers: {
        Authorization: `Bearer ${integrationsConfig.mercadopago.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      timeout: 20000
    }
  );

  const payment = response.data;

  await persistenceService.savePayment({
    phone: normalizedPhone,
    name,
    email,
    mercadopagoPaymentId: String(payment.id || ''),
    externalReference: String(payment.external_reference || requestBody.external_reference || ''),
    amount: Number(payment.transaction_amount || normalizedAmount),
    status: payment.status || 'pending',
    rawPayload: payment
  });

  return {
    status: 'ok',
    mensagem: isTest ? 'Pix criado com sucesso' : 'Pix criado com sucesso',
    payment_id: payment.id,
    status_pagamento: payment.status,
    valor: payment.transaction_amount,
    external_reference: payment.external_reference || null,
    qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
    qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
    ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url || null
  };
}

async function handleMercadoPagoWebhook(payload = {}) {
  await persistenceService.registerMercadoPagoWebhook(payload);
}

module.exports = {
  createPixPayment,
  handleMercadoPagoWebhook,
  testMercadoPagoConnection
};
