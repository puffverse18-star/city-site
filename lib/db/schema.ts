import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==============================================================================
// 1. ADMIN USERS & SESSIONS (AUTH FOUNDATION)
// ==============================================================================

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 150 }).notNull(),
    role: varchar('role', { length: 50 }).default('admin').notNull(), // 'superadmin' | 'admin' | 'catalog_manager'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_admin_users_email').on(table.email),
  ]
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_admin_sessions_user').on(table.userId),
    index('idx_admin_sessions_token').on(table.tokenHash),
    index('idx_admin_sessions_expires').on(table.expiresAt),
  ]
);

// ==============================================================================
// 2. AUDIT LOGS
// ==============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // 'product.override', 'import.commit', 'inventory.adjust'
    entityType: varchar('entity_type', { length: 60 }).notNull(), // 'product', 'variant', 'import', 'order'
    entityId: varchar('entity_id', { length: 100 }),
    details: jsonb('details').default({}).notNull(),
    ipAddress: varchar('ip_address', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
);

// ==============================================================================
// 3. BRANDS & CATEGORIES
// ==============================================================================

export const brands = pgTable(
  'brands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description'),
    logoUrl: text('logo_url'),
    isFeatured: boolean('is_featured').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_brands_slug').on(table.slug),
  ]
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    displayOrder: integer('display_order').default(0).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_parent').on(table.parentId),
  ]
);

// ==============================================================================
// 4. CATALOG SOURCES & RAW SOURCE PRODUCTS
// ==============================================================================

export const catalogSources = pgTable(
  'catalog_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 60 }).notNull().unique(), // ex: 'casa_tech_supplier', 'supplier_feed_csv'
    name: varchar('name', { length: 150 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'csv' | 'json' | 'api'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_catalog_sources_code').on(table.code),
  ]
);

export const sourceProducts = pgTable(
  'source_products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => catalogSources.id, { onDelete: 'cascade' }),
    sourceRecordId: varchar('source_record_id', { length: 150 }).notNull(),
    sourceSku: varchar('source_sku', { length: 100 }),
    sourceBarcode: varchar('source_barcode', { length: 100 }),
    sourceName: varchar('source_name', { length: 255 }).notNull(),
    sourceDescription: text('source_description'),
    sourceCategory: varchar('source_category', { length: 150 }),
    sourceBrand: varchar('source_brand', { length: 150 }),
    sourcePrice: numeric('source_price', { precision: 12, scale: 2 }).notNull(),
    sourceRawStock: integer('source_raw_stock').default(0),
    sourceImageUrls: jsonb('source_image_urls').$type<string[]>().default([]).notNull(),
    sourceSpecifications: jsonb('source_specifications').$type<Record<string, string | number>>().default({}).notNull(),
    rawPayload: jsonb('raw_payload').default({}).notNull(),
    sourceChecksum: varchar('source_checksum', { length: 64 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // External identifiers are source-specific: composite unique on sourceId + sourceRecordId
    uniqueIndex('idx_source_products_composite').on(table.sourceId, table.sourceRecordId),
    index('idx_source_products_sku').on(table.sourceSku),
    index('idx_source_products_barcode').on(table.sourceBarcode),
  ]
);

// ==============================================================================
// 5. PRODUCTS (GENERIC MODEL / STORE IDENTITY)
// ==============================================================================

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 280 }).notNull().unique(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

    // STORE-CONTROLLED DATA
    seoTitle: varchar('seo_title', { length: 150 }),
    seoDescription: varchar('seo_description', { length: 255 }),
    isPublished: boolean('is_published').default(true).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    merchandisingPriority: integer('merchandising_priority').default(0).notNull(),
    customBadges: jsonb('custom_badges').$type<string[]>().default([]).notNull(),
    editorialNotes: text('editorial_notes'),

    // OVERRIDABLE DATA - Explicit Ownership tracking
    // Source derived vs store override
    derivedName: varchar('derived_name', { length: 255 }).notNull(),
    overrideName: varchar('override_name', { length: 255 }),
    isNameOverridden: boolean('is_name_overridden').default(false).notNull(),

    derivedDescription: text('derived_description'),
    overrideDescription: text('override_description'),
    isDescriptionOverridden: boolean('is_description_overridden').default(false).notNull(),

    // Base price reference (in MAD/DH). Variant prices take precedence if configured.
    derivedPrice: numeric('derived_price', { precision: 12, scale: 2 }).notNull(),
    overridePrice: numeric('override_price', { precision: 12, scale: 2 }),
    isPriceOverridden: boolean('is_price_overridden').default(false).notNull(),

    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 }),

    // Overrides metadata
    overridesMeta: jsonb('overrides_meta').$type<Record<string, { overriddenAt: string; overriddenBy?: string }>>().default({}).notNull(),

    // Availability status
    availabilityStatus: varchar('availability_status', { length: 40 }).default('in_stock').notNull(), // 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_products_slug').on(table.slug),
    index('idx_products_brand').on(table.brandId),
    index('idx_products_category').on(table.categoryId),
    index('idx_products_status').on(table.isPublished, table.availabilityStatus),
  ]
);

