import type { SessionPortal, User } from "@dd/db";
import { AUTH_ERRORS, portalForRole, type AuthUser, type Portal } from "@dd/shared/auth";
import { env } from "../../config/env";
import {
  dummyPasswordHash,
  generateTemporaryPassword,
  hashPassword,
  randomToken,
  sha256,
  verifyPassword,
} from "../../lib/crypto";
import { db } from "../../lib/db";
import { HttpError, rateLimited } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { maskEmail } from "../../lib/mask";
import type { ClientContext } from "../../middleware/client-context";
import { sendEmail } from "../../services/email";
import { accountInviteEmail, passwordChangedEmail, passwordResetEmail } from "../../services/email/templates";
import { recordAuthEvent } from "./events";
import { limits, unknownEmailFailures } from "./limits";
import { createSession, sessionEndsAt } from "./sessions";

const MIN = 60_000;
const toPortalEnum = (p: Portal): SessionPortal => (p === "admin" ? "ADMIN" : "STAFF");

export const publicUser = (u: User): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  isMainAdmin: u.isMainAdmin,
});

const invalidCredentials = (attemptsLeft: number) =>
  new HttpError(
    401,
    AUTH_ERRORS.INVALID_CREDENTIALS,
    "Incorrect email or password.",
    // Only shown when it matters, and identical for unknown emails (see unknownEmailFailures).
    attemptsLeft <= 2 ? { attemptsLeft, lockMinutes: env().LOGIN_LOCK_MINUTES } : undefined,
  );

const accountLocked = (retryAfterSeconds: number) =>
  new HttpError(
    423,
    AUTH_ERRORS.ACCOUNT_LOCKED,
    `Too many failed attempts. Try again in ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} minutes, or reset your password.`,
    { retryAfter: retryAfterSeconds },
    { "Retry-After": String(retryAfterSeconds) },
  );

/**
 * Records a wrong password against a real account. Locks the account after
 * LOGIN_MAX_FAILURES consecutive failures. Returns the error to throw.
 */
async function registerFailure(user: User, ctx: ClientContext, portal: SessionPortal | null, reason: string) {
  const e = env();
  const updated = await db().user.update({
    where: { id: user.id },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (updated.failedLoginCount >= e.LOGIN_MAX_FAILURES) {
    const lockedUntil = new Date(Date.now() + e.LOGIN_LOCK_MINUTES * MIN);
    await db().user.update({ where: { id: user.id }, data: { lockedUntil, failedLoginCount: 0 } });
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason });
    await recordAuthEvent("ACCOUNT_LOCKED", ctx, { userId: user.id, email: user.email, portal });
    return accountLocked(e.LOGIN_LOCK_MINUTES * 60);
  }
  await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason });
  return invalidCredentials(e.LOGIN_MAX_FAILURES - updated.failedLoginCount);
}

/** Same responses as registerFailure, for an email with no account (nothing in the DB to lock). */
async function registerUnknownFailure(email: string, ctx: ClientContext, portal: SessionPortal | null, reason: string) {
  const e = env();
  await dummyPasswordHash().then((h) => verifyPassword(h, "timing-equaliser"));
  const left = unknownEmailFailures.fail(email, e.LOGIN_MAX_FAILURES, e.LOGIN_LOCK_MINUTES * MIN);
  await recordAuthEvent("LOGIN_FAILED", ctx, { email, portal, reason });
  return left === 0 ? accountLocked(e.LOGIN_LOCK_MINUTES * 60) : invalidCredentials(left);
}

function lockRemaining(user: User): number {
  return user.lockedUntil && user.lockedUntil.getTime() > Date.now()
    ? Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)
    : 0;
}

// ─────────────────────────────── Sign in ───────────────────────────────

