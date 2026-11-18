import { cookies } from "next/headers";
import { backendStream } from "@/lib/backend";
import { SESSION_COOKIE } from "@/lib/cookies";

/**
 * GET /api/export?src=<backend export path>&format=csv|xlsx&… → CSV / Excel download.
 * Only the backend's export endpoints are allowed (an allowlist, never an open proxy);
 * the backend checks the session and role again.
 */
const ALLOWED = /^(students|staff|fees|payments|audit|reports\/(attendance|dues|collection)|homework\/report|rfid\/scans)\/export$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  if (!ALLOWED.test(src)) return new Response("Not found", { status: 404 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response("Sign in required", { status: 401 });
  url.searchParams.delete("src");
  const res = await backendStream(`/v1/${src}?${url.searchParams.toString()}`, token);
  if (!res.ok || !res.body) return new Response("Export failed. Please try again.", { status: res.status });
  const headers = new Headers();
  for (const h of ["content-type", "content-disposition"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "private, no-store");
  return new Response(res.body, { status: 200, headers });
}