// ==============================================================================
// 6. PRODUCT VARIANTS (PHYSICALLY SELLABLE UNITS)
// ==============================================================================

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    
    // Optional identifier fields (Nullable as mandated)
    sku: varchar('sku', { length: 100 }),
    barcode: varchar('barcode', { length: 100 }),
    modelNumber: varchar('model_number', { length: 100 }),

    // Display identity
    name: varchar('name', { length: 150 }).notNull(), // ex: "128 Go / Noir Sidéral", "Édition Standard"
    isDefaultVariant: boolean('is_default_variant').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),

    // Attributes (key-value: capacity: '128GB', color: 'Noir')
    attributes: jsonb('attributes').$type<Record<string, string>>().default({}).notNull(),

    // Variant Price: if null, inherits from products.derivedPrice/overridePrice
    derivedPrice: numeric('derived_price', { precision: 12, scale: 2 }),
    overridePrice: numeric('override_price', { precision: 12, scale: 2 }),
    isPriceOverridden: boolean('is_price_overridden').default(false).notNull(),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),

    // Real verified technical specifications (never invented)
    specifications: jsonb('specifications').$type<Record<string, string | number>>().default({}).notNull(),

    isAvailable: boolean('is_available').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_variants_product').on(table.productId),
    index('idx_variants_sku').on(table.sku),
    index('idx_variants_barcode').on(table.barcode),
  ]
);

// ==============================================================================
// 7. PRODUCT-SOURCE MAPPINGS (MAPPING ABSTRACTION)
// ==============================================================================

export const productSourceMappings = pgTable(
  'product_source_mappings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => catalogSources.id, { onDelete: 'cascade' }),
    sourceProductId: uuid('source_product_id')
      .notNull()
      .references(() => sourceProducts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }).default('1.00').notNull(),
    needsManualReview: boolean('needs_manual_review').default(false).notNull(),
    reviewNotes: text('review_notes'),
    mappedAt: timestamp('mapped_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_source_variant_mapping').on(table.sourceId, table.sourceProductId, table.variantId),
    index('idx_mappings_product').on(table.productId),
    index('idx_mappings_review').on(table.needsManualReview),
  ]
);

// ==============================================================================
// 8. PRODUCT IMAGES (SOURCE VS LOCAL CITY STUDIO)
// ==============================================================================

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
    sourceUrl: text('source_url').notNull(),
    localPath: text('local_path'), // When CITY Électronique shoots its own photography
    imageSourceType: varchar('image_source_type', { length: 40 }).default('external_supplier').notNull(), // 'external_supplier' | 'city_studio' | 'brand_presskit'
    isPrimary: boolean('is_primary').default(false).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
    altText: varchar('alt_text', { length: 255 }).default('Photo produit CITY Électronique').notNull(),
    verificationStatus: varchar('verification_status', { length: 30 }).default('pending').notNull(), // 'pending' | 'verified' | 'broken'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_product_images_product').on(table.productId, table.displayOrder),
    index('idx_product_images_variant').on(table.variantId),
  ]
);

// ==============================================================================
// 9. INVENTORY SOURCES & ITEMS (VARIANT LEVEL)
// ==============================================================================

export const inventorySources = pgTable(
  'inventory_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 60 }).notNull().unique(), // ex: 'casa_maarif_showroom', 'ain_sebaa_depot'
    name: varchar('name', { length: 150 }).notNull(),
    type: varchar('type', { length: 50 }).default('physical_store').notNull(), // 'physical_store' | 'central_warehouse' | 'supplier_drop'
    isOnlineFulfillment: boolean('is_online_fulfillment').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_inventory_sources_code').on(table.code),
  ]
);

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    inventorySourceId: uuid('inventory_source_id')
      .notNull()
      .references(() => inventorySources.id, { onDelete: 'cascade' }),
    physicalQuantity: integer('physical_quantity').default(0).notNull(),
    reservedQuantity: integer('reserved_quantity').default(0).notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
    sourceTimestamp: timestamp('source_timestamp', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_inventory_variant_source').on(table.variantId, table.inventorySourceId),
    index('idx_inventory_variant').on(table.variantId),
  ]
);

