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
    const { productId, type } = await req.json();
    console.log('Generating description for product:', productId, 'Type:', type);

    if (!productId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, shop_id, shops(language)')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const language = product.shops?.language || 'fr';
    const productName = product.name;
    const currentDescription = product.description || '';
    
    let prompt = '';
    let updateField = '';

    if (type === 'short') {
      prompt = `Tu es un expert en rédaction SEO pour le e-commerce. 
Génère une description courte et percutante pour ce produit : "${productName}".

La description doit :
- Faire entre 120-160 caractères (optimisé pour les meta descriptions)
- Inclure le nom du produit naturellement
- Avoir un appel à l'action subtil
- Être optimisée pour le SEO
- Être en langue ${language}
- Être attractive et donner envie d'acheter

Retourne UNIQUEMENT le texte de la description, sans guillemets ni formatage supplémentaire.`;
      updateField = 'short_description';
    } else {
      prompt = `Tu es un expert en rédaction SEO pour le e-commerce.
Génère une description longue et détaillée pour ce produit : "${productName}".

La description doit :
- Faire entre 300-500 mots
- Commencer par un titre H2 accrocheur
- Inclure des sous-titres H3 pour structurer le contenu
- Utiliser des listes à puces pour les caractéristiques
- Inclure naturellement le nom du produit 2-3 fois
- Être optimisée pour le SEO (mots-clés naturels, longue traîne)
- Avoir un ton convaincant et professionnel
- Être en langue ${language}
- Utiliser du HTML valide (<h2>, <h3>, <p>, <ul>, <li>, <strong>)

${currentDescription ? `Description actuelle à améliorer : ${currentDescription}` : ''}

Retourne UNIQUEMENT le HTML de la description, sans balises <html>, <body> ou code markdown.`;
      updateField = 'description';
    }

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert en rédaction SEO pour le e-commerce.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, veuillez réessayer plus tard' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants, veuillez ajouter des crédits à votre workspace Lovable AI' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content.trim();
    console.log('Generated text:', generatedText.substring(0, 100) + '...');

    // Update product with generated description
    const { error: updateError } = await supabase
      .from('products')
      .update({ [updateField]: generatedText })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Description generated successfully');
    return new Response(
      JSON.stringify({ success: true, description: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-product-description:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});