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

    // Fetch other posts for internal linking context
    const { data: otherPosts } = await supabaseClient
      .from('blog_posts')
      .select('id, title, slug, focus_keyword')
      .eq('shop_id', post.shop_id)
      .neq('id', postId)
      .eq('status', 'publish')
      .limit(10);

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
- **CRITIQUE** : Le mot-clé focus "${post.focus_keyword}" DOIT apparaître dans les 10 premiers caractères du meta_title
- **CRITIQUE** : Le mot-clé focus "${post.focus_keyword}" DOIT apparaître dans les 20 premiers caractères de la meta_description
- Si le mot-clé est trop long (>40 caractères), utiliser une version raccourcie mais reconnaissable
- Sont accrocheurs et incitent au clic
- Respectent strictement les longueurs optimales (60 max pour titre, 160 max pour description)
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
      const wordCount = currentContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
      
      // Calculer densité actuelle et cible
      const keyword = (post.focus_keyword || '').toLowerCase();
      const textContent = currentContent.replace(/<[^>]*>/g, '').toLowerCase();
      const currentOccurrences = (textContent.match(new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')) || []).length;
      const currentDensity = wordCount > 0 ? (currentOccurrences / wordCount) * 100 : 0;
      const targetDensity = 1.5; // 1.5%
      const targetOccurrences = Math.ceil(wordCount * (targetDensity / 100));
      const missingOccurrences = Math.max(0, targetOccurrences - currentOccurrences);
      
      // Extraire seulement les 3000 premiers caractères pour contexte
      const contentPreview = currentContent.substring(0, 3000);
      
      prompt = `Tu es un expert SEO. Analyse ce DÉBUT d'article et suggère où insérer le mot-clé focus.

ARTICLE (EXTRAIT - premiers 3000 caractères) :
- Titre : ${post.title}
- Mot-clé focus : "${post.focus_keyword}"
- Nombre total de mots : ${wordCount}
- Occurrences actuelles du mot-clé : ${currentOccurrences}
- Densité actuelle : ${currentDensity.toFixed(2)}%
- Densité cible : ${targetDensity}%
- **Il manque ${missingOccurrences} occurrences du mot-clé**

EXTRAIT DU CONTENU :
${contentPreview}
${currentContent.length > 3000 ? '...(contenu tronqué)' : ''}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Suggère exactement ${Math.min(missingOccurrences, 10)} emplacements où insérer naturellement le mot-clé "${post.focus_keyword}" :
1. Dans le premier paragraphe (si pas déjà présent)
2. Dans 2-3 balises <strong>
3. Dans au moins un H2 ou H3
4. Réparti dans tout l'article (début, milieu, fin)

**IMPORTANT** :
- Ne retourne PAS le contenu complet de l'article
- Retourne SEULEMENT une liste d'instructions d'insertion
- Format : Fournir le texte exact à remplacer et le nouveau texte avec le mot-clé`;

      toolDefinition = {
        type: "function",
        function: {
          name: "suggest_keyword_insertions",
          description: "Suggère des emplacements pour insérer le mot-clé",
          parameters: {
            type: "object",
            properties: {
              insertions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    target_text: { 
                      type: "string",
                      description: "Extrait exact du texte à cibler (15-50 caractères)"
                    },
                    replacement_text: {
                      type: "string",
                      description: "Nouveau texte incluant le mot-clé"
                    },
                    location: {
                      type: "string",
                      enum: ["début", "milieu", "fin"],
                      description: "Position dans l'article"
                    },
                    tag_type: {
                      type: "string",
                      enum: ["p", "li", "h2", "h3", "strong"],
                      description: "Type de balise où insérer"
                    }
                  },
                  required: ["target_text", "replacement_text", "location", "tag_type"]
                },
                description: "Liste des insertions à effectuer"
              },
              reasoning: {
                type: "string",
                description: "Explication de la stratégie"
              }
            },
            required: ["insertions", "reasoning"]
          }
        }
      };
    } else if (category === 'content') {
      const issues = seoAnalysis?.categories?.content?.issues || [];
      
      prompt = `Tu es un expert SEO. Optimise la structure et la qualité du contenu de cet article.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Nombre de mots : ${post.content?.split(/\s+/).length || 0}
- Contenu : ${post.content || ''}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Améliore le contenu en :
- Ajoutant des H2/H3 manquants pour une meilleure hiérarchie
- Découpant les paragraphes trop longs (max 150 mots par paragraphe)
- Ajoutant des listes à puces ou numérotées où c'est pertinent
- Gardant le sens et les informations existantes
- Visant 1500-2000 mots au total

Retourne le contenu HTML complet optimisé.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_content",
          description: "Optimise la structure et la qualité du contenu",
          parameters: {
            type: "object",
            properties: {
              content: { 
                type: "string", 
                description: "Le contenu HTML complet restructuré"
              },
              changes: {
                type: "array",
                items: { type: "string" },
                description: "Liste des améliorations structurelles"
              },
              reasoning: { 
                type: "string",
                description: "Explication des améliorations"
              }
            },
            required: ["content", "changes", "reasoning"]
          }
        }
      };
    } else if (category === 'links') {
      const issues = seoAnalysis?.categories?.links?.issues || [];
      const otherPostsList = otherPosts?.map(p => `- ${p.title} (/${p.slug})`).join('\n') || 'Aucun autre article';
      
      prompt = `Tu es un expert SEO. Enrichis cet article avec des liens internes et externes pertinents.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Mot-clé : ${post.focus_keyword}
- URL de la boutique : ${post.shop_url || 'Non spécifiée'}
- Contenu : ${post.content || ''}

AUTRES ARTICLES DISPONIBLES :
${otherPostsList}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Ajoute des liens dans le contenu :
- 3-5 liens internes vers d'autres articles pertinents (utilise les articles disponibles)
- 2-3 liens externes vers des sources fiables et pertinentes
- Utilise des ancres naturelles et descriptives
- Insère les liens de manière contextuelle dans le texte existant

Retourne le contenu HTML avec les liens ajoutés.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_links",
          description: "Ajoute des liens internes et externes",
          parameters: {
            type: "object",
            properties: {
              content: { 
                type: "string", 
                description: "Le contenu HTML avec les liens ajoutés"
              },
              internal_links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    anchor: { type: "string" },
                    url: { type: "string" }
                  }
                },
                description: "Liste des liens internes ajoutés"
              },
              external_links: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    anchor: { type: "string" },
                    url: { type: "string" }
                  }
                },
                description: "Liste des liens externes ajoutés"
              },
              reasoning: { 
                type: "string",
                description: "Explication des liens ajoutés"
              }
            },
            required: ["content", "internal_links", "external_links", "reasoning"]
          }
        }
      };
    } else if (category === 'faq') {
      const issues = seoAnalysis?.categories?.advanced?.issues || [];
      
      prompt = `Tu es un expert SEO. Crée une section FAQ pour cet article.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Mot-clé : ${post.focus_keyword}
- Contenu : ${post.content?.substring(0, 1000) || ''}

PROBLÈMES DÉTECTÉS :
${issues.join('\n')}

TÂCHE :
Crée une section FAQ avec :
- 3-5 questions pertinentes que les lecteurs pourraient se poser
- Réponses détaillées (50-100 mots par réponse)
- Questions qui incluent des variations du mot-clé principal
- Format HTML avec structure <h2>Questions fréquentes</h2> + divs pour chaque Q&A
- Schema.org FAQPage markup en JSON-LD

Cette section sera ajoutée à la fin de l'article existant.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_faq",
          description: "Crée une section FAQ avec schema.org",
          parameters: {
            type: "object",
            properties: {
              faq_html: { 
                type: "string", 
                description: "La section FAQ en HTML à ajouter à l'article"
              },
              schema_markup: { 
                type: "string",
                description: "Le schema.org FAQPage en JSON-LD (format string)"
              },
              questions_count: {
                type: "number",
                description: "Nombre de questions créées"
              },
              reasoning: { 
                type: "string",
                description: "Explication des questions choisies"
              }
            },
            required: ["faq_html", "schema_markup", "questions_count", "reasoning"]
          }
        }
      };
    } else if (category === 'full') {
      // Full optimization combines multiple improvements
      prompt = `Tu es un expert SEO. Réalise une optimisation complète de cet article.

ARTICLE ACTUEL :
- Titre : ${post.title}
- Meta titre : ${post.meta_title || 'Aucun'}
- Meta description : ${post.meta_description || 'Aucune'}
- Mot-clé : ${post.focus_keyword || 'Aucun'}
- Contenu : ${post.content || ''}

ANALYSE SEO :
Score actuel : ${seoAnalysis?.score || 0}/100

TÂCHE COMPLÈTE :
Optimise TOUS les aspects en une seule fois :
1. Métadonnées (titre + description optimaux)
2. Mots-clés (densité et placement)
3. Structure du contenu (H2/H3, paragraphes, listes)
4. Liens (internes + externes)
5. FAQ (3-5 questions avec schema.org)

Retourne un ensemble complet d'optimisations.`;

      toolDefinition = {
        type: "function",
        function: {
          name: "optimize_full",
          description: "Optimisation complète de l'article",
          parameters: {
            type: "object",
            properties: {
              meta_title: { type: "string" },
              meta_description: { type: "string" },
              content: { type: "string" },
              faq_html: { type: "string" },
              schema_markup: { type: "string" },
              changes_summary: {
                type: "array",
                items: { type: "string" },
                description: "Résumé de tous les changements"
              },
              reasoning: { type: "string" }
            },
            required: ["meta_title", "meta_description", "content", "changes_summary", "reasoning"]
          }
        }
      };
    } else {
      throw new Error(`Catégorie d'optimisation non supportée: ${category}`);
    }

    // Call Lovable AI with TIMEOUT
    console.log('Calling Lovable AI...');
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    let response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: prompt }
          ],
          tools: [toolDefinition],
          tool_choice: { type: "function", function: { name: toolDefinition.function.name } }
        }),
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Request timeout');
        throw new Error('La requête a pris trop de temps (>30s). Essayez une optimisation plus simple ou réessayez.');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

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
      console.error('No tool call in response:', JSON.stringify(aiResponse, null, 2));
      throw new Error('L\'IA n\'a pas retourné de résultat valide');
    }

    let optimizations;
    try {
      optimizations = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw arguments:', toolCall.function.arguments);
      throw new Error('Format de réponse invalide de l\'IA. Veuillez réessayer.');
    }
    console.log('Optimizations parsed:', optimizations);

    // Traitement spécial pour les keywords : appliquer les insertions côté serveur
    if (category === 'keywords' && optimizations.insertions && Array.isArray(optimizations.insertions)) {
      console.log(`Applying ${optimizations.insertions.length} keyword insertions...`);
      let modifiedContent = post.content || '';
      let appliedCount = 0;
      
      for (const insertion of optimizations.insertions) {
        const { target_text, replacement_text, tag_type } = insertion;
        
        // Créer un regex pour trouver le texte cible
        const escapedTarget = target_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Remplacer uniquement dans les balises spécifiées (éviter les headings sauf h2/h3)
        let regex;
        if (tag_type === 'h2' || tag_type === 'h3') {
          regex = new RegExp(`(<${tag_type}[^>]*>)(.*?${escapedTarget}.*?)(<\/${tag_type}>)`, 'gis');
        } else {
          regex = new RegExp(`(<(p|li|strong)[^>]*>)(.*?${escapedTarget}.*?)(<\/\\2>)`, 'gis');
        }
        
        const beforeReplace = modifiedContent;
        modifiedContent = modifiedContent.replace(regex, (match, openTag, tagName, content, closeTag) => {
          // Ne remplacer qu'une seule fois pour éviter les doublons
          const newContent = content.replace(target_text, replacement_text);
          return `${openTag}${newContent}${closeTag}`;
        });
        
        if (modifiedContent !== beforeReplace) {
          appliedCount++;
          console.log(`✓ Inserted keyword: "${target_text}" → "${replacement_text}"`);
        } else {
          console.log(`⚠ Could not find target text: "${target_text}"`);
        }
      }
      
      // Nettoyage des liens dans les titres H1-H6
      modifiedContent = modifiedContent.replace(
        /<(h[123456])[^>]*>(.*?)<\/h[123456]>/gi,
        (match, tag, content) => {
          const cleanContent = content.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
          return `<${tag}>${cleanContent}</${tag}>`;
        }
      );
      
      optimizations.content = modifiedContent;
      optimizations.changes = optimizations.changes || [];
      optimizations.changes.push(`${appliedCount} insertions de mots-clés appliquées`);
      console.log(`Applied ${appliedCount}/${optimizations.insertions.length} keyword insertions`);
    }
    
    // NETTOYAGE OBLIGATOIRE : Retirer tous les liens des titres H1-H6
    if (optimizations.content && category !== 'keywords') {
      optimizations.content = optimizations.content.replace(
        /<(h[123456])[^>]*>(.*?)<\/h[123456]>/gi,
        (match, tag, content) => {
          const cleanContent = content.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
          return `<${tag}>${cleanContent}</${tag}>`;
        }
      );
    }

    // Validation : Vérifier que le mot-clé est présent dans les métadonnées
    if (category === 'metadata' && post.focus_keyword) {
      const keyword = post.focus_keyword.toLowerCase();
      if (optimizations.meta_title && !optimizations.meta_title.toLowerCase().includes(keyword)) {
        // Forcer l'insertion en début
        const shortened = optimizations.meta_title.substring(0, 50 - keyword.length - 3);
        optimizations.meta_title = `${post.focus_keyword} - ${shortened}...`;
        console.log('Keyword forced in meta_title:', optimizations.meta_title);
      }
      if (optimizations.meta_description && !optimizations.meta_description.toLowerCase().includes(keyword)) {
        // Forcer l'insertion en début
        const shortened = optimizations.meta_description.substring(0, 150 - keyword.length - 3);
        optimizations.meta_description = `${post.focus_keyword} - ${shortened}...`;
        console.log('Keyword forced in meta_description:', optimizations.meta_description);
      }
    }

    // Return optimizations with original values for comparison
    let original: any = {};
    
    if (category === 'metadata' || category === 'full') {
      original.meta_title = post.meta_title;
      original.meta_description = post.meta_description;
    }
    
    if (category === 'keywords' || category === 'content' || category === 'links' || category === 'full') {
      original.content = post.content;
    }
    
    if (category === 'faq' || category === 'full') {
      original.has_faq = post.content?.includes('Questions fréquentes') || false;
    }

    const result = {
      category,
      optimizations,
      original
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
