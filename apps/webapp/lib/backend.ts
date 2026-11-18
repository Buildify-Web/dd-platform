import "server-only";
import { AUTH_ERRORS } from "@dd/shared/auth";
import { headers } from "next/headers";
import { config } from "./config";

export type BackendError = { code: string; message: string; fields?: Record<string, string>; [key: string]: unknown };
export type BackendResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: BackendError };
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** The browser's IP as seen by our reverse proxy (Caddy sets X-Forwarded-For). */
async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "";
  return { ip, userAgent: h.get("user-agent") ?? "" };
}

async function signedHeaders(token?: string) {
  const { ip, userAgent } = await clientInfo();
  const h: Record<string, string> = { accept: "application/json" };
  if (token) h.authorization = `Bearer ${token}`;
  const key = config.internalKey();
  if (key) {
    h["x-internal-key"] = key;
    if (ip) h["x-client-ip"] = ip;
    if (userAgent) h["x-client-user-agent"] = userAgent.slice(0, 255);
  }
  return h;
}

/**
 * Calls the backend API from the webapp server (BFF). The browser never talks to the API
 * directly: it only holds an httpOnly cookie on the portal's own domain, and this function
 * turns it into `Authorization: Bearer …`. Calls are signed with X-Internal-Key so the
 * backend trusts the forwarded client IP for rate limiting, the sign-in log and the audit log.
 */
export async function backend<T>(
  path: string,
  init: { method?: Method; body?: unknown; token?: string; raw?: { data: ArrayBuffer; type: string; name: string }; timeoutMs?: number } = {},
): Promise<BackendResult<T>> {
  const h = await signedHeaders(init.token);
  let body: BodyInit | undefined;
  if (init.raw) {
    h["content-type"] = "application/octet-stream";
    h["x-file-name"] = encodeURIComponent(init.raw.name.slice(0, 200));
    body = init.raw.data;
  } else if (init.body !== undefined) {
    h["content-type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(`${config.backendUrl()}${path}`, {
      method: init.method ?? (body === undefined ? "GET" : "POST"),
      headers: h,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
    });
  } catch {
    return {
      ok: false,
      status: 503,
      error: { code: AUTH_ERRORS.INTERNAL, message: "We couldn't reach the server. Please try again in a moment." },
    };
  }

  if (res.status === 204) return { ok: true, status: 204, data: undefined as T };
  const payload = (await res.json().catch(() => null)) as { error?: BackendError } | null;
  if (res.ok) return { ok: true, status: res.status, data: payload as T };
  return {
    ok: false,
    status: res.status,
    error: payload?.error?.code ? payload.error : { code: AUTH_ERRORS.INTERNAL, message: "Something went wrong. Please try again." },
  };
}

/** Streams a backend response (file download / export) back to the browser unchanged. */
export async function backendStream(path: string, token: string): Promise<Response> {
  const h = await signedHeaders(token);
  try {
    return await fetch(`${config.backendUrl()}${path}`, { headers: h, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  } catch {
    return new Response("Server unavailable", { status: 503 });
  }
}
