import { argon2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(argon2);

// OWASP minimum for argon2id: 19 MiB, 2 passes, 1 lane.
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1, tagLength: 32 };

/** argon2id, stored in the standard PHC form: $argon2id$v=19$m=…,t=…,p=…$salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const nonce = randomBytes(16);
  const hash = await derive("argon2id", { message: password, nonce, ...PARAMS });
  return `$argon2id$v=19$m=${PARAMS.memory},t=${PARAMS.passes},p=${PARAMS.parallelism}$${nonce.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/.exec(stored);
  if (!m) return false;
  const expected = Buffer.from(m[5]!, "base64url");
  const actual = await derive("argon2id", {
    message: password,
    nonce: Buffer.from(m[4]!, "base64url"),
    memory: Number(m[1]),
    passes: Number(m[2]),
    parallelism: Number(m[3]),
    tagLength: expected.length,
  });
  return timingSafeEqual(actual, expected);
}

/** Verified against when the account doesn't exist, so a missing account takes as long as a wrong password. */
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));
