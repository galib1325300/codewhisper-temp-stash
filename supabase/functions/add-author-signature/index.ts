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
    const { content, authorId, shopId, postTitle } = await req.json();

    if (!content || !authorId || !shopId) {
      return new Response(JSON.stringify({ error: 'content, authorId et shopId sont requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Adding author signature to post...');

    // Check if signature already exists
    if (content.includes('author-signature') || content.includes('itemtype="https://schema.org/Person"')) {
      console.log('Author signature already exists, skipping...');
      return new Response(JSON.stringify({
        success: true,
        content: content,
        message: 'La signature auteur existe déjà'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get author data
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .select('*')
      .eq('id', authorId)
      .single();

    if (authorError || !author) {
      console.error('Author not found:', authorError);
      return new Response(JSON.stringify({ error: 'Auteur non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get 2-3 other articles by the same author (published only)
    const { data: otherArticles } = await supabase
      .from('blog_posts')
      .select('title, slug, wordpress_slug')
      .eq('shop_id', shopId)
      .eq('author_id', authorId)
      .eq('status', 'publish')
      .neq('title', postTitle || '')
      .limit(3);

    console.log(`Found ${otherArticles?.length || 0} other articles by author`);

    // Get shop data for URL construction
    const { data: shop } = await supabase
      .from('shops')
      .select('url')
      .eq('id', shopId)
      .single();

    // Build signature HTML
    const expertiseText = author.expertise_areas && author.expertise_areas.length > 0
      ? author.expertise_areas.slice(0, 3).join(', ')
      : author.title;

    let otherArticlesHtml = '';
    if (otherArticles && otherArticles.length > 0) {
      const articleLinks = otherArticles.map(article => {
        const slug = article.wordpress_slug || article.slug;
        const url = shop ? `${shop.url}/${slug}/` : `/${slug}/`;
        return `      <li><a href="${url}" style="color: #0066cc; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#0052a3'" onmouseout="this.style.color='#0066cc'">${article.title}</a></li>`;
      }).join('\n');

      otherArticlesHtml = `
  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd;">
    <p style="font-weight: bold; margin-bottom: 8px; color: #333;">📚 Découvrez aussi les articles de ${author.name} :</p>
    <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
${articleLinks}
    </ul>
  </div>`;
    }

    const signatureHtml = `
<div class="author-signature" itemscope itemtype="https://schema.org/Person" style="border-left: 4px solid #0066cc; padding: 24px; margin: 40px 0; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div style="display: flex; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 16px;">
    ${author.avatar_url ? `<img itemprop="image" src="${author.avatar_url}" alt="${author.name}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #0066cc; flex-shrink: 0;">` : ''}
    <div style="flex: 1; min-width: 200px;">
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1a1a1a;" itemprop="name">${author.name}</p>
      <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;" itemprop="jobTitle">${author.title}</p>
    </div>
  </div>
  <p style="font-style: italic; color: #444; line-height: 1.6; margin-bottom: 8px;" itemprop="description">
    Cet article a été rédigé par <strong itemprop="name">${author.name}</strong>, ${author.title}. 
    ${author.credentials ? `${author.credentials}. ` : ''}Spécialisé${author.name.toLowerCase().includes('marie') || author.name.toLowerCase().includes('sophie') || author.name.toLowerCase().includes('julie') ? 'e' : ''} en ${expertiseText}, ${author.name.split(' ')[0]} partage régulièrement des analyses 
    détaillées et des conseils pratiques pour vous aider à prendre les meilleures décisions.
  </p>
  ${author.social_links?.linkedin || author.social_links?.twitter || author.social_links?.website ? `
  <div style="margin-top: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
    ${author.social_links.linkedin ? `<a href="${author.social_links.linkedin}" target="_blank" rel="noopener noreferrer" itemprop="sameAs" style="color: #0077b5; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
      LinkedIn
    </a>` : ''}
    ${author.social_links.twitter ? `<a href="${author.social_links.twitter}" target="_blank" rel="noopener noreferrer" itemprop="sameAs" style="color: #1da1f2; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
      Twitter
    </a>` : ''}
    ${author.social_links.website ? `<a href="${author.social_links.website}" target="_blank" rel="noopener noreferrer" itemprop="url" style="color: #0066cc; text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 4px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      Site web
    </a>` : ''}
  </div>` : ''}${otherArticlesHtml}
</div>
`;

    // Try to insert signature before conclusion
    let updatedContent = content;
    const conclusionRegex = /<h2[^>]*>.*?(conclusion|pour conclure|en résumé|mot de la fin).*?<\/h2>/i;
    const hasConclusion = conclusionRegex.test(content);

    if (hasConclusion) {
      // Insert before conclusion
      updatedContent = content.replace(conclusionRegex, `${signatureHtml}\n\n$&`);
      console.log('Signature inserted before conclusion');
    } else {
      // Try to insert before last H2 (if exists)
      const h2Matches = content.match(/<h2[^>]*>.*?<\/h2>/gi);
      if (h2Matches && h2Matches.length > 1) {
        const lastH2 = h2Matches[h2Matches.length - 1];
        const lastH2Index = content.lastIndexOf(lastH2);
        updatedContent = content.slice(0, lastH2Index) + signatureHtml + '\n\n' + content.slice(lastH2Index);
        console.log('Signature inserted before last H2');
      } else {
        // Append at the end
        updatedContent = `${content}\n\n${signatureHtml}`;
        console.log('Signature appended at the end');
      }
    }

    console.log('✓ Author signature added successfully');

    return new Response(JSON.stringify({
      success: true,
      content: updatedContent,
      message: `Signature de ${author.name} ajoutée avec succès`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in add-author-signature:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
