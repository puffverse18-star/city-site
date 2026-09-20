import { z } from 'zod';
import { NormalizedSourceProduct, normalizedSourceProductSchema, DiffResultItem, DryRunReport } from './adapter.interface';
import { SnapshotSafetyGuard } from './safety-guard';

export interface RawImportRow {
  source_record_id?: string;
  sourceRecordId?: string;
  id?: string;
  name?: string;
  sku?: string;
  source_sku?: string;
  sourceSku?: string;
  barcode?: string;
  source_barcode?: string;
  sourceBarcode?: string;
  price?: string | number;
  description?: string;
  category?: string;
  brand?: string;
  stock?: string | number;
  raw_stock?: string | number;
  image_urls?: string | string[];
  specifications?: string | Record<string, string | number>;
  [key: string]: unknown;
}

export interface ExistingCatalogItem {
  id: string; // product id
  variantId: string;
  sourceRecordId?: string;
  sourceCode?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  modelNumber: string | null;
  price: number;
  isPriceOverridden: boolean;
  overridePrice: number | null;
  isNameOverridden: boolean;
  overrideName: string | null;
  isActive: boolean;
}

export class CatalogImportPipeline {
  /**
   * Safe CSV parser supporting comma-separated lines and quoted fields.
   */
  public static parseCsv(csvText: string): RawImportRow[] {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/[\s-]/g, '_'));
    const rows: RawImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
      
      const row: RawImportRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index].trim() : '';
      });
      rows.push(row);
    }

    return rows;
  }

  private static parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  /**
   * Safe JSON parser validating either an array of objects or an envelope { items: [...] }.
   */
  public static parseJson(jsonInput: string | unknown): RawImportRow[] {
    let parsed: unknown = jsonInput;
    if (typeof jsonInput === 'string') {
      try {
        parsed = JSON.parse(jsonInput);
      } catch (err: any) {
        throw new Error(`Format JSON invalide : ${err.message}`);
      }
    }

    if (Array.isArray(parsed)) {
      return parsed as RawImportRow[];
    }

    if (parsed && typeof parsed === 'object' && 'items' in parsed && Array.isArray((parsed as any).items)) {
      return (parsed as any).items as RawImportRow[];
    }

    if (parsed && typeof parsed === 'object' && 'products' in parsed && Array.isArray((parsed as any).products)) {
      return (parsed as any).products as RawImportRow[];
    }

    throw new Error('Le flux JSON doit être une liste de produits ou un objet contenant la clé "items"');
  }

  /**
   * Sanitizes string values to prevent CSV formula injection (DDE attacks).
   * Strips or escapes leading '=', '+', '-', '@', '\t', '\r' when not part of a standard numeric literal.
   */
  public static sanitizeFormulaInjection(value: string): string {
    if (!value || typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      // Check if it is a valid numeric value like "-50" or "+12.5"
      if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed;
      }
      // Otherwise prepend a single quote to neutralize spreadsheet execution
      return `'${trimmed}`;
    }
    return value;
  }

  /**
   * Normalizes raw rows into strongly-typed NormalizedSourceProduct using Zod.
   * Includes duplicate detection in the incoming batch, formula sanitization, and boundary checks.
   */
  public static normalizeRows(rows: RawImportRow[]): {
    valid: NormalizedSourceProduct[];
    errors: Array<{ row: number; error: string; data?: unknown }>;
  } {
    const valid: NormalizedSourceProduct[] = [];
    const errors: Array<{ row: number; error: string; data?: unknown }> = [];
    const seenSourceRecordIds = new Set<string>();

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const rawSourceRecordId = String(row.source_record_id || row.sourceRecordId || row.id || '').trim();
      const sourceRecordId = this.sanitizeFormulaInjection(rawSourceRecordId);

      // In-batch duplicate check
      if (seenSourceRecordIds.has(sourceRecordId)) {
        errors.push({
          row: rowNum,
          error: `Doublon détecté dans le flux : l'identifiant source '${sourceRecordId}' apparaît plusieurs fois`,
          data: { sourceRecordId, name: row.name },
        });
        return;
      }
      if (sourceRecordId) {
        seenSourceRecordIds.add(sourceRecordId);
      }

      const rawName = String(row.name || row.source_name || '').trim();
      const name = this.sanitizeFormulaInjection(rawName);

      const rawSku = row.source_sku || row.sourceSku || row.sku ? String(row.source_sku || row.sourceSku || row.sku).trim() : null;
      const sku = rawSku ? this.sanitizeFormulaInjection(rawSku) : null;

      const rawBarcode = row.source_barcode || row.sourceBarcode || row.barcode ? String(row.source_barcode || row.sourceBarcode || row.barcode).trim() : null;
      const barcode = rawBarcode ? this.sanitizeFormulaInjection(rawBarcode) : null;
      
      const rawPrice = row.price !== undefined ? row.price : row.source_price;
      const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || '0').replace(/[^\d.-]/g, ''));
      
      const rawStock = row.stock !== undefined ? row.stock : (row.raw_stock || row.source_raw_stock || 0);
      const stock = parseInt(String(rawStock), 10) || 0;

      // Price bounds check (Must be positive and <= 10,000,000 DH)
      if (isNaN(price) || price <= 0 || price > 10000000) {
        errors.push({
          row: rowNum,
          error: `Prix invalide (${price} DH) : le prix doit être un nombre positif inférieur à 10 000 000 DH`,
          data: { sourceRecordId, name, price },
        });
        return;
      }

      // Length bounds check
      if (name.length > 255) {
        errors.push({
          row: rowNum,
          error: `Nom trop long (${name.length} caractères, maximum 255)`,
          data: { sourceRecordId, name },
        });
        return;
      }

      let imageUrls: string[] = [];
      if (Array.isArray(row.image_urls)) {
        imageUrls = row.image_urls.filter((u) => typeof u === 'string');
      } else if (typeof row.image_urls === 'string' && row.image_urls.trim()) {
        imageUrls = row.image_urls.split(',').map((u) => u.trim()).filter((u) => u.startsWith('http'));
      }

      let specifications: Record<string, string | number> = {};
      if (typeof row.specifications === 'object' && row.specifications !== null) {
        specifications = row.specifications as Record<string, string | number>;
      } else if (typeof row.specifications === 'string' && row.specifications.trim()) {
        try {
          specifications = JSON.parse(row.specifications);
        } catch {
          // ignore spec parse error
        }
      }

      const candidate = {
        sourceRecordId,
        sourceSku: sku || null,
        sourceBarcode: barcode || null,
        name,
        description: row.description ? this.sanitizeFormulaInjection(String(row.description).trim()) : null,
        category: row.category ? this.sanitizeFormulaInjection(String(row.category).trim()) : null,
        brand: row.brand ? this.sanitizeFormulaInjection(String(row.brand).trim()) : null,
        price,
        rawStock: stock >= 0 ? stock : 0,
        imageUrls,
        specifications,
        rawPayload: { ...row },
      };

      try {
        const validated = normalizedSourceProductSchema.parse(candidate);
        valid.push(validated);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          errors.push({
            row: rowNum,
            error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
            data: { sourceRecordId, name, price },
          });
        } else {
          errors.push({ row: rowNum, error: 'Erreur de validation inconnue', data: candidate });
        }
      }
    });

    return { valid, errors };
  }

  /**
   * Conservative Identity Matching:
   * 1. Exact source record identifier (sourceCode + sourceRecordId)
   * 2. Exact source-specific external identifier
   * 3. Exact barcode (if safe, non-empty, min 8 chars)
   * 4. Exact SKU (if safe, non-empty)
   * 5. Exact model number (if safe, non-empty)
   * 
   * Strict Rule: NO FUZZY MATCHING BY DEFAULT. Uncertain matches -> manual_review.
   */
  public static matchIdentity(
    incoming: NormalizedSourceProduct,
    sourceCode: string,
    existingItems: ExistingCatalogItem[]
  ): { match: ExistingCatalogItem | null; uncertainMatch: boolean; reason?: string } {
    // 1. Exact source record identifier in the same source
    const sourceMatch = existingItems.find(
      (item) => item.sourceCode === sourceCode && item.sourceRecordId === incoming.sourceRecordId
    );
    if (sourceMatch) {
      return { match: sourceMatch, uncertainMatch: false, reason: 'Identifiant source exact (sourceRecordId)' };
    }

    // 2. Exact Barcode match (safe, isolated context, unique match)
    if (incoming.sourceBarcode && incoming.sourceBarcode.trim().length >= 8) {
      const barcodeMatches = existingItems.filter(
        (item) => item.barcode && item.barcode.trim().toLowerCase() === incoming.sourceBarcode!.trim().toLowerCase()
      );
      if (barcodeMatches.length === 1) {
        return { match: barcodeMatches[0], uncertainMatch: false, reason: 'Code-barres exact sécurisé' };
      } else if (barcodeMatches.length > 1) {
        return { match: null, uncertainMatch: true, reason: `Collision code-barres : ${barcodeMatches.length} articles correspondent` };
      }
    }

    // 3. Exact SKU match (safe, isolated context, unique match)
    if (incoming.sourceSku && incoming.sourceSku.trim().length >= 3) {
      const skuMatches = existingItems.filter(
        (item) => item.sku && item.sku.trim().toLowerCase() === incoming.sourceSku!.trim().toLowerCase()
      );
      if (skuMatches.length === 1) {
        return { match: skuMatches[0], uncertainMatch: false, reason: 'SKU exact sécurisé' };
      } else if (skuMatches.length > 1) {
        return { match: null, uncertainMatch: true, reason: `Collision SKU : ${skuMatches.length} articles correspondent` };
      }
    }

    // 4. Exact Model Number match (if provided in incoming specifications or properties)
    const incomingModel = incoming.specifications?.modelNumber || incoming.specifications?.model;
    if (incomingModel && String(incomingModel).trim().length >= 3) {
      const modelStr = String(incomingModel).trim().toLowerCase();
      const modelMatches = existingItems.filter(
        (item) => item.modelNumber && item.modelNumber.trim().toLowerCase() === modelStr
      );
      if (modelMatches.length === 1) {
        return { match: modelMatches[0], uncertainMatch: false, reason: 'Numéro de modèle exact sécurisé' };
      } else if (modelMatches.length > 1) {
        return { match: null, uncertainMatch: true, reason: `Collision modèle : ${modelMatches.length} articles correspondent` };
      }
    }

    return { match: null, uncertainMatch: false };
  }

  /**
   * Calculates the exact DryRun diff report for incoming records against current catalog state.
   */
  public static calculateDiff(params: {
    importId: string;
    sourceCode: string;
    incoming: NormalizedSourceProduct[];
    existingItems: ExistingCatalogItem[];
    isFullSnapshot: boolean;
    previousTotalCount: number;
    maxSafetyDropPercentage?: number;
  }): DryRunReport {
    const {
      importId,
      sourceCode,
      incoming,
      existingItems,
      isFullSnapshot,
      previousTotalCount,
      maxSafetyDropPercentage = 15,
    } = params;

    const items: DiffResultItem[] = [];
    const matchedExistingIds = new Set<string>();

    let wouldCreate = 0;
    let wouldUpdate = 0;
    let wouldDeactivate = 0;
    let wouldManualReview = 0;
    let unchanged = 0;
    let errors = 0;

    // Safety guard evaluation
    const safetyEval = SnapshotSafetyGuard.evaluate({
      isFullSnapshot,
      previousTotalCount,
      incomingValidCount: incoming.length,
      maxAllowedDropPercentage: maxSafetyDropPercentage,
    });

    for (const record of incoming) {
      const { match, uncertainMatch, reason: matchReason } = this.matchIdentity(record, sourceCode, existingItems);

      if (uncertainMatch) {
        wouldManualReview++;
        items.push({
          sourceRecordId: record.sourceRecordId,
          action: 'manual_review',
          diff: {},
          reason: `Revue manuelle requise: ${matchReason || 'Correspondance incertaine'}`,
        });
        continue;
      }

      if (!match) {
        // CREATE
        wouldCreate++;
        items.push({
          sourceRecordId: record.sourceRecordId,
          action: 'create',
          diff: {
            name: { from: null, to: record.name },
            price: { from: null, to: record.price },
            sku: { from: null, to: record.sourceSku || null },
            barcode: { from: null, to: record.sourceBarcode || null },
          },
          reason: 'Nouveau produit détecté dans la source',
        });
      } else {
        matchedExistingIds.add(match.id);
        // Compare values
        const diff: Record<string, { from: unknown; to: unknown; overriddenBlocked?: boolean }> = {};
        let hasChanges = false;

        // Price comparison + ownership protection
        if (Math.abs(match.price - record.price) > 0.001) {
          hasChanges = true;
          if (match.isPriceOverridden) {
            diff.price = {
              from: match.overridePrice,
              to: record.price,
              overriddenBlocked: true,
            };
          } else {
            diff.price = {
              from: match.price,
              to: record.price,
              overriddenBlocked: false,
            };
          }
        }

        // Name comparison + ownership protection
        if (match.name.trim() !== record.name.trim()) {
          hasChanges = true;
          if (match.isNameOverridden) {
            diff.name = {
              from: match.overrideName,
              to: record.name,
              overriddenBlocked: true,
            };
          } else {
            diff.name = {
              from: match.name,
              to: record.name,
              overriddenBlocked: false,
            };
          }
        }

        // SKU comparison
        if (record.sourceSku && record.sourceSku !== match.sku) {
          hasChanges = true;
          diff.sku = { from: match.sku, to: record.sourceSku };
        }

        // Barcode comparison
        if (record.sourceBarcode && record.sourceBarcode !== match.barcode) {
          hasChanges = true;
          diff.barcode = { from: match.barcode, to: record.sourceBarcode };
        }

        if (hasChanges) {
          wouldUpdate++;
          const overrideNotes = Object.values(diff).some((d) => d.overriddenBlocked)
            ? ' (Surcharges magasin protégées)'
            : '';
          items.push({
            sourceRecordId: record.sourceRecordId,
            action: 'update',
            diff,
            reason: `Mise à jour des données source${overrideNotes}`,
          });
        } else {
          unchanged++;
          items.push({
            sourceRecordId: record.sourceRecordId,
            action: 'unchanged',
            diff: {},
            reason: 'Données source strictement identiques au catalogue actif',
          });
        }
      }
    }

    // Complete snapshot absence checks: identify records from this source not present in snapshot
    if (isFullSnapshot) {
      const sourceExisting = existingItems.filter((i) => i.sourceCode === sourceCode && i.isActive);
      for (const item of sourceExisting) {
        if (!matchedExistingIds.has(item.id)) {
          if (safetyEval.isBlocked) {
            // Blocked by safety guard!
            errors++;
            items.push({
              sourceRecordId: item.sourceRecordId || item.id,
              action: 'error',
              diff: { status: { from: 'active', to: 'deactivated', overriddenBlocked: true } },
              reason: `Désactivation bloquée : ${safetyEval.message}`,
            });
          } else {
            wouldDeactivate++;
            items.push({
              sourceRecordId: item.sourceRecordId || item.id,
              action: 'deactivate',
              diff: { status: { from: 'active', to: 'inactive' } },
              reason: 'Absent du snapshot complet (désactivation programmée)',
            });
          }
        }
      }
    }

    return {
      importId,
      sourceCode,
      isFullSnapshot,
      totalReceived: incoming.length,
      wouldCreate,
      wouldUpdate,
      wouldDeactivate,
      wouldManualReview,
      unchanged,
      errors,
      safety: {
        triggered: safetyEval.isSafetyTriggered,
        dropPercentage: safetyEval.dropPercentage,
        blocked: safetyEval.isBlocked,
        reason: safetyEval.message,
      },
      items,
    };
  }
}
