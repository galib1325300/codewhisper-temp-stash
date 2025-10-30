-- Add products_slug column to shops table for flexible product URL paths
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS products_slug TEXT DEFAULT 'products';

COMMENT ON COLUMN public.shops.products_slug IS 'Base slug for product URLs (e.g., "products" for Shopify, "product" for WooCommerce)';