import type { Session, SessionEndReason, SessionPortal, User } from "@dd/db";
import { AUTH_ERRORS } from "@dd/shared/auth";
import { env } from "../../config/env";
import { randomToken, sha256 } from "../../lib/crypto";
import { db } from "../../lib/db";
import { HttpError, unauthenticated } from "../../lib/errors";
import type { ClientContext } from "../../middleware/client-context";
import { recordAuthEvent } from "./events";

const MIN = 60_000;
/** lastSeenAt is written at most once per minute per session, to keep DB writes low. */
const TOUCH_EVERY_MS = MIN;

/** Inactivity limit and absolute lifetime for a new session. */
export function sessionPolicy(rememberMe: boolean) {
  const e = env();
  return rememberMe
    ? { idleMinutes: e.SESSION_REMEMBER_IDLE_DAYS * 24 * 60, maxMs: e.SESSION_REMEMBER_MAX_DAYS * 24 * 60 * MIN }
    : { idleMinutes: e.SESSION_IDLE_MINUTES, maxMs: e.SESSION_MAX_HOURS * 60 * MIN };
}

export async function createSession(user: User, portal: SessionPortal, rememberMe: boolean, ctx: ClientContext) {
  const token = randomToken();
  const policy = sessionPolicy(rememberMe);
  const session = await db().session.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      portal,
      rememberMe,
      idleTimeoutMinutes: policy.idleMinutes,
      expiresAt: new Date(Date.now() + policy.maxMs),
      ipAddress: ctx.ip.slice(0, 45),
      userAgent: ctx.userAgent,
    },
  });
  return { token, session };
}

/** When the session ends if there's no more activity: the earlier of idle and absolute expiry. */
export function sessionEndsAt(session: Pick<Session, "lastSeenAt" | "idleTimeoutMinutes" | "expiresAt">): Date {
  const idleEnd = session.lastSeenAt.getTime() + session.idleTimeoutMinutes * MIN;
  return new Date(Math.min(idleEnd, session.expiresAt.getTime()));
}

const sessionExpired = () =>
  new HttpError(401, AUTH_ERRORS.SESSION_EXPIRED, "Your session expired. Please sign in again.");

/**
 * Resolves a bearer token to its live session and user, enforcing idle timeout, absolute
 * expiry and account status. Counts the call as activity (slides the idle window).
 */
export async function resolveSession(token: string, ctx: ClientContext): Promise<{ user: User; session: Session }> {
  if (!token || token.length > 200) throw unauthenticated();
  const session = await db().session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session) throw unauthenticated();

  if (session.revokedAt) {
    if (session.revokedReason === "IDLE_TIMEOUT" || session.revokedReason === "EXPIRED") throw sessionExpired();
    throw unauthenticated();
  }

  const now = Date.now();
  const { user } = session;
  if (session.expiresAt.getTime() <= now) {
    await revokeSession(session.id, "EXPIRED");
    await recordAuthEvent("SESSION_EXPIRED", ctx, { userId: user.id, portal: session.portal, reason: "MAX_AGE" });
    throw sessionExpired();
  }
  if (session.lastSeenAt.getTime() + session.idleTimeoutMinutes * MIN <= now) {
    await revokeSession(session.id, "IDLE_TIMEOUT");
    await recordAuthEvent("SESSION_EXPIRED", ctx, { userId: user.id, portal: session.portal, reason: "IDLE" });
    throw sessionExpired();
  }
  if (user.status !== "ACTIVE") {
    await revokeSession(session.id, "ACCOUNT_DISABLED");
    throw unauthenticated();
  }

  if (now - session.lastSeenAt.getTime() >= TOUCH_EVERY_MS) {
    const lastSeenAt = new Date(now);
    await db().session.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt } });
    session.lastSeenAt = lastSeenAt;
  }

  const { user: _u, ...plain } = session;
  return { user, session: plain };
}

export async function revokeSession(id: string, reason: SessionEndReason) {
  await db().session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
}

/** Signs the user out everywhere (e.g. after a password change), optionally keeping one session. */
export async function revokeAllSessions(userId: string, reason: SessionEndReason, exceptSessionId?: string) {
  const { count } = await db().session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  return count;
}
