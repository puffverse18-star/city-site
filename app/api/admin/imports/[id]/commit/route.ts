import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_IMPORT_COMMIT);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const committed = canonicalStore.commitImport(id, adminUser);
    return NextResponse.json(committed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
