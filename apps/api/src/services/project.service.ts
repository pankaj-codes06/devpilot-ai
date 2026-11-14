import { prisma, serializeBigInt, ProjectSourceType, VersionStatus } from '@devpilot/database';
import type {
  ProjectDto,
  ProjectVersionDto,
  CreateProjectInput,
} from '@devpilot/shared';
import { AppError } from '../utils/response.js';
import { AuditService } from './audit.service.js';
import { projectStorageService } from './project-storage.service.js';
import { SafeZipService } from './safe-zip.service.js';

export class ProjectService {
  /**
   * Creates a new Project from an uploaded ZIP archive and extracts Version 1.
   */
  static async createProjectFromZip(
    organizationId: string,
    userId: string,
    input: CreateProjectInput,
    zipBuffer: Buffer
  ): Promise<ProjectDto> {
    // 1. Validate ZIP magic bytes
    if (!SafeZipService.hasValidMagicBytes(zipBuffer)) {
      throw new AppError(
        'Invalid file format. Uploaded file is not a valid ZIP archive.',
        400,
        'INVALID_ARCHIVE'
      );
    }

    if (zipBuffer.length > SafeZipService.MAX_UPLOAD_SIZE) {
      throw new AppError(
        `Archive file size (${Math.round(zipBuffer.length / 1024 / 1024)}MB) exceeds maximum limit of ${SafeZipService.MAX_UPLOAD_SIZE / 1024 / 1024}MB.`,
        400,
        'PAYLOAD_TOO_LARGE'
      );
    }

    // 2. Generate unique project slug
    const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40);
    const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    // 3. Persist Project shell in database
    const project = await prisma.project.create({
      data: {
        organizationId,
        name: input.name,
        slug,
        description: input.description,
        sourceType: input.repositoryId ? ProjectSourceType.HYBRID : ProjectSourceType.ZIP,
        repositoryId: input.repositoryId,
        storagePath: '',
      },
    });

