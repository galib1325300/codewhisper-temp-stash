-- Add missing columns to seo_diagnostics
ALTER TABLE public.seo_diagnostics
ADD COLUMN IF NOT EXISTS total_issues integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS errors_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS warnings_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS info_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS summary text;

-- Add missing columns to tracked_keywords
ALTER TABLE public.tracked_keywords
ADD COLUMN IF NOT EXISTS volume integer,
ADD COLUMN IF NOT EXISTS difficulty text,
ADD COLUMN IF NOT EXISTS cpc numeric,
ADD COLUMN IF NOT EXISTS trend text,
ADD COLUMN IF NOT EXISTS opportunities jsonb,
ADD COLUMN IF NOT EXISTS current_rank integer,
ADD COLUMN IF NOT EXISTS target_rank integer;