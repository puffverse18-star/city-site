import { InventoryCalculator, VariantStockSummary } from './calculator';

export interface InventoryLocation {
  id: string;
  code: string;
  name: string;
  type: string;
  isOnlineFulfillment: boolean;
}

export interface VariantInventoryRecord {
  id: string;
  variantId: string;
  inventorySourceId: string;
  locationName: string;
  locationCode: string;
  productName: string;
  variantName: string;
  sku: string | null;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number; // strictly derived: Math.max(0, physical - reserved)
  lastSyncedAt: string;
}

export interface InventoryAdjustmentInput {
  variantId: string;
  inventorySourceId: string;
  quantityChange: number; // positive or negative delta, or absolute
  mode: 'delta' | 'absolute';
  reason: string;
  adminUserId: string;
  adminName: string;
}

export class InventoryService {
  /**
   * Derives stock strictly: Math.max(0, physical - reserved).
   * Note: Available stock is NEVER directly writable!
   */
  public static deriveAvailable(physical: number, reserved: number): number {
    return Math.max(0, physical - reserved);
  }

  /**
   * Calculates overall stock availability across multiple locations.
   */
  public static calculateStock(locations: Array<{
    inventorySourceId: string;
    locationCode: string;
    isOnlineFulfillment: boolean;
    physicalQuantity: number;
    reservedQuantity: number;
  }>): VariantStockSummary {
    return InventoryCalculator.calculateVariantStock({
      variantId: 'calculated',
      locations,
    });
  }

  /**
   * Applies an auditable inventory adjustment.
   */
  public static applyAdjustment(
    currentPhysical: number,
    currentReserved: number,
    input: InventoryAdjustmentInput
  ): {
    newPhysical: number;
    newReserved: number;
    newAvailable: number;
    auditEntry: {
      action: string;
      entityType: string;
      entityId: string;
      details: Record<string, unknown>;
    };
  } {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new Error('Un motif d\'ajustement d\'au moins 3 caractères est obligatoire');
    }

    let newPhysical: number;
    if (input.mode === 'delta') {
      newPhysical = currentPhysical + input.quantityChange;
    } else {
      newPhysical = input.quantityChange;
    }

    if (newPhysical < 0) {
      throw new Error('La quantité physique en stock ne peut pas être négative');
    }

    const newAvailable = this.deriveAvailable(newPhysical, currentReserved);

    return {
      newPhysical,
      newReserved: currentReserved,
      newAvailable,
      auditEntry: {
        action: 'inventory.adjust',
        entityType: 'inventory_item',
        entityId: `${input.variantId}:${input.inventorySourceId}`,
        details: {
          variantId: input.variantId,
          inventorySourceId: input.inventorySourceId,
          previousPhysical: currentPhysical,
          newPhysical,
          reservedQuantity: currentReserved,
          derivedAvailable: newAvailable,
          reason: input.reason,
          adminUserId: input.adminUserId,
          adminName: input.adminName,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
}
