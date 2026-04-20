const express = require('express');
const path = require('path');
const { appConfig } = require('../config');
const { asyncHandler } = require('../utils/async-handler');
const { getNormalizedPhone } = require('../utils/validation');
const { authenticateByToken } = require('../middlewares/auth.middleware');
const { requireActiveUser, requirePremiumPlan } = require('../middlewares/access.middleware');
const { requireAdminSecret } = require('../middlewares/admin.middleware');
const transactionService = require('../services/transaction.service');
const reportService = require('../services/report.service');
const whatsappService = require('../services/whatsapp.service');
const paymentService = require('../services/payment.service');
const persistenceService = require('../services/persistence.service');

const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(appConfig.publicDir, 'dashboard.html'));
});

router.get('/', (req, res) => {
  return res.json({
    status: 'ok',
    mensagem: 'API rodando 🚀'
  });
});

router.get('/teste-mercadopago', asyncHandler(async (req, res) => {
  try {
    const payload = await paymentService.testMercadoPagoConnection();
    return res.json(payload);
  } catch (error) {
    console.error('Erro ao testar Mercado Pago:', error.response?.data || error.message || error);
    return res.status(error.statusCode || 500).json({
      status: 'erro',
      mensagem: error.message === 'MP_ACCESS_TOKEN nao configurado'
        ? 'MP_ACCESS_TOKEN nao configurado'
        : 'Falha ao conectar com Mercado Pago',
      detalhe: error.response?.data || error.message
    });
  }
}));

router.get('/dados', asyncHandler(async (req, res) => {
  const dados = await transactionService.getAllTransactions();

  return res.json({
    status: 'ok',
    total_registros: dados.length,
    dados
  });
}));

router.get('/usuarios', asyncHandler(async (req, res) => {
  if (String(req.query.admin || '') !== '1') {
    return res.status(403).json({
      status: 'erro',
      mensagem: 'acesso negado'
    });
  }

  const telefone = getNormalizedPhone(req.query.telefone || '');
  const usuarios = await transactionService.getUsers(telefone);

  return res.json({
    status: 'ok',
    total_usuarios: usuarios.length,
    usuarios
  });
}));


router.get('/admin/usuarios', requireAdminSecret, asyncHandler(async (req, res) => {
  const telefone = getNormalizedPhone(req.query.telefone || '');
  const usuarios = await persistenceService.listUserProfiles({ phone: telefone });

  return res.json({
    status: 'ok',
    total_usuarios: usuarios.length,
    usuarios
  });
}));

router.patch('/admin/usuarios/:telefone/nome', requireAdminSecret, asyncHandler(async (req, res) => {
  const telefone = getNormalizedPhone(req.params.telefone || '');
  const nome = String(req.body?.nome || '').trim();

  const usuarioAtualizado = await persistenceService.updateUserProfileByPhone(telefone, { nome });

  if (!usuarioAtualizado) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'usuario nao encontrado'
    });
  }

  return res.json({
    status: 'ok',
    mensagem: 'nome atualizado com sucesso',
    usuario: usuarioAtualizado
  });
}));

router.patch('/admin/usuarios/:telefone/plano', requireAdminSecret, asyncHandler(async (req, res) => {
  const telefone = getNormalizedPhone(req.params.telefone || '');
  const plano = String(req.body?.plano || '').trim().toLowerCase();

  if (!['free', 'premium'].includes(plano)) {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'plano invalido. valores aceitos: free ou premium'
    });
  }

  const usuarioAtualizado = await persistenceService.updateUserProfileByPhone(telefone, { plano });

  if (!usuarioAtualizado) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'usuario nao encontrado'
    });
  }

  return res.json({
    status: 'ok',
    mensagem: 'plano atualizado com sucesso',
    usuario: usuarioAtualizado
  });
}));

router.patch('/admin/usuarios/:telefone/status', requireAdminSecret, asyncHandler(async (req, res) => {
  const telefone = getNormalizedPhone(req.params.telefone || '');
  const status = String(req.body?.status || '').trim().toLowerCase();

  if (!['ativo', 'inativo'].includes(status)) {
    return res.status(400).json({
      status: 'erro',
      mensagem: 'status invalido. valores aceitos: ativo ou inativo'
    });
  }

  const usuarioAtualizado = await persistenceService.updateUserProfileByPhone(telefone, { status });

  if (!usuarioAtualizado) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'usuario nao encontrado'
    });
  }

  return res.json({
    status: 'ok',
    mensagem: 'status atualizado com sucesso',
    usuario: usuarioAtualizado
  });
}));

router.post('/admin/usuarios/:telefone/regen-token', requireAdminSecret, asyncHandler(async (req, res) => {
  const telefone = getNormalizedPhone(req.params.telefone || '');
  const resultado = await persistenceService.regenerateUserTokenByPhone(telefone);

  if (!resultado) {
    return res.status(404).json({
      status: 'erro',
      mensagem: 'usuario nao encontrado'
    });
  }

  return res.json({
    status: 'ok',
    mensagem: 'token regenerado com sucesso',
    token: resultado.token,
    usuario: resultado.usuario
  });
}));

