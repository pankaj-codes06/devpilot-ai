import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export function getRedisOptions() {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
  };
}

export function createRedisConnection() {
  return new Redis(env.REDIS_URL, getRedisOptions());
}

export const redisConnection = createRedisConnection();
