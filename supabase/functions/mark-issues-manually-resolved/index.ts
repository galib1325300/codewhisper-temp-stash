import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { diagnosticId, issueIndex, itemIds } = await req.json();

    console.log('=== MARK ISSUES MANUALLY RESOLVED ===');
    console.log('Request body:', JSON.stringify({ diagnosticId, issueIndex, itemIds }, null, 2));

    // Get the current diagnostic
    const { data: diagnostic, error: fetchError } = await supabase
      .from('seo_diagnostics')
      .select('*')
      .eq('id', diagnosticId)
      .single();

    if (fetchError || !diagnostic) {
      console.error('Error fetching diagnostic:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Diagnostic not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Parse issues
    let issues = Array.isArray(diagnostic.issues) ? diagnostic.issues : [];

    console.log('Diagnostic found:', {
      id: diagnostic.id,
      issuesCount: issues.length,
      requestedIssueIndex: issueIndex
    });

    if (issueIndex < 0 || issueIndex >= issues.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid issue index' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the issue to update
    const issue = issues[issueIndex];
    
    // Initialize resolved_items if it doesn't exist
    if (!issue.resolved_items) {
      issue.resolved_items = [];
    }

    // Add the manually resolved items to the resolved_items array
    itemIds.forEach((itemId: string) => {
      if (!issue.resolved_items.includes(itemId)) {
        issue.resolved_items.push(itemId);
      }
    });

    // Filter out resolved items from affected_items
    if (issue.affected_items && Array.isArray(issue.affected_items)) {
      const remainingItems = issue.affected_items.filter(
        (item: any) => !issue.resolved_items.includes(item.id)
      );

      // If all items are resolved, change the issue type to 'success'
      if (remainingItems.length === 0) {
        issue.type = 'success';
        issue.resolved = true;
        
        // Add score improvement if not already present
        if (!issue.score_improvement) {
          // Calculate score improvement based on issue category
          const scoreMapping: Record<string, number> = {
            'Images': 3,
            'Contenu': 5,
            'SEO': 4,
            'Structure': 3,
            'Maillage interne': 2,
            'Génération IA': 5,
          };
          issue.score_improvement = scoreMapping[issue.category] || 2;
        }
      }
    }

    // Update the issue in the issues array
    issues[issueIndex] = issue;

    // Recalculate issue counts
    let errors_count = 0;
    let warnings_count = 0;
    let info_count = 0;

    issues.forEach((iss: any) => {
      if (iss.type === 'error') errors_count++;
      else if (iss.type === 'warning') warnings_count++;
      else if (iss.type === 'info') info_count++;
    });

    // Calculate new score
    const MAX_SCORE = 150; // Based on updated weights
    let earnedPoints = 0;

    issues.forEach((iss: any) => {
      if (iss.type === 'success' && iss.score_improvement) {
        earnedPoints += iss.score_improvement;
      }
    });

    const newScore = Math.min(100, Math.round((earnedPoints / MAX_SCORE) * 100));

    console.log('Successfully updated diagnostic with new score:', newScore);

    // Update the diagnostic in the database
    const { error: updateError } = await supabase
      .from('seo_diagnostics')
      .update({
        issues,
        errors_count,
        warnings_count,
        info_count,
        total_issues: errors_count + warnings_count + info_count,
        score: newScore,
      })
      .eq('id', diagnosticId);

    if (updateError) {
      console.error('Error updating diagnostic:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Successfully marked issues as manually resolved');

    return new Response(
      JSON.stringify({ 
        success: true, 
        resolvedCount: itemIds.length,
        newScore 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mark-issues-manually-resolved:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
