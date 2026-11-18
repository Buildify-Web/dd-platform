/**
 * Cookie names (safe to import from proxy.ts, which runs before any page).
 * In production the session cookie uses the `__Host-` prefix: the browser then only
 * accepts it over HTTPS, for this exact host, on path "/", which blocks cookie injection
 * from other subdomains. Plain http://localhost can't use the prefix, so dev drops it.
 */
const prod = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = prod ? "__Host-dd_session" : "dd_session";

/** Short-lived ticket between activation step 1 and step 2 (path-scoped to /activate). */
export const ACTIVATION_COOKIE = prod ? "__Secure-dd_activation" : "dd_activation";
