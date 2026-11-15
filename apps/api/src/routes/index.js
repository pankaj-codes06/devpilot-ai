import { Router } from 'express';
import authRoutes from './auth.routes.js';
import githubRoutes from './github.routes.js';
import repositoryRoutes from './repository.routes.js';
import agentRunRoutes from './agent-run.routes.js';
import projectRoutes from './project.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/github', githubRoutes);
router.use('/repositories', repositoryRoutes);
router.use('/agent-runs', agentRunRoutes);
router.use('/projects', projectRoutes);

export default router;
