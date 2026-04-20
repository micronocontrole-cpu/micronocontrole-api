function requireAdminSecret(req, res, next) {
  const providedSecret = String(req.query.admin_secret || '').trim();
  const configuredSecret = String(process.env.ADMIN_SECRET || '').trim();

  if (!providedSecret || !configuredSecret || providedSecret !== configuredSecret) {
    return res.status(403).json({
      status: 'erro',
      mensagem: 'acesso administrativo negado'
    });
  }

  return next();
}

module.exports = {
  requireAdminSecret
};
