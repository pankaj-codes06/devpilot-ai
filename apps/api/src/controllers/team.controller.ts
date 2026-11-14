import type { Request, Response, NextFunction } from 'express';
import {
  createTeamSchema,
  updateTeamSchema,
  mapModuleSchema,
  updateModuleSchema,
} from '@devpilot/shared';
import { TeamMappingService } from '../services/team-mapping.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class TeamController {
  /**
   * GET /api/projects/:id/teams
   * Lists all teams for a project.
   */
  static async listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const teams = await TeamMappingService.listTeams(req.organizationId!, projectId);
      sendSuccess(res, teams);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/teams/:teamId
   * Retrieves single team details.
   */
  static async getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, teamId } = req.params;
      if (!projectId || !teamId) {
        sendError(res, 'BAD_REQUEST', 'Project ID and Team ID are required', 400);
        return;
      }

      const team = await TeamMappingService.getTeam(req.organizationId!, projectId, teamId);
      sendSuccess(res, team);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/teams
   * Creates a new team for a project.
   */
  static async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const validation = createTeamSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid team payload', 400, validation.error.format());
        return;
      }

      const team = await TeamMappingService.createTeam(
        req.organizationId!,
        req.user!.id,
        projectId,
        validation.data
      );

      sendSuccess(res, team, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/projects/:id/teams/:teamId
   * Updates an existing team.
   */
  static async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, teamId } = req.params;
      if (!projectId || !teamId) {
        sendError(res, 'BAD_REQUEST', 'Project ID and Team ID are required', 400);
        return;
      }

      const validation = updateTeamSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid team update payload', 400, validation.error.format());
        return;
      }

      const team = await TeamMappingService.updateTeam(
        req.organizationId!,
        req.user!.id,
        projectId,
        teamId,
        validation.data
      );

      sendSuccess(res, team);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id/teams/:teamId
   * Deletes a team.
   */
  static async deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, teamId } = req.params;
      if (!projectId || !teamId) {
        sendError(res, 'BAD_REQUEST', 'Project ID and Team ID are required', 400);
        return;
      }

      await TeamMappingService.deleteTeam(req.organizationId!, req.user!.id, projectId, teamId);
      sendSuccess(res, { deleted: true, teamId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/modules
   * Lists all modules mapped to a project.
   */
  static async listModules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const modules = await TeamMappingService.listModules(req.organizationId!, projectId);
      sendSuccess(res, modules);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/modules
   * Creates or maps a new module with conflict detection.
   */
  static async createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const validation = mapModuleSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid module payload', 400, validation.error.format());
        return;
      }

      const moduleRecord = await TeamMappingService.createModule(
        req.organizationId!,
        req.user!.id,
        projectId,
        validation.data
      );

      sendSuccess(res, moduleRecord, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/projects/:id/modules/:moduleId
   * Updates an existing module with conflict detection.
   */
  static async updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, moduleId } = req.params;
      if (!projectId || !moduleId) {
        sendError(res, 'BAD_REQUEST', 'Project ID and Module ID are required', 400);
        return;
      }

      const validation = updateModuleSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(res, 'VALIDATION_ERROR', 'Invalid module update payload', 400, validation.error.format());
        return;
      }

      const updated = await TeamMappingService.updateModule(
        req.organizationId!,
        req.user!.id,
        projectId,
        moduleId,
        validation.data
      );

      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id/modules/:moduleId
   * Deletes a module.
   */
  static async deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: projectId, moduleId } = req.params;
      if (!projectId || !moduleId) {
        sendError(res, 'BAD_REQUEST', 'Project ID and Module ID are required', 400);
        return;
      }

      await TeamMappingService.deleteModule(req.organizationId!, req.user!.id, projectId, moduleId);
      sendSuccess(res, { deleted: true, moduleId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/modules/suggest
   * Runs automated team and module suggestions on extracted workspace files.
   */
  static async suggestTeamsAndModules(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const result = await TeamMappingService.suggestTeamsAndModules(
        req.organizationId!,
        req.user!.id,
        projectId
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
