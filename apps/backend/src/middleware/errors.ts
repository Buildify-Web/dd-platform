import { AUTH_ERRORS } from "@dd/shared/auth";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
}

/**
 * Last middleware. Known errors become `{ error: { code, message, ...details } }`;
 * anything else is logged and answered with a generic 500 (no internals leak out).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    if (err.headers) res.set(err.headers);
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.details } });
    return;
  }
  // body-parser errors (malformed JSON, too large, wrong charset)
  const status = (err as { status?: number; type?: string })?.status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: { code: AUTH_ERRORS.VALIDATION, message: status === 413 ? "Request too large." : "Invalid request body." } });
    return;
  }
  logger.error({ err, requestId: req.requestId, path: req.path }, "unhandled error");
  res.status(500).json({ error: { code: AUTH_ERRORS.INTERNAL, message: "Something went wrong. Please try again." } });
}
