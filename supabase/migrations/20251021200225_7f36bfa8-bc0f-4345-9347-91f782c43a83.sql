-- Create product_generation_jobs table for async processing
CREATE TABLE IF NOT EXISTS public.product_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  language TEXT,
  preserve_internal_links BOOLEAN DEFAULT false,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create index for efficient querying
CREATE INDEX idx_product_generation_jobs_status ON public.product_generation_jobs(status);
CREATE INDEX idx_product_generation_jobs_product_id ON public.product_generation_jobs(product_id);
CREATE INDEX idx_product_generation_jobs_shop_id ON public.product_generation_jobs(shop_id);

-- Enable RLS
ALTER TABLE public.product_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view jobs for their shops"
  ON public.product_generation_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = product_generation_jobs.shop_id
      AND shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create jobs for their shops"
  ON public.product_generation_jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = product_generation_jobs.shop_id
      AND shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs for their shops"
  ON public.product_generation_jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = product_generation_jobs.shop_id
      AND shops.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_generation_jobs;
ALTER TABLE public.product_generation_jobs REPLICA IDENTITY FULL;