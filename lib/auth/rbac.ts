export type AdminRole = 'superadmin' | 'admin' | 'catalog_manager';

export interface AdminUserSession {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export const PERMISSIONS = {
  // Catalog permissions
  CATALOG_VIEW: 'catalog:view',
  CATALOG_CREATE: 'catalog:create',
  CATALOG_EDIT: 'catalog:edit',
  CATALOG_OVERRIDE: 'catalog:override',
  CATALOG_IMPORT_VIEW: 'catalog:import_view',
  CATALOG_IMPORT_DRY_RUN: 'catalog:import_dry_run',
  CATALOG_IMPORT_COMMIT: 'catalog:import_commit',
  CATALOG_SAFETY_OVERRIDE: 'catalog:safety_override',

  // Inventory permissions
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Images
  IMAGES_MANAGE: 'images:manage',
  IMAGES_VERIFY: 'images:verify',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // System & Users
  ADMIN_MANAGE: 'admin:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_OVERRIDE,
    PERMISSIONS.CATALOG_IMPORT_VIEW,
    PERMISSIONS.CATALOG_IMPORT_DRY_RUN,
    PERMISSIONS.CATALOG_IMPORT_COMMIT,
    PERMISSIONS.CATALOG_SAFETY_OVERRIDE, // Superadmin ONLY
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.IMAGES_MANAGE,
    PERMISSIONS.IMAGES_VERIFY,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.ADMIN_MANAGE,
  ],
  admin: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_OVERRIDE,
    PERMISSIONS.CATALOG_IMPORT_VIEW,
    PERMISSIONS.CATALOG_IMPORT_DRY_RUN,
    PERMISSIONS.CATALOG_IMPORT_COMMIT,
    // Note: admin CANNOT perform safety override
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.IMAGES_MANAGE,
    PERMISSIONS.IMAGES_VERIFY,
    PERMISSIONS.AUDIT_VIEW,
  ],
  catalog_manager: [
    PERMISSIONS.CATALOG_VIEW,
    PERMISSIONS.CATALOG_CREATE,
    PERMISSIONS.CATALOG_EDIT,
    PERMISSIONS.CATALOG_OVERRIDE,
    PERMISSIONS.CATALOG_IMPORT_VIEW,
    PERMISSIONS.CATALOG_IMPORT_DRY_RUN,
    // Note: catalog_manager CANNOT commit imports, cannot adjust inventory, cannot view full audit or manage admins
    PERMISSIONS.IMAGES_MANAGE,
    PERMISSIONS.IMAGES_VERIFY,
  ],
};

export class AdminRBAC {
  public static hasPermission(role: AdminRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
  }

  public static canOverrideSafety(role: AdminRole): boolean {
    return this.hasPermission(role, PERMISSIONS.CATALOG_SAFETY_OVERRIDE);
  }

  public static canCommitImport(role: AdminRole): boolean {
    return this.hasPermission(role, PERMISSIONS.CATALOG_IMPORT_COMMIT);
  }

  public static canAdjustInventory(role: AdminRole): boolean {
    return this.hasPermission(role, PERMISSIONS.INVENTORY_ADJUST);
  }
}
