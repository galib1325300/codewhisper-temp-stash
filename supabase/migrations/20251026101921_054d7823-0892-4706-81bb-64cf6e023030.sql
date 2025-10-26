-- Table pour stocker les suggestions de niches
CREATE TABLE ai_niche_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  niche_name TEXT NOT NULL,
  description TEXT,
  country TEXT,
  language TEXT,
  search_volume INTEGER,
  competition_score INTEGER,
  profit_margin_avg DECIMAL,
  seasonality JSONB,
  top_keywords JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les sites générés
CREATE TABLE ai_generated_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  niche_name TEXT NOT NULL,
  status TEXT DEFAULT 'generating',
  products_count INTEGER DEFAULT 0,
  collections_count INTEGER DEFAULT 0,
  blog_posts_count INTEGER DEFAULT 0,
  csv_woocommerce_url TEXT,
  csv_shopify_url TEXT,
  zip_wordpress_url TEXT,
  generation_started_at TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  error_message TEXT,
  config JSONB,
  competitors_analyzed JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les abonnements générateur
CREATE TABLE ai_generator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  plan_type TEXT NOT NULL,
  sites_remaining INTEGER,
  expires_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE ai_niche_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their niches" ON ai_niche_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create niches" ON ai_niche_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE ai_generated_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their sites" ON ai_generated_sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sites" ON ai_generated_sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their sites" ON ai_generated_sites FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE ai_generator_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their subscription" ON ai_generator_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Storage bucket for generated catalogs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-catalogs', 'generated-catalogs', true)
ON CONFLICT (id) DO NOTHING;