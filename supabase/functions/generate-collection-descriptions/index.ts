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
    const { shopId, collectionIds } = await req.json();

    if (!shopId || !collectionIds || collectionIds.length === 0) {
      throw new Error('Shop ID and collection IDs are required');
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch collections
    const { data: collections, error: collectionsError } = await supabaseClient
      .from('collections')
      .select('*')
      .in('id', collectionIds);

    if (collectionsError) {
      throw new Error(`Error fetching collections: ${collectionsError.message}`);
    }

    console.log(`Generating descriptions for ${collections.length} collections`);

    const auth = btoa(`${shop.consumer_key}:${shop.consumer_secret}`);
    let updated = 0;
    let failed = 0;

    for (const collection of collections) {
      try {
        console.log(`Generating description for collection: ${collection.name}`);

        // Generate SEO-optimized description using Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en SEO et rédaction web pour e-commerce. Tu génères des descriptions de catégories optimisées pour le référencement naturel.'
              },
              {
                role: 'user',
                content: `Génère une description SEO optimisée pour la catégorie "${collection.name}" d'une boutique en ligne.
                
Nom de la catégorie: ${collection.name}
${collection.description ? `Description actuelle: ${collection.description}` : ''}
Nombre de produits: ${collection.product_count}

La description doit:
- Faire entre 150 et 300 caractères
- Être engageante et inciter au clic
- Inclure naturellement des mots-clés pertinents
- Être unique et originale
- Être en français
- Ne pas contenir de balises HTML

Réponds uniquement avec la description, sans introduction ni explication.`
              }
            ]
          })
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for ${collection.name}:`, aiResponse.status, errorText);
          
          if (aiResponse.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          if (aiResponse.status === 402) {
            throw new Error('Insufficient credits. Please add credits to your Lovable AI workspace.');
          }
          
          throw new Error(`AI API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const generatedDescription = aiData.choices?.[0]?.message?.content?.trim();

        if (!generatedDescription) {
          throw new Error('No description generated');
        }

        console.log(`Generated description for ${collection.name}: ${generatedDescription.substring(0, 100)}...`);

        // Update collection in database
        const { error: updateDbError } = await supabaseClient
          .from('collections')
          .update({ 
            description: generatedDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', collection.id);

        if (updateDbError) {
          console.error(`Error updating collection in database:`, updateDbError);
          throw new Error(`Database update error: ${updateDbError.message}`);
        }

        // Update on WooCommerce
        if (collection.woocommerce_id) {
          const wcUrl = `${shop.url}/wp-json/wc/v3/products/categories/${collection.woocommerce_id}`;
          
          const wcResponse = await fetch(wcUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: generatedDescription
            })
          });

          if (!wcResponse.ok) {
            const wcError = await wcResponse.text();
            console.error(`WooCommerce API error for ${collection.name}:`, wcResponse.status, wcError);
            throw new Error(`WooCommerce update error: ${wcResponse.status}`);
          }

          console.log(`Successfully updated collection ${collection.name} on WooCommerce`);
        }

        updated++;

      } catch (error) {
        console.error(`Error processing collection ${collection.name}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        failed,
        total: collections.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating collection descriptions:', error);
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
