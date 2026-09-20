import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/audit/service';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.AUDIT_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = AuditService.query({
      action,
      entityType,
      entityId,
      limit,
    });

    return NextResponse.json({
      logs,
      total: AuditService.count(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
