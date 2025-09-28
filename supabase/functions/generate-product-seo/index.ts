import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { productId } = await req.json();

    // Get product data
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select(`
        *,
        shops (
          openai_api_key
        )
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Produit non trouvé');
    }

    // Get OpenAI API key from shop or profile
    let openaiApiKey = product.shops.openai_api_key;
    
    if (!openaiApiKey) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('openai_api_key')
        .eq('user_id', req.headers.get('authorization')?.split(' ')[1])
        .single();
      
      openaiApiKey = profile?.openai_api_key;
    }

    if (!openaiApiKey) {
      throw new Error('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    });
    const openai = new OpenAIApi(configuration);

    // Generate SEO description
    const prompt = `
Créez une description SEO optimisée pour ce produit e-commerce :

Nom du produit : ${product.name}
Description actuelle : ${product.description || 'Aucune description'}
Prix : ${product.price}€
Catégories : ${JSON.stringify(product.categories)}

Consignes :
- Description entre 150-160 caractères pour les meta descriptions
- Incluez des mots-clés pertinents naturellement
- Mettez en avant les bénéfices et caractéristiques uniques
- Ton engageant et commercial
- Optimisé pour le SEO et les conversions

Retournez uniquement la description optimisée.
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Vous êtes un expert en SEO et copywriting e-commerce. Vous créez des descriptions de produits optimisées pour les moteurs de recherche et les conversions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const generatedDescription = completion.data.choices[0]?.message?.content?.trim();

    if (!generatedDescription) {
      throw new Error('Erreur lors de la génération du contenu');
    }

    // Update product with new description
    await supabaseClient
      .from('products')
      .update({ 
        short_description: generatedDescription,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        description: generatedDescription 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating product SEO:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Erreur lors de la génération' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});