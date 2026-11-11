import { prisma, serializeBigInt } from '@devpilot/database';
import type {
  RepositoryDto,
  AgentSettingsDto,
  DashboardStatsDto,
  UpdateAgentSettingsInput,
} from '@devpilot/shared';
import { githubIntegrationService } from './github.service.js';
import { AuditService } from './audit.service.js';
import { AppError } from '../utils/response.js';

export class RepositoryService {
  /**
   * Connects an authorized GitHub repository to DevPilot.
   */
  static async connectRepository(
    organizationId: string,
    userId: string,
    githubRepoId: number,
    installationId: number
  ): Promise<RepositoryDto> {
    const app = githubIntegrationService.getAppService();

    // Verify access to installation repositories
    const accessibleRepos = await app.listInstallationRepositories(installationId);
    const target = accessibleRepos.find((r) => r.id === githubRepoId);

    if (!target) {
      throw new AppError(
        `Repository ${githubRepoId} is not accessible under GitHub App installation ${installationId}`,
        403,
        'FORBIDDEN'
      );
    }

    // Upsert repository in database
    const repository = await prisma.repository.upsert({
      where: { githubRepoId: BigInt(githubRepoId) },
      update: {
        organizationId,
        installationId: BigInt(installationId),
        name: target.name,
        fullName: target.fullName,
        owner: target.owner,
        isPrivate: target.isPrivate,
        htmlUrl: target.htmlUrl,
        defaultBranch: target.defaultBranch,
        description: target.description,
        isConnected: true,
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId,
        githubRepoId: BigInt(githubRepoId),
        installationId: BigInt(installationId),
        name: target.name,
        fullName: target.fullName,
        owner: target.owner,
        isPrivate: target.isPrivate,
        htmlUrl: target.htmlUrl,
        defaultBranch: target.defaultBranch,
        description: target.description,
        isConnected: true,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
        agentSettings: {
          create: {
            isEnabled: false,
            scheduleCron: '0 9 * * 1-5',
            timezone: 'Asia/Kolkata',
            branchPrefix: 'devpilot/',
            allowedPaths: [],
            excludedPaths: ['.github/**', 'docker/**', 'docker-compose.yml', '.env*'],
            maxDailyRuns: 3,
            requirePrReview: true,
          },
        },
      },
      include: {
        agentSettings: true,
      },
    });

    // Ensure agent settings exist if repo previously existed without them
    let agentSettings = repository.agentSettings;
    if (!agentSettings) {
      agentSettings = await prisma.agentSettings.create({
        data: {
          repositoryId: repository.id,
          isEnabled: false,
          scheduleCron: '0 9 * * 1-5',
          timezone: 'Asia/Kolkata',
          branchPrefix: 'devpilot/',
          allowedPaths: [],
          excludedPaths: ['.github/**', 'docker/**', 'docker-compose.yml', '.env*'],
          maxDailyRuns: 3,
          requirePrReview: true,
        },
      });
    }

    await AuditService.record({
      organizationId,
      userId,
      repositoryId: repository.id,
      action: 'REPOSITORY_CONNECTED',
      entityType: 'REPOSITORY',
      entityId: repository.id,
      metadata: {
        fullName: repository.fullName,
        githubRepoId: repository.githubRepoId.toString(),
      },
    });

    return this.mapRepositoryToDto({ ...repository, agentSettings });
  }

