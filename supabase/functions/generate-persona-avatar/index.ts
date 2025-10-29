import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personaId } = await req.json();
    
    if (!personaId) {
      return new Response(JSON.stringify({ error: 'personaId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les informations du persona
    const { data: persona, error: personaError } = await supabase
      .from('blog_authors')
      .select('*')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      console.error('Erreur récupération persona:', personaError);
      return new Response(JSON.stringify({ error: 'Persona non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Génération d'avatar pour ${persona.name}`);

    // Déterminer le genre basé sur le prénom (heuristique simple)
    const firstName = persona.name.split(' ')[0].toLowerCase();
    const femaleNames = ['marie', 'sophie', 'claire', 'julie', 'emma', 'camille', 'lucie', 'laura', 'sarah', 'léa'];
    const isFemale = femaleNames.some(name => firstName.includes(name));
    const gender = isFemale ? 'female' : 'male';

    // Appel à Lovable AI pour générer l'image
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    const imagePrompt = `Professional headshot photo of a ${persona.title}, 35-45 years old, French ${gender}, neutral grey background, high quality, realistic, professional business attire, friendly confident expression, studio lighting, professional photography, sharp focus, portrait orientation`;

    console.log('Génération de l\'image avec Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: imagePrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard" }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants, ajoutez des crédits à votre workspace" }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('Erreur Lovable AI:', aiResponse.status, errorText);
      throw new Error('Erreur lors de la génération de l\'image');
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error('Aucune image générée par l\'IA');
    }

    console.log('✅ Image générée, upload vers Supabase Storage...');

    // Convertir base64 en blob
    const base64Data = imageData.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload vers Supabase Storage
    const fileName = `${personaId}/avatar-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      throw new Error('Erreur lors de l\'upload de l\'image');
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Mettre à jour le persona avec l'URL de l'avatar
    const { error: updateError } = await supabase
      .from('blog_authors')
      .update({ avatar_url: avatarUrl })
      .eq('id', personaId);

    if (updateError) {
      console.error('Erreur mise à jour:', updateError);
      throw new Error('Erreur lors de la mise à jour du persona');
    }

    console.log(`✅ Avatar généré et sauvegardé pour ${persona.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        avatar_url: avatarUrl
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur generate-persona-avatar:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
