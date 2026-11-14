import { prisma, serializeBigInt, VersionStatus, TaskStatus, type TaskPriorityLevel } from '@devpilot/database';
import {
  RepositoryAnalyzer,
  IntelligenceEngineFactory,
  type TeamModuleInput,
} from '@devpilot/intelligence';
import type {
  DevelopmentTaskDto,
  ArchitectureSummary,
} from '@devpilot/shared';
import { env } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { AuditService } from './audit.service.js';

export interface TaskFilterOptions {
  teamId?: string;
  moduleId?: string;
  priority?: TaskPriorityLevel;
  category?: string;
  status?: TaskStatus;
}

export interface ProjectAnalysisOverview {
  projectId: string;
  projectName: string;
  activeVersionNumber: number;
  status: string;
  architecture: ArchitectureSummary | null;
  reportSummary: string | null;
  metrics: {
    totalFiles: number;
    totalTasks: number;
    tasksByPriority: Record<string, number>;
    tasksByCategory: Record<string, number>;
    tasksByTeam: Record<string, number>;
  };
}

export class ProjectAnalysisService {
  /**
   * Executes full codebase analysis on an extracted ZIP project workspace
   * using the shared intelligence engine and deterministic analyzer.
   */
  static async analyzeProject(
    organizationId: string,
    userId: string,
    projectId: string
  ): Promise<{
    summary: ArchitectureSummary;
    report: string;
    tasks: DevelopmentTaskDto[];
  }> {
    // 1. Fetch Project and Active/Latest Version
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        modules: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const version = project.versions[0];
    if (!version || !version.extractedPath) {
      throw new AppError(
        'Project has no extracted version workspace available to analyze. Please upload a project archive first.',
        400,
        'NO_WORKSPACE'
      );
    }

    // 2. Map existing modules to TeamModuleInput
    const teamModules: TeamModuleInput[] = project.modules.map((m) => ({
      id: m.id,
      name: m.name,
      pathPattern: m.pathPattern,
      ownerName: m.team?.name || undefined,
      isShared: m.isShared,
    }));

    // 3. Run Deterministic Static Analysis on workspace directory
    const staticAnalysis = await RepositoryAnalyzer.analyze(version.extractedPath, teamModules);

    // 4. Run AI Intelligence Engine
    const provider = IntelligenceEngineFactory.getProvider({
      geminiApiKey: env.GEMINI_API_KEY,
      openaiApiKey: env.OPENAI_API_KEY,
    });

    const aiOutput = await provider.analyze({
      repositoryName: project.name,
      defaultBranch: 'main',
      analysis: staticAnalysis,
    });

    // 5. Match tasks to project modules and teams
    const createdTasks: DevelopmentTaskDto[] = [];

    await prisma.$transaction(async (tx) => {
      // Clear previous tasks for this project version
      await tx.developmentTask.deleteMany({
        where: {
          projectId: project.id,
          projectVersionId: version.id,
        },
      });

      // Fetch fresh list of modules for linking
      const currentModules = await tx.projectModule.findMany({
        where: { projectId: project.id },
        include: { team: true },
      });

      for (let i = 0; i < aiOutput.tasks.length; i++) {
        const task = aiOutput.tasks[i];

        // Attempt to match module by name or by file pattern
        let matchedModule = currentModules.find(
          (m) => m.name.toLowerCase() === (task.module || '').toLowerCase()
        );

        if (!matchedModule && task.relevantFiles.length > 0) {
          matchedModule = currentModules.find((m) => {
            const cleanPattern = m.pathPattern.replace(/\*.*$/, '');
            return task.relevantFiles.some(
              (f) => f.startsWith(cleanPattern) || (m.pathPattern.includes('test') && f.includes('.test.'))
            );
          });
        }

        const taskRecord = await tx.developmentTask.create({
          data: {
            projectId: project.id,
            projectVersionId: version.id,
            moduleId: matchedModule?.id || null,
            teamId: matchedModule?.teamId || null,
            title: task.title,
            description: task.description,
            status: TaskStatus.PENDING,
            priority: task.priority as TaskPriorityLevel,
            category: task.category,
            estimatedComplexity: task.estimatedComplexity,
            expectedBenefit: task.expectedBenefit,
            suggestedApproach: task.suggestedApproach,
            requiredTests: task.requiredTests,
            relevantFiles: task.relevantFiles,
            evidence: task.evidence,
            order: i + 1,
          },
          include: {
            module: true,
            team: true,
          },
        });

        createdTasks.push({
          id: taskRecord.id,
          projectId: taskRecord.projectId,
          projectVersionId: taskRecord.projectVersionId,
          moduleId: taskRecord.moduleId,
          teamId: taskRecord.teamId,
          dailyExecutionId: taskRecord.dailyExecutionId,
          title: taskRecord.title,
          description: taskRecord.description,
          status: taskRecord.status,
          priority: taskRecord.priority,
          category: taskRecord.category,
          estimatedComplexity: taskRecord.estimatedComplexity,
          expectedBenefit: taskRecord.expectedBenefit,
          suggestedApproach: taskRecord.suggestedApproach,
          requiredTests: taskRecord.requiredTests,
          relevantFiles: taskRecord.relevantFiles,
          evidence: taskRecord.evidence,
          order: taskRecord.order,
          teamName: taskRecord.team?.name || null,
          moduleName: taskRecord.module?.name || null,
          createdAt: taskRecord.createdAt.toISOString(),
          updatedAt: taskRecord.updatedAt.toISOString(),
        });
      }

      // Update ProjectVersion metadata and status
      await tx.projectVersion.update({
        where: { id: version.id },
        data: {
          status: VersionStatus.READY,
          metadata: serializeBigInt(staticAnalysis.summary) as any,
          changelog: aiOutput.summary,
        },
      });
    });

    // Record Audit Log
    await AuditService.record({
      organizationId,
      userId,
      action: 'PROJECT_ANALYZED',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: {
        versionNumber: version.versionNumber,
        totalFiles: staticAnalysis.summary.totalFiles,
        tasksGenerated: createdTasks.length,
        languages: staticAnalysis.summary.languages,
        frameworks: staticAnalysis.summary.frameworks,
      },
    });

    return {
      summary: staticAnalysis.summary,
      report: aiOutput.summary,
      tasks: createdTasks,
    };
  }

