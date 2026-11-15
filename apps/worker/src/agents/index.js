/**
 * DevPilot Autonomous Agent — Agent Core Engine Orchestrator
 */

import { PlannerService } from '../planner/index.js';
import { CoderService } from '../coder/index.js';
import { ReviewerService } from '../reviewer/index.js';
import { ExecutorService } from '../executor/index.js';
import { SchedulerService } from '../scheduler/index.js';

export class AutonomousAgentPipeline {
  constructor() {
    this.planner = new PlannerService();
    this.coder = new CoderService();
    this.reviewer = new ReviewerService();
    this.executor = new ExecutorService();
    this.scheduler = new SchedulerService();

    console.log('[DevPilot Worker] Agent pipeline initialized in standby mode (Phase 1)');
  }
}
