import { NextRequest, NextResponse } from 'next/server';
import { canonicalStore } from '@/lib/data/store';
import { AdminSessionService } from '@/lib/auth/session';
import { PERMISSIONS } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.IMAGES_MANAGE);
    if (!auth.authorized) {
      return auth.response;
    }

    const images = canonicalStore.getAllImages();
    return NextResponse.json({ images });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.IMAGES_VERIFY);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { imageId, status } = body;

    if (!imageId || !status) {
      return NextResponse.json({ error: 'imageId et status sont requis.' }, { status: 400 });
    }

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const updated = canonicalStore.verifyImage(imageId, status, adminUser);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
