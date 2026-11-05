import { NextResponse, type NextRequest } from "next/server";
import { enquirySchema } from "@/lib/validation/enquiry";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT = 5; // submissions
const RATE_WINDOW_MS = 10 * 60 * 1000; // per 10 minutes per IP

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function clientIp(req: NextRequest) {
  // Caddy (reverse proxy) sets X-Forwarded-For; take the left-most client address.
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Reject cross-site submissions: Origin (or Referer) must match this host. */
function isSameOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return json({ error: "Forbidden" }, 403);

  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Unsupported content type" }, 415);
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json({ error: "Request too large" }, 413);

  const limited = rateLimit(`enquiry:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limited.ok) {
    return json(
      { error: "Too many enquiries. Please try again later." },
      429,
      { "Retry-After": String(limited.retryAfter) },
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Request too large" }, 413);

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const parsed = enquirySchema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return json({ error: "Please check the highlighted fields.", fieldErrors }, 422);
  }

  const { company, ...enquiry } = parsed.data;

  // Honeypot filled → silently accept so bots learn nothing.
  if (company) return json({ ok: true }, 200);

  const backend = process.env.BACKEND_API_URL;
  if (!backend) {
    if (process.env.NODE_ENV === "production") {
      console.error("[enquiry] BACKEND_API_URL is not configured");
      return json({ error: "Enquiries are temporarily unavailable. Please call or email us." }, 503);
    }
    // Website-only development: accept without storing. Never log personal data.
    console.info(`[enquiry] accepted (dev, not stored) grade=${enquiry.grade}`);
    return json({ ok: true }, 200);
  }

  try {
    const res = await fetch(new URL("/enquiries", backend), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.WEBSITE_INTERNAL_API_KEY ?? "",
        "X-Forwarded-For": clientIp(req),
      },
      body: JSON.stringify({ ...enquiry, source: "website" }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[enquiry] backend responded ${res.status}`);
      return json({ error: "We couldn’t send your enquiry. Please try again." }, 502);
    }
  } catch {
    console.error("[enquiry] backend unreachable");
    return json({ error: "We couldn’t send your enquiry. Please try again." }, 502);
  }

  return json({ ok: true }, 200);
}

export function GET() {
  return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
}
