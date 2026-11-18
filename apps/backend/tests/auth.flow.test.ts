import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { db, disconnectDb } from "../src/lib/db";
import { setEmailTransport, type EmailMessage } from "../src/services/email";
import { resetAllLimits } from "../src/modules/auth/limits";
import { issueTemporaryPassword, processPasswordHelp } from "../src/modules/auth/service";
import { TEST_INTERNAL_KEY, useTestEnv } from "./helpers";

/**
 * End-to-end auth flow against a real, migrated PostgreSQL database.
 * Runs only when TEST_DATABASE_URL is set (use a throwaway database: tables are wiped):
 *   TEST_DATABASE_URL=postgresql://…/dd_test pnpm --filter @dd/backend test
 */
const enabled = !!process.env.TEST_DATABASE_URL;
const ctx = { ip: "10.0.0.1", userAgent: "vitest", internal: true };

describe.skipIf(!enabled)("auth flow (database)", () => {
  let app: ReturnType<typeof createApp>;
  const outbox: EmailMessage[] = [];

  beforeAll(() => {
    useTestEnv();
    setEmailTransport({ send: async (m) => void outbox.push(m) });
    app = createApp();
  });
  beforeEach(async () => {
    resetAllLimits();
    outbox.length = 0;
    await db().authEvent.deleteMany();
    await db().user.deleteMany();
  });
  afterAll(async () => {
    setEmailTransport(undefined);
    await disconnectDb();
  });

  const api = () => ({
    post: (path: string, body: object) => request(app).post(path).set("x-internal-key", TEST_INTERNAL_KEY).set("x-client-ip", "203.0.113.9").send(body),
  });

  async function invite(email: string, role: "ADMIN" | "STAFF", isMainAdmin = false) {
    const user = await db().user.create({ data: { email, name: "Test User", role, status: "PENDING_APPROVAL", isMainAdmin } });
    const { temporaryPassword } = await issueTemporaryPassword(user, ctx);
    return temporaryPassword;
  }

  async function activate(email: string, temp: string, password: string) {
    const v = await api().post("/v1/auth/activation/verify", { email, temporaryPassword: temp });
    expect(v.status).toBe(200);
    const c = await api().post("/v1/auth/activation/complete", { ticket: v.body.ticket, password });
    expect(c.status).toBe(200);
    return c.body;
  }

  it("invite → activate → sign in → me → logout", async () => {
    const temp = await invite("owner@example.com", "ADMIN", true);
    expect(outbox[0]?.text).toContain(temp);

    // Can't sign in before activating, even with the right temporary password
    const early = await api().post("/v1/auth/login", { email: "owner@example.com", password: temp, portal: "admin" });
    expect(early.status).toBe(403);
    expect(early.body.error.code).toBe("ACCOUNT_NOT_ACTIVATED");

    // Temporary password can't become the real one
    const v = await api().post("/v1/auth/activation/verify", { email: "Owner@Example.com", temporaryPassword: temp });
    expect(v.status).toBe(200);
    const same = await api().post("/v1/auth/activation/complete", { ticket: v.body.ticket, password: temp });
    expect(same.body.error.code).toBe("PASSWORD_REUSED");

    const done = await api().post("/v1/auth/activation/complete", { ticket: v.body.ticket, password: "Garden2026" });
    expect(done.body).toEqual({ email: "owner@example.com", portal: "admin" });
    // ticket is single use
    expect((await api().post("/v1/auth/activation/ticket", { ticket: v.body.ticket })).status).toBe(400);

    const login = await api().post("/v1/auth/login", { email: "owner@example.com", password: "Garden2026", portal: "admin" });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ role: "ADMIN", isMainAdmin: true });
    expect(login.body.session.idleTimeoutMinutes).toBe(30);

    const me = await request(app).get("/v1/auth/me").set("authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.session.portal).toBe("admin");

    await request(app).post("/v1/auth/logout").set("authorization", `Bearer ${login.body.token}`).expect(204);
    expect((await request(app).get("/v1/auth/me").set("authorization", `Bearer ${login.body.token}`)).status).toBe(401);

    const events = await db().authEvent.findMany({ orderBy: { createdAt: "asc" }, select: { type: true, ipAddress: true } });
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["ACCOUNT_INVITED", "ACTIVATION_VERIFIED", "ACTIVATION_COMPLETED", "LOGIN_SUCCEEDED", "LOGOUT"]),
    );
    // Internal callers (valid X-Internal-Key) may pass the real client IP…
    expect(events.find((e) => e.type === "LOGIN_SUCCEEDED")?.ipAddress).toBe("203.0.113.9");
    // …anyone else's X-Client-IP is ignored (the logout above was sent without the key).
    expect(events.find((e) => e.type === "LOGOUT")?.ipAddress).not.toBe("203.0.113.9");
    const spoof = await request(app).post("/v1/auth/login").set("x-client-ip", "198.51.100.7").send({ email: "nobody@example.com", password: "x", portal: "admin" });
    expect(spoof.status).toBe(401);
    const spoofEvent = await db().authEvent.findFirst({ where: { email: "nobody@example.com" } });
    expect(spoofEvent?.ipAddress).not.toBe("198.51.100.7");
  });

  it("each role uses its own portal; pending accounts can't sign in", async () => {
    await activate("teacher@example.com", await invite("teacher@example.com", "STAFF"), "Teacher123");
    const wrong = await api().post("/v1/auth/login", { email: "teacher@example.com", password: "Teacher123", portal: "admin" });
    expect(wrong.status).toBe(403);
    expect(wrong.body.error).toMatchObject({ code: "WRONG_PORTAL", portal: "staff" });
    expect((await api().post("/v1/auth/login", { email: "teacher@example.com", password: "Teacher123", portal: "staff" })).status).toBe(200);

    await db().user.create({ data: { email: "waiting@example.com", name: "Waiting", role: "ADMIN", status: "PENDING_APPROVAL" } });
    const pending = await api().post("/v1/auth/login", { email: "waiting@example.com", password: "Anything1", portal: "admin" });
    expect(pending.status).toBe(401);
    expect(pending.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("locks after 5 failures, and unknown emails look identical", async () => {
    await activate("owner@example.com", await invite("owner@example.com", "ADMIN", true), "Garden2026");
    const tryLogin = (email: string) => api().post("/v1/auth/login", { email, password: "WrongPass1", portal: "admin" });

    const real: number[] = [];
    const ghost: number[] = [];
    for (let i = 0; i < 5; i++) {
      real.push((await tryLogin("owner@example.com")).status);
      ghost.push((await tryLogin("ghost@example.com")).status);
    }
    expect(real).toEqual([401, 401, 401, 401, 423]);
    expect(ghost).toEqual(real);

    // Locked: even the right password is refused until the lock ends
    const locked = await api().post("/v1/auth/login", { email: "owner@example.com", password: "Garden2026", portal: "admin" });
    expect(locked.status).toBe(423);
    expect(locked.headers["retry-after"]).toBeTruthy();
  });

  it("forgot → reset signs out every session and rejects reused passwords", async () => {
    await activate("owner@example.com", await invite("owner@example.com", "ADMIN", true), "Garden2026");
    const login = await api().post("/v1/auth/login", { email: "owner@example.com", password: "Garden2026", portal: "admin" });

    outbox.length = 0;
    await processPasswordHelp("owner@example.com", ctx);
    const link = outbox[0]?.text.match(/reset-password\?token=([A-Za-z0-9_-]+)/)?.[1];
    expect(link).toBeTruthy();

    expect((await api().post("/v1/auth/password/reset/verify", { token: link })).body.email).toBe("o•••@example.com");
    const reused = await api().post("/v1/auth/password/reset", { token: link, password: "Garden2026" });
    expect(reused.body.error.code).toBe("PASSWORD_REUSED");

    const reset = await api().post("/v1/auth/password/reset", { token: link, password: "Harvest2027" });
    expect(reset.status).toBe(200);
    expect(reset.body.sessionsSignedOut).toBe(1);
    expect((await request(app).get("/v1/auth/me").set("authorization", `Bearer ${login.body.token}`)).status).toBe(401);
    expect((await api().post("/v1/auth/password/reset", { token: link, password: "Another2028" })).status).toBe(400); // single use
    expect((await api().post("/v1/auth/login", { email: "owner@example.com", password: "Harvest2027", portal: "admin" })).status).toBe(200);
  });

  it("idle sessions expire with SESSION_EXPIRED", async () => {
    await activate("owner@example.com", await invite("owner@example.com", "ADMIN", true), "Garden2026");
    const login = await api().post("/v1/auth/login", { email: "owner@example.com", password: "Garden2026", portal: "admin" });
    await db().session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 31 * 60_000) } });
    const me = await request(app).get("/v1/auth/me").set("authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("SESSION_EXPIRED");
  });

  it("'Request new' re-sends login details to accounts that haven't activated", async () => {
    const first = await invite("teacher@example.com", "STAFF");
    outbox.length = 0;
    await processPasswordHelp("teacher@example.com", ctx);
    const second = outbox[0]?.text.match(/Temporary password: (\S+)/)?.[1];
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    expect((await api().post("/v1/auth/activation/verify", { email: "teacher@example.com", temporaryPassword: first })).status).toBe(401);
    expect((await api().post("/v1/auth/activation/verify", { email: "teacher@example.com", temporaryPassword: second! })).status).toBe(200);
  });
});
