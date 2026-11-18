import "server-only";

/**
 * Webapp settings, read at request time on the server (so one Docker image works for any
 * domain). `.env.example` at the repo root lists them.
 */
const safeUrl = (raw: string | undefined, fallback: string) => {
  try {
    const url = new URL(raw || fallback);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString().replace(/\/$/, "") : fallback;
  } catch {
    return fallback;
  }
};

export const config = {
  /** Backend API base, reached server-to-server only. */
  backendUrl: () => (process.env.BACKEND_API_URL || "http://localhost:4000").replace(/\/$/, ""),
  internalKey: () => process.env.WEBAPP_INTERNAL_API_KEY || "",
  /** Public website (separate domain): privacy policy and "Get the app". */
  websiteUrl: () => safeUrl(process.env.WEBSITE_URL, "http://localhost:3000"),
  /** Parent app store page; until it's published, the website is used. */
  parentAppUrl: () => safeUrl(process.env.PARENT_APP_URL, safeUrl(process.env.WEBSITE_URL, "http://localhost:3000")),
  /** "Need help? Contact admin". */
  supportEmail: () => process.env.SUPPORT_EMAIL || "meenaannamalai27@gmail.com",
  /** Display only. Must match the backend's SESSION_IDLE_MINUTES. */
  idleMinutes: () => Number(process.env.SESSION_IDLE_MINUTES) || 30,
};
