-- Create table for blog author personas
CREATE TABLE public.blog_authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT NOT NULL,
  expertise_areas JSONB DEFAULT '[]'::jsonb,
  credentials TEXT,
  avatar_url TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view authors of their shops"
ON public.blog_authors
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = blog_authors.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can create authors in their shops"
ON public.blog_authors
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = blog_authors.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can update authors in their shops"
ON public.blog_authors
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = blog_authors.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can delete authors in their shops"
ON public.blog_authors
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = blog_authors.shop_id
  AND shops.user_id = auth.uid()
));

-- Add author reference to blog_posts
ALTER TABLE public.blog_posts
ADD COLUMN author_id UUID REFERENCES public.blog_authors(id) ON DELETE SET NULL;