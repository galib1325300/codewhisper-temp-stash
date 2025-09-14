import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// WooCommerce API helper
function createWooCommerceAuth(consumerKey: string, consumerSecret: string) {
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  return `Basic ${credentials}`;
}

async function wooCommerceRequest(url: string, endpoint: string, auth: string, params: Record<string, any> = {}) {
  const searchParams = new URLSearchParams(params);
  const fullUrl = `${url}/wp-json/wc/v3/${endpoint}?${searchParams}`;
  
  const response = await fetch(fullUrl, {
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.statusText}`);
  }
  
  return {
    data: await response.json(),
    headers: Object.fromEntries(response.headers.entries())
  };
}

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

    // Initialize WooCommerce API auth
    const auth = createWooCommerceAuth(shop.consumer_key, shop.consumer_secret);

    // Fetch products from WooCommerce
    let allProducts: any[] = [];
    let page = 1;
    const perPage = 100;

    do {
      const response = await wooCommerceRequest(shop.url, "products", auth, {
        page: page.toString(),
        per_page: perPage.toString(),
      });
      
      if (response.data && response.data.length > 0) {
        allProducts.push(...response.data);
        page++;
      } else {
        break;
      }
    } while (true);

    // Transform and insert products into Supabase
    const productsToInsert = allProducts.map((product: any) => ({
      shop_id: shopId,
      woocommerce_id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      description: product.description,
      short_description: product.short_description,
      sku: product.sku,
      price: parseFloat(product.price) || 0,
      regular_price: parseFloat(product.regular_price) || 0,
      sale_price: parseFloat(product.sale_price) || 0,
      on_sale: product.on_sale,
      featured: product.featured,
      stock_quantity: product.stock_quantity,
      stock_status: product.stock_status,
      images: product.images || [],
      categories: product.categories || [],
    }));

    // Delete existing products for this shop
    await supabaseClient
      .from('products')
      .delete()
      .eq('shop_id', shopId);

    // Insert new products
    const { error: insertError } = await supabaseClient
      .from('products')
      .insert(productsToInsert);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, count: allProducts.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error syncing products:', error);
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