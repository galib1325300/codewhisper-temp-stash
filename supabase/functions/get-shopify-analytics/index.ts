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
    
    console.log('Fetching Shopify analytics for shop:', shopId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get shop data including shopify token
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

    if (!shop.shopify_access_token) {
      console.log('No Shopify token configured for shop');
      return new Response(JSON.stringify({ 
        error: 'Shopify access token not configured',
        hasToken: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract shop domain from URL
    const shopDomain = shop.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));

    const headers = {
      'X-Shopify-Access-Token': shop.shopify_access_token,
      'Content-Type': 'application/json'
    };

    // Shopify Admin REST API endpoints
    const baseUrl = `https://${shopDomain}/admin/api/2023-10`;
    
    // Fetch analytics data
    const [ordersResponse, sessionsResponse, customersResponse] = await Promise.all([
      // Orders data for conversions and revenue
      fetch(`${baseUrl}/orders.json?created_at_min=${startDate.toISOString()}&limit=250`, { headers }),
      // Customer sessions data would require Shopify Analytics API (paid feature)
      // For now, we'll estimate traffic from orders and typical conversion rates
      fetch(`${baseUrl}/reports.json?fields=name,category&limit=50`, { headers }),
      // Customer data
      fetch(`${baseUrl}/customers/count.json`, { headers })
    ]);

    if (!ordersResponse.ok) {
      console.error('Shopify API error:', await ordersResponse.text());
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch Shopify analytics',
        status: ordersResponse.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [ordersData, reportsData, customersData] = await Promise.all([
      ordersResponse.json(),
      sessionsResponse.ok ? sessionsResponse.json() : { reports: [] },
      customersResponse.ok ? customersResponse.json() : { count: 0 }
    ]);

    console.log('Shopify analytics data fetched successfully');

    // Calculate SEO-specific metrics from orders
    const orders = ordersData.orders || [];
    
    // Filter orders that likely came from organic search
    // This is an estimation based on referring domain or source tracking
    const organicOrders = orders.filter((order: any) => {
      const referringSite = order.referring_site || '';
      return referringSite.includes('google.') || 
             referringSite.includes('bing.') || 
             referringSite.includes('yahoo.') ||
             !referringSite || // Direct traffic often includes SEO
             referringSite.includes(shopDomain); // Direct from SEO
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );
    
    const organicRevenue = organicOrders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );

    const conversions = organicOrders.length;
    
    // Estimate organic traffic (assuming 2-3% conversion rate)
    const estimatedOrganicTraffic = conversions > 0 ? Math.round(conversions / 0.025) : Math.round(totalRevenue / 50);
    
    // Calculate CTR (estimated from industry averages for e-commerce)
    const avgCTR = 2.8; // Industry average for e-commerce

    const analyticsData = {
      metrics: {
        organicTraffic: estimatedOrganicTraffic,
        conversions: conversions,
        ctr: avgCTR,
        revenue: Math.round(organicRevenue),
        totalRevenue: Math.round(totalRevenue),
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0
      },
      rawData: {
        orders: ordersData,
        reports: reportsData,
        customers: customersData,
        organicOrders: organicOrders.length,
        totalCustomers: customersData.count || 0
      },
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(analyticsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-shopify-analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});