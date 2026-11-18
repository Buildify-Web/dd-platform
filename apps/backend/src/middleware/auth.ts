import type { UserRole } from "@dd/db";
import type { NextFunction, Request, Response } from "express";
import { forbidden, unauthenticated } from "../lib/errors";
import { recordAuthEvent } from "../modules/auth/events";
import { resolveSession } from "../modules/auth/sessions";

/** Reads `Authorization: Bearer <session token>`. */
export function bearerToken(req: Request): string | null {
  const header = req.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

/** Requires a live session; sets `req.auth`. Every protected route uses this. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) throw unauthenticated();
  req.auth = await resolveSession(token, req.ctx);
  next();
}

export type Actor = { id: string; name: string; role: UserRole; isAdmin: boolean; isMainAdmin: boolean };

/** The signed-in portal user (after `authenticate`). */
export function actor(req: Request): Actor {
  const user = req.auth?.user;
  if (!user) throw unauthenticated();
  return { id: user.id, name: user.name, role: user.role, isAdmin: user.role === "ADMIN", isMainAdmin: user.isMainAdmin };
}

/**
 * Role check, run on the server for every protected route (after `authenticate`).
 * Denials are written to the auth log.
 */
export function requireRole(...roles: UserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.auth?.user;
    if (!user) throw unauthenticated();
    if (!roles.includes(user.role)) {
      await recordAuthEvent("ACCESS_DENIED", req.ctx, { userId: user.id, reason: `${req.method} ${req.baseUrl}${req.route?.path ?? ""}`.slice(0, 64) });
      throw forbidden("Fees, approvals, courses and settings are managed by admin.");
    }
    next();
  };
}

/** Admin-only routes. */
export const adminOnly = [authenticate, requireRole("ADMIN")];
/** Routes for any signed-in portal user (admin or staff); staff are further scoped in the service. */
export const portalUser = [authenticate, requireRole("ADMIN", "STAFF")];
