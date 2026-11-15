import { sendError } from '../utils/response.js';

/**
 * Global Express error handling middleware.
 * @param {Error & { status?: number, statusCode?: number, code?: string }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

  // Log error message safely without logging request headers (which may contain auth tokens)
  console.error(`[API Error] ${req.method} ${req.path} -> ${err.message}`, {
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'An error occurred';

  sendError(res, errorCode, message, statusCode);
}
