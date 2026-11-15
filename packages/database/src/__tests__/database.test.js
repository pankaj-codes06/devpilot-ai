import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import {
  prisma,
  serializeBigInt,
  TeamRole,
  TriggerType,
  ExecutionStatus,
  TaskStatus,
  ProjectSourceType,
  VersionStatus,
} from '../index.js';

describe('@devpilot/database — JavaScript & Prisma Verification', () => {
  beforeAll(async () => {
    // Verify connection to PostgreSQL
    await prisma.$connect();
  });

  afterAll(async () => {
    // Graceful disconnect
    await prisma.$disconnect();
  });

  describe('Prisma Client & Database Connectivity', () => {
    it('initializes the PrismaClient instance with proper query methods', () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
      expect(typeof prisma.$queryRaw).toBe('function');
      expect(typeof prisma.$transaction).toBe('function');
    });

    it('executes a live SQL query to verify PostgreSQL connectivity', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(Number(result[0].connected)).toBe(1);
    });

    it('executes database transactions cleanly', async () => {
      const [countResult, checkResult] = await prisma.$transaction([
        prisma.$queryRaw`SELECT 1 as count`,
        prisma.$queryRaw`SELECT 'devpilot' as project`,
      ]);

      expect(Number(countResult[0].count)).toBe(1);
      expect(checkResult[0].project).toBe('devpilot');
    });

    it('exposes all core relational models on the prisma client', () => {
      expect(prisma.user).toBeDefined();
      expect(prisma.organization).toBeDefined();
      expect(prisma.repository).toBeDefined();
      expect(prisma.agentRun).toBeDefined();
      expect(prisma.agentTask).toBeDefined();
      expect(prisma.auditLog).toBeDefined();
      expect(prisma.project).toBeDefined();
      expect(prisma.projectVersion).toBeDefined();
      expect(prisma.team).toBeDefined();
      expect(prisma.projectModule).toBeDefined();
      expect(prisma.developmentTask).toBeDefined();
    });
  });

  describe('serializeBigInt Utility', () => {
    it('converts BigInt primitives inside objects to strings', () => {
      const input = {
        id: 'usr_123',
        githubId: 987654321012345678n,
        username: 'octocat',
      };
      const output = serializeBigInt(input);

      expect(output.githubId).toBe('987654321012345678');
      expect(typeof output.githubId).toBe('string');
      expect(output.username).toBe('octocat');
    });

    it('serializes arrays containing BigInt values', () => {
      const input = [10n, 20n, 30n];
      const output = serializeBigInt(input);

      expect(output).toEqual(['10', '20', '30']);
    });

    it('handles deeply nested structures without data loss', () => {
      const nested = {
        level1: {
          level2: {
            bigValue: 12345678901234567890n,
            stringValue: 'test',
            boolValue: true,
            nullValue: null,
            list: [1n, 2n, { item: 3n }],
          },
        },
      };

      const serialized = serializeBigInt(nested);
      expect(serialized.level1.level2.bigValue).toBe('12345678901234567890');
      expect(serialized.level1.level2.stringValue).toBe('test');
      expect(serialized.level1.level2.boolValue).toBe(true);
      expect(serialized.level1.level2.nullValue).toBeNull();
      expect(serialized.level1.level2.list).toEqual(['1', '2', { item: '3' }]);
    });
  });

  describe('Exported Enums', () => {
    it('exports TeamRole enum values', () => {
      expect(TeamRole.OWNER).toBe('OWNER');
      expect(TeamRole.ADMIN).toBe('ADMIN');
      expect(TeamRole.MEMBER).toBe('MEMBER');
      expect(TeamRole.VIEWER).toBe('VIEWER');
    });

    it('exports TriggerType enum values', () => {
      expect(TriggerType.SCHEDULED).toBe('SCHEDULED');
      expect(TriggerType.MANUAL).toBe('MANUAL');
      expect(TriggerType.WEBHOOK).toBe('WEBHOOK');
    });

    it('exports ExecutionStatus and TaskStatus enum values', () => {
      expect(ExecutionStatus.QUEUED).toBe('QUEUED');
      expect(ExecutionStatus.RUNNING).toBe('RUNNING');
      expect(ExecutionStatus.SUCCESS).toBe('SUCCESS');

      expect(TaskStatus.PENDING).toBe('PENDING');
      expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(TaskStatus.COMPLETED).toBe('COMPLETED');
    });

    it('exports ProjectSourceType and VersionStatus enum values', () => {
      expect(ProjectSourceType.ZIP).toBe('ZIP');
      expect(ProjectSourceType.GITHUB).toBe('GITHUB');
      expect(ProjectSourceType.HYBRID).toBe('HYBRID');

      expect(VersionStatus.PROCESSING).toBe('PROCESSING');
      expect(VersionStatus.READY).toBe('READY');
      expect(VersionStatus.FAILED).toBe('FAILED');
    });
  });
});