// ==============================================================================
// 10. ORDERS & IMMUTABLE ORDER ITEMS SNAPSHOT
// ==============================================================================

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderReference: varchar('order_reference', { length: 60 }).notNull().unique(), // ex: 'CITY-2026-00491'
    channel: varchar('channel', { length: 40 }).default('whatsapp').notNull(), // 'whatsapp' | 'website' | 'phone' | 'glovo'
    status: varchar('status', { length: 40 }).default('pending').notNull(), // 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled'

    // Customer details
    customerName: varchar('customer_name', { length: 150 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 50 }).notNull(),
    customerCity: varchar('customer_city', { length: 100 }).notNull(),
    deliveryAddress: text('delivery_address'),

    // Financial totals (in MAD)
    currency: varchar('currency', { length: 10 }).default('MAD').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    shippingFee: numeric('shipping_fee', { precision: 12, scale: 2 }).default('0.00').notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),

    customerNotes: text('customer_notes'),
    adminNotes: text('admin_notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_orders_reference').on(table.orderReference),
    index('idx_orders_phone').on(table.customerPhone),
    index('idx_orders_status').on(table.status),
    index('idx_orders_created').on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    
    // Optional reference to current catalog (set null if variant deleted)
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),

    // IMMUTABLE PURCHASE SNAPSHOT
    capturedProductName: varchar('captured_product_name', { length: 255 }).notNull(),
    capturedVariantName: varchar('captured_variant_name', { length: 150 }).notNull(),
    capturedSku: varchar('captured_sku', { length: 100 }),
    capturedUnitPrice: numeric('captured_unit_price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    capturedLineTotal: numeric('captured_line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_order_items_order').on(table.orderId),
  ]
);

// ==============================================================================
// 11. CATALOG IMPORTS & STAGED IMPORT ITEMS
// ==============================================================================

export const catalogImports = pgTable(
  'catalog_imports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => catalogSources.id, { onDelete: 'cascade' }),
    importNumber: integer('import_number').notNull(),
    filename: varchar('filename', { length: 255 }),
    isFullSnapshot: boolean('is_full_snapshot').default(false).notNull(),
    status: varchar('status', { length: 40 }).default('dry_run_ready').notNull(), // 'dry_run_ready' | 'committed' | 'blocked_safety' | 'failed'
    
    // Counts
    totalRecordsReceived: integer('total_records_received').default(0).notNull(),
    wouldCreateCount: integer('would_create_count').default(0).notNull(),
    wouldUpdateCount: integer('would_update_count').default(0).notNull(),
    wouldDeactivateCount: integer('would_deactivate_count').default(0).notNull(),
    unchangedCount: integer('unchanged_count').default(0).notNull(),
    errorCount: integer('error_count').default(0).notNull(),

    // Safety checks
    safetyThresholdTriggered: boolean('safety_threshold_triggered').default(false).notNull(),
    safetyDropPercentage: numeric('safety_drop_percentage', { precision: 5, scale: 2 }),
    adminOverrideSafety: boolean('admin_override_safety').default(false).notNull(),
    adminOverrideReason: text('admin_override_reason'),
    approvedByUserId: uuid('approved_by_user_id').references(() => adminUsers.id, { onDelete: 'set null' }),

    errorLog: jsonb('error_log').$type<Array<{ row: number; error: string; data?: unknown }>>().default([]).notNull(),

    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    committedAt: timestamp('committed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_catalog_imports_source').on(table.sourceId),
    index('idx_catalog_imports_status').on(table.status),
  ]
);

export const catalogImportItems = pgTable(
  'catalog_import_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    importId: uuid('import_id')
      .notNull()
      .references(() => catalogImports.id, { onDelete: 'cascade' }),
    sourceRecordId: varchar('source_record_id', { length: 150 }).notNull(),
    action: varchar('action', { length: 30 }).notNull(), // 'create' | 'update' | 'deactivate' | 'unchanged' | 'error'
    diffSummary: jsonb('diff_summary').$type<Record<string, { from: unknown; to: unknown; overriddenBlocked?: boolean }>>().default({}).notNull(),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('idx_import_items_import').on(table.importId),
    index('idx_import_items_action').on(table.action),
  ]
);

// ==============================================================================
// DRIZZLE RELATIONS DEFINITION
// ==============================================================================

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
  mappings: many(productSourceMappings),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventoryItems: many(inventoryItems),
  images: many(productImages),
  mappings: many(productSourceMappings),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  variant: one(productVariants, { fields: [inventoryItems.variantId], references: [productVariants.id] }),
  source: one(inventorySources, { fields: [inventoryItems.inventorySourceId], references: [inventorySources.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));
