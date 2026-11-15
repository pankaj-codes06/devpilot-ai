import { analysisQueueService } from '../services/analysis-queue.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AnalysisController {
  /**
   * POST /api/repositories/:id/analyze
   * Dispatches an asynchronous repository intelligence analysis job to BullMQ.
   */
  static async triggerAnalysis(req, res, next) {
    try {
      const repositoryId = req.params.id;
      if (!repositoryId) {
        sendError(res, 'BAD_REQUEST', 'Repository ID is required', 400);
        return;
      }

      const result = await analysisQueueService.enqueueAnalysis(
        repositoryId,
        req.organizationId,
        req.user.id
      );

      sendSuccess(res, result, 202);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/repositories/:id/analysis
   * Retrieves the architecture overview, detected languages, frameworks, and latest analysis metrics.
   */
  static async getAnalysis(req, res, next) {
    try {
      const repositoryId = req.params.id;
      if (!repositoryId) {
        sendError(res, 'BAD_REQUEST', 'Repository ID is required', 400);
        return;
      }

      const overview = await analysisQueueService.getLatestAnalysis(
        repositoryId,
        req.organizationId
      );

      sendSuccess(res, overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/repositories/:id/tasks
   * Retrieves the prioritized development task backlog from the latest analysis.
   */
  static async getTasks(req, res, next) {
    try {
      const repositoryId = req.params.id;
      if (!repositoryId) {
        sendError(res, 'BAD_REQUEST', 'Repository ID is required', 400);
        return;
      }

      const tasks = await analysisQueueService.getRepositoryTasks(
        repositoryId,
        req.organizationId
      );

      sendSuccess(res, tasks);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/agent-runs/:runId
   * Retrieves detailed execution status, progress, tasks, and telemetry for an agent run.
   */
  static async getRunDetails(req, res, next) {
    try {
      const runId = req.params.runId;
      if (!runId) {
        sendError(res, 'BAD_REQUEST', 'Run ID is required', 400);
        return;
      }

      const details = await analysisQueueService.getAgentRunDetails(
        runId,
        req.organizationId
      );

      sendSuccess(res, details);
    } catch (error) {
      next(error);
    }
  }
}
