export interface OrderItemSnapshotInput {
  productId?: string | null;
  variantId?: string | null;
  liveProductName: string;
  liveVariantName: string;
  liveSku?: string | null;
  liveUnitPrice: number;
  quantity: number;
}

export interface ImmutableOrderItemSnapshot {
  productId: string | null;
  variantId: string | null;
  capturedProductName: string;
  capturedVariantName: string;
  capturedSku: string | null;
  capturedUnitPrice: string; // Formatted numeric string for database precision
  quantity: number;
  capturedLineTotal: string;
}

export class OrderSnapshotService {
  /**
   * Captures an immutable snapshot of an item at the exact moment of order creation.
   * Future product, variant or price edits will NEVER modify this record.
   */
  public static createSnapshot(input: OrderItemSnapshotInput): ImmutableOrderItemSnapshot {
    const unitPrice = Math.max(0, input.liveUnitPrice);
    const qty = Math.max(1, input.quantity);
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;

    return {
      productId: input.productId ?? null,
      variantId: input.variantId ?? null,
      capturedProductName: input.liveProductName,
      capturedVariantName: input.liveVariantName,
      capturedSku: input.liveSku ?? null,
      capturedUnitPrice: unitPrice.toFixed(2),
      quantity: qty,
      capturedLineTotal: lineTotal.toFixed(2),
    };
  }
}
