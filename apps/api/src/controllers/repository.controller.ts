import type { Request, Response, NextFunction } from 'express';
import type { UpdateAgentSettingsInput } from '@devpilot/shared';
import { RepositoryService } from '../services/repository.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class RepositoryController {
  /**
   * GET /api/repositories
   * Lists connected repositories for the current organization.
   */
  static async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const repos = await RepositoryService.listConnectedRepositories(
        req.organizationId!
      );
      sendSuccess(res, repos);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/repositories/:id
   * Retrieves single repository details.
   */
  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        sendError(res, 'BAD_REQUEST', 'Repository ID is required', 400);
        return;
      }

      const repo = await RepositoryService.getRepositoryById(
        req.organizationId!,
        id
      );

      sendSuccess(res, repo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/repositories/:id/settings
   * Updates agent settings for a repository.
   */
  static async updateSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body as UpdateAgentSettingsInput;

      if (!id) {
        sendError(res, 'BAD_REQUEST', 'Repository ID is required', 400);
        return;
      }

      const updated = await RepositoryService.updateAgentSettings(
        req.organizationId!,
        req.user!.id,
        id,
        body
      );

      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/repositories/dashboard/stats
   * Retrieves dashboard statistics and summary.
   */
  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await RepositoryService.getDashboardStats(
        req.organizationId!
      );
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

