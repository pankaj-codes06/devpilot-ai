import express, { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/organization.js';

const router = Router();

// Middleware to capture binary and multipart archives up to 100MB
const rawArchiveParser = express.raw({
  type: [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'multipart/form-data',
  ],
  limit: '100mb',
});

// Project upload & versions
router.post('/upload', requireAuth, rawArchiveParser, ProjectController.uploadProject);
router.post('/:id/versions', requireAuth, rawArchiveParser, ProjectController.uploadVersion);

// Querying projects & versions
router.get('/', requireAuth, ProjectController.listProjects);
router.get('/:id', requireAuth, ProjectController.getProject);
router.get('/:id/versions', requireAuth, ProjectController.listVersions);

// Administration
router.delete('/:id', requireAuth, requireRole('ADMIN'), ProjectController.deleteProject);

export default router;
