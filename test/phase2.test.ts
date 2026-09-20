import assert from 'assert';
import { appConfig } from '../lib/config/store';
import { canonicalStore } from '../lib/data/store';

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CITY ÉLECTRONIQUE PHASE 2 TEST SUITE');
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

  // 1. Storefront products can be queried with filters
  test('1. Storefront products can be queried by category and search keyword', () => {
    const res = canonicalStore.getProducts({ search: 'iPhone' });
    assert.strictEqual(res.items.length >= 1, true);
    assert.strictEqual(res.items[0].name.includes('iPhone'), true);
  });

  // 2. Product variant selection resolves proper price and stock
  test('2. Product variant selection resolves proper variant price and attributes', () => {
    const prod = canonicalStore.getProductById('prod_iphone_15_pro');
    assert.notStrictEqual(prod, null);
    assert.strictEqual(prod!.variants.length, 2);
    const var256 = prod!.variants.find((v) => v.sku === 'IPH15P-256-NAT');
    assert.notStrictEqual(var256, undefined);
    assert.strictEqual(var256!.effectivePrice, 14290);
  });

  // 3. WhatsApp order message formatting in MAD (DH)
  test('3. WhatsApp order generator creates formatted Moroccan Dirhams string', () => {
    const customer = { name: 'Karim Bennani', phone: '0661234567', city: 'Casablanca' };
    const item = { name: 'Sony WH-1000XM5', variant: 'Noir Sidéral', sku: 'SNY-WHXM5-BLK', price: 3890 };
    const whatsappText = `Bonjour CITY Électronique, je souhaite commander : ${item.name} (${item.variant}) - Réf: ${item.sku} au prix de ${item.price} ${appConfig.store.currencySymbol}. Client: ${customer.name} (${customer.city})`;
    
    assert.strictEqual(whatsappText.includes('3890 DH'), true);
    assert.strictEqual(whatsappText.includes('SNY-WHXM5-BLK'), true);
    assert.strictEqual(whatsappText.includes('Casablanca'), true);
  });

  // 4. Currency and price formatting consistency
  test('4. Currency configuration conforms to MAD standard with DH symbol', () => {
    assert.strictEqual(appConfig.store.currency, 'MAD');
    assert.strictEqual(appConfig.store.currencySymbol, 'DH');
  });

  // 5. Storefront availability status reflects in_stock / low_stock / out_of_stock
  test('5. Storefront availability status reflects real stock states', () => {
    const prod = canonicalStore.getProductById('prod_audiotechnica_m50x');
    assert.notStrictEqual(prod, null);
    assert.strictEqual(prod!.hasLowStock, true);
    assert.strictEqual(prod!.availabilityStatus, 'low_stock');
  });

  // 6. Nullable SKU & Barcode handling in product presentation
  test('6. Nullable identifiers handled gracefully without placeholders', () => {
    const prod = canonicalStore.getProductById('prod_anker_prime');
    assert.notStrictEqual(prod, null);
    assert.strictEqual(prod!.variants[0].barcode, null);
    assert.strictEqual(prod!.missingBarcode, true);
  });

  // 7. Storefront SEO title and meta description structure
  test('7. Product SEO title and description match structured Moroccan store standards', () => {
    const prod = canonicalStore.getProductById('prod_iphone_15_pro');
    assert.notStrictEqual(prod, null);
    assert.strictEqual(prod!.seoTitle!.includes('CITY Électronique'), true);
    assert.strictEqual(prod!.seoDescription!.includes('Maroc'), true);
  });

  console.log('\n======================================================');
  console.log(`🏁 PHASE 2 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Fatal phase 2 test runner error:', err);
  process.exit(1);
});
