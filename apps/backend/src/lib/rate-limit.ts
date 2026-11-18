/**
 * In-memory fixed-window rate limiter (per process). Enough for one backend container;
 * move it to Redis (shared with the worker) before running more than one instance.
 */
type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    private readonly maxKeys = 50_000,
  ) {}

  /** Counts one hit for `key`. Returns ok=false, with seconds to wait, once over the limit. */
  hit(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    if (this.buckets.size > this.maxKeys) this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > this.limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    return { ok: true, retryAfter: 0 };
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  clear() {
    this.buckets.clear();
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
    if (this.buckets.size > this.maxKeys) this.buckets.clear();
  }
}
