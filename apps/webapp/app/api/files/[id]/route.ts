import { cookies } from "next/headers";
import { backendStream } from "@/lib/backend";
import { SESSION_COOKIE } from "@/lib/cookies";

/**
 * GET /api/files/:id → streams an access-checked file from the backend (homework photos,
 * question papers, assignments, payment screenshots…). The backend decides who may read
 * what; deleted assignments / papers return 404 so their links stop working.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return new Response("Sign in required", { status: 401 });
  const download = new URL(request.url).searchParams.get("download") === "1";
  const res = await backendStream(`/v1/files/${id}${download ? "?download=1" : ""}`, token);
  if (!res.ok || !res.body) return new Response(res.status === 404 ? "This file is no longer available." : "Not available", { status: res.status });
  const headers = new Headers();
  for (const h of ["content-type", "content-length", "content-disposition"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  return new Response(res.body, { status: 200, headers });
}
