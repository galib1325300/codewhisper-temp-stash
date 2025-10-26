import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSKU(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
}

function generateWooCommerceCSV(products: any[]): string {
  const columns = [
    'ID', 'Type', 'SKU', 'Name', 'Published', 'Is featured?',
    'Visibility in catalog', 'Short description', 'Description',
    'Tax status', 'In stock?', 'Stock', 'Regular price', 'Categories', 
    'Tags', 'Images', 'Position'
  ];

  const rows = products.map(p => [
    '', // ID auto
    'simple',
    generateSKU(p.name),
    p.name,
    '1',
    '0',
    'visible',
    p.short_description,
    p.description_html,
    'taxable',
    '1',
    '100',
    p.price.toString(),
    p.categories.join(' > '),
    p.tags.join(', '),
    p.images.map((img: any) => img.url).join(', '),
    '0'
  ]);

  return [columns, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function generateShopifyCSV(products: any[]): string {
  const columns = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags',
    'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU',
    'Variant Inventory Tracker', 'Variant Inventory Qty',
    'Variant Price', 'Variant Requires Shipping', 'Variant Taxable',
    'Image Src', 'Image Position', 'Image Alt Text',
    'SEO Title', 'SEO Description', 'Status'
  ];

  const rows = products.flatMap((p, i) => {
    const mainRow = [
      p.slug,
      p.name,
      p.description_html,
      'Your Store',
      p.categories[0] || '',
      p.tags.join(', '),
      'true',
      'Title', 'Default Title',
      generateSKU(p.name),
      'shopify', '100',
      p.price.toString(),
      'true', 'true',
      p.images[0]?.url || '',
      '1',
      p.images[0]?.alt || '',
      p.seo_title,
      p.short_description,
      'active'
    ];
    
    const imageRows = p.images.slice(1).map((img: any, idx: number) => [
      p.slug, '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      img.url,
      (idx + 2).toString(),
      img.alt,
      '', '', ''
    ]);
    
    return [mainRow, ...imageRows];
  });

  return [columns, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { siteId, format } = await req.json();

    console.log('Exporting catalog:', { siteId, format });

    // Get generated site data
    const { data: site, error: siteError } = await supabase
      .from('ai_generated_sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      throw new Error('Site not found');
    }

    if (!site.config?.products) {
      throw new Error('No products generated yet');
    }

    const products = site.config.products;

    // Generate CSV based on format
    let csvContent: string;
    let fileName: string;

    if (format === 'woocommerce') {
      csvContent = generateWooCommerceCSV(products);
      fileName = `site-${siteId}-woocommerce-${Date.now()}.csv`;
    } else if (format === 'shopify') {
      csvContent = generateShopifyCSV(products);
      fileName = `site-${siteId}-shopify-${Date.now()}.csv`;
    } else {
      throw new Error('Invalid format. Use "woocommerce" or "shopify"');
    }

    console.log('CSV generated, size:', csvContent.length, 'bytes');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-catalogs')
      .upload(fileName, csvContent, {
        contentType: 'text/csv',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-catalogs')
      .getPublicUrl(fileName);

    console.log('File uploaded, public URL:', publicUrl);

    // Update site with CSV URL
    const updateField = format === 'woocommerce' ? 'csv_woocommerce_url' : 'csv_shopify_url';
    await supabase
      .from('ai_generated_sites')
      .update({
        [updateField]: publicUrl,
        status: 'completed',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    return new Response(
      JSON.stringify({ 
        success: true,
        downloadUrl: publicUrl,
        fileName,
        productsCount: products.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error exporting catalog:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
