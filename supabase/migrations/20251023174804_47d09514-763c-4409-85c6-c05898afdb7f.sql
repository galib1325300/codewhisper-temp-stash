-- Add unique constraint on (shop_id, external_id) for collections table
-- This allows proper upsert behavior when syncing WooCommerce categories

ALTER TABLE public.collections 
ADD CONSTRAINT collections_shop_id_external_id_key 
UNIQUE (shop_id, external_id);