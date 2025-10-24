import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, shopId, actions } = await req.json();

    if (!productId || !shopId || !actions) {
      return new Response(
        JSON.stringify({ success: false, error: 'productId, shopId, and actions are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ success: false, error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return new Response(
        JSON.stringify({ success: false, error: 'Shop not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let updatedDescription = product.description || '';
    const categories = product.categories?.map((c: any) => c.name).join(', ') || 'N/A';

    // Bold keywords
    if (actions.bold_keywords) {
      const systemPrompt = `Tu es un expert en SEO et optimisation de contenu e-commerce.
Ta tâche est d'identifier 3-5 mots-clés importants dans une description de produit et de les mettre en gras avec <strong></strong>.
RÈGLES STRICTES:
- Ne PAS mettre en gras des mots déjà entre <strong> ou <b>
- Choisir des mots-clés pertinents (nom produit, caractéristiques principales, bénéfices)
- Ne pas sur-optimiser (max 5 mots-clés)
- Préserver tout le HTML existant
- Retourner la description complète avec les balises <strong> ajoutées
Réponds UNIQUEMENT avec le HTML modifié, sans explication.`;

      const prompt = `Produit: ${product.name}
Catégories: ${categories}
Description actuelle:
${updatedDescription}

Mets en gras 3-5 mots-clés pertinents dans cette description.`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error (bold):', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            );
          }
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ success: false, error: 'Insufficient credits. Please add credits to continue.' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
            );
          }
        } else {
          const data = await response.json();
          updatedDescription = data.choices?.[0]?.message?.content?.trim() || updatedDescription;
        }
      } catch (error) {
        console.error('Error adding bold keywords:', error);
      }
    }

    // Add bullet points
    if (actions.add_bullets) {
      const systemPrompt = `Tu es un expert en SEO et optimisation de contenu e-commerce.
Ta tâche est de générer une liste à puces (4-6 points) résumant les caractéristiques clés d'un produit.
RÈGLES STRICTES:
- Générer une liste HTML <ul><li>...</li></ul>
- 4-6 points maximum, courts et percutants
- Basés sur la description existante et les catégories
- Ne pas répéter le contenu existant mot pour mot
- Chaque point: 1 phrase courte (10-15 mots max)
Réponds UNIQUEMENT avec le HTML de la liste <ul>, sans explication.`;

      const prompt = `Produit: ${product.name}
Catégories: ${categories}
Description: ${product.description || product.short_description || 'Aucune description'}

Génère une liste à puces de 4-6 caractéristiques clés.`;

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error (bullets):', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            );
          }
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ success: false, error: 'Insufficient credits. Please add credits to continue.' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
            );
          }
        } else {
          const data = await response.json();
          const bulletList = data.choices?.[0]?.message?.content?.trim() || '';
          if (bulletList) {
            updatedDescription = updatedDescription 
              ? `${updatedDescription}\n\n${bulletList}`
              : bulletList;
          }
        }
      } catch (error) {
        console.error('Error adding bullet points:', error);
      }
    }

    // Update product in database
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        description: updatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let remoteUpdated = true;

    // Sync to WooCommerce if applicable
    if (shop.type?.toLowerCase() === 'woocommerce' && product.woocommerce_id) {
      console.log('Syncing to WooCommerce...', { shopId, productId, woocommerce_id: product.woocommerce_id });
      
      try {
        const { data: wooResult, error: wooError } = await supabase.functions.invoke('update-woocommerce-product', {
          body: {
            shopId: shopId,
            productId: productId,
          }
        });

        if (wooError) {
          console.error('Error updating WooCommerce:', wooError);
          remoteUpdated = false;
        } else if (!wooResult?.success) {
          console.error('WooCommerce update failed:', wooResult);
          remoteUpdated = false;
        } else {
          console.log('✓ WooCommerce product synced successfully');
        }
      } catch (err) {
        console.error('Exception calling update-woocommerce-product:', err);
        remoteUpdated = false;
      }
    } else {
      console.log('Shop type or WooCommerce ID missing, skipping remote update', { 
        type: shop.type, 
        woocommerce_id: product.woocommerce_id 
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        description: updatedDescription,
        remoteUpdated,
        message: remoteUpdated 
          ? 'Product formatted successfully'
          : 'Product updated in database but failed to sync to remote site'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in format-product-content:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
