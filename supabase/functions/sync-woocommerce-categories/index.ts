import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import WooCommerceRestApi from "https://esm.sh/woocommerce-rest-api@1.0.1";

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
    
    // Get shop credentials
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    if (!shop.consumer_key || !shop.consumer_secret || !shop.url) {
      throw new Error('Identifiants WooCommerce manquants');
    }

    // Initialize WooCommerce API
    const WooCommerce = new WooCommerceRestApi({
      url: shop.url,
      consumerKey: shop.consumer_key,
      consumerSecret: shop.consumer_secret,
      version: "wc/v3"
    });

    // Fetch categories from WooCommerce
    let allCategories = [];
    let page = 1;
    const perPage = 100;

    do {
      const response = await WooCommerce.get("products/categories", {
        page,
        per_page: perPage,
      });
      
      if (response.data && response.data.length > 0) {
        allCategories.push(...response.data);
        page++;
      } else {
        break;
      }
    } while (true);

    // Transform and insert categories into Supabase
    const categoriesToInsert = allCategories.map(category => ({
      shop_id: shopId,
      woocommerce_id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: category.image?.src || null,
      parent_id: category.parent,
      product_count: category.count,
    }));

    // Delete existing categories for this shop
    await supabaseClient
      .from('collections')
      .delete()
      .eq('shop_id', shopId);

    // Insert new categories
    const { error: insertError } = await supabaseClient
      .from('collections')
      .insert(categoriesToInsert);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, count: allCategories.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error syncing categories:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la synchronisation' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});