import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GenerateClusterArticlesRequest {
  clusterId: string;
  shopId: string;
  articleCount?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { clusterId, shopId, articleCount = 6 }: GenerateClusterArticlesRequest = await req.json();

    console.log(`Generating articles for cluster ${clusterId}, Shop: ${shopId}`);

    // Fetch cluster data
    const { data: cluster, error: clusterError } = await supabase
      .from('topic_clusters')
      .select('*')
      .eq('id', clusterId)
      .single();

    if (clusterError || !cluster) {
      throw new Error('Cluster not found');
    }

    // Fetch shop data
    const { data: shop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (!shop) {
      throw new Error('Shop not found');
    }

    // Fetch existing articles in this cluster
    const { data: existingArticles } = await supabase
      .from('blog_posts')
      .select('title, focus_keyword')
      .eq('cluster_id', clusterId);

    const existingTitles = existingArticles?.map(a => a.title).join(', ') || 'Aucun';

    const targetKeywords = Array.isArray(cluster.target_keywords) 
      ? cluster.target_keywords 
      : [];

    const results = {
      success: [] as any[],
      failed: [] as any[],
      total: articleCount
    };

    // Generate articles one by one
    for (let i = 0; i < articleCount; i++) {
      try {
        console.log(`Generating article ${i + 1}/${articleCount}...`);

        // Generate article topic and content
        const topicPrompt = `Tu es un expert en rédaction SEO pour e-commerce.

**Contexte:**
- Cluster: ${cluster.name}
- Mot-clé pilier: ${cluster.pillar_keyword}
- Description: ${cluster.description}
- Mots-clés secondaires: ${targetKeywords.join(', ')}
- Articles déjà créés: ${existingTitles}
- Langue: ${shop.language}

**Ta mission:**
Créer un article SEO complet et unique pour ce cluster.

**Format de réponse (JSON uniquement):**
{
  "title": "Titre accrocheur et optimisé SEO",
  "slug": "url-slug-optimise",
  "focus_keyword": "mot-clé principal ciblé",
  "meta_title": "Meta title (max 60 caractères)",
  "meta_description": "Meta description engageante (max 160 caractères)",
  "excerpt": "Résumé de 2-3 phrases",
  "content": "Contenu HTML complet de l'article (minimum 1500 mots, bien structuré avec H2, H3, listes, paragraphes)"
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: topicPrompt }
            ],
            temperature: 0.9,
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            throw new Error('Rate limit exceeded');
          }
          if (aiResponse.status === 402) {
            throw new Error('Crédits épuisés');
          }
          throw new Error(`AI API Error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;

        // Parse JSON response
        let articleData;
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : content;
          articleData = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('JSON Parse Error:', parseError);
          throw new Error('Erreur parsing JSON');
        }

        // Insert article into database
        const { data: newArticle, error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            shop_id: shopId,
            cluster_id: clusterId,
            title: articleData.title,
            slug: articleData.slug,
            focus_keyword: articleData.focus_keyword,
            meta_title: articleData.meta_title,
            meta_description: articleData.meta_description,
            excerpt: articleData.excerpt,
            content: articleData.content,
            status: 'draft',
            is_pillar: false
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          results.failed.push({ index: i + 1, error: insertError.message });
        } else {
          results.success.push(newArticle);
          console.log(`Article ${i + 1} created successfully: ${articleData.title}`);
        }

        // Wait 2 seconds between requests to avoid rate limiting
        if (i < articleCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (articleError) {
        console.error(`Error generating article ${i + 1}:`, articleError);
        results.failed.push({ 
          index: i + 1, 
          error: articleError instanceof Error ? articleError.message : 'Unknown error' 
        });
      }
    }

    console.log(`Generation complete: ${results.success.length} success, ${results.failed.length} failed`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-cluster-articles:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
