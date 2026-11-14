import { prisma, serializeBigInt } from '@devpilot/database';
import { ExecutionStatus, TaskStatus } from '@devpilot/database';
import type { AnalysisJobData } from '@devpilot/shared';
import { SecureCloner } from '../executor/cloner.js';
import { RepositoryAnalyzer, type TeamModuleInput } from '../planner/analyzer.js';
import { IntelligenceEngineFactory } from '../planner/intelligence.js';

export class RepositoryAnalysisPipeline {
  /**
   * Executes a complete, sandboxed repository analysis run.
   */
  static async run(jobData: AnalysisJobData): Promise<void> {
    const { repositoryId, organizationId, runId } = jobData;

    console.log(`[AnalysisPipeline] Starting analysis run ${runId} for repository ${repositoryId}`);

    // 1. Fetch Repository and Configuration
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
      include: {
        agentSettings: true,
        modules: {
          include: {
            owner: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!repo) {
      throw new Error(`Repository ${repositoryId} not found in organization ${organizationId}`);
    }

    if (!repo.isConnected) {
      throw new Error(`Repository ${repo.fullName} is disconnected. Analysis cancelled.`);
    }

    // 2. Mark AgentRun as RUNNING
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
        errorLog: null,
      },
    });

    // 3. Prepare Team Modules
    const teamModules: TeamModuleInput[] = repo.modules.map((m) => ({
      id: m.id,
      name: m.name,
      pathPattern: m.pathPattern,
      ownerName: m.owner?.user?.name || m.owner?.user?.githubUsername || undefined,
    }));

    const allowedPaths = repo.agentSettings?.allowedPaths || [];
    const excludedPaths = repo.agentSettings?.excludedPaths || [];

    let workspace: { workspacePath: string; cleanup: () => Promise<void> } | null = null;

    try {
      // 4. Secure Clone (credentials cleaned immediately from .git/config)
      workspace = await SecureCloner.cloneRepository({
        runId,
        githubRepoId: repo.githubRepoId,
        installationId: repo.installationId,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
      });

      // 5. Deterministic Static Codebase Analysis
      const staticAnalysis = await RepositoryAnalyzer.analyze(
        workspace.workspacePath,
        teamModules,
        allowedPaths,
        excludedPaths
      );

      // 6. AI Intelligence Engine
      const intelligenceProvider = IntelligenceEngineFactory.getProvider();
      console.log(`[AnalysisPipeline] Running intelligence provider: ${intelligenceProvider.name}`);

      const aiOutput = await intelligenceProvider.analyze({
        repositoryName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        analysis: staticAnalysis,
      });

      // 7. Deduplicate & Enrich Tasks with Team Member Context
      const moduleOwnerMap = new Map<string, string>();
      for (const mod of teamModules) {
        if (mod.ownerName) {
          moduleOwnerMap.set(mod.name, mod.ownerName);
        }
      }

      const tasksToCreate = aiOutput.tasks.map((task, index) => {
        const assignedMember = task.module ? moduleOwnerMap.get(task.module) || null : null;
        return {
          agentRunId: runId,
          title: task.title,
          description: task.description,
          status: TaskStatus.PENDING,
          order: index + 1,
          priority: task.priority,
          category: task.category,
          estimatedComplexity: task.estimatedComplexity,
          expectedBenefit: task.expectedBenefit,
          suggestedApproach: task.suggestedApproach,
          requiredTests: task.requiredTests,
          moduleName: task.module || 'Unassigned',
          assignedMember,
          relevantFiles: task.relevantFiles,
          evidence: task.evidence,
        };
      });

      // 8. Transactional Database Update
      await prisma.$transaction(async (tx) => {
        // Delete any existing tasks for this run
        await tx.agentTask.deleteMany({
          where: { agentRunId: runId },
        });

        // Create tasks
        for (const taskData of tasksToCreate) {
          await tx.agentTask.create({
            data: taskData,
          });
        }

        // Update AgentRun
        await tx.agentRun.update({
          where: { id: runId },
          data: {
            status: ExecutionStatus.SUCCESS,
            summary: aiOutput.summary,
            metadata: serializeBigInt(staticAnalysis.summary) as any,
            findings: aiOutput.tasks as any,
            completedAt: new Date(),
          },
        });

        // Update Repository lastAnalyzedAt
        await tx.repository.update({
          where: { id: repositoryId },
          data: {
            lastAnalyzedAt: new Date(),
          },
        });

        // Record Audit Log
        await tx.auditLog.create({
          data: {
            organizationId,
            repositoryId,
            action: 'REPOSITORY_ANALYZED',
            entityType: 'REPOSITORY',
            entityId: repositoryId,
            metadata: {
              runId,
              totalTasks: tasksToCreate.length,
              languages: staticAnalysis.summary.languages,
              provider: intelligenceProvider.name,
            },
          },
        });
      });

      console.log(
        `[AnalysisPipeline] Successfully completed run ${runId}. Generated ${tasksToCreate.length} prioritized tasks.`
      );
    } catch (error) {
      console.error(`[AnalysisPipeline] Analysis run ${runId} failed:`, error);

      // Record failure in AgentRun
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          errorLog: error instanceof Error ? error.message : 'Unknown analysis error',
        },
      });

      throw error;
    } finally {
      // 9. Guarantee Workspace Cleanup
      if (workspace) {
        await workspace.cleanup();
      }
    }
  }
}
