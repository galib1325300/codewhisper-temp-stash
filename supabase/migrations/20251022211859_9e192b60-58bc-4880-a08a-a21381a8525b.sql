-- Create generation_jobs table to track async SEO resolution jobs
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES public.seo_diagnostics(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  current_item TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for frequent queries
CREATE INDEX idx_generation_jobs_shop_id ON public.generation_jobs(shop_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_jobs_created_at ON public.generation_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view jobs for their shops
CREATE POLICY "Users can view jobs for their shops"
  ON public.generation_jobs FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

-- RLS Policy: Users can create jobs for their shops
CREATE POLICY "Users can create jobs for their shops"
  ON public.generation_jobs FOR INSERT
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid()));

-- RLS Policy: System can update any job (for background processing)
CREATE POLICY "System can update jobs"
  ON public.generation_jobs FOR UPDATE
  USING (true);