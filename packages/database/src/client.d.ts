import { PrismaClient } from '@prisma/client';

declare global {
  var __prismaClient: PrismaClient | undefined;
}

export declare const prisma: PrismaClient;

/**
 * Utility to convert BigInt fields to strings for safe JSON serialization.
 */
export declare function serializeBigInt<T>(obj: T): T;

export * from '@prisma/client';
