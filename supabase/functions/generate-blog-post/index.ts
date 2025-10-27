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

    const { shopId, topic, keywords = [], collectionIds = [], analyzeCompetitors = false } = await req.json();

    // Get shop data
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    console.log('Generating blog post for shop:', shop.name);

    // Get Lovable AI API key (automatically provisioned)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Analyze competitors if requested
    let serpAnalysis = null;
    if (analyzeCompetitors && keywords.length > 0) {
      console.log('Analyzing SERP competitors for:', keywords[0]);
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
            console.log('SERP analysis completed:', {
              topResults: serpAnalysis.top_results.length,
              targetWordCount: serpAnalysis.recommended_structure.target_word_count
            });
          }
        }
      } catch (analysisError) {
        console.error('SERP analysis failed, continuing without:', analysisError);
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
Tu es un expert SEO et content marketing spécialisé en e-commerce. Crée un article de blog 100% optimisé SEO pour le sujet : "${topic}"

CONTEXTE BOUTIQUE :
- Nom : ${shop.name}
- URL : ${shop.url}
- Type : ${shop.type}
- Langue : ${shop.language}
${keywordsText}
${collectionsContext}
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
  "content": "Contenu HTML complet 1200+ mots avec <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <table>, <blockquote>, <a href='URL'>anchor text</a>. IMPORTANT : Inclure AU MOINS 1 tableau et utiliser <strong> pour les mots-clés importants.",
  "internal_links": ["Lien vers collection 1", "Lien vers collection 2"],
  "seo_score": 95
}

IMPORTANT : Le contenu doit être 100% prêt à publier, optimisé pour Google, naturel et engageant. N'oublie pas d'inclure des tableaux et de mettre en gras les éléments clés !
`;

    console.log('Calling Lovable AI for blog post generation...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.7,
        max_tokens: serpAnalysis ? 4000 : 3500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Erreur Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0]?.message?.content?.trim();

    if (!generatedContent) {
      throw new Error('Erreur lors de la génération du contenu');
    }

    console.log('AI response received, parsing JSON...');

    let blogPost;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = generatedContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      blogPost = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', generatedContent.substring(0, 500));
      throw new Error('Format de réponse invalide de l\'IA');
    }

    const slug = generateSlug(blogPost.title);

    console.log('Saving blog post to database...');

    // Save blog post to database
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
    while ((match = h2Regex.exec(blogPost.content)) !== null) {
      // Remove HTML tags from H2 content
      const cleanH2 = match[1].replace(/<[^>]*>/g, '').trim();
      h2Sections.push(cleanH2);
    }

    console.log(`Extracted ${h2Sections.length} H2 sections for image generation`);

    // Generate images for the article
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
            topic,
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
      console.log('Adding internal links to blog post...');
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
            topic: topic
          })
        }
      );

      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        if (linksData.success && linksData.linksAdded > 0) {
          internalLinksAdded = linksData.linksAdded;
          savedPost.content = linksData.content;
          console.log(`✓ Added ${internalLinksAdded} internal links successfully`);
        }
      } else {
        console.error('Internal linking failed:', await linksResponse.text());
      }
    } catch (linksError) {
      console.error('Error adding internal links (non-critical):', linksError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: {
          ...savedPost,
          ...blogPost,
          images: generatedImages,
          internal_links_added: internalLinksAdded,
          serp_analysis: serpAnalysis ? {
            competitors_analyzed: serpAnalysis.top_results.length,
            target_word_count: serpAnalysis.recommended_structure.target_word_count,
            insights: serpAnalysis.competitive_insights
          } : null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating blog post:', error);
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
