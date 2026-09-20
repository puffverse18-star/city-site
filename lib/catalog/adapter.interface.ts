import { z } from 'zod';

// ==============================================================================
// 1. NORMALIZED SOURCE PRODUCT CONTRACT
// ==============================================================================

export const normalizedSourceProductSchema = z.object({
  sourceRecordId: z.string().min(1, 'Source record ID is required'),
  sourceSku: z.string().nullable().optional(),
  sourceBarcode: z.string().nullable().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  price: z.number().positive('Price must be greater than zero'),
  rawStock: z.number().int().nonnegative().optional().default(0),
  imageUrls: z.array(z.string().url()).default([]),
  specifications: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
});

export type NormalizedSourceProduct = z.infer<typeof normalizedSourceProductSchema>;

// ==============================================================================
// 2. STAGED IMPORT PIPELINE INTERFACES
// ==============================================================================

export interface CatalogSourceAdapter {
  sourceCode: string;
  sourceName: string;
  parse(rawInput: unknown): Promise<NormalizedSourceProduct[]>;
}

export interface DiffResultItem {
  sourceRecordId: string;
  action: 'create' | 'update' | 'deactivate' | 'unchanged' | 'manual_review' | 'error';
  diff: Record<string, { from: unknown; to: unknown; overriddenBlocked?: boolean }>;
  reason?: string;
}

export interface DryRunReport {
  importId: string;
  sourceCode: string;
  isFullSnapshot: boolean;
  totalReceived: number;
  wouldCreate: number;
  wouldUpdate: number;
  wouldDeactivate: number;
  wouldManualReview: number;
  unchanged: number;
  errors: number;
  duplicateCount?: number;
  durationMs?: number;
  processedAt?: string;
  safety: {
    triggered: boolean;
    dropPercentage: number;
    blocked: boolean;
    reason?: string;
  };
  items: DiffResultItem[];
}

export interface CatalogDiffEngine {
  calculateDiff(params: {
    sourceId: string;
    sourceCode: string;
    incomingRecords: NormalizedSourceProduct[];
    isFullSnapshot: boolean;
    previousTotalCount: number;
    maxSafetyDropPercentage: number;
  }): Promise<DryRunReport>;
}

export interface CatalogImporter {
  dryRun(sourceCode: string, input: unknown, isFullSnapshot: boolean): Promise<DryRunReport>;
  commit(importId: string, adminUserId: string, overrideSafety?: boolean, overrideReason?: string): Promise<{ success: boolean; committedCount: number }>;
}
