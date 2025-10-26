import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  userId: string;
  siteId: string;
  nicheName: string;
  targetProductCount: number;
  language: string;
  competitors: string[];
  recommendedStructure: any;
}

interface GeneratedProduct {
  name: string;
  slug: string;
  short_description: string;
  description_html: string;
  categories: string[];
  tags: string[];
  seo_title: string;
  focus_keyword: string;
  price: number;
  images: Array<{ url: string; alt: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const request: GenerateRequest = await req.json();

    console.log('Starting catalog generation:', request.siteId);

    // Check subscription
    const { data: subscription } = await supabase
      .from('ai_generator_subscriptions')
      .select('*')
      .eq('user_id', request.userId)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement trouvé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subscription.plan_type === 'one_time' && subscription.sites_remaining <= 0) {
      return new Response(
        JSON.stringify({ error: 'Crédits épuisés' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update site status
    await supabase
      .from('ai_generated_sites')
      .update({
        status: 'generating',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', request.siteId);

    // Generate products in batches
    const batchSize = 10;
    const batches = Math.ceil(request.targetProductCount / batchSize);
    const allProducts: GeneratedProduct[] = [];

    for (let i = 0; i < batches; i++) {
      const productsInBatch = Math.min(batchSize, request.targetProductCount - (i * batchSize));
      
      console.log(`Generating batch ${i + 1}/${batches} (${productsInBatch} products)`);

      const prompt = `Tu es rédacteur e-commerce SEO expert.

Génère ${productsInBatch} fiches produits optimisées SEO pour un shop ${request.language} dans la niche "${request.nicheName}".

Catégories recommandées : ${request.recommendedStructure.categories.slice(0, 5).join(', ')}
Mots-clés prioritaires : ${request.recommendedStructure.top_keywords.slice(0, 10).join(', ')}

Fournis au format JSON strict :
{
  "products": [
    {
      "name": "Nom optimisé SEO (50-60 chars)",
      "slug": "url-friendly-slug",
      "short_description": "Meta description SEO (140-160 chars)",
      "description_html": "<h2>Titre accrocheur</h2><p>Description longue HTML...</p><ul><li>Avantage 1</li><li>Avantage 2</li></ul>",
      "categories": ["cat1", "cat2"],
      "tags": ["tag1", "tag2", "tag3"],
      "seo_title": "Title SEO (50-60 chars)",
      "focus_keyword": "mot-clé principal",
      "price": 49.99
    }
  ]
}

Règles strictes :
- Chaque produit unique et cohérent avec la niche
- Description 500-800 mots, HTML structuré (H2, H3, listes, gras)
- Mots-clés naturellement intégrés (pas de keyword stuffing)
- Prix réalistes pour ${request.nicheName}
- Ton professionnel et engageant en ${request.language}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const batchResult = JSON.parse(data.choices[0].message.content);
      
      // Add placeholder images
      const productsWithImages = batchResult.products.map((p: any) => ({
        ...p,
        images: [
          { url: 'https://placehold.co/600x600/png', alt: `${p.name} - Vue principale` },
          { url: 'https://placehold.co/600x600/png', alt: `${p.name} - Vue détail` },
        ],
      }));

      allProducts.push(...productsWithImages);

      // Update progress
      await supabase
        .from('ai_generated_sites')
        .update({
          products_count: allProducts.length,
        })
        .eq('id', request.siteId);

      console.log(`Progress: ${allProducts.length}/${request.targetProductCount}`);
    }

    // Generate collections
    console.log('Generating collections...');
    
    const collectionsPrompt = `Organise ces ${allProducts.length} produits en 5-8 collections logiques pour la niche "${request.nicheName}".

Produits disponibles : ${allProducts.slice(0, 10).map(p => p.name).join(', ')}... (${allProducts.length} total)

Fournis au format JSON :
{
  "collections": [
    {
      "name": "Nom collection",
      "slug": "url-slug",
      "description": "Description SEO 140-160 chars",
      "long_description_html": "<p>Description longue 300-500 mots...</p>",
      "product_indices": [0, 5, 12, 18]
    }
  ]
}`;

    const collectionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: collectionsPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    const collectionsData = await collectionsResponse.json();
    const collections = JSON.parse(collectionsData.choices[0].message.content).collections;

    // Update final status
    await supabase
      .from('ai_generated_sites')
      .update({
        collections_count: collections.length,
        config: {
          products: allProducts,
          collections,
        },
      })
      .eq('id', request.siteId);

    // Decrement credits for one-time plans
    if (subscription.plan_type === 'one_time') {
      await supabase
        .from('ai_generator_subscriptions')
        .update({ sites_remaining: subscription.sites_remaining - 1 })
        .eq('user_id', request.userId);
    }

    console.log('Catalog generation completed');

    return new Response(
      JSON.stringify({ 
        success: true,
        products_count: allProducts.length,
        collections_count: collections.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating catalog:', error);
    
    // Update error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { siteId } = await req.json();
      await supabase
        .from('ai_generated_sites')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', siteId);
    } catch (e) {
      console.error('Failed to update error status:', e);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
