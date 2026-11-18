import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/cookies";

/**
 * 1. Per-request nonce + strict Content-Security-Policy (same as apps/website).
 * 2. Optimistic gate for the signed-in areas: no session cookie → straight to that portal's
 *    sign-in page. This only checks the cookie exists; the real check (session valid, role
 *    allowed) happens on the server in each area's layout and in the backend on every call.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = pathname.match(/^\/(admin|staff)(?:\/|$)/)?.[1];
  if (area && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `/login/${area}`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Dev only: Next's dev tools inject <style> tags without a nonce (see apps/website/proxy.ts).
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|logo.png|logo-mark.png|icon.png|apple-icon.png|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
