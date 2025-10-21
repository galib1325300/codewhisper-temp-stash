-- Rendre le champ modified_by nullable pour accepter les modifications des edge functions
ALTER TABLE public.product_modifications 
  ALTER COLUMN modified_by DROP NOT NULL;