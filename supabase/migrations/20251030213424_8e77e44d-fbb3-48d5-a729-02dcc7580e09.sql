-- Add generation_status column to blog_posts table for better UX during article generation
ALTER TABLE public.blog_posts 
ADD COLUMN generation_status TEXT DEFAULT 'draft';

-- Add check constraint for valid statuses
ALTER TABLE public.blog_posts
ADD CONSTRAINT blog_posts_generation_status_check 
CHECK (generation_status IN ('generating', 'draft', 'published', 'error'));

-- Add index for faster queries on generation_status
CREATE INDEX idx_blog_posts_generation_status ON public.blog_posts(generation_status);

-- Comment on column
COMMENT ON COLUMN public.blog_posts.generation_status IS 'Status of the blog post generation process: generating, draft, published, error';