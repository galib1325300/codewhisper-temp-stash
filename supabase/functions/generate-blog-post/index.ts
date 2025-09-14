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

    const { shopId, topic, keywords = [] } = await req.json();

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

    // Generate blog post
    const keywordsText = keywords.length > 0 ? `Mots-clés à inclure : ${keywords.join(', ')}` : '';
    
    const prompt = `
Créez un article de blog SEO optimisé pour une boutique e-commerce sur le sujet : "${topic}"

Contexte de la boutique :
- Nom : ${shop.name}
- URL : ${shop.url}
- Type : ${shop.type}
- Langue : ${shop.language}

${keywordsText}

L'article doit contenir :
1. Un titre accrocheur et optimisé SEO (H1)
2. Une meta description (150-160 caractères)
3. Une introduction engageante
4. 3-4 sections avec sous-titres (H2)
5. Une conclusion avec call-to-action
6. Entre 800-1200 mots
7. Ton professionnel mais accessible
8. Optimisé pour le SEO et l'engagement

Format de réponse JSON :
{
  "title": "Titre de l'article",
  "meta_description": "Meta description SEO",
  "excerpt": "Résumé court de l'article",
  "content": "Contenu complet en HTML avec balises H2, H3, p, ul, li, etc.",
  "seo_title": "Titre SEO optimisé"
}
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Vous êtes un expert en content marketing et SEO. Vous créez des articles de blog optimisés pour les moteurs de recherche et l'engagement des lecteurs."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
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
        seo_title: blogPost.seo_title,
        seo_description: blogPost.meta_description,
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
        error: error.message || 'Erreur lors de la génération' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});