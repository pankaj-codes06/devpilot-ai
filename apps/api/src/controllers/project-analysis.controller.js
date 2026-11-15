import { ProjectAnalysisService } from '../services/project-analysis.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ProjectAnalysisController {
  /**
   * POST /api/projects/:id/analyze
   * Executes full codebase intelligence analysis on the active project version.
   */
  static async analyzeProject(req, res, next) {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const result = await ProjectAnalysisService.analyzeProject(
        req.organizationId,
        req.user.id,
        projectId
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/analysis
   * Retrieves the architecture overview and task metrics for the project.
   */
  static async getProjectAnalysis(req, res, next) {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const overview = await ProjectAnalysisService.getProjectAnalysis(
        req.organizationId,
        projectId
      );

      sendSuccess(res, overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/tasks
   * Retrieves prioritized development tasks for the project.
   */
  static async getProjectTasks(req, res, next) {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'BAD_REQUEST', 'Project ID is required', 400);
        return;
      }

      const { teamId, moduleId, priority, category, status } = req.query;

      const tasks = await ProjectAnalysisService.getProjectTasks(
        req.organizationId,
        projectId,
        {
          teamId: typeof teamId === 'string' ? teamId : undefined,
          moduleId: typeof moduleId === 'string' ? moduleId : undefined,
          priority: typeof priority === 'string' ? priority : undefined,
          category: typeof category === 'string' ? category : undefined,
          status: typeof status === 'string' ? status : undefined,
        }
      );

      sendSuccess(res, tasks);
    } catch (error) {
      next(error);
    }
  }
}
