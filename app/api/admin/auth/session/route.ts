import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionService } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const user = await AdminSessionService.getAuthenticatedUser(req);
  return NextResponse.json({
    user: user || AdminSessionService.getCurrentSession(),
    isProduction: process.env.NODE_ENV === 'production',
    roles: [
      { id: 'superadmin', label: 'Super Administrateur (Directeur Général)', permissions: 'Accès complet + Dépassement de sécurité (Safety Guard Override)' },
      { id: 'admin', label: 'Administrateur Opérations', permissions: 'Gestion catalogue, stocks, validation imports normaux (Pas de dépassement sécurité)' },
      { id: 'catalog_manager', label: 'Gestionnaire Catalogue', permissions: 'Édition fiches produits et médias (Lecture seule imports et stocks)' },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;

    const result = AdminSessionService.setSessionRole(role);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const response = NextResponse.json({ user: result.user });
    // Set HTTP session cookie for browser
    response.cookies.set({
      name: 'city_admin_session',
      value: role,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
