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
            // Handle AI content generation with Lovable AI
            if (item.type === 'product') {
              const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
              
              if (!lovableApiKey) {
                throw new Error('Lovable AI non configuré');
              }

              // Generate AI content for product
              await generateAIContent(item.id, lovableApiKey, supabase);
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
  
  // Start with product name (essential for SEO)
  let meta = name
  
  // Add main category if available
  if (categories && categories.length > 0 && categories[0]?.name) {
    const categoryName = categories[0].name
    meta += ` - ${categoryName}`
  }
  
  // Extract clean description snippet
  if (description && description.length > 20) {
    const cleanDesc = description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    if (cleanDesc.length > 30) {
      // Add relevant excerpt
      const excerpt = cleanDesc.substring(0, 100).trim()
      meta += `. ${excerpt}`
      if (cleanDesc.length > 100) {
        meta += '...'
      }
    }
  }
  
  // Add call-to-action if there's space (optimal length: 120-160 chars)
  if (meta.length < 130) {
    meta += ' | Livraison rapide ✓ Qualité garantie'
  } else if (meta.length < 145) {
    meta += ' | Livraison rapide'
  }
  
  // Ensure optimal SEO length (120-160 characters)
  if (meta.length > 160) {
    meta = meta.substring(0, 157) + '...'
  }
  
  console.log(`Generated meta description for "${name}": ${meta.length} chars`)
  return meta
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

// Helper function to generate AI content with Lovable AI
async function generateAIContent(productId: string, lovableApiKey: string, supabase: any) {
  // Fetch complete product details
  const { data: product } = await supabase
    .from('products')
    .select('name, description, price, regular_price, categories, images, sku')
    .eq('id', productId)
    .single();

  if (!product) {
    throw new Error('Product not found');
  }

  // Build context for AI
  const categoryNames = product.categories?.map((c: any) => c.name).join(', ') || 'Aucune catégorie';
  const priceInfo = product.price ? `${product.price}€` : 'Prix non défini';
  const existingDesc = product.description?.replace(/<[^>]*>/g, '').substring(0, 200) || '';

  const prompt = `Génère une description de produit e-commerce optimisée SEO en français.

INFORMATIONS DU PRODUIT :
- Nom : ${product.name}
- Catégories : ${categoryNames}
- Prix : ${priceInfo}
${existingDesc ? `- Description existante (pour référence) : ${existingDesc}` : ''}

CONSIGNES STRICTES :
1. Commence TOUJOURS par le nom du produit
2. Inclus les mots-clés : nom du produit, catégories principales
3. Longueur : 120-160 caractères (optimal pour SEO)
4. Style : professionnel, engageant, orienté vente
5. Structure : [Nom] - [Bénéfice principal]. [Caractéristique clé] | [Call-to-action court]
6. Utilise des émojis si pertinent (1-2 max)
7. PAS de phrases génériques type "Découvrez ce produit"

EXEMPLE DE FORMAT :
"Nom du Produit - Qualité premium pour [usage]. Matériau [X], design [Y]. Livraison rapide ✓"

Génère UNIQUEMENT la description, sans introduction ni explication.`;

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
          content: 'Tu es un expert en rédaction de fiches produits e-commerce optimisées SEO. Tu génères des descriptions courtes, percutantes et riches en mots-clés pertinents.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('Lovable AI error:', aiResponse.status, errorText);
    throw new Error(`Lovable AI error: ${aiResponse.statusText}`);
  }

  const aiData = await aiResponse.json();
  const generatedContent = aiData.choices[0]?.message?.content?.trim();

  if (!generatedContent) {
    throw new Error('No content generated by AI');
  }

  // Ensure optimal length for SEO (120-160 chars)
  let finalContent = generatedContent;
  if (finalContent.length > 160) {
    finalContent = finalContent.substring(0, 157) + '...';
  }

  console.log(`Generated AI content for ${product.name}: ${finalContent.length} chars`);

  // Update product with generated content
  const { error: updateError } = await supabase
    .from('products')
    .update({ 
      short_description: finalContent,
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

  // Recalculate counters - count issue CATEGORIES, not individual items
  let errorsCount = 0;
  let warningsCount = 0;
  let infoCount = 0;
  let totalItemsCount = 0;

  updatedIssues.forEach((issue: any) => {
    const itemsCount = issue.affected_items?.length || 0;
    if (itemsCount > 0) {
      // Count 1 per category, not per item
      switch (issue.type) {
        case 'error':
          errorsCount += 1;
          break;
        case 'warning':
          warningsCount += 1;
          break;
        case 'info':
          infoCount += 1;
          break;
      }
      totalItemsCount += itemsCount;
    }
  });

  const totalIssues = errorsCount + warningsCount + infoCount;

  // Calculate SEO score: -15 per error category, -8 per warning category, -3 per info category
  let score = 100 - (errorsCount * 15) - (warningsCount * 8) - (infoCount * 3);
  score = Math.max(0, score);

  console.log(`Score calculation: ${errorsCount} errors, ${warningsCount} warnings, ${infoCount} info → Score: ${score}/100 (${totalItemsCount} items affected)`);

  // Update diagnostic in database
  const { error: updateError } = await supabase
    .from('seo_diagnostics')
    .update({
      issues: updatedIssues,
      errors_count: errorsCount,
      warnings_count: warningsCount,
      info_count: infoCount,
      total_issues: totalIssues,
      score: score,
      updated_at: new Date().toISOString()
    })
    .eq('id', diagnosticId);

  if (updateError) {
    throw updateError;
  }

  console.log(`Updated diagnostic ${diagnosticId}: removed ${resolvedItemIds.length} items from ${issueType}`);
}
