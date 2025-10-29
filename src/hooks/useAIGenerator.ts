import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Niche {
  name: string;
  description: string;
  search_volume: number;
  competition_score: number;
  profit_margin_avg: number;
  seasonality: Record<string, number>;
  top_keywords: string[];
  aliexpress_availability?: 'high' | 'medium' | 'low';
  example_products?: string[];
}

export interface CompetitorAnalysis {
  competitors: Array<{
    url: string;
    categories: string[];
    h1: string;
    metaDescription: string;
    productCount: number;
    technology: string;
  }>;
  recommended_structure: {
    categories: string[];
    must_have_pages: string[];
    top_keywords: string[];
    avg_product_count: number;
    seo_best_practices: string[];
  };
  competitors_strengths: string[];
  opportunities: string[];
}

export interface GeneratedSite {
  id: string;
  user_id: string;
  niche_name: string;
  status: 'generating' | 'completed' | 'failed';
  products_count: number;
  collections_count: number;
  csv_woocommerce_url: string | null;
  csv_shopify_url: string | null;
  error_message: string | null;
  config: any;
  created_at: string;
}

export interface GeneratorSubscription {
  id: string;
  plan_type: 'one_time' | 'monthly_unlimited' | 'yearly_unlimited';
  sites_remaining: number | null;
  expires_at: string | null;
}

export function useNicheSuggestions(params: { country: string; language: string }) {
  return useQuery({
    queryKey: ['niches', params],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-niche-research', {
        body: { userId: user.id, ...params }
      });
      
      if (error) throw error;
      return data.niches as Niche[];
    },
    enabled: !!params.country && !!params.language,
  });
}

export function useCompetitorAnalysis() {
  return useMutation({
    mutationFn: async (params: { nicheName: string; country: string; language: string; manualUrls?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('ai-competitor-analysis', {
        body: params
      });
      
      if (error) throw error;
      return data as CompetitorAnalysis;
    },
  });
}

export function useGenerateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      nicheName: string;
      targetProductCount: number;
      language: string;
      country: string;
      competitors: string[];
      recommendedStructure: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Create site entry
      const { data: site, error: siteError } = await supabase
        .from('ai_generated_sites')
        .insert({
          user_id: user.id,
          niche_name: params.nicheName,
          status: 'generating',
          config: {
            language: params.language,
            country: params.country,
            targetProductCount: params.targetProductCount,
          }
        })
        .select()
        .single();

      if (siteError) throw siteError;

      // 2. Trigger generation (async)
      supabase.functions.invoke('ai-generate-catalog', {
        body: {
          userId: user.id,
          siteId: site.id,
          ...params
        }
      });

      return site as GeneratedSite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-sites'] });
    },
  });
}

export function useGeneratedSite(siteId: string | undefined) {
  return useQuery({
    queryKey: ['generated-site', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site ID');

      const { data, error } = await supabase
        .from('ai_generated_sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (error) throw error;
      return data as GeneratedSite;
    },
    enabled: !!siteId,
    refetchInterval: (query) => {
      // Poll every 5 seconds while generating
      return query.state.data?.status === 'generating' ? 5000 : false;
    },
  });
}

export function useGeneratedSites() {
  return useQuery({
    queryKey: ['generated-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generated_sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GeneratedSite[];
    },
  });
}

export function useExportCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { siteId: string; format: 'woocommerce' | 'shopify' }) => {
      const { data, error } = await supabase.functions.invoke('ai-export-catalog', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-site', variables.siteId] });
    },
  });
}

// ❌ DÉSACTIVÉ TEMPORAIREMENT - Table ai_generator_subscriptions n'existe pas encore
// export function useGeneratorSubscription() {
//   return useQuery({
//     queryKey: ['generator-subscription'],
//     queryFn: async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) throw new Error('Not authenticated');

//       const { data, error } = await supabase
//         .from('ai_generator_subscriptions')
//         .select('*')
//         .eq('user_id', user.id)
//         .single();

//       if (error && error.code !== 'PGRST116') throw error;
//       return data as GeneratorSubscription | null;
//     },
//   });
// }
