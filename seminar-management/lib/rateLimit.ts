// Minimal fixed-window in-memory rate limiter for the login endpoint.
// Good enough for a single-instance deployment; with multiple replicas this
// would move to Redis (documented trade-off in FOLLOW-UP).

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const win = windows.get(key);

  if (!win || win.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  win.count += 1;
  if (win.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((win.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// Prevent unbounded growth: drop expired windows occasionally.
setInterval(() => {
  const now = Date.now();
  windows.forEach((win, key) => {
    if (win.resetAt <= now) windows.delete(key);
  });
}, 60_000).unref?.();
