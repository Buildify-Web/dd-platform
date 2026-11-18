import * as z from "zod";

/**
 * Auth rules shared by apps/webapp (client + server actions) and apps/backend, so both
 * validate identically. Change a rule here, never in one app only.
 */

/** The two web portals. Parents and students use the mobile app, not the web portal. */
export const PORTALS = ["admin", "staff"] as const;
export type Portal = (typeof PORTALS)[number];

/** Account roles that can sign in to the web portal. */
export const STAFF_ROLES = ["ADMIN", "STAFF"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const portalForRole = (role: StaffRole): Portal => (role === "ADMIN" ? "admin" : "staff");

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .min(1, { error: "Enter your email address." })
  .max(EMAIL_MAX, { error: "That email address is too long." })
  .pipe(z.email({ error: "Enter a valid email address." }))
  .transform((v) => v.toLowerCase());

/**
 * Password rules shown as a live checklist on "Set a new password".
 * `test` runs on the raw value; `matches` is checked separately against the confirm field.
 */
export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN} characters`, test: (v: string) => v.length >= PASSWORD_MIN },
  { id: "number", label: "Contains a number", test: (v: string) => /\d/.test(v) },
  { id: "letter", label: "Contains a letter", test: (v: string) => /\p{L}/u.test(v) },
] as const;

export const newPasswordSchema = z
  .string({ error: "Enter a new password." })
  .max(PASSWORD_MAX, { error: `Use at most ${PASSWORD_MAX} characters.` })
  .refine((v) => v.length >= PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters.` })
  .refine((v) => /\d/.test(v), { error: "Include at least one number." })
  .refine((v) => /\p{L}/u.test(v), { error: "Include at least one letter." })
  .refine((v) => v.trim() === v, { error: "Remove spaces at the start or end." });

/** Password typed at sign-in: only bounded, never policy-checked (old passwords must still work). */
export const loginPasswordSchema = z
  .string({ error: "Enter your password." })
  .min(1, { error: "Enter your password." })
  .max(PASSWORD_MAX, { error: "Incorrect email or password." });

/**
 * Machine-readable error codes returned by the backend in `{ error: { code, message } }`.
 * The webapp switches on these; messages are safe to show to the user.
 */
export const AUTH_ERRORS = {
  VALIDATION: "VALIDATION_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_NOT_ACTIVATED: "ACCOUNT_NOT_ACTIVATED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  WRONG_PORTAL: "WRONG_PORTAL",
  RATE_LIMITED: "RATE_LIMITED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_INVALID: "TOKEN_INVALID",
  TEMP_PASSWORD_EXPIRED: "TEMP_PASSWORD_EXPIRED",
  PASSWORD_REUSED: "PASSWORD_REUSED",
  INTERNAL: "INTERNAL_ERROR",
} as const;
export type AuthErrorCode = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS];

/** Public shape of the signed-in user, as returned by POST /auth/login and GET /auth/me. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isMainAdmin: boolean;
};

export type SessionInfo = {
  expiresAt: string;
  idleTimeoutMinutes: number;
  rememberMe: boolean;
};
