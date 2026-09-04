import jwt from 'jsonwebtoken';

export function requireManager(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Manager authentication required' });
  try { req.manager = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid or expired token' }); }
}
