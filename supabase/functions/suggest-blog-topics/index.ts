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
  article_type: 'guide' | 'comparatif' | 'tutoriel' | 'listicle';
  recommended_length: number;
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    console.log('Generating intelligent topic suggestions for shop:', shop.name);

    // Analyze shop catalog (more products for better analysis)
    const { data: products } = await supabaseClient
      .from('products')
      .select('name, description')
      .eq('shop_id', shopId)
      .limit(20);

    const { data: collections } = await supabaseClient
      .from('collections')
      .select('name, description')
      .eq('shop_id', shopId)
      .limit(10);

    console.log(`Analyzing ${products?.length || 0} products and ${collections?.length || 0} collections`);

    // Build catalog description for AI
    const productList = products?.map(p => `- ${p.name}`).join('\n') || 'Aucun produit';
    const collectionList = collections?.map(c => `- ${c.name}`).join('\n') || 'Aucune collection';

    const prompt = `Analyse le catalogue e-commerce suivant et génère 12 suggestions d'articles de blog SEO optimisés et TRÈS DIVERSIFIÉES.

PRODUITS (${products?.length || 0} articles):
${productList}

COLLECTIONS (${collections?.length || 0} catégories):
${collectionList}

CONSIGNES IMPORTANTES:
1. Identifie les 3-5 thématiques principales du catalogue (marques, types de produits, usages)
2. Pour chaque suggestion, fournis:
   - Un titre SEO optimisé (6-9 mots, accrocheur)
   - Le mot-clé principal ciblé
   - 4-5 mots-clés secondaires de LONGUE TRAÎNE (3-5 mots pour réduire concurrence)
   - Le type d'article (guide/comparatif/tutoriel/listicle)
   - La difficulté SEO estimée (Easy/Medium/Hard)
   - Un score d'opportunité réaliste (0-100)
   - La longueur recommandée en mots (1200-2500)
   - Une estimation de volume de recherche mensuel

3. IMPÉRATIF - DIVERSIFIE ABSOLUMENT les suggestions:
   - 3 guides complets (ex: "Guide complet de...", "Tout savoir sur...")
   - 3 comparatifs (ex: "X vs Y : lequel choisir?", "Comparatif...")
   - 2 tutoriels pratiques (ex: "Comment...", "Tutoriel...")
   - 4 listicles (ex: "Top 5 des meilleurs...", "Les X meilleurs...")

4. Cible des mots-clés de LONGUE TRAÎNE (3-5 mots minimum) pour réduire la concurrence
5. Varie les angles : prix, qualité, usage, comparaison, tendances ${new Date().getFullYear()}
6. Estime la difficulté en fonction de la spécificité du mot-clé (plus spécifique = plus facile)

RÉPONDS UNIQUEMENT EN JSON (sans markdown, sans commentaire):
{
  "niche_detected": "Description courte de la niche détectée",
  "main_categories": ["catégorie1", "catégorie2", "catégorie3"],
  "suggestions": [
    {
      "topic": "Titre de l'article optimisé SEO",
      "primary_keyword": "mot-clé principal longue traîne",
      "secondary_keywords": ["keyword longue traîne 1", "keyword 2", "keyword 3", "keyword 4"],
      "article_type": "guide",
      "difficulty": "Medium",
      "opportunity_score": 75,
      "recommended_length": 1800,
      "search_volume_estimate": "1,500-3,000/mois"
    }
  ]
}`;

    console.log('Calling Lovable AI for intelligent suggestions...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert SEO et content strategist. Tu analyses les catalogues e-commerce pour proposer des stratégies de contenu optimisées. Tu réponds UNIQUEMENT en JSON valide, sans markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response received, parsing...');

    // Parse AI response (remove markdown if present)
    let parsedResponse;
    try {
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI suggestions');
    }

    const suggestions: TopicSuggestion[] = parsedResponse.suggestions || [];
    const nicheDetected = parsedResponse.niche_detected || 'Non détecté';
    const mainCategories = parsedResponse.main_categories || [];

    console.log(`Generated ${suggestions.length} intelligent suggestions for niche: ${nicheDetected}`);
    console.log(`Main categories: ${mainCategories.join(', ')}`);

    // Sort by opportunity score
    suggestions.sort((a, b) => b.opportunity_score - a.opportunity_score);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        niche: nicheDetected,
        main_categories: mainCategories,
        analyzed_products: products?.length || 0,
        analyzed_collections: collections?.length || 0,
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
