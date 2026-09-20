import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_OVERRIDE);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const { type, overrideValue, variantId } = body;

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    if (type === 'price') {
      const numPrice = Number(overrideValue);
      if (isNaN(numPrice) || numPrice <= 0) {
        return NextResponse.json({ error: 'Prix surchargé invalide' }, { status: 400 });
      }
      const updated = canonicalStore.setPriceOverride(id, variantId || null, numPrice, adminUser);
      return NextResponse.json(updated);
    } else if (type === 'name') {
      const updated = canonicalStore.setNameOverride(id, String(overrideValue), adminUser);
      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ error: 'Type de surcharge non supporté' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_OVERRIDE);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'price';
    const variantId = searchParams.get('variantId') || null;

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    if (type === 'price') {
      const updated = canonicalStore.removePriceOverride(id, variantId, adminUser);
      return NextResponse.json(updated);
    } else if (type === 'name') {
      const updated = canonicalStore.removeNameOverride(id, adminUser);
      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ error: 'Type de surcharge non supporté' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
