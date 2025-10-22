// Advanced SEO checks for e-commerce
export async function runAdvancedChecks(products: any[], supabase: any, shopId: string, SEO_WEIGHTS: any) {
  const issues: any[] = [];
  let maxScore = 0;
  let currentScore = 0;

  if (!products || products.length === 0) return { issues, maxScore, currentScore };

  // 1. Image loading speed check
  const heavyImages = products.filter(product => {
    if (!product.images || product.images.length === 0) return false;
    return product.images.length > 5;
  });

  if (heavyImages.length > 0 && heavyImages.length / products.length > 0.3) {
    const weight = SEO_WEIGHTS.ADVANCED_IMAGE_SIZE;
    const earnedRatio = 1 - (heavyImages.length / products.length);
    const earned = Math.round(weight * earnedRatio);
    
    issues.push({
      type: 'warning',
      category: 'Performance',
      title: 'Images potentiellement trop lourdes',
      description: `${heavyImages.length} produits ont beaucoup d'images, ce qui peut ralentir le chargement.`,
      recommendation: 'Optimisez vos images : compressez-les à moins de 500 KB et utilisez des formats modernes (WebP).',
      affected_items: heavyImages.map(p => ({ id: p.id, name: p.name, slug: p.slug, type: 'product' })),
      resource_type: 'product',
      action_available: false,
      maxPoints: weight,
      earnedPoints: earned,
      score_improvement: weight - earned,
    });
    maxScore += weight;
    currentScore += earned;
  } else {
    const weight = SEO_WEIGHTS.ADVANCED_IMAGE_SIZE;
    issues.push({
      type: 'success',
      category: 'Performance',
      title: 'Gestion des images optimale',
      description: 'Vos produits ont un nombre raisonnable d\'images, bon pour la performance.',
      recommendation: '',
      resource_type: 'product',
      maxPoints: weight,
      earnedPoints: weight,
      score_improvement: weight,
    });
    maxScore += weight;
    currentScore += weight;
  }

  // 2. Generic alt texts detection
  const genericAltPatterns = [
    /^image\d*\.?(jpe?g|png|gif|webp)?$/i,
    /^photo\d*\.?(jpe?g|png|gif|webp)?$/i,
    /^img[-_]?\d+$/i,
    /^picture\d*$/i,
    /^untitled/i,
    /^dsc\d+/i,
  ];

  const productsWithGenericAlt = products.filter(product => {
    if (!product.images || product.images.length === 0) return false;
    return product.images.some((img: any) => {
      const alt = img.alt || '';
      return genericAltPatterns.some(pattern => pattern.test(alt)) || alt.length < 3;
    });
  });

  if (productsWithGenericAlt.length > 0 && productsWithGenericAlt.length / products.length > 0.2) {
    const weight = SEO_WEIGHTS.ADVANCED_ALT_GENERIC;
    const earnedRatio = 1 - (productsWithGenericAlt.length / products.length);
    const earned = Math.round(weight * earnedRatio);
    
    issues.push({
      type: 'error',
      category: 'SEO Images',
      title: 'Textes alternatifs génériques',
      description: `${productsWithGenericAlt.length} produits ont des textes alt génériques (ex: "image1.jpg"), ce qui nuit au référencement.`,
      recommendation: 'Remplacez les textes alt génériques par des descriptions précises incluant vos mots-clés.',
      affected_items: productsWithGenericAlt.map(p => ({ id: p.id, name: p.name, slug: p.slug, type: 'product' })),
      resource_type: 'product',
      action_available: false,
      maxPoints: weight,
      earnedPoints: earned,
      score_improvement: weight - earned,
    });
    maxScore += weight;
    currentScore += earned;
  } else {
    const weight = SEO_WEIGHTS.ADVANCED_ALT_GENERIC;
    issues.push({
      type: 'success',
      category: 'SEO Images',
      title: 'Textes alternatifs descriptifs',
      description: 'Vos images ont des textes alternatifs descriptifs et pertinents.',
      recommendation: '',
      resource_type: 'product',
      maxPoints: weight,
      earnedPoints: weight,
      score_improvement: weight,
    });
    maxScore += weight;
    currentScore += weight;
  }

  // 3. Duplicate meta-descriptions
  const metaDescMap = new Map<string, any[]>();
  products.forEach(product => {
    if (product.meta_description) {
      const desc = product.meta_description.trim().toLowerCase();
      if (!metaDescMap.has(desc)) {
        metaDescMap.set(desc, []);
      }
      metaDescMap.get(desc)!.push(product);
    }
  });

  const duplicateGroups = Array.from(metaDescMap.values()).filter(group => group.length > 1);
  const productsWithDuplicates = duplicateGroups.flat();

  if (duplicateGroups.length > 0 && productsWithDuplicates.length / products.length > 0.1) {
    const weight = SEO_WEIGHTS.ADVANCED_DUPLICATE_META;
    const earnedRatio = 1 - (productsWithDuplicates.length / products.length);
    const earned = Math.round(weight * earnedRatio);
    
    issues.push({
      type: 'error',
      category: 'Contenu dupliqué',
      title: 'Méta-descriptions dupliquées',
      description: `${productsWithDuplicates.length} produits partagent des méta-descriptions identiques, ce qui peut nuire au classement.`,
      recommendation: 'Créez des méta-descriptions uniques pour chaque produit, en mettant en avant leurs caractéristiques spécifiques.',
      affected_items: productsWithDuplicates.map(p => ({ id: p.id, name: p.name, slug: p.slug, type: 'product' })),
      resource_type: 'product',
      action_available: false,
      maxPoints: weight,
      earnedPoints: earned,
      score_improvement: weight - earned,
    });
    maxScore += weight;
    currentScore += earned;
  } else {
    const weight = SEO_WEIGHTS.ADVANCED_DUPLICATE_META;
    issues.push({
      type: 'success',
      category: 'Contenu dupliqué',
      title: 'Méta-descriptions uniques',
      description: 'Chaque produit a une méta-description unique, excellent pour le SEO.',
      recommendation: '',
      resource_type: 'product',
      maxPoints: weight,
      earnedPoints: weight,
      score_improvement: weight,
    });
    maxScore += weight;
    currentScore += weight;
  }

  // 4. Broken internal links detection
  const productSlugs = new Set(products.map(p => p.slug));
  const productsWithBrokenLinks = products.filter(product => {
    if (!product.description) return false;
    const linkMatches = product.description.match(/href=["']([^"']+)["']/gi) || [];
    return linkMatches.some((match: string) => {
      const url = match.match(/href=["']([^"']+)["']/i)?.[1] || '';
      if (url.includes('/product/') || url.includes('/produit/')) {
        const slug = url.split('/').pop();
        return slug && !productSlugs.has(slug);
      }
      return false;
    });
  });

  if (productsWithBrokenLinks.length > 0) {
    const weight = SEO_WEIGHTS.ADVANCED_BROKEN_LINKS;
    const earnedRatio = 1 - (productsWithBrokenLinks.length / products.length);
    const earned = Math.round(weight * earnedRatio);
    
    issues.push({
      type: 'error',
      category: 'Maillage interne',
      title: 'Liens internes cassés détectés',
      description: `${productsWithBrokenLinks.length} produits contiennent des liens vers des produits supprimés ou inexistants.`,
      recommendation: 'Vérifiez et corrigez les liens internes dans vos descriptions de produits.',
      affected_items: productsWithBrokenLinks.map(p => ({ id: p.id, name: p.name, slug: p.slug, type: 'product' })),
      resource_type: 'product',
      action_available: false,
      maxPoints: weight,
      earnedPoints: earned,
      score_improvement: weight - earned,
    });
    maxScore += weight;
    currentScore += earned;
  } else {
    const weight = SEO_WEIGHTS.ADVANCED_BROKEN_LINKS;
    issues.push({
      type: 'success',
      category: 'Maillage interne',
      title: 'Aucun lien cassé détecté',
      description: 'Tous vos liens internes pointent vers des pages valides.',
      recommendation: '',
      resource_type: 'product',
      maxPoints: weight,
      earnedPoints: weight,
      score_improvement: weight,
    });
    maxScore += weight;
    currentScore += weight;
  }

  // 5. Link hierarchy structure
  const productsWithPoorLinking = products.filter(product => {
    if (!product.description) return true;
    const linkCount = (product.description.match(/<a\s+[^>]*href=/gi) || []).length;
    const hasCategoryLink = product.categories && product.categories.length > 0;
    return linkCount < 2 || !hasCategoryLink;
  });

  if (productsWithPoorLinking.length > 0 && productsWithPoorLinking.length / products.length > 0.3) {
    const weight = SEO_WEIGHTS.ADVANCED_LINK_HIERARCHY;
    const earnedRatio = 1 - (productsWithPoorLinking.length / products.length);
    const earned = Math.round(weight * earnedRatio);
    
    issues.push({
      type: 'warning',
      category: 'Maillage interne',
      title: 'Structure de liens hiérarchique faible',
      description: `${productsWithPoorLinking.length} produits ont une structure de liens insuffisante (catégorie + produits complémentaires).`,
      recommendation: 'Ajoutez au moins 2 liens par produit : un vers la catégorie et un vers un produit complémentaire.',
      affected_items: productsWithPoorLinking.map(p => ({ id: p.id, name: p.name, slug: p.slug, type: 'product' })),
      resource_type: 'product',
      action_available: false,
      maxPoints: weight,
      earnedPoints: earned,
      score_improvement: weight - earned,
    });
    maxScore += weight;
    currentScore += earned;
  } else {
    const weight = SEO_WEIGHTS.ADVANCED_LINK_HIERARCHY;
    issues.push({
      type: 'success',
      category: 'Maillage interne',
      title: 'Bonne structure de liens hiérarchique',
      description: 'Vos produits ont une bonne structure de liens internes.',
      recommendation: '',
      resource_type: 'product',
      maxPoints: weight,
      earnedPoints: weight,
      score_improvement: weight,
    });
    maxScore += weight;
    currentScore += weight;
  }

  // 6. Schema.org Product markup (recommendation only)
  const weight = SEO_WEIGHTS.ADVANCED_SCHEMA_MARKUP;
  issues.push({
    type: 'info',
    category: 'Données structurées',
    title: 'Schema.org Product markup',
    description: 'Les données structurées JSON-LD augmentent considérablement la visibilité dans Google Shopping et les rich snippets.',
    recommendation: 'Implémentez le balisage Schema.org Product sur votre site. Cela nécessite des modifications du template WooCommerce/Shopify et améliorerait votre score de +10 points.',
    resource_type: 'product',
    action_available: false,
    maxPoints: weight,
    earnedPoints: 0,
    score_improvement: weight,
  });
  maxScore += weight;

  return { issues, maxScore, currentScore };
}