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
      // 1. Missing alt texts (textes alternatifs d'images manquants)
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

      // 2. Short descriptions (descriptions courtes manquantes)
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

      // 3. Missing structured content (listes à puces manquantes)
      const productsWithoutStructuredContent = products.filter(product => {
        const description = product.description || ''
        const hasLists = description.includes('•') || description.includes('<ul>') || description.includes('<li>') || description.includes('-')
        const hasHeadings = description.includes('**') || description.includes('<h2>') || description.includes('<h3>')
        return description.length > 200 && !hasLists && !hasHeadings
      })

      if (productsWithoutStructuredContent.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Structure',
          title: `${productsWithoutStructuredContent.length} produits sans structure de contenu`,
          description: 'Les descriptions sans listes ou titres sont moins lisibles et moins SEO-friendly',
          recommendation: 'Ajoutez des listes à puces, des titres et une structure claire à vos descriptions',
          affected_items: productsWithoutStructuredContent.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }

      // 4. Missing SEO meta descriptions
      const productsWithoutMetaDescription = products.filter(product => 
        !product.short_description || product.short_description.length < 120 || product.short_description.length > 160
      )

      if (productsWithoutMetaDescription.length > 0) {
        issues.push({
          type: 'error',
          category: 'SEO',
          title: `${productsWithoutMetaDescription.length} produits avec méta-descriptions manquantes ou inadéquates`,
          description: 'Les méta-descriptions doivent faire entre 120-160 caractères pour un SEO optimal',
          recommendation: 'Rédigez des méta-descriptions attractives entre 120-160 caractères',
          affected_items: productsWithoutMetaDescription.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }

      // 5. Products without AI-generated content (pages non générées)
      const productsWithoutGeneratedContent = products.filter(product => {
        const description = product.description || ''
        const isGenericOrShort = description.length < 100 || 
          description.toLowerCase().includes('lorem ipsum') ||
          !description.includes('.')
        return isGenericOrShort
      })

      if (productsWithoutGeneratedContent.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Génération IA',
          title: `${productsWithoutGeneratedContent.length} produits sans contenu généré par IA`,
          description: 'Ces produits n\'ont pas de description optimisée générée automatiquement',
          recommendation: 'Utilisez la génération automatique de contenu pour créer des descriptions riches',
          affected_items: productsWithoutGeneratedContent.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }

      // 6. Missing internal links (liens internes manquants)
      const productsWithoutInternalLinks = products.filter(product => {
        const description = product.description || ''
        const hasInternalLinks = description.includes('href=') || description.includes('[') || description.includes('voir aussi') || description.includes('découvrir')
        return description.length > 200 && !hasInternalLinks
      })

      if (productsWithoutInternalLinks.length > 0) {
        issues.push({
          type: 'info',
          category: 'Maillage interne',
          title: `${productsWithoutInternalLinks.length} produits sans liens internes`,
          description: 'Le maillage interne améliore le SEO et l\'expérience utilisateur',
          recommendation: 'Ajoutez des liens vers d\'autres produits ou catégories pertinents',
          affected_items: productsWithoutInternalLinks.map(p => ({ id: p.id, name: p.name, type: 'product' })),
          resource_type: 'product',
          action_available: true
        })
      }
    }

    // Blog posts analysis
    if (blogPosts && blogPosts.length > 0) {
      // Missing featured images
      const postsWithoutFeaturedImage = blogPosts.filter(post => 
        !post.featured_image || post.featured_image.trim() === ''
      )

      if (postsWithoutFeaturedImage.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Images',
          title: `${postsWithoutFeaturedImage.length} articles sans image mise en avant`,
          description: 'Les images mises en avant améliorent l\'engagement et le partage social',
          recommendation: 'Ajoutez une image mise en avant pour tous vos articles de blog',
          affected_items: postsWithoutFeaturedImage.map(p => ({ id: p.id, name: p.title, type: 'blog' })),
          resource_type: 'blog',
          action_available: true
        })
      }

      // Missing SEO titles/descriptions
      const postsWithoutSEO = blogPosts.filter(post => 
        !post.seo_title || !post.seo_description || post.seo_description.length < 120
      )

      if (postsWithoutSEO.length > 0) {
        issues.push({
          type: 'error',
          category: 'SEO',
          title: `${postsWithoutSEO.length} articles sans optimisation SEO`,
          description: 'Les titres et descriptions SEO sont essentiels pour le référencement',
          recommendation: 'Configurez des titres SEO accrocheurs et des méta-descriptions de 120-160 caractères',
          affected_items: postsWithoutSEO.map(p => ({ id: p.id, name: p.title, type: 'blog' })),
          resource_type: 'blog',
          action_available: true
        })
      }
    }

    // Collections analysis
    if (collections && collections.length > 0) {
      // Collections without descriptions
      const collectionsWithoutDescription = collections.filter(collection => 
        !collection.description || collection.description.length < 100
      )

      if (collectionsWithoutDescription.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Contenu',
          title: `${collectionsWithoutDescription.length} collections sans description détaillée`,
          description: 'Les descriptions de collections améliorent leur référencement',
          recommendation: 'Rédigez des descriptions détaillées pour toutes vos collections',
          affected_items: collectionsWithoutDescription.map(c => ({ id: c.id, name: c.name, type: 'collection' })),
          resource_type: 'collection',
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
      'Priorisez la correction des erreurs (textes alternatifs, méta-descriptions) avant les avertissements',
      'Commencez par optimiser vos produits les plus populaires et visités',
      'Ajoutez des textes alternatifs descriptifs à toutes vos images de produits',
      'Structurez vos descriptions avec des listes à puces et des sous-titres',
      'Créez un maillage interne entre vos produits et catégories',
      'Utilisez la génération automatique pour enrichir le contenu de vos produits',
      'Optimisez la longueur de vos méta-descriptions (120-160 caractères)',
      'Ajoutez des images mises en avant pour tous vos articles de blog'
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