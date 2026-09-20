import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';

export interface AdminActor {
  id: string;
  name: string;
}

export interface InventoryAdjustmentParams {
  variantId: string;
  locationId: string;
  mode: 'delta' | 'count';
  quantity: number;
  reason: string;
  adminUser: AdminActor;
}

/**
 * PostgreSQL Database Repository Layer for CITY Électronique.
 * 
 * Provides clean abstractions over Drizzle ORM operations, preserving:
 * - 3-tier ownership model (source, store, override)
 * - Derived stock calculation: Available = max(0, physical - reserved)
 * - ACID transaction boundaries for catalog commits and inventory adjustments
 * - Immutable audit logging
 */
export class ProductRepository {
  /**
   * Finds a canonical product by its unique slug.
   */
  public static async findBySlug(slug: string) {
    return db.query.products.findFirst({
      where: eq(schema.products.slug, slug),
      with: {
        brand: true,
        category: true,
        variants: {
          with: {
            inventoryItems: {
              with: {
                source: true,
              },
            },
            images: true,
          },
        },
        images: true,
      },
    });
  }

  /**
   * Finds a product by its primary UUID.
   */
  public static async findById(id: string) {
    return db.query.products.findFirst({
      where: eq(schema.products.id, id),
      with: {
        brand: true,
        category: true,
        variants: {
          with: {
            inventoryItems: true,
          },
        },
        images: true,
      },
    });
  }

  /**
   * Applies an explicit manual price override in MAD.
   * Preserves ownership tier rules and appends an audit event.
   */
  public static async setPriceOverride(
    productId: string,
    overridePrice: number,
    adminUser: AdminActor
  ) {
    return db.transaction(async (tx) => {
      const existing = await tx.query.products.findFirst({
        where: eq(schema.products.id, productId),
      });

      if (!existing) {
        throw new Error(`Produit introuvable : ${productId}`);
      }

      const formattedPrice = overridePrice.toFixed(2);
      const updatedMeta = {
        ...(existing.overridesMeta || {}),
        price: {
          overriddenAt: new Date().toISOString(),
          overriddenBy: adminUser.name,
        },
      };

      const [updated] = await tx
        .update(schema.products)
        .set({
          isPriceOverridden: true,
          overridePrice: formattedPrice,
          overridesMeta: updatedMeta,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, productId))
        .returning();

      // Immutable Audit Log
      await tx.insert(schema.auditLogs).values({
        userId: adminUser.id.startsWith('usr_') ? null : adminUser.id,
        action: 'product.override_price',
        entityType: 'product',
        entityId: productId,
        details: {
          productSlug: existing.slug,
          previousPrice: existing.derivedPrice,
          newOverridePrice: formattedPrice,
          adminName: adminUser.name,
        },
      });

      return updated;
    });
  }

  /**
   * Removes a price override and restores the source-derived value.
   */
  public static async removePriceOverride(productId: string, adminUser: AdminActor) {
    return db.transaction(async (tx) => {
      const existing = await tx.query.products.findFirst({
        where: eq(schema.products.id, productId),
      });

      if (!existing) {
        throw new Error(`Produit introuvable : ${productId}`);
      }

      const [updated] = await tx
        .update(schema.products)
        .set({
          isPriceOverridden: false,
          overridePrice: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, productId))
        .returning();

      // Immutable Audit Log
      await tx.insert(schema.auditLogs).values({
        userId: adminUser.id.startsWith('usr_') ? null : adminUser.id,
        action: 'product.remove_override',
        entityType: 'product',
        entityId: productId,
        details: {
          productSlug: existing.slug,
          restoredDerivedPrice: existing.derivedPrice,
          removedOverridePrice: existing.overridePrice,
          adminName: adminUser.name,
        },
      });

      return updated;
    });
  }
}

export class InventoryRepository {
  /**
   * Derives available stock strictly as max(0, physical - reserved).
   */
  public static calculateAvailable(physical: number, reserved: number): number {
    return Math.max(0, physical - reserved);
  }

