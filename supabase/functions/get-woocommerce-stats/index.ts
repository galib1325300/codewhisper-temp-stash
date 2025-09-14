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

    // Get products count
    const productsResponse = await WooCommerce.get("products", { per_page: 1 });
    const productsCount = parseInt(productsResponse.headers['x-wp-total'] || '0');

    // Get categories count
    const categoriesResponse = await WooCommerce.get("products/categories", { per_page: 1 });
    const categoriesCount = parseInt(categoriesResponse.headers['x-wp-total'] || '0');

    // Get orders count and revenue
    const ordersResponse = await WooCommerce.get("orders", { per_page: 100, status: 'completed' });
    const orders = ordersResponse.data || [];
    const ordersCount = orders.length;
    
    const revenue = orders.reduce((total, order) => {
      return total + parseFloat(order.total || '0');
    }, 0);

    // Get customers count
    const customersResponse = await WooCommerce.get("customers", { per_page: 1 });
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