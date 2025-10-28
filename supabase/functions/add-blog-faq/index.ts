import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, shopId, content, topic, focusKeyword } = await req.json();

    if (!postId || !shopId || !content) {
      return new Response(JSON.stringify({ error: 'postId, shopId et content sont requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting FAQ generation for post:', postId);

    // Get shop data
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return new Response(JSON.stringify({ error: 'Boutique non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract key topics from content for better FAQ generation
    const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 1500);

    const prompt = `Tu es un expert SEO spécialisé en création de FAQ optimisées pour les Featured Snippets Google.

ARTICLE À ANALYSER:
Titre: ${topic}
Mot-clé principal: ${focusKeyword || 'Non spécifié'}
Contenu (extrait): ${cleanContent}...

CONTEXTE BOUTIQUE:
- Nom: ${shop.name}
- Type: ${shop.type}
- Langue: ${shop.language}

MISSION: Génère 5-7 questions/réponses FAQ optimisées SEO pour cet article.

CRITÈRES OBLIGATOIRES (Featured Snippets optimized):

1. 📊 QUESTIONS STRATÉGIQUES:
   - Utilise des questions longue traîne que les utilisateurs recherchent vraiment
   - Varie les types: "Comment...", "Pourquoi...", "Quelle est...", "Quand...", "Où..."
   - Inclus le mot-clé principal dans 2-3 questions maximum (naturellement)
   - Inclus des variations et mots-clés secondaires
   - Chaque question doit être unique et pertinente

2. ✅ RÉPONSES CONCISES & PRÉCISES:
   - 40-60 mots par réponse (optimal pour Featured Snippets)
   - Commence directement par l'information (pas de "La réponse est...")
   - Structure claire: définition puis contexte/exemple
   - Langage simple et accessible
   - Utilise des chiffres et listes quand pertinent

3. 🎯 OPTIMISATION SEO:
   - Réponds EXACTEMENT à la question posée
   - Utilise le mot-clé naturellement dans 1-2 réponses
   - Évite le keyword stuffing
   - Ton professionnel mais accessible
   - Apporte une vraie valeur ajoutée

4. 📋 STRUCTURE HTML:
   - Format HTML sémantique avec balises appropriées
   - Structure facilement parsable par Google

EXEMPLE DE STRUCTURE ATTENDUE:
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2>Questions Fréquentes</h2>
  
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">Comment choisir le bon produit X pour Y ?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <div itemprop="text">
        <p>Pour choisir le bon produit X, considérez d'abord vos besoins spécifiques en Y. Les critères essentiels incluent...</p>
      </div>
    </div>
  </div>
  
  <!-- Répéter pour chaque question -->
</div>

Format de réponse JSON STRICT:
{
  "faq": {
    "questions": [
      {
        "question": "Question optimisée longue traîne ?",
        "answer": "Réponse concise 40-60 mots avec information directe et précise.",
        "keywords": ["mot-clé1", "mot-clé2"]
      }
    ]
  },
  "html": "<div class='faq-section' itemscope itemtype='https://schema.org/FAQPage'>...</div>",
  "schema_json_ld": {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Question ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Réponse"
        }
      }
    ]
  }
}

IMPORTANT: Les questions doivent être VRAIMENT pertinentes pour le sujet et apporter de la valeur. Pas de questions génériques !`;

    console.log('Calling Lovable AI for FAQ generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Tu es un expert SEO et content strategist spécialisé en création de FAQ optimisées pour les Featured Snippets Google. Tu maîtrises parfaitement les structured data schema.org.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 402) {
        throw new Error('Crédits Lovable AI épuisés. Veuillez recharger vos crédits.');
      } else if (aiResponse.status === 429) {
        throw new Error('Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.');
      }
      
      throw new Error(`Erreur API Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content?.trim();

    if (!aiContent) {
      throw new Error('Pas de réponse de l\'IA');
    }

    console.log('AI response received, parsing FAQ...');

    let faqData;
    try {
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      faqData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw AI response:', aiContent.substring(0, 500));
      throw new Error('Format de réponse invalide de l\'IA');
    }

    // Détecter FAQ existante
    const hasFaqSection = /<div[^>]*class\s*=\s*["'][^"']*faq-section[^"']*["'][^>]*>/i.test(content);
    const hasFaqHeading = /<h[23][^>]*>.*?(faq|questions?\s+fr[eé]quentes?).*?<\/h[23]>/is.test(content);
    const hasJsonLdFaq = content.includes('application/ld+json') && content.includes('FAQPage');

    if (hasFaqSection || hasFaqHeading) {
      if (hasJsonLdFaq) {
        // FAQ complète déjà présente
        console.log('FAQ already exists with schema, skipping...');
        return new Response(JSON.stringify({
          success: true,
          message: 'Une FAQ avec schema est déjà présente',
          content: content,
          faqCount: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // FAQ visuelle présente mais sans JSON-LD → ajouter seulement le schema
        console.log('FAQ exists but missing JSON-LD, adding schema only...');
        const schemaScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(faqData.schema_json_ld, null, 2)}\n</script>`;
        const updatedContent = content + schemaScript;
        
        // Update the blog post with schema
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ 
            content: updatedContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId);

        if (updateError) {
          console.error('Error updating post with schema:', updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ 
          success: true,
          content: updatedContent,
          faqCount: faqData.faq.questions.length,
          questions: faqData.faq.questions,
          schema: faqData.schema_json_ld,
          message: `Schema JSON-LD ajouté pour ${faqData.faq.questions.length} questions FAQ existantes`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert FAQ section before the conclusion or at the end
    let updatedContent = content;
    
    // Try to find conclusion section (H2 with "Conclusion" or similar)
    const conclusionRegex = /<h2[^>]*>.*?(conclusion|pour conclure|en résumé).*?<\/h2>/i;
    const hasConclusion = conclusionRegex.test(content);

    if (hasConclusion) {
      // Insert FAQ before conclusion
      updatedContent = content.replace(conclusionRegex, `${faqData.html}\n\n$&`);
    } else {
      // Append FAQ at the end
      updatedContent = `${content}\n\n${faqData.html}`;
    }

    // Add JSON-LD schema to the content
    const schemaScript = `\n\n<script type="application/ld+json">\n${JSON.stringify(faqData.schema_json_ld, null, 2)}\n</script>`;
    updatedContent += schemaScript;

    // Update the blog post with FAQ
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ 
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post with FAQ:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✓ Successfully added ${faqData.faq.questions.length} FAQ items to post`);

    return new Response(JSON.stringify({ 
      success: true,
      content: updatedContent,
      faqCount: faqData.faq.questions.length,
      questions: faqData.faq.questions,
      schema: faqData.schema_json_ld,
      message: `${faqData.faq.questions.length} questions FAQ ajoutées avec succès`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in add-blog-faq:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
