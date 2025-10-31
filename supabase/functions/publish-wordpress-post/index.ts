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
    const { postId, shopId } = await req.json();

    if (!postId || !shopId) {
      return new Response(JSON.stringify({ error: 'postId et shopId sont requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📤 Publishing post ${postId} to WordPress...`);

    // Récupérer l'article et la boutique
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: 'Article non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Vérifier les credentials WordPress
    if (!shop.wp_username || !shop.wp_password) {
      return new Response(JSON.stringify({ 
        error: 'Identifiants WordPress non configurés dans les paramètres de la boutique' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wordpressUrl = shop.url.replace(/\/$/, '');
    const authHeader = 'Basic ' + btoa(`${shop.wp_username}:${shop.wp_password}`);

    console.log(`Publishing to WordPress: ${wordpressUrl}`);

    // Récupérer l'auteur WordPress si disponible
    const { data: author } = await supabase
      .from('authors')
      .select('wordpress_author_id')
      .eq('id', post.author_id)
      .single();

    // Préparer le payload WordPress
    const wordpressPayload: any = {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      status: 'publish',
      slug: post.slug,
      meta: {
        _yoast_wpseo_title: post.meta_title || post.title,
        _yoast_wpseo_metadesc: post.meta_description || post.excerpt || '',
        _yoast_wpseo_focuskw: post.focus_keyword || '',
      }
    };

    // Ajouter l'auteur si disponible
    if (author?.wordpress_author_id) {
      wordpressPayload.author = author.wordpress_author_id;
    }

    // Upload featured image to WordPress if exists
    let featuredMediaId = null;
    if (post.featured_image) {
      try {
        console.log('Uploading featured image to WordPress...');
        
        // Download image from Supabase storage
        const imageResponse = await fetch(post.featured_image);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageBuffer = await imageBlob.arrayBuffer();
          
          // Get filename from URL
          const filename = post.featured_image.split('/').pop() || 'featured-image.jpg';
          
          // Upload to WordPress
          const formData = new FormData();
          formData.append('file', new Blob([imageBuffer]), filename);
          
          const uploadResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/media`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            featuredMediaId = uploadData.id;
            console.log(`✓ Featured image uploaded: ID ${featuredMediaId}`);
          } else {
            console.warn('Failed to upload featured image:', await uploadResponse.text());
          }
        }
      } catch (imageError) {
        console.warn('Error uploading featured image:', imageError);
      }
    }

    if (featuredMediaId) {
      wordpressPayload.featured_media = featuredMediaId;
    }

    // Publier sur WordPress
    const wpResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wordpressPayload),
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API error:', wpResponse.status, errorText);
      
      // Parser les erreurs communes
      let errorMessage = 'Erreur lors de la publication sur WordPress';
      if (wpResponse.status === 401) {
        errorMessage = 'Identifiants WordPress invalides';
      } else if (wpResponse.status === 403) {
        errorMessage = 'Permissions insuffisantes sur WordPress';
      } else if (wpResponse.status === 404) {
        errorMessage = 'API WordPress introuvable (vérifier l\'URL)';
      }

      return new Response(JSON.stringify({ error: errorMessage, details: errorText }), {
        status: wpResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wpData = await wpResponse.json();
    console.log('✅ Post published to WordPress:', wpData.id);

    // Mettre à jour Supabase avec les infos WordPress
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        external_id: wpData.id.toString(),
        wordpress_slug: wpData.slug,
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post in Supabase:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Article publié sur WordPress mais erreur de mise à jour en base' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const articleUrl = `${wordpressUrl}/${wpData.slug}/`;
    
    console.log(`✅ Publication terminée: ${articleUrl}`);

    return new Response(JSON.stringify({
      success: true,
      wordpress_id: wpData.id,
      wordpress_slug: wpData.slug,
      url: articleUrl,
      message: 'Article publié avec succès sur WordPress'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in publish-wordpress-post:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
