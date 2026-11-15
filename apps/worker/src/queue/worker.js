import { Worker } from 'bullmq';
import { REPOSITORY_ANALYSIS_QUEUE } from '@devpilot/shared';
import { getRedisOptions } from './redis.js';
import { env } from '../config/env.js';
import { RepositoryAnalysisPipeline } from '../agents/pipeline.js';

export class AnalysisWorker {
  constructor() {
    this.worker = null;
  }

  start() {
    if (this.worker) {
      console.warn('[AnalysisWorker] Worker is already running.');
      return;
    }

    console.log(
      `[AnalysisWorker] Initializing repository-analysis worker (concurrency: ${env.WORKER_CONCURRENCY})...`
    );

    this.worker = new Worker(
      REPOSITORY_ANALYSIS_QUEUE,
      async (job) => {
        console.log(
          `[AnalysisWorker] Processing job ${job.id} for repo ${job.data.repositoryId} (run: ${job.data.runId})`
        );
        await RepositoryAnalysisPipeline.run(job.data);
      },
      {
        connection: getRedisOptions(),
        concurrency: env.WORKER_CONCURRENCY,
        limiter: {
          max: 10,
          duration: 60000, // 10 jobs per minute max per worker
        },
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[AnalysisWorker] Job ${job.id} completed successfully for run ${job.data.runId}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(
        `[AnalysisWorker] Job ${job?.id} failed for run ${job?.data.runId}. Attempts: ${job?.attemptsMade}/${job?.opts.attempts}. Error: ${err.message}`
      );
    });

    this.worker.on('error', (err) => {
      console.error('[AnalysisWorker] Worker connection error:', err);
    });

    console.log('[AnalysisWorker] Worker process is active and listening for jobs.');
  }

  async close() {
    if (this.worker) {
      console.log('[AnalysisWorker] Closing worker process gracefully...');
      await this.worker.close();
      this.worker = null;
      console.log('[AnalysisWorker] Worker process terminated.');
    }
  }
}

export const analysisWorker = new AnalysisWorker();
