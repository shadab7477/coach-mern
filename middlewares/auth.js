const { verifyToken } = require('../lib/jwt');
const { supabase } = require('../lib/supabase');

/**
 * Authentication Middleware:
 * Validates Bearer token from headers. Supports signed JWTs,
 * Supabase access tokens, and base64 session tokens.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication token is required.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Token is empty.',
        code: 'INVALID_TOKEN',
      });
    }

    // 1. Verify signed JWT
    const decoded = verifyToken(token);
    if (decoded && decoded.email) {
      req.user = {
        id: decoded.id || `usr-${decoded.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: decoded.email.toLowerCase().trim(),
        role: decoded.role || 'client',
        fullName: decoded.fullName || decoded.email.split('@')[0],
        phone: decoded.phone || '',
        avatarUrl: decoded.avatarUrl || '',
      };
      return next();
    }

    // 2. Verify Supabase Session Token
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        req.user = {
          id: user.id,
          email: user.email.toLowerCase().trim(),
          role: profile?.role || user.user_metadata?.role || 'client',
          fullName: profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
          phone: profile?.phone || user.user_metadata?.phone || '',
          avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        };
        return next();
      }
    } catch (sbErr) {
      // Continue to fallback check
    }

    // 3. Fallback: Base64 session string
    try {
      const decodedStr = Buffer.from(token, 'base64').toString('utf8');
      const parsed = JSON.parse(decodedStr);
      if (parsed && parsed.email) {
        req.user = {
          id: parsed.id || `usr-${parsed.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: parsed.email.toLowerCase().trim(),
          role: parsed.role || 'client',
          fullName: parsed.fullName || parsed.email.split('@')[0],
          phone: parsed.phone || '',
          avatarUrl: parsed.avatarUrl || '',
        };
        return next();
      }
    } catch {}

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token is invalid or expired. Please sign in again.',
      code: 'INVALID_TOKEN',
    });
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication error.',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Role-Based Access Control Middleware:
 * Checks if authenticated user has one of the required roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Please authenticate first.',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access requires [${allowedRoles.join(' or ')}] role. Current role is '${userRole}'.`,
        code: 'FORBIDDEN',
      });
    }

    return next();
  };
}

/**
 * Optional Authentication Middleware:
 * If Bearer token is provided, decodes user; otherwise continues as guest.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.email) {
          req.user = {
            id: decoded.id || `usr-${decoded.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: decoded.email.toLowerCase().trim(),
            role: decoded.role || 'client',
            fullName: decoded.fullName || decoded.email.split('@')[0],
            phone: decoded.phone || '',
            avatarUrl: decoded.avatarUrl || '',
          };
        }
      }
    }
  } catch {}
  return next();
}

module.exports = {
  authenticate,
  requireRole,
  optionalAuth,
};

