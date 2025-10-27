-- Create table for topic clusters (pillar strategy)
CREATE TABLE public.topic_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pillar_keyword TEXT NOT NULL,
  pillar_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  description TEXT,
  target_keywords JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view clusters of their shops"
ON public.topic_clusters FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = topic_clusters.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can create clusters in their shops"
ON public.topic_clusters FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = topic_clusters.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can update clusters in their shops"
ON public.topic_clusters FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = topic_clusters.shop_id
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can delete clusters in their shops"
ON public.topic_clusters FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = topic_clusters.shop_id
  AND shops.user_id = auth.uid()
));

-- Add cluster reference to blog_posts
ALTER TABLE public.blog_posts
ADD COLUMN cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
ADD COLUMN is_pillar BOOLEAN DEFAULT false;