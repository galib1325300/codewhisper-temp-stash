import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { productId, imageIndex = 0, customPrompt } = await req.json();

    console.log('Improving image for product:', productId, 'image index:', imageIndex);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get product data
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ success: false, error: 'Produit non trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!product.images || !product.images[imageIndex]) {
      console.error('Image not found at index:', imageIndex);
      return new Response(
        JSON.stringify({ success: false, error: 'Image non trouvée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const imageUrl = product.images[imageIndex].src;
    console.log('Original image URL:', imageUrl);

    // Determine prompt based on whether custom prompt is provided
    const editPrompt = customPrompt || 
      `Improve this product image for e-commerce: create a professional, clean background that complements the product "${product.name}". Make the background elegant and suitable for online shopping while keeping the product as the main focus.`;

    console.log('Using prompt:', editPrompt);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI to edit the image
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: editPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de taux dépassée. Veuillez réessayer plus tard.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crédits insuffisants. Veuillez ajouter des crédits à votre espace de travail Lovable AI.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const improvedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!improvedImageUrl) {
      console.error('No image in response:', data);
      throw new Error('Aucune image générée dans la réponse');
    }

    console.log('Image improved successfully');

    console.log('Image improved successfully, returning for preview');

    // Return the improved image for preview (don't save yet)
    return new Response(
      JSON.stringify({ 
        success: true, 
        improvedImageUrl: improvedImageUrl,
        originalImageUrl: imageUrl,
        imageIndex: imageIndex,
        message: 'Image améliorée - En attente d\'approbation'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in improve-product-image function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de l\'amélioration de l\'image' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
