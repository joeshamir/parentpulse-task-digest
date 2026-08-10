import { createHmac } from 'node:crypto';

/**
 * Worker tokens bind the shared worker secret to a single user id, so a caller
 * can only act on the account its token was minted for. Format:
 *   <user_id>.<hex hmac-sha256(secret, user_id)>
 */
export function signWorkerToken(userId: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(userId).digest('hex');
  return `${userId}.${mac}`;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the user id encoded in the token, or null when the token is missing,
 * malformed, or not signed with the server secret. The user id is NEVER taken
 * from the request body.
 */
export function verifyWorkerToken(token: unknown, secret: string): string | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  const sep = token.lastIndexOf('.');
  if (sep <= 0) return null;
  const userId = token.slice(0, sep);
  const mac = token.slice(sep + 1);
  if (!UUID_RE.test(userId)) return null;
  const expected = createHmac('sha256', secret).update(userId).digest('hex');
  return safeEqual(mac, expected) ? userId : null;
}
