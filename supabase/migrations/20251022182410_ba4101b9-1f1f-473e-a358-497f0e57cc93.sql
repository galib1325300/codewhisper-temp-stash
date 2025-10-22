-- Create collections table for storing WooCommerce categories
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  external_id TEXT,
  woocommerce_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image TEXT,
  parent_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view collections of their shops"
ON public.collections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shops
    WHERE shops.id = collections.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create collections in their shops"
ON public.collections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.shops
    WHERE shops.id = collections.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update collections in their shops"
ON public.collections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.shops
    WHERE shops.id = collections.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete collections in their shops"
ON public.collections
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.shops
    WHERE shops.id = collections.shop_id
    AND shops.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_collections_shop_id ON public.collections(shop_id);
CREATE INDEX idx_collections_external_id ON public.collections(external_id);
CREATE INDEX idx_collections_slug ON public.collections(slug);