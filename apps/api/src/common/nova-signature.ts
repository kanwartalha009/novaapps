import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the X-Nova-Signature header sent by an app backend (Encore et al.).
 * Scheme (NOVA-INTEGRATION-CONTRACT.md): `sha256=<hex HMAC-SHA256(rawBody, secret)>`,
 * recomputed over the EXACT raw request body. Constant-time compare; 401 on mismatch.
 */
export function verifyNovaSignature(
  rawBody: Buffer | undefined,
  header: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !header || !secret) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
