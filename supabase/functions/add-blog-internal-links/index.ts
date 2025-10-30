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

    // Get featured products, fallback to recent products if none featured
    let { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, slug, short_description, categories')
      .eq('shop_id', shopId)
      .eq('featured', true)
      .limit(15);

    // Fallback: if no featured products, get 10 most recent
    if (!products || products.length === 0) {
      const { data: recentProducts } = await supabase
        .from('products')
        .select('id, name, slug, short_description, categories')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      products = recentProducts || [];
      if (products.length > 0) {
        console.log(`Using ${products.length} recent products (no featured products found)`);
      }
    }

    console.log('Found resources:', {
      posts: otherPosts?.length || 0,
      collections: collections?.length || 0,
      products: products?.length || 0
    });

    // Prepare context for AI
    const baseUrl = shop.url.replace(/\/$/, '');
    const collectionsSlug = shop.collections_slug || 'collections';
    
    // Dynamic products slug: support for different CMS (Shopify, WooCommerce, etc.)
    const productsSlug = shop.products_slug || (shop.type === 'WooCommerce' ? 'product' : 'products');
    
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
          url: `${baseUrl}/${productsSlug}/${p.slug}`,
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
    const prompt = `Tu es un expert SEO en maillage interne. Analyse ce contenu d'article de blog et suggère 5-7 liens internes pertinents et naturels.

CONTENU DE L'ARTICLE (extrait):
${content.replace(/<[^>]*>/g, '').substring(0, 800)}...

SUJET: ${topic || 'Non spécifié'}

RESSOURCES DISPONIBLES (URLs RÉELLES - NE PAS INVENTER D'AUTRES URLS):

${postsContext.length > 0 ? `ARTICLES (${postsContext.length}):
${postsContext.slice(0, 8).map((p, i) => `${i+1}. Titre: "${p.title}"
   URL: ${p.url}
   Sujet: ${p.topic}`).join('\n\n')}` : ''}

${collectionsContext.length > 0 ? `\nCOLLECTIONS (${collectionsContext.length}):
${collectionsContext.slice(0, 10).map((c, i) => `${i+1}. Titre: "${c.title}"
   URL: ${c.url}
   Description: ${c.description || 'N/A'}`).join('\n\n')}` : ''}

${productsContext.length > 0 ? `\nPRODUITS (${productsContext.length}):
${productsContext.slice(0, 10).map((p, i) => `${i+1}. Titre: "${p.title}"
   URL: ${p.url}`).join('\n\n')}` : ''}

RÈGLES STRICTES:
1. ⚠️ **CRITIQUE** : Tu DOIS utiliser UNIQUEMENT les URLs listées ci-dessus
2. ⚠️ **INTERDIT** : Ne JAMAIS inventer ou construire d'autres URLs
3. Suggère 7-9 liens maximum (au moins 7, pas plus de 9) - Phase 5 SEO
4. L'anchor text doit exister dans le contenu de l'article
5. Ne JAMAIS mettre de liens dans les titres (H1-H6)
6. Privilégie la variété : mélange articles/collections/produits (favorise autres articles blog)
7. Score de pertinence minimum : 7/10

VALIDATION OBLIGATOIRE:
- Avant de suggérer un lien, vérifie que l'URL est dans la liste ci-dessus
- Si aucune ressource n'est pertinente, retourne une liste vide

Format JSON:
{
  "links": [
    {
      "anchor_text": "texte exact dans l'article",
      "url": "URL EXACTE de la liste ci-dessus",
      "context": "phrase contenant l'anchor text",
      "relevance_score": 8,
      "type": "article|collection|product"
    }
  ]
}`;

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

    // Valider que chaque URL suggérée existe dans nos ressources
    const allValidUrls = [
      ...postsContext.map(p => p.url),
      ...collectionsContext.map(c => c.url),
      ...productsContext.map(p => p.url)
    ];
    
    console.log(`Valid URLs available: ${allValidUrls.length}`);

    // STEP 1: CLEAN EXISTING INVALID LINKS from the content (anti-404)
    console.log('🧹 Cleaning pre-existing invalid links from content...');
    let cleanedContent = content;
    let linksRemovedFromContent = 0;
    
    // Remove links that don't belong to the shop domain or are empty/external
    cleanedContent = cleanedContent.replace(
      /<a\s+([^>]*?)href=["']([^"']*?)["']([^>]*?)>(.*?)<\/a>/gi,
      (match, beforeHref, href, afterHref, anchorText) => {
        // Keep if href starts with shop URL (internal link)
        if (href && href.startsWith(baseUrl)) {
          return match;
        }
        // Keep if href is a relative URL starting with / (internal)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          return match;
        }
        // Keep if href starts with #  (anchor)
        if (href && href.startsWith('#')) {
          return match;
        }
        // Keep if it's in our whitelist of valid URLs
        if (href && allValidUrls.includes(href)) {
          return match;
        }
        // Otherwise, remove the link but keep the text
        linksRemovedFromContent++;
        console.log(`🔥 Removed invalid link: ${href}`);
        return anchorText;
      }
    );
    
    if (linksRemovedFromContent > 0) {
      console.log(`✓ Cleaned ${linksRemovedFromContent} invalid pre-existing links`);
      content = cleanedContent; // Update content for further processing
    }

    // VALIDATION HEAD REQUEST: Vérifier que les URLs existent réellement (pas de 404)
    async function validateUrl(url: string): Promise<boolean> {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const isValid = response.ok; // status 200-299
        if (!isValid) {
          console.warn(`⚠️ URL retourne ${response.status}: ${url}`);
        }
        return isValid;
      } catch (error) {
        console.warn(`⚠️ URL inaccessible: ${url}`, error);
        return false;
      }
    }

    // Valider toutes les URLs en parallèle
    console.log('🔍 Validation des URLs avant insertion...');
    const urlValidations = await Promise.all(
      allValidUrls.map(async (url) => ({
        url,
        isValid: await validateUrl(url)
      }))
    );

    const validatedUrls = urlValidations
      .filter(v => v.isValid)
      .map(v => v.url);

    const rejectedUrls = urlValidations
      .filter(v => !v.isValid)
      .map(v => v.url);

    console.log(`✅ URLs valides: ${validatedUrls.length}/${allValidUrls.length}`);
    if (rejectedUrls.length > 0) {
      console.warn(`❌ URLs rejetées (404 ou erreur):`, rejectedUrls);
    }

    // Insert links into content
    let updatedContent = content;
    let linksAdded = 0;

    if (linkSuggestions.links && Array.isArray(linkSuggestions.links)) {
      // Valider et filtrer les liens (vérifier à la fois dans la liste ET que l'URL est accessible)
      const validatedLinks = linkSuggestions.links.filter((link: any) => {
        const isInList = allValidUrls.includes(link.url);
        const isAccessible = validatedUrls.includes(link.url);
        
        if (!isInList) {
          console.warn(`⚠️ Lien rejeté (non dans ressources): ${link.url}`);
        } else if (!isAccessible) {
          console.warn(`⚠️ Lien rejeté (404 ou inaccessible): ${link.url}`);
        }
        
        return isInList && isAccessible && link.relevance_score >= 7;
      });
      
      console.log(`Validated ${validatedLinks.length}/${linkSuggestions.links.length} links`);
      
      // Sort by relevance score (Phase 5: Increased to 9 links)
      const sortedLinks = validatedLinks
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
        .slice(0, 9); // Max 9 links (Phase 5 SEO)

      console.log(`Processing ${sortedLinks.length} high-relevance links...`);

      for (const link of sortedLinks) {
        const { anchor_text, url, type } = link;
        
        // Create the link HTML with appropriate attributes
        const linkHtml = `<a href="${url}" title="${anchor_text}" class="internal-link">${anchor_text}</a>`;
        
        // Try to find and replace the anchor text in the content
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${anchor_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        // CRITICAL: Ne PAS insérer dans les headings (H1-H6), figcaption, ou tableaux
        // On extrait les paragraphes <p> et listes <li> pour éviter les headings
        const safeTagsRegex = /<(p|li)[^>]*>.*?<\/\1>/gis;
        const safeSections = updatedContent.match(safeTagsRegex) || [];
        
        let replacementDone = false;
        for (const section of safeSections) {
          if (regex.test(section) && !section.includes(`>${anchor_text}</a>`)) {
            const replacedSection = section.replace(regex, linkHtml);
            updatedContent = updatedContent.replace(section, replacedSection);
            linksAdded++;
            replacementDone = true;
            console.log(`✓ Added ${type} link: "${anchor_text}" → ${url}`);
            break;
          }
        }
        
        if (!replacementDone) {
          console.log(`⚠ Skipped link "${anchor_text}": not found in safe tags (p, li) or already linked`);
        }
      }
    }

    // NETTOYAGE FINAL: Retirer tous les liens des titres H1/H2/H3
    updatedContent = updatedContent.replace(
      /<(h[123])[^>]*>(.*?)<\/h[123]>/gi,
      (match, tag, content) => {
        // Retirer tous les <a> mais garder leur texte
        const cleanContent = content.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
        return `<${tag}>${cleanContent}</${tag}>`;
      }
    );

    console.log('Final cleanup: removed all links from H1/H2/H3 tags');

    // Final summary
    console.log(`📊 Internal linking summary:
      - Pre-existing invalid links removed: ${linksRemovedFromContent}
      - New internal links added: ${linksAdded}
      - Total links processed: ${linksRemovedFromContent + linksAdded}
    `);

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
