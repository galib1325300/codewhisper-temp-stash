-- Create product_modifications table to track all changes
CREATE TABLE public.product_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modified_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.product_modifications ENABLE ROW LEVEL SECURITY;

-- Users can view modification history of their shop's products
CREATE POLICY "Users can view modifications of their products"
ON public.product_modifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.products
    JOIN public.shops ON products.shop_id = shops.id
    WHERE products.id = product_modifications.product_id
    AND shops.user_id = auth.uid()
  )
);

-- Create function to log product modifications
CREATE OR REPLACE FUNCTION public.log_product_modification()
RETURNS TRIGGER AS $$
DECLARE
  field_record RECORD;
BEGIN
  -- Check if this is an update
  IF TG_OP = 'UPDATE' THEN
    -- Track name changes
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO public.product_modifications (product_id, field_name, old_value, new_value, modified_by)
      VALUES (NEW.id, 'name', OLD.name, NEW.name, auth.uid());
    END IF;
    
    -- Track short_description changes
    IF OLD.short_description IS DISTINCT FROM NEW.short_description THEN
      INSERT INTO public.product_modifications (product_id, field_name, old_value, new_value, modified_by)
      VALUES (NEW.id, 'short_description', OLD.short_description, NEW.short_description, auth.uid());
    END IF;
    
    -- Track description changes
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.product_modifications (product_id, field_name, old_value, new_value, modified_by)
      VALUES (NEW.id, 'description', 
        LEFT(OLD.description, 200), 
        LEFT(NEW.description, 200), 
        auth.uid());
    END IF;
    
    -- Track images changes
    IF OLD.images IS DISTINCT FROM NEW.images THEN
      INSERT INTO public.product_modifications (product_id, field_name, old_value, new_value, modified_by)
      VALUES (NEW.id, 'images', 'Images modifiées', 'Images mises à jour', auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically log modifications
CREATE TRIGGER track_product_modifications
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.log_product_modification();

-- Create index for better performance
CREATE INDEX idx_product_modifications_product_id ON public.product_modifications(product_id);
CREATE INDEX idx_product_modifications_modified_at ON public.product_modifications(modified_at DESC);