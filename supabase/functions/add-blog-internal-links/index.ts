import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, shopId, content, topic } = await req.json();

    if (!postId || !shopId || !content) {
      return new Response(JSON.stringify({ error: 'postId, shopId et content sont requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting internal linking for post:', postId);

    // Get shop data for URL construction
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return new Response(JSON.stringify({ error: 'Boutique non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get other blog posts from the same shop (limit to 10 most recent)
    const { data: otherPosts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, focus_keyword')
      .eq('shop_id', shopId)
      .neq('id', postId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get collections from the shop
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, name, slug, description')
      .eq('shop_id', shopId)
      .limit(20);

    // Get some featured products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, slug, short_description, categories')
      .eq('shop_id', shopId)
      .eq('featured', true)
      .limit(15);

    console.log('Found resources:', {
      posts: otherPosts?.length || 0,
      collections: collections?.length || 0,
      products: products?.length || 0
    });

    // Prepare context for AI
    const baseUrl = shop.url.replace(/\/$/, '');
    const collectionsSlug = shop.collections_slug || 'collections';
    
    const postsContext = otherPosts && otherPosts.length > 0
      ? otherPosts.map(p => ({
          title: p.title,
          url: `${baseUrl}/blog/${p.slug}`,
          topic: p.focus_keyword || p.title,
          excerpt: p.excerpt
        }))
      : [];

    const collectionsContext = collections && collections.length > 0
      ? collections.map(c => ({
          title: c.name,
          url: `${baseUrl}/${collectionsSlug}/${c.slug}`,
          description: c.description
        }))
      : [];

    const productsContext = products && products.length > 0
      ? products.map(p => ({
          title: p.name,
          url: `${baseUrl}/products/${p.slug}`,
          description: p.short_description
        }))
      : [];

    if (postsContext.length === 0 && collectionsContext.length === 0 && productsContext.length === 0) {
      console.log('No linkable resources found, skipping internal linking');
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucune ressource à lier',
        content: content,
        linksAdded: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to suggest relevant internal links
    const prompt = `Tu es un expert SEO en maillage interne. Analyse ce contenu d'article de blog et suggère 3-5 liens internes pertinents et naturels.

CONTENU DE L'ARTICLE (extrait des 800 premiers caractères):
${content.replace(/<[^>]*>/g, '').substring(0, 800)}...

SUJET DE L'ARTICLE: ${topic || 'Non spécifié'}

RESSOURCES DISPONIBLES POUR LIENS:

${postsContext.length > 0 ? `ARTICLES DE BLOG (${postsContext.length}):
${postsContext.slice(0, 8).map((p, i) => `${i+1}. "${p.title}" - ${p.url}
   Sujet: ${p.topic}`).join('\n')}` : ''}

${collectionsContext.length > 0 ? `\nCOLLECTIONS (${collectionsContext.length}):
${collectionsContext.slice(0, 10).map((c, i) => `${i+1}. "${c.title}" - ${c.url}
   Description: ${c.description || 'N/A'}`).join('\n')}` : ''}

${productsContext.length > 0 ? `\nPRODUITS PHARES (${productsContext.length}):
${productsContext.slice(0, 10).map((p, i) => `${i+1}. "${p.title}" - ${p.url}`).join('\n')}` : ''}

CONSIGNES STRICTES:
1. Suggère 3-5 liens internes maximum (ne pas surcharger)
2. Chaque lien doit être VRAIMENT pertinent par rapport au contexte
3. Privilégie la variété: mélange articles, collections, produits
4. L'anchor text doit être naturel et descriptif (pas "cliquez ici")
5. Les liens doivent s'intégrer naturellement dans des phrases existantes du contenu

Format JSON STRICT à retourner:
{
  "links": [
    {
      "anchor_text": "texte exact à transformer en lien (doit exister dans le contenu)",
      "url": "URL complète du lien",
      "context": "phrase ou paragraphe où insérer le lien",
      "relevance_score": 9,
      "type": "article|collection|product"
    }
  ]
}

IMPORTANT: L'anchor_text doit correspondre à un texte qui existe déjà dans l'article ou être une variation très proche. Ne propose que des liens vraiment pertinents.`;

    console.log('Calling Lovable AI for link suggestions...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert SEO spécialisé en maillage interne. Tu analyses le contenu et suggères des liens internes pertinents de manière stratégique.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Erreur API Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content?.trim();

    if (!aiContent) {
      throw new Error('Pas de réponse de l\'IA');
    }

    console.log('AI response received, parsing suggestions...');

    let linkSuggestions;
    try {
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      linkSuggestions = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI response:', aiContent.substring(0, 500));
      throw new Error('Format de réponse invalide de l\'IA');
    }

    // Insert links into content
    let updatedContent = content;
    let linksAdded = 0;

    if (linkSuggestions.links && Array.isArray(linkSuggestions.links)) {
      // Sort by relevance score
      const sortedLinks = linkSuggestions.links
        .filter((link: any) => link.relevance_score >= 7)
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
        .slice(0, 5); // Max 5 links

      console.log(`Processing ${sortedLinks.length} high-relevance links...`);

      for (const link of sortedLinks) {
        const { anchor_text, url, type } = link;
        
        // Create the link HTML with appropriate attributes
        const linkHtml = `<a href="${url}" title="${anchor_text}" class="internal-link">${anchor_text}</a>`;
        
        // Try to find and replace the anchor text in the content
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${anchor_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        if (regex.test(updatedContent) && !updatedContent.includes(`>${anchor_text}</a>`)) {
          updatedContent = updatedContent.replace(regex, linkHtml);
          linksAdded++;
          console.log(`✓ Added ${type} link: "${anchor_text}" → ${url}`);
        }
      }
    }

    // Update the blog post with internal links
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post with links:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✓ Successfully added ${linksAdded} internal links to post`);

    return new Response(JSON.stringify({ 
      success: true,
      content: updatedContent,
      linksAdded,
      suggestions: linkSuggestions.links || [],
      message: `${linksAdded} liens internes ajoutés avec succès`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in add-blog-internal-links:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
