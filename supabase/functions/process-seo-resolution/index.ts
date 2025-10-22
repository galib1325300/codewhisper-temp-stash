import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | undefined;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId: jId, shopId, diagnosticId, issueType, affectedItems } = await req.json();
    jobId = jId;

    console.log('Processing job:', jobId, 'with', affectedItems.length, 'items');

    // Mark job as "processing"
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', jobId);

    // Get shop details for API credentials
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error(`Shop not found: ${shopError?.message}`);
    }

    const userId = shop.user_id;

    const results = { success: [], failed: [], skipped: [] };
    const batches = chunkArray(affectedItems, 10);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} items)`);

    for (const item of batch) {
      try {
        // Process based on issue type
        const issueTypeLower = issueType.toLowerCase();
        
        if (issueTypeLower === 'images') {
          // Call generate-alt-texts for this item
          const { data: altResult, error: altError } = await supabase.functions.invoke('generate-alt-texts', {
            body: {
              productId: item.id,
              userId: userId
            }
          });

          if (altError) {
            const errorMsg = `Alt text generation failed: ${altError.message}`;
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          } else if (altResult?.success) {
            results.success.push({ id: item.id, name: item.name });
          } else {
            const errorMsg = altResult?.error || 'Unknown error';
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          }
        } else if (issueTypeLower === 'contenu' || issueTypeLower === 'génération ia') {
          // Generate both short and long descriptions
          const { data: shortResult, error: shortError } = await supabase.functions.invoke('generate-product-description', {
            body: {
              productId: item.id,
              type: 'short',
              userId: userId
            }
          });

          const { data: longResult, error: longError } = await supabase.functions.invoke('generate-product-description', {
            body: {
              productId: item.id,
              type: 'long',
              userId: userId
            }
          });

          // Consider success if at least one succeeded
          if ((shortResult?.success || longResult?.success) && !shortError && !longError) {
            results.success.push({ id: item.id, name: item.name });
          } else {
            const errorMsg = shortError?.message || longError?.message || 'Content generation failed';
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          }
        } else if (issueTypeLower === 'seo') {
          // Generate meta description
          const { data: metaResult, error: metaError } = await supabase.functions.invoke('generate-meta-description', {
            body: {
              productId: item.id,
              userId: userId
            }
          });

          if (metaError) {
            const errorMsg = `Meta description generation failed: ${metaError.message}`;
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          } else if (metaResult?.success) {
            results.success.push({ id: item.id, name: item.name });
          } else {
            const errorMsg = metaResult?.error || 'Unknown error';
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          }
        } else if (issueTypeLower === 'maillage interne') {
          // Add internal links
          const { data: linksResult, error: linksError } = await supabase.functions.invoke('add-internal-links', {
            body: {
              productId: item.id,
              shopId: shopId,
              preserveExisting: true
            }
          });

          if (linksError) {
            const errorMsg = `Internal links failed: ${linksError.message}`;
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          } else if (linksResult?.success) {
            results.success.push({ id: item.id, name: item.name });
          } else {
            const errorMsg = linksResult?.error || 'Unknown error';
            results.failed.push({ id: item.id, name: item.name, message: errorMsg });
            console.error(`Failed to process ${item.name}:`, errorMsg);
          }
        } else {
          // For other issue types, skip for now
          results.skipped.push({ id: item.id, name: item.name, message: `Issue type '${issueType}' not yet supported` });
        }

        // Update progress in DB
        const processedCount = results.success.length + results.failed.length + results.skipped.length;
        const progress = Math.round((processedCount / affectedItems.length) * 100);

        await supabase
          .from('generation_jobs')
          .update({
            processed_items: processedCount,
            success_count: results.success.length,
            failed_count: results.failed.length,
            skipped_count: results.skipped.length,
            progress,
            current_item: item.name
          })
          .eq('id', jobId);

          if (processedCount % 5 === 0) {
            console.log(`Progress: ${processedCount}/${affectedItems.length} (${progress}%)`);
          }

        } catch (error) {
          console.error('Error processing item:', item.name, error);
          results.failed.push({ id: item.id, name: item.name, message: error.message });
        }
      }

      // Pause between batches to avoid rate limiting
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Mark as completed
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        current_item: null
      })
      .eq('id', jobId);

    console.log('Job completed:', jobId, 'Success:', results.success.length, 'Failed:', results.failed.length);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing job:', error);

    // Mark job as failed
    if (jobId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
