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
    const { productId, type, userId } = await req.json();
    console.log('Generating description for product:', productId, 'Type:', type);

    if (!productId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing productId or type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
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

STRUCTURE OBLIGATOIRE (en HTML) :

1. UN PARAGRAPHE D'INTRODUCTION (2-3 phrases engageantes qui présentent le produit)

2. EXACTEMENT 4 SECTIONS AVEC TITRES H2 (PAS de H3 ici, UNIQUEMENT des H2) :
   <h2>Premier titre descriptif et engageant</h2>
   <p>Paragraphe détaillé de 3-4 phrases. Mettre 2-3 mots-clés sémantiques différents en <strong>mot-clé</strong> (pas toujours le même mot)</p>
   
   <h2>Deuxième titre descriptif et engageant</h2>
   <p>Paragraphe détaillé de 3-4 phrases. Mettre 2-3 mots-clés sémantiques différents en <strong>mot-clé</strong> (varier les mots)</p>
   
   <h2>Troisième titre descriptif et engageant</h2>
   <p>Paragraphe détaillé de 3-4 phrases. Mettre 2-3 mots-clés sémantiques différents en <strong>mot-clé</strong> (diversifier)</p>
   
   <h2>Quatrième titre descriptif et engageant</h2>
   <p>Paragraphe détaillé de 3-4 phrases. Mettre 2-3 mots-clés sémantiques différents en <strong>mot-clé</strong> (éviter répétitions)</p>

3. UNE SEULE SECTION H3 "Détails du produit" ou "Caractéristiques" avec liste à puces :
   <h3>Détails du produit</h3>
   <ul>
      <li>Caractéristique technique 1 (dimensions, poids, matériaux, etc.)</li>
      <li>Caractéristique technique 2</li>
      <li>Caractéristique technique 3</li>
      <li>Autres caractéristiques importantes</li>
   </ul>

RÈGLES CRITIQUES :
- OBLIGATOIRE : Exactement 4 titres H2 et 1 seul titre H3 à la fin
- NE PAS utiliser de H3 avant le H3 final "Détails du produit"
- Dans chaque paragraphe : mettre en gras 2-3 mots-clés sémantiques DIFFÉRENTS et VARIÉS
- INTERDICTION de mettre toujours le même mot en gras (exemple : ne pas répéter "${productName}" en gras à chaque fois)
- Diversifier les mots-clés en gras : synonymes, termes techniques, bénéfices, caractéristiques
- Maximum 3 mots en gras par paragraphe pour éviter le sur-optimisation

AUTRES CONSIGNES :
- Total : 400-600 mots
- Inclure naturellement le nom du produit dans les titres H2
- Optimiser pour le SEO avec des mots-clés pertinents et variés
- Conserver et intégrer TOUTES les caractéristiques techniques existantes (${currentDescription ? 'telles que les dimensions, matériaux, etc.' : ''})
- Être persuasif et professionnel
- Langue : ${language}
- Utiliser UNIQUEMENT du HTML valide (<h2>, <h3>, <p>, <ul>, <li>, <strong>)

${currentDescription ? `\nDescription/caractéristiques actuelles à préserver et intégrer : ${currentDescription.substring(0, 500)}` : ''}

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

    // Get old value before update
    const oldValue = product[updateField] || null;

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

    // Manually insert into product_modifications
    const { error: modError } = await supabase
      .from('product_modifications')
      .insert({
        product_id: productId,
        field_name: updateField,
        old_value: oldValue,
        new_value: generatedText,
        modified_by: userId
      });

    if (modError) {
      console.error('Error recording modification:', modError);
      // Don't fail the whole operation if modification tracking fails
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