    try {
      // 4. Store archive and extract to version 1 isolated workspace
      const stored = await projectStorageService.storeAndExtractVersion(project.id, 1, zipBuffer);

      // 5. Create ProjectVersion in database
      const version = await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          versionNumber: 1,
          label: 'v1.0.0 (Initial Upload)',
          status: VersionStatus.READY,
          originalZipPath: stored.originalZipPath,
          extractedPath: stored.extractedPath,
          checksum: stored.checksum,
          fileCount: stored.fileCount,
          totalBytes: BigInt(stored.totalBytes),
          changelog: 'Initial project upload from ZIP archive.',
        },
      });

      // 6. Update Project with activeVersionId and storagePath
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          activeVersionId: version.id,
          storagePath: projectStorageService.getProjectDir(project.id),
        },
        include: {
          versions: true,
          teams: true,
          modules: true,
        },
      });

      // 7. Audit log
      await AuditService.record({
        organizationId,
        userId,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: project.id,
        metadata: {
          name: project.name,
          versionNumber: 1,
          fileCount: stored.fileCount,
          totalBytes: stored.totalBytes,
        },
      });

      return this.mapProjectToDto(updatedProject, version);
    } catch (error) {
      // Cleanup on failure
      await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
      await projectStorageService.deleteProjectStorage(project.id).catch(() => {});
      throw error;
    }
  }

  /**
   * Uploads an updated ZIP version to an existing Project.
   */
  static async uploadNewVersion(
    organizationId: string,
    userId: string,
    projectId: string,
    label: string,
    changelog: string | undefined,
    zipBuffer: Buffer
  ): Promise<ProjectVersionDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    if (!SafeZipService.hasValidMagicBytes(zipBuffer)) {
      throw new AppError('Invalid file format. Only valid ZIP archives are permitted.', 400, 'INVALID_ARCHIVE');
    }

    const nextVersionNumber = (project.versions[0]?.versionNumber ?? 0) + 1;
    const versionLabel = label || `v${nextVersionNumber}.0.0`;

    const stored = await projectStorageService.storeAndExtractVersion(
      project.id,
      nextVersionNumber,
      zipBuffer
    );

    const version = await prisma.projectVersion.create({
      data: {
        projectId: project.id,
        versionNumber: nextVersionNumber,
        label: versionLabel,
        status: VersionStatus.READY,
        originalZipPath: stored.originalZipPath,
        extractedPath: stored.extractedPath,
        checksum: stored.checksum,
        fileCount: stored.fileCount,
        totalBytes: BigInt(stored.totalBytes),
        changelog: changelog || `Uploaded version ${versionLabel}`,
      },
    });

    // Update Project activeVersionId
    await prisma.project.update({
      where: { id: project.id },
      data: { activeVersionId: version.id },
    });

    await AuditService.record({
      organizationId,
      userId,
      action: 'PROJECT_VERSION_UPLOADED',
      entityType: 'PROJECT_VERSION',
      entityId: version.id,
      metadata: {
        projectId: project.id,
        versionNumber: nextVersionNumber,
        fileCount: stored.fileCount,
        totalBytes: stored.totalBytes,
      },
    });

    return this.mapVersionToDto(version);
  }

  /**
   * Lists projects for an organization.
   */
  static async listProjects(organizationId: string): Promise<ProjectDto[]> {
    const projects = await prisma.project.findMany({
      where: { organizationId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        _count: {
          select: {
            versions: true,
            teams: true,
            tasks: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((p) => {
      const activeVer = p.versions[0] ? this.mapVersionToDto(p.versions[0]) : null;
      return {
        id: p.id,
        organizationId: p.organizationId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        sourceType: p.sourceType,
        repositoryId: p.repositoryId,
        activeVersionId: p.activeVersionId,
        storagePath: p.storagePath,
        activeVersion: activeVer,
        versionsCount: p._count.versions,
        teamsCount: p._count.teams,
        tasksCount: p._count.tasks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves single project details.
   */
  static async getProject(organizationId: string, projectId: string): Promise<ProjectDto> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        teams: { include: { _count: { select: { modules: true, tasks: true } } } },
        modules: true,
        _count: {
          select: {
            versions: true,
            teams: true,
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const activeVersion = project.versions.find((v) => v.id === project.activeVersionId) || project.versions[0];

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      sourceType: project.sourceType,
      repositoryId: project.repositoryId,
      activeVersionId: project.activeVersionId,
      storagePath: project.storagePath,
      activeVersion: activeVersion ? this.mapVersionToDto(activeVersion) : null,
      versionsCount: project._count.versions,
      teamsCount: project._count.teams,
      tasksCount: project._count.tasks,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  /**
   * Lists versions for a specific project.
   */
  static async listVersions(organizationId: string, projectId: string): Promise<ProjectVersionDto[]> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    const versions = await prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map(this.mapVersionToDto);
  }

  /**
   * Deletes a project and all associated files on disk.
   */
  static async deleteProject(organizationId: string, userId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new AppError('Project not found in current organization', 404, 'NOT_FOUND');
    }

    await prisma.project.delete({ where: { id: projectId } });
    await projectStorageService.deleteProjectStorage(projectId);

    await AuditService.record({
      organizationId,
      userId,
      action: 'PROJECT_DELETED',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { name: project.name },
    });
  }

  private static mapProjectToDto(project: any, activeVersion?: any): ProjectDto {
    const s = serializeBigInt(project);
    return {
      id: s.id,
      organizationId: s.organizationId,
      name: s.name,
      slug: s.slug,
      description: s.description,
      sourceType: s.sourceType,
      repositoryId: s.repositoryId,
      activeVersionId: s.activeVersionId,
      storagePath: s.storagePath,
      activeVersion: activeVersion ? this.mapVersionToDto(activeVersion) : null,
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    };
  }

  private static mapVersionToDto(version: any): ProjectVersionDto {
    const s = serializeBigInt(version);
    return {
      id: s.id,
      projectId: s.projectId,
      versionNumber: s.versionNumber,
      label: s.label,
      status: s.status,
      originalZipPath: s.originalZipPath,
      extractedPath: s.extractedPath,
      checksum: s.checksum,
      fileCount: s.fileCount,
      totalBytes: (s.totalBytes ?? 0).toString(),
      metadata: s.metadata,
      changelog: s.changelog,
      errorLog: s.errorLog,
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    };
  }
}
