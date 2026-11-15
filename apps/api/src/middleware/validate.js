import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

/**
 * Middleware factory to validate req.body against a Zod schema.
 * @param {import('zod').AnyZodObject} schema
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(
          res,
          'VALIDATION_ERROR',
          'Request validation failed',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }
      next(error);
    }
  };
}

/**
 * Middleware factory to validate req.query against a Zod schema.
 * @param {import('zod').AnyZodObject} schema
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }
      next(error);
    }
  };
}
