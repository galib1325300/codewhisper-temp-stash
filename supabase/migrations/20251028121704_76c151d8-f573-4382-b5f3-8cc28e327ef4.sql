-- Create table for SEO optimization history
CREATE TABLE IF NOT EXISTS public.seo_optimization_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  optimization_type TEXT NOT NULL,
  score_before INTEGER,
  score_after INTEGER,
  changes_applied JSONB NOT NULL,
  applied_by UUID,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  performance_impact JSONB
);

-- Enable RLS
ALTER TABLE public.seo_optimization_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view optimization history of their shops"
  ON public.seo_optimization_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = seo_optimization_history.shop_id
      AND shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create optimization history for their shops"
  ON public.seo_optimization_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = seo_optimization_history.shop_id
      AND shops.user_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_seo_optimization_history_post_id ON public.seo_optimization_history(post_id);
CREATE INDEX idx_seo_optimization_history_shop_id ON public.seo_optimization_history(shop_id);
CREATE INDEX idx_seo_optimization_history_applied_at ON public.seo_optimization_history(applied_at DESC);