import { PrismaClient } from '@prisma/client';

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}

/**
 * Utility to convert BigInt fields to strings for safe JSON serialization.
 * @param {any} obj - Object, array, or primitive potentially containing BigInt values
 * @returns {any} Serialized object with BigInts converted to strings
 */
export function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export * from '@prisma/client';
