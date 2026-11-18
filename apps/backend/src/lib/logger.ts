import pino from "pino";

/**
 * Structured JSON logger. Never log personal data (names, emails, mobiles), passwords or
 * tokens: log ids and codes instead. The redact list is a safety net, not a licence.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-internal-key"]',
      "*.password",
      "*.temporaryPassword",
      "*.token",
      "*.ticket",
      "*.email",
    ],
    censor: "[redacted]",
  },
});
