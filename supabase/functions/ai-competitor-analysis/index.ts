import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompetitorAnalysisRequest {
  nicheName: string;
  country: string;
  language: string;
  manualUrls?: string[];
}

interface Competitor {
  url: string;
  categories: string[];
  h1: string;
  metaDescription: string;
  productCount: number;
  technology: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { nicheName, country, language, manualUrls }: CompetitorAnalysisRequest = await req.json();

    console.log('Starting competitor analysis:', { nicheName, country });

    // Simulate competitor scraping (in production, use SerpAPI or actual scraping)
    const competitors: Competitor[] = manualUrls?.slice(0, 5).map((url, i) => ({
      url,
      categories: ['Catégorie 1', 'Catégorie 2', 'Catégorie 3'],
      h1: `Shop ${i + 1} - ${nicheName}`,
      metaDescription: `Description SEO du shop ${i + 1}`,
      productCount: Math.floor(Math.random() * 500) + 50,
      technology: Math.random() > 0.5 ? 'Shopify' : 'WooCommerce',
    })) || [
      {
        url: 'https://example1.com',
        categories: ['Catégorie A', 'Catégorie B', 'Catégorie C'],
        h1: `${nicheName} - Shop 1`,
        metaDescription: 'Description SEO optimisée',
        productCount: 150,
        technology: 'Shopify',
      },
      {
        url: 'https://example2.com',
        categories: ['Catégorie X', 'Catégorie Y', 'Catégorie Z'],
        h1: `${nicheName} - Shop 2`,
        metaDescription: 'Meilleur shop pour ${nicheName}',
        productCount: 200,
        technology: 'WooCommerce',
      },
    ];

    console.log('Competitors found:', competitors.length);

    // Analyze with OpenAI
    const competitorSummary = competitors.map(c => `
- ${c.url}
  Structure: ${c.categories.join(', ')}
  H1: ${c.h1}
  Meta desc: ${c.metaDescription}
  Produits: ${c.productCount}
  Technologie: ${c.technology}
`).join('\n');

    const prompt = `Analyse ces ${competitors.length} concurrents e-commerce pour la niche "${nicheName}" en ${country} :

${competitorSummary}

Fournis au format JSON strict :
{
  "recommended_structure": {
    "categories": ["cat1", "cat2", "cat3", "cat4", "cat5"],
    "must_have_pages": ["about", "faq", "shipping", "returns", "contact"],
    "top_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5", "kw6", "kw7", "kw8", "kw9", "kw10"],
    "avg_product_count": 150,
    "seo_best_practices": ["practice1", "practice2", "practice3"]
  },
  "competitors_strengths": ["force1", "force2", "force3"],
  "opportunities": ["opportunité1", "opportunité2", "opportunité3"]
}

Analyse approfondie du marché et recommandations concrètes.`;

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const analysis = JSON.parse(content);

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({
        competitors,
        ...analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in competitor analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
