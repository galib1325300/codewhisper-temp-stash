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

    // Mark job as "processing" with heartbeat
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString()
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
      const correlationId = `${jobId}-${batch.indexOf(item)}`;
      
      try {
        // Update heartbeat
        await supabase
          .from('generation_jobs')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('id', jobId);

        // Process based on issue type
        const issueTypeLower = issueType.toLowerCase();
        console.log(`[${correlationId}] Processing item:`, item.name);
        
        // Create timeout promise (25 seconds per item)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Item processing timeout')), 25000)
        );
        
        let result;
        
        if (issueTypeLower === 'images') {
          // Call generate-alt-texts for this item
          const processPromise = supabase.functions.invoke('generate-alt-texts', {
            body: {
              productId: item.id,
              userId: userId
            }
          });

          try {
            result = await Promise.race([processPromise, timeoutPromise]);
            const { data: altResult, error: altError } = result;
            
            if (altError) {
              const errorMsg = `Alt text generation failed: ${altError.message}`;
              
              // Handle rate limiting gracefully
              if (altError.message?.includes('429') || altError.message?.includes('Rate limit')) {
                console.warn(`[${correlationId}] Rate limited, will retry later`);
                results.skipped.push({ id: item.id, name: item.name, message: 'Rate limit - will retry' });
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before next
              } else if (altError.message?.includes('402') || altError.message?.includes('credits')) {
                console.error(`[${correlationId}] Insufficient credits`);
                results.failed.push({ id: item.id, name: item.name, message: 'Insufficient credits' });
              } else {
                results.failed.push({ id: item.id, name: item.name, message: errorMsg });
                console.error(`[${correlationId}] Failed:`, errorMsg);
              }
            } else if (altResult?.success) {
              results.success.push({ id: item.id, name: item.name });
              console.log(`[${correlationId}] Success`);
            } else {
              const errorMsg = altResult?.error || 'Unknown error';
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            }
          } catch (err) {
            if (err.message === 'Item processing timeout') {
              console.warn(`[${correlationId}] Timeout, marking as skipped`);
              results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
            } else {
              throw err;
            }
          }
        } else if (issueTypeLower === 'contenu' || issueTypeLower === 'génération ia') {
          const processPromise = Promise.all([
            supabase.functions.invoke('generate-product-description', {
              body: { productId: item.id, type: 'short', userId }
            }),
            supabase.functions.invoke('generate-product-description', {
              body: { productId: item.id, type: 'long', userId }
            })
          ]);

          try {
            const result = await Promise.race([processPromise, timeoutPromise]);
            const [shortResult, longResult] = result as any;
            
            if ((shortResult.data?.success || longResult.data?.success) && !shortResult.error && !longResult.error) {
              results.success.push({ id: item.id, name: item.name });
              console.log(`[${correlationId}] Success`);
            } else {
              const errorMsg = shortResult.error?.message || longResult.error?.message || 'Content generation failed';
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            }
          } catch (err) {
            if (err.message === 'Item processing timeout') {
              console.warn(`[${correlationId}] Timeout, marking as skipped`);
              results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
            } else {
              throw err;
            }
          }
        } else if (issueTypeLower === 'seo') {
          const processPromise = supabase.functions.invoke('generate-meta-description', {
            body: { productId: item.id, userId }
          });

          try {
            const result = await Promise.race([processPromise, timeoutPromise]);
            const { data: metaResult, error: metaError } = result;
            
            if (metaError) {
              const errorMsg = `Meta description generation failed: ${metaError.message}`;
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            } else if (metaResult?.success) {
              results.success.push({ id: item.id, name: item.name });
              console.log(`[${correlationId}] Success`);
            } else {
              const errorMsg = metaResult?.error || 'Unknown error';
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            }
          } catch (err) {
            if (err.message === 'Item processing timeout') {
              console.warn(`[${correlationId}] Timeout, marking as skipped`);
              results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
            } else {
              throw err;
            }
          }
        } else if (issueTypeLower === 'maillage interne') {
          const processPromise = supabase.functions.invoke('add-internal-links', {
            body: { productId: item.id, userId }
          });

          try {
            const result = await Promise.race([processPromise, timeoutPromise]);
            const { data: linksResult, error: linksError } = result;
            
            if (linksError) {
              const errorMsg = `Internal links failed: ${linksError.message}`;
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            } else if (linksResult?.success) {
              if (linksResult.linksAdded === 0 || linksResult.message?.includes('already has')) {
                results.skipped.push({ id: item.id, name: item.name, message: 'Links already present' });
                console.log(`[${correlationId}] Skipped: links already present`);
              } else if (!linksResult.remoteUpdated) {
                results.success.push({ id: item.id, name: item.name, warning: 'DB updated but remote sync failed' });
                console.warn(`[${correlationId}] Partial success: DB ok, remote failed`);
              } else {
                results.success.push({ id: item.id, name: item.name });
                console.log(`[${correlationId}] Success`);
              }
            } else {
              const errorMsg = linksResult?.error || 'Unknown error';
              results.failed.push({ id: item.id, name: item.name, message: errorMsg });
              console.error(`[${correlationId}] Failed:`, errorMsg);
            }
          } catch (err) {
            if (err.message === 'Item processing timeout') {
              console.warn(`[${correlationId}] Timeout, marking as skipped`);
              results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
            } else {
              throw err;
            }
          }
        } else if (issueTypeLower === 'mise en forme' || issueTypeLower === 'structure') {
          const processPromise = supabase.functions.invoke('format-product-content', {
            body: { productId: item.id, userId }
          });

          try {
            const result = await Promise.race([processPromise, timeoutPromise]);
            const { data: formatResult, error: formatError } = result;
            
            if (formatError) {
              if (formatError.message?.includes('429') || formatError.message?.includes('Rate limit')) {
                results.skipped.push({ id: item.id, name: item.name, message: 'Rate limit - will retry' });
                await new Promise(resolve => setTimeout(resolve, 2000));
              } else {
                const errorMsg = `Format failed: ${formatError.message}`;
                results.failed.push({ id: item.id, name: item.name, message: errorMsg });
                console.error(`[${correlationId}] Failed:`, errorMsg);
              }
            } else if (formatResult?.success) {
              if (!formatResult.remoteUpdated) {
                results.success.push({ id: item.id, name: item.name, warning: 'DB updated but remote sync failed' });
                console.warn(`[${correlationId}] Partial success: DB ok, remote failed`);
              } else {
                results.success.push({ id: item.id, name: item.name });
                console.log(`[${correlationId}] Success`);
              }
            } else {
              results.failed.push({ id: item.id, name: item.name, message: 'Format failed' });
            }
          } catch (err) {
            if (err.message === 'Item processing timeout') {
              console.warn(`[${correlationId}] Timeout, marking as skipped`);
              results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
            } else {
              throw err;
            }
          }
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
          if (error.message === 'Item processing timeout') {
            console.log(`[${correlationId}] Item timed out, marking as skipped`);
            results.skipped.push({ id: item.id, name: item.name, message: 'Timeout' });
          } else {
            results.failed.push({ id: item.id, name: item.name, message: error.message });
          }
        }
      }

      // Pause between batches to avoid rate limiting
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update diagnostic with results
    console.log('Updating diagnostic with job results...');
    const { data: diagnostic, error: diagError } = await supabase
      .from('seo_diagnostics')
      .select('issues')
      .eq('id', diagnosticId)
      .single();

    if (!diagError && diagnostic) {
      const issues = Array.isArray(diagnostic.issues) ? diagnostic.issues : [];
      
      // Find and update the issue
      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        if (issue.category === issueType || issue.title?.toLowerCase().includes(issueType.toLowerCase())) {
          // Assign default maxPoints if not set (15 points per issue)
          if (issue.maxPoints === undefined || issue.maxPoints === null) {
            issue.maxPoints = 15;
          }
          
          // Calculate progress and update earnedPoints
          const progressRatio = results.success.length / affectedItems.length;
          issue.earnedPoints = Math.round((issue.maxPoints || 0) * progressRatio);
          
          // Mark as resolved if 100% success
          if (results.success.length === affectedItems.length) {
            issue.type = 'success';
            issue.resolved = true;
            issue.earnedPoints = issue.maxPoints;
          } else if (results.success.length > 0) {
            // Partial success - keep as error/warning but update earnedPoints
            issue.type = issue.type || 'warning';
          }
          
          issues[i] = issue;
          break;
        }
      }

      // Recalculate score - assign default maxPoints to issues that don't have it
      let totalMaxPoints = 0;
      let totalEarnedPoints = 0;
      let errorsCount = 0;
      let warningsCount = 0;
      let infoCount = 0;

      issues.forEach((iss: any) => {
        // Assign default maxPoints if not set
        if (iss.maxPoints === undefined || iss.maxPoints === null) {
          iss.maxPoints = 15;
        }
        if (iss.earnedPoints === undefined || iss.earnedPoints === null) {
          iss.earnedPoints = 0;
        }
        
        totalMaxPoints += iss.maxPoints;
        totalEarnedPoints += iss.earnedPoints;
        
        if (iss.type === 'error') errorsCount++;
        else if (iss.type === 'warning') warningsCount++;
        else if (iss.type === 'info') infoCount++;
        else if (iss.type === 'success') {
          // Success issues are not errors/warnings
        }
      });

      const newScore = totalMaxPoints > 0 
        ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) 
        : 0;

      // Update diagnostic
      await supabase
        .from('seo_diagnostics')
        .update({
          issues,
          score: newScore,
          errors_count: errorsCount,
          warnings_count: warningsCount,
          info_count: infoCount,
          total_issues: errorsCount + warningsCount + infoCount
        })
        .eq('id', diagnosticId);

      console.log(`Diagnostic updated: new score ${newScore}`);
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
