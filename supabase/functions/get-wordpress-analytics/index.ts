import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shopId, timeRange = '30' } = await req.json();
    
    console.log('Fetching WordPress analytics for shop:', shopId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get shop data including jetpack token
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      console.error('Shop not found:', shopError);
      return new Response(JSON.stringify({ error: 'Shop not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!shop.jetpack_access_token) {
      console.log('No Jetpack token configured for shop');
      return new Response(JSON.stringify({ 
        error: 'Jetpack access token not configured',
        hasToken: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract site domain from shop URL
    const siteUrl = shop.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Fetch WordPress.com stats
    const statsUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteUrl}/stats`;
    const summaryUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteUrl}/stats/summary`;
    const topPostsUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteUrl}/stats/top-posts`;
    const referrersUrl = `https://public-api.wordpress.com/rest/v1.1/sites/${siteUrl}/stats/referrers`;

    const headers = {
      'Authorization': `Bearer ${shop.jetpack_access_token}`,
      'Content-Type': 'application/json'
    };

    // Fetch analytics data in parallel
    const [statsResponse, summaryResponse, topPostsResponse, referrersResponse] = await Promise.all([
      fetch(`${statsUrl}?period=day&date=${timeRange}`, { headers }),
      fetch(`${summaryUrl}?period=day&num=${timeRange}`, { headers }),
      fetch(`${topPostsUrl}?period=day&date=${timeRange}`, { headers }),
      fetch(`${referrersUrl}?period=day&date=${timeRange}`, { headers })
    ]);

    if (!statsResponse.ok) {
      console.error('WordPress API error:', await statsResponse.text());
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch WordPress analytics',
        status: statsResponse.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [statsData, summaryData, topPostsData, referrersData] = await Promise.all([
      statsResponse.json(),
      summaryResponse.json(),
      topPostsResponse.json(),
      referrersResponse.json()
    ]);

    console.log('WordPress analytics data fetched successfully');

    // Calculate SEO-specific metrics
    const organicReferrers = referrersData.referrers?.filter((ref: any) => 
      ref.group === 'search-engines' || 
      ref.url?.includes('google.') || 
      ref.url?.includes('bing.') || 
      ref.url?.includes('yahoo.')
    ) || [];

    const totalOrganicViews = organicReferrers.reduce((sum: number, ref: any) => sum + (ref.views || 0), 0);
    const totalViews = summaryData.views || 0;
    const organicTrafficPercentage = totalViews > 0 ? (totalOrganicViews / totalViews) * 100 : 0;

    // Calculate estimated conversions (assuming 2-3% conversion rate for organic traffic)
    const estimatedConversions = Math.round(totalOrganicViews * 0.025);
    
    // Calculate CTR from search engines (estimated from organic traffic)
    const avgCTR = organicTrafficPercentage > 0 ? Math.min(organicTrafficPercentage / 10, 5) : 2.5;

    // Estimate revenue (assuming average order value)
    const avgOrderValue = 45; // This could be configurable per shop
    const estimatedRevenue = estimatedConversions * avgOrderValue;

    const analyticsData = {
      metrics: {
        organicTraffic: totalOrganicViews,
        totalViews: totalViews,
        conversions: estimatedConversions,
        ctr: Number(avgCTR.toFixed(2)),
        revenue: estimatedRevenue,
        organicPercentage: Number(organicTrafficPercentage.toFixed(2))
      },
      rawData: {
        stats: statsData,
        summary: summaryData,
        topPosts: topPostsData,
        referrers: referrersData,
        organicReferrers
      },
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(analyticsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-wordpress-analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});