  /**
   * Retrieves the architecture overview and task metrics for a project.
   */
  static async getProjectAnalysis(
    organizationId: string,
    projectId: string
  ): Promise<ProjectAnalysisOverview> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        tasks: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const version = project.versions[0];
    const metadata = version?.metadata as unknown as ArchitectureSummary | null;

    const tasksByPriority: Record<string, number> = {};
    const tasksByCategory: Record<string, number> = {};
    const tasksByTeam: Record<string, number> = {};

    for (const t of project.tasks) {
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;
      tasksByCategory[t.category] = (tasksByCategory[t.category] || 0) + 1;
      const teamLabel = t.team?.name || 'Unassigned';
      tasksByTeam[teamLabel] = (tasksByTeam[teamLabel] || 0) + 1;
    }

    return {
      projectId: project.id,
      projectName: project.name,
      activeVersionNumber: version?.versionNumber ?? 0,
      status: version?.status ?? 'UNKNOWN',
      architecture: metadata,
      reportSummary: version?.changelog || null,
      metrics: {
        totalFiles: metadata?.totalFiles ?? version?.fileCount ?? 0,
        totalTasks: project.tasks.length,
        tasksByPriority,
        tasksByCategory,
        tasksByTeam,
      },
    };
  }

  /**
   * Retrieves prioritized development tasks for a project with optional filters.
   */
  static async getProjectTasks(
    organizationId: string,
    projectId: string,
    filters?: TaskFilterOptions
  ): Promise<DevelopmentTaskDto[]> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const where: any = { projectId };
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.moduleId) where.moduleId = filters.moduleId;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    const tasks = await prisma.developmentTask.findMany({
      where,
      include: {
        team: true,
        module: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      projectVersionId: t.projectVersionId,
      moduleId: t.moduleId,
      teamId: t.teamId,
      dailyExecutionId: t.dailyExecutionId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      category: t.category,
      estimatedComplexity: t.estimatedComplexity,
      expectedBenefit: t.expectedBenefit,
      suggestedApproach: t.suggestedApproach,
      requiredTests: t.requiredTests,
      relevantFiles: t.relevantFiles,
      evidence: t.evidence,
      order: t.order,
      teamName: t.team?.name || null,
      moduleName: t.module?.name || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }
}
