import { analysisWorker } from './queue/worker.js';
import { redisConnection } from './queue/redis.js';
import { prisma } from '@devpilot/database';

console.log('[DevPilot Worker] Starting background worker process (Phase 2A)...');

analysisWorker.start();

const shutdown = async (signal) => {
  console.log(`[DevPilot Worker] Received ${signal}. Shutting down worker gracefully...`);
  try {
    await analysisWorker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    console.log('[DevPilot Worker] Clean shutdown complete.');
    process.exit(0);
  } catch (err) {
    console.error('[DevPilot Worker] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export * from './planner/analyzer.js';
export * from './planner/intelligence.js';
export * from './executor/cloner.js';
export * from './agents/pipeline.js';
