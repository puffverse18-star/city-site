# CITY Électronique Morocco — Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

---

## [Phase 3] - 2026-03-20

### Added
- **Admin Operational Dashboard (`/admin`)**:
  - Live KPI metric ribbons (Total SKUs, Active Products, Low Stock alerts, Pending Reviews, Protected Overrides, Media Verification stats).
  - Real-time recent catalog import cards with status indicators and snapshot safety alerts.
  - Active audit stream view with action badges and timestamps.
  - Quick action routing to products, inventory adjustments, and catalog import wizard.
- **Product Catalog Management (`/admin/products`, `/admin/products/[id]`)**:
  - Search and multi-facet filtering (Category, Brand, Publication status, Missing SKU/Barcode flags, Needs Review, Low Stock).
  - Editorial and SEO metadata management (Moroccan store context, French/Arabic metadata).
  - Product creation wizard with automated slug and default variant provisioning.
  - Granular variant management with specification key-values.
- **Catalog Ownership & Override Engine**:
  - Three-tier field ownership: Source-derived, Store-managed, and Manual Overrides.
  - Price and name override capabilities with visual badges.
  - Deterministic restoration of source values upon override removal.
- **Catalog Import Pipeline & Diff Engine (`/admin/imports`)**:
  - Multi-source adapter pipeline with support for CSV and JSON supplier feeds.
  - Conservative identity matching hierarchy:
    1. Exact source record identifier (`sourceCode` + `sourceRecordId`).
    2. Exact barcode match (with collision detection for duplicates).
    3. Exact SKU match (with collision detection).
    4. Exact model number match (with collision detection).
  - Comprehensive Diff Engine supporting all 6 standard actions:
    - `CREATE`: New supplier records without prior catalog identity.
    - `UPDATE`: Existing items with detected source modifications (protecting active store overrides).
    - `UNCHANGED`: Identical incoming data.
    - `DEACTIVATE`: Items absent from a validated complete snapshot.
    - `MANUAL_REVIEW`: Ambiguous records or collision matches requiring operator review.
    - `ERROR`: Corrupted rows, invalid numeric prices, empty mandatory fields, or safety-blocked operations.
- **Snapshot Safety Guard (15% Threshold)**:
  - Evaluation engine blocking mass deactivation if incoming complete snapshot drops >15% compared to previous count.
  - Exclusive Superadmin override authorization requiring mandatory rationale (minimum 10 characters).
  - Partial snapshot protection preventing absence-based deactivations.
- **Derived Inventory Management (`/admin/inventory`)**:
  - Multi-location stock overview (Showroom Maârif Casablanca, Dépôt Central Aïn Sebaâ).
  - Strict available stock derivation formula: `Math.max(0, physicalStock - reservedStock)`.
  - Manual inventory adjustments (delta and absolute count) with mandatory audit justification.
- **Media Asset Verification (`/admin/images`)**:
  - Verification workflow for primary, secondary, and gallery images.
  - Status tracking: Pending review, Verified, and Rejected.
- **Immutable Audit Trail (`/admin/audit`)**:
  - Complete immutable logging for all administrative mutations (`product.create`, `product.update`, `product.override_price`, `product.remove_override`, `inventory.adjust`, `import.dry_run`, `import.commit`, `import.safety_override`, `image.verify`).
  - Search, entity filtering, and action filtering API and UI.
- **True Server-Side RBAC & Session Security (`lib/auth/session.ts`)**:
  - Server-side session verification for all `/api/admin/*` endpoints.
  - Role enforcement:
    - `superadmin`: Full administrative access, safety guard override, inventory, catalog.
    - `admin`: Operational catalog edits, stock adjustments, regular import commit. Cannot override safety guard.
    - `catalog_manager`: Editorial catalog and media verification. Cannot adjust inventory, cannot commit imports, cannot override safety.
  - Strict production guard blocking privilege escalation / role switching when `NODE_ENV === 'production'`.
  - File upload security: 10MB payload limit, file type validation (`csv`, `json`), filename path-traversal sanitization.
- **Test Suite**:
  - 24 comprehensive Phase 3 verification tests covering RBAC boundaries, production session guard, all 6 diff actions, identity matching priority, safety thresholds, inventory derivation, and audit trails.

---

## [Phase 2] - 2026-03-20

### Added
- Premium customer storefront for CITY Électronique Morocco.
- Responsive navigation header and category routing.
- Moroccan Dirham currency formatting (`DH` symbol, French locale formatting).
- Direct WhatsApp order generation formatted for Moroccan phone numbers (`212600000000`).
- Multi-attribute variant selector (Storage, Color, Connectivity).
- Real-time stock availability indicators with physical store pickup notes (Maârif, Casablanca).
- Product search, category filtering, and sorting UI.
- SEO-ready product metadata and OpenGraph structured data.
- 7 comprehensive Phase 2 verification tests.

---

## [Phase 1] - 2026-03-20

### Added
- Core architecture foundation with PostgreSQL and Drizzle ORM.
- 17 relational database tables supporting catalog, variants, multi-location inventory, orders, snapshots, sources, overrides, and audit logs.
- Immutable order item snapshots.
- Glovo and uniCenta integration adapter specifications.
- Snapshot safety guard specifications (15% drop threshold).
- 15 comprehensive Phase 1 verification tests.
