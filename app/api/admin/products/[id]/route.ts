import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_VIEW);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const product = canonicalStore.getProductById(id);

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_EDIT);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await req.json();
    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const updated = canonicalStore.updateProductGeneral(id, body, adminUser);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
