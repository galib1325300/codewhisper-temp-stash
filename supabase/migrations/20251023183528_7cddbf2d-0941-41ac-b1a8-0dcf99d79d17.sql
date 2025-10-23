-- Enable realtime updates for generation_jobs to unblock UI instantly
DO $$ BEGIN
  ALTER TABLE public.generation_jobs REPLICA IDENTITY FULL;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
EXCEPTION WHEN others THEN
  NULL;
END $$;