import { createHmac, timingSafeEqual } from 'node:crypto';
export function equalSignature(expected, supplied) {
  const a = Buffer.from(expected); const b = Buffer.from(supplied || '');
  return a.length === b.length && timingSafeEqual(a, b);
}
export function authenticate(header, secret) {
  try {
    if (!header?.startsWith('Bearer ')) throw new Error();
    const parts = header.slice(7).split('.');
    if (parts.length !== 3) throw new Error();
    const [encodedHeader, encodedPayload, signature] = parts;
    if (JSON.parse(Buffer.from(encodedHeader, 'base64url').toString()).alg !== 'HS256') throw new Error();
    const expected = createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
    if (!equalSignature(expected, signature)) throw new Error();
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
    const now = Date.now() / 1000;
    if (typeof payload.userId !== 'string' || !payload.userId || !Number.isFinite(payload.exp) || payload.exp <= now || (payload.nbf != null && (!Number.isFinite(payload.nbf) || payload.nbf > now))) throw new Error();
    return payload.userId;
  } catch { const error = new Error('Please sign in again. Your session is missing or expired.'); error.status = 401; throw error; }
}
