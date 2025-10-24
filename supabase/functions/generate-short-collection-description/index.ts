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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    console.log(`Generating short description for collection: ${collection.name}`);

    // Generate short SEO-optimized description using Lovable AI
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
            content: 'Tu es un expert en SEO et rédaction web pour e-commerce. Tu génères des descriptions courtes optimisées pour le référencement naturel.'
          },
          {
            role: 'user',
            content: `Génère une description courte SEO optimisée pour la catégorie "${collection.name}" d'une boutique en ligne.

Nom de la catégorie: ${collection.name}
Nombre de produits: ${collection.product_count}

La description doit:
- Faire entre 100 et 160 caractères (pas plus !)
- Être engageante et inciter au clic
- Inclure naturellement le nom de la catégorie
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
      console.error(`AI API error:`, aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient credits. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedDescription = aiData.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      throw new Error('No description generated');
    }

    // Ensure it's not too long
    if (generatedDescription.length > 160) {
      generatedDescription = generatedDescription.substring(0, 157) + '...';
    }

    // Update in database
    const { error: updateError } = await supabaseClient
      .from('collections')
      .update({
        description: generatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', collectionId);

    if (updateError) {
      console.error('Error updating collection:', updateError);
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(`Generated short description for ${collection.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        description: generatedDescription,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating short description:', error);
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
