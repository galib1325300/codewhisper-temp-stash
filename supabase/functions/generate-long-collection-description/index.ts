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

    console.log(`Generating long description for collection: ${collection.name}`);

    // Generate long SEO-optimized description using Lovable AI
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
            content: 'Tu es un expert en SEO et rédaction web pour e-commerce. Tu génères des descriptions longues et détaillées optimisées pour le référencement naturel.'
          },
          {
            role: 'user',
            content: `Génère une description longue et détaillée SEO optimisée pour la catégorie "${collection.name}" d'une boutique en ligne.

Nom de la catégorie: ${collection.name}
${collection.description ? `Description actuelle: ${collection.description}` : ''}
Nombre de produits: ${collection.product_count}

La description doit:
- Faire entre 300 et 600 mots
- Être structurée avec des paragraphes clairs
- Inclure naturellement des mots-clés pertinents liés à "${collection.name}"
- Expliquer ce que les clients trouveront dans cette catégorie
- Mettre en avant les avantages et caractéristiques des produits
- Être engageante et inciter à l'achat
- Être unique et originale
- Être en français
- Utiliser des balises HTML simples pour la structure (p, strong, em)
- Être au format HTML valide

Réponds uniquement avec le contenu HTML de la description, sans introduction ni explication.`
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
    const generatedDescription = aiData.choices?.[0]?.message?.content?.trim();

    if (!generatedDescription) {
      throw new Error('No description generated');
    }

    console.log(`Generated long description for ${collection.name}`);

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
    console.error('Error generating long description:', error);
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
