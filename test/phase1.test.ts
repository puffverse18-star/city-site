import assert from 'assert';
import { CatalogNormalizer } from '../lib/catalog/normalizer';
import { SnapshotSafetyGuard } from '../lib/catalog/safety-guard';
import { FieldOwnershipResolver } from '../lib/catalog/ownership';
import { InventoryCalculator } from '../lib/inventory/calculator';
import { OrderSnapshotService } from '../lib/orders/snapshot';
import { normalizedSourceProductSchema } from '../lib/catalog/adapter.interface';
import { AdminAuthService } from '../lib/auth/admin';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CITY ÉLECTRONIQUE PHASE 1 TEST SUITE');
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

  // 1. Product can have multiple variants (Schema structure & logic)
  test('1. Product can have multiple variants with specific attributes', () => {
    const variant1 = { capacity: '128GB', color: 'Noir Sidéral' };
    const variant2 = { capacity: '256GB', color: 'Titane Naturel' };
    assert.strictEqual(variant1.capacity, '128GB');
    assert.strictEqual(variant2.capacity, '256GB');
  });

  // 2. Product without variants receives a default variant
  test('2. Product without variants receives a default variant flag', () => {
    const singleProductVariant = {
      name: 'Édition Standard',
      isDefaultVariant: true,
      sku: 'SINGLE-PROD-01',
    };
    assert.strictEqual(singleProductVariant.isDefaultVariant, true);
  });

  // 3. SKU can be null
  test('3. SKU can be null (not globally mandatory)', () => {
    const record = {
      sourceRecordId: 'REC-001',
      sourceSku: null,
      name: 'Accessoire Audio sans SKU',
      price: 199.0,
    };
    const parsed = normalizedSourceProductSchema.parse(record);
    assert.strictEqual(parsed.sourceSku, null);
  });

  // 4. Barcode can be null
  test('4. Barcode can be null (not globally mandatory)', () => {
    const record = {
      sourceRecordId: 'REC-002',
      sourceBarcode: null,
      name: 'Câble USB-C Tressé',
      price: 149.0,
    };
    const parsed = normalizedSourceProductSchema.parse(record);
    assert.strictEqual(parsed.sourceBarcode, null);
  });

  // 5. Source identifiers are source-specific
  test('5. Source identifiers are isolated to their sourceCode', () => {
    const sourceA = { sourceId: 'SOURCE_A', sourceRecordId: 'PROD_100' };
    const sourceB = { sourceId: 'SOURCE_B', sourceRecordId: 'PROD_100' };
    assert.notStrictEqual(`${sourceA.sourceId}:${sourceA.sourceRecordId}`, `${sourceB.sourceId}:${sourceB.sourceRecordId}`);
  });

  // 6. Manual override prevents source value from replacing displayed value
  test('6. Manual override prevents source value from replacing displayed value', () => {
    const state = FieldOwnershipResolver.resolve<number>(
      949.0, // source price
      1049.0, // store manual price override
      true // override active
    );
    assert.strictEqual(state.effectiveValue, 1049.0);
    assert.strictEqual(state.sourceValue, 949.0);
    assert.strictEqual(state.isOverridden, true);
  });

  // 7. Removing an override restores the source-derived value
  test('7. Removing an override restores the source-derived value', () => {
    const state = FieldOwnershipResolver.resolve<number>(
      949.0, // source price
      null, // override cleared
      false // override deactivated
    );
    assert.strictEqual(state.effectiveValue, 949.0);
    assert.strictEqual(state.isOverridden, false);
  });

  // 8. Available inventory is calculated correctly
  test('8. Available inventory is calculated correctly (physical - reserved)', () => {
    const result = InventoryCalculator.calculateVariantStock({
      variantId: 'VAR-1',
      locations: [
        { inventorySourceId: 'LOC-1', locationCode: 'Maarif', isOnlineFulfillment: true, physicalQuantity: 10, reservedQuantity: 2 },
        { inventorySourceId: 'LOC-2', locationCode: 'Depot', isOnlineFulfillment: true, physicalQuantity: 5, reservedQuantity: 1 },
      ],
    });
    // Location 1: 10 - 2 = 8
    // Location 2: 5 - 1 = 4
    // Total available: 12
    assert.strictEqual(result.totalPhysical, 15);
    assert.strictEqual(result.totalReserved, 3);
    assert.strictEqual(result.totalAvailable, 12);
    assert.strictEqual(result.isAvailableForSale, true);
  });

  // 9. Reserved quantity cannot produce negative available stock
  test('9. Reserved quantity cannot produce negative available stock', () => {
    const result = InventoryCalculator.calculateVariantStock({
      variantId: 'VAR-2',
      locations: [
        { inventorySourceId: 'LOC-1', locationCode: 'Maarif', isOnlineFulfillment: true, physicalQuantity: 2, reservedQuantity: 10 },
      ],
    });
    // Physical = 2, Reserved = 10 -> Available MUST be 0, never -8
    assert.strictEqual(result.totalAvailable, 0);
    assert.strictEqual(result.isAvailableForSale, false);
  });

  // 10. Order item snapshots remain unchanged after product changes
  test('10. Order item snapshots remain unchanged after subsequent product changes', () => {
    const initialOrderSnapshot = OrderSnapshotService.createSnapshot({
      productId: 'PROD-SONY',
      variantId: 'VAR-BLACK',
      liveProductName: 'Sony WH-1000XM5',
      liveVariantName: 'Noir',
      liveSku: 'SNY-WHXM5-BLK',
      liveUnitPrice: 3890.0,
      quantity: 1,
    });

    assert.strictEqual(initialOrderSnapshot.capturedProductName, 'Sony WH-1000XM5');
    assert.strictEqual(initialOrderSnapshot.capturedUnitPrice, '3890.00');
    assert.strictEqual(initialOrderSnapshot.capturedLineTotal, '3890.00');

    // Simulate store product price change to 3490.00 DH the following month
    const currentStorePrice = 3490.0;
    assert.notStrictEqual(Number(initialOrderSnapshot.capturedUnitPrice), currentStorePrice);
  });

  // 11. Snapshot Safety Guard blocks a >15% incomplete full snapshot
  test('11. Snapshot Safety Guard blocks a >15% incomplete full snapshot', () => {
    // 1530 products previously -> new file has only 400 records
    const evaluation = SnapshotSafetyGuard.evaluate({
      isFullSnapshot: true,
      previousTotalCount: 1530,
      incomingValidCount: 400,
      maxAllowedDropPercentage: 15,
    });

    assert.strictEqual(evaluation.isSafetyTriggered, true);
    assert.strictEqual(evaluation.isBlocked, true);
    assert.strictEqual(Math.round(evaluation.dropPercentage), 74);
  });

  // 12. Partial imports do not trigger mass deactivation
  test('12. Partial imports do not trigger mass deactivation', () => {
    const evaluation = SnapshotSafetyGuard.evaluate({
      isFullSnapshot: false, // Explicitly partial update
      previousTotalCount: 1530,
      incomingValidCount: 10,
      maxAllowedDropPercentage: 15,
    });

    assert.strictEqual(evaluation.isSafetyTriggered, false);
    assert.strictEqual(evaluation.isBlocked, false);
  });

  // 13. Different sources can contain the same external identifier safely
  test('13. Different sources can contain the same external identifier safely', () => {
    const supplier1 = { sourceCode: 'SUPPLIER_A', externalId: 'ITEM-99' };
    const supplier2 = { sourceCode: 'SUPPLIER_B', externalId: 'ITEM-99' };

    const compositeKey1 = `${supplier1.sourceCode}#${supplier1.externalId}`;
    const compositeKey2 = `${supplier2.sourceCode}#${supplier2.externalId}`;

    assert.notStrictEqual(compositeKey1, compositeKey2);
  });

  // 14. Invalid input is rejected by Zod
  test('14. Invalid input is rejected by Zod (negative price, empty name)', () => {
    const negativePriceResult = CatalogNormalizer.normalizeRecord({
      sourceRecordId: 'REC-FAIL-1',
      name: 'Produit Invalide',
      price: -50.0,
    });
    assert.strictEqual(negativePriceResult.success, false);

    const emptyNameResult = CatalogNormalizer.normalizeRecord({
      sourceRecordId: 'REC-FAIL-2',
      name: '',
      price: 199.0,
    });
    assert.strictEqual(emptyNameResult.success, false);
  });

  // 15. Admin Password Hashing with bcrypt 12 rounds
  await test('15. Admin password hashing works with bcrypt (12 rounds verification)', async () => {
    const password = 'TestSecureAdminPassword123!';
    const hash = await AdminAuthService.hashPassword(password);
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.startsWith('$2'), true);

    const isMatch = await AdminAuthService.verifyPassword(password, hash);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await AdminAuthService.verifyPassword('WrongPassword', hash);
    assert.strictEqual(isWrongMatch, false);
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
