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

    console.log(`Syncing collection: ${collection.name}`);

    // Fetch from WooCommerce
    const auth = btoa(`${shop.consumer_key}:${shop.consumer_secret}`);
    const wcUrl = `${shop.url}/wp-json/wc/v3/products/categories/${collection.woocommerce_id}`;
    
    const wcResponse = await fetch(wcUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!wcResponse.ok) {
      const wcError = await wcResponse.text();
      console.error(`WooCommerce API error:`, wcResponse.status, wcError);
      throw new Error(`WooCommerce fetch error: ${wcResponse.status}`);
    }

    const wcCategory = await wcResponse.json();

    // Update in database
    const { error: updateError } = await supabaseClient
      .from('collections')
      .update({
        name: wcCategory.name,
        slug: wcCategory.slug,
        description: wcCategory.description || collection.description,
        image: wcCategory.image?.src || collection.image,
        product_count: wcCategory.count || collection.product_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', collectionId);

    if (updateError) {
      console.error('Error updating collection:', updateError);
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(`Successfully synced collection ${collection.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Collection synchronized successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error syncing collection:', error);
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