export async function login(
  input: { email: string; password: string; portal: Portal; rememberMe: boolean },
  ctx: ClientContext,
) {
  const portal = toPortalEnum(input.portal);
  const ipHit = limits.loginPerIp.hit(ctx.ip);
  if (!ipHit.ok) throw rateLimited(ipHit.retryAfter);

  const user = await db().user.findUnique({ where: { email: input.email } });

  if (!user) {
    const locked = unknownEmailFailures.lockedFor(input.email);
    if (locked) throw accountLocked(locked);
    throw await registerUnknownFailure(input.email, ctx, portal, "UNKNOWN_EMAIL");
  }

  const locked = lockRemaining(user);
  if (locked) {
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason: "LOCKED" });
    throw accountLocked(locked);
  }

  // Accounts that were approved but never activated only have a temporary password.
  if (user.status === "INVITED") {
    const tempOk = !!user.tempPasswordHash && (await verifyPassword(user.tempPasswordHash, input.password));
    if (!tempOk) throw await registerFailure(user, ctx, portal, "BAD_PASSWORD");
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason: "NOT_ACTIVATED" });
    throw new HttpError(403, AUTH_ERRORS.ACCOUNT_NOT_ACTIVATED, "Your account isn't activated yet. Activate it with the temporary password we emailed you.");
  }

  // Pending, rejected or password-less accounts can't sign in. Same answer as a wrong password.
  if (!user.passwordHash || user.status === "PENDING_APPROVAL" || user.status === "REJECTED") {
    await verifyPassword(await dummyPasswordHash(), input.password);
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason: `STATUS_${user.status}` });
    throw invalidCredentials(env().LOGIN_MAX_FAILURES);
  }

  if (!(await verifyPassword(user.passwordHash, input.password))) {
    throw await registerFailure(user, ctx, portal, "BAD_PASSWORD");
  }

  // ── Password is correct from here on: safe to be specific. ──
  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await db().user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  }

  if (user.status === "DISABLED") {
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason: "DISABLED" });
    throw new HttpError(403, AUTH_ERRORS.ACCOUNT_DISABLED, "This account has been turned off. Please contact the admin.");
  }

  // Each role signs in through its own portal only. Admin is never granted by the staff portal.
  const allowedPortal = portalForRole(user.role);
  if (allowedPortal !== input.portal) {
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user.id, email: user.email, portal, reason: "WRONG_PORTAL" });
    throw new HttpError(
      403,
      AUTH_ERRORS.WRONG_PORTAL,
      allowedPortal === "staff"
        ? "This account doesn't have admin access. Sign in through the staff portal."
        : "This is an admin account. Sign in through the admin portal.",
      { portal: allowedPortal },
    );
  }

  const { token, session } = await createSession(user, portal, input.rememberMe, ctx);
  await db().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAuthEvent("LOGIN_SUCCEEDED", ctx, { userId: user.id, email: user.email, portal });

  return {
    token,
    user: publicUser(user),
    session: { expiresAt: sessionEndsAt(session).toISOString(), absoluteExpiresAt: session.expiresAt.toISOString(), idleTimeoutMinutes: session.idleTimeoutMinutes, rememberMe: session.rememberMe },
  };
}

// ───────────────────────────── Activation ─────────────────────────────

/** Step 1: check the emailed username + temporary password; returns a short-lived ticket for step 2. */
export async function verifyActivation(input: { email: string; temporaryPassword: string }, ctx: ClientContext) {
  const hit = limits.activatePerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const e = env();

  const user = await db().user.findUnique({ where: { email: input.email } });
  const mismatch = () =>
    new HttpError(401, AUTH_ERRORS.INVALID_CREDENTIALS, "That username and temporary password don't match. Check the email we sent you.");

  if (!user || user.status !== "INVITED" || !user.tempPasswordHash) {
    await verifyPassword(await dummyPasswordHash(), input.temporaryPassword);
    if (user?.status === "ACTIVE" && user.passwordHash && (await verifyPassword(user.passwordHash, input.temporaryPassword))) {
      throw new HttpError(409, AUTH_ERRORS.VALIDATION, "This account is already active. Sign in with your password.", {
        portal: portalForRole(user.role),
      });
    }
    await recordAuthEvent("LOGIN_FAILED", ctx, { userId: user?.id, email: input.email, reason: "ACTIVATION_MISMATCH" });
    throw mismatch();
  }

  const locked = lockRemaining(user);
  if (locked) throw accountLocked(locked);

  if (!(await verifyPassword(user.tempPasswordHash, input.temporaryPassword))) {
    const err = await registerFailure(user, ctx, null, "BAD_TEMP_PASSWORD");
    throw err.code === AUTH_ERRORS.ACCOUNT_LOCKED ? err : mismatch();
  }

  if (!user.tempPasswordExpiresAt || user.tempPasswordExpiresAt.getTime() <= Date.now()) {
    throw new HttpError(410, AUTH_ERRORS.TEMP_PASSWORD_EXPIRED, "These login details have expired. Request new ones and we'll email them to you.");
  }

  const ticket = randomToken();
  const expiresAt = new Date(Date.now() + e.ACTIVATION_TICKET_MINUTES * MIN);
  await db().$transaction([
    db().user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } }),
    db().authToken.updateMany({ where: { userId: user.id, purpose: "ACTIVATION", usedAt: null }, data: { usedAt: new Date() } }),
    db().authToken.create({ data: { userId: user.id, purpose: "ACTIVATION", tokenHash: sha256(ticket), expiresAt, ipAddress: ctx.ip.slice(0, 45) } }),
  ]);
  await recordAuthEvent("ACTIVATION_VERIFIED", ctx, { userId: user.id, email: user.email });

  return { ticket, expiresAt: expiresAt.toISOString(), user: { name: user.name, email: user.email, role: user.role } };
}

