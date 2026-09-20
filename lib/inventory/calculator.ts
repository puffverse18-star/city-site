export interface InventoryCalculationInput {
  variantId: string;
  locations: Array<{
    inventorySourceId: string;
    locationCode: string;
    isOnlineFulfillment: boolean;
    physicalQuantity: number;
    reservedQuantity: number;
  }>;
}

export interface InventoryCalculationResult {
  variantId: string;
  totalPhysical: number;
  totalReserved: number;
  totalAvailable: number;
  isAvailableForSale: boolean;
  byLocation: Array<{
    locationCode: string;
    physical: number;
    reserved: number;
    available: number;
  }>;
}

export type VariantStockSummary = InventoryCalculationResult;

export class InventoryCalculator {
  /**
   * Calculates available stock strictly with formula:
   * available_quantity = max(0, physical_quantity - reserved_quantity)
   * Prevents negative inventory from ever surfacing to customers.
   */
  public static calculateVariantStock(input: InventoryCalculationInput): InventoryCalculationResult {
    let totalPhysical = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    const byLocation = input.locations.map((loc) => {
      const physical = Math.max(0, loc.physicalQuantity);
      const reserved = Math.max(0, loc.reservedQuantity);
      // Safe subtraction: reserved can never produce negative available stock
      const available = Math.max(0, physical - reserved);

      if (loc.isOnlineFulfillment) {
        totalPhysical += physical;
        totalReserved += reserved;
        totalAvailable += available;
      }

      return {
        locationCode: loc.locationCode,
        physical,
        reserved,
        available,
      };
    });

    return {
      variantId: input.variantId,
      totalPhysical,
      totalReserved,
      totalAvailable,
      isAvailableForSale: totalAvailable > 0,
      byLocation,
    };
  }
}
