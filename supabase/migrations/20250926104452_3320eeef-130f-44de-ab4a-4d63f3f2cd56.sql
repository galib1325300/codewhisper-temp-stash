-- Create SEO diagnostics table
CREATE TABLE public.seo_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  score INTEGER DEFAULT NULL,
  total_issues INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  issues JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_diagnostics ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their shop diagnostics" 
ON public.seo_diagnostics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shops 
  WHERE shops.id = seo_diagnostics.shop_id 
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can create their shop diagnostics" 
ON public.seo_diagnostics 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shops 
  WHERE shops.id = seo_diagnostics.shop_id 
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can update their shop diagnostics" 
ON public.seo_diagnostics 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shops 
  WHERE shops.id = seo_diagnostics.shop_id 
  AND shops.user_id = auth.uid()
));

CREATE POLICY "Users can delete their shop diagnostics" 
ON public.seo_diagnostics 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shops 
  WHERE shops.id = seo_diagnostics.shop_id 
  AND shops.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_seo_diagnostics_updated_at
  BEFORE UPDATE ON public.seo_diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();