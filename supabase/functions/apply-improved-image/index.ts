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

    // Convert base64 to blob and upload to Supabase Storage
    console.log('Uploading improved image to storage...');
    
    // Extract base64 data
    const base64Data = improvedImageUrl.split(',')[1];
    const mimeType = improvedImageUrl.split(';')[0].split(':')[1];
    const fileExt = mimeType.split('/')[1];
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Upload to Supabase Storage
    const fileName = `${productId}_${imageIndex}_${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('product-images')
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('product-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully, public URL:', publicUrl);

    // Update the product with the improved image URL
    const updatedImages = [...product.images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      src: publicUrl,
      improved_at: new Date().toISOString(),
      original_src: product.images[imageIndex].src
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
