import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0';

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

    const { shopId, topic, keywords = [], collectionIds = [] } = await req.json();

    // Get shop data
    const { data: shop, error: shopError } = await supabaseClient
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique non trouvée');
    }

    // Get OpenAI API key
    let openaiApiKey = shop.openai_api_key;
    
    if (!openaiApiKey) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('openai_api_key')
        .eq('user_id', shop.user_id)
        .single();
      
      openaiApiKey = profile?.openai_api_key;
    }

    if (!openaiApiKey) {
      throw new Error('Clé API OpenAI manquante. Veuillez la configurer dans les paramètres.');
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: openaiApiKey,
    });
    const openai = new OpenAIApi(configuration);

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

    // Generate blog post
    const keywordsText = keywords.length > 0 ? `\nMots-clés principaux à optimiser : ${keywords.join(', ')}` : '';
    
    const prompt = `
Tu es un expert SEO et content marketing spécialisé en e-commerce. Crée un article de blog 100% optimisé SEO pour le sujet : "${topic}"

CONTEXTE BOUTIQUE :
- Nom : ${shop.name}
- URL : ${shop.url}
- Type : ${shop.type}
- Langue : ${shop.language}
${keywordsText}
${collectionsContext}

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

Format de réponse JSON STRICT :
{
  "title": "Titre H1 optimisé avec mot-clé (max 60 char)",
  "seo_title": "Titre pour balise <title> (50-60 char)",
  "meta_description": "Meta description 155-160 caractères avec mot-clé + CTA",
  "focus_keyword": "Mot-clé principal exact",
  "excerpt": "Résumé accrocheur 150-200 caractères",
  "content": "Contenu HTML complet 1200+ mots avec <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a href='URL'>anchor text</a>",
  "internal_links": ["Lien vers collection 1", "Lien vers collection 2"],
  "seo_score": 95
}

IMPORTANT : Le contenu doit être 100% prêt à publier, optimisé pour Google, naturel et engageant.
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Tu es un expert SEO senior et content strategist spécialisé en e-commerce. Tu crées des articles 100% optimisés pour Google avec une expertise avancée en on-page SEO, sémantique et expérience utilisateur. Tous tes contenus respectent les dernières guidelines Google E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 3500,
      temperature: 0.7,
    });

    const generatedContent = completion.data.choices[0]?.message?.content?.trim();

    if (!generatedContent) {
      throw new Error('Erreur lors de la génération du contenu');
    }

    let blogPost;
    try {
      blogPost = JSON.parse(generatedContent);
    } catch {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    const slug = generateSlug(blogPost.title);

    // Save blog post to database
    const { data: savedPost, error: saveError } = await supabaseClient
      .from('blog_posts')
      .insert({
        shop_id: shopId,
        title: blogPost.title,
        slug,
        content: blogPost.content,
        excerpt: blogPost.excerpt,
        seo_title: blogPost.seo_title || blogPost.title,
        seo_description: blogPost.meta_description,
        meta_description: blogPost.meta_description,
        focus_keyword: blogPost.focus_keyword || keywords[0] || null,
        seo_score: blogPost.seo_score || 85,
        status: 'draft',
      })
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: {
          ...savedPost,
          ...blogPost
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