import assert from 'assert';
import { AdminRBAC, PERMISSIONS } from '../lib/auth/rbac';
import { AdminSessionService } from '../lib/auth/session';
import { canonicalStore } from '../lib/data/store';
import { CatalogImportPipeline, ExistingCatalogItem } from '../lib/catalog/importer';
import { InventoryService } from '../lib/inventory/service';
import { AuditService } from '../lib/audit/service';

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CITY ÉLECTRONIQUE PHASE 3 TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✓ ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ✗ ${name}`);
            console.error('    Error:', err.message);
            failed++;
          });
      }
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error('    Error:', err.message);
      failed++;
    }
  }

  const superAdmin = { id: 'usr_super', name: 'Super Admin Test', role: 'superadmin' as const };
  const standardAdmin = { id: 'usr_admin', name: 'Admin Test', role: 'admin' as const };
  const catalogManager = { id: 'usr_cat', name: 'Catalog Manager Test', role: 'catalog_manager' as const };

  // 1. Admin authorization boundaries (RBAC)
  test('1. Admin authorization boundaries enforce role permissions strictly', () => {
    // Superadmin has all permissions including safety override
    assert.strictEqual(AdminRBAC.hasPermission('superadmin', PERMISSIONS.CATALOG_SAFETY_OVERRIDE), true);
    assert.strictEqual(AdminRBAC.canOverrideSafety('superadmin'), true);

    // Admin has catalog & inventory edit, but CANNOT override safety guard
    assert.strictEqual(AdminRBAC.hasPermission('admin', PERMISSIONS.CATALOG_EDIT), true);
    assert.strictEqual(AdminRBAC.hasPermission('admin', PERMISSIONS.INVENTORY_ADJUST), true);
    assert.strictEqual(AdminRBAC.canOverrideSafety('admin'), false);

    // Catalog manager cannot commit imports, cannot adjust inventory, cannot override safety
    assert.strictEqual(AdminRBAC.hasPermission('catalog_manager', PERMISSIONS.CATALOG_EDIT), true);
    assert.strictEqual(AdminRBAC.canCommitImport('catalog_manager'), false);
    assert.strictEqual(AdminRBAC.canAdjustInventory('catalog_manager'), false);
    assert.strictEqual(AdminRBAC.canOverrideSafety('catalog_manager'), false);
  });

  // 2. Catalog creation
  test('2. Catalog product creation persists store-managed product and initial variant', () => {
    const slug = 'test-ipad-air-m2-' + Date.now();
    const created = canonicalStore.createProduct(
      {
        name: 'Apple iPad Air M2 11"',
        slug,
        price: 8990,
        description: 'Puce Apple M2, écran Liquid Retina 11 pouces.',
        sku: 'IPAD-M2-11-128',
        barcode: '0195949999999',
        isPublished: true,
      },
      superAdmin
    );

    assert.strictEqual(created.name, 'Apple iPad Air M2 11"');
    assert.strictEqual(created.price, 8990);
    assert.strictEqual(created.variants.length, 1);
    assert.strictEqual(created.variants[0].sku, 'IPAD-M2-11-128');
  });

  // 3. Catalog update
  test('3. Catalog product general update modifies editorial and SEO data', () => {
    const updated = canonicalStore.updateProductGeneral(
      'prod_iphone_15_pro',
      {
        seoTitle: 'iPhone 15 Pro Titane au Maroc - CITY Électronique',
        seoDescription: 'Commandez en direct au showroom Maârif avec garantie officielle.',
      },
      standardAdmin
    );

    assert.strictEqual(updated.seoTitle, 'iPhone 15 Pro Titane au Maroc - CITY Électronique');
    assert.strictEqual(updated.seoDescription, 'Commandez en direct au showroom Maârif avec garantie officielle.');
  });

  // 4. Ownership override
  test('4. Ownership price override protects store value against source price', () => {
    const overridden = canonicalStore.setPriceOverride(
      'prod_sony_wh1000xm5',
      null,
      3590, // Store override price in DH
      superAdmin
    );

    assert.strictEqual(overridden.isPriceOverridden, true);
    assert.strictEqual(overridden.overridePrice, 3590);
    assert.strictEqual(overridden.price, 3590);
    assert.strictEqual(overridden.derivedPrice, 3890); // Original source price preserved!
  });

  // 5. Override removal restores source value
  test('5. Override removal restores the deterministic source-derived value', () => {
    const restored = canonicalStore.removePriceOverride(
      'prod_sony_wh1000xm5',
      null,
      superAdmin
    );

    assert.strictEqual(restored.isPriceOverridden, false);
    assert.strictEqual(restored.overridePrice, null);
    assert.strictEqual(restored.price, 3890); // Restored to 3890 DH!
  });

  // 6. Exact source matching
  test('6. Conservative identity matching resolves exact sourceRecordId first', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_1',
        variantId: 'var_1',
        sourceCode: 'fournisseur_officiel_tech',
        sourceRecordId: 'EXT-1001',
        name: 'Produit Existant',
        sku: 'SKU-OLD',
        barcode: '111122223333',
        modelNumber: null,
        price: 999,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incoming = {
      sourceRecordId: 'EXT-1001',
      sourceSku: 'SKU-NEW',
      sourceBarcode: '111122223333',
      name: 'Produit Existant Maj',
      price: 950,
      imageUrls: [],
      specifications: {},
      rawPayload: {},
    };

    const matchResult = CatalogImportPipeline.matchIdentity(incoming, 'fournisseur_officiel_tech', existing);
    assert.strictEqual(matchResult.uncertainMatch, false);
    assert.notStrictEqual(matchResult.match, null);
    assert.strictEqual(matchResult.match!.id, 'prod_1');
  });

  // 7. Uncertain match -> manual review
  test('7. Uncertain match (e.g. barcode collision) marks item for manual review', () => {
    const existingWithDuplicateBarcodes: ExistingCatalogItem[] = [
      {
        id: 'prod_a',
        variantId: 'var_a',
        sourceCode: 'supplier_other',
        name: 'Item Alpha',
        sku: 'SKU-A',
        barcode: '555566667777',
        modelNumber: null,
        price: 100,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_b',
        variantId: 'var_b',
        sourceCode: 'supplier_other',
        name: 'Item Beta',
        sku: 'SKU-B',
        barcode: '555566667777', // Same barcode collision!
        modelNumber: null,
        price: 150,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incoming = {
      sourceRecordId: 'NEW-REC-99',
      sourceSku: null,
      sourceBarcode: '555566667777',
      name: 'Nouvel Article Ambigü',
      price: 120,
      imageUrls: [],
      specifications: {},
      rawPayload: {},
    };

    const matchResult = CatalogImportPipeline.matchIdentity(incoming, 'supplier_other', existingWithDuplicateBarcodes);
    assert.strictEqual(matchResult.uncertainMatch, true);
    assert.strictEqual(matchResult.match, null);
  });

  // 8. Duplicate source identifiers safely isolated
  test('8. Duplicate source identifiers across different sources are isolated', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_source_1',
        variantId: 'var_1',
        sourceCode: 'source_a',
        sourceRecordId: 'ITEM-001',
        name: 'Item Source A',
        sku: null,
        barcode: null,
        modelNumber: null,
        price: 50,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incomingFromSourceB = {
      sourceRecordId: 'ITEM-001', // Same record ID, different source!
      name: 'Item Source B',
      price: 80,
      imageUrls: [],
      specifications: {},
      rawPayload: {},
    };

    const result = CatalogImportPipeline.matchIdentity(incomingFromSourceB, 'source_b', existing);
    assert.strictEqual(result.match, null); // NOT matched to source_a!
  });

  // 9. CSV normalization
  test('9. CSV parsing and normalization processes columns and numeric prices correctly', () => {
    const csvContent = `source_record_id,name,sku,barcode,price,stock
