import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId } = await req.json();

    if (!postId) {
      throw new Error('postId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🧹 Starting link cleanup for post ${postId}`);

    // Fetch post and shop data
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*, shops(url)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    const shopDomain = new URL(post.shops.url).hostname.replace(/^www\./, '');
    let content = post.content || '';
    let removedCount = 0;
    let keptCount = 0;

    console.log(`📍 Shop domain: ${shopDomain}`);

    // Step 1: Extract all links and validate them
    const linkRegex = /<a\s+([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>([^<]*)<\/a>/gi;
    const validLinks: Array<{ fullMatch: string; url: string; anchor: string }> = [];
    const invalidLinks: Array<{ fullMatch: string; url: string; reason: string }> = [];

    let linkMatch;
    while ((linkMatch = linkRegex.exec(content)) !== null) {
      const fullMatch = linkMatch[0];
      const url = linkMatch[2];
      const anchor = linkMatch[3];

      // Check if it's an external link (not from shop domain)
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const urlObj = new URL(url);
          const linkDomain = urlObj.hostname.replace(/^www\./, '');
          
          if (linkDomain !== shopDomain) {
            invalidLinks.push({ fullMatch, url, reason: 'external domain' });
            continue;
          }
        } catch (e) {
          invalidLinks.push({ fullMatch, url, reason: 'malformed URL' });
          continue;
        }
      }

      // Check if anchor is empty
      if (!anchor.trim()) {
        invalidLinks.push({ fullMatch, url, reason: 'empty anchor text' });
        continue;
      }

      // Validate link accessibility with HEAD request
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const headResponse = await fetch(url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          
          if (headResponse.status === 404 || headResponse.status >= 500) {
            invalidLinks.push({ fullMatch, url, reason: `HTTP ${headResponse.status}` });
            continue;
          }
        } catch (e) {
          invalidLinks.push({ fullMatch, url, reason: 'unreachable' });
          continue;
        }
      }

      validLinks.push({ fullMatch, url, anchor });
    }

    console.log(`✅ Valid links: ${validLinks.length}`);
    console.log(`❌ Invalid links: ${invalidLinks.length}`);

    // Step 2: Remove invalid links (replace with plain text)
    for (const invalid of invalidLinks) {
      // Extract text content and remove the link tag
      const textContent = invalid.fullMatch.match(/>([^<]*)<\/a>/)?.[1] || '';
      content = content.replace(invalid.fullMatch, textContent);
      removedCount++;
      console.log(`🗑️ Removed: ${invalid.url} (${invalid.reason})`);
    }

    // Step 3: Fix nested links in headings
    const nestedLinkRegex = /<(h[1-6])[^>]*>.*?<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]*)<\/a>.*?<\/\1>/gi;
    content = content.replace(nestedLinkRegex, (match, tag, url, anchor) => {
      console.log(`🔧 Fixed nested link in ${tag.toUpperCase()}: ${anchor}`);
      return match.replace(/<a\s+[^>]*href\s*=\s*["'][^"']+["'][^>]*>([^<]*)<\/a>/, '$1');
    });

    // Step 4: Update post with cleaned content
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) throw updateError;

    console.log(`✨ Cleanup completed: ${removedCount} links removed, ${validLinks.length} links kept`);

    // Step 5: Re-run add-blog-internal-links to compensate
    if (removedCount > 0) {
      console.log('🔗 Re-running internal link generation...');
      try {
        const { data: relinkData, error: relinkError } = await supabase.functions.invoke('add-blog-internal-links', {
          body: { 
            postId,
            shopId: post.shop_id,
            content,
            topic: post.title,
            preserveExisting: true
          }
        });

        if (relinkError) {
          console.warn('⚠️ Internal linking failed:', relinkError);
        } else {
          console.log('✅ Internal links regenerated');
        }
      } catch (e) {
        console.warn('⚠️ Internal linking error:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        removed: removedCount,
        kept: validLinks.length,
        invalidLinks: invalidLinks.map(l => ({ url: l.url, reason: l.reason }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cleaning blog post links:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
