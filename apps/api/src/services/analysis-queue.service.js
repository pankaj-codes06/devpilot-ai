import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma, serializeBigInt, ExecutionStatus, TriggerType } from '@devpilot/database';
import { REPOSITORY_ANALYSIS_QUEUE } from '@devpilot/shared';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { AuditService } from './audit.service.js';

export class AnalysisQueueService {
  constructor() {
    this.redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.queue = new Queue(REPOSITORY_ANALYSIS_QUEUE, {
      connection: this.redisConnection,
    });
  }

  /**
   * Enqueues a repository analysis job in BullMQ and registers the AgentRun record.
   * @param {string} repositoryId
   * @param {string} organizationId
   * @param {string} userId
   */
  async enqueueAnalysis(
    repositoryId,
    organizationId,
    userId
  ) {
    // 1. Verify Repository ownership and connection
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });

    if (!repo) {
      throw new AppError('Repository not found in current organization', 404, 'NOT_FOUND');
    }

    if (!repo.isConnected) {
      throw new AppError(
        'Cannot analyze a disconnected repository. Please reconnect the repository first.',
        400,
        'BAD_REQUEST'
      );
    }

    // 2. Prevent duplicate active analysis jobs
    const activeRun = await prisma.agentRun.findFirst({
      where: {
        repositoryId,
        status: { in: [ExecutionStatus.QUEUED, ExecutionStatus.RUNNING] },
      },
      select: { id: true, status: true, startedAt: true, createdAt: true },
    });

    if (activeRun) {
      throw new AppError(
        `An analysis run (${activeRun.id}) is already ${activeRun.status.toLowerCase()} for this repository. Please wait for it to finish.`,
        409,
        'CONFLICT'
      );
    }

    // 3. Create AgentRun in PostgreSQL
    const agentRun = await prisma.agentRun.create({
      data: {
        repositoryId,
        triggerType: TriggerType.MANUAL,
        status: ExecutionStatus.QUEUED,
      },
    });

    // 4. Dispatch job to BullMQ
    const jobData = {
      repositoryId,
      organizationId,
      runId: agentRun.id,
      triggerType: 'MANUAL',
    };

    if (this.queue) {
      await this.queue.add('analyze-repository', jobData, {
        jobId: `analysis-${agentRun.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    }

    // 5. Record Audit Log
    await AuditService.record({
      organizationId,
      userId,
      repositoryId,
      action: 'ANALYSIS_REQUESTED',
      entityType: 'AGENT_RUN',
      entityId: agentRun.id,
      metadata: {
        runId: agentRun.id,
        repositoryName: repo.fullName,
      },
    });

    return {
      runId: agentRun.id,
      status: 'QUEUED',
      repositoryName: repo.fullName,
    };
  }

  /**
   * Retrieves the latest analysis overview and task breakdown for a repository.
   * @param {string} repositoryId
   * @param {string} organizationId
   */
  async getLatestAnalysis(
    repositoryId,
    organizationId
  ) {
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });

    if (!repo) {
      throw new AppError('Repository not found in current organization', 404, 'NOT_FOUND');
    }

    const latestRun = await prisma.agentRun.findFirst({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          orderBy: [{ priority: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!latestRun) {
      return {
        repositoryId,
        latestRun: null,
        architecture: null,
        totalTasks: 0,
        tasksByPriority: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        tasksByCategory: {},
      };
    }

    const tasksByPriority = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const tasksByCategory = {};

    for (const task of latestRun.tasks) {
      const p = task.priority;
      if (tasksByPriority[p] !== undefined) {
        tasksByPriority[p]++;
      }
      tasksByCategory[task.category] = (tasksByCategory[task.category] || 0) + 1;
    }

    const runDto = this.mapAgentRunToDto(latestRun);

    return {
      repositoryId,
      latestRun: runDto,
      architecture: runDto.metadata,
      totalTasks: latestRun.tasks.length,
      tasksByPriority,
      tasksByCategory,
    };
  }

  /**
   * Retrieves the tasks backlog from the latest analysis run.
   * @param {string} repositoryId
   * @param {string} organizationId
   */
  async getRepositoryTasks(
    repositoryId,
    organizationId
  ) {
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });

    if (!repo) {
      throw new AppError('Repository not found in current organization', 404, 'NOT_FOUND');
    }

    const latestRun = await prisma.agentRun.findFirst({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          orderBy: [{ priority: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!latestRun) {
      return [];
    }

    return latestRun.tasks.map(this.mapTaskToDto);
  }

  /**
   * Retrieves full details for a specific AgentRun with tenant isolation.
   * @param {string} runId
   * @param {string} organizationId
   */
  async getAgentRunDetails(
    runId,
    organizationId
  ) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        repository: true,
        tasks: {
          orderBy: [{ priority: 'asc' }, { order: 'asc' }],
        },
      },
    });

    if (!run || run.repository.organizationId !== organizationId) {
      throw new AppError('Agent run not found in current organization', 404, 'NOT_FOUND');
    }

    return this.mapAgentRunToDto(run);
  }

  mapAgentRunToDto(run) {
    const s = serializeBigInt(run);
    return {
      id: s.id,
      repositoryId: s.repositoryId,
      triggerType: s.triggerType,
      status: s.status,
      startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
      completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
      summary: s.summary,
      errorLog: s.errorLog,
      metadata: s.metadata,
      findings: s.findings,
      tasks: (s.tasks || []).map(this.mapTaskToDto),
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    };
  }

  mapTaskToDto(task) {
    const s = serializeBigInt(task);
    return {
      id: s.id,
      agentRunId: s.agentRunId,
      title: s.title,
      description: s.description,
      priority: s.priority,
      category: s.category,
      estimatedComplexity: s.estimatedComplexity,
      expectedBenefit: s.expectedBenefit,
      suggestedApproach: s.suggestedApproach,
      requiredTests: s.requiredTests,
      moduleName: s.moduleName,
      assignedMember: s.assignedMember,
      relevantFiles: s.relevantFiles || [],
      evidence: s.evidence,
      status: s.status,
      order: s.order,
      createdAt: new Date(s.createdAt).toISOString(),
    };
  }

  async close() {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    if (this.redisConnection) {
      await this.redisConnection.quit();
      this.redisConnection = null;
    }
  }
}

export const analysisQueueService = new AnalysisQueueService();
