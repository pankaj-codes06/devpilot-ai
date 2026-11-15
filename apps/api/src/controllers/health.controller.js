import { prisma } from '@devpilot/database';
import { sendSuccess, sendError } from '../utils/response.js';

export class HealthController {
  /**
   * @param {import('express').Request} _req
   * @param {import('express').Response} res
   */
  static async check(_req, res) {
    try {
      // Test database connectivity
      await prisma.$queryRaw`SELECT 1`;

      sendSuccess(res, {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    } catch (error) {
      sendError(
        res,
        'SERVICE_UNAVAILABLE',
        'Database connection failed',
        503,
        error instanceof Error ? error.message : undefined
      );
    }
  }
}
