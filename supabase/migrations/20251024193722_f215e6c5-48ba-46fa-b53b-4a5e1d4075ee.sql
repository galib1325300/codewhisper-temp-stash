-- Enable realtime updates for seo_diagnostics table
ALTER TABLE seo_diagnostics REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE seo_diagnostics;