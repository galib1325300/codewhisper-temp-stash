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

    const results = { success: [], failed: [], skipped: [] };
    const batches = chunkArray(affectedItems, 10);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} items)`);

      for (const item of batch) {
        try {
          // Process based on issue type
          if (issueType.toLowerCase() === 'images') {
            // Call generate-alt-texts for this item
            const { data: altResult, error: altError } = await supabase.functions.invoke('generate-alt-texts', {
              body: {
                shopId,
                productId: item.id,
                generateFor: 'all'
              }
            });

            if (altError) {
              throw new Error(`Alt text generation failed: ${altError.message}`);
            }

            if (altResult?.success) {
              results.success.push({ id: item.id, name: item.name });
            } else {
              throw new Error(altResult?.error || 'Unknown error');
            }
          } else {
            // For other issue types, skip for now
            results.skipped.push({ id: item.id, name: item.name, message: 'Issue type not yet supported' });
          }

          // Update progress in DB
          const processedCount = results.success.length + results.failed.length;
          const progress = Math.round((processedCount / affectedItems.length) * 100);

          await supabase
            .from('generation_jobs')
            .update({
              processed_items: processedCount,
              success_count: results.success.length,
              failed_count: results.failed.length,
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
