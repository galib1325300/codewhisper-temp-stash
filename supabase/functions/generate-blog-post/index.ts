import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      shopId, 
      topic, 
      keywords = [], 
      collectionIds = [], 
      analyzeCompetitors = false,
      existingContent = null,
      mode = 'create',
      authorId = null,
      requestId = null
    } = await req.json();

    const logPrefix = requestId ? `[${requestId}]` : '';
    console.log(`${logPrefix} 📝 Blog post generation request:`, { shopId, topic, mode, authorId });

    if (!shopId || !topic) {
      throw new Error('shopId and topic are required');
    }

    // ANTI-DOUBLON ROBUSTE : vérifier par slug candidat
    if (mode === 'create') {
      const slugCandidate = generateSlug(topic);
      console.log(`${logPrefix} 🔍 Vérification anti-doublon avec slug: ${slugCandidate}`);
      
      const { data: recentPost } = await supabaseClient
        .from('blog_posts')
        .select('id, created_at, title, slug')
        .eq('shop_id', shopId)
        .ilike('slug', `${slugCandidate}%`)
        .gte('created_at', new Date(Date.now() - 180000).toISOString()) // 3 minutes
        .maybeSingle();
      
      if (recentPost) {
        console.log(`${logPrefix} ⚠️ Article similaire déjà généré récemment (slug: ${recentPost.slug}), génération annulée`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            post: recentPost,
            message: 'Génération dupliquée détectée (article similaire récent)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Récupérer les informations de la boutique
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found');
    }

    console.log(`${logPrefix} 🏪 Shop loaded:`, shop.name);

    // RESPECT DE L'AUTEUR SÉLECTIONNÉ
    let selectedAuthorId = null;
    
    if (authorId) {
      // Si un auteur est explicitement demandé, le vérifier et l'utiliser
      const { data: requestedAuthor } = await supabaseClient
        .from('blog_authors')
        .select('id, name, bio, expertise_areas')
        .eq('id', authorId)
        .eq('shop_id', shopId)
        .single();
      
      if (requestedAuthor) {
        selectedAuthorId = requestedAuthor.id;
        console.log(`${logPrefix} ✍️ Auteur demandé:`, requestedAuthor.name);
      } else {
        console.warn(`${logPrefix} ⚠️ Auteur ${authorId} non trouvé, fallback sur équilibrage`);
      }
    }
    
    // Si pas d'auteur spécifié ou introuvable, équilibrage automatique
    if (!selectedAuthorId) {
      const { data: authors } = await supabaseClient
        .from('blog_authors')
        .select('id, name, bio, expertise_areas')
        .eq('shop_id', shopId);

      if (authors && authors.length > 0) {
        const authorPostCounts = await Promise.all(
          authors.map(async (author) => {
            const { count } = await supabaseClient
              .from('blog_posts')
              .select('*', { count: 'exact', head: true })
              .eq('author_id', author.id);
            return { authorId: author.id, count: count || 0 };
          })
        );

        // Trier par nombre d'articles (du moins au plus) et prendre le premier
        authorPostCounts.sort((a, b) => a.count - b.count);
        selectedAuthorId = authorPostCounts[0].authorId;
        
        const selectedAuthor = authors.find(a => a.id === selectedAuthorId);
        console.log(`${logPrefix} ✍️ Auteur auto-sélectionné:`, selectedAuthor?.name, '(équilibrage)');
      } else {
        console.log(`${logPrefix} ⚠️ Aucun auteur E-E-A-T disponible`);
      }
    }

    // Get Lovable AI API key (automatically provisioned)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configuree');
    }

    // Analyze competitors if requested
    let serpAnalysis = null;
    if (analyzeCompetitors && keywords.length > 0) {
      console.log(`${logPrefix} Analyzing SERP competitors for:`, keywords[0]);
      try {
        const analysisResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-serp`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ 
              keyword: keywords[0],
              shopUrl: shop.url
            })
          }
        );

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          if (analysisData?.success) {
            serpAnalysis = analysisData.analysis;
            console.log(`${logPrefix} SERP analysis completed:`, {
              topResults: serpAnalysis.top_results.length,
              targetWordCount: serpAnalysis.recommended_structure.target_word_count
            });
          }
        }
      } catch (analysisError) {
        console.error(`${logPrefix} SERP analysis failed, continuing without:`, analysisError);
      }
    }

    // Get collections data if specified
    let collectionsContext = '';
    if (collectionIds.length > 0) {
      const { data: collections } = await supabaseClient
        .from('collections')
        .select('name, description, slug')
        .in('id', collectionIds);
      
      if (collections && collections.length > 0) {
        collectionsContext = `\n\nCollections à mentionner dans l'article :\n${collections.map(c => `- ${c.name}: ${c.description || 'Pas de description'}`).join('\n')}`;
      }
    }

    // Build SERP analysis context
    const keywordsText = keywords.length > 0 ? `\nMots-clés principaux à optimiser : ${keywords.join(', ')}` : '';
    
    let serpContext = '';
    if (serpAnalysis) {
      const topCompetitors = serpAnalysis.top_results.slice(0, 3).map((r: any, i: number) => 
        `${i + 1}. ${r.title} (${r.url})\n   - H1: ${r.h1 || 'N/A'}\n   - Mots: ${r.word_count || 'N/A'}\n   - Structure H2: ${(r.h2_structure || []).slice(0, 5).join(', ')}`
      ).join('\n\n');

      serpContext = `

🔍 ANALYSE DES CONCURRENTS GOOGLE (TOP 3) :
${topCompetitors}

📊 RECOMMANDATIONS BASÉES SUR L'ANALYSE :
- Longueur cible : ${serpAnalysis.recommended_structure.target_word_count} mots minimum (OBLIGATOIRE - ne pas descendre en dessous)
- Structure H2 recommandée : ${serpAnalysis.recommended_structure.h2_sections.join(', ')}
- Mots-clés à inclure : ${serpAnalysis.recommended_structure.must_include_keywords.join(', ')}
- Éléments à ajouter : ${serpAnalysis.recommended_structure.content_types_to_add.join(', ')}

🎯 OBJECTIF CRITIQUE : SURPASSER les concurrents en créant un contenu plus complet (${serpAnalysis.recommended_structure.target_word_count}+ mots), mieux structuré, et plus utile.
`;
    }

    // Contexte de régénération si mode regenerate
    let regenerateContext = '';
    if (mode === 'regenerate' && existingContent) {
      const plainText = existingContent.replace(/<[^>]*>/g, ' ').trim();
      const excerpt = plainText.substring(0, 500);
      
      regenerateContext = `

⚠️ MODE RÉGÉNÉRATION :
Cet article existe déjà mais est de MAUVAISE qualité SEO (score ≤ 60/100). Tu dois le RÉÉCRIRE COMPLÈTEMENT en :

1. GARDANT les informations factuelles importantes de l'ancien contenu
2. RESTRUCTURANT totalement la présentation avec une structure SEO optimale
3. AJOUTANT beaucoup plus de contenu (1500+ mots minimum)
4. OPTIMISANT 100% pour le SEO (tableaux, FAQ schema, liens internes, etc.)
5. Utilisant un ton professionnel et engageant

ANCIEN CONTENU (pour référence uniquement - NE PAS COPIER) :
${excerpt}...

❌ NE COPIE PAS l'ancien contenu tel quel
✅ RÉÉCRIS-LE complètement avec une approche SEO moderne et des éléments riches (tableaux, FAQ, structure avancée)
      `;
    }

    const systemPrompt = serpAnalysis 
      ? "Tu es un expert SEO senior et content strategist spécialisé en e-commerce. Tu crées des articles 100% optimisés pour Google avec une expertise avancée en on-page SEO, sémantique et expérience utilisateur. Tous tes contenus respectent les dernières guidelines Google E-E-A-T. IMPORTANT: Tu as analysé les concurrents en top 3 de Google - ton objectif est de créer un contenu MEILLEUR qui les surpasse en qualité, profondeur, et utilité pour l'utilisateur."
      : "Tu es un expert SEO senior et content strategist spécialisé en e-commerce. Tu crées des articles 100% optimisés pour Google avec une expertise avancée en on-page SEO, sémantique et expérience utilisateur. Tous tes contenus respectent les dernières guidelines Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).";

    const prompt = `
Tu es un expert SEO et content marketing spécialisé en e-commerce. Crée un article de blog 100% optimisé SEO pour le sujet : "${topic}"

CONTEXTE BOUTIQUE :
- Nom : ${shop.name}
- URL : ${shop.url}
- Type : ${shop.type}
- Langue : ${shop.language}
${keywordsText}
${collectionsContext}
${serpContext}
${regenerateContext}

CRITÈRES SEO OBLIGATOIRES (100% optimisé) :

🎯 STRUCTURE SEO :
- Titre H1 unique avec mot-clé principal en début de titre (max 60 caractères)
- Meta description optimisée 155-160 caractères avec mot-clé + CTA
- Structure hiérarchique claire : H1 > H2 > H3
- Paragraphes courts (3-4 lignes max)
- Listes à puces pour améliorer lisibilité
- Minimum ${serpAnalysis ? serpAnalysis.recommended_structure.target_word_count : '1200'} mots (OBLIGATOIRE - surpasser les concurrents)

🔑 OPTIMISATION MOTS-CLÉS (CRITIQUE) :
⚠️ RÈGLES ABSOLUES SEO :
1. TITRE H1 : Le mot-clé "${keywords[0] || topic}" DOIT apparaître dans les 10 premiers mots
   - Exemple: "${keywords[0] || topic} : Guide complet 2025"
   
2. META TITLE : DOIT commencer par le mot-clé exact "${keywords[0] || topic}"
   - Format OBLIGATOIRE: "${keywords[0] || topic} : Guide 2025" (max 60 chars)
   - Le meta title est différent du H1 mais doit contenir le même mot-clé au début
   
3. DENSITÉ DU MOT-CLÉ PRINCIPAL (OBLIGATOIRE) :
   - Utiliser "${keywords[0] || topic}" EXACTEMENT (pas seulement des variantes)
   - MINIMUM 15-20 occurrences dans l'article complet
   - Cible : 1.5% de densité (ex: 15 fois dans 1000 mots)
   - Présent dans : H1, premier paragraphe, 2-3 H2/H3, conclusion
   - IMPORTANT : Ne pas remplacer toutes les occurrences par des synonymes
   
4. Capitalisation naturelle (ex: "Nettoyage Extérieur" pas "NETTOYAGE EXTERIEUR")
5. Mots-clés secondaires (LSI) naturellement intégrés
6. Éviter keyword stuffing mais GARANTIR la densité cible

🔗 LIENS & STRUCTURE :
- Liens internes vers collections mentionnées (si applicable)
- Anchor text optimisé et naturel
- Structure en silo si collections spécifiques

📊 CONTENU ENGAGEANT :
- Introduction hook (question, statistique, problème)
- Storytelling naturel
- Expertise et crédibilité (faits, chiffres)
- Call-to-action clair en conclusion
- Ton adapté à l'audience (professionnel mais accessible)

📱 LISIBILITÉ :
- Phrases courtes et dynamiques
- Transitions fluides entre sections
- Sous-titres descriptifs (H2/H3)
- Contenu scannable (gras, listes, espaces)

🖼️ IMAGES & MULTIMÉDIA :
- Des images seront automatiquement générées et insérées dans l'article
- Laisse des espaces entre les sections H2 pour l'insertion d'images
- Les images auront des alt text optimisés SEO

📋 FORMATAGE ENRICHI (OBLIGATOIRE) :
- Utilise des <strong> pour mettre en gras les mots-clés stratégiques et points importants
- Inclus AU MOINS 1 tableau comparatif avec <table> (excellent pour Featured Snippets)
- Utilise des listes <ul> et <ol> pour structurer l'information
- Ajoute des <blockquote> pour les citations ou statistiques importantes

❓ SECTION FAQ (OBLIGATOIRE - Featured Snippets):
- Inclus une section "Questions Fréquentes" avec 5-7 questions/réponses
- Questions longue traîne que les utilisateurs recherchent réellement
- Réponses concises 40-60 mots (optimal pour Featured Snippets)
- Format HTML sémantique avec schema.org FAQPage
- Structure : <div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
- Chaque Q&A avec les attributs schema.org appropriés

${serpAnalysis ? `
💡 DIFFÉRENCIATION PAR RAPPORT AUX CONCURRENTS :
- Ajouter des sections uniques non présentes chez les concurrents
- Approfondir les sujets traités superficiellement par les concurrents
- Inclure des exemples concrets et actionnables
- Créer une meilleure expérience utilisateur (tableaux, FAQ, visuels)
` : ''}

Format de réponse JSON STRICT :
{
  "title": "Titre H1 optimisé avec mot-clé (max 60 char)",
  "seo_title": "Titre pour balise <title> (50-60 char)",
  "meta_description": "Meta description 155-160 caractères avec mot-clé + CTA",
  "focus_keyword": "Mot-clé principal exact",
  "excerpt": "Résumé accrocheur 150-200 caractères",
  "content": "Contenu HTML complet 1200+ mots avec <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <table>, <blockquote>, <a href='URL'>anchor text</a>, ET une section FAQ complète avec schema.org. IMPORTANT : Inclure AU MOINS 1 tableau, utiliser <strong> pour les mots-clés importants, ET une section FAQ avec 5-7 questions/réponses structurées.",
  "internal_links": ["Lien vers collection 1", "Lien vers collection 2"],
  "faq_count": 6,
  "seo_score": 95
}

IMPORTANT : Le contenu doit être 100% prêt à publier, optimisé pour Google, naturel et engageant. N'oublie pas d'inclure des tableaux, de mettre en gras les éléments clés, ET une section FAQ complète avec structured data schema.org pour maximiser les chances de Featured Snippets !
`;

    console.log(`${logPrefix} Calling Lovable AI for blog post generation...`);

    // Call Lovable AI with increased max_tokens
    console.log(`${logPrefix} 🤖 Calling Lovable AI with google/gemini-2.5-flash...`);
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 8000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'compose_blog_post',
              description: 'Return a fully-composed SEO blog post with HTML content and metadata.',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  seo_title: { type: 'string' },
                  meta_description: { type: 'string' },
                  focus_keyword: { type: 'string' },
                  excerpt: { type: 'string' },
                  content: { type: 'string' },
                  internal_links: { type: 'array', items: { type: 'string' } },
                  faq_count: { type: 'number' }
                },
                required: ['title','seo_title','meta_description','excerpt','content']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'compose_blog_post' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      if (aiResponse.status === 402) {
        throw new Error('Credits Lovable AI epuises. Veuillez recharger vos credits dans Settings → Workspace → Usage.');
      }
      if (aiResponse.status === 429) {
        throw new Error('Limite de requetes atteinte. Veuillez reessayer dans quelques instants.');
      }
      throw new Error(`Erreur de l\'API Lovable AI (${aiResponse.status}). Veuillez reessayer.`);
    }

    const aiData = await aiResponse.json();

    // Prefer structured tool call output
    let blogPost: any | null = null;
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.name === 'compose_blog_post' && toolCall.function.arguments) {
      try {
        blogPost = JSON.parse(toolCall.function.arguments);
        console.log(`${logPrefix} Parsed blog post from tool call.`);
      } catch (e) {
        console.error(`${logPrefix} Tool call arguments parse error:`, e);
      }
    }

    // Fallback 1: try to parse JSON content from message
    if (!blogPost) {
      const generatedContent = aiData?.choices?.[0]?.message?.content?.trim();
      if (generatedContent) {
        console.log(`${logPrefix} AI response received, parsing JSON (fallback)...`);
        try {
          const cleanedContent = generatedContent
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const firstBrace = cleanedContent.indexOf('{');
          const lastBrace = cleanedContent.lastIndexOf('}');
          const jsonSlice = (firstBrace !== -1 && lastBrace !== -1)
            ? cleanedContent.slice(firstBrace, lastBrace + 1)
            : cleanedContent;
          blogPost = JSON.parse(jsonSlice);
        } catch (_err) {
          console.warn('JSON parsing failed, switching to HTML-only fallback');
        }
      }
    }

    // Fallback 2: Ask for HTML-only article and build metadata ourselves
    if (!blogPost) {
      console.log(`${logPrefix} Falling back to HTML-only generation...`);
      const htmlOnlyPrompt = `Crée un article de blog SEO EN FRANÇAIS pour le sujet: "${topic}"\n\nExigences STRICTES:\n- Retourne UNIQUEMENT le HTML complet de l'article entre <article>...</article> (aucun JSON, aucun markdown, aucun commentaire)\n- Inclus H1, H2/H3, paragraphes, listes, tableau, blockquote, gras (<strong>)\n- 1200+ mots, naturel et engageant, optimisé pour SEO\n- Pas d'en-têtes meta, seulement le corps de l'article`;

      const aiResponse2 = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Tu es un expert SEO. Tu génères uniquement du HTML propre, sans JSON ni balises de code.' },
            { role: 'user', content: htmlOnlyPrompt }
          ]
        }),
      });

      if (!aiResponse2.ok) {
        const t2 = await aiResponse2.text();
        console.error('Lovable AI (fallback) error:', aiResponse2.status, t2);
        if (aiResponse2.status === 402) throw new Error('Credits Lovable AI epuises. Veuillez recharger vos credits dans Settings → Workspace → Usage.');
        if (aiResponse2.status === 429) throw new Error('Limite de requetes atteinte. Veuillez reessayer dans quelques instants.');
        throw new Error(`Erreur de l\'API Lovable AI (${aiResponse2.status}). Veuillez reessayer.`);
      }

      const aiData2 = await aiResponse2.json();
      const contentHtml = aiData2?.choices?.[0]?.message?.content?.trim();
      if (!contentHtml) throw new Error('Reponse vide de l\'IA (fallback)');

      // Build minimal metadata
      const h1Match = contentHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const derivedTitle = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : (topic || 'Article de blog');
      const plain = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const derivedExcerpt = plain.slice(0, 180);
      const derivedMeta = plain.slice(0, 160);

      blogPost = {
        title: derivedTitle,
        seo_title: derivedTitle,
        meta_description: derivedMeta,
        focus_keyword: (keywords && keywords.length > 0) ? keywords[0] : null,
        excerpt: derivedExcerpt,
        content: contentHtml,
        internal_links: [],
        faq_count: 0
      };
    }

    const slug = generateSlug(blogPost.title);

    // === NETTOYAGE DES HEADINGS (pas de liens dans H1/H2/H3) ===
    console.log('Cleaning headings (removing links)...');
    let cleanedContent = blogPost.content;
    
    // Retirer tous les liens <a> des titres H1, H2, H3
    cleanedContent = cleanedContent.replace(/<(h[123][^>]*)>(.*?)<\/\1>/gi, (match, tag, innerHtml) => {
      const cleanInner = innerHtml.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
      return `<${tag}>${cleanInner}</${tag}>`;
    });
    
    blogPost.content = cleanedContent;

    // === GARANTIES METAS (longueurs optimales) ===
    console.log('Normalizing meta tags...');
    
    // Fonction helper pour nettoyer le HTML et tronquer
    const cleanAndTruncate = (text: string, maxLength: number): string => {
      if (!text) return '';
      // Retirer le HTML
      let clean = text.replace(/<[^>]*>/g, '').trim();
      // Tronquer intelligemment (ne pas couper un mot)
      if (clean.length > maxLength) {
        clean = clean.substring(0, maxLength);
        const lastSpace = clean.lastIndexOf(' ');
        if (lastSpace > maxLength - 20) {
          clean = clean.substring(0, lastSpace);
        }
        clean = clean.trim();
      }
      return clean;
    };
    
    // Meta title: FORCER le mot-clé exact au début (règle SEO critique)
    const mainKeyword = keywords[0] || topic;
    const keywordPrefix = mainKeyword.substring(0, 45); // Laisser 15 chars pour suffix
    
    // Si le meta title ne commence pas déjà par le mot-clé, le forcer
    if (!blogPost.seo_title || !blogPost.seo_title.toLowerCase().startsWith(mainKeyword.toLowerCase().substring(0, 20))) {
      blogPost.seo_title = `${keywordPrefix} : Guide 2025`;
    }
    
    blogPost.seo_title = cleanAndTruncate(blogPost.seo_title, 60);
    
    // Garantir que le focus_keyword correspond exactement au mot-clé principal
    blogPost.focus_keyword = mainKeyword;
    
    // Meta description: max 160 caractères
    blogPost.meta_description = cleanAndTruncate(blogPost.meta_description, 160);

    console.log('Meta tags normalized:', {
      titleLength: blogPost.seo_title.length,
      descLength: blogPost.meta_description.length
    });

    // === PHASE 5: DETAILED GENERATION STRATEGY LOGS ===
    console.log(`${logPrefix} 📊 Generation strategy applied:`);
    console.log(`  - SERP Analysis: ${serpAnalysis ? 'YES ✅' : 'NO (fallback)'}`);
    if (serpAnalysis) {
      console.log(`  - Target word count (SERP): ${serpAnalysis.recommended_structure.target_word_count}`);
      console.log(`  - H2 sections (SERP): ${serpAnalysis.recommended_structure.h2_sections.length} sections`);
      console.log(`  - Content types (SERP): ${serpAnalysis.recommended_structure.content_types_to_add.join(', ')}`);
      console.log(`  - Internal links target (SERP): ${serpAnalysis.recommended_structure.recommended_internal_links || 'N/A'}`);
    } else {
      console.log(`  - Target word count (fallback): 1500 minimum`);
      console.log(`  - H2 sections (fallback): 5 generic sections`);
      console.log(`  - Internal links target (fallback): 7-9`);
    }
    console.log(`  - Mode: ${mode}`);
    console.log(`  - Author: ${selectedAuthorId ? 'Assigned' : 'None'}`);
    console.log(`  - Keywords: ${keywords.join(', ') || 'None'}`);

    // === SANITIZE EXTERNAL/INVALID LINKS (Anti-404 Critical) ===
    console.log(`${logPrefix} Sanitizing unauthorized links from AI content...`);
    const baseUrl = shop.url.replace(/\/$/, '');
    let sanitizedContent = blogPost.content;
    
    // Remove ALL <a> tags that don't belong to the shop domain
    sanitizedContent = sanitizedContent.replace(
      /<a\s+([^>]*?)href=["']([^"']*?)["']([^>]*?)>(.*?)<\/a>/gi,
      (match, beforeHref, href, afterHref, anchorText) => {
        // Keep if href starts with shop URL (internal link)
        if (href && href.startsWith(baseUrl)) {
          return match;
        }
        // Keep if href is a relative URL starting with / (internal)
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          return match;
        }
        // Keep if href starts with #  (anchor)
        if (href && href.startsWith('#')) {
          return match;
        }
        // Otherwise, remove the link but keep the text
        console.log(`🔥 Removed unauthorized link: ${href}`);
        return anchorText;
      }
    );
    
    const linksRemoved = (blogPost.content.match(/<a /gi) || []).length - (sanitizedContent.match(/<a /gi) || []).length;
    if (linksRemoved > 0) {
      console.log(`${logPrefix} ✓ Removed ${linksRemoved} unauthorized AI-generated links`);
    }
    
    blogPost.content = sanitizedContent;

    console.log(`${logPrefix} Saving blog post to database...`);

    // === GARANTIR H1 AU DÉBUT DU CONTENU ===
    console.log('Ensuring H1 at beginning of content...');
    let finalContent = blogPost.content;
    
    // Check if content starts with H1
    const startsWithH1 = /^\s*<h1[^>]*>/i.test(finalContent);
    
    if (!startsWithH1) {
      // Insert H1 at the beginning
      const h1Tag = `<h1>${blogPost.title}</h1>\n\n`;
      finalContent = h1Tag + finalContent;
      console.log('✓ H1 inserted at beginning');
    }
    
    blogPost.content = finalContent;

    // Save blog post to database with generation_status='generating'
    const { data: savedPost, error: saveError } = await supabaseClient
      .from('blog_posts')
      .insert({
        shop_id: shopId,
        title: blogPost.title,
        slug,
        content: blogPost.content,
        excerpt: blogPost.excerpt,
        meta_description: blogPost.meta_description,
        meta_title: blogPost.seo_title || blogPost.title,
        focus_keyword: blogPost.focus_keyword || keywords[0] || null,
        author_id: selectedAuthorId,
        status: 'draft',
        generation_status: 'generating'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      throw saveError;
    }

    console.log('Blog post saved successfully:', savedPost.id);

    // Return immediately to client
    const immediateResponse = new Response(
      JSON.stringify({ 
        success: true, 
        post: savedPost,
        message: 'Article en cours de génération en arrière-plan'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Continue processing in background
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    EdgeRuntime.waitUntil((async () => {
      try {
        console.log(`${logPrefix} 🔄 Background processing started for post ${savedPost.id}`);

        // Extract H2 sections from generated content for image generation
        const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
        const h2Sections: string[] = [];
        let match;
        while ((match = h2Regex.exec(blogPost.content)) !== null) {
          // Remove HTML tags from H2 content
          const cleanH2 = match[1].replace(/<[^>]*>/g, '').trim();
          h2Sections.push(cleanH2);
        }

        console.log(`${logPrefix} Extracted ${h2Sections.length} H2 sections for image generation`);

        // Generate images for the article
        let generatedImages = [];
        try {
          console.log(`${logPrefix} Calling generate-article-images function...`);
          const imagesController = new AbortController();
          const imagesTimeout = setTimeout(() => imagesController.abort(), 60000); // 60s timeout
          
          const imagesResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-article-images`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                postId: savedPost.id,
                topic,
                h2Sections,
                niche: shop.name
              }),
              signal: imagesController.signal
            }
          );
          clearTimeout(imagesTimeout);

          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json();
            if (imagesData.success) {
              generatedImages = imagesData.images;
              console.log(`${logPrefix} Successfully generated ${generatedImages.length} images`);

              // Insert images into content
              let updatedContent = blogPost.content;
              
              // Add hero image right after the first paragraph
              if (generatedImages.length > 0 && generatedImages[0].section === 'hero') {
                const heroImage = generatedImages[0];
                const firstParagraphEnd = updatedContent.indexOf('</p>');
                if (firstParagraphEnd !== -1) {
                  const heroImageHtml = `\n\n<figure style="margin: 2rem 0;">
  <img src="${heroImage.url}" alt="${heroImage.alt}" style="width: 100%; height: auto; border-radius: 8px;" loading="eager" />
  <figcaption style="margin-top: 0.5rem; font-size: 0.875rem; color: #666; text-align: center;">${heroImage.alt}</figcaption>
</figure>\n\n`;
                  updatedContent = updatedContent.slice(0, firstParagraphEnd + 4) + heroImageHtml + updatedContent.slice(firstParagraphEnd + 4);
                }
              }

              // Insert section images after their corresponding H2
              for (let i = 1; i < generatedImages.length; i++) {
                const image = generatedImages[i];
                const correspondingH2Index = i - 1;
                
                if (correspondingH2Index < h2Sections.length) {
                  const h2Text = h2Sections[correspondingH2Index];
                  const h2Regex = new RegExp(`(<h2[^>]*>${h2Text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>)`, 'i');
                  const imageHtml = `$1\n\n<figure style="margin: 2rem 0;">
  <img src="${image.url}" alt="${image.alt}" style="width: 100%; height: auto; border-radius: 8px;" loading="lazy" />
  <figcaption style="margin-top: 0.5rem; font-size: 0.875rem; color: #666; text-align: center;">${image.alt}</figcaption>
</figure>\n\n`;
                  updatedContent = updatedContent.replace(h2Regex, imageHtml);
                }
              }

              // Update the blog post with images
              const { error: updateError } = await supabaseClient
                .from('blog_posts')
                .update({
                  content: updatedContent,
                  featured_image: generatedImages.length > 0 ? generatedImages[0].url : null
                })
                .eq('id', savedPost.id);

              if (updateError) {
                console.error('Error updating post with images:', updateError);
              } else {
                console.log('Post updated with images successfully');
                blogPost.content = updatedContent;
                savedPost.content = updatedContent;
                savedPost.featured_image = generatedImages.length > 0 ? generatedImages[0].url : null;
              }
            }
          } else {
            console.error('Image generation failed:', await imagesResponse.text());
          }
        } catch (imageError) {
          console.error('Error generating images (non-critical):', imageError);
        }

        // Add internal links to the content
        let internalLinksAdded = 0;
        try {
          console.log(`${logPrefix} Adding internal links to blog post...`);
          const linksController = new AbortController();
          const linksTimeout = setTimeout(() => linksController.abort(), 45000); // 45s timeout
          
          const linksResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-blog-internal-links`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                postId: savedPost.id,
                shopId: shopId,
                content: savedPost.content,
                topic: topic,
                serpAnalysis: serpAnalysis
              }),
              signal: linksController.signal
            }
          );
          clearTimeout(linksTimeout);

          if (linksResponse.ok) {
            const linksData = await linksResponse.json();
            if (linksData.success && linksData.linksAdded > 0) {
              internalLinksAdded = linksData.linksAdded;
              savedPost.content = linksData.content;
              console.log(`✓ Added ${internalLinksAdded} internal links successfully`);
              
              // Phase 3: Validate keyword density
              const plainTextForDensity = savedPost.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              const wordCountForDensity = plainTextForDensity.split(/\s+/).length;
              const keywordForDensity = blogPost.focus_keyword || keywords[0] || '';
              if (keywordForDensity) {
                const keywordOccurrences = (plainTextForDensity.toLowerCase().match(new RegExp(keywordForDensity.toLowerCase(), 'g')) || []).length;
                const keywordDensity = (keywordOccurrences / wordCountForDensity) * 100;
                console.log(`${logPrefix} 📊 Keyword density: ${keywordDensity.toFixed(2)}% (${keywordOccurrences} occurrences / ${wordCountForDensity} words)`);
                
                if (keywordDensity < 1.0) {
                  console.warn(`${logPrefix} ⚠️ Keyword density LOW: ${keywordDensity.toFixed(2)}% (target: 1.2-1.8%)`);
                } else if (keywordDensity > 2.5) {
                  console.warn(`${logPrefix} ⚠️ Keyword density HIGH: ${keywordDensity.toFixed(2)}%`);
                } else {
                  console.log(`${logPrefix} ✅ Keyword density optimal: ${keywordDensity.toFixed(2)}%`);
                }
              }
            }
          } else {
            console.error('Internal linking failed:', await linksResponse.text());
          }
        } catch (linksError) {
          console.error('Error adding internal links (non-critical):', linksError);
        }

        // Add author signature if author is assigned
        if (selectedAuthorId) {
          try {
            console.log('Adding author signature...');
            const signatureController = new AbortController();
            const signatureTimeout = setTimeout(() => signatureController.abort(), 30000); // 30s timeout
            
            const signatureResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-author-signature`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  content: savedPost.content,
                  authorId: selectedAuthorId,
                  shopId: shopId,
                  postTitle: blogPost.title
                }),
                signal: signatureController.signal
              }
            );
            clearTimeout(signatureTimeout);

            if (signatureResponse.ok) {
              const signatureData = await signatureResponse.json();
              if (signatureData.success) {
                savedPost.content = signatureData.content;
                console.log(`${logPrefix} ✓ Author signature added successfully`);
              }
            } else {
              console.error('Signature addition failed (non-critical):', await signatureResponse.text());
            }
          } catch (signatureError) {
            console.error('Error adding signature (non-critical):', signatureError);
          }
        }

        // Add FAQ section
        try {
          console.log(`${logPrefix} Generating FAQ section...`);
          const faqController = new AbortController();
          const faqTimeout = setTimeout(() => faqController.abort(), 45000); // 45s timeout
          
          const faqResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/add-blog-faq`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                postId: savedPost.id,
                shopId: shopId,
                content: savedPost.content,
                topic: blogPost.title,
                focusKeyword: blogPost.focus_keyword
              }),
              signal: faqController.signal
            }
          );
          clearTimeout(faqTimeout);

          if (faqResponse.ok) {
            const faqData = await faqResponse.json();
            if (faqData.success && faqData.faqCount > 0) {
              savedPost.content = faqData.content;
              console.log(`✓ Added ${faqData.faqCount} FAQ items successfully`);
            }
          } else {
            console.error('FAQ generation failed (non-critical):', await faqResponse.text());
          }
        } catch (faqError) {
          console.error('Error generating FAQ (non-critical):', faqError);
        }

        // Clean invalid links (404s, etc.)
        try {
          console.log(`${logPrefix} Cleaning invalid links...`);
          const cleanLinksResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/clean-blog-post-links`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                postId: savedPost.id
              })
            }
          );

          if (cleanLinksResponse.ok) {
            const cleanData = await cleanLinksResponse.json();
            if (cleanData.success) {
              console.log(`✓ Cleaned ${cleanData.removed} invalid links`);
            }
          }
        } catch (cleanError) {
          console.error('Error cleaning links (non-critical):', cleanError);
        }

        // FINAL STATUS UPDATE - Very important for realtime events
        console.log(`${logPrefix} 🏁 All background tasks completed, updating status to 'draft'...`);
        const { error: statusUpdateError } = await supabaseClient
          .from('blog_posts')
          .update({ 
            generation_status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', savedPost.id);

        if (statusUpdateError) {
          console.error(`${logPrefix} ❌ Error updating generation status:`, statusUpdateError);
        } else {
          console.log(`${logPrefix} ✅ Status updated to 'draft' - Background processing completed successfully`);
        }
      } catch (backgroundError) {
        console.error(`${logPrefix} ❌ Background processing error:`, backgroundError);
        
        // Update status to error with explicit realtime trigger
        const { error: errorUpdateError } = await supabaseClient
          .from('blog_posts')
          .update({ 
            generation_status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', savedPost.id);
        
        if (errorUpdateError) {
          console.error(`${logPrefix} ❌ Error updating error status:`, errorUpdateError);
        }
      }
    })());

    return immediateResponse;

  } catch (error: any) {
    console.error('Error in generate-blog-post function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Une erreur est survenue lors de la génération'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
