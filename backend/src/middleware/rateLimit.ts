import { Request, Response, NextFunction } from 'express';

interface Bucket { count: number; resetAt: number }

/**
 * Minimal in-memory rate limiter (per IP). Enough to slow down brute-force
 * attempts against the login endpoint without pulling in a dependency.
 * For multi-instance deployments, swap for a shared store.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup so the map never grows unbounded.
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: 'Massa intents. Torna-ho a provar en uns minuts.' });
      return;
    }
    next();
  };
}
