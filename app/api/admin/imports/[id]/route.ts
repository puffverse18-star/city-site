import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_IMPORT_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const imp = canonicalStore.getImportById(id);

    if (!imp) {
      return NextResponse.json({ error: 'Import introuvable' }, { status: 404 });
    }

    return NextResponse.json(imp);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
