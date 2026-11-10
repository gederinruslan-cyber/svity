import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** A random, URL-safe secret token. */
export const newToken = () => randomBytes(32).toString("base64url");

/** Tokens are stored only as SHA-256, so a database leak doesn't leak sign-in links or sessions. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

export function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string, secret: string) {
  const a = Buffer.from(sign(value, secret));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
