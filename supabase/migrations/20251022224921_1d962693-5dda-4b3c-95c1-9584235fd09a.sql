-- Add last_heartbeat column to track job activity
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries on active jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_heartbeat 
ON generation_jobs(last_heartbeat) 
WHERE status IN ('pending', 'processing');