import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, userId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization') || undefined;
    const supabaseForUpdate = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });
    
    if (!authHeader) {
      console.warn('No Authorization header provided; triggers using auth.uid() may fail.');
    }

    // Récupérer le produit
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, images, shop_id, short_description, categories')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch shop to check type and credentials
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, type, url, wp_username, wp_password')
      .eq('id', product.shop_id)
      .single();

    if (shopError || !shop) {
      console.error('Shop not found:', shopError);
      return new Response(
        JSON.stringify({ success: false, error: 'Shop not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Shop type:', shop.type, 'Has WP credentials:', !!(shop.wp_username && shop.wp_password));

    const images = product.images || [];
    if (images.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No images found for this product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Générer les textes alt pour chaque image
    const updatedImages = [];
    const errors = [];
    const wordpressSyncErrors = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const oldAlt = image.alt || '';
      
      const systemPrompt = `Tu es un expert en SEO et en accessibilité web.
Génère un texte alt optimisé pour une image de produit e-commerce.
Le texte alt doit :
- Décrire précisément ce que montre l'image (50-125 caractères)
- Inclure le nom du produit si c'est la première image, sinon décrire l'angle/détail montré
- Être optimisé pour le SEO avec des mots-clés pertinents
- Être naturel et descriptif pour l'accessibilité
Réponds UNIQUEMENT avec le texte alt, sans guillemets ni formatage.`;

      const prompt = i === 0 
        ? `Produit : ${product.name}
Description courte : ${product.short_description || 'N/A'}
Catégories : ${product.categories?.map((c: any) => c.name).join(', ') || 'N/A'}

C'est l'image principale du produit. Génère un texte alt descriptif et optimisé SEO.`
        : `Produit : ${product.name}
Image ${i + 1} sur ${images.length}

C'est une image secondaire du produit (angle différent, détail, ou vue alternative). Génère un texte alt descriptif qui distingue cette vue de l'image principale.`;

      try {
        console.log(`Processing image ${i + 1}/${images.length}`);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for image ${i}:`, response.status, errorText);
          
          if (response.status === 429) {
            errors.push({ image: i, error: 'Rate limit exceeded' });
            updatedImages.push(image);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before next
            continue;
          }
          
          if (response.status === 402) {
            errors.push({ image: i, error: 'Insufficient credits' });
            updatedImages.push(image);
            continue;
          }
          
          errors.push({ image: i, error: `API error: ${response.status}` });
          updatedImages.push(image);
          continue;
        }

        const data = await response.json();
        const altText = data.choices?.[0]?.message?.content?.trim() || image.alt || `${product.name} - Image ${i + 1}`;

        console.log(`Generated alt text for image ${i + 1}:`, altText);

        const updatedImage = {
          ...image,
          alt: altText
        };

        updatedImages.push(updatedImage);

        // Sync to WordPress if applicable
        if (shop.type === 'wordpress' && shop.wp_username && shop.wp_password) {
          if (image.wordpress_media_id && altText !== oldAlt) {
            console.log(`Syncing ALT to WordPress for media ID: ${image.wordpress_media_id}`);
            
            try {
              const wpSyncResponse = await supabase.functions.invoke('update-wordpress-media-alt', {
                body: {
                  shopId: shop.id,
                  mediaId: image.wordpress_media_id,
                  altText: altText
                }
              });

              if (wpSyncResponse.error) {
                console.error(`WordPress sync error for image ${i + 1}:`, wpSyncResponse.error);
                wordpressSyncErrors.push({ 
                  index: i, 
                  mediaId: image.wordpress_media_id,
                  error: wpSyncResponse.error.message || 'WordPress sync failed'
                });
              } else {
                console.log(`✓ WordPress ALT synced for image ${i + 1}`);
              }
            } catch (wpError) {
              console.error(`WordPress sync exception for image ${i + 1}:`, wpError);
              wordpressSyncErrors.push({ 
                index: i, 
                mediaId: image.wordpress_media_id,
                error: wpError.message 
              });
            }
          } else if (!image.wordpress_media_id) {
            console.log(`Skipping WordPress sync for image ${i + 1}: no wordpress_media_id`);
          }
        }

      } catch (error) {
        console.error(`Error generating alt text for image ${i}:`, error);
        errors.push({ image: i, error: error.message });
        updatedImages.push(image);
      }
    }

    // If too many errors, return early
    if (errors.length === images.length) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate any alt texts',
          errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Mettre à jour le produit avec les nouveaux textes alt (impersonate user)
    const { error: updateError } = await supabaseForUpdate
      .from('products')
      .update({ images: updatedImages })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update product images' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build success message
    const successCount = updatedImages.filter((img, idx) => {
      const original = images[idx];
      return img.alt && img.alt !== (original?.alt || '');
    }).length;

    let message = `✅ ${successCount} textes alt générés`;
    
    if (wordpressSyncErrors.length > 0) {
      message += ` | ⚠️ ${wordpressSyncErrors.length} erreurs de synchro WordPress`;
    } else if (shop.type === 'wordpress' && shop.wp_username && shop.wp_password) {
      const syncedCount = updatedImages.filter(img => img.wordpress_media_id).length;
      if (syncedCount > 0) {
        message += ` | ✓ ${syncedCount} synchronisés sur WordPress`;
      }
    }

    if (errors.length > 0) {
      message += ` | ⚠️ ${errors.length} erreurs AI`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        images: updatedImages,
        successCount,
        message,
        errors: errors.length > 0 ? errors : undefined,
        wordpressSyncErrors: wordpressSyncErrors.length > 0 ? wordpressSyncErrors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-alt-texts function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});