async function findLiveToken(raw: string, purpose: "ACTIVATION" | "PASSWORD_RESET") {
  const token = await db().authToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
  const ok =
    token &&
    token.purpose === purpose &&
    !token.usedAt &&
    token.expiresAt.getTime() > Date.now() &&
    token.user.status === (purpose === "ACTIVATION" ? "INVITED" : "ACTIVE");
  return ok ? token : null;
}

const linkInvalid = (purpose: "ACTIVATION" | "PASSWORD_RESET") =>
  new HttpError(
    400,
    AUTH_ERRORS.TOKEN_INVALID,
    purpose === "ACTIVATION"
      ? "This activation step has expired. Enter your username and temporary password again."
      : "This reset link has expired or was already used. Request a new one.",
  );

/** Step 2 page load: is the activation ticket still valid? */
export async function inspectActivationTicket(ticket: string, ctx: ClientContext) {
  const hit = limits.tokenPerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const token = await findLiveToken(ticket, "ACTIVATION");
  if (!token) throw linkInvalid("ACTIVATION");
  return { name: token.user.name, email: token.user.email, role: token.user.role, expiresAt: token.expiresAt.toISOString() };
}

/** Step 2: choose a password. The account becomes ACTIVE. */
export async function completeActivation(input: { ticket: string; password: string }, ctx: ClientContext) {
  const hit = limits.tokenPerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const token = await findLiveToken(input.ticket, "ACTIVATION");
  if (!token) throw linkInvalid("ACTIVATION");
  const { user } = token;

  if (user.tempPasswordHash && (await verifyPassword(user.tempPasswordHash, input.password))) {
    throw new HttpError(400, AUTH_ERRORS.PASSWORD_REUSED, "Choose a password that's different from the temporary one.");
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  await db().$transaction([
    db().user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: now, status: "ACTIVE", tempPasswordHash: null, tempPasswordExpiresAt: null, failedLoginCount: 0, lockedUntil: null },
    }),
    db().authToken.updateMany({ where: { userId: user.id, purpose: "ACTIVATION", usedAt: null }, data: { usedAt: now } }),
    db().passwordHistory.create({ data: { userId: user.id, passwordHash } }),
  ]);
  await recordAuthEvent("ACTIVATION_COMPLETED", ctx, { userId: user.id, email: user.email });

  const portal = portalForRole(user.role);
  void sendEmail(passwordChangedEmail({ to: user.email, name: user.name, at: now, activated: true, signInUrl: `${env().PORTAL_URL}/login/${portal}` }));
  return { email: user.email, portal };
}

// ──────────────────────── Forgot / reset password ────────────────────────

/**
 * "Forgot password" and "Request new" (activation). Always answers the same way, straight
 * away, whether or not the email has an account; the real work runs after the response so
 * timing can't reveal anything either.
 *  - ACTIVE account   → emails a single-use reset link.
 *  - INVITED account  → emails fresh login details (new temporary password).
 *  - anything else    → nothing is sent.
 */
export function requestPasswordHelp(email: string, ctx: ClientContext) {
  const hit = limits.forgotPerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  if (limits.forgotPerEmail.hit(email).ok) {
    setImmediate(() => {
      processPasswordHelp(email, ctx).catch((err) => logger.error({ err }, "password help processing failed"));
    });
  }
  return { sentTo: maskEmail(email), expiresInMinutes: env().RESET_TOKEN_MINUTES };
}

