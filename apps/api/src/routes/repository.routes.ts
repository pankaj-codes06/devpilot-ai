import { Router } from 'express';
import { updateAgentSettingsSchema } from '@devpilot/shared';
import { RepositoryController } from '../controllers/repository.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/organization.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.get('/', requireAuth, RepositoryController.list);
router.get('/dashboard/stats', requireAuth, RepositoryController.getStats);
router.get('/:id', requireAuth, RepositoryController.getById);
router.patch(
  '/:id/settings',
  requireAuth,
  requireRole('ADMIN'),
  validateBody(updateAgentSettingsSchema),
  RepositoryController.updateSettings
);

export default router;

