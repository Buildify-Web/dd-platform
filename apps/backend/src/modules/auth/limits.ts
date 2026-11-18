import { RateLimiter } from "../../lib/rate-limit";

const MIN = 60_000;

/**
 * Request-rate limits for the public auth endpoints (per process, see lib/rate-limit.ts).
 * These sit in front of the per-account lockout (LOGIN_MAX_FAILURES), which is stored in the DB.
 */
export const limits = {
  /** Sign-in attempts from one IP, any account. */
  loginPerIp: new RateLimiter(30, 15 * MIN),
  /** Activation attempts from one IP. */
  activatePerIp: new RateLimiter(15, 15 * MIN),
  /** "Forgot password" requests from one IP. */
  forgotPerIp: new RateLimiter(5, 15 * MIN),
  /** Reset / activation emails for one address (extra requests are silently dropped). */
  forgotPerEmail: new RateLimiter(3, 60 * MIN),
  /** Token checks + password saves from one IP (stops token guessing). */
  tokenPerIp: new RateLimiter(30, 15 * MIN),
};

/**
 * Failure counter for emails that have no account, so "unknown email" walks through
 * exactly the same "attempts left" → "locked" responses as a real account and the
 * replies never reveal whether an account exists.
 */
const unknown = new Map<string, { count: number; lockedUntil: number }>();

export const unknownEmailFailures = {
  lockedFor(email: string, now = Date.now()): number {
    const entry = unknown.get(email);
    return entry && entry.lockedUntil > now ? Math.ceil((entry.lockedUntil - now) / 1000) : 0;
  },
  /** Records a failure; returns attempts left, or 0 when the email is now "locked". */
  fail(email: string, maxFailures: number, lockMs: number, now = Date.now()): number {
    if (unknown.size > 50_000) unknown.clear();
    const entry = unknown.get(email) ?? { count: 0, lockedUntil: 0 };
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      entry.count = 0;
      entry.lockedUntil = 0;
    }
    entry.count += 1;
    if (entry.count >= maxFailures) {
      entry.count = 0;
      entry.lockedUntil = now + lockMs;
    }
    unknown.set(email, entry);
    return entry.lockedUntil > now ? 0 : maxFailures - entry.count;
  },
  clear() {
    unknown.clear();
  },
};

export function resetAllLimits() {
  for (const l of Object.values(limits)) l.clear();
  unknownEmailFailures.clear();
}
