import { prisma } from '@devpilot/database';
import { AUTH_COOKIE_NAME } from '@devpilot/shared';
import { verifySessionPayload } from '../utils/crypto.js';
import { sendError } from '../utils/response.js';

/**
 * Authentication middleware that verifies session tokens from cookies or Authorization header.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const payload = verifySessionPayload(token);
  if (!payload?.userId) {
    sendError(res, 'UNAUTHORIZED', 'Session expired or invalid', 401);
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'UNAUTHORIZED', 'User account not found', 401);
      return;
    }

    // Determine current organization
    let currentMembership = user.memberships.find(
      (m) => m.organizationId === payload.organizationId
    );

    if (!currentMembership && user.memberships.length > 0) {
      currentMembership = user.memberships[0];
    }

    if (!currentMembership) {
      sendError(res, 'FORBIDDEN', 'No organization membership found for user', 403);
      return;
    }

    req.user = {
      id: user.id,
      githubId: user.githubId.toString(),
      githubUsername: user.githubUsername,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      currentOrganizationId: currentMembership.organizationId,
      role: currentMembership.role,
    };
    req.organizationId = currentMembership.organizationId;

    next();
  } catch (error) {
    next(error);
  }
}
