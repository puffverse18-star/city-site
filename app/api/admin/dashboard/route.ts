import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const metrics = canonicalStore.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
