import { prisma } from '@devpilot/database';
import {
  TeamSuggester,
  RepositoryAnalyzer,
} from '@devpilot/intelligence';
import { AppError } from '../utils/response.js';
import { AuditService } from './audit.service.js';

export class TeamMappingService {
  /**
   * Lists all teams for a project with module and task counts.
   * @param {string} organizationId
   * @param {string} projectId
   */
  static async listTeams(organizationId, projectId) {
    await this.assertProjectAccess(organizationId, projectId);

    const teams = await prisma.team.findMany({
      where: { projectId, organizationId },
      include: {
        _count: {
          select: {
            modules: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      projectId: t.projectId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      color: t.color || '#3b82f6',
      leadName: t.leadName,
      leadEmail: t.leadEmail,
      modulesCount: t._count.modules,
      tasksCount: t._count.tasks,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves single team details.
   * @param {string} organizationId
   * @param {string} projectId
   * @param {string} teamId
   */
  static async getTeam(
    organizationId,
    projectId,
    teamId
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    const team = await prisma.team.findFirst({
      where: { id: teamId, projectId, organizationId },
      include: {
        _count: {
          select: {
            modules: true,
            tasks: true,
          },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found in project', 404, 'NOT_FOUND');
    }

    return {
      id: team.id,
      organizationId: team.organizationId,
      projectId: team.projectId,
      name: team.name,
      slug: team.slug,
      description: team.description,
      color: team.color || '#3b82f6',
      leadName: team.leadName,
      leadEmail: team.leadEmail,
      modulesCount: team._count.modules,
      tasksCount: team._count.tasks,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  /**
   * Creates a new Team within a Project.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {any} input
   */
  static async createTeam(
    organizationId,
    userId,
    projectId,
    input
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    // Generate unique slug within project
    const baseSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 45);

    let slug = baseSlug || 'team';
    const existingSlug = await prisma.team.findFirst({
      where: { projectId, slug },
    });

    if (existingSlug) {
      slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const team = await prisma.team.create({
      data: {
        organizationId,
        projectId,
        name: input.name,
        slug,
        description: input.description,
        color: input.color || '#3b82f6',
        leadName: input.leadName,
        leadEmail: input.leadEmail || null,
      },
      include: {
        _count: {
          select: {
            modules: true,
            tasks: true,
          },
        },
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'TEAM_CREATED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: {
        projectId,
        teamName: team.name,
        slug: team.slug,
      },
    });

    return {
      id: team.id,
      organizationId: team.organizationId,
      projectId: team.projectId,
      name: team.name,
      slug: team.slug,
      description: team.description,
      color: team.color || '#3b82f6',
      leadName: team.leadName,
      leadEmail: team.leadEmail,
      modulesCount: team._count.modules,
      tasksCount: team._count.tasks,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing Team.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {string} teamId
   * @param {any} input
   */
  static async updateTeam(
    organizationId,
    userId,
    projectId,
    teamId,
    input
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    const existingTeam = await prisma.team.findFirst({
      where: { id: teamId, projectId, organizationId },
    });

    if (!existingTeam) {
      throw new AppError('Team not found in project', 404, 'NOT_FOUND');
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: input.name ?? existingTeam.name,
        description: input.description !== undefined ? input.description : existingTeam.description,
        color: input.color ?? existingTeam.color,
        leadName: input.leadName !== undefined ? input.leadName : existingTeam.leadName,
        leadEmail: input.leadEmail !== undefined ? (input.leadEmail || null) : existingTeam.leadEmail,
      },
      include: {
        _count: {
          select: {
            modules: true,
            tasks: true,
          },
        },
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'TEAM_UPDATED',
      entityType: 'TEAM',
      entityId: team.id,
      metadata: {
        projectId,
        teamName: team.name,
        changes: input,
      },
    });

    return {
      id: team.id,
      organizationId: team.organizationId,
      projectId: team.projectId,
      name: team.name,
      slug: team.slug,
      description: team.description,
      color: team.color || '#3b82f6',
      leadName: team.leadName,
      leadEmail: team.leadEmail,
      modulesCount: team._count.modules,
      tasksCount: team._count.tasks,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a team from a project.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {string} teamId
   */
  static async deleteTeam(
    organizationId,
    userId,
    projectId,
    teamId
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    const existingTeam = await prisma.team.findFirst({
      where: { id: teamId, projectId, organizationId },
    });

    if (!existingTeam) {
      throw new AppError('Team not found in project', 404, 'NOT_FOUND');
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'TEAM_DELETED',
      entityType: 'TEAM',
      entityId: teamId,
      metadata: {
        projectId,
        teamName: existingTeam.name,
      },
    });
  }

  /**
   * Lists all modules for a project.
   * @param {string} organizationId
   * @param {string} projectId
   */
  static async listModules(organizationId, projectId) {
    await this.assertProjectAccess(organizationId, projectId);

    const modules = await prisma.projectModule.findMany({
      where: { projectId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return modules.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      teamId: m.teamId,
      name: m.name,
      description: m.description,
      pathPattern: m.pathPattern,
      isShared: m.isShared,
      suggestedBy: m.suggestedBy || 'MANUAL',
      teamName: m.team?.name || null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  /**
   * Creates a new module with conflict validation.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {any} input
   */
  static async createModule(
    organizationId,
    userId,
    projectId,
    input
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    // If teamId supplied, verify it belongs to this project
    if (input.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: input.teamId, projectId },
      });
      if (!team) {
        throw new AppError('Assigned team not found in project', 400, 'INVALID_TEAM');
      }
    }

    // Check for conflicting team assignments
    const existingModules = await prisma.projectModule.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        pathPattern: true,
        teamId: true,
        isShared: true,
      },
    });

    const candidate = {
      name: input.name,
      pathPattern: input.pathPattern,
      teamId: input.teamId ?? null,
      isShared: Boolean(input.isShared),
    };

    const conflict = TeamSuggester.detectConflict(existingModules, candidate);
    if (conflict.hasConflict) {
      throw new AppError(conflict.reason || 'Module pattern conflicts with another team', 409, 'MODULE_CONFLICT');
    }

    const moduleRecord = await prisma.projectModule.create({
      data: {
        projectId,
        teamId: input.teamId || null,
        name: input.name,
        description: input.description,
        pathPattern: input.pathPattern,
        isShared: Boolean(input.isShared),
        suggestedBy: 'MANUAL',
      },
      include: {
        team: true,
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'MODULE_MAPPED',
      entityType: 'PROJECT_MODULE',
      entityId: moduleRecord.id,
      metadata: {
        projectId,
        name: moduleRecord.name,
        pathPattern: moduleRecord.pathPattern,
        teamId: moduleRecord.teamId,
        isShared: moduleRecord.isShared,
      },
    });

    return {
      id: moduleRecord.id,
      projectId: moduleRecord.projectId,
      teamId: moduleRecord.teamId,
      name: moduleRecord.name,
      description: moduleRecord.description,
      pathPattern: moduleRecord.pathPattern,
      isShared: moduleRecord.isShared,
      suggestedBy: moduleRecord.suggestedBy || 'MANUAL',
      teamName: moduleRecord.team?.name || null,
      createdAt: moduleRecord.createdAt.toISOString(),
      updatedAt: moduleRecord.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing module with conflict validation.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {string} moduleId
   * @param {any} input
   */
  static async updateModule(
    organizationId,
    userId,
    projectId,
    moduleId,
    input
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    const existingModule = await prisma.projectModule.findFirst({
      where: { id: moduleId, projectId },
    });

    if (!existingModule) {
      throw new AppError('Module not found in project', 404, 'NOT_FOUND');
    }

    const nextTeamId = input.teamId !== undefined ? input.teamId : existingModule.teamId;
    if (nextTeamId) {
      const team = await prisma.team.findFirst({
        where: { id: nextTeamId, projectId },
      });
      if (!team) {
        throw new AppError('Assigned team not found in project', 400, 'INVALID_TEAM');
      }
    }

    const nextPattern = input.pathPattern ?? existingModule.pathPattern;
    const nextIsShared = input.isShared !== undefined ? input.isShared : existingModule.isShared;

    // Check for conflicts
    const allModules = await prisma.projectModule.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        pathPattern: true,
        teamId: true,
        isShared: true,
      },
    });

    const candidate = {
      id: existingModule.id,
      name: input.name ?? existingModule.name,
      pathPattern: nextPattern,
      teamId: nextTeamId,
      isShared: nextIsShared,
    };

    const conflict = TeamSuggester.detectConflict(allModules, candidate);
    if (conflict.hasConflict) {
      throw new AppError(conflict.reason || 'Updated module pattern conflicts with another team', 409, 'MODULE_CONFLICT');
    }

    const updated = await prisma.projectModule.update({
      where: { id: moduleId },
      data: {
        name: input.name ?? existingModule.name,
        pathPattern: nextPattern,
        teamId: nextTeamId,
        description: input.description !== undefined ? input.description : existingModule.description,
        isShared: nextIsShared,
      },
      include: {
        team: true,
      },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'MODULE_UPDATED',
      entityType: 'PROJECT_MODULE',
      entityId: updated.id,
      metadata: {
        projectId,
        name: updated.name,
        changes: input,
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      teamId: updated.teamId,
      name: updated.name,
      description: updated.description,
      pathPattern: updated.pathPattern,
      isShared: updated.isShared,
      suggestedBy: updated.suggestedBy || 'MANUAL',
      teamName: updated.team?.name || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a module.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   * @param {string} moduleId
   */
  static async deleteModule(
    organizationId,
    userId,
    projectId,
    moduleId
  ) {
    await this.assertProjectAccess(organizationId, projectId);

    const existingModule = await prisma.projectModule.findFirst({
      where: { id: moduleId, projectId },
    });

    if (!existingModule) {
      throw new AppError('Module not found in project', 404, 'NOT_FOUND');
    }

    await prisma.projectModule.delete({
      where: { id: moduleId },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'MODULE_DELETED',
      entityType: 'PROJECT_MODULE',
      entityId: moduleId,
      metadata: {
        projectId,
        name: existingModule.name,
      },
    });
  }

  /**
   * Automatically analyzes extracted project workspace files and suggests
   * teams and modules, persisting them in PostgreSQL.
   * @param {string} organizationId
   * @param {string} userId
   * @param {string} projectId
   */
  static async suggestTeamsAndModules(
    organizationId,
    userId,
    projectId
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const version = project.versions[0];
    if (!version || !version.extractedPath) {
      throw new AppError('No extracted project version available to analyze', 400, 'NO_WORKSPACE');
    }

    // 1. Run deterministic static analysis on extracted directory
    const analysis = await RepositoryAnalyzer.analyze(version.extractedPath);

    // 2. Generate suggestions
    const suggestion = TeamSuggester.suggest(analysis);

    // 3. Persist teams & modules transactionally
    await prisma.$transaction(async (tx) => {
      const teamSlugToIdMap = new Map();

      // Create or locate teams
      for (const t of suggestion.teams) {
        let team = await tx.team.findFirst({
          where: { projectId: project.id, slug: t.slug },
        });

        if (!team) {
          team = await tx.team.create({
            data: {
              organizationId,
              projectId: project.id,
              name: t.name,
              slug: t.slug,
              description: t.description,
              color: t.color,
            },
          });
        }
        teamSlugToIdMap.set(t.slug, team.id);
      }

      // Create or update modules
      for (const m of suggestion.modules) {
        const teamId = m.teamSlug ? teamSlugToIdMap.get(m.teamSlug) || null : null;

        const existingMod = await tx.projectModule.findFirst({
          where: {
            projectId: project.id,
            pathPattern: m.pathPattern,
          },
        });

        if (!existingMod) {
          await tx.projectModule.create({
            data: {
              projectId: project.id,
              teamId,
              name: m.name,
              description: m.description,
              pathPattern: m.pathPattern,
              isShared: m.isShared,
              suggestedBy: m.suggestedBy,
            },
          });
        }
      }

      // Reconcile tasks: map unassigned tasks to newly mapped modules & teams
      const modules = await tx.projectModule.findMany({
        where: { projectId: project.id },
      });

      const tasks = await tx.developmentTask.findMany({
        where: { projectId: project.id, moduleId: null },
      });

      for (const task of tasks) {
        for (const mod of modules) {
          const matches = task.relevantFiles.some((f) => {
            const cleanPattern = mod.pathPattern.replace(/\*.*$/, '');
            return f.startsWith(cleanPattern) || (mod.pathPattern.includes('test') && f.includes('.test.'));
          });

          if (matches) {
            await tx.developmentTask.update({
              where: { id: task.id },
              data: {
                moduleId: mod.id,
                teamId: mod.teamId,
              },
            });
            break;
          }
        }
      }
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'TEAMS_AND_MODULES_SUGGESTED',
      entityType: 'PROJECT',
      entityId: project.id,
      metadata: {
        suggestedTeamsCount: suggestion.teams.length,
        suggestedModulesCount: suggestion.modules.length,
      },
    });

    const teams = await this.listTeams(organizationId, projectId);
    const modules = await this.listModules(organizationId, projectId);

    return { teams, modules };
  }

  static async assertProjectAccess(organizationId, projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }
  }
}
