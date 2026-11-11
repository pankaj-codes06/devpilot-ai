import type { Request, Response, NextFunction } from 'express';
import { ZodError, type AnyZodObject } from 'zod';
import { sendError } from '../utils/response.js';

export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export function validateQuery(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

