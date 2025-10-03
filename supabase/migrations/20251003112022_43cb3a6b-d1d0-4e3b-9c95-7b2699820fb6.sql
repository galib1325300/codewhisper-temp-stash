-- Create tracked_keywords table
CREATE TABLE IF NOT EXISTS public.tracked_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  volume INTEGER DEFAULT 0,
  difficulty INTEGER DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  competition TEXT DEFAULT 'medium',
  current_rank INTEGER,
  target_rank INTEGER,
  trend TEXT DEFAULT 'stable',
  opportunities INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_keywords
CREATE POLICY "Users can view their shop keywords"
ON public.tracked_keywords FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = tracked_keywords.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their shop keywords"
ON public.tracked_keywords FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = tracked_keywords.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their shop keywords"
ON public.tracked_keywords FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = tracked_keywords.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their shop keywords"
ON public.tracked_keywords FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = tracked_keywords.shop_id
    AND shops.user_id = auth.uid()
  )
);

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  actions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_run TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rules
CREATE POLICY "Users can view their shop automation rules"
ON public.automation_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = automation_rules.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their shop automation rules"
ON public.automation_rules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = automation_rules.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their shop automation rules"
ON public.automation_rules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = automation_rules.shop_id
    AND shops.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their shop automation rules"
ON public.automation_rules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = automation_rules.shop_id
    AND shops.user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_tracked_keywords_updated_at
  BEFORE UPDATE ON public.tracked_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();