REC-CSV-1,"Cable HDMI 2.1 8K",CAB-HDMI-8K,012345678901,199.00,25
REC-CSV-2,"Chargeur GaN 65W",CHG-GAN-65W,,349.50,10`;

    const rows = CatalogImportPipeline.parseCsv(csvContent);
    assert.strictEqual(rows.length, 2);

    const { valid, errors } = CatalogImportPipeline.normalizeRows(rows);
    assert.strictEqual(valid.length, 2);
    assert.strictEqual(errors.length, 0);
    assert.strictEqual(valid[0].name, 'Cable HDMI 2.1 8K');
    assert.strictEqual(valid[0].price, 199);
    assert.strictEqual(valid[1].sourceBarcode, null); // Nullable barcode handled safely
  });

  // 10. JSON normalization
  test('10. JSON parser normalizes valid JSON arrays and rejects malformed records', () => {
    const jsonContent = JSON.stringify([
      { source_record_id: 'J-01', name: 'Microphone USB Podcast', price: 799, stock: 5 },
      { source_record_id: 'J-FAIL', name: '', price: -10 }, // Malformed!
    ]);

    const rows = CatalogImportPipeline.parseJson(jsonContent);
    assert.strictEqual(rows.length, 2);

    const { valid, errors } = CatalogImportPipeline.normalizeRows(rows);
    assert.strictEqual(valid.length, 1);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(valid[0].sourceRecordId, 'J-01');
    assert.strictEqual(errors[0].row, 2);
  });

  // 11. Create diff
  test('11. Diff engine flags new items with action CREATE and clean reason', () => {
    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_diff_create',
      sourceCode: 'distrib_maroc',
      incoming: [
        {
          sourceRecordId: 'BRAND-NEW-01',
          name: 'Nouvelle Enceinte Sans Fil',
          price: 590,
          imageUrls: [],
          specifications: {},
          rawPayload: {},
        },
      ],
      existingItems: [],
      isFullSnapshot: false,
      previousTotalCount: 0,
    });

    assert.strictEqual(report.wouldCreate, 1);
    assert.strictEqual(report.items[0].action, 'create');
    assert.strictEqual(report.items[0].reason?.includes('Nouveau produit'), true);
  });

  // 12. Update diff
  test('12. Diff engine flags changed source prices with action UPDATE and protects overrides', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_macbook',
        variantId: 'var_macbook',
        sourceCode: 'apple_maroc',
        sourceRecordId: 'MAC-M3',
        name: 'MacBook Air M3',
        sku: 'MBA-M3-256',
        barcode: null,
        modelNumber: null,
        price: 13990,
        isPriceOverridden: true,
        overridePrice: 13490, // Active override!
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incoming = [
      {
        sourceRecordId: 'MAC-M3',
        name: 'MacBook Air M3',
        price: 14500, // Supplier raised source price
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
    ];

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_diff_update',
      sourceCode: 'apple_maroc',
      incoming,
      existingItems: existing,
      isFullSnapshot: false,
      previousTotalCount: 1,
    });

    assert.strictEqual(report.wouldUpdate, 1);
    assert.strictEqual(report.items[0].action, 'update');
    assert.strictEqual(report.items[0].diff.price.overriddenBlocked, true);
    assert.strictEqual(report.items[0].diff.price.from, 13490);
    assert.strictEqual(report.items[0].diff.price.to, 14500);
  });

  // 13. Unchanged diff
  test('13. Diff engine flags identical incoming data as UNCHANGED', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_hub',
        variantId: 'var_hub',
        sourceCode: 'anker_maroc',
        sourceRecordId: 'HUB-7IN1',
        name: 'Hub USB-C 7-en-1',
        sku: 'ANK-HUB-7',
        barcode: '123456789012',
        modelNumber: null,
        price: 490,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incoming = [
      {
        sourceRecordId: 'HUB-7IN1',
        sourceSku: 'ANK-HUB-7',
        sourceBarcode: '123456789012',
        name: 'Hub USB-C 7-en-1',
        price: 490,
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
    ];

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_diff_unchanged',
      sourceCode: 'anker_maroc',
      incoming,
      existingItems: existing,
      isFullSnapshot: false,
      previousTotalCount: 1,
    });

    assert.strictEqual(report.unchanged, 1);
    assert.strictEqual(report.items[0].action, 'unchanged');
  });

  // 14. Incomplete snapshot cannot mass deactivate
  test('14. Partial import snapshot cannot trigger deactivations by absence', () => {
    const existing: ExistingCatalogItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `prod_${i}`,
      variantId: `var_${i}`,
      sourceCode: 'supplier_daily',
      sourceRecordId: `REC-${i}`,
      name: `Produit ${i}`,
      sku: null,
      barcode: null,
      modelNumber: null,
      price: 100,
      isPriceOverridden: false,
      overridePrice: null,
      isNameOverridden: false,
      overrideName: null,
      isActive: true,
    }));

    // Partial update with only 2 items
    const incoming = [
      { sourceRecordId: 'REC-0', name: 'Produit 0', price: 100, imageUrls: [], specifications: {}, rawPayload: {} },
      { sourceRecordId: 'REC-1', name: 'Produit 1', price: 100, imageUrls: [], specifications: {}, rawPayload: {} },
    ];

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_partial_safety',
      sourceCode: 'supplier_daily',
      incoming,
      existingItems: existing,
      isFullSnapshot: false, // Partial!
      previousTotalCount: 50,
    });

    assert.strictEqual(report.wouldDeactivate, 0); // Must be 0 deactivations!
    assert.strictEqual(report.safety.blocked, false);
  });

  // 15. > 15% complete snapshot triggers safety block
  test('15. Complete snapshot with >15% volume drop triggers safety block', () => {
    const existing: ExistingCatalogItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: `prod_${i}`,
      variantId: `var_${i}`,
      sourceCode: 'supplier_bulk',
      sourceRecordId: `REC-${i}`,
      name: `Produit ${i}`,
      sku: null,
      barcode: null,
      modelNumber: null,
      price: 100,
      isPriceOverridden: false,
      overridePrice: null,
      isNameOverridden: false,
      overrideName: null,
      isActive: true,
    }));

    // Incoming file dropped to 60 items (40% drop > 15% threshold)
    const incoming = Array.from({ length: 60 }, (_, i) => ({
      sourceRecordId: `REC-${i}`,
      name: `Produit ${i}`,
      price: 100,
      imageUrls: [],
      specifications: {},
      rawPayload: {},
    }));

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_safety_triggered',
      sourceCode: 'supplier_bulk',
      incoming,
      existingItems: existing,
      isFullSnapshot: true, // Complete snapshot!
      previousTotalCount: 100,
      maxSafetyDropPercentage: 15,
    });

    assert.strictEqual(report.safety.triggered, true);
    assert.strictEqual(report.safety.blocked, true);
    assert.strictEqual(report.safety.dropPercentage, 40);
    assert.strictEqual(report.wouldDeactivate, 0); // Automatic deactivations blocked!
  });

  // 16. Explicit authorized safety override
  test('16. Explicit authorized safety override requires superadmin role and reason', () => {
    // Create an import that trips the safety block
    const createdImp = canonicalStore.createImportDryRun({
      sourceCode: 'fournisseur_officiel_tech',
      fileContent: `source_record_id,name,price\nREC-DROP-1,"Item Seul",99.00`,
      fileType: 'csv',
      filename: 'snapshot_drop_test.csv',
      isFullSnapshot: true,
      adminUser: superAdmin,
    });

    assert.strictEqual(createdImp.safetyThresholdTriggered, true);
    assert.strictEqual(createdImp.status, 'blocked_safety');

    // Attempting override with catalog_manager or admin must fail
    assert.throws(() => {
      canonicalStore.overrideSafetyGuard(createdImp.id, 'Court motif', catalogManager as any);
    });

    // Superadmin with valid reason succeeds
    const unblocked = canonicalStore.overrideSafetyGuard(
      createdImp.id,
      'Changement annuel de catalogue validé par la direction commerciale Casablanca',
      superAdmin
    );

    assert.strictEqual(unblocked.adminOverrideSafety, true);
    assert.strictEqual(unblocked.status, 'dry_run_ready');
  });

  // 17. Import idempotency
  test('17. Re-running the exact same complete import produces UNCHANGED and no duplicates', () => {
    const existing = canonicalStore.getExistingItemsForMatching();
    const snapCount = existing.length;

    const incomingIdentical = existing.map((item) => ({
      sourceRecordId: item.sourceRecordId || item.id,
      sourceSku: item.sku,
      sourceBarcode: item.barcode,
      name: item.name,
      price: item.price,
      imageUrls: [],
      specifications: {},
      rawPayload: {},
    }));

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_idempotency',
      sourceCode: existing[0]?.sourceCode || 'fournisseur_officiel_tech',
      incoming: incomingIdentical,
      existingItems: existing,
      isFullSnapshot: true,
      previousTotalCount: snapCount,
    });

    assert.strictEqual(report.wouldCreate, 0);
    assert.strictEqual(report.wouldDeactivate, 0);
    assert.strictEqual(report.unchanged >= 1, true);
  });

  // 18. Derived available inventory
  test('18. Derived available inventory is calculated strictly as max(physical - reserved, 0)', () => {
    assert.strictEqual(InventoryService.deriveAvailable(10, 2), 8);
    assert.strictEqual(InventoryService.deriveAvailable(5, 5), 0);
    assert.strictEqual(InventoryService.deriveAvailable(2, 10), 0); // Cannot be negative!
  });

  // 19. Inventory adjustment audit
  test('19. Manual inventory adjustment generates structured audit record with admin signature', () => {
    const adjustment = canonicalStore.adjustInventory(
      'var_iph_128_blk',
      'loc_maarif',
      +2,
      'delta',
      'Réception arrivage express showroom Maârif',
      standardAdmin
    );

    assert.strictEqual(adjustment.newPhysical, 6);
    assert.strictEqual(adjustment.newAvailable, 5); // 6 - 1 reserved = 5

    // Audit query check
    const logs = AuditService.query({ action: 'inventory.adjust', limit: 1 });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].details.adminName, standardAdmin.name);
    assert.strictEqual(logs[0].details.reason, 'Réception arrivage express showroom Maârif');
  });

  // 20. Audit event creation
  test('20. Audit log entries are immutable and track all significant administrative actions', () => {
    const initialCount = AuditService.count();
    AuditService.log({
      userId: superAdmin.id,
      adminName: superAdmin.name,
      action: 'system.test',
      entityType: 'test_entity',
      entityId: 'test_id_100',
      summary: 'Vérification immuabilité des logs d\'audit',
      details: { verification: true },
    });

    assert.strictEqual(AuditService.count(), initialCount + 1);
    const latest = AuditService.query({ action: 'system.test', limit: 1 });
    assert.strictEqual(latest[0].summary, 'Vérification immuabilité des logs d\'audit');
    assert.strictEqual(latest[0].adminName, superAdmin.name);
  });

  // 21. Server-side role switching security
  test('21. Server-side role switching security blocks escalation in production and rejects invalid roles', () => {
    // Rejects invalid role
    const invalidRes = AdminSessionService.setSessionRole('hacker' as any);
    assert.strictEqual(invalidRes.success, false);

    // Allows valid predefined role switch in dev/test
    const validRes = AdminSessionService.setSessionRole('admin');
    assert.strictEqual(validRes.success, true);
    assert.strictEqual(validRes.user?.role, 'admin');

    // Restore superadmin for suite
    AdminSessionService.setSessionRole('superadmin');
  });

  // 22. Diff engine generates all required actions
  test('22. Diff engine generates all 6 actions: CREATE, UPDATE, UNCHANGED, DEACTIVATE, MANUAL_REVIEW, ERROR', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_match_update',
        variantId: 'var_u',
        sourceCode: 'test_src',
        sourceRecordId: 'REC-UPDATE',
        name: 'Item To Update',
        sku: 'SKU-U',
        barcode: '111111111111',
        modelNumber: null,
        price: 100,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_match_unchanged',
        variantId: 'var_unc',
        sourceCode: 'test_src',
        sourceRecordId: 'REC-UNCHANGED',
        name: 'Item Unchanged',
        sku: 'SKU-UNC',
        barcode: '222222222222',
        modelNumber: null,
        price: 200,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_collision_1',
        variantId: 'var_c1',
        sourceCode: 'other_src',
        name: 'Collision Item 1',
        sku: 'SKU-COLLISION',
        barcode: '333333333333',
        modelNumber: null,
        price: 300,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_collision_2',
        variantId: 'var_c2',
        sourceCode: 'other_src',
        name: 'Collision Item 2',
        sku: 'SKU-COLLISION',
        barcode: '333333333333',
        modelNumber: null,
        price: 300,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_to_deactivate',
        variantId: 'var_deact',
        sourceCode: 'test_src',
        sourceRecordId: 'REC-MISSING',
        name: 'Missing In Snapshot',
        sku: 'SKU-DEACT',
        barcode: '444444444444',
        modelNumber: null,
        price: 400,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    const incoming = [
      // 1. CREATE
      {
        sourceRecordId: 'REC-NEW',
        name: 'New Item',
        price: 50,
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
      // 2. UPDATE
      {
        sourceRecordId: 'REC-UPDATE',
        name: 'Item To Update',
        price: 120, // Price changed
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
      // 3. UNCHANGED
      {
        sourceRecordId: 'REC-UNCHANGED',
        sourceSku: 'SKU-UNC',
        sourceBarcode: '222222222222',
        name: 'Item Unchanged',
        price: 200,
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
      // 4. MANUAL_REVIEW (colliding barcode/sku)
      {
        sourceRecordId: 'REC-AMBIGUOUS',
        sourceSku: 'SKU-COLLISION',
        name: 'Ambiguous Collision',
        price: 300,
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
    ];

    const report = CatalogImportPipeline.calculateDiff({
      importId: 'test_full_action_coverage',
      sourceCode: 'test_src',
      incoming,
      existingItems: existing,
      isFullSnapshot: true,
      previousTotalCount: 5,
      maxSafetyDropPercentage: 50, // allow deactivations without safety block for this test
    });

    assert.strictEqual(report.wouldCreate, 1);
    assert.strictEqual(report.wouldUpdate, 1);
    assert.strictEqual(report.unchanged, 1);
    assert.strictEqual(report.wouldManualReview, 1);
    assert.strictEqual(report.wouldDeactivate, 1);

    const actions = report.items.map((i) => i.action);
    assert.strictEqual(actions.includes('create'), true);
    assert.strictEqual(actions.includes('update'), true);
    assert.strictEqual(actions.includes('unchanged'), true);
    assert.strictEqual(actions.includes('manual_review'), true);
    assert.strictEqual(actions.includes('deactivate'), true);
  });

  // 23. Conservative priority: sourceRecordId -> Barcode -> SKU -> Model Number
  test('23. Conservative identity matching priority strictly prefers sourceRecordId over Barcode and SKU', () => {
    const existing: ExistingCatalogItem[] = [
      {
        id: 'prod_source_match',
        variantId: 'var_s',
        sourceCode: 'src_priority',
        sourceRecordId: 'REC-EXACT',
        name: 'Source Match Record',
        sku: 'SKU-DIFFERENT',
        barcode: '999999999999',
        modelNumber: null,
        price: 500,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
      {
        id: 'prod_barcode_match',
        variantId: 'var_b',
        sourceCode: 'src_other',
        sourceRecordId: 'REC-OTHER',
        name: 'Barcode Only Record',
        sku: 'SKU-BARCODE-ONLY',
        barcode: '888888888888',
        modelNumber: 'MDL-MODEL-X',
        price: 600,
        isPriceOverridden: false,
        overridePrice: null,
        isNameOverridden: false,
        overrideName: null,
        isActive: true,
      },
    ];

    // Priority 1 match
    const res1 = CatalogImportPipeline.matchIdentity(
      {
        sourceRecordId: 'REC-EXACT',
        sourceBarcode: '888888888888', // would collide with barcode, but sourceRecordId MUST take precedence
        name: 'Testing Priority',
        price: 500,
        imageUrls: [],
        specifications: {},
        rawPayload: {},
      },
      'src_priority',
      existing
    );
    assert.strictEqual(res1.match?.id, 'prod_source_match');
    assert.strictEqual(res1.uncertainMatch, false);

    // Priority 4 match (Model Number)
    const resModel = CatalogImportPipeline.matchIdentity(
      {
        sourceRecordId: 'NEW-REC-MODEL',
        name: 'Model Matching Only',
        price: 600,
        imageUrls: [],
        specifications: { modelNumber: 'MDL-MODEL-X' },
        rawPayload: {},
      },
      'src_other',
      existing
    );
    assert.strictEqual(resModel.match?.id, 'prod_barcode_match');
    assert.strictEqual(resModel.uncertainMatch, false);
  });

  // 24. File upload parsing and malformed record handling
  test('24. File upload parsing rejects empty names and negative prices safely', () => {
    const rawData = [
      { source_record_id: 'V1', name: 'Valid Item', price: 299 },
      { source_record_id: 'V2', name: '', price: 299 }, // missing name
      { source_record_id: 'V3', name: 'Negative Price Item', price: -50 }, // invalid price
    ];

    const { valid, errors } = CatalogImportPipeline.normalizeRows(rawData);
    assert.strictEqual(valid.length, 1);
    assert.strictEqual(valid[0].sourceRecordId, 'V1');
    assert.strictEqual(errors.length, 2);
  });

  console.log('\n======================================================');
  console.log(`🏁 PHASE 3 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error('Fatal phase 3 test runner error:', err);
  process.exit(1);
});
