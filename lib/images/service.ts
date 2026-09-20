import { AuditService } from '../audit/service';

export type ImageSourceType = 'external_supplier' | 'city_studio' | 'brand_presskit';
export type ImageVerificationStatus = 'pending' | 'verified' | 'broken';

export interface ProductImageItem {
  id: string;
  productId: string;
  productName?: string;
  variantId?: string | null;
  variantName?: string | null;
  sourceUrl: string;
  localPath?: string | null;
  imageSourceType: ImageSourceType;
  isPrimary: boolean;
  displayOrder: number;
  altText: string;
  verificationStatus: ImageVerificationStatus;
  createdAt: string;
}

export class ImageService {
  /**
   * Sets verification status on a product image and logs the event.
   */
  public static verifyImage(
    image: ProductImageItem,
    newStatus: ImageVerificationStatus,
    adminUser: { id: string; name: string }
  ): ProductImageItem {
    const previousStatus = image.verificationStatus;
    const updated: ProductImageItem = {
      ...image,
      verificationStatus: newStatus,
    };

    AuditService.log({
      userId: adminUser.id,
      adminName: adminUser.name,
      action: 'image.verify',
      entityType: 'product_image',
      entityId: image.id,
      summary: `Image ${image.id} passée de "${previousStatus}" à "${newStatus}"`,
      details: {
        imageId: image.id,
        productId: image.productId,
        previousStatus,
        newStatus,
        imageSourceType: image.imageSourceType,
      },
    });

    return updated;
  }
}
