import { Router } from 'express';
import { updateAgentSettingsSchema } from '@devpilot/shared';
import { RepositoryController } from '../controllers/repository.controller.js';
import { AnalysisController } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/organization.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', requireAuth, RepositoryController.list);
router.get('/dashboard/stats', requireAuth, RepositoryController.getStats);
router.get('/:id', requireAuth, RepositoryController.getById);

// Phase 2A Analysis Endpoints
router.post(
  '/:id/analyze',
  requireAuth,
  requireRole('MEMBER'),
  AnalysisController.triggerAnalysis
);
router.get('/:id/analysis', requireAuth, AnalysisController.getAnalysis);
router.get('/:id/tasks', requireAuth, AnalysisController.getTasks);

router.patch(
  '/:id/settings',
  requireAuth,
  requireRole('ADMIN'),
  validateBody(updateAgentSettingsSchema),
  RepositoryController.updateSettings
);

export default router;
