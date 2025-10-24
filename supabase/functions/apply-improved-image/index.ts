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
    const { productId, imageIndex, improvedImageUrl } = await req.json();

    console.log('Applying improved image for product:', productId, 'image index:', imageIndex);

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

    // Update the product with the improved image
    const updatedImages = [...product.images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      src: improvedImageUrl,
      improved_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseClient
      .from('products')
      .update({ images: updatedImages })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      throw updateError;
    }

    console.log('Image applied successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Image améliorée appliquée avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-improved-image function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de l\'application de l\'image' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
