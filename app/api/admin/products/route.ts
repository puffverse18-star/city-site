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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const needsReview = searchParams.get('needsReview') === 'true' ? true : undefined;
    const hasOverride = searchParams.get('hasOverride') === 'true' ? true : undefined;
    const missingSku = searchParams.get('missingSku') === 'true' ? true : undefined;
    const missingBarcode = searchParams.get('missingBarcode') === 'true' ? true : undefined;
    const lowStock = searchParams.get('lowStock') === 'true' ? true : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = canonicalStore.getProducts({
      search,
      status,
      category,
      brand,
      needsReview,
      hasOverride,
      missingSku,
      missingBarcode,
      lowStock,
      page,
      limit,
    });

    return NextResponse.json({
      ...result,
      brands: canonicalStore.getBrands(),
      categories: canonicalStore.getCategories(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await AdminSessionService.verifyPermission(req, PERMISSIONS.CATALOG_CREATE);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await req.json();
    const { name, slug, brandId, categoryId, price, description, sku, barcode, isPublished } = body;

    if (!name || !price || !slug) {
      return NextResponse.json(
        { error: 'Le nom, le slug et le prix en DH sont obligatoires.' },
        { status: 400 }
      );
    }

    const adminUser = {
      id: auth.user.id,
      name: auth.user.name,
    };

    const created = canonicalStore.createProduct(
      {
        name,
        slug,
        brandId,
        categoryId,
        price: Number(price),
        description,
        sku,
        barcode,
        isPublished,
      },
      adminUser
    );

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
