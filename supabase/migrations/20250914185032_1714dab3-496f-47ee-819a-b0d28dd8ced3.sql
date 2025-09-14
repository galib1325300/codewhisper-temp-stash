-- Ensure shops table has all necessary fields for WooCommerce integration
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

-- Create products table for caching WooCommerce products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  woocommerce_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'publish',
  featured BOOLEAN DEFAULT false,
  description TEXT,
  short_description TEXT,
  sku TEXT,
  price DECIMAL(10,2),
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  on_sale BOOLEAN DEFAULT false,
  stock_quantity INTEGER,
  stock_status TEXT DEFAULT 'instock',
  images JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, woocommerce_id)
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Users can view their shop products" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = products.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their shop products" 
ON public.products 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = products.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their shop products" 
ON public.products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = products.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their shop products" 
ON public.products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = products.shop_id 
    AND shops.user_id = auth.uid()
  )
);

-- Create collections table for WooCommerce categories
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  woocommerce_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id INTEGER DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, woocommerce_id)
);

-- Enable RLS on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Create policies for collections
CREATE POLICY "Users can view their shop collections" 
ON public.collections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = collections.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their shop collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = collections.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their shop collections" 
ON public.collections 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = collections.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their shop collections" 
ON public.collections 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = collections.shop_id 
    AND shops.user_id = auth.uid()
  )
);

-- Create blog_posts table for content management
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, slug)
);

-- Enable RLS on blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for blog_posts
CREATE POLICY "Users can view their shop blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = blog_posts.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their shop blog posts" 
ON public.blog_posts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = blog_posts.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their shop blog posts" 
ON public.blog_posts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = blog_posts.shop_id 
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their shop blog posts" 
ON public.blog_posts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = blog_posts.shop_id 
    AND shops.user_id = auth.uid()
  )
);

-- Add update triggers for all tables
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();