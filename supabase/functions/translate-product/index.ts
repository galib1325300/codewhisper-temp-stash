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
    const { productId, targetLanguage, applyTranslation } = await req.json();

    if (!productId || !targetLanguage) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID and target language are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY is not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization') || undefined;
    const supabaseForUpdate = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, short_description, description, meta_title, meta_description')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const languageNames: Record<string, string> = {
      'en': 'anglais',
      'es': 'espagnol',
      'de': 'allemand',
      'it': 'italien',
      'pt': 'portugais',
      'nl': 'néerlandais',
      'pl': 'polonais',
      'ru': 'russe',
      'ja': 'japonais',
      'zh': 'chinois',
      'ar': 'arabe'
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const prompt = `Tu es un traducteur professionnel spécialisé dans le e-commerce. Tu dois traduire le contenu suivant d'un produit en ${targetLangName}.

CONTENU À TRADUIRE:

NOM DU PRODUIT:
${product.name}

DESCRIPTION COURTE:
${product.short_description || 'N/A'}

DESCRIPTION LONGUE:
${product.description || 'N/A'}

MÉTA-TITRE:
${product.meta_title || 'N/A'}

MÉTA-DESCRIPTION:
${product.meta_description || 'N/A'}

RÈGLES STRICTES:
1. Traduire en ${targetLangName} de manière naturelle et fluide
2. Préserver tous les balises HTML (h2, h3, p, ul, li, a, etc.)
3. Adapter les expressions idiomatiques au contexte culturel
4. Maintenir le ton professionnel et commercial
5. Pour la méta-description, respecter la limite de 160 caractères
6. Ne pas traduire les URL ou slugs dans les liens

FORMAT DE RÉPONSE (JSON STRICT):
{
  "name": "nom traduit",
  "short_description": "description courte traduite",
  "description": "description longue traduite avec HTML",
  "meta_title": "méta-titre traduit",
  "meta_description": "méta-description traduite (max 160 chars)"
}

Réponds UNIQUEMENT avec le JSON, sans aucun texte additionnel, sans markdown, sans commentaire.`;

    console.log(`Translating product to ${targetLangName}...`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un traducteur expert qui retourne du JSON valide.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de taux dépassée. Veuillez réessayer plus tard.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crédits insuffisants. Veuillez recharger votre compte Lovable AI.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Erreur lors de la traduction IA' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    let translatedContent = aiData.choices?.[0]?.message?.content?.trim();

    if (!translatedContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucune traduction générée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Clean markdown formatting if present
    translatedContent = translatedContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    let translation;
    try {
      translation = JSON.parse(translatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', translatedContent);
      return new Response(
        JSON.stringify({ success: false, error: 'Format de réponse invalide de l\'IA' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If user wants to apply the translation
    if (applyTranslation) {
      const { error: updateError } = await supabaseForUpdate
        .from('products')
        .update({
          name: translation.name,
          short_description: translation.short_description,
          description: translation.description,
          meta_title: translation.meta_title,
          meta_description: translation.meta_description
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Error updating product:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update product with translation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('Translation applied successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        translation,
        applied: applyTranslation || false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-product function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
