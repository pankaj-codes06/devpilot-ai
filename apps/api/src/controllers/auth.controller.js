import crypto from 'node:crypto';
import { prisma } from '@devpilot/database';
import {
  AUTH_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
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
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  static async githubLogin(req, res) {
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
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  static async githubCallback(req, res, next) {
    try {
      const code = req.query.code;
      const state = req.query.state;
      const savedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];

      // Security check: Validate state to prevent CSRF using timing-safe comparison
      const isValidState =
        Boolean(state) &&
        Boolean(savedState) &&
        state.length === savedState.length &&
        crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState));

      if (!code || !isValidState) {
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

      const ipAddress = req.ip || req.socket?.remoteAddress;
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
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  static async getMe(req, res, next) {
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

      const organizations = memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        githubOrgId: m.organization.githubOrgId ? m.organization.githubOrgId.toString() : null,
        role: m.role,
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
   * @param {import('express').Request} _req
   * @param {import('express').Response} res
   */
  static async logout(_req, res) {
    res.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
    });
    sendSuccess(res, { message: 'Logged out successfully' });
  }
}
