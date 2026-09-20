import { FieldOwnershipResolver } from '../catalog/ownership';
import { InventoryService } from '../inventory/service';
import { AuditService } from '../audit/service';
import { CatalogImportPipeline, ExistingCatalogItem } from '../catalog/importer';
import { ProductImageItem, ImageVerificationStatus, ImageService } from '../images/service';
import { DryRunReport } from '../catalog/adapter.interface';

export interface AdminProductView {
  id: string;
  slug: string;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;

  // General & SEO
  name: string; // Effective displayed name
  derivedName: string;
  overrideName: string | null;
  isNameOverridden: boolean;

  description: string | null; // Effective displayed description
  derivedDescription: string | null;
  overrideDescription: string | null;
  isDescriptionOverridden: boolean;

  seoTitle: string | null;
  seoDescription: string | null;

  // Price
  price: number; // Effective displayed base price in MAD
  derivedPrice: number;
  overridePrice: number | null;
  isPriceOverridden: boolean;
  compareAtPrice: number | null;

  // Status
  isPublished: boolean;
  isFeatured: boolean;
  availabilityStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';

  // Relations & Computed
  variantsCount: number;
  totalPhysicalStock: number;
  totalReservedStock: number;
  totalAvailableStock: number; // Derived: Math.max(0, physical - reserved)
  hasLowStock: boolean;
  missingSku: boolean;
  missingBarcode: boolean;
  needsReview: boolean;

  // Source info
  primarySourceCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVariantView {
  id: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
  modelNumber: string | null;
  name: string;
  isDefaultVariant: boolean;
  displayOrder: number;
  attributes: Record<string, string>;
  
  derivedPrice: number | null;
  overridePrice: number | null;
  isPriceOverridden: boolean;
  effectivePrice: number;
  compareAtPrice: number | null;

  specifications: Record<string, string | number>;
  isAvailable: boolean;
  
  physicalStock: number;
  reservedStock: number;
  availableStock: number; // strictly derived
}

export interface AdminProductDetailView extends AdminProductView {
  variants: AdminVariantView[];
  images: ProductImageItem[];
  inventoryByLocation: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    variantId: string;
    variantName: string;
    physicalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  }>;
  sources: Array<{
    id: string;
    sourceCode: string;
    sourceName: string;
    sourceRecordId: string;
    confidenceScore: number;
    needsManualReview: boolean;
    reviewNotes: string | null;
    mappedAt: string;
  }>;
}

export interface StoredImport {
  id: string;
  sourceCode: string;
  sourceName: string;
  importNumber: number;
  filename: string;
  isFullSnapshot: boolean;
  status: 'dry_run_ready' | 'committed' | 'blocked_safety' | 'failed';
  totalRecordsReceived: number;
  wouldCreateCount: number;
  wouldUpdateCount: number;
  wouldDeactivateCount: number;
  wouldManualReviewCount: number;
  unchangedCount: number;
  errorCount: number;
  safetyThresholdTriggered: boolean;
  safetyDropPercentage: number;
  adminOverrideSafety: boolean;
  adminOverrideReason?: string | null;
  approvedByAdmin?: string | null;
  startedAt: string;
  committedAt?: string | null;
  dryRunReport?: DryRunReport;
}

class CanonicalStore {
  private products: AdminProductDetailView[] = [];
  private imports: StoredImport[] = [];
  private locations = [
    { id: 'loc_maarif', code: 'casa_maarif_showroom', name: 'Showroom Casablanca Maârif', type: 'physical_store', isOnlineFulfillment: true },
    { id: 'loc_depot', code: 'ain_sebaa_depot', name: 'Dépôt Central Aïn Sebaâ', type: 'central_warehouse', isOnlineFulfillment: true },
  ];
  private brands = [
    { id: 'b_apple', name: 'Apple', slug: 'apple' },
    { id: 'b_sony', name: 'Sony', slug: 'sony' },
    { id: 'b_samsung', name: 'Samsung', slug: 'samsung' },
    { id: 'b_audiotechnica', name: 'Audio-Technica', slug: 'audio-technica' },
    { id: 'b_anker', name: 'Anker', slug: 'anker' },
  ];
  private categories = [
    { id: 'c_smartphones', name: 'Smartphones & Mobilité', slug: 'smartphones-mobilite' },
    { id: 'c_audio', name: 'Audio Haute Fidélité', slug: 'audio-haute-fidelite' },
    { id: 'c_accessoires', name: 'Accessoires & Charge', slug: 'accessoires-charge' },
  ];

  constructor() {
    this.initSeed();
  }

