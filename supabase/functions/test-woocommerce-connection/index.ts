import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import WooCommerceRestApi from "https://esm.sh/woocommerce-rest-api@1.0.1?target=deno";

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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Identifiants WooCommerce manquants. Veuillez configurer vos clés API.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize WooCommerce API
    const WooCommerce = new WooCommerceRestApi({
      url: shop.url,
      consumerKey: shop.consumer_key,
      consumerSecret: shop.consumer_secret,
      version: "wc/v3"
    });

    // Test connection with a simple API call
    const response = await WooCommerce.get("");
    
    if (response.status === 200) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connexion WooCommerce réussie !' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('Échec de la connexion WooCommerce');
    }

  } catch (error) {
    console.error('Error testing WooCommerce connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Erreur de connexion WooCommerce' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});