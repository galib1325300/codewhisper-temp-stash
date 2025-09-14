import { supabase } from '@/integrations/supabase/client';

export class SEOContentService {
  static async generateProductDescription(productId: string): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-seo', {
        body: { productId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error generating product description:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la génération' 
      };
    }
  }

  static async generateBlogPost(shopId: string, topic: string, keywords?: string[]): Promise<{ success: boolean; post?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: { shopId, topic, keywords }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error generating blog post:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la génération' 
      };
    }
  }

  static async optimizeProductSEO(productId: string): Promise<{ success: boolean; suggestions?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('optimize-product-seo', {
        body: { productId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error optimizing product SEO:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de l\'optimisation' 
      };
    }
  }

  static async runSEODiagnostic(shopId: string): Promise<{ success: boolean; report?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('run-seo-diagnostic', {
        body: { shopId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error running SEO diagnostic:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors du diagnostic' 
      };
    }
  }
}