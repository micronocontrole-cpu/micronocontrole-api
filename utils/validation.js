const { normalizePhone } = require('./phone');

function parseAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function isPositiveAmount(value) {
  return parseAmount(value) > 0;
}

function getNormalizedPhone(value) {
  return normalizePhone(value || '');
}

module.exports = {
  getNormalizedPhone,
  isPositiveAmount,
  parseAmount
};
