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
  score_improvement?: number;
  maxPoints?: number;
  earnedPoints?: number;
}

// Pondération SEO réaliste pour l'e-commerce (Total: 150 points → normalisé à 100)
const SEO_WEIGHTS = {
  // Produits (15 vérifications - 81 points)
  PRODUCT_ALT_TEXTS: 7,
  PRODUCT_META_DESCRIPTIONS: 8,
  PRODUCT_AI_CONTENT: 10,
  PRODUCT_INTERNAL_LINKS: 6,
  PRODUCT_STRUCTURED_DESC: 5,
  PRODUCT_SEO_KEYWORDS: 6,
  PRODUCT_BULLET_POINTS: 3,
  PRODUCT_BOLD_TEXT: 3,
  PRODUCT_SEO_TITLES: 7,
  PRODUCT_IMAGES_PRESENT: 5,
  PRODUCT_PRICES: 4,
  PRODUCT_CATEGORIES: 4,
  PRODUCT_LONG_DESC: 6,
  PRODUCT_DESCRIPTIVE_LINKS: 3,
  PRODUCT_ADEQUATE_TITLES: 4,

  // Collections (4 vérifications - 15 points)
  COLLECTION_H2_TITLES: 5,
  COLLECTION_PRODUCT_COUNT: 3,
  COLLECTION_INTERNAL_LINKS: 4,
  COLLECTION_DESC_LENGTH: 3,

  // Articles de blog (4 vérifications - 15 points)
  BLOG_FEATURED_IMAGE: 3,
  BLOG_SEO_META: 7,
  BLOG_CONTENT_LENGTH: 3,
  BLOG_INTERNAL_LINKS: 2,

  // Vérifications avancées (6 vérifications - 35 points)
  ADVANCED_IMAGE_SIZE: 5,
  ADVANCED_ALT_GENERIC: 4,
  ADVANCED_DUPLICATE_META: 6,
  ADVANCED_BROKEN_LINKS: 5,
  ADVANCED_LINK_HIERARCHY: 5,
  ADVANCED_SCHEMA_MARKUP: 10,

  // Pages générales (2 vérifications - 4 points)
  GENERAL_HOME_TEMPLATE: 2,
  GENERAL_PRODUCT_TEMPLATE: 2,
};

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

    // Enhanced product analysis
    if (products && products.length > 0) {
      // 1. Missing alt texts (textes alternatifs d'images manquants)
      const productsWithMissingAltTexts = products.filter(product => {
        if (!product.images || product.images.length === 0) return false
        return product.images.some((img: any) => !img.alt || img.alt.trim() === '')
      })

      const altWeight = SEO_WEIGHTS.ALT_TEXTS;
      if (productsWithMissingAltTexts.length > 0) {
        const lostPoints = Math.round((productsWithMissingAltTexts.length / totalProducts) * altWeight);
        issues.push({
          type: 'error',
          category: 'Images',
          title: 'Textes alternatifs d\'images manquants',
          description: `${productsWithMissingAltTexts.length} produit(s) ont des images sans texte alternatif.`,
          recommendation: 'Ajoutez des descriptions pertinentes à toutes vos images produits pour améliorer votre visibilité dans Google Images.',
          affected_items: productsWithMissingAltTexts.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: altWeight,
          earnedPoints: altWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Images',
          title: 'Textes alternatifs d\'images optimisés',
          description: 'Tous vos produits ont des textes alternatifs pour leurs images.',
          recommendation: 'Excellent ! Continuez à ajouter des textes alt descriptifs pour chaque nouvelle image.',
          resource_type: 'product',
          maxPoints: altWeight,
          earnedPoints: altWeight,
          score_improvement: altWeight
        })
      }

      // 2. Products without AI-generated content (Non générés)
      const productsWithoutGeneratedContent = products.filter(product => {
        const description = product.description || ''
        const isGenericOrShort = description.length < 200 || 
          description.toLowerCase().includes('lorem ipsum') ||
          !description.includes('.')
        return isGenericOrShort
      })

      const aiWeight = SEO_WEIGHTS.AI_CONTENT;
      if (productsWithoutGeneratedContent.length > 0) {
        const lostPoints = Math.round((productsWithoutGeneratedContent.length / totalProducts) * aiWeight);
        issues.push({
          type: 'error',
          category: 'Génération',
          title: 'Non générés',
          description: `${productsWithoutGeneratedContent.length} produit(s) n'ont pas de contenu optimisé.`,
          recommendation: 'Utilisez la génération automatique de contenu pour créer des descriptions riches et optimisées SEO.',
          affected_items: productsWithoutGeneratedContent.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: aiWeight,
          earnedPoints: aiWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Génération',
          title: 'Contenu généré de qualité',
          description: 'Tous vos produits ont du contenu généré et optimisé.',
          recommendation: 'Continuez à utiliser la génération automatique pour les nouveaux produits.',
          resource_type: 'product',
          maxPoints: aiWeight,
          earnedPoints: aiWeight,
          score_improvement: aiWeight
        })
      }

      // 3. Missing internal links (Liens internes manquants)
      const productsWithoutInternalLinks = products.filter(product => {
        const description = product.description || ''
        const hasInternalLinks = description.includes('href=') || description.includes('[') || description.includes('voir aussi') || description.includes('découvrir')
        return description.length > 200 && !hasInternalLinks
      })

      const linksWeight = SEO_WEIGHTS.INTERNAL_LINKS;
      if (productsWithoutInternalLinks.length > 0) {
        const lostPoints = Math.round((productsWithoutInternalLinks.length / totalProducts) * linksWeight);
        issues.push({
          type: 'error',
          category: 'Maillage interne',
          title: 'Liens internes manquants',
          description: `${productsWithoutInternalLinks.length} produit(s) n'ont pas de liens internes. Le maillage améliore la navigation et le référencement.`,
          recommendation: 'Ajoutez des liens vers d\'autres produits ou catégories pertinents dans vos descriptions.',
          affected_items: productsWithoutInternalLinks.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: linksWeight,
          earnedPoints: linksWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Maillage interne',
          title: 'Liens internes présents',
          description: 'Le maillage interne est bien configuré.',
          recommendation: 'Continuez à créer des liens internes pertinents.',
          resource_type: 'product',
          maxPoints: linksWeight,
          earnedPoints: linksWeight,
          score_improvement: linksWeight
        })
      }

      // 4. Missing bold keywords (Mots-clés en gras manquants)
      const productsWithoutBoldKeywords = products.filter(product => {
        const description = product.description || ''
        const hasBold = description.includes('<strong>') || description.includes('<b>') || description.includes('**')
        return description.length > 200 && !hasBold
      })

      const boldWeight = SEO_WEIGHTS.BOLD_TEXT;
      if (productsWithoutBoldKeywords.length > 0) {
        const lostPoints = Math.round((productsWithoutBoldKeywords.length / totalProducts) * boldWeight);
        issues.push({
          type: 'error',
          category: 'Mise en forme',
          title: 'Mots-clés en gras manquants',
          description: `${productsWithoutBoldKeywords.length} produit(s) n'utilisent pas de mise en gras.`,
          recommendation: 'Mettez en gras les mots-clés importants pour améliorer la lisibilité et le SEO.',
          affected_items: productsWithoutBoldKeywords.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: boldWeight,
          earnedPoints: boldWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Mise en forme',
          title: 'Mots-clés en gras',
          description: 'Les mots-clés importants sont correctement mis en évidence.',
          recommendation: 'Continuez à mettre en gras les mots-clés importants.',
          resource_type: 'product',
          maxPoints: boldWeight,
          earnedPoints: boldWeight,
          score_improvement: boldWeight
        })
      }

      // 5. Misleading links (Liens trompeurs)
      const productsWithMisleadingLinks = products.filter(product => {
        const description = product.description || ''
        const hasGenericLinks = description.includes('cliquez ici') || description.includes('ici') || description.includes('en savoir plus') || description.match(/<a[^>]*>voir<\/a>/i)
        return hasGenericLinks
      })

      const misleadingWeight = SEO_WEIGHTS.MISLEADING_LINKS;
      if (productsWithMisleadingLinks.length > 0) {
        const lostPoints = Math.round((productsWithMisleadingLinks.length / totalProducts) * misleadingWeight);
        issues.push({
          type: 'warning',
          category: 'Liens',
          title: 'Liens trompeurs',
          description: `${productsWithMisleadingLinks.length} produit(s) utilisent des ancres non descriptives.`,
          recommendation: 'Utilisez des ancres descriptives au lieu de "cliquez ici" ou "en savoir plus".',
          affected_items: productsWithMisleadingLinks.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: misleadingWeight,
          earnedPoints: misleadingWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Liens',
          title: 'Liens descriptifs',
          description: 'Les liens utilisent des ancres descriptives.',
          recommendation: 'Continuez à utiliser des ancres de liens claires et descriptives.',
          resource_type: 'product',
          maxPoints: misleadingWeight,
          earnedPoints: misleadingWeight,
          score_improvement: misleadingWeight
        })
      }

      // 6. Missing bullet lists (Liste à puces manquante)
      const productsWithoutBulletLists = products.filter(product => {
        const description = product.description || ''
        const hasLists = description.includes('•') || description.includes('<ul>') || description.includes('<li>')
        return description.length > 200 && !hasLists
      })

      const bulletWeight = SEO_WEIGHTS.BULLET_LISTS;
      if (productsWithoutBulletLists.length > 0) {
        const lostPoints = Math.round((productsWithoutBulletLists.length / totalProducts) * bulletWeight);
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'Liste à puces manquante',
          description: `${productsWithoutBulletLists.length} produit(s) n'utilisent pas de listes à puces.`,
          recommendation: 'Ajoutez des listes à puces pour structurer le contenu et améliorer la lisibilité.',
          affected_items: productsWithoutBulletLists.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: bulletWeight,
          earnedPoints: bulletWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Structure',
          title: 'Listes à puces présentes',
          description: 'Le contenu est bien structuré avec des listes.',
          recommendation: 'Continuez à utiliser des listes à puces pour structurer le contenu.',
          resource_type: 'product',
          maxPoints: bulletWeight,
          earnedPoints: bulletWeight,
          score_improvement: bulletWeight
        })
      }

      // 7. Incorrect slug (Slug incorrect)
      const productsWithIncorrectSlug = products.filter(product => {
        const slug = product.slug || ''
        const name = product.name || ''
        const isTooLong = slug.length > 60
        const hasNoKeywords = !slug.match(/[a-z]{3,}/gi)
        const nameWords = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ')
        const slugWords = slug.toLowerCase().split('-')
        const hasMatchingWords = nameWords.some(word => word.length > 3 && slugWords.includes(word))
        
        return isTooLong || hasNoKeywords || !hasMatchingWords
      })

      const slugsWeight = SEO_WEIGHTS.SLUGS;
      if (productsWithIncorrectSlug.length > 0) {
        const lostPoints = Math.round((productsWithIncorrectSlug.length / totalProducts) * slugsWeight);
        issues.push({
          type: 'error',
          category: 'URL',
          title: 'Slug incorrect',
          description: `${productsWithIncorrectSlug.length} produit(s) ont des URLs non optimisées.`,
          recommendation: 'Créez des slugs courts, descriptifs et contenant les mots-clés principaux.',
          affected_items: productsWithIncorrectSlug.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: slugsWeight,
          earnedPoints: slugsWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'URL',
          title: 'Slugs optimisés',
          description: 'Les URLs sont bien optimisées avec des slugs pertinents.',
          recommendation: 'Continuez à créer des slugs descriptifs pour les nouveaux produits.',
          resource_type: 'product',
          maxPoints: slugsWeight,
          earnedPoints: slugsWeight,
          score_improvement: slugsWeight
        })
      }

      // 8. Missing H2 titles (Titre(s) H2 manquant(s))
      const productsWithoutH2 = products.filter(product => {
        const description = product.description || ''
        const hasH2 = description.includes('<h2>') || description.includes('## ')
        return description.length > 300 && !hasH2
      })

      const h2Weight = SEO_WEIGHTS.H2_TITLES;
      if (productsWithoutH2.length > 0) {
        const lostPoints = Math.round((productsWithoutH2.length / totalProducts) * h2Weight);
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'Titre(s) H2 manquant(s)',
          description: `${productsWithoutH2.length} produit(s) manquent de sous-titres H2.`,
          recommendation: 'Ajoutez des sous-titres H2 pour structurer le contenu des descriptions longues.',
          affected_items: productsWithoutH2.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: h2Weight,
          earnedPoints: h2Weight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Structure',
          title: 'Sous-titres H2 présents',
          description: 'Le contenu est bien structuré avec des sous-titres.',
          recommendation: 'Continuez à structurer le contenu avec des H2 pertinents.',
          resource_type: 'product',
          maxPoints: h2Weight,
          earnedPoints: h2Weight,
          score_improvement: h2Weight
        })
      }

      // 9. Missing focus keyword (Mot-clé focus manquant)
      const productsWithoutFocusKeyword = products.filter(product => 
        !product.focus_keyword || product.focus_keyword.trim() === ''
      )

      const keywordsWeight = SEO_WEIGHTS.FOCUS_KEYWORDS;
      if (productsWithoutFocusKeyword.length > 0) {
        const lostPoints = Math.round((productsWithoutFocusKeyword.length / totalProducts) * keywordsWeight);
        issues.push({
          type: 'warning',
          category: 'SEO',
          title: 'Mot-clé focus manquant',
          description: `${productsWithoutFocusKeyword.length} produit(s) n'ont pas de mot-clé focus défini.`,
          recommendation: 'Identifiez et définissez un mot-clé focus pour chaque produit.',
          affected_items: productsWithoutFocusKeyword.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: keywordsWeight,
          earnedPoints: keywordsWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          title: 'Mots-clés focus définis',
          description: 'Tous les produits ont un mot-clé focus défini.',
          recommendation: 'Continuez à définir des mots-clés focus pertinents.',
          resource_type: 'product',
          maxPoints: keywordsWeight,
          earnedPoints: keywordsWeight,
          score_improvement: keywordsWeight
        })
      }

      // 10. Short meta descriptions
      const productsWithShortMetaDescription = products.filter(product => 
        !product.meta_description || product.meta_description.length < 120 || product.meta_description.length > 160
      )

      const metaDescWeight = SEO_WEIGHTS.META_DESC;
      if (productsWithShortMetaDescription.length > 0) {
        const lostPoints = Math.round((productsWithShortMetaDescription.length / totalProducts) * metaDescWeight);
        issues.push({
          type: 'error',
          category: 'SEO',
          title: 'Méta-description inadéquate',
          description: `${productsWithShortMetaDescription.length} produit(s) ont des méta-descriptions non optimales.`,
          recommendation: 'Rédigez des méta-descriptions attractives entre 120-160 caractères.',
          affected_items: productsWithShortMetaDescription.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: metaDescWeight,
          earnedPoints: metaDescWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          title: 'Méta-descriptions optimisées',
          description: 'Toutes les méta-descriptions sont de la bonne longueur.',
          recommendation: 'Continuez à rédiger des méta-descriptions entre 120-160 caractères.',
          resource_type: 'product',
          maxPoints: metaDescWeight,
          earnedPoints: metaDescWeight,
          score_improvement: metaDescWeight
        })
      }

      // 11. Title tags too long or too short
      const productsWithBadTitles = products.filter(product => 
        !product.name || product.name.length < 30 || product.name.length > 60
      )

      const titlesWeight = SEO_WEIGHTS.TITLES_LENGTH;
      if (productsWithBadTitles.length > 0) {
        const lostPoints = Math.round((productsWithBadTitles.length / totalProducts) * titlesWeight);
        issues.push({
          type: 'error',
          category: 'SEO',
          title: 'Titres inadéquats',
          description: `${productsWithBadTitles.length} produit(s) ont des titres non optimisés (30-60 caractères requis).`,
          recommendation: 'Créez des titres accrocheurs entre 30-60 caractères contenant vos mots-clés.',
          affected_items: productsWithBadTitles.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: false,
          maxPoints: titlesWeight,
          earnedPoints: titlesWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          title: 'Titres optimisés',
          description: 'Tous les titres ont la longueur optimale.',
          recommendation: 'Continuez à créer des titres entre 30-60 caractères.',
          resource_type: 'product',
          maxPoints: titlesWeight,
          earnedPoints: titlesWeight,
          score_improvement: titlesWeight
        })
      }

      // 12. Missing product images
      const productsWithoutImages = products.filter(product => 
        !product.images || product.images.length === 0
      )

      const imagesWeight = SEO_WEIGHTS.IMAGES_PRESENT;
      if (productsWithoutImages.length > 0) {
        const lostPoints = Math.round((productsWithoutImages.length / totalProducts) * imagesWeight);
        issues.push({
          type: 'error',
          category: 'Images',
          title: 'Images manquantes',
          description: `${productsWithoutImages.length} produit(s) n'ont aucune image.`,
          recommendation: 'Ajoutez plusieurs images de qualité montrant le produit sous différents angles.',
          affected_items: productsWithoutImages.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: false,
          maxPoints: imagesWeight,
          earnedPoints: imagesWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Images',
          title: 'Images présentes',
          description: 'Tous les produits ont des images.',
          recommendation: 'Continuez à ajouter des images de qualité.',
          resource_type: 'product',
          maxPoints: imagesWeight,
          earnedPoints: imagesWeight,
          score_improvement: imagesWeight
        })
      }

      // 13. Short descriptions
      const productsWithShortDescription = products.filter(product => 
        !product.description || product.description.length < 300
      )

      const descLengthWeight = SEO_WEIGHTS.DESC_LENGTH;
      if (productsWithShortDescription.length > 0) {
        const lostPoints = Math.round((productsWithShortDescription.length / totalProducts) * descLengthWeight);
        issues.push({
          type: 'warning',
          category: 'Contenu',
          title: 'Descriptions trop courtes',
          description: `${productsWithShortDescription.length} produit(s) ont des descriptions de moins de 300 caractères.`,
          recommendation: 'Enrichissez vos descriptions avec au moins 300 caractères de contenu pertinent.',
          affected_items: productsWithShortDescription.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: true,
          maxPoints: descLengthWeight,
          earnedPoints: descLengthWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Contenu',
          title: 'Descriptions complètes',
          description: 'Toutes les descriptions ont une longueur suffisante.',
          recommendation: 'Continuez à créer des descriptions détaillées.',
          resource_type: 'product',
          maxPoints: descLengthWeight,
          earnedPoints: descLengthWeight,
          score_improvement: descLengthWeight
        })
      }

      // 14. Missing product prices
      const productsWithoutPrice = products.filter(product => 
        !product.price || product.price <= 0
      )

      const pricesWeight = SEO_WEIGHTS.PRICES;
      if (productsWithoutPrice.length > 0) {
        const lostPoints = Math.round((productsWithoutPrice.length / totalProducts) * pricesWeight);
        issues.push({
          type: 'error',
          category: 'Configuration',
          title: 'Prix manquants',
          description: `${productsWithoutPrice.length} produit(s) n'ont pas de prix défini.`,
          recommendation: 'Configurez un prix pour tous vos produits.',
          affected_items: productsWithoutPrice.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: false,
          maxPoints: pricesWeight,
          earnedPoints: pricesWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Configuration',
          title: 'Prix configurés',
          description: 'Tous les produits ont un prix défini.',
          recommendation: 'Maintenez vos prix à jour.',
          resource_type: 'product',
          maxPoints: pricesWeight,
          earnedPoints: pricesWeight,
          score_improvement: pricesWeight
        })
      }

      // 15. Missing product categories
      const productsWithoutCategory = products.filter(product => 
        !product.categories || product.categories.length === 0
      )

      const categoriesWeight = SEO_WEIGHTS.CATEGORIES;
      if (productsWithoutCategory.length > 0) {
        const lostPoints = Math.round((productsWithoutCategory.length / totalProducts) * categoriesWeight);
        issues.push({
          type: 'warning',
          category: 'Organisation',
          title: 'Catégories manquantes',
          description: `${productsWithoutCategory.length} produit(s) ne sont pas catégorisés.`,
          recommendation: 'Assignez chaque produit à au moins une catégorie pertinente.',
          affected_items: productsWithoutCategory.map(p => ({ id: p.id, name: p.name, type: 'product', slug: p.slug })),
          resource_type: 'product',
          action_available: false,
          maxPoints: categoriesWeight,
          earnedPoints: categoriesWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Organisation',
          title: 'Produits catégorisés',
          description: 'Tous les produits sont organisés dans des catégories.',
          recommendation: 'Continuez à bien organiser vos produits.',
          resource_type: 'product',
          maxPoints: categoriesWeight,
          earnedPoints: categoriesWeight,
          score_improvement: categoriesWeight
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

    // === BLOG POSTS ANALYSIS ===
    console.log('\n=== Analyzing Blog Posts ===\n');
    
    if (blogPosts && blogPosts.length > 0) {
      console.log(`Found ${blogPosts.length} blog posts\n`);
      const totalBlogPosts = blogPosts.length;
      
      // 1. Check for featured images
      const postsWithoutImage = blogPosts.filter(post => !post.featured_image);
      const postsWithImage = blogPosts.filter(post => post.featured_image);
      
      const blogImageWeight = SEO_WEIGHTS.BLOG_FEATURED_IMAGE;
      if (postsWithoutImage.length > 0) {
        const earnedRatio = postsWithImage.length / totalBlogPosts;
        const earned = Math.round(blogImageWeight * earnedRatio);
        
        issues.push({
          type: 'error',
          category: 'Articles de blog',
          title: 'Images à la une manquantes',
          description: `${postsWithoutImage.length} articles n'ont pas d'image à la une, ce qui nuit à leur visibilité.`,
          recommendation: 'Ajoutez une image à la une attrayante pour chaque article de blog.',
          affected_items: postsWithoutImage.map(post => ({
            id: post.id,
            name: post.title,
            slug: post.slug,
            type: 'blog'
          })),
          resource_type: 'blog',
          action_available: false,
          maxPoints: blogImageWeight,
          earnedPoints: earned,
          score_improvement: blogImageWeight - earned,
        });
      } else {
        issues.push({
          type: 'success',
          category: 'Articles de blog',
          title: 'Images à la une présentes',
          description: `Tous vos ${totalBlogPosts} articles ont une image à la une.`,
          recommendation: '',
          resource_type: 'blog',
          maxPoints: blogImageWeight,
          earnedPoints: blogImageWeight,
          score_improvement: blogImageWeight,
        });
      }

      // 2. Check for SEO meta data
      const postsWithoutSEO = blogPosts.filter(post => !post.meta_title || !post.meta_description);
      const postsWithSEO = blogPosts.filter(post => post.meta_title && post.meta_description);
      
      const blogSEOWeight = SEO_WEIGHTS.BLOG_SEO_META;
      if (postsWithoutSEO.length > 0) {
        const earnedRatio = postsWithSEO.length / totalBlogPosts;
        const earned = Math.round(blogSEOWeight * earnedRatio);
        
        issues.push({
          type: 'warning',
          category: 'Articles de blog',
          title: 'Métadonnées SEO manquantes',
          description: `${postsWithoutSEO.length} articles n'ont pas de titre ou description SEO optimisés.`,
          recommendation: 'Ajoutez un titre SEO (60 caractères max) et une méta-description (160 caractères max) pour chaque article.',
          affected_items: postsWithoutSEO.map(post => ({
            id: post.id,
            name: post.title,
            slug: post.slug,
            type: 'blog'
          })),
          resource_type: 'blog',
          action_available: false,
          maxPoints: blogSEOWeight,
          earnedPoints: earned,
          score_improvement: blogSEOWeight - earned,
        });
      } else {
        issues.push({
          type: 'success',
          category: 'Articles de blog',
          title: 'Métadonnées SEO optimisées',
          description: `Tous vos ${totalBlogPosts} articles ont des métadonnées SEO complètes.`,
          recommendation: '',
          resource_type: 'blog',
          maxPoints: blogSEOWeight,
          earnedPoints: blogSEOWeight,
          score_improvement: blogSEOWeight,
        });
      }

      // 3. Check content length (minimum 300 words)
      const shortPosts = blogPosts.filter(post => {
        const contentLength = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
        return contentLength < 300;
      });
      const longPosts = blogPosts.filter(post => {
        const contentLength = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
        return contentLength >= 300;
      });
      
      const blogContentWeight = SEO_WEIGHTS.BLOG_CONTENT_LENGTH;
      if (shortPosts.length > 0) {
        const earnedRatio = longPosts.length / totalBlogPosts;
        const earned = Math.round(blogContentWeight * earnedRatio);
        
        issues.push({
          type: 'warning',
          category: 'Articles de blog',
          title: 'Contenu trop court',
          description: `${shortPosts.length} articles ont moins de 300 mots, ce qui est insuffisant pour le SEO.`,
          recommendation: 'Visez au moins 300-500 mots par article pour un meilleur référencement.',
          affected_items: shortPosts.map(post => ({
            id: post.id,
            name: post.title,
            slug: post.slug,
            type: 'blog'
          })),
          resource_type: 'blog',
          action_available: false,
          maxPoints: blogContentWeight,
          earnedPoints: earned,
          score_improvement: blogContentWeight - earned,
        });
      } else {
        issues.push({
          type: 'success',
          category: 'Articles de blog',
          title: 'Contenu suffisamment long',
          description: `Tous vos ${totalBlogPosts} articles ont un contenu d'au moins 300 mots.`,
          recommendation: '',
          resource_type: 'blog',
          maxPoints: blogContentWeight,
          earnedPoints: blogContentWeight,
          score_improvement: blogContentWeight,
        });
      }

      // 4. Check internal links (at least 2 per post)
      const postsWithoutLinks = blogPosts.filter(post => {
        if (!post.content) return true;
        const linkMatches = post.content.match(/<a\s+[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
        return linkMatches.length < 2;
      });
      const postsWithLinks = blogPosts.filter(post => {
        if (!post.content) return false;
        const linkMatches = post.content.match(/<a\s+[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
        return linkMatches.length >= 2;
      });
      
      const blogLinksWeight = SEO_WEIGHTS.BLOG_INTERNAL_LINKS;
      if (postsWithoutLinks.length > 0) {
        const earnedRatio = postsWithLinks.length / totalBlogPosts;
        const earned = Math.round(blogLinksWeight * earnedRatio);
        
        issues.push({
          type: 'info',
          category: 'Articles de blog',
          title: 'Maillage interne insuffisant',
          description: `${postsWithoutLinks.length} articles ont moins de 2 liens internes.`,
          recommendation: 'Ajoutez au moins 2-3 liens internes vers d\'autres pages de votre site dans chaque article.',
          affected_items: postsWithoutLinks.map(post => ({
            id: post.id,
            name: post.title,
            slug: post.slug,
            type: 'blog'
          })),
          resource_type: 'blog',
          action_available: false,
          maxPoints: blogLinksWeight,
          earnedPoints: earned,
          score_improvement: blogLinksWeight - earned,
        });
      } else {
        issues.push({
          type: 'success',
          category: 'Articles de blog',
          title: 'Bon maillage interne',
          description: `Tous vos ${totalBlogPosts} articles contiennent au moins 2 liens internes.`,
          recommendation: '',
          resource_type: 'blog',
          maxPoints: blogLinksWeight,
          earnedPoints: blogLinksWeight,
          score_improvement: blogLinksWeight,
        });
      }
    }

    // Collections analysis
    if (collections && collections.length > 0) {
      const totalCollections = collections.length;

      // 1. Incorrect H2 titles
      const collectionsWithIncorrectH2 = collections.filter(collection => {
        const description = collection.description || ''
        const hasH2 = description.includes('<h2>') || description.includes('## ')
        const h2Count = (description.match(/<h2>/g) || []).length + (description.match(/## /g) || []).length
        return description.length > 200 && (!hasH2 || h2Count < 2)
      })

      const collH2Weight = SEO_WEIGHTS.COLLECTIONS_H2;
      if (collectionsWithIncorrectH2.length > 0) {
        const lostPoints = Math.round((collectionsWithIncorrectH2.length / totalCollections) * collH2Weight);
        issues.push({
          type: 'error',
          category: 'Structure',
          title: 'H2 incorrect',
          description: `${collectionsWithIncorrectH2.length} collection(s) manquent de sous-titres H2.`,
          recommendation: 'Ajoutez au moins 2 sous-titres H2 pertinents dans la description',
          affected_items: collectionsWithIncorrectH2.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true,
          maxPoints: collH2Weight,
          earnedPoints: collH2Weight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Structure',
          title: 'Collections bien structurées',
          description: 'Vos collections utilisent des sous-titres H2.',
          recommendation: 'Parfait ! Continuez à structurer vos contenus avec des H2.',
          resource_type: 'collection',
          maxPoints: collH2Weight,
          earnedPoints: collH2Weight,
          score_improvement: collH2Weight
        })
      }

      // 2. Missing products (moins de 15 produits)
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

      const collProductsWeight = SEO_WEIGHTS.COLLECTIONS_PRODUCTS;
      if (collectionsNeedingMoreProducts.length > 0) {
        const lostPoints = Math.round((collectionsNeedingMoreProducts.length / totalCollections) * collProductsWeight);
        issues.push({
          type: 'error',
          category: 'Contenu',
          title: 'Produits manquants',
          description: `${collectionsNeedingMoreProducts.length} collection(s) ont moins de 15 produits.`,
          recommendation: 'Complétez vos collections avec au moins 15 produits pertinents',
          affected_items: collectionsNeedingMoreProducts.map(({ collection, productCount }) => ({ 
            id: collection.id, 
            name: `${collection.name} (${productCount} produits)`, 
            type: 'collection',
            slug: collection.slug 
          })),
          resource_type: 'collection',
          action_available: false,
          maxPoints: collProductsWeight,
          earnedPoints: collProductsWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Contenu',
          title: 'Collections bien fournies',
          description: 'Vos collections contiennent suffisamment de produits.',
          recommendation: 'Continuez à enrichir vos collections.',
          resource_type: 'collection',
          maxPoints: collProductsWeight,
          earnedPoints: collProductsWeight,
          score_improvement: collProductsWeight
        })
      }

      // 3. Missing internal links
      const collectionsWithoutInternalLinks = collections.filter(collection => {
        const description = collection.description || ''
        const hasInternalLinks = description.includes('href=') || description.includes('[')
        return description.length > 200 && !hasInternalLinks
      })

      const collLinksWeight = SEO_WEIGHTS.COLLECTIONS_LINKS;
      if (collectionsWithoutInternalLinks.length > 0) {
        const lostPoints = Math.round((collectionsWithoutInternalLinks.length / totalCollections) * collLinksWeight);
        issues.push({
          type: 'error',
          category: 'Maillage interne',
          title: 'Liens internes manquants',
          description: `${collectionsWithoutInternalLinks.length} collection(s) n'ont pas de liens internes.`,
          recommendation: 'Ajoutez des liens vers d\'autres collections ou catégories pertinentes',
          affected_items: collectionsWithoutInternalLinks.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true,
          maxPoints: collLinksWeight,
          earnedPoints: collLinksWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Maillage interne',
          title: 'Maillage interne présent',
          description: 'Vos collections contiennent des liens internes.',
          recommendation: 'Excellent maillage interne !',
          resource_type: 'collection',
          maxPoints: collLinksWeight,
          earnedPoints: collLinksWeight,
          score_improvement: collLinksWeight
        })
      }

      // 4. Missing descriptions
      const collectionsWithoutDescription = collections.filter(collection => 
        !collection.description || collection.description.length < 150
      )

      const collDescWeight = SEO_WEIGHTS.COLLECTIONS_DESC;
      if (collectionsWithoutDescription.length > 0) {
        const lostPoints = Math.round((collectionsWithoutDescription.length / totalCollections) * collDescWeight);
        issues.push({
          type: 'warning',
          category: 'Contenu',
          title: 'Description manquante ou trop courte',
          description: `${collectionsWithoutDescription.length} collection(s) ont des descriptions insuffisantes.`,
          recommendation: 'Rédigez des descriptions détaillées pour toutes vos collections',
          affected_items: collectionsWithoutDescription.map(c => ({ id: c.id, name: c.name, type: 'collection', slug: c.slug })),
          resource_type: 'collection',
          action_available: true,
          maxPoints: collDescWeight,
          earnedPoints: collDescWeight - lostPoints,
          score_improvement: lostPoints
        })
      } else {
        issues.push({
          type: 'success',
          category: 'Contenu',
          title: 'Descriptions complètes',
          description: 'Vos collections ont des descriptions suffisamment détaillées.',
          recommendation: 'Parfait ! Maintenez ce niveau de qualité.',
          resource_type: 'collection',
          maxPoints: collDescWeight,
          earnedPoints: collDescWeight,
          score_improvement: collDescWeight
        })
      }
    }

    // Home page checks (pas de pondération pour l'instant)
    if (shop.url) {
      issues.push({
        type: 'info',
        category: 'Page d\'accueil',
        title: 'Titre à vérifier',
        description: `Assurez-vous que le titre correspond au contenu de la page et contient les mots-clés pertinents.`,
        recommendation: 'Vérifiez que le titre de la page d\'accueil contient vos mots-clés principaux',
        resource_type: 'general',
        action_available: false,
        maxPoints: SEO_WEIGHTS.HOME_BLOG_LINK,
        earnedPoints: 0,
        score_improvement: SEO_WEIGHTS.HOME_BLOG_LINK
      })
    }

    // Product page template check (pas de pondération pour l'instant)
    issues.push({
      type: 'info',
      category: 'Template produit',
      title: 'H1 à vérifier',
      description: `Le H1 doit correspondre au titre de la page et contenir les mots-clés principaux.`,
      recommendation: 'Vérifiez que le template de page produit utilise un H1 correct',
      resource_type: 'general',
      action_available: false,
      maxPoints: SEO_WEIGHTS.PRODUCT_PAGE_LINK,
      earnedPoints: 0,
      score_improvement: SEO_WEIGHTS.PRODUCT_PAGE_LINK
    })

    // Configuration checks (pas de pondération)
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

    // Calculate score based on points system
    let totalEarnedPoints = 0;
    let totalMaxPoints = 0;
    
    issues.forEach(issue => {
      if (issue.maxPoints !== undefined && issue.earnedPoints !== undefined) {
        totalMaxPoints += issue.maxPoints;
        totalEarnedPoints += issue.earnedPoints;
      }
    });
    
    // Score = (Points gagnés / Total points possibles) × 100
    const score = totalMaxPoints > 0 
      ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) 
      : 0;

    // Calculate issue counts (only actual problems, not successes)
    const errorCount = issues.filter(i => i.type === 'error').length
    const warningCount = issues.filter(i => i.type === 'warning').length
    const infoCount = issues.filter(i => i.type === 'info').length
    const successCount = issues.filter(i => i.type === 'success').length
    
    // Total issues = only problems (error + warning + info), NOT success
    const totalIssues = errorCount + warningCount + infoCount
    
    console.log(`Score calculation: ${totalEarnedPoints} points earned out of ${totalMaxPoints} possible → Score: ${score}/100`)
    console.log(`Issues breakdown: ${errorCount} errors, ${warningCount} warnings, ${infoCount} info, ${successCount} successes`)

    const summary = {
      total_issues: totalIssues,
      errors: errorCount,
      warnings: warningCount,
      info: infoCount,
      success: successCount,
      products_analyzed: products?.length || 0,
      collections_analyzed: collections?.length || 0,
      blog_posts_analyzed: blogPosts?.length || 0
    }

    const recommendations = [
      '1. **Priorisez les erreurs critiques** : Corrigez d\'abord les erreurs (rouge) avant les avertissements (jaune).',
      '2. **Textes alternatifs** : Ajoutez des descriptions précises à toutes vos images (important pour Google Images).',
      '3. **Contenu optimisé** : Générez du contenu riche et optimisé SEO pour tous vos produits (impact majeur).',
      '4. **Maillage interne** : Créez des liens entre vos pages pour améliorer la navigation et le référencement.',
      '5. **Mise en forme** : Mettez en gras les mots-clés importants et utilisez des listes à puces.',
      '6. **Ancres de liens** : Utilisez des textes descriptifs au lieu de "cliquez ici" ou "en savoir plus".',
      '7. **Structure H2** : Organisez vos descriptions longues avec des sous-titres pertinents.',
      '8. **Utiliser Schema.org** : Implémentez les données structurées JSON-LD pour vos produits (très important pour Google Shopping).',
      '9. **Surveiller la vitesse** : Optimisez le temps de chargement de vos pages (objectif < 3 secondes) et compressez vos images.',
      '10. **Éviter le contenu dupliqué** : Assurez-vous que chaque page a un contenu unique, surtout les méta-descriptions.',
      '11. **Mobile-first** : Assurez-vous que votre site est parfaitement responsive.',
      '12. **Vérifier les liens internes** : Corrigez régulièrement les liens cassés et maintenez une bonne structure hiérarchique.',
      '13. **Textes alt descriptifs** : Évitez les noms génériques comme "image1.jpg", utilisez des descriptions précises.',
      '14. **Actualiser régulièrement** : Publiez du nouveau contenu (blog, nouveaux produits) pour maintenir la fraîcheur du site.',
      '15. **Analyser les performances** : Utilisez Google Search Console et Analytics pour suivre vos progrès.',
      '16. **Optimiser les articles de blog** : Visez au moins 300 mots avec 2-3 liens internes par article.',
      '17. **Enrichir les collections** : Ajoutez des descriptions longues avec titres H2 et liens vers les produits phares.'
    ];

    // Update diagnostic record
    await supabase
      .from('seo_diagnostics')
      .update({
        status: 'completed',
        score,
        total_issues: totalIssues,
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
