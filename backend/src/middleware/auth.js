const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Refusing to start without it.');
}

// Header-based identity is a development/test convenience only. It must never
// be enabled in production, where it would allow full account impersonation.
const HEADER_AUTH_ENABLED =
  process.env.ALLOW_HEADER_AUTH === 'true' || process.env.NODE_ENV === 'test';

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      if (HEADER_AUTH_ENABLED) {
        const testUserId = req.headers['x-user-id'];
        if (testUserId) {
          const result = await db.query('SELECT id, role, name, phone, email, status, postcode FROM users WHERE id = $1', [testUserId]);
          if (result.rows.length > 0) {
            req.user = result.rows[0];
            return next();
          }
        }
      }
      return res.status(401).json({ error: 'Authentication required. Missing token.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query('SELECT id, role, name, phone, email, status, postcode FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or session invalid.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // Super admin has access to all role-restricted routes
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden for role '${req.user.role}'. Required one of: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRoles,
  JWT_SECRET,
};
