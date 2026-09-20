export interface AuditLogItem {
  id: string;
  userId: string | null;
  adminName?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  details: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

export class AuditService {
  private static inMemoryLogs: AuditLogItem[] = [];

  /**
   * Records an immutable audit log entry.
   */
  public static log(entry: {
    userId?: string | null;
    adminName?: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    details?: Record<string, unknown>;
    ipAddress?: string | null;
  }): AuditLogItem {
    const item: AuditLogItem = {
      id: 'audit_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      userId: entry.userId || null,
      adminName: entry.adminName || 'Système',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      summary: entry.summary,
      details: entry.details || {},
      ipAddress: entry.ipAddress || null,
      createdAt: new Date().toISOString(),
    };

    // Immutable append
    this.inMemoryLogs.unshift(item);
    return item;
  }

  /**
   * Retrieves audit logs with optional filtering.
   */
  public static query(params?: {
    action?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): AuditLogItem[] {
    let result = [...this.inMemoryLogs];

    if (params?.action) {
      result = result.filter((l) => l.action.toLowerCase() === params.action!.toLowerCase());
    }

    if (params?.entityType) {
      result = result.filter((l) => l.entityType.toLowerCase() === params.entityType!.toLowerCase());
    }

    if (params?.entityId) {
      result = result.filter((l) => l.entityId === params.entityId);
    }

    if (params?.limit) {
      result = result.slice(0, params.limit);
    }

    return result;
  }

  public static count(): number {
    return this.inMemoryLogs.length;
  }
}
