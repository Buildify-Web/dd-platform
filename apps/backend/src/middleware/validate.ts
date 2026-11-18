import { AUTH_ERRORS } from "@dd/shared/auth";
import * as z from "zod";
import { HttpError } from "../lib/errors";

function toHttpError(error: z.ZodError): HttpError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    if (issue.code === "unrecognized_keys") {
      fields._ ??= "Unexpected fields in request.";
      continue;
    }
    fields[key] ??= issue.message;
  }
  const first = Object.values(fields)[0] ?? "Check the highlighted fields.";
  return new HttpError(400, AUTH_ERRORS.VALIDATION, first, { fields });
}

/**
 * Parses a request body with a Zod schema. On failure throws a 400 with the first
 * message per field: `{ error: { code: "VALIDATION_ERROR", message, fields: { email: "…" } } }`.
 */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body ?? {});
  if (result.success) return result.data;
  throw toHttpError(result.error);
}

/** Same for query strings (values arrive as strings; use z.coerce where needed). */
export function parseQuery<S extends z.ZodType>(schema: S, query: unknown): z.infer<S> {
  const result = schema.safeParse(query ?? {});
  if (result.success) return result.data;
  throw toHttpError(result.error);
}

/** A uuid path parameter (404s on anything else, so ids are never passed raw to the DB). */
export function idParam(value: unknown, what = "That item"): string {
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value.toLowerCase();
  throw new HttpError(404, "NOT_FOUND", `${what} was not found.`);
}

// Common field schemas for query strings and bodies.
export const zId = z.uuid({ error: "Invalid id." });
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a YYYY-MM-DD date." });
export const zMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Use a YYYY-MM month." });
export const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use HH:MM (24-hour)." });
export const zPage = z.coerce.number().int().min(1).max(10_000).default(1);
export const zSearch = z.string().trim().max(100).optional();
