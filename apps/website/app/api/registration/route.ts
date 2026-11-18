import { NextResponse, type NextRequest } from "next/server";
import { fieldErrorsOf, ID_CARD_MAX_BYTES, ID_CARD_TYPES, registrationSchema } from "@/lib/registration";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = ID_CARD_MAX_BYTES + 64 * 1024;
const RATE_LIMIT = 5; // submissions
const RATE_WINDOW_MS = 60 * 60 * 1000; // per hour per IP

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

/** The backend's error body: { error: { message, fields? } }. Returns what is safe to show. */
async function backendError(res: Response): Promise<{ message: string; fields?: Record<string, string> }> {
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; fields?: Record<string, string> } };
  return {
    message: body.error?.message ?? "We couldn’t send your registration. Please try again.",
    fields: body.error?.fields,
  };
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "");

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return json({ error: "Forbidden" }, 403);

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json({ error: "The photo is too large. Use an image under 5 MB." }, 413);

  const ip = clientIp(req);
  const limited = rateLimit(`registration:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limited.ok) {
    return json({ error: "Too many registrations from this network. Please try again later." }, 429, { "Retry-After": String(limited.retryAfter) });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  // Honeypot filled → silently accept so bots learn nothing.
  if (str(form, "company")) return json({ ok: true, code: "" }, 200);

  const card = form.get("schoolIdCard");
  if (!(card instanceof File) || card.size === 0) {
    return json({ error: "Please check the highlighted fields.", fieldErrors: { schoolIdCardFileId: "Upload a photo of the school ID card." } }, 422);
  }
  if (card.size > ID_CARD_MAX_BYTES) {
    return json({ error: "Please check the highlighted fields.", fieldErrors: { schoolIdCardFileId: "The photo must be 5 MB or smaller." } }, 422);
  }
  if (!(ID_CARD_TYPES as readonly string[]).includes(card.type)) {
    return json({ error: "Please check the highlighted fields.", fieldErrors: { schoolIdCardFileId: "Upload a JPG, PNG, WebP or PDF." } }, 422);
  }

  const parsed = registrationSchema.safeParse({
    studentName: str(form, "studentName"),
    grade: str(form, "grade"),
    fatherName: str(form, "fatherName"),
    motherName: str(form, "motherName"),
    mobile: str(form, "mobile"),
    email: str(form, "email"),
    schoolName: str(form, "schoolName"),
    dateOfBirth: str(form, "dateOfBirth"),
    gender: str(form, "gender"),
    address: str(form, "address"),
    courseIds: form.getAll("courseIds").map(String),
    learningMode: str(form, "learningMode"),
    sessionType: str(form, "sessionType"),
  });
  if (!parsed.success) {
    return json({ error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) }, 422);
  }

  const backend = process.env.BACKEND_API_URL;
  if (!backend) {
    if (process.env.NODE_ENV === "production") {
      console.error("[registration] BACKEND_API_URL is not configured");
      return json({ error: "Registration is temporarily unavailable. Please call or email us." }, 503);
    }
    // Website-only development: accept without storing. Never log personal data.
    console.info("[registration] accepted (dev, not stored)");
    return json({ ok: true, code: "REG-DEV" }, 201);
  }

  const headers = {
    "X-Internal-Key": process.env.WEBSITE_INTERNAL_API_KEY ?? "",
    "X-Client-IP": ip,
  };

  try {
    // 1. Store the school ID card. It is attached to the registration in step 2.
    const upload = await fetch(new URL("/v1/public/intake/id-card", backend), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(card.name).slice(0, 200) },
      body: Buffer.from(await card.arrayBuffer()),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!upload.ok) {
      const err = await backendError(upload);
      return json({ error: err.message, fieldErrors: { schoolIdCardFileId: err.message } }, 422);
    }
    const { id: schoolIdCardFileId } = (await upload.json()) as { id: string };

    // 2. Submit the registration for admin review.
    const res = await fetch(new URL("/v1/public/intake/registrations", backend), {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, schoolIdCardFileId }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await backendError(res);
      console.error(`[registration] backend responded ${res.status}`);
      if (err.fields) return json({ error: "Please check the highlighted fields.", fieldErrors: err.fields }, 422);
      return json({ error: err.message }, res.status === 429 ? 429 : 502);
    }
    const { code } = (await res.json()) as { code: string };
    return json({ ok: true, code }, 201);
  } catch {
    console.error("[registration] backend unreachable");
    return json({ error: "We couldn’t send your registration. Please try again." }, 502);
  }
}

export function GET() {
  return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
}
