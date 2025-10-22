import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SEOIssue {
  type: 'error' | 'warning' | 'info' | 'success';
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
        item_type: 'shop',
        item_id: shopId,
        status: 'running'
      })
      .select()
      .single()

    if (createError || !diagnostic) {
      console.error('Create diagnostic error', createError)
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
    const totalProducts = products?.length || 0
    const totalCollections = collections?.length || 0

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
          title: 'Textes alternatifs d\'images manquants',
          description: `Ajoutez des textes alternatifs descriptifs à toutes les images.`,
          recommendation: 'Ajoutez des textes alternatifs descriptifs pour toutes les images de produits',
          affected_items: productsWithMissingAltTexts.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Images',
          title: 'Textes alternatifs d\'images',
          description: `Toutes les images ont des textes alternatifs.`,
          recommendation: 'Continuez à ajouter des textes alternatifs descriptifs pour toutes les nouvelles images',
          resource_type: 'product',
          action_available: false
        })
      }

      // 2. Products without AI-generated content (Non générés)
      const productsWithoutGeneratedContent = products.filter(product => {
        const description = product.description || ''
        const isGenericOrShort = description.length < 100 || 
          description.toLowerCase().includes('lorem ipsum') ||
          !description.includes('.')
        return isGenericOrShort
      })

      if (productsWithoutGeneratedContent.length > 0) {
        issues.push({
          type: 'error',
          category: 'Génération',
          title: 'Non générés',
          description: `Ces pages n'ont pas été générées par l'outil.`,
          recommendation: 'Utilisez la génération automatique de contenu pour créer des descriptions riches',
          affected_items: productsWithoutGeneratedContent.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Génération',
          title: 'Contenu généré',
          description: `Tous les produits ont du contenu généré.`,
          recommendation: 'Continuez à utiliser la génération automatique pour les nouveaux produits',
          resource_type: 'product',
          action_available: false
        })
      }

      // 3. Missing internal links (Liens internes manquants)
      const productsWithoutInternalLinks = products.filter(product => {
        const description = product.description || ''
        const hasInternalLinks = description.includes('href=') || description.includes('[') || description.includes('voir aussi') || description.includes('découvrir')
        return description.length > 200 && !hasInternalLinks
      })

      if (productsWithoutInternalLinks.length > 0) {
        issues.push({
          type: 'error',
          category: 'Maillage interne',
          title: 'Liens internes manquants',
          description: `Ajoutez des liens vers d'autres pages pertinentes du site.`,
          recommendation: 'Ajoutez des liens vers d\'autres produits ou catégories pertinents',
          affected_items: productsWithoutInternalLinks.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Maillage interne',
          title: 'Liens internes présents',
          description: `Le maillage interne est bien configuré.`,
          recommendation: 'Continuez à créer des liens internes pertinents',
          resource_type: 'product',
          action_available: false
        })
      }

      // 4. Missing bold keywords (Mots-clés en gras manquants)
      const productsWithoutBoldKeywords = products.filter(product => {
        const description = product.description || ''
        const hasBold = description.includes('<strong>') || description.includes('<b>') || description.includes('**')
        return description.length > 200 && !hasBold
      })

      if (productsWithoutBoldKeywords.length > 0) {
        issues.push({
          type: 'error',
          category: 'Mise en forme',
          title: 'Mots-clés en gras manquants',
          description: `Mettez en gras les mots-clés importants pour améliorer la lisibilité.`,
          recommendation: 'Mettez en gras les mots-clés importants pour améliorer la lisibilité',
          affected_items: productsWithoutBoldKeywords.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Mise en forme',
          title: 'Mots-clés en gras',
          description: `Les mots-clés importants sont correctement mis en évidence.`,
          recommendation: 'Continuez à mettre en gras les mots-clés importants',
          resource_type: 'product',
          action_available: false
        })
      }

      // 5. Misleading links (Liens trompeurs)
      const productsWithMisleadingLinks = products.filter(product => {
        const description = product.description || ''
        const hasGenericLinks = description.includes('cliquez ici') || description.includes('ici') || description.includes('en savoir plus') || description.match(/<a[^>]*>voir<\/a>/i)
        return hasGenericLinks
      })

      if (productsWithMisleadingLinks.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Liens',
          title: 'Liens trompeurs',
          description: `Le texte des liens doit clairement indiquer la destination.`,
          recommendation: 'Utilisez des ancres descriptives au lieu de "cliquez ici" ou "en savoir plus"',
          affected_items: productsWithMisleadingLinks.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Liens',
          title: 'Liens descriptifs',
          description: `Les liens utilisent des ancres descriptives.`,
          recommendation: 'Continuez à utiliser des ancres de liens claires et descriptives',
          resource_type: 'product',
          action_available: false
        })
      }

      // 6. Missing bullet lists (Liste à puces manquante)
      const productsWithoutBulletLists = products.filter(product => {
        const description = product.description || ''
        const hasLists = description.includes('•') || description.includes('<ul>') || description.includes('<li>')
        return description.length > 200 && !hasLists
      })

      if (productsWithoutBulletLists.length > 0) {
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'Liste à puces manquante',
          description: `Utilisez des listes à puces pour améliorer la lisibilité des énumérations.`,
          recommendation: 'Ajoutez des listes à puces pour structurer le contenu et améliorer la lisibilité',
          affected_items: productsWithoutBulletLists.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Structure',
          title: 'Listes à puces présentes',
          description: `Le contenu est bien structuré avec des listes.`,
          recommendation: 'Continuez à utiliser des listes à puces pour structurer le contenu',
          resource_type: 'product',
          action_available: false
        })
      }

      // 7. Incorrect slug (Slug incorrect)
      const productsWithIncorrectSlug = products.filter(product => {
        const slug = product.slug || ''
        const name = product.name || ''
        // Check if slug is too long, contains numbers only, or doesn't match the product name
        const isTooLong = slug.length > 60
        const hasNoKeywords = !slug.match(/[a-z]{3,}/gi)
        const nameWords = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ')
        const slugWords = slug.toLowerCase().split('-')
        const hasMatchingWords = nameWords.some(word => word.length > 3 && slugWords.includes(word))
        
        return isTooLong || hasNoKeywords || !hasMatchingWords
      })

      if (productsWithIncorrectSlug.length > 0) {
        issues.push({
          type: 'error',
          category: 'URL',
          title: 'Slug incorrect',
          description: `Le slug doit être cohérent avec le titre et contenir des mots-clés pertinents.`,
          recommendation: 'Créez des slugs courts, descriptifs et contenant les mots-clés principaux',
          affected_items: productsWithIncorrectSlug.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'URL',
          title: 'Slugs optimisés',
          description: `Les URLs sont bien optimisées avec des slugs pertinents.`,
          recommendation: 'Continuez à créer des slugs descriptifs pour les nouveaux produits',
          resource_type: 'product',
          action_available: false
        })
      }

      // 8. Missing H2 titles (Titre(s) H2 manquant(s))
      const productsWithoutH2 = products.filter(product => {
        const description = product.description || ''
        const hasH2 = description.includes('<h2>') || description.includes('## ')
        return description.length > 300 && !hasH2
      })

      if (productsWithoutH2.length > 0) {
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'Titre(s) H2 manquant(s)',
          description: `Structurez votre contenu avec au moins 3 sous-titres H2.`,
          recommendation: 'Ajoutez des sous-titres H2 pour structurer le contenu des descriptions longues',
          affected_items: productsWithoutH2.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Structure',
          title: 'Sous-titres H2 présents',
          description: `Le contenu est bien structuré avec des sous-titres.`,
          recommendation: 'Continuez à structurer le contenu avec des H2 pertinents',
          resource_type: 'product',
          action_available: false
        })
      }

      // 9. Missing focus keyword (Mot-clé focus manquant)
      const productsWithoutFocusKeyword = products.filter(product => 
        !product.focus_keyword || product.focus_keyword.trim() === ''
      )

      if (productsWithoutFocusKeyword.length > 0) {
        issues.push({
          type: 'warning',
          category: 'SEO',
          title: 'Mot-clé focus manquant',
          description: `Définissez un mot-clé principal pour chaque produit.`,
          recommendation: 'Identifiez et définissez un mot-clé focus pour chaque produit',
          affected_items: productsWithoutFocusKeyword.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          title: 'Mots-clés focus définis',
          description: `Tous les produits ont un mot-clé focus défini.`,
          recommendation: 'Continuez à définir des mots-clés focus pertinents',
          resource_type: 'product',
          action_available: false
        })
      }

      // 10. Short meta descriptions
      const productsWithShortMetaDescription = products.filter(product => 
        !product.meta_description || product.meta_description.length < 120 || product.meta_description.length > 160
      )

      if (productsWithShortMetaDescription.length > 0) {
        issues.push({
          type: 'error',
          category: 'SEO',
          title: 'Méta-description inadéquate',
          description: `Les méta-descriptions doivent faire entre 120-160 caractères.`,
          recommendation: 'Rédigez des méta-descriptions attractives entre 120-160 caractères',
          affected_items: productsWithShortMetaDescription.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true
        })
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          title: 'Méta-descriptions optimisées',
          description: `Toutes les méta-descriptions sont de la bonne longueur.`,
          recommendation: 'Continuez à rédiger des méta-descriptions entre 120-160 caractères',
          resource_type: 'product',
          action_available: false
        })
      }
    } else if (totalProducts === 0) {
      // No products at all
      issues.push({
        type: 'info',
        category: 'Produits',
        title: 'Aucun produit',
        description: `Aucun produit n'a été trouvé dans la boutique.`,
        recommendation: 'Synchronisez vos produits WooCommerce ou ajoutez des produits',
        resource_type: 'product',
        action_available: false
      })
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
      // 1. Incorrect H2 titles (H2 incorrect)
      const collectionsWithIncorrectH2 = collections.filter(collection => {
        const description = collection.description || ''
        const hasH2 = description.includes('<h2>') || description.includes('## ')
        const h2Count = (description.match(/<h2>/g) || []).length + (description.match(/## /g) || []).length
        return description.length > 200 && (!hasH2 || h2Count < 2)
      })

      if (collectionsWithIncorrectH2.length > 0) {
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'H2 incorrect',
          description: `Les H2 doivent être pertinents et refléter la structure du contenu.`,
          recommendation: 'Ajoutez au moins 2 sous-titres H2 pertinents dans la description',
          affected_items: collectionsWithIncorrectH2.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true
        })
      }

      // 2. Missing products (Produits manquants - moins de 15 produits)
      const collectionsWithFewProducts = await Promise.all(
        collections.map(async (collection) => {
          const { count } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('shop_id', shopId)
            .contains('categories', [{ id: collection.external_id }])
          
          return { collection, productCount: count || 0 }
        })
      )

      const collectionsNeedingMoreProducts = collectionsWithFewProducts.filter(
        ({ productCount }) => productCount < 15
      )

      if (collectionsNeedingMoreProducts.length > 0) {
        issues.push({
          type: 'error',
          category: 'Contenu',
          title: 'Produits manquants',
          description: `Ajoutez au moins 15 produits pertinents à la collection.`,
          recommendation: 'Complétez vos collections avec au moins 15 produits pertinents',
          affected_items: collectionsNeedingMoreProducts.map(({ collection, productCount }) => ({ 
            id: collection.id, 
            name: `${collection.name} (${productCount} produits)`, 
            type: 'collection',
            slug: collection.slug 
          })),
          resource_type: 'collection',
          action_available: false
        })
      }

      // 3. Missing internal links (Liens internes manquants)
      const collectionsWithoutInternalLinks = collections.filter(collection => {
        const description = collection.description || ''
        const hasInternalLinks = description.includes('href=') || description.includes('[')
        return description.length > 200 && !hasInternalLinks
      })

      if (collectionsWithoutInternalLinks.length > 0) {
        issues.push({
          type: 'error',
          category: 'Maillage interne',
          title: 'Liens internes manquants',
          description: `Ajoutez des liens vers d'autres pages pertinentes du site.`,
          recommendation: 'Ajoutez des liens vers d\'autres collections ou catégories pertinentes',
          affected_items: collectionsWithoutInternalLinks.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true
        })
      }

      // 4. Missing descriptions
      const collectionsWithoutDescription = collections.filter(collection => 
        !collection.description || collection.description.length < 150
      )

      if (collectionsWithoutDescription.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Contenu',
          title: 'Description manquante ou trop courte',
          description: `Les descriptions de collections améliorent leur référencement.`,
          recommendation: 'Rédigez des descriptions détaillées pour toutes vos collections',
          affected_items: collectionsWithoutDescription.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true
        })
      }
    }

    // Home page checks (Page d'accueil)
    // Note: This requires scraping the home page to check title and H1
    if (shop.url) {
      issues.push({
        type: 'info',
        category: 'Page d\'accueil',
        title: 'Titre à vérifier',
        description: `Assurez-vous que le titre correspond au contenu de la page et contient les mots-clés pertinents.`,
        recommendation: 'Vérifiez que le titre de la page d\'accueil contient vos mots-clés principaux',
        resource_type: 'general',
        action_available: false
      })
    }

    // Product page template check (Page produit - template)
    issues.push({
      type: 'info',
      category: 'Template produit',
      title: 'H1 à vérifier',
      description: `Le H1 doit correspondre au titre de la page et contenir les mots-clés principaux.`,
      recommendation: 'Vérifiez que le template de page produit utilise un H1 correct',
      resource_type: 'general',
      action_available: false
    })

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

    // Sort issues by priority: error > warning > info > success
    const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 };
    issues.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

    // Calculate score
    let score = 100
    const errorCount = issues.filter(i => i.type === 'error').length
    const warningCount = issues.filter(i => i.type === 'warning').length
    const infoCount = issues.filter(i => i.type === 'info').length
    const successCount = issues.filter(i => i.type === 'success').length

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
      'Priorisez la correction des erreurs critiques avant les avertissements',
      'Ajoutez des textes alternatifs descriptifs à toutes vos images',
      'Générez du contenu optimisé SEO pour tous vos produits',
      'Créez un maillage interne entre vos pages avec des liens pertinents',
      'Mettez en gras les mots-clés importants dans vos descriptions',
      'Utilisez des ancres descriptives pour tous vos liens',
      'Structurez vos descriptions avec des listes à puces et sous-titres H2',
      'Optimisez vos slugs pour qu\'ils soient courts et contiennent des mots-clés',
      'Définissez un mot-clé focus pour chaque produit',
      'Rédigez des méta-descriptions attractives entre 120-160 caractères',
      'Ajoutez au moins 15 produits pertinents dans chaque collection',
      'Vérifiez que vos H1 et titres de page sont optimisés'
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
        summary: JSON.stringify(summary),
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