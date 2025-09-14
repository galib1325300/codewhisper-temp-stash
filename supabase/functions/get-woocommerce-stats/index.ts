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

    // Get products count
    const productsResponse = await wooCommerceRequest(shop.url, "products", auth, { per_page: 1 });
    const productsCount = parseInt(productsResponse.headers['x-wp-total'] || '0');

    // Get categories count
    const categoriesResponse = await wooCommerceRequest(shop.url, "products/categories", auth, { per_page: 1 });
    const categoriesCount = parseInt(categoriesResponse.headers['x-wp-total'] || '0');

    // Get orders count and revenue
    const ordersResponse = await wooCommerceRequest(shop.url, "orders", auth, { per_page: 100, status: 'completed' });
    const orders = ordersResponse.data || [];
    const ordersCount = orders.length;
    
    const revenue = orders.reduce((total: number, order: any) => {
      return total + parseFloat(order.total || '0');
    }, 0);

    // Get customers count
    const customersResponse = await wooCommerceRequest(shop.url, "customers", auth, { per_page: 1 });
    const customersCount = parseInt(customersResponse.headers['x-wp-total'] || '0');

    const stats = {
      products: productsCount,
      collections: categoriesCount,
      orders: ordersCount,
      revenue: `${revenue.toFixed(2)}€`,
      customers: customersCount,
    };

    return new Response(
      JSON.stringify({ success: true, stats }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error getting WooCommerce stats:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur lors de la récupération des statistiques' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});