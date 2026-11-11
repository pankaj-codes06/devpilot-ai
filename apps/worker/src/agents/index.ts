/**
 * DevPilot Autonomous Agent — Agent Core Engine Orchestrator
 */

import { PlannerService } from '../planner/index.js';
import { CoderService } from '../coder/index.js';
import { ReviewerService } from '../reviewer/index.js';
import { ExecutorService } from '../executor/index.js';
import { SchedulerService } from '../scheduler/index.js';

export class AutonomousAgentPipeline {
  readonly planner = new PlannerService();
  readonly coder = new CoderService();
  readonly reviewer = new ReviewerService();
  readonly executor = new ExecutorService();
  readonly scheduler = new SchedulerService();

  constructor() {
    console.log('[DevPilot Worker] Agent pipeline initialized in standby mode (Phase 1)');
  }
}

