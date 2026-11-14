import { Router } from 'express';
import { GitHubController } from '../controllers/github.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/organization.js';

const router = Router();

// Installation flow
router.get('/install', GitHubController.install);
router.get('/callback', GitHubController.callback);
router.post('/webhook', GitHubController.webhook);

// Authenticated repository management
router.get('/repositories', requireAuth, GitHubController.listRepositories);
router.post(
  '/repositories/sync',
  requireAuth,
  requireRole('ADMIN'),
  GitHubController.syncRepositories
);
router.delete(
  '/repositories/:id',
  requireAuth,
  requireRole('ADMIN'),
  GitHubController.disconnectRepository
);

export default router;

