-- Add skipped_count column to generation_jobs table
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS skipped_count integer DEFAULT 0;