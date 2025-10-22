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

// Pondération SEO réaliste pour l'e-commerce (Total: 100 points)
const SEO_WEIGHTS = {
  // Produits - 81 points total
  ALT_TEXTS: 7,              // Critique pour Google Images
  AI_CONTENT: 10,            // Le plus important - contenu de qualité
  INTERNAL_LINKS: 6,         // Maillage interne
  BOLD_TEXT: 3,              // Mots en gras
  MISLEADING_LINKS: 2,       // Liens descriptifs
  BULLET_LISTS: 3,           // Listes à puces
  SLUGS: 4,                  // URLs optimisées
  H2_TITLES: 5,              // Structure H2
  FOCUS_KEYWORDS: 6,         // Mots-clés focus
  META_DESC: 8,              // Impact direct sur CTR
  TITLES_LENGTH: 7,          // Titres optimisés (30-60 caractères)
  IMAGES_PRESENT: 5,         // Images produits
  DESC_LENGTH: 6,            // Descriptions suffisamment longues
  PRICES: 4,                 // Prix présents
  CATEGORIES: 4,             // Catégorisation
  SHORT_DESC: 1,             // Descriptions courtes (moins critique)
  
  // Collections - 15 points total
  COLLECTIONS_H2: 4,         // Structure H2
  COLLECTIONS_PRODUCTS: 3,   // Nombre de produits
  COLLECTIONS_LINKS: 5,      // Liens internes
  COLLECTIONS_DESC: 3,       // Descriptions
  
  // Général - 4 points total
  HOME_BLOG_LINK: 2,         // Lien blog sur page d'accueil
  PRODUCT_PAGE_LINK: 2,      // Lien descriptif page produit
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

    // Blog posts analysis (pas de pondération pour l'instant)
    if (blogPosts && blogPosts.length > 0) {
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
      'Priorisez la correction des erreurs critiques avant les avertissements',
      'Ajoutez des textes alternatifs descriptifs à toutes vos images pour Google Images',
      'Générez du contenu optimisé SEO avec l\'IA pour tous vos produits (impact majeur)',
      'Créez un maillage interne entre vos pages avec des liens pertinents',
      'Mettez en gras les mots-clés importants dans vos descriptions',
      'Utilisez des ancres descriptives pour tous vos liens (évitez "cliquez ici")',
      'Structurez vos descriptions avec des listes à puces et sous-titres H2',
      'Optimisez vos slugs pour qu\'ils soient courts et contiennent des mots-clés',
      'Définissez un mot-clé focus pour chaque produit',
      'Rédigez des méta-descriptions attractives entre 120-160 caractères (impact CTR)',
      'Assurez-vous que les titres fassent entre 30 et 60 caractères',
      'Vérifiez que tous vos produits ont au moins une image de qualité',
      'Rédigez des descriptions d\'au moins 300 caractères pour le SEO longue traîne',
      'Définissez un prix pour tous vos produits disponibles à la vente',
      'Organisez vos produits en catégories cohérentes',
      'Ajoutez au moins 15 produits pertinents dans chaque collection',
      'Optimisez la vitesse de chargement de votre site (moins de 3 secondes)'
    ]

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
