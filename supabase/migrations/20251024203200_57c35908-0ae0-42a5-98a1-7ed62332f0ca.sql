-- Add long_description column to collections table
ALTER TABLE public.collections 
ADD COLUMN long_description text;

COMMENT ON COLUMN public.collections.long_description IS 'Long SEO-optimized description (300-600 words) for bottom of category page';