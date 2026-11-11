import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@devpilot/shared';
import { sendError } from '../utils/response.js';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

