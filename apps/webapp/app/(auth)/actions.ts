"use server";

import {
  AUTH_ERRORS,
  emailSchema,
  loginPasswordSchema,
  newPasswordSchema,
  PORTALS,
  type AuthUser,
  type Portal,
} from "@dd/shared/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { backend, type BackendError } from "@/lib/backend";
import { ACTIVATION_COOKIE, SESSION_COOKIE } from "@/lib/cookies";
import type { ForgotState, FormError, LoginState, PasswordState } from "@/lib/form-state";
import { dashboardPath } from "@/lib/session";

const secure = process.env.NODE_ENV === "production";
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "_")] ??= issue.message;
  return out;
}

function toFormError(e: BackendError): FormError {
  return {
    code: e.code,
    message: e.message,
    attemptsLeft: typeof e.attemptsLeft === "number" ? e.attemptsLeft : undefined,
    lockMinutes: typeof e.lockMinutes === "number" ? e.lockMinutes : undefined,
    portal: e.portal === "admin" || e.portal === "staff" ? e.portal : undefined,
  };
}

/** Only same-portal, same-origin paths are allowed as a post-login destination. */
function safeNext(next: string, portal: Portal): string | null {
  return next.startsWith(`/${portal}`) && !next.startsWith("//") && !next.includes("\\") ? next : null;
}

// ───────────────────────────── Sign in ─────────────────────────────

const loginForm = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  portal: z.enum(PORTALS),
  rememberMe: z.boolean(),
  next: z.string().max(512),
});

type LoginResponse = { token: string; user: AuthUser; session: { absoluteExpiresAt: string; rememberMe: boolean } };

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = loginForm.safeParse({
    email: str(fd, "email"),
    password: str(fd, "password"),
    portal: str(fd, "portal"),
    rememberMe: fd.get("rememberMe") === "on",
    next: str(fd, "next"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { next, ...body } = parsed.data;

  const res = await backend<LoginResponse>("/v1/auth/login", { body });
  if (!res.ok) {
    const fields = res.error.fields as Record<string, string> | undefined;
    return { error: toFormError(res.error), fields };
  }

  (await cookies()).set(SESSION_COOKIE, res.data.token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    // "Keep me signed in" survives closing the browser; otherwise it's a browser-session cookie.
    ...(res.data.session.rememberMe ? { expires: new Date(res.data.session.absoluteExpiresAt) } : {}),
  });
  redirect(safeNext(next, body.portal) ?? dashboardPath(res.data.user.role));
}

/** Signs out (revokes the session on the backend) and returns to "Choose your portal". */
export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await backend("/v1/auth/logout", { method: "POST", token });
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

// ───────────────────────────── Activation ─────────────────────────────

const activateForm = z.object({
  email: emailSchema,
  temporaryPassword: z.string().trim().min(1, { error: "Enter the temporary password from your email." }).max(128),
});

export async function activateAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = activateForm.safeParse({ email: str(fd, "email"), temporaryPassword: str(fd, "temporaryPassword") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const res = await backend<{ ticket: string; expiresAt: string }>("/v1/auth/activation/verify", { body: parsed.data });
  if (!res.ok) return { error: toFormError(res.error) };

  (await cookies()).set(ACTIVATION_COOKIE, res.data.ticket, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/activate",
    expires: new Date(res.data.expiresAt),
  });
  redirect("/activate/password");
}

// ───────────────────────── Choose a password ─────────────────────────

const passwordForm = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "The passwords don't match." });

/** Step 2 of activation: the ticket comes from the httpOnly cookie set in step 1. */
export async function completeActivationAction(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const parsed = passwordForm.safeParse({ password: str(fd, "password"), confirm: str(fd, "confirm") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const jar = await cookies();
  const ticket = jar.get(ACTIVATION_COOKIE)?.value;
  if (!ticket) {
    return { error: { code: AUTH_ERRORS.TOKEN_INVALID, message: "This activation step has expired. Enter your username and temporary password again." } };
  }

  const res = await backend<{ portal: Portal }>("/v1/auth/activation/complete", { body: { ticket, password: parsed.data.password } });
  if (!res.ok) return { error: toFormError(res.error), fields: res.error.fields as Record<string, string> | undefined };
  jar.delete({ name: ACTIVATION_COOKIE, path: "/activate" });
  // Step 3 is its own route: changing cookies in an action re-renders the current page,
  // which would otherwise find the (now used) ticket gone and bounce back to step 1.
  redirect(`/activate/done?portal=${res.data.portal}`);
}

/** Reset link: the token travels in a hidden field from the page that verified it. */
export async function resetPasswordAction(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const parsed = passwordForm.safeParse({ password: str(fd, "password"), confirm: str(fd, "confirm") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const token = str(fd, "token");
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) {
    return { error: { code: AUTH_ERRORS.TOKEN_INVALID, message: "This reset link has expired or was already used. Request a new one." } };
  }

  const res = await backend<{ portal: Portal }>("/v1/auth/password/reset", { body: { token, password: parsed.data.password } });
  if (!res.ok) return { error: toFormError(res.error), fields: res.error.fields as Record<string, string> | undefined };
  // The backend signed out every session, including any in this browser.
  (await cookies()).delete(SESSION_COOKIE);
  redirect(`/reset-password/done?portal=${res.data.portal}`);
}

// ───────────────────── Forgot password / request new ─────────────────────

export async function forgotAction(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const parsed = z.object({ email: emailSchema }).safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const res = await backend<{ sentTo: string; expiresInMinutes: number }>("/v1/auth/password/forgot", { body: parsed.data });
  if (!res.ok) return { error: toFormError(res.error) };
  return { sent: { to: res.data.sentTo, expiresInMinutes: res.data.expiresInMinutes, at: Date.now() } };
}
