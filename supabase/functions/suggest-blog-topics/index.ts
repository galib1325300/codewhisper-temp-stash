import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopicSuggestion {
  topic: string;
  primary_keyword: string;
  secondary_keywords: string[];
  search_volume_estimate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  opportunity_score: number;
  top_competitors: string[];
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

    // Get shop data
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    console.log('Generating topic suggestions for shop:', shop.name);

    // Analyze shop niche based on products/collections
    const { data: products } = await supabaseClient
      .from('products')
      .select('name, description')
      .eq('shop_id', shopId)
      .limit(10);

    const { data: collections } = await supabaseClient
      .from('collections')
      .select('name, description')
      .eq('shop_id', shopId)
      .limit(5);

    // Identify niche keywords
    const nicheKeywords: string[] = [];
    
    if (products && products.length > 0) {
      // Extract main product categories
      products.forEach(p => {
        const words = p.name.toLowerCase().split(/\s+/);
        words.forEach(w => {
          if (w.length > 4 && !nicheKeywords.includes(w)) {
            nicheKeywords.push(w);
          }
        });
      });
    }

    if (collections && collections.length > 0) {
      collections.forEach(c => {
        const words = c.name.toLowerCase().split(/\s+/);
        words.forEach(w => {
          if (w.length > 4 && !nicheKeywords.includes(w)) {
            nicheKeywords.push(w);
          }
        });
      });
    }

    // Fallback to shop URL analysis if no products
    if (nicheKeywords.length === 0) {
      const urlParts = shop.url.replace(/https?:\/\//, '').replace(/www\./, '').split('.')[0];
      nicheKeywords.push(urlParts);
    }

    console.log('Niche keywords identified:', nicheKeywords.slice(0, 5));

    // Generate topic ideas based on niche
    const topicTemplates = [
      `Comment choisir {keyword} en {year}`,
      `Top 10 des meilleurs {keyword}`,
      `{keyword} : guide complet pour débutants`,
      `Comparatif {keyword} : quel modèle choisir`,
      `Comment entretenir votre {keyword}`,
      `{keyword} professionnel vs domestique`,
      `Les erreurs à éviter avec votre {keyword}`,
      `{keyword} écologique : alternatives durables`,
      `Astuces pour optimiser votre {keyword}`,
      `{keyword} : tendances {year}`,
    ];

    const year = new Date().getFullYear();
    const suggestions: TopicSuggestion[] = [];

    // Generate 5-7 diverse suggestions
    const mainKeyword = nicheKeywords[0] || 'produit';
    const selectedTemplates = topicTemplates.slice(0, 7);

    for (const template of selectedTemplates) {
      const topic = template
        .replace(/{keyword}/g, mainKeyword)
        .replace(/{year}/g, year.toString());
      
      const primaryKeyword = template.includes('comment') 
        ? `comment ${mainKeyword}`
        : template.includes('top') || template.includes('meilleur')
        ? `meilleur ${mainKeyword}`
        : mainKeyword;

      const secondaryKeywords = [
        `${mainKeyword} ${year}`,
        `choisir ${mainKeyword}`,
        `guide ${mainKeyword}`,
        `${mainKeyword} qualité`,
      ].slice(0, 3);

      // Estimate difficulty based on keyword complexity
      let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (template.includes('guide complet') || template.includes('top 10')) {
        difficulty = 'Hard';
      } else if (template.includes('astuces') || template.includes('erreurs')) {
        difficulty = 'Easy';
      }

      // Calculate opportunity score (inverse of difficulty + relevance)
      const opportunityScore = difficulty === 'Easy' ? 85 : difficulty === 'Medium' ? 70 : 55;

      // Mock search volume (would use real API in production)
      const volumeEstimates = ['1,200-2,400/mois', '2,500-5,000/mois', '5,000-10,000/mois', '800-1,500/mois'];
      const searchVolume = volumeEstimates[Math.floor(Math.random() * volumeEstimates.length)];

      suggestions.push({
        topic,
        primary_keyword: primaryKeyword,
        secondary_keywords: secondaryKeywords,
        search_volume_estimate: searchVolume,
        difficulty,
        opportunity_score: opportunityScore,
        top_competitors: [
          'amazon.fr',
          'leroymerlin.fr',
          'castorama.fr',
        ],
      });
    }

    // Sort by opportunity score (highest first)
    suggestions.sort((a, b) => b.opportunity_score - a.opportunity_score);

    console.log(`Generated ${suggestions.length} topic suggestions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        niche: mainKeyword,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Erreur lors de la génération des suggestions' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
