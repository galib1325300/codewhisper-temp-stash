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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending jobs (limit to 5 concurrent processing)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('product_generation_jobs')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (fetchError) {
      console.error('Error fetching pending jobs:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending jobs', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${pendingJobs.length} jobs`);

    // Process each job
    const results = await Promise.allSettled(
      pendingJobs.map(async (job) => {
        try {
          // Mark as processing
          await supabase
            .from('product_generation_jobs')
            .update({ status: 'processing', started_at: new Date().toISOString() })
            .eq('id', job.id);

          // Process based on action type
          let success = false;
          let errorMessage = null;

          switch (job.action) {
            case 'complete':
              success = await processComplete(supabase, job);
              break;
            case 'long_descriptions':
              success = await processDescription(supabase, job, 'long');
              break;
            case 'short_descriptions':
              success = await processDescription(supabase, job, 'short');
              break;
            case 'alt_images':
              success = await processAltImages(supabase, job);
              break;
            case 'internal_linking':
              success = await processInternalLinking(supabase, job);
              break;
            case 'translate':
              success = await processTranslation(supabase, job);
              break;
            default:
              errorMessage = `Unknown action: ${job.action}`;
          }

          // Update job status
          await supabase
            .from('product_generation_jobs')
            .update({
              status: success ? 'completed' : 'failed',
              completed_at: new Date().toISOString(),
              error_message: errorMessage
            })
            .eq('id', job.id);

          return { jobId: job.id, success };
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          await supabase
            .from('product_generation_jobs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', job.id);
          return { jobId: job.id, success: false, error: error.message };
        }
      })
    );

    return new Response(JSON.stringify({
      processed: pendingJobs.length,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-generation-queue:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processComplete(supabase: any, job: any): Promise<boolean> {
  // Generate short description
  const shortResult = await supabase.functions.invoke('generate-product-description', {
    body: { productId: job.product_id, type: 'short', userId: job.created_by }
  });
  
  if (shortResult.error) throw new Error(shortResult.error);

  // Generate long description
  const longResult = await supabase.functions.invoke('generate-product-description', {
    body: { productId: job.product_id, type: 'long', userId: job.created_by }
  });
  
  if (longResult.error) throw new Error(longResult.error);

  // Generate meta description
  const metaResult = await supabase.functions.invoke('generate-meta-description', {
    body: { productId: job.product_id, userId: job.created_by }
  });
  
  if (metaResult.error) throw new Error(metaResult.error);

  // Generate alt texts
  const altResult = await supabase.functions.invoke('generate-alt-texts', {
    body: { productId: job.product_id, userId: job.created_by }
  });
  
  if (altResult.error) throw new Error(altResult.error);

  return true;
}

async function processDescription(supabase: any, job: any, type: string): Promise<boolean> {
  const result = await supabase.functions.invoke('generate-product-description', {
    body: { productId: job.product_id, type, userId: job.created_by }
  });
  
  if (result.error) throw new Error(result.error);
  return true;
}

async function processAltImages(supabase: any, job: any): Promise<boolean> {
  const result = await supabase.functions.invoke('generate-alt-texts', {
    body: { productId: job.product_id, userId: job.created_by }
  });
  
  if (result.error) throw new Error(result.error);
  return true;
}

async function processInternalLinking(supabase: any, job: any): Promise<boolean> {
  const result = await supabase.functions.invoke('add-internal-links', {
    body: { 
      productId: job.product_id, 
      shopId: job.shop_id,
      preserveExisting: job.preserve_internal_links 
    }
  });
  
  if (result.error) throw new Error(result.error);
  return true;
}

async function processTranslation(supabase: any, job: any): Promise<boolean> {
  const result = await supabase.functions.invoke('translate-product', {
    body: { 
      productId: job.product_id, 
      language: job.language,
      preserveInternalLinks: job.preserve_internal_links 
    }
  });
  
  if (result.error) throw new Error(result.error);
  return true;
}