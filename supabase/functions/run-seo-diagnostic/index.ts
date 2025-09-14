import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  affected_items?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { shopId } = await req.json();

    // Get shop and related data
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    // Get products
    const { data: products } = await supabaseClient
      .from('products')
      .select('*')
      .eq('shop_id', shopId);

    // Get collections
    const { data: collections } = await supabaseClient
      .from('collections')
      .select('*')
      .eq('shop_id', shopId);

    // Get blog posts
    const { data: blogPosts } = await supabaseClient
      .from('blog_posts')
      .select('*')
      .eq('shop_id', shopId);

    const issues: SEOIssue[] = [];

    // Check products SEO issues
    if (products) {
      const productsWithoutDescription = products.filter(p => !p.description || p.description.length < 50);
      if (productsWithoutDescription.length > 0) {
        issues.push({
          type: 'error',
          category: 'Produits',
          title: 'Descriptions produits manquantes ou trop courtes',
          description: `${productsWithoutDescription.length} produits n'ont pas de description ou ont une description de moins de 50 caractères.`,
          recommendation: 'Ajoutez des descriptions détaillées d\'au moins 150 caractères pour améliorer le SEO.',
          affected_items: productsWithoutDescription.map(p => p.name)
        });
      }

      const productsWithoutShortDescription = products.filter(p => !p.short_description);
      if (productsWithoutShortDescription.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Produits',
          title: 'Meta descriptions manquantes',
          description: `${productsWithoutShortDescription.length} produits n'ont pas de description courte (meta description).`,
          recommendation: 'Ajoutez des descriptions courtes optimisées pour les résultats de recherche.',
          affected_items: productsWithoutShortDescription.map(p => p.name)
        });
      }

      const productsWithoutImages = products.filter(p => !p.images || (Array.isArray(p.images) && p.images.length === 0));
      if (productsWithoutImages.length > 0) {
        issues.push({
          type: 'error',
          category: 'Produits',
          title: 'Images produits manquantes',
          description: `${productsWithoutImages.length} produits n'ont pas d'images.`,
          recommendation: 'Ajoutez au moins une image de qualité pour chaque produit avec des attributs alt descriptifs.',
          affected_items: productsWithoutImages.map(p => p.name)
        });
      }

      const productsOutOfStock = products.filter(p => p.stock_status === 'outofstock' && p.status === 'publish');
      if (productsOutOfStock.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Inventaire',
          title: 'Produits en rupture de stock',
          description: `${productsOutOfStock.length} produits publiés sont en rupture de stock.`,
          recommendation: 'Considérez mettre ces produits en brouillon ou ajoutez une date de réapprovisionnement.',
          affected_items: productsOutOfStock.map(p => p.name)
        });
      }
    }

    // Check collections SEO issues
    if (collections) {
      const collectionsWithoutDescription = collections.filter(c => !c.description);
      if (collectionsWithoutDescription.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Collections',
          title: 'Descriptions collections manquantes',
          description: `${collectionsWithoutDescription.length} collections n'ont pas de description.`,
          recommendation: 'Ajoutez des descriptions SEO optimisées pour vos collections.',
          affected_items: collectionsWithoutDescription.map(c => c.name)
        });
      }
    }

    // Check blog posts SEO issues
    if (blogPosts) {
      const postsWithoutSeoTitle = blogPosts.filter(p => !p.seo_title);
      if (postsWithoutSeoTitle.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Blog',
          title: 'Titres SEO manquants',
          description: `${postsWithoutSeoTitle.length} articles n'ont pas de titre SEO optimisé.`,
          recommendation: 'Ajoutez des titres SEO spécifiques, différents du titre principal.',
          affected_items: postsWithoutSeoTitle.map(p => p.title)
        });
      }

      const postsWithoutMetaDescription = blogPosts.filter(p => !p.seo_description);
      if (postsWithoutMetaDescription.length > 0) {
        issues.push({
          type: 'warning',
          category: 'Blog',
          title: 'Meta descriptions manquantes',
          description: `${postsWithoutMetaDescription.length} articles n'ont pas de meta description.`,
          recommendation: 'Rédigez des meta descriptions de 150-160 caractères pour chaque article.',
          affected_items: postsWithoutMetaDescription.map(p => p.title)
        });
      }
    }

    // Check general configuration
    if (!shop.consumer_key || !shop.consumer_secret) {
      issues.push({
        type: 'error',
        category: 'Configuration',
        title: 'Clés API WooCommerce manquantes',
        description: 'Les identifiants WooCommerce ne sont pas configurés.',
        recommendation: 'Configurez les clés API WooCommerce pour synchroniser vos données automatiquement.'
      });
    }

    if (!shop.openai_api_key) {
      issues.push({
        type: 'info',
        category: 'Configuration',
        title: 'Clé API OpenAI manquante',
        description: 'La clé API OpenAI n\'est pas configurée pour cette boutique.',
        recommendation: 'Ajoutez votre clé API OpenAI pour utiliser la génération automatique de contenu.'
      });
    }

    // Generate report summary
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const infoCount = issues.filter(i => i.type === 'info').length;

    let score = 100;
    score -= errorCount * 20;
    score -= warningCount * 10;
    score -= infoCount * 5;
    score = Math.max(0, score);

    const report = {
      score,
      summary: {
        total_issues: issues.length,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount
      },
      issues,
      recommendations: [
        'Optimisez vos descriptions produits avec des mots-clés pertinents',
        'Ajoutez des images de qualité avec des attributs alt descriptifs',
        'Créez du contenu blog régulièrement pour améliorer votre SEO',
        'Configurez toutes vos intégrations API pour une synchronisation automatique'
      ],
      generated_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        report 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error running SEO diagnostic:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors du diagnostic' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});