import { emailSchema, newPasswordSchema, PASSWORD_RULES } from "@dd/shared/auth";
import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, randomToken, safeEqual, sha256, verifyPassword } from "../src/lib/crypto";
import { maskEmail } from "../src/lib/mask";
import { RateLimiter } from "../src/lib/rate-limit";
import { unknownEmailFailures } from "../src/modules/auth/limits";
import { sessionEndsAt } from "../src/modules/auth/sessions";
import { parseBody } from "../src/middleware/validate";
import { loginBody } from "../src/modules/auth/schemas";
import { HttpError } from "../src/lib/errors";

describe("shared auth rules", () => {
  it("normalises emails", () => {
    expect(emailSchema.parse("  Meena@Example.COM ")).toBe("meena@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("enforces the password policy shown on 'Set a new password'", () => {
    expect(newPasswordSchema.safeParse("abc12345").success).toBe(true);
    expect(newPasswordSchema.safeParse("short1").success).toBe(false); // < 8
    expect(newPasswordSchema.safeParse("abcdefgh").success).toBe(false); // no number
    expect(newPasswordSchema.safeParse("12345678").success).toBe(false); // no letter
    expect(newPasswordSchema.safeParse(" abc12345").success).toBe(false); // leading space
    expect(PASSWORD_RULES.map((r) => r.test("abc12345"))).toEqual([true, true, true]);
  });
});

describe("crypto", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("Secret123");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Secret123")).toBe(true);
    expect(await verifyPassword(h, "secret123")).toBe(false);
    expect(await verifyPassword("garbage", "x")).toBe(false);
  });

  it("makes URL-safe random tokens and stable hashes", () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(t);
    expect(sha256("a")).toHaveLength(64);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("generates temporary passwords that pass the password policy", () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTemporaryPassword();
      expect(p).toMatch(/^[A-Z][a-z]+-\d{4}-[A-Z][a-z]+\d{2}$/);
      expect(newPasswordSchema.safeParse(p).success).toBe(true);
    }
  });
});

describe("helpers", () => {
  it("masks emails like the design", () => {
    expect(maskEmail("lakshmi@email.com")).toBe("l•••@email.com");
    expect(maskEmail("bad")).toBe("•••");
  });

  it("rate limiter blocks after the limit and resets after the window", () => {
    const rl = new RateLimiter(2, 1000);
    expect(rl.hit("k", 0).ok).toBe(true);
    expect(rl.hit("k", 10).ok).toBe(true);
    const blocked = rl.hit("k", 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(1);
    expect(rl.hit("k", 1001).ok).toBe(true);
  });

  it("unknown emails walk the same attempts-left → locked path as real accounts", () => {
    unknownEmailFailures.clear();
    const left = [1, 2, 3, 4, 5].map(() => unknownEmailFailures.fail("ghost@example.com", 5, 60_000, 1000));
    expect(left).toEqual([4, 3, 2, 1, 0]);
    expect(unknownEmailFailures.lockedFor("ghost@example.com", 2000)).toBe(59);
    expect(unknownEmailFailures.lockedFor("ghost@example.com", 62_000)).toBe(0);
  });

  it("session ends at the earlier of idle timeout and absolute expiry", () => {
    const lastSeenAt = new Date("2026-11-16T10:00:00Z");
    expect(sessionEndsAt({ lastSeenAt, idleTimeoutMinutes: 30, expiresAt: new Date("2026-11-16T20:00:00Z") }).toISOString()).toBe(
      "2026-11-16T10:30:00.000Z",
    );
    expect(sessionEndsAt({ lastSeenAt, idleTimeoutMinutes: 30, expiresAt: new Date("2026-11-16T10:10:00Z") }).toISOString()).toBe(
      "2026-11-16T10:10:00.000Z",
    );
  });

  it("validation returns field messages and rejects unknown keys", () => {
    try {
      parseBody(loginBody, { email: "x", password: "", portal: "admin" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const e = err as HttpError;
      expect(e.status).toBe(400);
      expect(e.details?.fields).toMatchObject({ email: "Enter a valid email address.", password: "Enter your password." });
    }
    expect(() => parseBody(loginBody, { email: "a@b.co", password: "x", portal: "admin", role: "ADMIN" })).toThrow(HttpError);
    expect(() => parseBody(loginBody, { email: "a@b.co", password: "x", portal: "parent" })).toThrow(HttpError);
  });
});
