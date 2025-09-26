import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  affected_items?: any[];
  resource_type?: 'product' | 'collection' | 'blog' | 'general';
  action_available?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { shopId } = await req.json()
    console.log('Running SEO diagnostic for shop:', shopId)

    // Create diagnostic record with running status
    const { data: diagnostic, error: createError } = await supabase
      .from('seo_diagnostics')
      .insert({
        shop_id: shopId,
        status: 'running'
      })
      .select()
      .single()

    if (createError || !diagnostic) {
      throw new Error('Failed to create diagnostic record')
    }

    // Fetch shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      throw new Error('Shop not found')
    }

    // Fetch products, collections, and blog posts
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)

    const { data: collections } = await supabase
      .from('collections')
      .select('*')
      .eq('shop_id', shopId)

    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('shop_id', shopId)

    const issues: SEOIssue[] = []

    // Enhanced product analysis
    if (products && products.length > 0) {
      // Missing alt texts
      const productsWithMissingAltTexts = products.filter(product => {
        if (!product.images || product.images.length === 0) return false
        return product.images.some((img: any) => !img.alt || img.alt.trim() === '')
      })

      if (productsWithMissingAltTexts.length > 0) {
        issues.push({
          type: 'error',
          category: 'Images',
          title: `${productsWithMissingAltTexts.length} produits avec textes alternatifs d'images manquants`,
          description: 'Les images sans texte alternatif nuisent à l\'accessibilité et au SEO',
          recommendation: 'Ajoutez des textes alternatifs descriptifs pour toutes les images de produits',
          affected_items: productsWithMissingAltTexts.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }

      // Short descriptions
      const productsWithShortDescriptions = products.filter(product => 
        !product.description || product.description.length < 150
      )

      if (productsWithShortDescriptions.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Contenu',
          title: `${productsWithShortDescriptions.length} produits avec descriptions insuffisantes`,
          description: 'Des descriptions trop courtes limitent le potentiel SEO',
          recommendation: 'Rédigez des descriptions détaillées d\'au moins 150 caractères',
          affected_items: productsWithShortDescriptions.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }
    }

    // Configuration checks
    if (!shop.consumer_key || !shop.consumer_secret) {
      issues.push({
        type: 'error',
        category: 'Configuration',
        title: 'Connexion WooCommerce manquante',
        description: 'Les clés API WooCommerce ne sont pas configurées',
        recommendation: 'Configurez les clés dans les paramètres de la boutique',
        resource_type: 'general',
        action_available: false
      })
    }

    // Calculate score
    let score = 100
    const errorCount = issues.filter(i => i.type === 'error').length
    const warningCount = issues.filter(i => i.type === 'warning').length
    const infoCount = issues.filter(i => i.type === 'info').length

    score -= errorCount * 15
    score -= warningCount * 8  
    score -= infoCount * 3
    score = Math.max(0, score)

    const summary = {
      total_issues: issues.length,
      errors: errorCount,
      warnings: warningCount,
      info: infoCount,
      products_analyzed: products?.length || 0,
      collections_analyzed: collections?.length || 0,
      blog_posts_analyzed: blogPosts?.length || 0
    }

    const recommendations = [
      'Priorisez la correction des erreurs avant les avertissements',
      'Commencez par optimiser vos produits les plus populaires',
      'Ajoutez des textes alternatifs à toutes vos images'
    ]

    // Update diagnostic record
    await supabase
      .from('seo_diagnostics')
      .update({
        status: 'completed',
        score,
        total_issues: issues.length,
        errors_count: errorCount,
        warnings_count: warningCount,
        info_count: infoCount,
        issues,
        recommendations,
        summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', diagnostic.id)

    const report = {
      id: diagnostic.id,
      score,
      issues,
      summary,
      recommendations,
      generated_at: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({ success: true, report }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error running SEO diagnostic:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})