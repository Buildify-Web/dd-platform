import "server-only";
import { AUTH_ERRORS, type AuthUser, type Portal, type StaffRole } from "@dd/shared/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { backend } from "./backend";
import { SESSION_COOKIE } from "./cookies";

export type Me = {
  user: AuthUser;
  session: { portal: Portal; expiresAt: string; absoluteExpiresAt: string; idleTimeoutMinutes: number; rememberMe: boolean };
};

export type SessionState = { status: "signed-in"; me: Me } | { status: "expired" } | { status: "signed-out" };

/**
 * The current session, checked with the backend (once per request, thanks to `cache`).
 * Each call counts as activity and slides the idle timeout.
 */
export const getSession = cache(async (): Promise<SessionState> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: "signed-out" };
  const res = await backend<Me>("/v1/auth/me", { token });
  if (res.ok) return { status: "signed-in", me: res.data };
  if (res.error.code === AUTH_ERRORS.SESSION_EXPIRED) return { status: "expired" };
  return { status: "signed-out" };
});

export const dashboardPath = (role: StaffRole) => (role === "ADMIN" ? "/admin" : "/staff");

/**
 * Guard for every signed-in page. Server-side, on every request:
 *  - no/invalid session → that portal's sign-in page
 *  - idle/expired       → "Session expired"
 *  - wrong role         → "You don't have access" (403)
 */
export async function requireRole(role: StaffRole, portal: Portal, path: string): Promise<Me> {
  const state = await getSession();
  if (state.status === "expired") redirect(`/session-expired?portal=${portal}`);
  if (state.status === "signed-out") redirect(`/login/${portal}?next=${encodeURIComponent(path)}`);
  if (state.me.user.role !== role) redirect("/denied");
  return state.me;
}

/** Signed-in users who open a sign-in page go straight to their dashboard. */
export async function redirectIfSignedIn() {
  const state = await getSession();
  if (state.status === "signed-in") redirect(dashboardPath(state.me.user.role));
}
