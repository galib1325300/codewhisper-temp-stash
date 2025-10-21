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
    const { productId, userId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
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

    if (!authHeader) {
      console.warn('No Authorization header provided; triggers using auth.uid() may fail.');
    }

    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('name, short_description, description, categories')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build prompt for AI
    const categories = Array.isArray(product.categories) 
      ? product.categories.map((cat: any) => cat.name).join(', ')
      : 'Aucune';

    const prompt = `Tu es un expert en référencement SEO et rédaction web. Tu dois générer une méta-description optimale pour un produit e-commerce.

CONTEXTE DU PRODUIT:
- Nom: ${product.name}
- Catégories: ${categories}
- Description courte: ${product.short_description || 'Non disponible'}
- Début de la description: ${product.description ? product.description.substring(0, 300) : 'Non disponible'}

RÈGLES STRICTES:
1. La méta-description doit faire entre 150 et 160 caractères MAXIMUM
2. Inclure le nom du produit au début
3. Utiliser des mots-clés pertinents basés sur les catégories et la description
4. Créer un appel à l'action subtil (ex: "Découvrez", "Profitez", "Commandez")
5. Rester factuel et informatif
6. Ne pas utiliser de guillemets ni de caractères spéciaux problématiques

EXEMPLE DE STRUCTURE:
[Nom du produit] : [Bénéfice principal]. [Caractéristique unique]. [Appel à l'action].

Génère UNIQUEMENT la méta-description, sans aucun texte additionnel, commentaire ou explication.`;

    console.log('Calling Lovable AI for meta-description generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un expert SEO qui génère des méta-descriptions optimales.' },
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
        JSON.stringify({ success: false, error: 'Erreur lors de la génération IA' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const metaDescription = aiData.choices?.[0]?.message?.content?.trim();

    if (!metaDescription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aucune méta-description générée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Ensure meta-description is within limits (truncate if needed)
    const finalMetaDescription = metaDescription.length > 160 
      ? metaDescription.substring(0, 157) + '...' 
      : metaDescription;

    // Update product with meta-description
    const { error: updateError } = await supabaseForUpdate
      .from('products')
      .update({ meta_description: finalMetaDescription })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Meta-description generated successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        metaDescription: finalMetaDescription 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-meta-description function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
