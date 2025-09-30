import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResolutionRequest {
  shopId: string;
  diagnosticId: string;
  issueType: string;
  affectedItems: Array<{
    id: string;
    type: 'product' | 'collection' | 'blog';
    name: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { shopId, diagnosticId, issueType, affectedItems }: ResolutionRequest = await req.json()
    console.log('Resolving SEO issues:', { shopId, diagnosticId, issueType, affectedItems: affectedItems.length })

    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{ id: string; success: boolean; message: string }>
    }

    // Process each affected item based on issue type
    for (const item of affectedItems) {
      try {
        let updateResult;

        switch (issueType) {
          case 'Images':
            // Generate alt texts for missing images
            if (item.type === 'product') {
              const { data: product } = await supabase
                .from('products')
                .select('images, name')
                .eq('id', item.id)
                .single()

              if (product?.images && Array.isArray(product.images)) {
                const updatedImages = product.images.map((img: any, index: number) => ({
                  ...img,
                  alt: img.alt || `${product.name} - Image ${index + 1}`
                }))

                updateResult = await supabase
                  .from('products')
                  .update({ images: updatedImages })
                  .eq('id', item.id)
              }
            }
            break;

          case 'Contenu':
            // Generate basic structured content
            if (item.type === 'product') {
              const { data: product } = await supabase
                .from('products')
                .select('description, name, price')
                .eq('id', item.id)
                .single()

              if (product) {
                const enhancedDescription = generateStructuredDescription(product)
                updateResult = await supabase
                  .from('products')
                  .update({ description: enhancedDescription })
                  .eq('id', item.id)
              }
            }
            break;

          case 'SEO':
            // Generate meta descriptions
            if (item.type === 'product') {
              const { data: product } = await supabase
                .from('products')
                .select('name, description, categories')
                .eq('id', item.id)
                .single()

              if (product) {
                const metaDescription = generateMetaDescription(product)
                updateResult = await supabase
                  .from('products')
                  .update({ short_description: metaDescription })
                  .eq('id', item.id)
              }
            }
            break;

          case 'Structure':
            // Add structure to descriptions
            if (item.type === 'product') {
              const { data: product } = await supabase
                .from('products')
                .select('description, name')
                .eq('id', item.id)
                .single()

              if (product?.description) {
                const structuredDescription = addStructureToDescription(product.description, product.name)
                updateResult = await supabase
                  .from('products')
                  .update({ description: structuredDescription })
                  .eq('id', item.id)
              }
            }
            break;

          case 'Maillage interne':
            // Add internal links to content
            if (item.type === 'product') {
              const { data: product } = await supabase
                .from('products')
                .select('description, name, categories')
                .eq('id', item.id)
                .single()

              if (product?.description) {
                const enhancedDescription = addInternalLinks(product.description, product.name, product.categories)
                updateResult = await supabase
                  .from('products')
                  .update({ description: enhancedDescription })
                  .eq('id', item.id)
              }
            }
            break;

          case 'Génération IA':
            // Handle AI content generation
            if (item.type === 'product') {
              // Get OpenAI API key from shop or profile
              const { data: shop } = await supabase
                .from('shops')
                .select('openai_api_key, user_id')
                .eq('id', shopId)
                .single();

              let openaiApiKey = shop?.openai_api_key;
              
              if (!openaiApiKey) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('openai_api_key')
                  .eq('user_id', shop?.user_id)
                  .single();
                
                openaiApiKey = profile?.openai_api_key;
              }

              if (!openaiApiKey) {
                throw new Error('Clé API OpenAI manquante');
              }

              // Generate AI content for product
              await generateAIContent(item.id, openaiApiKey, supabase);
              updateResult = { error: null }; // Mark as successful
            }
            break;

          default:
            throw new Error(`Issue type not supported for auto-resolution: ${issueType}`)
        }

        if (updateResult && !updateResult.error) {
          results.success++
          results.details.push({
            id: item.id,
            success: true,
            message: 'Problème résolu automatiquement'
          })
        } else {
          throw new Error(updateResult?.error?.message || 'Échec de la mise à jour')
        }

      } catch (error) {
        console.error(`Error resolving issue for item ${item.id}:`, error)
        results.failed++
        results.details.push({
          id: item.id,
          success: false,
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    }

    // Update the diagnostic with resolved items
    if (results.success > 0 && diagnosticId) {
      try {
        await updateDiagnostic(supabase, diagnosticId, issueType, results.details.filter(d => d.success).map(d => d.id));
      } catch (updateError) {
        console.error('Error updating diagnostic:', updateError);
        // Don't fail the entire request if diagnostic update fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.success} éléments traités avec succès, ${results.failed} échecs`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in auto-resolution:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la résolution automatique'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function generateStructuredDescription(product: any): string {
  const { name, description = '', price } = product
  
  let enhanced = `# ${name}\n\n`
  
  if (description) {
    enhanced += `## Description\n${description}\n\n`
  }
  
  enhanced += `## Caractéristiques principales\n`
  enhanced += `• Produit de qualité supérieure\n`
  enhanced += `• Satisfaction garantie\n`
  enhanced += `• Livraison rapide disponible\n\n`
  
  if (price) {
    enhanced += `## Prix\n`
    enhanced += `À partir de ${price}€\n\n`
  }
  
  enhanced += `## Pourquoi choisir ce produit ?\n`
  enhanced += `Ce ${name.toLowerCase()} a été sélectionné pour sa qualité exceptionnelle et sa valeur ajoutée.\n`
  
  return enhanced
}

function generateMetaDescription(product: any): string {
  const { name, description = '', categories = [] } = product
  
  let meta = `Découvrez ${name}`
  
  if (categories.length > 0) {
    meta += ` - ${categories[0].name}`
  }
  
  if (description && description.length > 50) {
    const cleanDesc = description.replace(/<[^>]*>/g, '').substring(0, 80)
    meta += `. ${cleanDesc}...`
  }
  
  meta += ' Livraison rapide et satisfaction garantie.'
  
  // Keep within SEO limits
  return meta.substring(0, 160)
}

function addStructureToDescription(description: string, productName: string): string {
  // Simple structure addition
  const paragraphs = description.split('\n').filter(p => p.trim())
  
  if (paragraphs.length <= 1) {
    return `## ${productName}\n\n${description}\n\n### Avantages\n• Qualité premium\n• Satisfaction garantie\n• Support client dédié`
  }
  
  let structured = `## ${productName}\n\n`
  structured += paragraphs[0] + '\n\n'
  
  if (paragraphs.length > 1) {
    structured += '### Détails\n'

    paragraphs.slice(1).forEach(p => {
      structured += `• ${p}\n`
    })
  }
  
  return structured
}

// Function to add internal links to content
function addInternalLinks(description: string, productName: string, categories: any[]): string {
  let enhanced = description;
  
  // Add category-based internal links
  if (categories && categories.length > 0) {
    const categoryName = categories[0].name;
    if (!enhanced.includes(`collection/${categoryName}`)) {
      enhanced += `\n\n### Voir aussi\n`;
      enhanced += `Découvrez notre [collection ${categoryName}](/collections/${categoryName.toLowerCase().replace(/\s+/g, '-')}) pour plus de produits similaires.\n`;
      enhanced += `Pour des conseils d'utilisation, consultez notre [guide d'achat](/guides/${categoryName.toLowerCase().replace(/\s+/g, '-')}).\n`;
    }
  }
  
  return enhanced;
}

// Helper function to generate AI content
async function generateAIContent(productId: string, openaiApiKey: string, supabase: any) {
  const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Vous êtes un expert en rédaction de contenu e-commerce. Générez des descriptions de produits attrayantes et optimisées SEO.'
        },
        {
          role: 'user',
          content: `Générez une description courte et optimisée SEO pour ce produit (ID: ${productId}). La description doit être engageante, inclure des mots-clés pertinents et être entre 150-200 caractères.`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    }),
  });

  if (!openAIResponse.ok) {
    throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
  }

  const openAIData = await openAIResponse.json();
  const generatedContent = openAIData.choices[0]?.message?.content?.trim();

  if (!generatedContent) {
    throw new Error('No content generated by AI');
  }

  // Update product with generated content
  const { error: updateError } = await supabase
    .from('products')
    .update({ 
      short_description: generatedContent,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (updateError) {
    throw updateError;
  }
}

// Function to update diagnostic after resolving issues
async function updateDiagnostic(supabase: any, diagnosticId: string, issueType: string, resolvedItemIds: string[]) {
  // Fetch current diagnostic
  const { data: diagnostic, error: fetchError } = await supabase
    .from('seo_diagnostics')
    .select('issues, errors_count, warnings_count, info_count, total_issues')
    .eq('id', diagnosticId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!diagnostic || !Array.isArray(diagnostic.issues)) {
    return;
  }

  // Find and update the specific issue
  let updatedIssues = diagnostic.issues.map((issue: any) => {
    if (issue.category === issueType) {
      // Filter out resolved items
      const remainingItems = (issue.affected_items || []).filter(
        (item: any) => !resolvedItemIds.includes(item.id)
      );
      
      return {
        ...issue,
        affected_items: remainingItems
      };
    }
    return issue;
  });

  // Remove issues that have no more affected items
  updatedIssues = updatedIssues.filter((issue: any) => 
    !issue.affected_items || issue.affected_items.length > 0
  );

  // Recalculate counters
  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;

  updatedIssues.forEach((issue: any) => {
    const itemsCount = issue.affected_items?.length || 0;
    switch (issue.type) {
      case 'error':
        errorsCount += itemsCount;
        break;
      case 'warning':
        warningsCount += itemsCount;
        break;
      case 'info':
        infoCount += itemsCount;
        break;
    }
  });

  const totalIssues = errorsCount + warningsCount + infoCount;

  // Update diagnostic in database
  const { error: updateError } = await supabase
    .from('seo_diagnostics')
    .update({
      issues: updatedIssues,
      errors_count: errorsCount,
      warnings_count: warningsCount,
      info_count: infoCount,
      total_issues: totalIssues,
      updated_at: new Date().toISOString()
    })
    .eq('id', diagnosticId);

  if (updateError) {
    throw updateError;
  }

  console.log(`Updated diagnostic ${diagnosticId}: removed ${resolvedItemIds.length} items from ${issueType}`);
}
