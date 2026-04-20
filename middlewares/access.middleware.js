function requireActiveUser(req, res, next) {
  const status = String(req.usuario?.status || '').toLowerCase();

  if (status !== 'ativo') {
    return res.status(403).json({
      status: 'erro',
      mensagem: 'usuario inativo'
    });
  }

  return next();
}

function requirePremiumPlan(req, res, next) {
  const plano = String(req.usuario?.plano || '').toLowerCase();

  if (plano !== 'premium') {
    return res.status(403).json({
      status: 'erro',
      mensagem: 'recurso disponivel apenas para premium'
    });
  }

  return next();
}

module.exports = {
  requireActiveUser,
  requirePremiumPlan
};
