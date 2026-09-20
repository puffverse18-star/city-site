import { NextRequest, NextResponse } from 'next/server';
import { AdminRole, AdminRBAC, Permission } from './rbac';

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

// Canonical defined test/development administrative identities
export const PREDEFINED_ADMIN_ACCOUNTS: Record<AdminRole, AdminUserSession> = {
  superadmin: {
    id: 'usr_superadmin',
    name: 'Directeur Général CITY',
    email: 'direction@cityelectronique.ma',
    role: 'superadmin',
  },
  admin: {
    id: 'usr_admin',
    name: 'Responsable Opérations Casablanca',
    email: 'operations@cityelectronique.ma',
    role: 'admin',
  },
  catalog_manager: {
    id: 'usr_cat_manager',
    name: 'Gestionnaire Catalogue',
    email: 'catalogue@cityelectronique.ma',
    role: 'catalog_manager',
  },
};

// Server-side active session store (for dev/test execution)
let activeServerSession: AdminUserSession = { ...PREDEFINED_ADMIN_ACCOUNTS.superadmin };

export class AdminSessionService {
  /**
   * Returns current server session state.
   */
  public static getCurrentSession(): AdminUserSession {
    return { ...activeServerSession };
  }

  /**
   * Sets server-side session role.
   * STRICT SECURITY GUARD: In production environments, arbitrary role elevation via API is completely blocked.
   */
  public static setSessionRole(role: AdminRole): { success: boolean; user?: AdminUserSession; error?: string } {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Privilege elevation blocked: arbitrary role switching is disabled in production environments.',
      };
    }

    if (!PREDEFINED_ADMIN_ACCOUNTS[role]) {
      return { success: false, error: `Invalid administrative role: ${role}` };
    }

    activeServerSession = { ...PREDEFINED_ADMIN_ACCOUNTS[role] };
    return { success: true, user: activeServerSession };
  }

  /**
   * Resolves authenticated admin identity from request.
   * Never blindly trusts client-provided headers in unauthenticated contexts.
   */
  public static async getAuthenticatedUser(req: NextRequest): Promise<AdminUserSession | null> {
    // 1. Check HTTP-only session cookie
    const sessionCookie = req.cookies.get('city_admin_session')?.value;
    if (sessionCookie && ['superadmin', 'admin', 'catalog_manager'].includes(sessionCookie)) {
      return { ...PREDEFINED_ADMIN_ACCOUNTS[sessionCookie as AdminRole] };
    }

    // 2. In development or test environments, check server-side session or test header
    if (process.env.NODE_ENV !== 'production') {
      // In dev/test, read session cookie or current server session
      const testRoleHeader = req.headers.get('x-test-role');
      if (testRoleHeader && ['superadmin', 'admin', 'catalog_manager'].includes(testRoleHeader)) {
        return { ...PREDEFINED_ADMIN_ACCOUNTS[testRoleHeader as AdminRole] };
      }
      return { ...activeServerSession };
    }

    // In production, unauthenticated requests strictly return null
    return null;
  }

  /**
   * Validates admin session and specific RBAC permission.
   * Returns authorized user or structured 401/403 HTTP response.
   */
  public static async verifyPermission(
    req: NextRequest,
    requiredPermission?: Permission
  ): Promise<
    | { authorized: true; user: AdminUserSession }
    | { authorized: false; response: NextResponse }
  > {
    const user = await this.getAuthenticatedUser(req);

    if (!user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Non authentifié. Session administrative valide requise.' },
          { status: 401 }
        ),
      };
    }

    if (requiredPermission && !AdminRBAC.hasPermission(user.role, requiredPermission)) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            error: `Permissions insuffisantes (Rôle: ${user.role}). Action administrative interdite.`,
            requiredPermission,
            userRole: user.role,
          },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, user };
  }
}