  private initSeed() {
    // 1. Apple iPhone 15 Pro
    this.products.push({
      id: 'prod_iphone_15_pro',
      slug: 'apple-iphone-15-pro',
      brandId: 'b_apple',
      brandName: 'Apple',
      categoryId: 'c_smartphones',
      categoryName: 'Smartphones & Mobilité',
      derivedName: 'Apple iPhone 15 Pro',
      overrideName: 'Apple iPhone 15 Pro (Titane Naturel / Noir)',
      isNameOverridden: true,
      name: 'Apple iPhone 15 Pro (Titane Naturel / Noir)',
      derivedDescription: 'Châssis en titane aérospatial, puce A17 Pro, bouton Action personnalisable.',
      overrideDescription: 'Édition marocaine certifiée avec garantie revendeur 1 an et adaptateur secteur USB-C inclus.',
      isDescriptionOverridden: true,
      description: 'Édition marocaine certifiée avec garantie revendeur 1 an et adaptateur secteur USB-C inclus.',
      seoTitle: 'Apple iPhone 15 Pro au Maroc | CITY Électronique Casablanca',
      seoDescription: 'Achetez votre iPhone 15 Pro en titane au meilleur prix au Maroc avec livraison express et garantie.',
      derivedPrice: 12990,
      overridePrice: 12490,
      isPriceOverridden: true,
      price: 12490,
      compareAtPrice: 13490,
      isPublished: true,
      isFeatured: true,
      availabilityStatus: 'in_stock',
      variantsCount: 2,
      totalPhysicalStock: 16,
      totalReservedStock: 1,
      totalAvailableStock: 15,
      hasLowStock: false,
      missingSku: false,
      missingBarcode: false,
      needsReview: false,
      primarySourceCode: 'fournisseur_officiel_tech',
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-15T14:30:00Z',
      variants: [
        {
          id: 'var_iph_128_blk',
          productId: 'prod_iphone_15_pro',
          sku: 'IPH15P-128-BLK',
          barcode: '0195949012345',
          modelNumber: 'A3102',
          name: '128 Go / Titane Noir',
          isDefaultVariant: true,
          displayOrder: 1,
          attributes: { capacity: '128 Go', color: 'Titane Noir' },
          derivedPrice: 12990,
          overridePrice: 12490,
          isPriceOverridden: true,
          effectivePrice: 12490,
          compareAtPrice: 13490,
          specifications: { ecran: '6.1 pouces Super Retina XDR OLED', processeur: 'Apple A17 Pro (3nm)', stockage: '128 Go' },
          isAvailable: true,
          physicalStock: 14,
          reservedStock: 1,
          availableStock: 13,
        },
        {
          id: 'var_iph_256_nat',
          productId: 'prod_iphone_15_pro',
          sku: 'IPH15P-256-NAT',
          barcode: '0195949012346',
          modelNumber: 'A3102',
          name: '256 Go / Titane Naturel',
          isDefaultVariant: false,
          displayOrder: 2,
          attributes: { capacity: '256 Go', color: 'Titane Naturel' },
          derivedPrice: 14290,
          overridePrice: null,
          isPriceOverridden: false,
          effectivePrice: 14290,
          compareAtPrice: 14990,
          specifications: { ecran: '6.1 pouces Super Retina XDR OLED', processeur: 'Apple A17 Pro (3nm)', stockage: '256 Go' },
          isAvailable: true,
          physicalStock: 2,
          reservedStock: 0,
          availableStock: 2,
        },
      ],
      images: [
        {
          id: 'img_iph_1',
          productId: 'prod_iphone_15_pro',
          productName: 'Apple iPhone 15 Pro',
          variantId: 'var_iph_128_blk',
          variantName: '128 Go / Titane Noir',
          sourceUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
          imageSourceType: 'city_studio',
          isPrimary: true,
          displayOrder: 1,
          altText: 'iPhone 15 Pro Titane Noir vue studio CITY Électronique',
          verificationStatus: 'verified',
          createdAt: '2026-03-01T10:00:00Z',
        },
      ],
      inventoryByLocation: [
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: 'var_iph_128_blk', variantName: '128 Go / Titane Noir', physicalQuantity: 4, reservedQuantity: 1, availableQuantity: 3 },
        { locationId: 'loc_depot', locationCode: 'ain_sebaa_depot', locationName: 'Dépôt Central Aïn Sebaâ', variantId: 'var_iph_128_blk', variantName: '128 Go / Titane Noir', physicalQuantity: 10, reservedQuantity: 0, availableQuantity: 10 },
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: 'var_iph_256_nat', variantName: '256 Go / Titane Naturel', physicalQuantity: 2, reservedQuantity: 0, availableQuantity: 2 },
      ],
      sources: [
        { id: 'map_iph_1', sourceCode: 'fournisseur_officiel_tech', sourceName: 'Distributeur Officiel High-Tech Maroc', sourceRecordId: 'REC-APPLE-15P', confidenceScore: 1.0, needsManualReview: false, reviewNotes: null, mappedAt: '2026-03-01T10:00:00Z' },
      ],
    });

    // 2. Sony WH-1000XM5
    this.products.push({
      id: 'prod_sony_wh1000xm5',
      slug: 'sony-wh-1000xm5-noir',
      brandId: 'b_sony',
      brandName: 'Sony',
      categoryId: 'c_audio',
      categoryName: 'Audio Haute Fidélité',
      derivedName: 'Sony WH-1000XM5',
      overrideName: null,
      isNameOverridden: false,
      name: 'Sony WH-1000XM5',
      derivedDescription: 'Casque circum-aural sans fil à réduction de bruit active leader du marché avec processeur V1 et 8 micros.',
      overrideDescription: null,
      isDescriptionOverridden: false,
      description: 'Casque circum-aural sans fil à réduction de bruit active leader du marché avec processeur V1 et 8 micros.',
      seoTitle: 'Sony WH-1000XM5 Maroc | Casque Audio Premium',
      seoDescription: 'Casque Sony WH-1000XM5 au Maroc. Réduction de bruit active primée, autonomie 30h, garantie officielle.',
      derivedPrice: 3890,
      overridePrice: null,
      isPriceOverridden: false,
      price: 3890,
      compareAtPrice: 4200,
      isPublished: true,
      isFeatured: true,
      availabilityStatus: 'in_stock',
      variantsCount: 1,
      totalPhysicalStock: 8,
      totalReservedStock: 0,
      totalAvailableStock: 8,
      hasLowStock: false,
      missingSku: false,
      missingBarcode: false,
      needsReview: false,
      primarySourceCode: 'importateur_audio_direct',
      createdAt: '2026-03-02T11:00:00Z',
      updatedAt: '2026-03-10T09:15:00Z',
      variants: [
        {
          id: 'var_sony_xm5_blk',
          productId: 'prod_sony_wh1000xm5',
          sku: 'SNY-WHXM5-BLK',
          barcode: '4548736132580',
          modelNumber: 'WH1000XM5B',
          name: 'Noir Sidéral',
          isDefaultVariant: true,
          displayOrder: 1,
          attributes: { color: 'Noir Sidéral' },
          derivedPrice: 3890,
          overridePrice: null,
          isPriceOverridden: false,
          effectivePrice: 3890,
          compareAtPrice: 4200,
          specifications: { autonomie: '30 heures avec ANC', reductionBruit: 'Double processeur QN1 + V1', connectivite: 'Bluetooth 5.2 / LDAC' },
          isAvailable: true,
          physicalStock: 8,
          reservedStock: 0,
          availableStock: 8,
        },
      ],
      images: [
        {
          id: 'img_sony_1',
          productId: 'prod_sony_wh1000xm5',
          productName: 'Sony WH-1000XM5',
          variantId: 'var_sony_xm5_blk',
          variantName: 'Noir Sidéral',
          sourceUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
          imageSourceType: 'brand_presskit',
          isPrimary: true,
          displayOrder: 1,
          altText: 'Casque Sony WH-1000XM5 vue studio',
          verificationStatus: 'verified',
          createdAt: '2026-03-02T11:00:00Z',
        },
      ],
      inventoryByLocation: [
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: 'var_sony_xm5_blk', variantName: 'Noir Sidéral', physicalQuantity: 3, reservedQuantity: 0, availableQuantity: 3 },
        { locationId: 'loc_depot', locationCode: 'ain_sebaa_depot', locationName: 'Dépôt Central Aïn Sebaâ', variantId: 'var_sony_xm5_blk', variantName: 'Noir Sidéral', physicalQuantity: 5, reservedQuantity: 0, availableQuantity: 5 },
      ],
      sources: [
        { id: 'map_sony_1', sourceCode: 'importateur_audio_direct', sourceName: 'Importateur Audio Direct Casablanca', sourceRecordId: 'REC-SONY-XM5', confidenceScore: 1.0, needsManualReview: false, reviewNotes: null, mappedAt: '2026-03-02T11:00:00Z' },
      ],
    });

    // 3. Audio-Technica ATH-M50x
    this.products.push({
      id: 'prod_audiotechnica_m50x',
      slug: 'audio-technica-ath-m50x',
      brandId: 'b_audiotechnica',
      brandName: 'Audio-Technica',
      categoryId: 'c_audio',
      categoryName: 'Audio Haute Fidélité',
      derivedName: 'Audio-Technica ATH-M50x',
      overrideName: null,
      isNameOverridden: false,
      name: 'Audio-Technica ATH-M50x',
      derivedDescription: 'Casque de monitoring professionnel de référence pour studio et écoute critique.',
      overrideDescription: null,
      isDescriptionOverridden: false,
      description: 'Casque de monitoring professionnel de référence pour studio et écoute critique.',
      seoTitle: 'Audio-Technica ATH-M50x Maroc | Studio Monitor',
      seoDescription: 'Casque monitoring Audio-Technica ATH-M50x disponible chez CITY Électronique Casablanca.',
      derivedPrice: 1790,
      overridePrice: null,
      isPriceOverridden: false,
      price: 1790,
      compareAtPrice: 1950,
      isPublished: true,
      isFeatured: false,
      availabilityStatus: 'low_stock',
      variantsCount: 1,
      totalPhysicalStock: 3,
      totalReservedStock: 1,
      totalAvailableStock: 2,
      hasLowStock: true,
      missingSku: false,
      missingBarcode: false,
      needsReview: false,
      primarySourceCode: 'importateur_audio_direct',
      createdAt: '2026-03-05T09:00:00Z',
      updatedAt: '2026-03-12T16:20:00Z',
      variants: [
        {
          id: 'var_ath_m50x_std',
          productId: 'prod_audiotechnica_m50x',
          sku: 'ATH-M50X-BLK',
          barcode: '4961310125400',
          modelNumber: 'ATH-M50X',
          name: 'Standard Noir',
          isDefaultVariant: true,
          displayOrder: 1,
          attributes: { color: 'Noir' },
          derivedPrice: 1790,
          overridePrice: null,
          isPriceOverridden: false,
          effectivePrice: 1790,
          compareAtPrice: 1950,
          specifications: { transducteurs: '45 mm néodyme', reponse: '15 - 28 000 Hz', impedance: '38 ohms' },
          isAvailable: true,
          physicalStock: 3,
          reservedStock: 1,
          availableStock: 2,
        },
      ],
      images: [
        {
          id: 'img_ath_1',
          productId: 'prod_audiotechnica_m50x',
          productName: 'Audio-Technica ATH-M50x',
          variantId: 'var_ath_m50x_std',
          variantName: 'Standard Noir',
          sourceUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
          imageSourceType: 'brand_presskit',
          isPrimary: true,
          displayOrder: 1,
          altText: 'Audio-Technica ATH-M50x',
          verificationStatus: 'verified',
          createdAt: '2026-03-05T09:00:00Z',
        },
      ],
      inventoryByLocation: [
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: 'var_ath_m50x_std', variantName: 'Standard Noir', physicalQuantity: 1, reservedQuantity: 0, availableQuantity: 1 },
        { locationId: 'loc_depot', locationCode: 'ain_sebaa_depot', locationName: 'Dépôt Central Aïn Sebaâ', variantId: 'var_ath_m50x_std', variantName: 'Standard Noir', physicalQuantity: 2, reservedQuantity: 1, availableQuantity: 1 },
      ],
      sources: [
        { id: 'map_ath_1', sourceCode: 'importateur_audio_direct', sourceName: 'Importateur Audio Direct Casablanca', sourceRecordId: 'REC-ATH-M50X', confidenceScore: 1.0, needsManualReview: false, reviewNotes: null, mappedAt: '2026-03-05T09:00:00Z' },
      ],
    });

    // 4. Product requiring manual review (e.g. uncertain barcode or collision)
    this.products.push({
      id: 'prod_anker_prime',
      slug: 'anker-prime-powerbank-200w',
      brandId: 'b_anker',
      brandName: 'Anker',
      categoryId: 'c_accessoires',
      categoryName: 'Accessoires & Charge',
      derivedName: 'Anker Prime 20,000mAh 200W',
      overrideName: null,
      isNameOverridden: false,
      name: 'Anker Prime 20,000mAh 200W',
      derivedDescription: 'Batterie externe ultra-rapide 200W avec écran digital de contrôle en temps réel.',
      overrideDescription: null,
      isDescriptionOverridden: false,
      description: 'Batterie externe ultra-rapide 200W avec écran digital de contrôle en temps réel.',
      seoTitle: 'Anker Prime 200W PowerBank Maroc',
      seoDescription: 'Batterie portable haute puissance Anker Prime 200W à Casablanca.',
      derivedPrice: 1290,
      overridePrice: null,
      isPriceOverridden: false,
      price: 1290,
      compareAtPrice: 1450,
      isPublished: true,
      isFeatured: false,
      availabilityStatus: 'in_stock',
      variantsCount: 1,
      totalPhysicalStock: 5,
      totalReservedStock: 0,
      totalAvailableStock: 5,
      hasLowStock: false,
      missingSku: false,
      missingBarcode: true, // Missing barcode demonstration
      needsReview: true, // Flagged for review
      primarySourceCode: 'fournisseur_officiel_tech',
      createdAt: '2026-03-08T14:00:00Z',
      updatedAt: '2026-03-14T11:45:00Z',
      variants: [
        {
          id: 'var_anker_prime_200w',
          productId: 'prod_anker_prime',
          sku: 'ANK-PRM-20K',
          barcode: null, // Nullable barcode
          modelNumber: 'A1336',
          name: 'Édition 20,000mAh',
          isDefaultVariant: true,
          displayOrder: 1,
          attributes: { capacity: '20,000mAh', power: '200W' },
          derivedPrice: 1290,
          overridePrice: null,
          isPriceOverridden: false,
          effectivePrice: 1290,
          compareAtPrice: 1450,
          specifications: { capacite: '20 000 mAh / 72Wh', sortieMax: '200W total', ports: '2x USB-C + 1x USB-A' },
          isAvailable: true,
          physicalStock: 5,
          reservedStock: 0,
          availableStock: 5,
        },
      ],
      images: [
        {
          id: 'img_anker_1',
          productId: 'prod_anker_prime',
          productName: 'Anker Prime 20,000mAh 200W',
          variantId: 'var_anker_prime_200w',
          variantName: 'Édition 20,000mAh',
          sourceUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80',
          imageSourceType: 'external_supplier',
          isPrimary: true,
          displayOrder: 1,
          altText: 'Anker Prime 200W PowerBank',
          verificationStatus: 'pending',
          createdAt: '2026-03-08T14:00:00Z',
        },
      ],
      inventoryByLocation: [
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: 'var_anker_prime_200w', variantName: 'Édition 20,000mAh', physicalQuantity: 2, reservedQuantity: 0, availableQuantity: 2 },
        { locationId: 'loc_depot', locationCode: 'ain_sebaa_depot', locationName: 'Dépôt Central Aïn Sebaâ', variantId: 'var_anker_prime_200w', variantName: 'Édition 20,000mAh', physicalQuantity: 3, reservedQuantity: 0, availableQuantity: 3 },
      ],
      sources: [
        { id: 'map_anker_1', sourceCode: 'fournisseur_officiel_tech', sourceName: 'Distributeur Officiel High-Tech Maroc', sourceRecordId: 'REC-ANKER-200W', confidenceScore: 0.85, needsManualReview: true, reviewNotes: 'Code-barres EAN manquant dans le flux source', mappedAt: '2026-03-08T14:00:00Z' },
      ],
    });

    // Seed Initial Import
    this.imports.push({
      id: 'imp_001_initial',
      sourceCode: 'fournisseur_officiel_tech',
      sourceName: 'Distributeur Officiel High-Tech Maroc',
      importNumber: 101,
      filename: 'catalogue_fournisseur_mars_2026.csv',
      isFullSnapshot: true,
      status: 'committed',
      totalRecordsReceived: 4,
      wouldCreateCount: 4,
      wouldUpdateCount: 0,
      wouldDeactivateCount: 0,
      wouldManualReviewCount: 0,
      unchangedCount: 0,
      errorCount: 0,
      safetyThresholdTriggered: false,
      safetyDropPercentage: 0,
      adminOverrideSafety: false,
      approvedByAdmin: 'Directeur Technique CITY',
      startedAt: '2026-03-01T09:30:00Z',
      committedAt: '2026-03-01T09:35:00Z',
    });

    // Seed Initial Audit Log
    AuditService.log({
      userId: 'usr_admin',
      adminName: 'Directeur Technique CITY',
      action: 'product.override',
      entityType: 'product',
      entityId: 'prod_iphone_15_pro',
      summary: 'Surcharge manuelle du prix : 12490.00 DH (source: 12990.00 DH)',
      details: {
        productId: 'prod_iphone_15_pro',
        previousPrice: 12990,
        overridePrice: 12490,
        reason: 'Alignement promotion showroom Maârif',
      },
    });

    AuditService.log({
      userId: 'usr_admin',
      adminName: 'Directeur Technique CITY',
      action: 'import.commit',
      entityType: 'catalog_import',
      entityId: 'imp_001_initial',
      summary: 'Import initial fournisseur #101 validé et engagé (4 articles créés)',
      details: {
        importNumber: 101,
        sourceCode: 'fournisseur_officiel_tech',
        createdCount: 4,
      },
    });
  }

  // ==============================================================================
  // CATALOG PRODUCTS API
  // ==============================================================================

  public getProducts(params?: {
    search?: string;
    status?: string; // 'all' | 'published' | 'draft' | 'low_stock' | 'out_of_stock'
    category?: string;
    brand?: string;
    needsReview?: boolean;
    hasOverride?: boolean;
    missingSku?: boolean;
    missingBarcode?: boolean;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): { items: AdminProductView[]; total: number; page: number; limit: number } {
    let list: AdminProductView[] = this.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      brandId: p.brandId,
      brandName: p.brandName,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      name: p.name,
      derivedName: p.derivedName,
      overrideName: p.overrideName,
      isNameOverridden: p.isNameOverridden,
      description: p.description,
      derivedDescription: p.derivedDescription,
      overrideDescription: p.overrideDescription,
      isDescriptionOverridden: p.isDescriptionOverridden,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      price: p.price,
      derivedPrice: p.derivedPrice,
      overridePrice: p.overridePrice,
      isPriceOverridden: p.isPriceOverridden,
      compareAtPrice: p.compareAtPrice,
      isPublished: p.isPublished,
      isFeatured: p.isFeatured,
      availabilityStatus: p.availabilityStatus,
      variantsCount: p.variants.length,
      totalPhysicalStock: p.totalPhysicalStock,
      totalReservedStock: p.totalReservedStock,
      totalAvailableStock: p.totalAvailableStock,
      hasLowStock: p.hasLowStock,
      missingSku: p.missingSku,
      missingBarcode: p.missingBarcode,
      needsReview: p.needsReview,
      primarySourceCode: p.primarySourceCode,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((p) => {
        const fullProd = this.products.find((prod) => prod.id === p.id);
        const matchesName = p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
        const matchesBrand = p.brandName?.toLowerCase().includes(q);
        const matchesCat = p.categoryName?.toLowerCase().includes(q);
        const matchesVariants = fullProd?.variants.some(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.sku?.toLowerCase().includes(q) ||
            v.barcode?.toLowerCase().includes(q) ||
            v.modelNumber?.toLowerCase().includes(q)
        );
        return matchesName || matchesBrand || matchesCat || matchesVariants;
      });
    }

    if (params?.status && params.status !== 'all') {
      if (params.status === 'published') list = list.filter((p) => p.isPublished);
      else if (params.status === 'draft') list = list.filter((p) => !p.isPublished);
      else list = list.filter((p) => p.availabilityStatus === params.status);
    }

    if (params?.category && params.category !== 'all') {
      list = list.filter((p) => p.categoryId === params.category || p.categoryName === params.category);
    }

    if (params?.brand && params.brand !== 'all') {
      list = list.filter((p) => p.brandId === params.brand || p.brandName === params.brand);
    }

    if (params?.needsReview) {
      list = list.filter((p) => p.needsReview);
    }

    if (params?.hasOverride) {
      list = list.filter((p) => p.isPriceOverridden || p.isNameOverridden || p.isDescriptionOverridden);
    }

    if (params?.missingSku) {
      list = list.filter((p) => p.missingSku);
    }

    if (params?.missingBarcode) {
      list = list.filter((p) => p.missingBarcode);
    }

    if (params?.lowStock) {
      list = list.filter((p) => p.hasLowStock);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;
    const paginated = list.slice(offset, offset + limit);

    return { items: paginated, total: list.length, page, limit };
  }

  public getProductById(id: string): AdminProductDetailView | null {
    const found = this.products.find((p) => p.id === id || p.slug === id);
    if (!found) return null;
    return JSON.parse(JSON.stringify(found));
  }

  public getBrands() {
    return [...this.brands];
  }

  public getCategories() {
    return [...this.categories];
  }

  public getLocations() {
    return [...this.locations];
  }

  public updateProductGeneral(
    id: string,
    updates: {
      name?: string;
      description?: string;
      brandId?: string;
      categoryId?: string;
      isPublished?: boolean;
      availabilityStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
      seoTitle?: string;
      seoDescription?: string;
      slug?: string;
    },
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const prod = this.products.find((p) => p.id === id);
    if (!prod) throw new Error(`Produit introuvable: ${id}`);

    if (updates.slug && updates.slug !== prod.slug) {
      const slugExists = this.products.some((p) => p.id !== id && p.slug === updates.slug);
      if (slugExists) throw new Error(`Le slug "${updates.slug}" est déjà utilisé par un autre produit.`);
      prod.slug = updates.slug;
    }

    if (updates.brandId !== undefined) {
      prod.brandId = updates.brandId;
      const b = this.brands.find((brand) => brand.id === updates.brandId);
      prod.brandName = b ? b.name : null;
    }

    if (updates.categoryId !== undefined) {
      prod.categoryId = updates.categoryId;
      const c = this.categories.find((cat) => cat.id === updates.categoryId);
      prod.categoryName = c ? c.name : null;
    }

    if (updates.isPublished !== undefined) prod.isPublished = updates.isPublished;
    if (updates.availabilityStatus !== undefined) prod.availabilityStatus = updates.availabilityStatus;
    if (updates.seoTitle !== undefined) prod.seoTitle = updates.seoTitle;
    if (updates.seoDescription !== undefined) prod.seoDescription = updates.seoDescription;

    prod.updatedAt = new Date().toISOString();

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'product.update',
      entityType: 'product',
      entityId: prod.id,
      summary: `Mise à jour des informations générales de "${prod.name}"`,
      details: { updates },
    });

    return JSON.parse(JSON.stringify(prod));
  }

  public createProduct(
    data: {
      name: string;
      slug: string;
      brandId?: string;
      categoryId?: string;
      price: number;
      description?: string;
      sku?: string;
      barcode?: string;
      isPublished?: boolean;
    },
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const slugExists = this.products.some((p) => p.slug === data.slug);
    if (slugExists) throw new Error(`Le slug "${data.slug}" existe déjà.`);

    const brand = this.brands.find((b) => b.id === data.brandId);
    const category = this.categories.find((c) => c.id === data.categoryId);

    const newId = 'prod_' + Math.random().toString(36).substring(2, 9);
    const varId = 'var_' + Math.random().toString(36).substring(2, 9);

    const newProd: AdminProductDetailView = {
      id: newId,
      slug: data.slug,
      brandId: data.brandId || null,
      brandName: brand?.name || null,
      categoryId: data.categoryId || null,
      categoryName: category?.name || null,
      derivedName: data.name,
      overrideName: null,
      isNameOverridden: false,
      name: data.name,
      derivedDescription: data.description || null,
      overrideDescription: null,
      isDescriptionOverridden: false,
      description: data.description || null,
      seoTitle: `${data.name} | CITY Électronique`,
      seoDescription: data.description ? data.description.substring(0, 150) : null,
      derivedPrice: data.price,
      overridePrice: null,
      isPriceOverridden: false,
      price: data.price,
      compareAtPrice: null,
      isPublished: data.isPublished !== undefined ? data.isPublished : true,
      isFeatured: false,
      availabilityStatus: 'in_stock',
      variantsCount: 1,
      totalPhysicalStock: 0,
      totalReservedStock: 0,
      totalAvailableStock: 0,
      hasLowStock: true,
      missingSku: !data.sku,
      missingBarcode: !data.barcode,
      needsReview: false,
      primarySourceCode: 'store_manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      variants: [
        {
          id: varId,
          productId: newId,
          sku: data.sku || null,
          barcode: data.barcode || null,
          modelNumber: null,
          name: 'Édition Standard',
          isDefaultVariant: true,
          displayOrder: 1,
          attributes: {},
          derivedPrice: data.price,
          overridePrice: null,
          isPriceOverridden: false,
          effectivePrice: data.price,
          compareAtPrice: null,
          specifications: {},
          isAvailable: true,
          physicalStock: 0,
          reservedStock: 0,
          availableStock: 0,
        },
      ],
      images: [],
      inventoryByLocation: [
        { locationId: 'loc_maarif', locationCode: 'casa_maarif_showroom', locationName: 'Showroom Casablanca Maârif', variantId: varId, variantName: 'Édition Standard', physicalQuantity: 0, reservedQuantity: 0, availableQuantity: 0 },
        { locationId: 'loc_depot', locationCode: 'ain_sebaa_depot', locationName: 'Dépôt Central Aïn Sebaâ', variantId: varId, variantName: 'Édition Standard', physicalQuantity: 0, reservedQuantity: 0, availableQuantity: 0 },
      ],
      sources: [],
    };

    this.products.unshift(newProd);

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'product.create',
      entityType: 'product',
      entityId: newId,
      summary: `Création manuelle du produit "${data.name}" (${data.price} DH)`,
      details: { data },
    });

    return JSON.parse(JSON.stringify(newProd));
  }

  // ==============================================================================
  // OWNERSHIP OVERRIDES API
  // ==============================================================================

  public setPriceOverride(
    productId: string,
    variantId: string | null,
    overridePrice: number,
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const prod = this.products.find((p) => p.id === productId);
    if (!prod) throw new Error(`Produit introuvable: ${productId}`);

    if (overridePrice <= 0) {
      throw new Error('Le prix surchargé doit être strictement supérieur à zéro');
    }

    if (!variantId || prod.variants.length <= 1) {
      // Base product price override
      const previousEffective = prod.price;
      const state = FieldOwnershipResolver.resolve<number>(prod.derivedPrice, overridePrice, true);

      prod.overridePrice = overridePrice;
      prod.isPriceOverridden = true;
      prod.price = state.effectiveValue!;
      prod.updatedAt = new Date().toISOString();

      // Also sync single default variant price
      if (prod.variants.length === 1) {
        prod.variants[0].overridePrice = overridePrice;
        prod.variants[0].isPriceOverridden = true;
        prod.variants[0].effectivePrice = overridePrice;
      }

      AuditService.log({
        userId: adminUser.id,
        adminName: adminUser.name,
        action: 'product.override',
        entityType: 'product',
        entityId: prod.id,
        summary: `Surcharge manuelle de prix sur "${prod.name}": ${previousEffective} DH → ${overridePrice} DH`,
        details: {
          field: 'price',
          sourcePrice: prod.derivedPrice,
          previousPrice: previousEffective,
          overridePrice,
        },
      });
    } else {
      // Variant price override
      const variant = prod.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error(`Variante introuvable: ${variantId}`);

      const prev = variant.effectivePrice;
      variant.overridePrice = overridePrice;
      variant.isPriceOverridden = true;
      variant.effectivePrice = overridePrice;

      AuditService.log({
        userId: adminUser.id,
        adminName: adminUser.name,
        action: 'variant.override',
        entityType: 'product_variant',
        entityId: variant.id,
        summary: `Surcharge manuelle du prix variante "${variant.name}": ${prev} DH → ${overridePrice} DH`,
        details: {
          productId: prod.id,
          variantId: variant.id,
          overridePrice,
        },
      });
    }

    return JSON.parse(JSON.stringify(prod));
  }

  public removePriceOverride(
    productId: string,
    variantId: string | null,
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const prod = this.products.find((p) => p.id === productId);
    if (!prod) throw new Error(`Produit introuvable: ${productId}`);

    if (!variantId || prod.variants.length <= 1) {
      const removedOverride = prod.overridePrice;
      const state = FieldOwnershipResolver.resolve<number>(prod.derivedPrice, null, false);

      prod.overridePrice = null;
      prod.isPriceOverridden = false;
      prod.price = state.effectiveValue!; // Restores source value!
      prod.updatedAt = new Date().toISOString();

      if (prod.variants.length === 1) {
        prod.variants[0].overridePrice = null;
        prod.variants[0].isPriceOverridden = false;
        prod.variants[0].effectivePrice = prod.variants[0].derivedPrice || prod.derivedPrice;
      }

      AuditService.log({
        userId: adminUser.id,
        adminName: adminUser.name,
        action: 'product.override_removed',
        entityType: 'product',
        entityId: prod.id,
        summary: `Suppression de la surcharge de prix sur "${prod.name}". Rétablissement de la valeur source (${prod.price} DH)`,
        details: {
          field: 'price',
          removedOverride,
          restoredSourceValue: prod.derivedPrice,
        },
      });
    } else {
      const variant = prod.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error(`Variante introuvable: ${variantId}`);

      variant.overridePrice = null;
      variant.isPriceOverridden = false;
      variant.effectivePrice = variant.derivedPrice || prod.price;

      AuditService.log({
        userId: adminUser.id,
        adminName: adminUser.name,
        action: 'variant.override_removed',
        entityType: 'product_variant',
        entityId: variant.id,
        summary: `Suppression de la surcharge de prix de la variante "${variant.name}". Rétablissement source (${variant.effectivePrice} DH)`,
        details: {
          productId: prod.id,
          variantId: variant.id,
          restoredSourceValue: variant.effectivePrice,
        },
      });
    }

    return JSON.parse(JSON.stringify(prod));
  }

  public setNameOverride(
    productId: string,
    overrideName: string,
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const prod = this.products.find((p) => p.id === productId);
    if (!prod) throw new Error(`Produit introuvable: ${productId}`);

    if (!overrideName.trim()) throw new Error('Le nom surchargé ne peut pas être vide');

    prod.overrideName = overrideName.trim();
    prod.isNameOverridden = true;
    prod.name = overrideName.trim();
    prod.updatedAt = new Date().toISOString();

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'product.override',
      entityType: 'product',
      entityId: prod.id,
      summary: `Surcharge du nom de produit : "${overrideName.trim()}"`,
      details: { field: 'name', sourceName: prod.derivedName, overrideName: overrideName.trim() },
    });

    return JSON.parse(JSON.stringify(prod));
  }

  public removeNameOverride(
    productId: string,
    adminUser: { id: string; name: string }
  ): AdminProductDetailView {
    const prod = this.products.find((p) => p.id === productId);
    if (!prod) throw new Error(`Produit introuvable: ${productId}`);

    prod.overrideName = null;
    prod.isNameOverridden = false;
    prod.name = prod.derivedName;
    prod.updatedAt = new Date().toISOString();

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'product.override_removed',
      entityType: 'product',
      entityId: prod.id,
      summary: `Suppression de la surcharge du nom de produit. Rétablissement source : "${prod.derivedName}"`,
      details: { field: 'name', restoredSourceValue: prod.derivedName },
    });

    return JSON.parse(JSON.stringify(prod));
  }

  // ==============================================================================
  // INVENTORY API
  // ==============================================================================

  public getInventoryOverview(): Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    sku: string | null;
    physicalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
  }> {
    const records: Array<{
      locationId: string;
      locationCode: string;
      locationName: string;
      productId: string;
      productName: string;
      variantId: string;
      variantName: string;
      sku: string | null;
      physicalQuantity: number;
      reservedQuantity: number;
      availableQuantity: number;
    }> = [];

    for (const prod of this.products) {
      for (const loc of prod.inventoryByLocation) {
        const variant = prod.variants.find((v) => v.id === loc.variantId);
        records.push({
          locationId: loc.locationId,
          locationCode: loc.locationCode,
          locationName: loc.locationName,
          productId: prod.id,
          productName: prod.name,
          variantId: loc.variantId,
          variantName: loc.variantName,
          sku: variant?.sku || null,
          physicalQuantity: loc.physicalQuantity,
          reservedQuantity: loc.reservedQuantity,
          availableQuantity: loc.availableQuantity,
        });
      }
    }

    return records;
  }

  public adjustInventory(
    variantId: string,
    locationId: string,
    quantityChange: number,
    mode: 'delta' | 'absolute',
    reason: string,
    adminUser: { id: string; name: string }
  ) {
    let targetProd: AdminProductDetailView | undefined;
    let targetLocRecord: any;

    for (const prod of this.products) {
      const loc = prod.inventoryByLocation.find(
        (l) => l.variantId === variantId && (l.locationId === locationId || l.locationCode === locationId)
      );
      if (loc) {
        targetProd = prod;
        targetLocRecord = loc;
        break;
      }
    }

    if (!targetProd || !targetLocRecord) {
      throw new Error(`Emplacement d'inventaire introuvable pour la variante ${variantId}`);
    }

    const { newPhysical, newReserved, newAvailable, auditEntry } = InventoryService.applyAdjustment(
      targetLocRecord.physicalQuantity,
      targetLocRecord.reservedQuantity,
      {
        variantId,
        inventorySourceId: targetLocRecord.locationId,
        quantityChange,
        mode,
        reason,
        adminUserId: adminUser.id,
        adminName: adminUser.name,
      }
    );

    targetLocRecord.physicalQuantity = newPhysical;
    targetLocRecord.reservedQuantity = newReserved;
    targetLocRecord.availableQuantity = newAvailable;

    // Recalculate variant and product aggregate stocks
    this.recalculateStockTotals(targetProd);

    // Audit log
    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: auditEntry.action,
      entityType: auditEntry.entityType,
      entityId: auditEntry.entityId,
      summary: `Ajustement stock sur ${targetLocRecord.variantName} (${targetLocRecord.locationName}) : ${newPhysical} physique (disponible dérivé: ${newAvailable})`,
      details: auditEntry.details,
    });

    return { newPhysical, newReserved, newAvailable };
  }

  private recalculateStockTotals(prod: AdminProductDetailView) {
    let prodPhys = 0;
    let prodRes = 0;

    for (const v of prod.variants) {
      const locs = prod.inventoryByLocation.filter((l) => l.variantId === v.id);
      let vPhys = 0;
      let vRes = 0;
      for (const l of locs) {
        vPhys += l.physicalQuantity;
        vRes += l.reservedQuantity;
      }
      v.physicalStock = vPhys;
      v.reservedStock = vRes;
      v.availableStock = Math.max(0, vPhys - vRes);
      prodPhys += vPhys;
      prodRes += vRes;
    }

    prod.totalPhysicalStock = prodPhys;
    prod.totalReservedStock = prodRes;
    prod.totalAvailableStock = Math.max(0, prodPhys - prodRes);
    prod.hasLowStock = prod.totalAvailableStock <= 3;
    prod.availabilityStatus = prod.totalAvailableStock > 3 ? 'in_stock' : (prod.totalAvailableStock > 0 ? 'low_stock' : 'out_of_stock');
  }

  // ==============================================================================
  // IMAGES API
  // ==============================================================================

  public getAllImages(): ProductImageItem[] {
    const list: ProductImageItem[] = [];
    for (const p of this.products) {
      list.push(...p.images);
    }
    return list;
  }

  public verifyImage(
    imageId: string,
    newStatus: ImageVerificationStatus,
    adminUser: { id: string; name: string }
  ): ProductImageItem {
    for (const p of this.products) {
      const img = p.images.find((i) => i.id === imageId);
      if (img) {
        const updated = ImageService.verifyImage(img, newStatus, adminUser);
        Object.assign(img, updated);
        return updated;
      }
    }
    throw new Error(`Image introuvable: ${imageId}`);
  }

  // ==============================================================================
  // IMPORTS API
  // ==============================================================================

  public getImports(): StoredImport[] {
    return [...this.imports];
  }

  public getImportById(id: string): StoredImport | null {
    const found = this.imports.find((i) => i.id === id);
    if (!found) return null;
    return JSON.parse(JSON.stringify(found));
  }

  public getExistingItemsForMatching(): ExistingCatalogItem[] {
    const list: ExistingCatalogItem[] = [];
    for (const p of this.products) {
      for (const v of p.variants) {
        list.push({
          id: p.id,
          variantId: v.id,
          sourceRecordId: p.sources[0]?.sourceRecordId,
          sourceCode: p.sources[0]?.sourceCode || p.primarySourceCode,
          name: p.name,
          sku: v.sku,
          barcode: v.barcode,
          modelNumber: v.modelNumber,
          price: v.effectivePrice,
          isPriceOverridden: v.isPriceOverridden || p.isPriceOverridden,
          overridePrice: v.overridePrice || p.overridePrice,
          isNameOverridden: p.isNameOverridden,
          overrideName: p.overrideName,
          isActive: p.isPublished,
        });
      }
    }
    return list;
  }

  public createImportDryRun(params: {
    sourceCode: string;
    fileContent: string;
    fileType: 'csv' | 'json';
    filename: string;
    isFullSnapshot: boolean;
    adminUser: { id: string; name: string };
  }): StoredImport {
    const { sourceCode, fileContent, fileType, filename, isFullSnapshot, adminUser } = params;

    let rows: any[] = [];
    if (fileType === 'csv') {
      rows = CatalogImportPipeline.parseCsv(fileContent);
    } else {
      rows = CatalogImportPipeline.parseJson(fileContent);
    }

    const { valid, errors } = CatalogImportPipeline.normalizeRows(rows);
    const existingItems = this.getExistingItemsForMatching();

    const importId = 'imp_' + Math.random().toString(36).substring(2, 9);
    const importNumber = 100 + this.imports.length + 1;

    // Previous snapshot total count for safety check
    const previousSnapshotCount = existingItems.filter((i) => i.sourceCode === sourceCode).length || existingItems.length;

    const dryRunReport = CatalogImportPipeline.calculateDiff({
      importId,
      sourceCode,
      incoming: valid,
      existingItems,
      isFullSnapshot,
      previousTotalCount: previousSnapshotCount,
      maxSafetyDropPercentage: 15,
    });

    const status: StoredImport['status'] = dryRunReport.safety.blocked ? 'blocked_safety' : 'dry_run_ready';

    const newImport: StoredImport = {
      id: importId,
      sourceCode,
      sourceName: sourceCode === 'fournisseur_officiel_tech' ? 'Distributeur Officiel High-Tech Maroc' : 'Importateur Audio Direct Casablanca',
      importNumber,
      filename,
      isFullSnapshot,
      status,
      totalRecordsReceived: rows.length,
      wouldCreateCount: dryRunReport.wouldCreate,
      wouldUpdateCount: dryRunReport.wouldUpdate,
      wouldDeactivateCount: dryRunReport.wouldDeactivate,
      wouldManualReviewCount: dryRunReport.wouldManualReview,
      unchangedCount: dryRunReport.unchanged,
      errorCount: errors.length + dryRunReport.errors,
      safetyThresholdTriggered: dryRunReport.safety.triggered,
      safetyDropPercentage: dryRunReport.safety.dropPercentage,
      adminOverrideSafety: false,
      startedAt: new Date().toISOString(),
      dryRunReport,
    };

    this.imports.unshift(newImport);

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'import.dry_run',
      entityType: 'catalog_import',
      entityId: importId,
      summary: `Rapport de simulation d'import #${importNumber} généré (${valid.length} valides, ${dryRunReport.wouldCreate} créations, ${dryRunReport.wouldUpdate} maj)`,
      details: {
        importNumber,
        sourceCode,
        isFullSnapshot,
        safetyBlocked: dryRunReport.safety.blocked,
        dropPercentage: dryRunReport.safety.dropPercentage,
      },
    });

    return JSON.parse(JSON.stringify(newImport));
  }

  public overrideSafetyGuard(
    importId: string,
    reason: string,
    adminUser: { id: string; name: string; role: string }
  ): StoredImport {
    if (adminUser.role !== 'superadmin') {
      throw new Error('Seul un utilisateur avec le rôle SUPERADMIN peut passer outre le Snapshot Safety Guard');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Une justification détaillée (minimum 10 caractères) est obligatoire pour forcer un import bloqué');
    }

    const imp = this.imports.find((i) => i.id === importId);
    if (!imp) throw new Error(`Import introuvable: ${importId}`);

    imp.adminOverrideSafety = true;
    imp.adminOverrideReason = reason.trim();
    imp.status = 'dry_run_ready';

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'safety.override',
      entityType: 'catalog_import',
      entityId: imp.id,
      summary: `DÉPASSEMENT DE SÉCURITÉ AUTORISÉ par le superadmin sur l'import #${imp.importNumber} : ${reason}`,
      details: {
        importNumber: imp.importNumber,
        dropPercentage: imp.safetyDropPercentage,
        reason,
      },
    });

    return JSON.parse(JSON.stringify(imp));
  }

  public commitImport(
    importId: string,
    adminUser: { id: string; name: string }
  ): StoredImport {
    const imp = this.imports.find((i) => i.id === importId);
    if (!imp) throw new Error(`Import introuvable: ${importId}`);

    if (imp.status === 'blocked_safety' && !imp.adminOverrideSafety) {
      throw new Error('Impossible d\'engager un import bloqué par la sécurité sans dérogation explicite');
    }

    if (imp.status === 'committed') {
      throw new Error('Cet import a déjà été engagé');
    }

    // Apply creations/updates idempotently
    if (imp.dryRunReport) {
      for (const item of imp.dryRunReport.items) {
        if (item.action === 'create') {
          const diff = item.diff;
          const name = String(diff.name?.to || 'Nouveau Produit Importé');
          const price = Number(diff.price?.to || 100);
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 6);
          
          this.createProduct({
            name,
            slug,
            price,
            sku: diff.sku?.to ? String(diff.sku.to) : undefined,
            barcode: diff.barcode?.to ? String(diff.barcode.to) : undefined,
          }, adminUser);
        }
      }
    }

    imp.status = 'committed';
    imp.committedAt = new Date().toISOString();
    imp.approvedByAdmin = adminUser.name;

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'import.commit',
      entityType: 'catalog_import',
      entityId: imp.id,
      summary: `Import #${imp.importNumber} engagé avec succès (${imp.wouldCreateCount} créations, ${imp.wouldUpdateCount} mises à jour)`,
      details: {
        importNumber: imp.importNumber,
        creates: imp.wouldCreateCount,
        updates: imp.wouldUpdateCount,
        unchanged: imp.unchangedCount,
      },
    });

    return JSON.parse(JSON.stringify(imp));
  }

  // ==============================================================================
  // DASHBOARD METRICS
  // ==============================================================================

  public getDashboardMetrics() {
    let totalVariants = 0;
    let activeProducts = 0;
    let needsReviewCount = 0;
    let lowStockCount = 0;
    let overriddenCount = 0;

    for (const p of this.products) {
      totalVariants += p.variants.length;
      if (p.isPublished) activeProducts++;
      if (p.needsReview) needsReviewCount++;
      if (p.hasLowStock) lowStockCount++;
      if (p.isPriceOverridden || p.isNameOverridden || p.isDescriptionOverridden) overriddenCount++;
    }

    return {
      totalProducts: this.products.length,
      totalVariants,
      activeProducts,
      productsRequiringReview: needsReviewCount,
      lowStockItems: lowStockCount,
      productsWithOverrides: overriddenCount,
      inventoryLocationsCount: this.locations.length,
      recentImports: this.imports.slice(0, 5),
      recentAuditEvents: AuditService.query({ limit: 6 }),
    };
  }
}

declare global {
  var __cityCanonicalStore: CanonicalStore | undefined;
}

export const canonicalStore = globalThis.__cityCanonicalStore ?? new CanonicalStore();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__cityCanonicalStore = canonicalStore;
}
