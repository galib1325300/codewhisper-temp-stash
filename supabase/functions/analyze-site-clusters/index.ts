import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AnalyzeClustersRequest {
  shopId: string;
}

interface SuggestedArticle {
  topic: string;
  primary_keyword: string;
  secondary_keywords: string[];
  article_type: string;
  difficulty: string;
  opportunity_score: number;
  recommended_length: number;
}

interface ClusterSuggestion {
  name: string;
  pillar_keyword: string;
  description: string;
  target_keywords: string[];
  suggested_articles: SuggestedArticle[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { shopId }: AnalyzeClustersRequest = await req.json();

    console.log(`Analyzing site for clusters - Shop: ${shopId}`);

    // Fetch shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found');
    }

    // Fetch products
    const { data: products } = await supabase
      .from('products')
      .select('name, description, short_description, categories')
      .eq('shop_id', shopId)
      .limit(100);

    // Fetch collections
    const { data: collections } = await supabase
      .from('collections')
      .select('name, description')
      .eq('shop_id', shopId);

    // Fetch existing blog posts
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('title, focus_keyword')
      .eq('shop_id', shopId);

    // Prepare context for AI
    const productsContext = products?.slice(0, 20).map(p => 
      `- ${p.name}: ${p.short_description || p.description?.substring(0, 100) || ''}`
    ).join('\n') || 'Aucun produit';

    const collectionsContext = collections?.map(c => 
      `- ${c.name}: ${c.description?.substring(0, 100) || ''}`
    ).join('\n') || 'Aucune collection';

    const existingPostsContext = existingPosts?.map(p => 
      `- ${p.title} (${p.focus_keyword || 'pas de mot-clé'})`
    ).join('\n') || 'Aucun article existant';

    const prompt = `Tu es un expert SEO spécialisé dans la stratégie de contenu e-commerce.

Analyse ce site e-commerce et crée une stratégie de Topic Clusters professionnelle.

**Contexte du site:**
Nom: ${shop.name}
URL: ${shop.url}
Langue: ${shop.language}

**Produits (échantillon):**
${productsContext}

**Collections:**
${collectionsContext}

**Articles existants:**
${existingPostsContext}

**Ta mission:**
1. Identifier 3-5 thématiques principales (clusters) pertinentes pour ce site
2. Pour CHAQUE cluster, créer 6-10 sujets d'articles SEO-optimisés et complémentaires
3. Varier les formats: guides, comparatifs, tutoriels, listicles, FAQ
4. Optimiser pour des mots-clés longue traîne en ${shop.language}
5. Éviter les doublons avec les articles existants
6. Assurer une cohérence thématique forte dans chaque cluster

**Format de réponse STRICT (JSON uniquement):**
{
  "clusters": [
    {
      "name": "Nom du cluster",
      "pillar_keyword": "mot-clé pilier principal",
      "description": "Description du cluster (2-3 phrases)",
      "target_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "suggested_articles": [
        {
          "topic": "Titre complet de l'article",
          "primary_keyword": "mot-clé principal",
          "secondary_keywords": ["keyword1", "keyword2", "keyword3"],
          "article_type": "guide|listicle|tutorial|comparison|faq",
          "difficulty": "Easy|Medium|Hard",
          "opportunity_score": 75,
          "recommended_length": 2000
        }
      ]
    }
  ],
  "niche_summary": "Résumé de la niche du site",
  "total_articles_suggested": 32
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    console.log('Calling Lovable AI for cluster analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Trop de requêtes, veuillez réessayer dans quelques instants.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Crédits Lovable AI épuisés. Veuillez recharger vos crédits.');
      }
      throw new Error(`Erreur API IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    console.log('AI Response received, parsing...');

    // Parse JSON response
    let result;
    try {
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Content:', content);
      throw new Error('Erreur lors du parsing de la réponse IA');
    }

    console.log(`Analysis complete: ${result.clusters?.length || 0} clusters, ${result.total_articles_suggested || 0} articles suggested`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-site-clusters:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
