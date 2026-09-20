import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.INVENTORY_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const items = canonicalStore.getInventoryOverview();
    const locations = canonicalStore.getLocations();
    return NextResponse.json({ items, locations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.INVENTORY_ADJUST);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { variantId, locationId, quantityChange, mode, reason } = body;

    if (!variantId || !locationId || quantityChange === undefined || !reason) {
      return NextResponse.json(
        { error: 'variantId, locationId, quantityChange et reason sont obligatoires.' },
        { status: 400 }
      );
    }

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const result = canonicalStore.adjustInventory(
      variantId,
      locationId,
      Number(quantityChange),
      mode || 'delta',
      reason,
      adminUser
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
