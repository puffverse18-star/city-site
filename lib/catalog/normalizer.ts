import { NormalizedSourceProduct, normalizedSourceProductSchema } from './adapter.interface';
import { z } from 'zod';

export class CatalogNormalizer {
  /**
   * Safely parses and normalizes a single raw record from any external supplier
   */
  public static normalizeRecord(raw: unknown): { success: true; data: NormalizedSourceProduct } | { success: false; error: string } {
    try {
      const parsed = normalizedSourceProductSchema.parse(raw);
      return { success: true, data: parsed };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { success: false, error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') };
      }
      return { success: false, error: 'Unknown validation failure' };
    }
  }

  /**
   * Batch normalizes records and separates valid items from row errors
   */
  public static normalizeBatch(rawItems: unknown[]): {
    valid: NormalizedSourceProduct[];
    errors: Array<{ index: number; error: string; raw: unknown }>;
  } {
    const valid: NormalizedSourceProduct[] = [];
    const errors: Array<{ index: number; error: string; raw: unknown }> = [];

    rawItems.forEach((item, index) => {
      const res = this.normalizeRecord(item);
      if (res.success) {
        valid.push(res.data);
      } else {
        errors.push({ index, error: res.error, raw: item });
      }
    });

    return { valid, errors };
  }
}
