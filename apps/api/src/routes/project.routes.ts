import express, { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { ProjectAnalysisController } from '../controllers/project-analysis.controller.js';
import { TeamController } from '../controllers/team.controller.js';
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

// Project Intelligence & Tasks Backlog
router.post('/:id/analyze', requireAuth, ProjectAnalysisController.analyzeProject);
router.get('/:id/analysis', requireAuth, ProjectAnalysisController.getProjectAnalysis);
router.get('/:id/tasks', requireAuth, ProjectAnalysisController.getProjectTasks);

// Team Management
router.get('/:id/teams', requireAuth, TeamController.listTeams);
router.post('/:id/teams', requireAuth, TeamController.createTeam);
router.get('/:id/teams/:teamId', requireAuth, TeamController.getTeam);
router.put('/:id/teams/:teamId', requireAuth, TeamController.updateTeam);
router.delete('/:id/teams/:teamId', requireAuth, requireRole('ADMIN'), TeamController.deleteTeam);

// Module Ownership & Mapping
router.get('/:id/modules', requireAuth, TeamController.listModules);
router.post('/:id/modules', requireAuth, TeamController.createModule);
router.put('/:id/modules/:moduleId', requireAuth, TeamController.updateModule);
router.delete('/:id/modules/:moduleId', requireAuth, requireRole('ADMIN'), TeamController.deleteModule);
router.post('/:id/modules/suggest', requireAuth, TeamController.suggestTeamsAndModules);

// Administration
router.delete('/:id', requireAuth, requireRole('ADMIN'), ProjectController.deleteProject);

export default router;
