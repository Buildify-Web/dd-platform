import * as z from "zod";

/**
 * All backend settings, validated once at start-up. A bad or missing value stops the
 * server with a clear message instead of failing later. `.env.example` lists every key.
 */
const bool = z
  .enum(["true", "false", "1", "0", ""])
  .default("")
  .transform((v) => v === "true" || v === "1");
const int = (def: number, min: number, max: number) => z.coerce.number().int().min(min).max(max).default(def);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    /** Number of reverse proxies in front of the API whose X-Forwarded-For is trusted (Caddy = 1). */
    TRUST_PROXY_HOPS: int(1, 0, 5),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    /**
     * Secrets for server-to-server calls (webapp BFF, website enquiry form), comma-separated,
     * at least 32 characters each. Callers send one in the X-Internal-Key header.
     */
    INTERNAL_API_KEYS: z
      .string()
      .default("")
      .transform((v) =>
        v
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      ),

    /** The owner account. Only this email can be the main admin. */
    MAIN_ADMIN_EMAIL: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "MAIN_ADMIN_EMAIL must be a valid email" })),
    MAIN_ADMIN_NAME: z.string().trim().min(1).max(100).default("Meena Annamalai"),

    /** Public URL of the admin & staff portal (apps/webapp). Used for links inside emails. */
    PORTAL_URL: z.url().default("http://localhost:3100"),

    // ── Email (Brevo transactional API) ──
    BREVO_API_KEY: z.string().trim().default(""),
    MAIL_FROM_EMAIL: z.string().trim().default(""),
    MAIL_FROM_NAME: z.string().trim().default("Dynamic Donalds"),
    MAIL_REPLY_TO: z.string().trim().default(""),
    /** Print emails to the console instead of sending them. Ignored in production. */
    MAIL_LOG_ONLY: bool,

    // ── Sessions & security ──
    SESSION_IDLE_MINUTES: int(30, 5, 24 * 60),
    SESSION_MAX_HOURS: int(12, 1, 7 * 24),
    SESSION_REMEMBER_IDLE_DAYS: int(7, 1, 30),
    SESSION_REMEMBER_MAX_DAYS: int(30, 1, 90),
    LOGIN_MAX_FAILURES: int(5, 3, 20),
    LOGIN_LOCK_MINUTES: int(15, 1, 24 * 60),
    RESET_TOKEN_MINUTES: int(30, 5, 24 * 60),
    ACTIVATION_TICKET_MINUTES: int(15, 5, 60),
    TEMP_PASSWORD_DAYS: int(7, 1, 30),
    PASSWORD_HISTORY_COUNT: int(5, 0, 24),

    // ── Files ──
    /** Where uploaded files are stored (mount a volume here in Docker). */
    UPLOAD_DIR: z.string().trim().default("./storage/uploads"),
    /** HMAC secret for signed, expiring file links (≥32 chars in production). */
    FILE_URL_SECRET: z.string().trim().default(""),
    FILE_URL_MINUTES: int(15, 1, 24 * 60),

    // ── Background jobs (fee reminders, absentee alerts, scheduled announcements…) ──
    /** Run the in-process scheduler. Turn off when apps/worker runs the jobs instead. */
    JOBS_ENABLED: z
      .enum(["true", "false", ""])
      .default("")
      .transform((v) => v !== "false"),

    /** Serve Swagger UI at /docs. Empty = on outside production. */
    API_DOCS: z.enum(["true", "false", ""]).default(""),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  })
  .superRefine((e, ctx) => {
    const need = (key: keyof typeof e, message = "required in production") =>
      ctx.addIssue({ code: "custom", path: [key], message });
    if (e.NODE_ENV === "production") {
      if (e.INTERNAL_API_KEYS.length === 0) need("INTERNAL_API_KEYS");
      if (!e.BREVO_API_KEY) need("BREVO_API_KEY");
      if (!e.MAIL_FROM_EMAIL) need("MAIL_FROM_EMAIL");
      if (!e.PORTAL_URL.startsWith("https://")) need("PORTAL_URL", "must be https in production");
      if (e.FILE_URL_SECRET.length < 32) need("FILE_URL_SECRET", "at least 32 characters in production");
    }
    if (e.INTERNAL_API_KEYS.some((k) => k.length < 32)) need("INTERNAL_API_KEYS", "each key must be at least 32 characters");
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid backend configuration:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

let cached: Env | undefined;

/** Validated settings (parsed on first call). */
export function env(): Env {
  cached ??= loadEnv();
  return cached;
}

/** Tests only: replace the settings. */
export function setEnvForTests(next: Env) {
  cached = next;
}
