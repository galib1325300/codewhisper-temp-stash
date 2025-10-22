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
    const { shopId } = await req.json();

    if (!shopId) {
      throw new Error('Shop ID is required');
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

    // Fetch categories from WooCommerce
    const auth = btoa(`${shop.consumer_key}:${shop.consumer_secret}`);
    const wcUrl = `${shop.url}/wp-json/wc/v3/products/categories?per_page=100`;

    const response = await fetch(wcUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const categories = await response.json();
    console.log(`Fetched ${categories.length} categories from WooCommerce`);

    // Sync categories to collections table
    let synced = 0;
    let errors = 0;

    for (const category of categories) {
      try {
        const collectionData = {
          shop_id: shopId,
          external_id: category.id.toString(),
          woocommerce_id: category.id.toString(),
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          image: category.image?.src || null,
          parent_id: null, // We'll handle parent relationships in a second pass
          product_count: category.count || 0,
        };

        const { error: upsertError } = await supabaseClient
          .from('collections')
          .upsert(collectionData, {
            onConflict: 'shop_id,external_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Error syncing category ${category.id}:`, upsertError);
          errors++;
        } else {
          synced++;
        }
      } catch (error) {
        console.error(`Error processing category ${category.id}:`, error);
        errors++;
      }
    }

    // Second pass: update parent relationships
    for (const category of categories) {
      if (category.parent && category.parent !== 0) {
        try {
          // Find parent collection
          const { data: parentCollection } = await supabaseClient
            .from('collections')
            .select('id')
            .eq('shop_id', shopId)
            .eq('external_id', category.parent.toString())
            .single();

          if (parentCollection) {
            await supabaseClient
              .from('collections')
              .update({ parent_id: parentCollection.id })
              .eq('shop_id', shopId)
              .eq('external_id', category.id.toString());
          }
        } catch (error) {
          console.error(`Error updating parent for category ${category.id}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        errors,
        total: categories.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error syncing collections:', error);
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