import { NormalizedSourceProduct } from '../../catalog/adapter.interface';

/**
 * Glovo Channel Integration Abstraction
 * Marked as PENDING API VERIFICATION.
 * Disabled by default via GLOVO_INTEGRATION_ENABLED.
 */

export interface GlovoCatalogPayload {
  merchantId: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    available: boolean;
  }>;
}

export interface GlovoChannelAdapter {
  isConfigured(): boolean;
  syncCatalog(products: NormalizedSourceProduct[]): Promise<{ success: boolean; message: string }>;
  handleWebhook(payload: unknown, signature: string): Promise<{ acknowledged: boolean }>;
}

export class StubGlovoAdapter implements GlovoChannelAdapter {
  public isConfigured(): boolean {
    return false;
  }

  public async syncCatalog(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Intégration Glovo désactivée : en attente des spécifications et clés API officielles.',
    };
  }

  public async handleWebhook(): Promise<{ acknowledged: boolean }> {
    return { acknowledged: false };
  }
}
