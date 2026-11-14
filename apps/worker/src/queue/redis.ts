import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';

export function getRedisOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
  };
}

export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, getRedisOptions());
}

export const redisConnection = createRedisConnection();
