import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!shop.wp_username || !shop.wp_password) {
      throw new Error('Identifiants WordPress non configurés');
    }

    const baseUrl = shop.url.replace(/\/$/, '');
    const auth = btoa(`${shop.wp_username}:${shop.wp_password}`);
    
    console.log('Synchronisation des articles WordPress depuis:', baseUrl);

    // Fetch posts from WordPress REST API
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts?per_page=100&_embed`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', response.status, errorText);
      throw new Error(`Erreur API WordPress: ${response.status}`);
    }

    const posts = await response.json();
    console.log(`${posts.length} articles trouvés sur WordPress`);

    let syncedCount = 0;
    let updatedCount = 0;

    for (const post of posts) {
      // Extract featured image URL
      let featuredImage = null;
      if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
        featuredImage = post._embedded['wp:featuredmedia'][0].source_url;
      }

      const postData = {
        shop_id: shopId,
        external_id: post.id.toString(),
        title: post.title.rendered,
        slug: post.slug,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        status: post.status,
        featured_image: featuredImage,
        published_at: post.date,
        meta_description: post.yoast_head_json?.og_description || null,
        focus_keyword: post.yoast_head_json?.schema?.['@graph']?.[0]?.keywords?.[0] || null,
        
      };

      // Check if post already exists
      const { data: existing } = await supabaseClient
        .from('blog_posts')
        .select('id')
        .eq('shop_id', shopId)
        .eq('external_id', post.id.toString())
        .single();

      if (existing) {
        // Update existing post
        const { error: updateError } = await supabaseClient
          .from('blog_posts')
          .update(postData)
          .eq('id', existing.id);

        if (updateError) {
          console.error('Update error on blog_posts', { shopId, external_id: post.id.toString(), error: updateError });
        } else {
          updatedCount++;
        }
      } else {
        // Insert new post
        const { error: insertError } = await supabaseClient
          .from('blog_posts')
          .insert(postData);

        if (insertError) {
          console.error('Insert error on blog_posts', { shopId, external_id: post.id.toString(), error: insertError });
        } else {
          syncedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${syncedCount} nouveaux articles synchronisés, ${updatedCount} articles mis à jour`,
        synced: syncedCount,
        updated: updatedCount,
        total: posts.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error syncing WordPress posts:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Erreur lors de la synchronisation' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
