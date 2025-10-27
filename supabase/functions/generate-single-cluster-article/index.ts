import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateSingleArticleRequest {
  clusterId: string;
  shopId: string;
  articleIndex: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { clusterId, shopId, articleIndex } = await req.json() as GenerateSingleArticleRequest;

    console.log(`Generating article ${articleIndex} for cluster ${clusterId}`);

    // Get cluster information
    const { data: cluster, error: clusterError } = await supabaseClient
      .from('topic_clusters')
      .select('*')
      .eq('id', clusterId)
      .single();

    if (clusterError) {
      console.error('Error fetching cluster:', clusterError);
      throw new Error(`Failed to fetch cluster: ${clusterError.message}`);
    }

    // Get shop information
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('name, url, description')
      .eq('id', shopId)
      .single();

    if (shopError) {
      console.error('Error fetching shop:', shopError);
      throw new Error(`Failed to fetch shop: ${shopError.message}`);
    }

    // Generate article with AI
    const aiApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!aiApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const targetKeywords = Array.isArray(cluster.target_keywords) ? cluster.target_keywords : [];
    const randomKeyword = targetKeywords.length > 0 
      ? targetKeywords[Math.floor(Math.random() * targetKeywords.length)]
      : cluster.pillar_keyword;

    const prompt = `Tu es un expert en rédaction SEO pour e-commerce. Génère UN SEUL article de blog complet et optimisé SEO.

INFORMATIONS DU CLUSTER:
- Nom du cluster: ${cluster.name}
- Mot-clé pilier: ${cluster.pillar_keyword}
- Description: ${cluster.description || 'N/A'}
- Mots-clés cibles: ${targetKeywords.join(', ') || 'N/A'}

INFORMATIONS DE LA BOUTIQUE:
- Nom: ${shop.name}
- URL: ${shop.url}
- Description: ${shop.description || 'N/A'}

CONSIGNES:
1. Crée un article unique autour du mot-clé: "${randomKeyword}"
2. L'article doit être lié au thème "${cluster.name}"
3. Optimise pour le SEO avec des sous-titres H2/H3
4. Inclus des exemples concrets et pratiques
5. Longueur: 1200-1800 mots minimum
6. Ton: Professionnel et accessible

RÉPONDS UNIQUEMENT EN JSON (sans markdown, sans balises):
{
  "title": "Titre accrocheur avec mot-clé",
  "slug": "url-slug-optimise",
  "meta_description": "Description SEO 150-160 caractères",
  "content": "Contenu HTML complet avec <h2>, <h3>, <p>, <ul>, <li>",
  "excerpt": "Résumé court 100-150 mots",
  "focus_keyword": "${randomKeyword}",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    console.log('Calling AI API...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en rédaction SEO. Réponds UNIQUEMENT en JSON valide, sans markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit atteint. Attendez 60 secondes avant de réessayer.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Crédits Lovable AI épuisés. Rechargez votre compte.');
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No content returned from AI');
    }

    // Parse AI response (remove markdown if present)
    let articleData;
    try {
      const cleanContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      articleData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid JSON response from AI');
    }

    // Insert article into database
    const { data: insertedArticle, error: insertError } = await supabaseClient
      .from('blog_posts')
      .insert({
        shop_id: shopId,
        cluster_id: clusterId,
        title: articleData.title,
        slug: articleData.slug,
        content: articleData.content,
        excerpt: articleData.excerpt,
        meta_description: articleData.meta_description,
        focus_keyword: articleData.focus_keyword,
        tags: articleData.tags || [],
        status: 'draft',
        author_id: cluster.created_by || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting article:', insertError);
      throw new Error(`Failed to insert article: ${insertError.message}`);
    }

    console.log(`Article ${articleIndex} created successfully:`, insertedArticle.id);

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: insertedArticle.id,
          title: insertedArticle.title,
          slug: insertedArticle.slug,
          articleIndex
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error generating article:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});