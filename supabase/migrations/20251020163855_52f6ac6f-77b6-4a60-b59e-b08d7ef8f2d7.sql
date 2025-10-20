-- Add missing columns to products table for WooCommerce compatibility
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS woocommerce_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS regular_price NUMERIC,
ADD COLUMN IF NOT EXISTS on_sale BOOLEAN DEFAULT false;

-- Create index for woocommerce_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products' 
    AND indexname = 'idx_products_woocommerce_id'
  ) THEN
    CREATE INDEX idx_products_woocommerce_id ON public.products(woocommerce_id);
  END IF;
END
$$;