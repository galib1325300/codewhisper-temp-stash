import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createWooCommerceAuth(consumerKey: string, consumerSecret: string): string {
  const credentials = `${consumerKey}:${consumerSecret}`;
  return `Basic ${btoa(credentials)}`;
}

async function wooCommerceRequest(
  url: string,
  endpoint: string,
  auth: string,
  method: string,
  data?: any,
  retries = 2
) {
  const fullUrl = `${url}/wp-json/wc/v3/${endpoint}`;
  console.log(`Making ${method} request to:`, fullUrl);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout (12 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(fullUrl, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Retry on 5xx or 429
        if ((response.status >= 500 || response.status === 429) && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Request failed with ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error(`WooCommerce API error (${response.status}):`, errorText);
        throw new Error(`WooCommerce API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Request timeout on attempt ${attempt + 1}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error('Request timeout after retries');
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { shopId, productId } = await req.json();

    if (!shopId || !productId) {
      throw new Error('shopId and productId are required');
    }

    console.log('Updating product:', { shopId, productId });

    // Get shop credentials
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('url, consumer_key, consumer_secret')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      throw new Error('Shop not found or credentials missing');
    }

    if (!shop.consumer_key || !shop.consumer_secret) {
      throw new Error('WooCommerce credentials not configured for this shop');
    }

    // Get product data from database
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    if (!product.woocommerce_id) {
      throw new Error('Product does not have a WooCommerce ID');
    }

    const auth = createWooCommerceAuth(shop.consumer_key, shop.consumer_secret);

    // Prepare product data for WooCommerce
    const updateData: any = {
      name: product.name,
      description: product.description || '',
      short_description: product.short_description || '',
    };

    // Only include optional fields if they exist and are greater than 0
    if (product.regular_price && product.regular_price > 0) {
      updateData.regular_price = product.regular_price.toString();
    }
    if (product.sale_price && product.sale_price > 0) {
      updateData.sale_price = product.sale_price.toString();
    }
    if (product.sku) {
      updateData.sku = product.sku;
    }
    if (product.stock_quantity !== null) {
      updateData.stock_quantity = product.stock_quantity;
    }
    if (product.stock_status) {
      updateData.stock_status = product.stock_status;
    }
    if (product.meta_title) {
      updateData.meta_data = updateData.meta_data || [];
      updateData.meta_data.push({ key: '_yoast_wpseo_title', value: product.meta_title });
    }
    if (product.meta_description) {
      updateData.meta_data = updateData.meta_data || [];
      updateData.meta_data.push({ key: '_yoast_wpseo_metadesc', value: product.meta_description });
    }

    console.log('Updating WooCommerce product:', product.woocommerce_id);

    // Update product on WooCommerce
    const updatedProduct = await wooCommerceRequest(
      shop.url,
      `products/${product.woocommerce_id}`,
      auth,
      'PUT',
      updateData
    );

    console.log('Product updated successfully:', updatedProduct.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Product updated successfully',
        productId: updatedProduct.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error updating product:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while updating the product' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
