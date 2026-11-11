import { prisma } from '@devpilot/database';

export interface RecordAuditOptions {
  organizationId: string;
  userId?: string | null;
  repositoryId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async record(options: RecordAuditOptions): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: options.organizationId,
          userId: options.userId || null,
          repositoryId: options.repositoryId || null,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId || null,
          metadata: (options.metadata as any) || undefined,
          ipAddress: options.ipAddress || null,
          userAgent: options.userAgent || null,
        },
      });
    } catch (error) {
      console.error('[AuditService] Failed to record audit log:', error);
    }
  }
}

