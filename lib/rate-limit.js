const buckets = new Map();

export function rateLimit(req, { max = 40, windowMs = 60_000 } = {}) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'anonymous';
  const now = Date.now();
  let entry = buckets.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
    buckets.set(ip, entry);
  }
  entry.count++;
  if (entry.count > max) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  return { ok: true };
}

export function applyRateLimit(req, res) {
  const result = rateLimit(req);
  if (!result.ok) {
    res.setHeader('Retry-After', String(result.retryAfter));
    res.status(429).json({ error: 'Too many requests' });
    return false;
  }
  return true;
}
