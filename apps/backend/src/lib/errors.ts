import { AUTH_ERRORS } from "@dd/shared/auth";

/** Error codes beyond auth. The webapp switches on `code`; messages are safe to show. */
export const API_ERRORS = {
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNSUPPORTED_FILE: "UNSUPPORTED_FILE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  DEVICE_UNAUTHORIZED: "DEVICE_UNAUTHORIZED",
} as const;

export type ErrorCode = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS] | (typeof API_ERRORS)[keyof typeof API_ERRORS];

/** An error that is safe to send to the client as `{ error: { code, message, ...details } }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const unauthenticated = (message = "Please sign in to continue.") =>
  new HttpError(401, AUTH_ERRORS.UNAUTHENTICATED, message);

export const forbidden = (message = "You don't have access to this.") =>
  new HttpError(403, AUTH_ERRORS.FORBIDDEN, message);

export const notFound = (what = "That item") => new HttpError(404, API_ERRORS.NOT_FOUND, `${what} was not found.`);

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new HttpError(409, API_ERRORS.CONFLICT, message, details);

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, AUTH_ERRORS.VALIDATION, message, fields ? { fields } : undefined);

export const rateLimited = (retryAfter: number) =>
  new HttpError(
    429,
    AUTH_ERRORS.RATE_LIMITED,
    "Too many attempts. Please wait a few minutes and try again.",
    { retryAfter },
    { "Retry-After": String(retryAfter) },
  );
