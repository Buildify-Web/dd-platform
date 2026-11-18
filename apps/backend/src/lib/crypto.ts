import { hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** argon2id with the OWASP-recommended minimum (19 MiB memory, 2 passes, 1 lane). */
// `algorithm: 2` is Algorithm.Argon2id (a const enum, which verbatimModuleSyntax can't import).
const ARGON = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * A real argon2 hash of a random value. Checking a password against it when no account
 * matches makes "unknown email" take as long as "wrong password", so response timing
 * can't be used to discover which emails have accounts.
 */
let dummyHash: Promise<string> | undefined;
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

/** Opaque URL-safe random token (256 bits). Give it to the client; store only sha256(token). */
export const randomToken = () => randomBytes(32).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Constant-time comparison for secrets of any length. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(sha256(a)), Buffer.from(sha256(b)));
}

/**
 * Temporary password for newly approved accounts, e.g. "Kite-7342-Mango58".
 * Easy to type from an email; ~35 bits of randomness, valid only until activation
 * (TEMP_PASSWORD_DAYS) and protected by the login lockout.
 */
const WORDS = [
  "Apple", "Banyan", "Cedar", "Delta", "Ember", "Falcon", "Garnet", "Harbor", "Indigo", "Jasmine",
  "Kite", "Lotus", "Mango", "Nectar", "Orbit", "Pebble", "Quartz", "River", "Saffron", "Tiger",
  "Umber", "Velvet", "Willow", "Yarrow", "Zephyr", "Amber", "Breeze", "Coral", "Dune", "Fern",
  "Grove", "Hazel", "Iris", "Juniper", "Kestrel", "Lagoon", "Maple", "Nova", "Opal", "Prism",
  "Raven", "Sierra", "Topaz", "Valley", "Walnut", "Cobalt", "Meadow", "Summit",
] as const;

export function generateTemporaryPassword(): string {
  const pick = () => WORDS[randomInt(WORDS.length)]!;
  return `${pick()}-${randomInt(1000, 10000)}-${pick()}${randomInt(10, 100)}`;
}
