const express = require('express');
const { appConfig, hasConfigValue, integrationsConfig } = require('./config');
const appRoutes = require('./routes');
const marketingRoutes = require('./marketing/routes');
const { initPersistence, isMysqlConfigured, isMysqlReady } = require('./services/persistence.service');

const app = express();

function logStartup() {
  console.log('[startup] Iniciando Micro no Controle API');
  console.log(`[startup] Ambiente carregado de ${appConfig.envPath} quando disponivel`);
  console.log(`[startup] Porta configurada: ${appConfig.port}`);
  console.log(`[startup] Persistencia configurada: ${isMysqlConfigured() ? 'PostgreSQL' : 'nao configurada'}`);
  console.log(
    `[startup] Integracoes: Z-API=${hasConfigValue(integrationsConfig.zapi.instance) && hasConfigValue(integrationsConfig.zapi.token) && hasConfigValue(integrationsConfig.zapi.clientToken) ? 'configurada' : 'pendente'} | ` +
    `Mercado Pago=${hasConfigValue(integrationsConfig.mercadopago.accessToken) ? 'configurado' : 'pendente'} | ` +
    `MP public key=${hasConfigValue(integrationsConfig.mercadopago.publicKey) ? 'configurada' : 'pendente'} | ` +
    `Marketing AI=${hasConfigValue(integrationsConfig.deepseek.apiKey) ? 'configurada' : 'pendente'}`
  );
}

function registerMiddlewares() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/public', express.static(appConfig.publicDir));
}

function registerRoutes() {
  app.use('/marketing', marketingRoutes);
  app.use(appRoutes);
}

function registerErrorHandler() {
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    console.error('[http] Erro nao tratado:', error.response?.data || error.message || error);

    return res.status(error.statusCode || 500).json({
      status: 'erro',
      mensagem: error.publicMessage || 'Erro interno do servidor'
    });
  });
}

async function startServer() {
  logStartup();
  await initPersistence();

  registerMiddlewares();
  registerRoutes();
  registerErrorHandler();

  app.listen(appConfig.port, () => {
    console.log(`[startup] Servidor rodando na porta ${appConfig.port}`);
    console.log(`[startup] Health principal: http://localhost:${appConfig.port}/api`);
    console.log(`[startup] Health marketing: http://localhost:${appConfig.port}/marketing/health`);
    console.log(`[startup] Persistencia ativa: ${isMysqlReady() ? 'PostgreSQL' : 'nao configurada'}`);
  });
}

startServer().catch(error => {
  console.error('[startup] Falha fatal ao iniciar aplicacao:', error.message || error);
  process.exit(1);
});
