import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@devpilot/database';
import {
  AUTH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  type OrganizationDto,
  type UserRole,
} from '@devpilot/shared';
import { env } from '../config/env.js';
import { githubIntegrationService } from '../services/github.service.js';
import { AuthService } from '../services/auth.service.js';
import {
  generateRandomState,
  getSessionCookieOptions,
} from '../utils/crypto.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  /**
   * GET /api/auth/github
   * Initiates the GitHub OAuth flow.
   */
  static async githubLogin(req: Request, res: Response): Promise<void> {
    if (!githubIntegrationService.isOAuthConfigured()) {
      sendError(
        res,
        'OAUTH_NOT_CONFIGURED',
        'GitHub OAuth credentials are not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env',
        500
      );
      return;
    }

    const state = generateRandomState();
    res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      ...getSessionCookieOptions(),
      maxAge: 15 * 60 * 1000, // 15 minutes TTL for state cookie
    });

    const oauthService = githubIntegrationService.getOAuthService();
    const authorizeUrl = oauthService.getAuthorizationUrl(state);

    if (req.headers.accept?.includes('application/json')) {
      sendSuccess(res, { authorizeUrl });
    } else {
      res.redirect(authorizeUrl);
    }
  }

  /**
   * GET /api/auth/github/callback
   * Handles callback from GitHub OAuth.
   */
  static async githubCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      const savedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];

      // Security check: Validate state to prevent CSRF
      if (!code || !state || !savedState || state !== savedState) {
        res.clearCookie(OAUTH_STATE_COOKIE_NAME);
        sendError(
          res,
          'INVALID_OAUTH_STATE',
          'Invalid or expired OAuth state. Please try logging in again.',
          400
        );
        return;
      }

      res.clearCookie(OAUTH_STATE_COOKIE_NAME);

      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { sessionToken } = await AuthService.handleGitHubCallback(
        code,
        ipAddress,
        userAgent
      );

      // Set secure HTTP-only session cookie
      res.cookie(AUTH_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      // Redirect user to frontend dashboard
      res.redirect(`${env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Returns current authenticated user and organization details.
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      // Fetch user's organizations
      const memberships = await prisma.teamMember.findMany({
        where: { userId: req.user.id },
        include: { organization: true },
      });

      const organizations: OrganizationDto[] = memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        githubOrgId: m.organization.githubOrgId ? m.organization.githubOrgId.toString() : null,
        role: m.role as UserRole,
      }));

      sendSuccess(res, {
        user: req.user,
        organizations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Destroys the current user session cookie.
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
    });
    sendSuccess(res, { message: 'Logged out successfully' });
  }
}

