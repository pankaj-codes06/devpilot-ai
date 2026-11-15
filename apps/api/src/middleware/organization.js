import { sendError } from '../utils/response.js';

const ROLE_HIERARCHY = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

/**
 * Middleware requiring a minimum organization role.
 * @param {'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'} minimumRole
 */
export function requireRole(minimumRole) {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const userRoleValue = ROLE_HIERARCHY[req.user.role] ?? 0;
    const requiredRoleValue = ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userRoleValue < requiredRoleValue) {
      sendError(
        res,
        'FORBIDDEN',
        `Access denied. Requires at least ${minimumRole} privileges.`,
        403
      );
      return;
    }

    next();
  };
}
