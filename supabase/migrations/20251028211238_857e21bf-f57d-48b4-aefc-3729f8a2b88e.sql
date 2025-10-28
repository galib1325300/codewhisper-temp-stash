-- Add wordpress_slug column to blog_posts table
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS wordpress_slug text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_wordpress_slug ON blog_posts(wordpress_slug);