-- Add voice-related columns to blog_authors table
ALTER TABLE public.blog_authors 
ADD COLUMN IF NOT EXISTS voice_id TEXT,
ADD COLUMN IF NOT EXISTS voice_provider TEXT DEFAULT 'elevenlabs',
ADD COLUMN IF NOT EXISTS voice_sample_url TEXT,
ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{"stability": 0.5, "similarity_boost": 0.75, "model": "eleven_turbo_v2_5"}'::jsonb;

-- Add comment to describe the columns
COMMENT ON COLUMN public.blog_authors.voice_id IS 'ElevenLabs voice ID for this persona';
COMMENT ON COLUMN public.blog_authors.voice_provider IS 'Voice generation provider (elevenlabs)';
COMMENT ON COLUMN public.blog_authors.voice_sample_url IS 'Public URL to the voice sample MP3';
COMMENT ON COLUMN public.blog_authors.voice_settings IS 'Voice generation settings (stability, similarity_boost, model)';