import type { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service.js';
import { parseMultipartBuffer } from '../utils/multipart.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ProjectController {
  /**
   * Helper to extract file buffer and fields from either multipart or raw binary upload.
   */
  private static extractUploadPayload(req: Request): {
    fields: Record<string, string>;
    fileBuffer: Buffer | null;
    filename: string;
  } {
    const contentType = req.headers['content-type'] || '';

    // Case A: Multipart Form Data
    if (contentType.includes('multipart/form-data')) {
      const rawBody = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body : null);
      if (!rawBody) {
        return { fields: {}, fileBuffer: null, filename: '' };
      }

      const parsed = parseMultipartBuffer(rawBody, contentType);
      const file = parsed.files[0];
      return {
        fields: parsed.fields,
        fileBuffer: file ? file.buffer : null,
        filename: file ? file.filename : 'project.zip',
      };
    }

    // Case B: Raw Binary Upload (application/zip or application/octet-stream)
    const rawBody = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body : null);
    const query = req.query as Record<string, string>;
    const headers = req.headers as Record<string, string>;

    return {
      fields: {
        name: query.name || headers['x-project-name'] || '',
        description: query.description || headers['x-project-description'] || '',
        repositoryId: query.repositoryId || headers['x-repository-id'] || '',
        label: query.label || headers['x-version-label'] || '',
        changelog: query.changelog || headers['x-version-changelog'] || '',
      },
      fileBuffer: Buffer.isBuffer(rawBody) && rawBody.length > 0 ? rawBody : null,
      filename: query.filename || headers['x-filename'] || 'project.zip',
    };
  }

  /**
   * POST /api/projects/upload
   * Creates a new Project and extracts Version 1 from an uploaded ZIP archive.
   */
  static async uploadProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fields, fileBuffer, filename } = ProjectController.extractUploadPayload(req);

      if (!fileBuffer || fileBuffer.length === 0) {
        sendError(res, 'MISSING_FILE', 'ZIP archive file payload is required', 400);
        return;
      }

      const projectName = fields.name || filename.replace(/\.zip$/i, '') || 'Uploaded Project';
      const description = fields.description || undefined;
      const repositoryId = fields.repositoryId || undefined;

      const project = await ProjectService.createProjectFromZip(
        req.organizationId!,
        req.user!.id,
        {
          name: projectName,
          description,
          repositoryId,
        },
        fileBuffer
      );

      sendSuccess(res, project, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/projects/:id/versions
   * Uploads an updated ZIP archive as a new version.
   */
  static async uploadVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'MISSING_ID', 'Project ID is required', 400);
        return;
      }

      const { fields, fileBuffer } = ProjectController.extractUploadPayload(req);

      if (!fileBuffer || fileBuffer.length === 0) {
        sendError(res, 'MISSING_FILE', 'ZIP archive file payload is required', 400);
        return;
      }

      const label = fields.label || (req.query.label as string) || '';
      const changelog = fields.changelog || (req.query.changelog as string) || undefined;

      const version = await ProjectService.uploadNewVersion(
        req.organizationId!,
        req.user!.id,
        projectId,
        label,
        changelog,
        fileBuffer
      );

      sendSuccess(res, version, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects
   * Lists all projects in current organization.
   */
  static async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await ProjectService.listProjects(req.organizationId!);
      sendSuccess(res, projects);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id
   * Retrieves single project details.
   */
  static async getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'MISSING_ID', 'Project ID is required', 400);
        return;
      }

      const project = await ProjectService.getProject(req.organizationId!, projectId);
      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/projects/:id/versions
   * Lists all versions for a project.
   */
  static async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'MISSING_ID', 'Project ID is required', 400);
        return;
      }

      const versions = await ProjectService.listVersions(req.organizationId!, projectId);
      sendSuccess(res, versions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:id
   * Deletes a project and its workspace storage.
   */
  static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.id;
      if (!projectId) {
        sendError(res, 'MISSING_ID', 'Project ID is required', 400);
        return;
      }

      await ProjectService.deleteProject(req.organizationId!, req.user!.id, projectId);
      sendSuccess(res, { message: 'Project and all version workspaces deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