router.get('/transacoes', authenticateByToken, requireActiveUser, asyncHandler(async (req, res) => {
  const transacoes = await transactionService.getTransactionsByPhone(req.telefone);

  return res.json({
    status: 'ok',
    total_transacoes: transacoes.length,
    transacoes
  });
}));

router.get('/resumo', authenticateByToken, requireActiveUser, asyncHandler(async (req, res) => {
  const resumo = await transactionService.getSummaryByPhone(req.telefone);

  return res.json({
    status: 'ok',
    telefone: req.telefone || null,
    usuario: req.usuario || null,
    total_registros: resumo.total_registros,
    entradas: resumo.entradas,
    saidas: resumo.saidas,
    saldo: resumo.saldo
  });
}));

router.get('/exportar/csv', authenticateByToken, requireActiveUser, requirePremiumPlan, asyncHandler(async (req, res) => {
  const transacoes = await transactionService.getTransactionsByPhone(req.telefone);
  const csv = reportService.generateCsv(transacoes);
  const fileName = `transacoes_${req.telefone}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  return res.send('\uFEFF' + csv);
}));

router.get('/exportar/csv/:telefone', authenticateByToken, requireActiveUser, requirePremiumPlan, asyncHandler(async (req, res) => {
  const transacoes = await transactionService.getTransactionsByPhone(req.telefone);
  const csv = reportService.generateCsv(transacoes);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transacoes_${req.telefone}.csv"`);

  return res.send('\uFEFF' + csv);
}));


router.get('/me', authenticateByToken, requireActiveUser, asyncHandler(async (req, res) => {
  return res.json({
    status: 'ok',
    usuario: {
      telefone: req.usuario?.telefone || '',
      nome: req.usuario?.nome || '',
      plano: req.usuario?.plano || 'free',
      status: req.usuario?.status || 'ativo'
    }
  });
}));

router.get('/exportar/xlsx', authenticateByToken, requireActiveUser, requirePremiumPlan, asyncHandler(async (req, res) => {
  const transacoes = await transactionService.getTransactionsByPhone(req.telefone);
  const workbook = await reportService.generateExcel(transacoes, req.telefone);
  const fileName = `transacoes_${req.telefone}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  return res.end();
}));

router.get('/lembrete', asyncHandler(async (req, res) => {
  const payload = await whatsappService.sendReminder();
  return res.json(payload);
}));

router.post('/webhook', asyncHandler(async (req, res) => {
  console.log('Webhook recebido:', JSON.stringify(req.body || {}));
  await whatsappService.handleWebhook(req.body || {});
  return res.sendStatus(200);
}));

router.get('/criar-pix-teste', asyncHandler(async (req, res) => {
  try {
    const payload = await paymentService.createPixPayment({
      name: req.query.nome || 'Cliente Micro',
      email: req.query.email || 'comprador_teste@email.com',
      phone: req.query.telefone || '61999999999',
      amount: req.query.valor || 19.9,
      description: 'Assinatura Micro no Controle',
      isTest: true
    });

    return res.json(payload);
  } catch (error) {
    console.error('Erro ao criar Pix de teste:', error.response?.data || error.message || error);
    return res.status(error.statusCode || 500).json({
      status: 'erro',
      mensagem: error.message === 'Valor invalido'
        ? 'Valor invalido'
        : error.message === 'MP_ACCESS_TOKEN nao configurado'
          ? 'MP_ACCESS_TOKEN nao configurado'
          : 'Falha ao criar Pix de teste',
      detalhe: error.response?.data || error.message
    });
  }
}));

router.post('/criar-pix', asyncHandler(async (req, res) => {
  try {
    const payload = await paymentService.createPixPayment({
      name: req.body.nome || '',
      email: req.body.email || '',
      phone: req.body.telefone || '',
      amount: req.body.valor || 0,
      description: req.body.descricao || 'Assinatura Micro no Controle',
      isTest: false
    });

    return res.json(payload);
  } catch (error) {
    console.error('Erro ao criar Pix:', error.response?.data || error.message || error);
    return res.status(error.statusCode || 500).json({
      status: 'erro',
      mensagem: error.message === 'Campos obrigatorios: nome, email, telefone, valor'
        ? 'Campos obrigatorios: nome, email, telefone, valor'
        : error.message === 'MP_ACCESS_TOKEN nao configurado'
          ? 'MP_ACCESS_TOKEN nao configurado'
          : 'Falha ao criar Pix',
      detalhe: error.response?.data || error.message
    });
  }
}));

router.post('/webhook-mercadopago', asyncHandler(async (req, res) => {
  console.log('Webhook Mercado Pago recebido:', JSON.stringify(req.body || {}));
  await paymentService.handleMercadoPagoWebhook(req.body || {});
  return res.sendStatus(200);
}));

module.exports = router;
