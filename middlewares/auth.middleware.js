const persistenceService = require('../services/persistence.service');

async function authenticateByToken(req, res, next) {
  const token = String(req.query.token || '').trim();

  if (!token) {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'token invalido'
    });
  }

  const usuario = await persistenceService.findUserByToken(token);

  if (!usuario || usuario.status === 'inativo') {
    return res.status(401).json({
      status: 'erro',
      mensagem: 'token invalido'
    });
  }

  // Segurança: telefone da sessão vem APENAS do token validado.
  req.telefone = usuario.telefone;
  req.usuario = usuario;

  return next();
}

module.exports = {
  authenticateByToken
};
