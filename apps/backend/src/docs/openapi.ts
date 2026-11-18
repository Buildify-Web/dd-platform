/**
 * OpenAPI 3.1 description of the backend, served by Swagger UI at /docs (off in production
 * unless API_DOCS=true). Keep it in step with the routes when endpoints change.
 */
const error = (example: { code: string; message: string; [k: string]: unknown }) => ({
  description: example.message,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error: example } } },
});

const json = (schema: object, example?: object) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const ok = (description: string, schema: object) => ({ description, content: { "application/json": { schema } } });

const password = { type: "string", minLength: 8, maxLength: 128, description: "≥8 chars, at least one letter and one number" };
const token = { type: "string", minLength: 20, maxLength: 200, pattern: "^[A-Za-z0-9_-]+$" };

export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Dynamic Donalds API",
    version: "0.1.0",
    description:
      "Backend for the Dynamic Donalds website, admin & staff portal and mobile app.\n\n" +
      "**Auth:** sign in with `POST /v1/auth/login`, then send `Authorization: Bearer <token>`. " +
      "Sessions end after the idle timeout (30 min by default) or the absolute lifetime.\n\n" +
      "**Server-to-server callers** (webapp/website servers) add `X-Internal-Key`, and may pass the end user's " +
      "`X-Client-IP` and `X-Client-User-Agent`; those two headers are ignored without a valid key.",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Auth", description: "Sign-in, activation and password reset for admin & staff" }, { name: "System" }],
  components: {
    securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "Opaque session token from /v1/auth/login" } },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: { code: { type: "string" }, message: { type: "string" } },
            additionalProperties: true,
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["ADMIN", "STAFF"] },
          isMainAdmin: { type: "boolean" },
        },
      },
      Session: {
        type: "object",
        properties: {
          expiresAt: { type: "string", format: "date-time", description: "When the session ends without further activity" },
          absoluteExpiresAt: { type: "string", format: "date-time" },
          idleTimeoutMinutes: { type: "integer" },
          rememberMe: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: { tags: ["System"], summary: "Liveness + database check", responses: { 200: { description: "OK" }, 503: { description: "Database unreachable" } } },
    },
    "/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in to the admin or staff portal",
        description:
          "Only ACTIVE accounts sign in, and only through their own portal (ADMIN → admin, STAFF → staff). " +
          "After LOGIN_MAX_FAILURES wrong passwords the account is locked for LOGIN_LOCK_MINUTES minutes. " +
          "Unknown emails get exactly the same responses as wrong passwords.",
        requestBody: json(
          {
            type: "object",
            required: ["email", "password", "portal"],
            additionalProperties: false,
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", maxLength: 128 },
              portal: { type: "string", enum: ["admin", "staff"] },
              rememberMe: { type: "boolean", default: false, description: "Keep me signed in: 7-day idle / 30-day max" },
            },
          },
          { email: "meenaannamalai27@gmail.com", password: "••••••••", portal: "admin", rememberMe: false },
        ),
        responses: {
          200: ok("Signed in", { type: "object", properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/User" }, session: { $ref: "#/components/schemas/Session" } } }),
          400: error({ code: "VALIDATION_ERROR", message: "Enter a valid email address.", fields: { email: "Enter a valid email address." } }),
          401: error({ code: "INVALID_CREDENTIALS", message: "Incorrect email or password.", attemptsLeft: 2, lockMinutes: 15 }),
          403: error({ code: "WRONG_PORTAL", message: "This account doesn't have admin access. Sign in through the staff portal.", portal: "staff" }),
          423: error({ code: "ACCOUNT_LOCKED", message: "Too many failed attempts. Try again in 15 minutes, or reset your password.", retryAfter: 900 }),
          429: error({ code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes and try again.", retryAfter: 300 }),
        },
      },
    },
    "/v1/auth/logout": {
      post: { tags: ["Auth"], summary: "Sign out (revokes this session)", security: [{ bearer: [] }], responses: { 204: { description: "Signed out (also when the session had already ended)" } } },
    },
    "/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user and session (counts as activity)",
        security: [{ bearer: [] }],
        responses: {
          200: ok("Signed in", { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, session: { $ref: "#/components/schemas/Session" } } }),
          401: error({ code: "SESSION_EXPIRED", message: "Your session expired. Please sign in again." }),
        },
      },
    },
    "/v1/auth/activation/verify": {
      post: {
        tags: ["Auth"],
        summary: "Activation step 1: check the emailed username + temporary password",
        requestBody: json({ type: "object", required: ["email", "temporaryPassword"], additionalProperties: false, properties: { email: { type: "string", format: "email" }, temporaryPassword: { type: "string" } } }),
        responses: {
          200: ok("Verified. Use the ticket for step 2 within ACTIVATION_TICKET_MINUTES.", { type: "object", properties: { ticket: { type: "string" }, expiresAt: { type: "string", format: "date-time" }, user: { type: "object" } } }),
          401: error({ code: "INVALID_CREDENTIALS", message: "That username and temporary password don't match. Check the email we sent you." }),
          409: error({ code: "VALIDATION_ERROR", message: "This account is already active. Sign in with your password.", portal: "staff" }),
          410: error({ code: "TEMP_PASSWORD_EXPIRED", message: "These login details have expired. Request new ones and we'll email them to you." }),
        },
      },
    },
    "/v1/auth/activation/ticket": {
      post: {
        tags: ["Auth"],
        summary: "Activation step 2 page load: is the ticket still valid?",
        requestBody: json({ type: "object", required: ["ticket"], properties: { ticket: token } }),
        responses: { 200: { description: "Valid" }, 400: error({ code: "TOKEN_INVALID", message: "This activation step has expired. Enter your username and temporary password again." }) },
      },
    },
    "/v1/auth/activation/complete": {
      post: {
        tags: ["Auth"],
        summary: "Activation step 2: choose a password (account becomes ACTIVE)",
        requestBody: json({ type: "object", required: ["ticket", "password"], properties: { ticket: token, password } }),
        responses: {
          200: ok("Activated", { type: "object", properties: { email: { type: "string" }, portal: { type: "string", enum: ["admin", "staff"] } } }),
          400: error({ code: "PASSWORD_REUSED", message: "Choose a password that's different from the temporary one." }),
        },
      },
    },
    "/v1/auth/password/forgot": {
      post: {
        tags: ["Auth"],
        summary: "Email a reset link (or fresh login details for accounts not yet activated)",
        description: "Always 202 with the same body, whether or not the account exists.",
        requestBody: json({ type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } }),
        responses: { 202: ok("Accepted", { type: "object", properties: { sentTo: { type: "string", example: "l•••@email.com" }, expiresInMinutes: { type: "integer" } } }) },
      },
    },
    "/v1/auth/password/reset/verify": {
      post: {
        tags: ["Auth"],
        summary: "Reset page load: is the link still valid?",
        requestBody: json({ type: "object", required: ["token"], properties: { token } }),
        responses: { 200: { description: "Valid" }, 400: error({ code: "TOKEN_INVALID", message: "This reset link has expired or was already used. Request a new one." }) },
      },
    },
    "/v1/auth/password/reset": {
      post: {
        tags: ["Auth"],
        summary: "Set a new password from a reset link (signs out every session)",
        requestBody: json({ type: "object", required: ["token", "password"], properties: { token, password } }),
        responses: {
          200: ok("Saved", { type: "object", properties: { email: { type: "string" }, portal: { type: "string" }, sessionsSignedOut: { type: "integer" } } }),
          400: error({ code: "PASSWORD_REUSED", message: "You've used this password here before. Choose a new one." }),
        },
      },
    },
  },
} as const;
