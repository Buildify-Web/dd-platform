import type { Portal } from "@dd/shared/auth";

/** What a server action hands back to its form (via useActionState). */
export type FormError = {
  code: string;
  message: string;
  attemptsLeft?: number;
  lockMinutes?: number;
  /** WRONG_PORTAL: the portal this account belongs to. */
  portal?: Portal;
};

export type FormState = {
  error?: FormError;
  /** First message per field, shown under the input. */
  fields?: Record<string, string>;
};

export type LoginState = FormState;
export type ForgotState = FormState & { sent?: { to: string; expiresInMinutes: number; at: number } };
export type PasswordState = FormState;
