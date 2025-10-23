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
    const { productId, shopId, preserveExisting } = await req.json();

    if (!productId || !shopId) {
      return new Response(JSON.stringify({ error: 'productId and shopId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if description already has internal links
    const currentDescription = product.description || '';
    if (preserveExisting && currentDescription.includes('<a href=')) {
      console.log('Description already has internal links, preserving existing');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Internal links preserved',
        description: currentDescription 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product categories
    const categories = product.categories || [];
    if (categories.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No categories to link to',
        description: currentDescription 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build collection links based on the logic from ShopProductDetailsPage
    const collectionsSlug = shop.collections_slug || 'collections';
    const baseUrl = shop.url.replace(/\/$/, '');
    
    const collectionLinks = categories
      .filter((cat: any) => cat.slug)
      .map((cat: any) => {
        const collectionUrl = `${baseUrl}/${collectionsSlug}/${cat.slug}`;
        return `<a href="${collectionUrl}" title="${cat.name}">${cat.name}</a>`;
      });

    if (collectionLinks.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No valid category links to add',
        description: currentDescription 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create internal linking paragraph
    const linkingText = collectionLinks.length === 1
      ? `Découvrez également notre collection ${collectionLinks[0]} pour plus de produits similaires.`
      : `Découvrez également nos collections ${collectionLinks.slice(0, -1).join(', ')} et ${collectionLinks[collectionLinks.length - 1]} pour plus de produits similaires.`;

    // Append to description
    const updatedDescription = currentDescription 
      ? `${currentDescription}\n\n<p>${linkingText}</p>`
      : `<p>${linkingText}</p>`;

    // Update product in database
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        description: updatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let remoteUpdated = true;

    // Update WooCommerce if needed
    if (shop.type === 'woocommerce' && product.woocommerce_id) {
      console.log('Syncing to WooCommerce...', { shopId, productId, woocommerce_id: product.woocommerce_id });
      
      try {
        const { data: wooResult, error: wooError } = await supabase.functions.invoke('update-woocommerce-product', {
          body: {
            shopId: shopId,
            productId: productId,
          }
        });

        if (wooError) {
          console.error('Error updating WooCommerce:', wooError);
          remoteUpdated = false;
        } else if (!wooResult?.success) {
          console.error('WooCommerce update failed:', wooResult);
          remoteUpdated = false;
        } else {
          console.log('✓ WooCommerce product synced successfully');
        }
      } catch (err) {
        console.error('Exception calling update-woocommerce-product:', err);
        remoteUpdated = false;
      }
    } else {
      console.log('Shop type or WooCommerce ID missing, skipping remote update', { 
        type: shop.type, 
        woocommerce_id: product.woocommerce_id 
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      description: updatedDescription,
      linksAdded: collectionLinks.length,
      remoteUpdated,
      message: remoteUpdated 
        ? 'Internal links added successfully'
        : 'Links added to database but failed to sync to remote site'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in add-internal-links:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});