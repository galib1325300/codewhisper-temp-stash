import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, category, seoAnalysis } = await req.json();
    console.log(`Optimizing blog post ${postId} for category: ${category}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the blog post
    const { data: post, error: postError } = await supabaseClient
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      throw new Error('Article introuvable');
    }

    console.log(`Post fetched: ${post.title}`);

    // Prepare AI prompt based on category
    let prompt = '';
    let toolDefinition: any = null;

    if (category === 'metadata') {
      const issues = seoAnalysis?.categories?.metadata?.issues || [];
      prompt = `Tu es un expert SEO. Analyse cet article et génère des métadonnées optimisées.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Meta titre actuel : ${post.meta_title || 'Aucun'}
- Meta description actuelle : ${post.meta_description || 'Aucune'}
- Mot-clé focus : ${post.focus_keyword || 'Aucun'}
- Contenu (extrait) : ${post.content?.substring(0, 500) || ''}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Génère un meta_title (50-60 caractères) et une meta_description (150-160 caractères) qui :
- Incluent le mot-clé focus "${post.focus_keyword}" en début si possible
- Sont accrocheurs et incitent au clic
- Respectent les longueurs optimales
- Sont cohérents avec le contenu de l'article

Fournis également une explication détaillée de tes choix.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_metadata",
          description: "Optimise les métadonnées SEO d'un article",
          parameters: {
            type: "object",
            properties: {
              meta_title: { 
                type: "string", 
                description: "Le nouveau meta titre optimisé (50-60 caractères)"
              },
              meta_description: { 
                type: "string", 
                description: "La nouvelle meta description optimisée (150-160 caractères)"
              },
              reasoning: { 
                type: "string",
                description: "Explication détaillée des choix d'optimisation"
              }
            },
            required: ["meta_title", "meta_description", "reasoning"]
          }
        }
      };
    } else if (category === 'keywords') {
      const issues = seoAnalysis?.categories?.keywords?.issues || [];
      const currentContent = post.content || '';
      
      prompt = `Tu es un expert SEO. Optimise le contenu de cet article pour améliorer la densité et le placement des mots-clés.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Mot-clé focus : ${post.focus_keyword || 'Aucun'}
- Contenu actuel : ${currentContent}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Modifie le contenu HTML pour :
- Placer le mot-clé "${post.focus_keyword}" dans le premier paragraphe s'il n'y est pas
- Ajouter le mot-clé dans 2-3 balises <strong> de manière naturelle
- Inclure le mot-clé dans au moins un H2 ou H3
- Viser une densité de 1-2% (naturelle, pas de bourrage)
- Garder le reste du contenu identique

Retourne le contenu HTML complet modifié et explique tes changements.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_keywords",
          description: "Optimise les mots-clés dans le contenu de l'article",
          parameters: {
            type: "object",
            properties: {
              content: { 
                type: "string", 
                description: "Le contenu HTML complet modifié avec les mots-clés optimisés"
              },
              changes: {
                type: "array",
                items: { type: "string" },
                description: "Liste des modifications apportées"
              },
              reasoning: { 
                type: "string",
                description: "Explication des changements effectués"
              }
            },
            required: ["content", "changes", "reasoning"]
          }
        }
      };
    } else {
      throw new Error(`Catégorie d'optimisation non supportée: ${category}`);
    }

    // Call Lovable AI
    console.log('Calling Lovable AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        tools: [toolDefinition],
        tool_choice: { type: "function", function: { name: toolDefinition.function.name } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Veuillez réessayer plus tard.');
      }
      if (response.status === 402) {
        throw new Error('Crédits insuffisants. Veuillez recharger votre compte Lovable AI.');
      }
      throw new Error('Erreur lors de l\'appel à l\'IA');
    }

    const aiResponse = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function) {
      console.error('No tool call in response:', JSON.stringify(aiResponse));
      throw new Error('L\'IA n\'a pas retourné de résultat valide');
    }

    const optimizations = JSON.parse(toolCall.function.arguments);
    console.log('Optimizations parsed:', optimizations);

    // Return optimizations with original values for comparison
    const result = {
      category,
      optimizations,
      original: category === 'metadata' 
        ? {
            meta_title: post.meta_title,
            meta_description: post.meta_description
          }
        : {
            content: post.content
          }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in optimize-blog-seo:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors de l\'optimisation'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
