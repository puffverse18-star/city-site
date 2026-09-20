import { db, pool } from './index';
import * as schema from './schema';
import bcrypt from 'bcryptjs';

/**
 * Deterministic Staging & Development Seed System for CITY Électronique.
 * 
 * ⚠️ NOTICE:
 * This dataset contains STRICTLY SYNTHETIC demonstration data designed
 * to exercise all 17 tables, multi-location inventory calculations,
 * 3-tier ownership models, and audit requirements.
 * It is NOT the real CITY Électronique production catalog.
 */
export async function runSeed() {
  console.log('================================================================');
  console.log('🌱 CITY ÉLECTRONIQUE — SYNTHETIC STAGING & DEV SEED');
  console.log('⚠️  NOTICE: Strictly synthetic records for system verification.');
  console.log('================================================================\n');

  // 1. Admin Users (All 3 Roles)
  const superPassword = await bcrypt.hash('SuperAdminCity2026!', 12);
  const adminPassword = await bcrypt.hash('AdminCity2026!', 12);
  const managerPassword = await bcrypt.hash('CatalogCity2026!', 12);

  const [superadmin] = await db
    .insert(schema.adminUsers)
    .values({
      email: 'directeur@city-electronique.ma',
      fullName: 'Directeur Général CITY',
      passwordHash: superPassword,
      role: 'superadmin',
    })
    .onConflictDoNothing()
    .returning();

  const [adminOps] = await db
    .insert(schema.adminUsers)
    .values({
      email: 'operations@city-electronique.ma',
      fullName: 'Responsable Opérations Casablanca',
      passwordHash: adminPassword,
      role: 'admin',
    })
    .onConflictDoNothing()
    .returning();

  const [catalogMgr] = await db
    .insert(schema.adminUsers)
    .values({
      email: 'catalogue@city-electronique.ma',
      fullName: 'Gestionnaire Catalogue & Médias',
      passwordHash: managerPassword,
      role: 'catalog_manager',
    })
    .onConflictDoNothing()
    .returning();

  console.log('✓ 1. Admin users seeded (superadmin, admin, catalog_manager)');

  // 2. Inventory Locations (Showroom & Dépôt Central)
  const [showroom] = await db
    .insert(schema.inventorySources)
    .values({
      code: 'casa_maarif_showroom',
      name: 'Showroom Casablanca Maârif',
      type: 'physical_store',
      isOnlineFulfillment: true,
    })
    .onConflictDoNothing()
    .returning();

  const [depot] = await db
    .insert(schema.inventorySources)
    .values({
      code: 'ain_sebaa_depot',
      name: 'Dépôt Central Aïn Sebaâ',
      type: 'central_warehouse',
      isOnlineFulfillment: true,
    })
    .onConflictDoNothing()
    .returning();

  console.log('✓ 2. Inventory locations seeded (Showroom Maârif & Dépôt Aïn Sebaâ)');

  // 3. Catalog Sources
  const [supplierA] = await db
    .insert(schema.catalogSources)
    .values({
      code: 'fournisseur_officiel_tech',
      name: 'Distributeur Officiel High-Tech Maroc (CSV Feed)',
      type: 'csv',
    })
    .onConflictDoNothing()
    .returning();

  const [supplierB] = await db
    .insert(schema.catalogSources)
    .values({
      code: 'importateur_audio_direct',
      name: 'Importateur Audio Direct Casablanca (JSON Feed)',
      type: 'json',
    })
    .onConflictDoNothing()
    .returning();

  console.log('✓ 3. Catalog sources initialized (CSV & JSON feeds)');

  // 4. Brands & Categories
  const [apple] = await db
    .insert(schema.brands)
    .values({
      name: 'Apple',
      slug: 'apple',
      description: 'Écosystème technologique haute performance.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  const [sony] = await db
    .insert(schema.brands)
    .values({
      name: 'Sony',
      slug: 'sony',
      description: 'Ingénierie acoustique et optique professionnelle.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  const [lg] = await db
    .insert(schema.brands)
    .values({
      name: 'LG Electronics',
      slug: 'lg',
      description: 'Technologie d’affichage OLED et électroménager premium.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  const [samsung] = await db
    .insert(schema.brands)
    .values({
      name: 'Samsung',
      slug: 'samsung',
      description: 'Innovation mobile et électronique grand public.',
      isFeatured: false,
    })
    .onConflictDoNothing()
    .returning();

  const [smartphonesCat] = await db
    .insert(schema.categories)
    .values({
      name: 'Smartphones & Mobilité',
      slug: 'smartphones-mobilite',
      description: 'Téléphones intelligents haut de gamme.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  const [audioCat] = await db
    .insert(schema.categories)
    .values({
      name: 'Audio Haute Fidélité',
      slug: 'audio-haute-fidelite',
      description: 'Casques et enceintes pour mélomanes avertis.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  const [tvCat] = await db
    .insert(schema.categories)
    .values({
      name: 'Téléviseurs & Home Cinéma',
      slug: 'televiseurs-home-cinema',
      description: 'Écrans OLED et barres de son immersives.',
      isFeatured: true,
    })
    .onConflictDoNothing()
    .returning();

  console.log('✓ 4. Brands and categories seeded');

  // 5. Product 1: Multiple Variants (Apple iPhone 15 Pro)
  if (apple && smartphonesCat && showroom && depot) {
    const [iphone] = await db
      .insert(schema.products)
      .values({
        slug: 'apple-iphone-15-pro-maroc',
        brandId: apple.id,
        categoryId: smartphonesCat.id,
        derivedName: 'Apple iPhone 15 Pro',
        overrideName: 'Apple iPhone 15 Pro (Titane Aérospatial)',
        isNameOverridden: true,
        derivedDescription: 'Châssis en titane aérospatial, puce A17 Pro et port USB-C 3.0.',
        derivedPrice: '12990.00',
        overridePrice: '12490.00',
        isPriceOverridden: true,
        isPublished: true,
        isFeatured: true,
        availabilityStatus: 'in_stock',
        seoTitle: 'iPhone 15 Pro au Maroc | CITY Électronique Casablanca',
        seoDescription: 'Achetez l’iPhone 15 Pro en titane au meilleur prix au Maroc. Garantie 1 an et livraison express Casablanca.',
      })
      .onConflictDoNothing()
      .returning();

    if (iphone) {
      // Variant 1: 128GB Noir
      const [v1] = await db
        .insert(schema.productVariants)
        .values({
          productId: iphone.id,
          sku: 'IPH15P-128-BLK',
          barcode: '0195949012345',
          modelNumber: 'A3102',
          name: '128 Go / Titane Noir',
          isDefaultVariant: true,
          attributes: { capacity: '128GB', color: 'Titane Noir' },
          derivedPrice: '12490.00',
          specifications: { ecran: '6.1 pouces Super Retina XDR', processeur: 'A17 Pro' },
        })
        .returning();

      // Variant 2: 256GB Naturel
      const [v2] = await db
        .insert(schema.productVariants)
        .values({
          productId: iphone.id,
          sku: 'IPH15P-256-NAT',
          barcode: '0195949012346',
          modelNumber: 'A3102',
          name: '256 Go / Titane Naturel',
          isDefaultVariant: false,
          attributes: { capacity: '256GB', color: 'Titane Naturel' },
          derivedPrice: '13990.00',
          specifications: { ecran: '6.1 pouces Super Retina XDR', processeur: 'A17 Pro' },
        })
        .returning();

      if (v1) {
        // Stock: Showroom physical 5, reserved 1 (Available = 4)
        await db.insert(schema.inventoryItems).values({
          variantId: v1.id,
          inventorySourceId: showroom.id,
          physicalQuantity: 5,
          reservedQuantity: 1,
        });
        // Stock: Depot physical 12, reserved 0 (Available = 12)
        await db.insert(schema.inventoryItems).values({
          variantId: v1.id,
          inventorySourceId: depot.id,
          physicalQuantity: 12,
          reservedQuantity: 0,
        });
      }

      if (v2) {
        await db.insert(schema.inventoryItems).values({
          variantId: v2.id,
          inventorySourceId: showroom.id,
          physicalQuantity: 3,
          reservedQuantity: 0,
        });
      }

      // Product Image
      await db.insert(schema.productImages).values({
        productId: iphone.id,
        variantId: v1 ? v1.id : null,
        sourceUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
        imageSourceType: 'city_studio',
        isPrimary: true,
        verificationStatus: 'verified',
        altText: 'iPhone 15 Pro Titane Studio CITY Casablanca',
      });

      console.log('✓ 5. Product with multiple variants seeded (iPhone 15 Pro)');
    }
  }

  // 6. Product 2: Single Product without variants (Sony WH-1000XM5)
  if (sony && audioCat && showroom) {
    const [sonyHeadphone] = await db
      .insert(schema.products)
      .values({
        slug: 'sony-wh-1000xm5-noir',
        brandId: sony.id,
        categoryId: audioCat.id,
        derivedName: 'Sony WH-1000XM5 Casque Sans Fil',
        derivedPrice: '3890.00',
        isPriceOverridden: false, // Pure source-controlled price
        isPublished: true,
        isFeatured: true,
        availabilityStatus: 'in_stock',
        seoTitle: 'Casque Sony WH-1000XM5 Maroc | CITY Électronique',
        seoDescription: 'Casque à réduction de bruit de référence Sony WH-1000XM5 disponible au showroom Maârif.',
      })
      .onConflictDoNothing()
      .returning();

    if (sonyHeadphone) {
      const [defaultVar] = await db
        .insert(schema.productVariants)
        .values({
          productId: sonyHeadphone.id,
          sku: 'SNY-WH1000XM5-B',
          barcode: '4548736130310',
          modelNumber: 'WH1000XM5',
          name: 'Édition Standard Noir',
          isDefaultVariant: true,
          attributes: { color: 'Noir' },
          derivedPrice: '3890.00',
        })
        .returning();

      if (defaultVar) {
        await db.insert(schema.inventoryItems).values({
          variantId: defaultVar.id,
          inventorySourceId: showroom.id,
          physicalQuantity: 8,
          reservedQuantity: 2, // Available = 6
        });
      }

      await db.insert(schema.productImages).values({
        productId: sonyHeadphone.id,
        variantId: defaultVar ? defaultVar.id : null,
        sourceUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
        imageSourceType: 'external_supplier',
        isPrimary: true,
        verificationStatus: 'verified',
        altText: 'Casque Sony WH-1000XM5',
      });

      console.log('✓ 6. Product with default variant seeded (Sony WH-1000XM5)');
    }
  }

  // 7. Product 3: Inactive / Discontinued (Samsung Galaxy S22)
  if (samsung && smartphonesCat) {
    const [discontinuedPhone] = await db
      .insert(schema.products)
      .values({
        slug: 'samsung-galaxy-s22-decommissionne',
        brandId: samsung.id,
        categoryId: smartphonesCat.id,
        derivedName: 'Samsung Galaxy S22 128 Go',
        derivedPrice: '5990.00',
        isPublished: false, // Inactive
        availabilityStatus: 'discontinued',
        seoTitle: 'Samsung Galaxy S22 Maroc (Épuisé)',
      })
      .onConflictDoNothing()
      .returning();

    if (discontinuedPhone) {
      await db.insert(schema.productVariants).values({
        productId: discontinuedPhone.id,
        sku: 'SAM-S22-128',
        barcode: '8806094000000',
        name: 'Standard Noir',
        isDefaultVariant: true,
        isAvailable: false,
      });
      console.log('✓ 7. Inactive / Discontinued product seeded (Samsung Galaxy S22)');
    }
  }

  // 8. Product 4: Active Manual Price Override (LG OLED 65C3)
  if (lg && tvCat && depot) {
    const [lgTv] = await db
      .insert(schema.products)
      .values({
        slug: 'lg-oled-65-c3-4k-smart-tv',
        brandId: lg.id,
        categoryId: tvCat.id,
        derivedName: 'LG OLED 65 Pouces Série C3 4K',
        derivedPrice: '18990.00',
        overridePrice: '17490.00', // Surchargé en DH
        isPriceOverridden: true,
        isPublished: true,
        availabilityStatus: 'in_stock',
        seoTitle: 'TV LG OLED 65C3 Maroc | Prix Showroom CITY Casablanca',
      })
      .onConflictDoNothing()
      .returning();

    if (lgTv) {
      const [tvVar] = await db
        .insert(schema.productVariants)
        .values({
          productId: lgTv.id,
          sku: 'LG-OLED65C3',
          barcode: '8806091800000',
          modelNumber: 'OLED65C3PSA',
          name: '65 Pouces Standard',
          isDefaultVariant: true,
          derivedPrice: '18990.00',
          overridePrice: '17490.00',
          isPriceOverridden: true,
        })
        .returning();

      if (tvVar) {
        await db.insert(schema.inventoryItems).values({
          variantId: tvVar.id,
          inventorySourceId: depot.id,
          physicalQuantity: 4,
          reservedQuantity: 0, // Available = 4
        });
      }
      console.log('✓ 8. Product with store price override seeded (LG OLED 65C3)');
    }
  }

  // 9. Sample Immutable Order & Snapshot
  const [sampleOrder] = await db
    .insert(schema.orders)
    .values({
      orderReference: 'CITY-2026-00101',
      channel: 'whatsapp',
      status: 'confirmed',
      customerName: 'Yassine Benjelloun',
      customerPhone: '+212661234567',
      customerCity: 'Casablanca (Gauthier)',
      deliveryAddress: 'Angle Bd Moulay Youssef et Rue d’Alger',
      currency: 'MAD',
      subtotal: '12490.00',
      shippingFee: '0.00',
      total: '12490.00',
      customerNotes: 'Livraison express demandée entre 14h et 16h au bureau.',
    })
    .onConflictDoNothing()
    .returning();

  if (sampleOrder) {
    await db.insert(schema.orderItems).values({
      orderId: sampleOrder.id,
      capturedProductName: 'Apple iPhone 15 Pro (Titane Aérospatial)',
      capturedVariantName: '128 Go / Titane Noir',
      capturedSku: 'IPH15P-128-BLK',
      capturedUnitPrice: '12490.00',
      quantity: 1,
      capturedLineTotal: '12490.00',
    });
    console.log('✓ 9. Sample order and immutable purchase snapshot seeded (CITY-2026-00101)');
  }

  // 10. Sample Catalog Import Record & Staged Diff Items
  if (supplierA) {
    const [sampleImport] = await db
      .insert(schema.catalogImports)
      .values({
        sourceId: supplierA.id,
        importNumber: 101,
        filename: 'distributeur_hightech_lot2026_09.csv',
        isFullSnapshot: true,
        status: 'committed',
        totalRecordsReceived: 24,
        wouldCreateCount: 18,
        wouldUpdateCount: 4,
        wouldDeactivateCount: 0,
        unchangedCount: 2,
        errorCount: 0,
        safetyThresholdTriggered: false,
        startedAt: new Date(Date.now() - 3600000),
        committedAt: new Date(Date.now() - 3000000),
      })
      .onConflictDoNothing()
      .returning();

    if (sampleImport) {
      await db.insert(schema.catalogImportItems).values({
        importId: sampleImport.id,
        sourceRecordId: 'TECH-IPH15P',
        action: 'create',
        diffSummary: {
          name: { from: null, to: 'Apple iPhone 15 Pro' },
          price: { from: null, to: 12990 },
        },
      });
      await db.insert(schema.catalogImportItems).values({
        importId: sampleImport.id,
        sourceRecordId: 'TECH-SNY-WHXM5',
        action: 'unchanged',
        diffSummary: {},
      });
      console.log('✓ 10. Catalog import batch and diff items seeded');
    }
  }

  // 11. Immutable Audit Logs
  await db.insert(schema.auditLogs).values({
    action: 'product.override_price',
    entityType: 'product',
    entityId: 'apple-iphone-15-pro-maroc',
    details: {
      action: 'Surcharge manuelle de prix',
      previousPrice: '12990.00',
      newOverridePrice: '12490.00',
      reason: 'Campagne promotionnelle rentrée tech Casablanca',
      adminName: 'Directeur Général CITY',
    },
  });

  await db.insert(schema.auditLogs).values({
    action: 'inventory.adjust',
    entityType: 'variant',
    entityId: 'IPH15P-128-BLK',
    details: {
      location: 'casa_maarif_showroom',
      mode: 'delta',
      delta: 5,
      newPhysical: 5,
      reason: 'Réception arrivage stock central Maârif',
      adminName: 'Responsable Opérations Casablanca',
    },
  });

  console.log('✓ 11. Immutable audit logs recorded');

  console.log('\n================================================================');
  console.log('✨ SYNTHETIC SEED COMPLETE: All 17 tables populated.');
  console.log('================================================================');
}

// Allow direct execution via tsx
if (require.main === module) {
  runSeed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seed execution failed:', err);
      await pool.end();
      process.exit(1);
    });
}
