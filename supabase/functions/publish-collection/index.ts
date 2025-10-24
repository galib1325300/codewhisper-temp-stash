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
    const { shopId, collectionId } = await req.json();

    if (!shopId || !collectionId) {
      throw new Error('Shop ID and collection ID are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch shop details
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found');
    }

    if (!shop.consumer_key || !shop.consumer_secret) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // Fetch collection
    const { data: collection, error: collectionError } = await supabaseClient
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (collectionError || !collection) {
      throw new Error('Collection not found');
    }

    if (!collection.woocommerce_id) {
      throw new Error('This collection is not linked to WooCommerce');
    }

    console.log(`Publishing collection: ${collection.name}`);

    // Update on WooCommerce
    const auth = btoa(`${shop.consumer_key}:${shop.consumer_secret}`);
    const wcUrl = `${shop.url}/wp-json/wc/v3/products/categories/${collection.woocommerce_id}`;
    
    const wcResponse = await fetch(wcUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: collection.name,
        description: collection.description || '',
        slug: collection.slug,
      })
    });

    if (!wcResponse.ok) {
      const wcError = await wcResponse.text();
      console.error(`WooCommerce API error:`, wcResponse.status, wcError);
      throw new Error(`WooCommerce update error: ${wcResponse.status}`);
    }

    console.log(`Successfully published collection ${collection.name} on WooCommerce`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Collection published successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error publishing collection:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
