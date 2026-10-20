const { createHmac, timingSafeEqual } = require('node:crypto');
function equalSignature(a, b) { const x = Buffer.from(a); const y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x, y); }
function createPayments({ keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET } = {}) {
  async function request(path, body) {
    if (!keyId || !keySecret) { const error = new Error('Paid enrollment is not available yet. Please choose a free event.'); error.status = 503; throw error; }
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok) { const error = new Error('Payment service is unavailable. Please retry from My events.'); error.status = 502; throw error; }
    return data;
  }
  return {
    enabled: Boolean(keyId && keySecret), keyId,
    createOrder: (event, reference) => request('orders', { amount: event.pricePaise, currency: 'INR', receipt: reference }),
    async capturedPayment(orderId) {
      const data = await request(`orders/${encodeURIComponent(orderId)}/payments`);
      return data.items?.find(payment => payment.status === 'captured') || null;
    },
    async verify(enrollment, input) {
      if (!keySecret || input.razorpay_order_id !== enrollment.orderId || typeof input.razorpay_payment_id !== 'string') {
        const error = new Error('Payment does not match this enrollment.'); error.status = 400; throw error;
      }
      const expected = createHmac('sha256', keySecret).update(`${enrollment.orderId}|${input.razorpay_payment_id}`).digest('hex');
      if (typeof input.razorpay_signature !== 'string' || !equalSignature(expected, input.razorpay_signature)) {
        const error = new Error('Invalid payment signature.'); error.status = 400; throw error;
      }
      return request(`payments/${encodeURIComponent(input.razorpay_payment_id)}`);
    }
  };
}

module.exports = { createPayments };
