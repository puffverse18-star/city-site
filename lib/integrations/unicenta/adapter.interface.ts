/**
 * uniCenta POS Inventory Integration Abstraction
 * Marked as PENDING OFFICIAL VERIFICATION.
 * Decoupled from storefront and store operations.
 */

export interface UniCentaInventoryRecord {
  posBarcode?: string;
  posReference: string;
  unitsInStock: number;
  locationName: string;
  timestamp: string;
}

export interface UniCentaSyncAdapter {
  isAvailable(): boolean;
  pullInventoryUpdates(): Promise<UniCentaInventoryRecord[]>;
}

export class StubUniCentaAdapter implements UniCentaSyncAdapter {
  public isAvailable(): boolean {
    return false;
  }

  public async pullInventoryUpdates(): Promise<UniCentaInventoryRecord[]> {
    // Intentionally unconfigured until verified
    return [];
  }
}
