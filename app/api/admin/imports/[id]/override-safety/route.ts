import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_SAFETY_OVERRIDE);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Une justification détaillée (minimum 10 caractères) est obligatoire pour forcer un import bloqué.' },
        { status: 400 }
      );
    }

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
      role: auth.user.role,
    };

    const updated = canonicalStore.overrideSafetyGuard(id, reason, adminUser);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
