import "server-only";
import { AUTH_ERRORS } from "@dd/shared/auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { backend } from "./backend";
import { SESSION_COOKIE } from "./cookies";

export const sessionToken = async () => (await cookies()).get(SESSION_COOKIE)?.value;

/**
 * GET from the backend for a server component. Session problems redirect (expired →
 * "Session expired", none → sign-in), 403 → "No permission", 404 → not-found page. Anything
 * else throws, which the portal's error boundary shows as a friendly retry screen.
 */
export async function api<T>(path: string, portal: "admin" | "staff" = "admin"): Promise<T> {
  const token = await sessionToken();
  if (!token) redirect(`/login/${portal}`);
  const res = await backend<T>(path, { token });
  if (res.ok) return res.data;
  if (res.error.code === AUTH_ERRORS.SESSION_EXPIRED) redirect(`/session-expired?portal=${portal}`);
  if (res.status === 401) redirect(`/login/${portal}`);
  if (res.status === 403) redirect("/denied");
  if (res.status === 404) notFound();
  throw new Error(res.error.message);
}

/** Builds "?a=1&b=2" from defined, non-empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Next 16 page props: searchParams is a promise of string | string[]. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
