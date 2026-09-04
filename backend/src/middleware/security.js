const buckets = new Map();

export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => console.info(JSON.stringify({ method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - started })));
  next();
}

export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key) || { start: now, count: 0 };
    if (now - bucket.start >= windowMs) { bucket.start = now; bucket.count = 0; }
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > max) return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
    next();
  };
}

export function validateCheckout(req, res, next) {
  const { items, customer } = req.body || {};
  const coordinates = customer?.deliveryCoordinates;
  const validCoordinates = coordinates === undefined || (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite) && coordinates[0] >= -180 && coordinates[0] <= 180 && coordinates[1] >= -90 && coordinates[1] <= 90);
  const validItems = Array.isArray(items) && items.length > 0 && items.length <= 50 && items.every((item) => item?.product && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100);
  const validPhone = /^\d{11}$/.test(customer?.phone?.trim() || '');
  if (!validItems || !validCoordinates || !customer.name?.trim() || !validPhone || !customer.address?.trim()) return res.status(400).json({ message: 'Valid cart, name, 11-digit phone number, and address are required' });
  next();
}

export function errorHandler(error, req, res, next) {
  console.error(JSON.stringify({ error: error.message, method: req.method, path: req.originalUrl, stack: error.stack }));
  res.status(error.statusCode || 500).json({ message: process.env.NODE_ENV === 'production' ? 'Unexpected server error' : error.message });
}