export async function processPasswordHelp(email: string, ctx: ClientContext) {
  const e = env();
  const user = await db().user.findUnique({ where: { email } });
  if (!user) {
    await recordAuthEvent("PASSWORD_RESET_REQUESTED", ctx, { email, reason: "UNKNOWN_EMAIL" });
    return;
  }

  if (user.status === "ACTIVE") {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + e.RESET_TOKEN_MINUTES * MIN);
    await db().$transaction([
      db().authToken.updateMany({ where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null }, data: { usedAt: new Date() } }),
      db().authToken.create({ data: { userId: user.id, purpose: "PASSWORD_RESET", tokenHash: sha256(token), expiresAt, ipAddress: ctx.ip.slice(0, 45) } }),
    ]);
    await recordAuthEvent("PASSWORD_RESET_REQUESTED", ctx, { userId: user.id, email });
    await sendEmail(
      passwordResetEmail({ to: user.email, name: user.name, resetUrl: `${e.PORTAL_URL}/reset-password?token=${token}`, expiresInMinutes: e.RESET_TOKEN_MINUTES }),
    );
    return;
  }

  if (user.status === "INVITED") {
    await issueTemporaryPassword(user, ctx, { resent: true });
    return;
  }

  await recordAuthEvent("PASSWORD_RESET_REQUESTED", ctx, { userId: user.id, email, reason: `STATUS_${user.status}` });
}

/**
 * Gives an approved account a new temporary password and emails it with the activation link.
 * Used when an admin approves a registration, by "Request new", and by the main-admin bootstrap.
 * Returns the temporary password so a CLI can print it when email isn't configured.
 */
export async function issueTemporaryPassword(user: User, ctx: ClientContext, opts: { resent?: boolean } = {}) {
  const e = env();
  const temporaryPassword = generateTemporaryPassword();
  const expiresAt = new Date(Date.now() + e.TEMP_PASSWORD_DAYS * 24 * 60 * MIN);
  await db().$transaction([
    db().user.update({
      where: { id: user.id },
      data: { status: "INVITED", tempPasswordHash: await hashPassword(temporaryPassword), tempPasswordExpiresAt: expiresAt, failedLoginCount: 0, lockedUntil: null },
    }),
    db().authToken.updateMany({ where: { userId: user.id, purpose: "ACTIVATION", usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await recordAuthEvent(opts.resent ? "ACTIVATION_RESENT" : "ACCOUNT_INVITED", ctx, { userId: user.id, email: user.email });
  const sent = await sendEmail(
    accountInviteEmail({ to: user.email, name: user.name, role: user.role, temporaryPassword, expiresAt, activateUrl: `${e.PORTAL_URL}/activate`, resent: opts.resent }),
  );
  return { temporaryPassword, expiresAt, sent };
}

/** Reset page load: is the link still valid? */
export async function inspectResetToken(raw: string, ctx: ClientContext) {
  const hit = limits.tokenPerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const token = await findLiveToken(raw, "PASSWORD_RESET");
  if (!token) throw linkInvalid("PASSWORD_RESET");
  return { email: maskEmail(token.user.email), expiresAt: token.expiresAt.toISOString() };
}

/** Saves the new password, burns the link and signs out every session. */
export async function resetPassword(input: { token: string; password: string }, ctx: ClientContext) {
  const hit = limits.tokenPerIp.hit(ctx.ip);
  if (!hit.ok) throw rateLimited(hit.retryAfter);
  const token = await findLiveToken(input.token, "PASSWORD_RESET");
  if (!token) throw linkInvalid("PASSWORD_RESET");
  const { user } = token;
  const e = env();

  // "Choose something you haven't used here before": current + last N passwords.
  const history = await db().passwordHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: e.PASSWORD_HISTORY_COUNT,
    select: { passwordHash: true },
  });
  const previous = [user.passwordHash, ...history.map((h) => h.passwordHash)].filter((h): h is string => !!h);
  for (const old of new Set(previous)) {
    if (await verifyPassword(old, input.password)) {
      throw new HttpError(400, AUTH_ERRORS.PASSWORD_REUSED, "You've used this password here before. Choose a new one.");
    }
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const [, , , revoked] = await db().$transaction([
    db().user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null } }),
    db().authToken.updateMany({ where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null }, data: { usedAt: now } }),
    db().passwordHistory.create({ data: { userId: user.id, passwordHash } }),
    db().session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now, revokedReason: "PASSWORD_CHANGED" } }),
  ]);
  await trimPasswordHistory(user.id, e.PASSWORD_HISTORY_COUNT);
  await recordAuthEvent("PASSWORD_RESET_COMPLETED", ctx, { userId: user.id, email: user.email, reason: `SESSIONS_REVOKED_${revoked.count}` });

  const portal = portalForRole(user.role);
  void sendEmail(passwordChangedEmail({ to: user.email, name: user.name, at: now, activated: false, signInUrl: `${e.PORTAL_URL}/login/${portal}` }));
  return { email: user.email, portal, sessionsSignedOut: revoked.count };
}

async function trimPasswordHistory(userId: string, keep: number) {
  const stale = await db().passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: Math.max(keep, 1),
    select: { id: true },
  });
  if (stale.length) await db().passwordHistory.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
}
