-- Extension de la table shops pour stocker les tokens analytics
ALTER TABLE public.shops 
ADD COLUMN jetpack_access_token TEXT,
ADD COLUMN shopify_access_token TEXT,
ADD COLUMN analytics_enabled BOOLEAN DEFAULT false;