import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Lightweight in-memory rate limiter to protect endpoints from brute force and DoS.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically cleanup expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of ipStore.entries()) {
      if (now > value.resetTime) {
        ipStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const record = ipStore.get(ip);

    if (!record || now > record.resetTime) {
      ipStore.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });

      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', options.max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + options.windowMs) / 1000));
      return next();
    }

    if (record.count >= options.max) {
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));

      sendError(
        res,
        'TOO_MANY_REQUESTS',
        options.message || 'Too many requests. Please try again later.',
        429
      );
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', options.max - record.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    next();
  };
}

export const standardRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'API rate limit exceeded. Please try again later.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

