import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:runId', requireAuth, AnalysisController.getRunDetails);

export default router;