  /**
   * Adjusts inventory for a variant at a specific location within a transaction.
   */
  public static async adjustStock(params: InventoryAdjustmentParams) {
    const { variantId, locationId, mode, quantity, reason, adminUser } = params;

    return db.transaction(async (tx) => {
      // 1. Fetch current inventory level
      const current = await tx.query.inventoryItems.findFirst({
        where: and(
          eq(schema.inventoryItems.variantId, variantId),
          eq(schema.inventoryItems.inventorySourceId, locationId)
        ),
      });

      let oldPhysical = 0;
      let reserved = 0;
      let newPhysical = 0;

      if (current) {
        oldPhysical = current.physicalQuantity;
        reserved = current.reservedQuantity;
        newPhysical = mode === 'count' ? quantity : oldPhysical + quantity;
      } else {
        newPhysical = mode === 'count' ? quantity : Math.max(0, quantity);
      }

      if (newPhysical < 0) {
        throw new Error(`Le stock physique ne peut pas être négatif (${newPhysical})`);
      }

      // 2. Upsert inventory item
      let updatedItem;
      if (current) {
        const [res] = await tx
          .update(schema.inventoryItems)
          .set({
            physicalQuantity: newPhysical,
            updatedAt: new Date(),
          })
          .where(eq(schema.inventoryItems.id, current.id))
          .returning();
        updatedItem = res;
      } else {
        const [res] = await tx
          .insert(schema.inventoryItems)
          .values({
            variantId,
            inventorySourceId: locationId,
            physicalQuantity: newPhysical,
            reservedQuantity: 0,
          })
          .returning();
        updatedItem = res;
      }

      // 3. Log Immutable Audit Record
      await tx.insert(schema.auditLogs).values({
        userId: adminUser.id.startsWith('usr_') ? null : adminUser.id,
        action: 'inventory.adjust',
        entityType: 'variant',
        entityId: variantId,
        details: {
          locationId,
          mode,
          oldPhysical,
          newPhysical,
          reserved,
          available: this.calculateAvailable(newPhysical, reserved),
          reason,
          adminName: adminUser.name,
        },
      });

      return {
        item: updatedItem,
        physical: newPhysical,
        reserved,
        available: this.calculateAvailable(newPhysical, reserved),
      };
    });
  }
}

export class CatalogImportRepository {
  /**
   * Commits an import session transactionally.
   * Ensures BEGIN -> validate -> apply -> audit -> COMMIT or ROLLBACK.
   */
  public static async commitImportTransactional(params: {
    importId: string;
    sourceId: string;
    itemsToCreate: Array<{
      slug: string;
      derivedName: string;
      derivedPrice: number;
      sku: string | null;
      barcode: string | null;
    }>;
    itemsToDeactivate: string[]; // product IDs
    adminUser: AdminActor;
  }) {
    return db.transaction(async (tx) => {
      let createdCount = 0;
      let deactivatedCount = 0;

      // 1. Create items
      for (const item of params.itemsToCreate) {
        const [prod] = await tx
          .insert(schema.products)
          .values({
            slug: item.slug,
            derivedName: item.derivedName,
            derivedPrice: item.derivedPrice.toFixed(2),
            isPublished: true,
            availabilityStatus: 'in_stock',
          })
          .returning();

        if (prod) {
          await tx.insert(schema.productVariants).values({
            productId: prod.id,
            name: 'Standard',
            sku: item.sku,
            barcode: item.barcode,
            isDefaultVariant: true,
            derivedPrice: item.derivedPrice.toFixed(2),
          });
          createdCount++;
        }
      }

      // 2. Deactivate items
      for (const prodId of params.itemsToDeactivate) {
        await tx
          .update(schema.products)
          .set({
            isPublished: false,
            availabilityStatus: 'out_of_stock',
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, prodId));
        deactivatedCount++;
      }

      // 3. Mark import record committed
      await tx
        .update(schema.catalogImports)
        .set({
          status: 'committed',
          committedAt: new Date(),
        })
        .where(eq(schema.catalogImports.id, params.importId));

      // 4. Audit Log
      await tx.insert(schema.auditLogs).values({
        userId: params.adminUser.id.startsWith('usr_') ? null : params.adminUser.id,
        action: 'import.commit',
        entityType: 'import',
        entityId: params.importId,
        details: {
          sourceId: params.sourceId,
          createdCount,
          deactivatedCount,
          adminName: params.adminUser.name,
        },
      });

      return {
        success: true,
        createdCount,
        deactivatedCount,
      };
    });
  }
}

export class AuditRepository {
  /**
   * Appends an immutable audit log entry.
   */
  public static async log(params: {
    action: string;
    entityType: string;
    entityId?: string;
    details: Record<string, unknown>;
    adminUser?: AdminActor;
  }) {
    return db.insert(schema.auditLogs).values({
      userId: params.adminUser?.id.startsWith('usr_') ? null : params.adminUser?.id,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: {
        ...params.details,
        adminName: params.adminUser?.name || 'System',
      },
    });
  }

  /**
   * Retrieves recent audit logs in reverse chronological order.
   */
  public static async getRecent(limit = 50) {
    return db.query.auditLogs.findMany({
      orderBy: [desc(schema.auditLogs.createdAt)],
      limit,
    });
  }
}
