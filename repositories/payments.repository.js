const { execute, fetchOne } = require('./base.repository');

async function createPayment({
  userId = null,
  phone = '',
  mercadopagoPaymentId = '',
  externalReference = '',
  amount = 0,
  status = 'pending',
  rawPayload = null
}) {
  await execute(
    `
      INSERT INTO payments (
        user_id,
        phone,
        mercadopago_payment_id,
        external_reference,
        amount,
        status,
        raw_payload,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      userId,
      phone || null,
      mercadopagoPaymentId || null,
      externalReference || null,
      Number(amount || 0),
      status || 'pending',
      rawPayload ? JSON.stringify(rawPayload) : null
    ]
  );
}

async function findPaymentByReference({ mercadopagoPaymentId = '', externalReference = '' }) {
  return fetchOne(
    `
      SELECT id
      FROM payments
      WHERE
        (? <> '' AND mercadopago_payment_id = ?)
        OR (? <> '' AND external_reference = ?)
      ORDER BY id DESC
      LIMIT 1
    `,
    [mercadopagoPaymentId, mercadopagoPaymentId, externalReference, externalReference]
  );
}

async function updatePayment(paymentId, {
  phone = '',
  mercadopagoPaymentId = '',
  externalReference = '',
  amount = 0,
  status = '',
  rawPayload = null
}) {
  await execute(
    `
      UPDATE payments
      SET
        phone = COALESCE(NULLIF(?, ''), phone),
        mercadopago_payment_id = COALESCE(NULLIF(?, ''), mercadopago_payment_id),
        external_reference = COALESCE(NULLIF(?, ''), external_reference),
        amount = CASE WHEN ? > 0 THEN ? ELSE amount END,
        status = COALESCE(NULLIF(?, ''), status),
        raw_payload = COALESCE(?, raw_payload),
        updated_at = NOW()
      WHERE id = ?
    `,
    [
      phone,
      mercadopagoPaymentId,
      externalReference,
      Number(amount || 0),
      Number(amount || 0),
      status,
      rawPayload ? JSON.stringify(rawPayload) : null,
      paymentId
    ]
  );
}

async function updatePaymentByReference({
  mercadopagoPaymentId = '',
  externalReference = '',
  phone = '',
  amount = 0,
  status = 'webhook_received',
  rawPayload = null
}) {
  const existingPayment = await findPaymentByReference({
    mercadopagoPaymentId,
    externalReference
  });

  if (!existingPayment) {
    await createPayment({
      phone,
      mercadopagoPaymentId,
      externalReference,
      amount,
      status,
      rawPayload
    });
    return;
  }

  await updatePayment(existingPayment.id, {
    phone,
    mercadopagoPaymentId,
    externalReference,
    amount,
    status,
    rawPayload
  });
}

module.exports = {
  createPayment,
  findPaymentByReference,
  updatePayment,
  updatePaymentByReference
};
