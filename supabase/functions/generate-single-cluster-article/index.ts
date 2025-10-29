import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { clusterId, shopId, articleIndex } = await req.json();

    console.log(`Generating article ${articleIndex} for cluster ${clusterId}`);

    // Get cluster information
    const { data: cluster, error: clusterError } = await supabaseClient
      .from('topic_clusters')
      .select('*')
      .eq('id', clusterId)
      .single();

    if (clusterError || !cluster) {
      throw new Error('Cluster non trouvé');
    }

    // Get shop information
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    console.log('Generating blog post for shop:', shop.name);

    // Sélectionner l'auteur le plus pertinent pour le cluster
    const { data: authors, error: authorsError } = await supabaseClient
      .from('blog_authors')
      .select('id, name, expertise_areas')
      .eq('shop_id', shopId);

    let selectedAuthorId = null;
    if (authors && authors.length > 0) {
      // Pour les clusters, garder le même auteur pour tous les articles (cohérence)
      // Vérifier si un article du cluster existe déjà avec un auteur
      const { data: existingArticles } = await supabaseClient
        .from('blog_posts')
        .select('author_id')
        .eq('cluster_id', clusterId)
        .not('author_id', 'is', null)
        .limit(1);

      if (existingArticles && existingArticles.length > 0 && existingArticles[0].author_id) {
        // Utiliser le même auteur que les articles existants du cluster
        selectedAuthorId = existingArticles[0].author_id;
        const selectedAuthor = authors.find(a => a.id === selectedAuthorId);
        console.log(`✅ Auteur du cluster: ${selectedAuthor?.name}`);
      } else {
        // Sinon, sélectionner l'auteur avec le moins d'articles (équilibrage)
        const authorPostCounts = await Promise.all(
          authors.map(async (author) => {
            const { count } = await supabaseClient
              .from('blog_posts')
              .select('*', { count: 'exact', head: true })
              .eq('author_id', author.id);
            return { authorId: author.id, count: count || 0 };
          })
        );

        authorPostCounts.sort((a, b) => a.count - b.count);
        selectedAuthorId = authorPostCounts[0].authorId;
        
        const selectedAuthor = authors.find(a => a.id === selectedAuthorId);
        console.log(`✅ Nouvel auteur pour cluster: ${selectedAuthor?.name} (${authorPostCounts[0].count} articles)`);
      }
    } else {
      console.log('⚠️ Aucun auteur E-E-A-T disponible pour cette boutique');
    }

    // Get Lovable AI API key (automatically provisioned)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Select a random keyword
    const allKeywords = [cluster.pillar_keyword, ...(cluster.target_keywords || [])];
    const randomKeyword = allKeywords[Math.floor(Math.random() * allKeywords.length)];

    console.log('Selected keyword for article:', randomKeyword);

    // Analyze SERP competitors
    let serpAnalysis = null;
    try {
      console.log('Analyzing SERP competitors for:', randomKeyword);
      const analysisResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-serp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ 
            keyword: randomKeyword,
            shopUrl: shop.url
          })
        }
      );

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        if (analysisData?.success) {
          serpAnalysis = analysisData.analysis;
          console.log('SERP analysis completed:', {
            topResults: serpAnalysis.top_results.length,
            targetWordCount: serpAnalysis.recommended_structure.target_word_count
          });
        }
      }
    } catch (analysisError) {
      console.error('SERP analysis failed, continuing without:', analysisError);
    }

    // Get cluster articles for internal linking context
    const { data: clusterArticles } = await supabaseClient
      .from('blog_posts')
      .select('id, title, slug, focus_keyword')
      .eq('cluster_id', clusterId)
      .limit(10);

    const internalLinksContext = clusterArticles && clusterArticles.length > 0
      ? `\n\nArticles existants dans le cluster (pour liens internes) :\n${clusterArticles.map(a => `- "${a.title}" (slug: ${a.slug}) - mot-clé: ${a.focus_keyword || 'N/A'}`).join('\n')}\n\n⚠️ IMPORTANT : Tu DOIS ajouter 2-3 liens internes vers ces articles dans le contenu de manière naturelle avec des anchors optimisés.`
      : '';

    // Build SERP analysis context
    let serpContext = '';
    if (serpAnalysis) {
      const topCompetitors = serpAnalysis.top_results.slice(0, 3).map((r: any, i: number) => 
        `${i + 1}. ${r.title} (${r.url})\n   - H1: ${r.h1 || 'N/A'}\n   - Mots: ${r.word_count || 'N/A'}\n   - Structure H2: ${(r.h2_structure || []).slice(0, 5).join(', ')}`
      ).join('\n\n');

      serpContext = `

🔍 ANALYSE DES CONCURRENTS GOOGLE (TOP 3) :
${topCompetitors}

📊 RECOMMANDATIONS BASÉES SUR L'ANALYSE :
- Longueur cible : ${serpAnalysis.recommended_structure.target_word_count} mots minimum
- Structure H2 recommandée : ${serpAnalysis.recommended_structure.h2_sections.join(', ')}
- Mots-clés à inclure : ${serpAnalysis.recommended_structure.must_include_keywords.join(', ')}
- Éléments à ajouter : ${serpAnalysis.recommended_structure.content_types_to_add.join(', ')}

🎯 OBJECTIF : SURPASSER les concurrents en créant un contenu plus complet, mieux structuré, et plus utile.
`;
    }

    const systemPrompt = serpAnalysis 
      ? "Tu es un expert SEO senior et content strategist spécialisé en e-commerce. Tu crées des articles 100% optimisés pour Google avec une expertise avancée en on-page SEO, sémantique et expérience utilisateur. Tous tes contenus respectent les dernières guidelines Google E-E-A-T. IMPORTANT: Tu as analysé les concurrents en top 3 de Google - ton objectif est de créer un contenu MEILLEUR qui les surpasse en qualité, profondeur, et utilité pour l'utilisateur."
      : "Tu es un expert SEO senior et content strategist spécialisé en e-commerce. Tu crées des articles 100% optimisés pour Google avec une expertise avancée en on-page SEO, sémantique et expérience utilisateur. Tous tes contenus respectent les dernières guidelines Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).";

    const prompt = `
Tu es un expert SEO et content marketing spécialisé en e-commerce. Crée un article de blog 100% optimisé SEO pour un topic cluster.

CONTEXTE BOUTIQUE :
- Nom : ${shop.name}
- URL : ${shop.url}
- Type : ${shop.type}
- Langue : ${shop.language}

CONTEXTE DU CLUSTER :
- Nom du cluster : ${cluster.name}
- Mot-clé pilier du cluster : ${cluster.pillar_keyword}
- Description : ${cluster.description || 'N/A'}
- Mot-clé principal pour CET article : "${randomKeyword}"
${internalLinksContext}
${serpContext}

CRITÈRES SEO OBLIGATOIRES (100% optimisé) :

🎯 STRUCTURE SEO :
- Titre H1 unique avec mot-clé principal en début de titre (max 60 caractères)
- Meta description optimisée 155-160 caractères avec mot-clé + CTA
- Structure hiérarchique claire : H1 > H2 > H3
- Paragraphes courts (3-4 lignes max)
- Listes à puces pour améliorer lisibilité
- Minimum 1200 mots (idéal pour SEO)

🔑 OPTIMISATION MOTS-CLÉS :
- Mot-clé principal présent dans : titre, H1, premier paragraphe, meta description, conclusion
- Densité mot-clé principal : 1-2% du texte
- Mots-clés secondaires (LSI) naturellement intégrés
- Synonymes et variations sémantiques
- Éviter keyword stuffing

🔗 LIENS & STRUCTURE :
- OBLIGATOIRE : Ajouter 2-3 liens internes vers les autres articles du cluster listés ci-dessus
- Anchor text optimisé et naturel
- Liens contextuels pertinents

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
  "content": "Contenu HTML complet 1200+ mots avec <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <table>, <blockquote>, <a href='URL'>anchor text</a>, ET une section FAQ complète avec schema.org. IMPORTANT : Inclure AU MOINS 1 tableau, utiliser <strong> pour les mots-clés importants, ET une section FAQ avec 5-7 questions/réponses structurées. INCLURE 2-3 LIENS INTERNES vers les articles du cluster.",
  "internal_links_added": 3,
  "faq_count": 6
}

IMPORTANT : Le contenu doit être 100% prêt à publier, optimisé pour Google, naturel et engageant. N'oublie pas d'inclure des tableaux, de mettre en gras les éléments clés, ET une section FAQ complète avec structured data schema.org pour maximiser les chances de Featured Snippets ! AJOUTE IMPÉRATIVEMENT 2-3 LIENS INTERNES vers les autres articles du cluster !`;

    console.log('Calling Lovable AI for cluster article generation...');

    // Call Lovable AI with structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'compose_cluster_article',
              description: 'Return a fully-composed SEO blog article for a topic cluster with HTML content and metadata.',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  seo_title: { type: 'string' },
                  meta_description: { type: 'string' },
                  focus_keyword: { type: 'string' },
                  excerpt: { type: 'string' },
                  content: { type: 'string' },
                  internal_links_added: { type: 'number' },
                  faq_count: { type: 'number' }
                },
                required: ['title','seo_title','meta_description','excerpt','content']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'compose_cluster_article' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      if (response.status === 402) {
        throw new Error('Crédits Lovable AI épuisés. Veuillez recharger vos crédits dans Settings → Workspace → Usage.');
      }
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
      }
      throw new Error(`Erreur de l'API Lovable AI (${response.status}). Veuillez réessayer.`);
    }

    const data = await response.json();

    console.log('AI response received, parsing...');

    // Prefer structured tool call output
    let articleData: any | null = null;
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.name === 'compose_cluster_article' && toolCall.function.arguments) {
      try {
        articleData = JSON.parse(toolCall.function.arguments);
        console.log('Parsed article from tool call.');
      } catch (e) {
        console.error('Tool call arguments parse error:', e);
      }
    }

    // Fallback: try to parse JSON content from message
    if (!articleData) {
      const generatedContent = data?.choices?.[0]?.message?.content?.trim();
      if (generatedContent) {
        try {
          const cleanedContent = generatedContent
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          
          const firstBrace = cleanedContent.indexOf('{');
          const lastBrace = cleanedContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonSlice = cleanedContent.slice(firstBrace, lastBrace + 1);
            articleData = JSON.parse(jsonSlice);
          } else {
            articleData = JSON.parse(cleanedContent);
          }
        } catch (error) {
          console.error('Error parsing AI response:', error);
          throw new Error('Failed to parse AI response');
        }
      } else {
        throw new Error('Empty AI response');
      }
    }

    console.log('Article data:', {
      title: articleData.title,
      hasContent: !!articleData.content,
      contentLength: articleData.content?.length
    });

    const slug = generateSlug(articleData.title);

    console.log('Saving blog post to database...');

    // Save blog post to database first
    const { data: savedPost, error: saveError } = await supabaseClient
      .from('blog_posts')
      .insert({
        shop_id: shopId,
        cluster_id: clusterId,
        title: articleData.title,
        slug,
        content: articleData.content,
        excerpt: articleData.excerpt,
        meta_description: articleData.meta_description,
        meta_title: articleData.seo_title || articleData.title,
        focus_keyword: articleData.focus_keyword || randomKeyword,
        author_id: selectedAuthorId,
        status: 'draft',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      throw saveError;
    }

    console.log('Blog post saved successfully:', savedPost.id);

    // Extract H2 sections from generated content for image generation
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const h2Sections: string[] = [];
    let match;
    while ((match = h2Regex.exec(articleData.content)) !== null) {
      const cleanH2 = match[1].replace(/<[^>]*>/g, '').trim();
      h2Sections.push(cleanH2);
    }

    console.log(`Extracted ${h2Sections.length} H2 sections for image generation`);

    // Generate multiple images for the article
    let generatedImages = [];
    try {
      console.log('Calling generate-article-images function...');
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
            topic: articleData.title,
            h2Sections,
            niche: shop.name
          })
        }
      );

      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        if (imagesData.success) {
          generatedImages = imagesData.images;
          console.log(`Successfully generated ${generatedImages.length} images`);

          // Insert images into content
          let updatedContent = articleData.content;
          
          // Add hero image right after the first paragraph
          if (generatedImages.length > 0 && generatedImages[0].section === 'hero') {
            const heroImg = generatedImages[0];
            const firstParagraphEnd = updatedContent.indexOf('</p>');
            if (firstParagraphEnd !== -1) {
              const heroImageHtml = `\n\n<figure class="my-8">\n  <img src="${heroImg.url}" alt="${heroImg.alt_text}" class="w-full rounded-lg shadow-lg" />\n</figure>\n\n`;
              updatedContent = updatedContent.slice(0, firstParagraphEnd + 4) + heroImageHtml + updatedContent.slice(firstParagraphEnd + 4);
            }
          }

          // Insert section images after their corresponding H2
          const sectionImages = generatedImages.filter(img => img.section !== 'hero');
          sectionImages.forEach(img => {
            const h2Pattern = new RegExp(`<h2[^>]*>\\s*${img.h2_title}\\s*</h2>`, 'i');
            const h2Match = updatedContent.match(h2Pattern);
            if (h2Match) {
              const h2End = updatedContent.indexOf(h2Match[0]) + h2Match[0].length;
              const nextParagraphEnd = updatedContent.indexOf('</p>', h2End);
              if (nextParagraphEnd !== -1) {
                const imageHtml = `\n\n<figure class="my-6">\n  <img src="${img.url}" alt="${img.alt_text}" class="w-full rounded-lg shadow-md" />\n</figure>\n\n`;
                updatedContent = updatedContent.slice(0, nextParagraphEnd + 4) + imageHtml + updatedContent.slice(nextParagraphEnd + 4);
              }
            }
          });

          // Update the post with images
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
          }
        }
      } else {
        console.error('Image generation failed:', await imagesResponse.text());
      }
    } catch (imageError) {
      console.error('Image generation error (non-fatal):', imageError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: savedPost.id,
          title: articleData.title,
          slug,
          articleIndex
        },
        images_generated: generatedImages.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-single-cluster-article:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
