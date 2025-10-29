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
    const { shopId } = await req.json();
    
    if (!shopId) {
      return new Response(JSON.stringify({ error: 'shopId requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('name, shop_url, shop_type')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      console.error('Erreur récupération boutique:', shopError);
      return new Response(JSON.stringify({ error: 'Boutique non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer les collections pour identifier la niche
    const { data: collections } = await supabase
      .from('collections')
      .select('name, description')
      .eq('shop_id', shopId)
      .limit(5);

    // Récupérer quelques produits représentatifs
    const { data: products } = await supabase
      .from('products')
      .select('name, description')
      .eq('shop_id', shopId)
      .order('featured', { ascending: false })
      .limit(10);

    const categories = (collections || []).map(c => c.name).join(', ') || 'Non défini';
    const productExamples = (products || []).slice(0, 5).map(p => p.name).join(', ') || 'Non défini';

    console.log(`Génération de personas pour ${shop.name} (${shop.shop_url})`);

    // Appel à Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    const systemPrompt = `Tu es un expert en création de personas E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) pour le SEO.

Génère des profils d'auteurs CRÉDIBLES et RÉALISTES qui renforcent l'autorité d'un site e-commerce.

RÈGLES STRICTES :
1. Noms français réalistes (prénom + nom)
2. Titres professionnels spécifiques à la niche
3. Bios inspirant confiance (100-150 mots)
4. 3-5 domaines d'expertise pertinents
5. Certifications crédibles (pas d'inventions fantaisistes)
6. Chaque auteur doit avoir un angle/spécialité différent
7. Pas de noms de célébrités ou personnalités connues`;

    const userPrompt = `CONTEXTE DE LA BOUTIQUE :
- Nom : ${shop.name}
- URL : ${shop.shop_url}
- Type : ${shop.shop_type || 'E-commerce'}
- Principales catégories : ${categories}
- Exemples de produits : ${productExamples}

TÂCHE :
Génère 2-3 profils d'auteurs experts pour cette boutique.

Format attendu :
- name: Prénom Nom (français, réaliste)
- title: Titre professionnel spécifique
- bio: Bio professionnelle convaincante (100-150 mots)
- expertise_areas: Array de 3-5 domaines
- credentials: Certifications/diplômes crédibles`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_personas",
              description: "Génère des profils d'auteurs E-E-A-T",
              parameters: {
                type: "object",
                properties: {
                  personas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Nom complet de l'auteur (prénom + nom)"
                        },
                        title: {
                          type: "string",
                          description: "Titre professionnel spécifique à la niche"
                        },
                        bio: {
                          type: "string",
                          description: "Bio professionnelle (100-150 mots)"
                        },
                        expertise_areas: {
                          type: "array",
                          items: { type: "string" },
                          description: "3-5 domaines d'expertise"
                        },
                        credentials: {
                          type: "string",
                          description: "Certifications et diplômes crédibles"
                        }
                      },
                      required: ["name", "title", "bio", "expertise_areas", "credentials"]
                    },
                    minItems: 2,
                    maxItems: 3
                  }
                },
                required: ["personas"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_personas" } }
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
      throw new Error('Erreur lors de l\'appel à l\'IA');
    }

    const aiData = await aiResponse.json();
    console.log('Réponse IA reçue');

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Pas de personas générés par l\'IA');
    }

    const result = JSON.parse(toolCall.function.arguments);
    const personas = result.personas;

    if (!personas || personas.length === 0) {
      throw new Error('Aucun persona généré');
    }

    console.log(`✅ ${personas.length} personas générés`);

    // Insérer les personas dans la base de données
    const personasToInsert = personas.map((p: any) => ({
      shop_id: shopId,
      name: p.name,
      title: p.title,
      bio: p.bio,
      expertise_areas: p.expertise_areas,
      credentials: p.credentials,
      avatar_url: null,
      social_links: {}
    }));

    const { data: insertedPersonas, error: insertError } = await supabase
      .from('blog_authors')
      .insert(personasToInsert)
      .select();

    if (insertError) {
      console.error('Erreur insertion:', insertError);
      throw new Error('Erreur lors de la sauvegarde des personas');
    }

    console.log(`✅ ${insertedPersonas.length} personas insérés en base`);

    return new Response(
      JSON.stringify({ 
        success: true,
        personas: insertedPersonas,
        count: insertedPersonas.length
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erreur generate-eeat-personas:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
