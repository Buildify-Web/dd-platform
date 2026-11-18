import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { safeEqual } from "../lib/crypto";

export type ClientContext = {
  /** The end user's IP (from the BFF when the call is internal, else the socket / proxy chain). */
  ip: string;
  userAgent: string | null;
  /** True when the caller presented a valid X-Internal-Key (webapp/website servers). */
  internal: boolean;
};

const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;
const clip = (v: string | undefined, max: number) => (v ? v.slice(0, max) : null);

/**
 * Works out who the end user is. Server-to-server callers (the webapp BFF) sign their calls
 * with X-Internal-Key and pass the real browser IP / user agent in X-Client-IP /
 * X-Client-User-Agent. Those headers are ignored unless the key is valid, so nobody can spoof
 * their IP to dodge rate limits.
 */
export function clientContext(req: Request, _res: Response, next: NextFunction) {
  const key = req.get("x-internal-key");
  const internal = !!key && env().INTERNAL_API_KEYS.some((k) => safeEqual(k, key));
  const forwardedIp = req.get("x-client-ip")?.trim();
  const ip = internal && forwardedIp && IP_RE.test(forwardedIp) ? forwardedIp : req.ip || "unknown";
  const userAgent = internal ? (req.get("x-client-user-agent") ?? req.get("user-agent")) : req.get("user-agent");
  req.ctx = { ip, userAgent: clip(userAgent, 255), internal };
  next();
}
