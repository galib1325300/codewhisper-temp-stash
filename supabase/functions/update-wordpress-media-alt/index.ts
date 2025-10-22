import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function createWordPressAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  return `Basic ${btoa(credentials)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { shopId, mediaId, altText } = await req.json();

    if (!shopId || !mediaId || altText === undefined) {
      throw new Error('shopId, mediaId, and altText are required');
    }

    console.log('Updating WordPress media ALT:', { shopId, mediaId, altText });

    // Get shop credentials
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('url, wp_username, wp_password')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found');
    }

    if (!shop.wp_username || !shop.wp_password) {
      throw new Error('WordPress Application Password not configured. Please configure it in shop settings.');
    }

    const auth = createWordPressAuth(shop.wp_username, shop.wp_password);
    const wpApiUrl = `${shop.url}/wp-json/wp/v2/media/${mediaId}`;

    console.log('Updating WordPress media at:', wpApiUrl);

    // Update media ALT via WordPress API
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alt_text: altText
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WordPress API error (${response.status}):`, errorText);
      throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
    }

    const updatedMedia = await response.json();
    console.log('Media ALT updated successfully:', updatedMedia.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Media ALT updated successfully',
        mediaId: updatedMedia.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error updating media ALT:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while updating media ALT' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