  /**
   * Disconnects a repository by ID.
   */
  static async disconnectRepository(
    organizationId: string,
    userId: string,
    repositoryId: string
  ): Promise<void> {
    const repository = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });

    if (!repository) {
      throw new AppError('Repository not found in current organization', 404, 'NOT_FOUND');
    }

    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        isConnected: false,
        agentSettings: {
          update: {
            isEnabled: false,
          },
        },
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      repositoryId: repository.id,
      action: 'REPOSITORY_DISCONNECTED',
      entityType: 'REPOSITORY',
      entityId: repository.id,
      metadata: {
        fullName: repository.fullName,
      },
    });
  }

  /**
   * Lists all connected repositories for an organization.
   */
  static async listConnectedRepositories(
    organizationId: string
  ): Promise<RepositoryDto[]> {
    const repos = await prisma.repository.findMany({
      where: {
        organizationId,
        isConnected: true,
      },
      include: {
        agentSettings: true,
      },
      orderBy: { connectedAt: 'desc' },
    });

    return repos.map(this.mapRepositoryToDto);
  }

  /**
   * Gets single repository by ID.
   */
  static async getRepositoryById(
    organizationId: string,
    repositoryId: string
  ): Promise<RepositoryDto> {
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
      include: {
        agentSettings: true,
      },
    });

    if (!repo) {
      throw new AppError('Repository not found', 404, 'NOT_FOUND');
    }

    return this.mapRepositoryToDto(repo);
  }

  /**
   * Updates agent settings for a repository.
   */
  static async updateAgentSettings(
    organizationId: string,
    userId: string,
    repositoryId: string,
    input: UpdateAgentSettingsInput
  ): Promise<AgentSettingsDto> {
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, organizationId },
    });

    if (!repo) {
      throw new AppError('Repository not found in current organization', 404, 'NOT_FOUND');
    }

    if (!repo.isConnected && input.isEnabled) {
      throw new AppError(
        'Cannot enable autonomous agent on a disconnected repository. Please reconnect the repository first.',
        400,
        'BAD_REQUEST'
      );
    }

    const settings = await prisma.agentSettings.upsert({
      where: { repositoryId },
      update: {
        ...input,
      },
      create: {
        repositoryId,
        isEnabled: input.isEnabled ?? false,
        scheduleCron: input.scheduleCron ?? '0 9 * * 1-5',
        timezone: input.timezone ?? 'Asia/Kolkata',
        branchPrefix: input.branchPrefix ?? 'devpilot/',
        allowedPaths: input.allowedPaths ?? [],
        excludedPaths: input.excludedPaths ?? [
          '.github/**',
          'docker/**',
          'docker-compose.yml',
          '.env*',
        ],
        maxDailyRuns: input.maxDailyRuns ?? 3,
        requirePrReview: input.requirePrReview ?? true,
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      repositoryId,
      action: 'AGENT_SETTINGS_UPDATED',
      entityType: 'AGENT_SETTINGS',
      entityId: settings.id,
      metadata: input as Record<string, unknown>,
    });

    return this.mapAgentSettingsToDto(settings);
  }

  /**
   * Fetches dashboard summary statistics.
   */
  static async getDashboardStats(
    organizationId: string
  ): Promise<DashboardStatsDto> {
    const connectedRepositoriesCount = await prisma.repository.count({
      where: { organizationId, isConnected: true },
    });

    const totalRepositoriesCount = await prisma.repository.count({
      where: { organizationId },
    });

    const agentActiveCount = await prisma.agentSettings.count({
      where: {
        isEnabled: true,
        repository: {
          organizationId,
          isConnected: true,
        },
      },
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        repository: { select: { fullName: true } },
      },
    });

    const recentActivity = auditLogs.map((log) => {
      let type: 'REPO_CONNECTED' | 'REPO_DISCONNECTED' | 'SETTINGS_UPDATED' =
        'SETTINGS_UPDATED';
      if (log.action === 'REPOSITORY_CONNECTED') type = 'REPO_CONNECTED';
      if (log.action === 'REPOSITORY_DISCONNECTED') type = 'REPO_DISCONNECTED';

      return {
        id: log.id,
        type,
        title: log.action.replace(/_/g, ' '),
        description: `Action performed on ${log.entityType.toLowerCase()} ${log.repository?.fullName || ''}`,
        timestamp: log.createdAt.toISOString(),
        repositoryName: log.repository?.fullName,
      };
    });

    return {
      connectedRepositoriesCount,
      totalRepositoriesCount,
      agentActiveCount,
      upcomingScheduledRunsCount: agentActiveCount > 0 ? agentActiveCount : 0,
      recentActivity,
    };
  }

  private static mapRepositoryToDto(repo: any): RepositoryDto {
    const serialized = serializeBigInt(repo);
    return {
      id: serialized.id,
      organizationId: serialized.organizationId,
      githubRepoId: serialized.githubRepoId.toString(),
      installationId: serialized.installationId.toString(),
      name: serialized.name,
      fullName: serialized.fullName,
      owner: serialized.owner,
      isPrivate: serialized.isPrivate,
      htmlUrl: serialized.htmlUrl,
      defaultBranch: serialized.defaultBranch,
      description: serialized.description,
      isConnected: serialized.isConnected,
      connectedAt: serialized.connectedAt ? new Date(serialized.connectedAt).toISOString() : new Date().toISOString(),
      lastSyncedAt: serialized.lastSyncedAt ? new Date(serialized.lastSyncedAt).toISOString() : new Date().toISOString(),
      createdAt: new Date(serialized.createdAt).toISOString(),
      updatedAt: new Date(serialized.updatedAt).toISOString(),
      agentSettings: serialized.agentSettings
        ? RepositoryService.mapAgentSettingsToDto(serialized.agentSettings)
        : null,
    };
  }

  private static mapAgentSettingsToDto(settings: any): AgentSettingsDto {
    const serialized = serializeBigInt(settings);
    return {
      id: serialized.id,
      repositoryId: serialized.repositoryId,
      isEnabled: serialized.isEnabled,
      scheduleCron: serialized.scheduleCron,
      timezone: serialized.timezone,
      branchPrefix: serialized.branchPrefix,
      allowedPaths: serialized.allowedPaths || [],
      excludedPaths: serialized.excludedPaths || [],
      maxDailyRuns: serialized.maxDailyRuns,
      requirePrReview: serialized.requirePrReview,
      createdAt: new Date(serialized.createdAt).toISOString(),
      updatedAt: new Date(serialized.updatedAt).toISOString(),
    };
  }
}

