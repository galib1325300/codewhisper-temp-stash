-- Ajouter une policy DELETE pour les articles de blog
CREATE POLICY "Users can delete blog posts in their shops" 
ON public.blog_posts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM public.shops
    WHERE shops.id = blog_posts.shop_id
    AND shops.user_id = auth.uid()
  )
);