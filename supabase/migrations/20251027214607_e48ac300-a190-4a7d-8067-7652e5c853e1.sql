-- Add columns to topic_clusters for AI generation tracking
ALTER TABLE public.topic_clusters
ADD COLUMN IF NOT EXISTS suggested_article_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_prompt TEXT;

COMMENT ON COLUMN public.topic_clusters.suggested_article_count IS 'Number of articles initially suggested by AI for this cluster';
COMMENT ON COLUMN public.topic_clusters.auto_generated IS 'Indicates if this cluster was created automatically by AI';
COMMENT ON COLUMN public.topic_clusters.generation_prompt IS 'Stores the generation context for consistency';