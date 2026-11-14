import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '@devpilot/github';
import { prisma } from '@devpilot/database';
import {
  INSTALL_STATE_COOKIE_NAME,
  type ConnectRepositoryInput,
  type SyncRepositoriesInput,
} from '@devpilot/shared';
import { env } from '../config/env.js';
import { githubIntegrationService } from '../services/github.service.js';
import { RepositoryService } from '../services/repository.service.js';
import {
  generateRandomState,
  getSessionCookieOptions,
} from '../utils/crypto.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class GitHubController {
  /**
   * GET /api/github/install
   * Initiates GitHub App installation URL.
   */
  static async install(req: Request, res: Response): Promise<void> {
    if (!githubIntegrationService.isAppConfigured()) {
      sendError(
        res,
        'GITHUB_APP_NOT_CONFIGURED',
        'GitHub App credentials are not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env',
        500
      );
      return;
    }

    const state = generateRandomState();
    res.cookie(INSTALL_STATE_COOKIE_NAME, state, {
      ...getSessionCookieOptions(),
      maxAge: 15 * 60 * 1000,
    });

    const appService = githubIntegrationService.getAppService();
    const installUrl = appService.getInstallationUrl(state);

    if (req.headers.accept?.includes('application/json')) {
      sendSuccess(res, { installUrl });
    } else {
      res.redirect(installUrl);
    }
  }

  /**
   * GET /api/github/callback
   * Post-installation callback from GitHub.
   */
  static async callback(req: Request, res: Response): Promise<void> {
    const installationId = req.query.installation_id as string | undefined;
    const setupAction = req.query.setup_action as string | undefined;
    const state = req.query.state as string | undefined;
    const savedState = req.cookies?.[INSTALL_STATE_COOKIE_NAME];

    res.clearCookie(INSTALL_STATE_COOKIE_NAME);

    // Optional state verification if state was provided (timing-safe)
    if (state && savedState) {
      const isMatch =
        state.length === savedState.length &&
        crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState));

      if (!isMatch) {
        sendError(res, 'INVALID_STATE', 'Installation state mismatch', 400);
        return;
      }
    }

    // Redirect user back to repositories dashboard page with installation status
    const params = new URLSearchParams();
    if (installationId) params.set('installation_id', installationId);
    if (setupAction) params.set('setup_action', setupAction);

    res.redirect(`${env.FRONTEND_URL}/repositories?${params.toString()}`);
  }

  /**
   * GET /api/github/repositories
   * Lists repositories accessible to the GitHub App installations.
   */
  static async listRepositories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!githubIntegrationService.isAppConfigured()) {
        sendError(
          res,
          'GITHUB_APP_NOT_CONFIGURED',
          'GitHub App credentials are not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env',
          500
        );
        return;
      }

      const repos = await githubIntegrationService.getInstallableRepositories(
        req.organizationId!
      );

      sendSuccess(res, repos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/github/repositories/sync
   * Connects or syncs repositories to the DevPilot organization.
   */
  static async syncRepositories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = req.body as SyncRepositoriesInput | ConnectRepositoryInput;

      // Handle single repo connection (githubRepoId + installationId)
      if ('githubRepoId' in input && input.githubRepoId && input.installationId) {
        const connected = await RepositoryService.connectRepository(
          req.organizationId!,
          req.user!.id,
          input.githubRepoId,
          input.installationId
        );
        sendSuccess(res, connected, 201);
        return;
      }

      // Handle sync across installation or list of IDs
      if ('installationId' in input && input.installationId) {
        const app = githubIntegrationService.getAppService();
        const repos = await app.listInstallationRepositories(input.installationId);

        const repositoryIds = 'repositoryIds' in input && Array.isArray(input.repositoryIds)
          ? input.repositoryIds
          : undefined;

        const targetRepos = repositoryIds
          ? repos.filter((r) => repositoryIds.includes(r.id))
          : repos;

        const results = [];
        for (const r of targetRepos) {
          const connected = await RepositoryService.connectRepository(
            req.organizationId!,
            req.user!.id,
            r.id,
            input.installationId
          );
          results.push(connected);
        }

        sendSuccess(res, results);
        return;
      }

      sendError(
        res,
        'INVALID_REQUEST',
        'Either githubRepoId with installationId or installationId with repositoryIds is required',
        400
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/github/repositories/:id
   * Disconnects a repository.
   */
  static async disconnectRepository(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const repositoryId = req.params.id;
      if (!repositoryId) {
        sendError(res, 'MISSING_ID', 'Repository ID is required', 400);
        return;
      }

      await RepositoryService.disconnectRepository(
        req.organizationId!,
        req.user!.id,
        repositoryId
      );

      sendSuccess(res, { message: 'Repository disconnected successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/github/webhook
   * GitHub App webhook receiver (verifies x-hub-signature-256 HMAC).
   */
  static async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string | undefined;

    // Validate signature if webhook secret is configured
    if (env.GITHUB_WEBHOOK_SECRET) {
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
      const isValid = verifyWebhookSignature(
        rawPayload,
        signature,
        env.GITHUB_WEBHOOK_SECRET
      );

      if (!isValid) {
        sendError(res, 'INVALID_SIGNATURE', 'Invalid GitHub webhook signature', 401);
        return;
      }
    }

    if (event === 'ping') {
      sendSuccess(res, { message: 'pong', zen: req.body?.zen });
      return;
    }

    if (event === 'installation') {
      const action = req.body?.action;
      const installationId = req.body?.installation?.id;

      if (action === 'deleted' && installationId) {
        // App was uninstalled from GitHub account -> disconnect all linked repositories
        await prisma.repository.updateMany({
          where: { installationId: BigInt(installationId) },
          data: { isConnected: false },
        });

        await prisma.agentSettings.updateMany({
          where: { repository: { installationId: BigInt(installationId) } },
          data: { isEnabled: false },
        });
      }
    } else if (event === 'installation_repositories') {
      const action = req.body?.action;
      const removed = req.body?.repositories_removed;

      if (action === 'removed' && Array.isArray(removed)) {
        for (const repo of removed) {
          if (repo.id) {
            await prisma.repository.updateMany({
              where: { githubRepoId: BigInt(repo.id) },
              data: { isConnected: false },
            });
            await prisma.agentSettings.updateMany({
              where: { repository: { githubRepoId: BigInt(repo.id) } },
              data: { isEnabled: false },
            });
          }
        }
      }
    }

    sendSuccess(res, { received: true, event });
  }
}

