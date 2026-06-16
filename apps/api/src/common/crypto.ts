import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Reversible secret encryption for credentials at rest (App Shopify secrets, Store Bridge
 * tokens). AES-256-GCM; key = sha256(APP_ENCRYPTION_KEY). Format: base64(iv).base64(tag).base64(ct).
 * Spec: domain-model.md (encrypted at rest); never log or return the plaintext or the blob.
 */
function key(): Buffer {
  const k = process.env.APP_ENCRYPTION_KEY;
  if (!k) throw new Error("APP_ENCRYPTION_KEY is not set");
  return createHash("sha256").update(k).digest(); // 32 bytes
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const [ivB, tagB, ctB] = blob.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}
