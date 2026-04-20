const path = require('path');
require('dotenv').config();

const rootDir = __dirname.includes(`${path.sep}config`)
  ? path.resolve(__dirname, '..')
  : __dirname;

const appConfig = {
  rootDir,
  envPath: path.join(rootDir, '.env'),
  publicDir: path.join(rootDir, 'public'),
  port: Number(process.env.PORT) || 3000
};

const integrationsConfig = {
  zapi: {
    instance: process.env.ZAPI_INSTANCE || '',
    token: process.env.ZAPI_TOKEN || '',
    clientToken: process.env.ZAPI_CLIENT_TOKEN || ''
  },
  mercadopago: {
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-5492345052446963-041009-704e7e3d7823ce601f4c07e7d9bc51e0-3298931587',
    publicKey: process.env.MP_PUBLIC_KEY || 'APP_USR-0ecb5829-5b65-424b-b335-522242db0565'
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  }
};

const databaseConfig = {
  host: process.env.DB_HOST || '',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || ''
};

function hasConfigValue(value) {
  return Boolean(String(value || '').trim());
}

module.exports = {
  appConfig,
  databaseConfig,
  hasConfigValue,
  integrationsConfig
};
