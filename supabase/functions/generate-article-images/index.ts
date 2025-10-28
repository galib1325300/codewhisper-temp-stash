import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImagePrompt {
  section: string;
  prompt: string;
  alt_text: string;
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

    const { postId, topic, h2Sections = [], niche = '' } = await req.json();

    console.log('Generating images for article:', { postId, topic, sectionsCount: h2Sections.length });

    // Get Lovable AI API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Determine number of images (3-5 based on content length)
    const numImages = Math.min(5, Math.max(3, Math.ceil(h2Sections.length / 2)));
    
    // Generate image prompts
    const imagePrompts: ImagePrompt[] = [];
    
    // Hero image (always included)
    imagePrompts.push({
      section: 'hero',
      prompt: `Professional e-commerce hero image for article about "${topic}". ${niche ? `Related to ${niche} niche.` : ''} IMPORTANT: NO TEXT, NO WORDS, NO LETTERS on the image. Pure visual representation only. High quality, modern, clean, web-optimized. 16:9 aspect ratio. Ultra high resolution.`,
      alt_text: `${topic} - Image principale de l'article`
    });

    // Section images (distributed throughout the article)
    const sectionsToIllustrate = h2Sections.slice(0, numImages - 1);
    for (const section of sectionsToIllustrate) {
      imagePrompts.push({
        section: section.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        prompt: `Professional e-commerce illustration for section titled "${section}" in article about "${topic}". ${niche ? `Related to ${niche} niche.` : ''} IMPORTANT: NO TEXT, NO WORDS, NO LETTERS on the image. Pure visual illustration only. High quality, informative, web-optimized. 16:9 aspect ratio. Ultra high resolution.`,
        alt_text: `${section} - Illustration pour ${topic}`
      });
    }

    console.log(`Generating ${imagePrompts.length} images...`);

    // Generate all images in parallel
    const imageGenerationPromises = imagePrompts.map(async (imagePrompt, index) => {
      console.log(`Generating image ${index + 1}/${imagePrompts.length}: ${imagePrompt.section}`);
      
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: imagePrompt.prompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI error for image ${index + 1}:`, aiResponse.status, errorText);
          throw new Error(`Erreur génération image: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          throw new Error('Pas d\'image générée dans la réponse');
        }

        // Extract base64 data
        const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!base64Match) {
          throw new Error('Format d\'image invalide');
        }

        const [, imageType, base64Data] = base64Match;
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${postId}/${imagePrompt.section}-${timestamp}.webp`;

        console.log(`Uploading image to storage: ${fileName}`);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseClient.storage
          .from('blog-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('blog-images')
          .getPublicUrl(fileName);

        console.log(`Image ${index + 1} uploaded successfully:`, publicUrl);

        return {
          url: publicUrl,
          alt: imagePrompt.alt_text,
          section: imagePrompt.section,
          position: index
        };
      } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error);
        return null;
      }
    });

    // Wait for all images to be generated
    const generatedImages = (await Promise.all(imageGenerationPromises)).filter(img => img !== null);

    console.log(`Successfully generated ${generatedImages.length}/${imagePrompts.length} images`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        images: generatedImages,
        total: generatedImages.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating article images:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Erreur lors de la génération des images' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
