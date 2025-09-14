import { supabase } from '@/integrations/supabase/client';
import { WooCommerceProduct, WooCommerceCategory } from './types';

export class WooCommerceService {
  static async syncProducts(shopId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('sync-woocommerce-products', {
        body: { shopId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error syncing products:', error);
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation' 
      };
    }
  }

  static async syncCollections(shopId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('sync-woocommerce-categories', {
        body: { shopId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error syncing collections:', error);
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Erreur lors de la synchronisation' 
      };
    }
  }

  static async testConnection(shopId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('test-woocommerce-connection', {
        body: { shopId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erreur de connexion' 
      };
    }
  }

  static async getDashboardStats(shopId: string): Promise<{ 
    success: boolean; 
    stats?: {
      products: number;
      collections: number;
      orders: number;
      revenue: string;
      customers: number;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-woocommerce-stats', {
        body: { shopId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error getting stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques' 
      };
    }
  }
}