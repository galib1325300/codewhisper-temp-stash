import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { shopId, diagnosticId, issueType, affectedItems } = await req.json();

    console.log('Queueing SEO resolution job:', { shopId, issueType, totalItems: affectedItems.length });

    // Check for existing active jobs for same diagnostic + issue type (anti-collision)
    const { data: existingJobs, error: checkError } = await supabase
      .from('generation_jobs')
      .select('id, status')
      .eq('diagnostic_id', diagnosticId)
      .eq('type', issueType.toLowerCase())
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (!checkError && existingJobs && existingJobs.length > 0) {
      console.warn('Job already in progress:', existingJobs[0].id);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Un job similaire est déjà en cours. Veuillez attendre qu\'il se termine.',
          existingJobId: existingJobs[0].id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create a job in the database
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        shop_id: shopId,
        diagnostic_id: diagnosticId,
        type: issueType.toLowerCase(),
        status: 'pending',
        total_items: affectedItems.length,
        processed_items: 0,
        progress: 0
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }

    console.log('Job created with ID:', job.id);

    // Call background processing function (fire-and-forget)
    supabase.functions.invoke('process-seo-resolution', {
      body: { 
        jobId: job.id,
        shopId,
        diagnosticId,
        issueType,
        affectedItems
      }
    }).then(() => {
      console.log('Background processing started for job:', job.id);
    }).catch(error => {
      console.error('Failed to start background processing:', error);
    });

    // Return immediately with job ID
    return new Response(
      JSON.stringify({ 
        success: true,
        jobId: job.id,
        message: 'Job queued successfully. Poll job status for progress.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error queueing job:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
