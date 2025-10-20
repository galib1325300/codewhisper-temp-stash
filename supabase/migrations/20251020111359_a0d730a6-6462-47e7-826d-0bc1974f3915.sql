-- Create custom type for roles
create type public.app_role as enum ('admin', 'moderator', 'user');

-- Create profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique not null,
  first_name text,
  last_name text,
  openai_api_key text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Create function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, first_name, last_name)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name');
  return new;
end;
$$;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- User roles policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Create the has_role function (SECURITY DEFINER to bypass RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create shops table
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  status text default 'draft',
  url text not null,
  language text default 'fr',
  consumer_key text,
  consumer_secret text,
  wp_username text,
  wp_password text,
  collections_slug text default 'collections',
  openai_api_key text,
  analytics_enabled boolean default false,
  jetpack_access_token text,
  shopify_access_token text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on shops
alter table public.shops enable row level security;

-- Shops policies
create policy "Users can view their own shops"
  on public.shops for select
  using (auth.uid() = user_id);

create policy "Users can create their own shops"
  on public.shops for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own shops"
  on public.shops for update
  using (auth.uid() = user_id);

create policy "Users can delete their own shops"
  on public.shops for delete
  using (auth.uid() = user_id);

-- Create products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops on delete cascade not null,
  external_id text,
  name text not null,
  slug text not null,
  description text,
  short_description text,
  price numeric,
  sale_price numeric,
  sku text,
  stock_quantity integer,
  stock_status text,
  featured boolean default false,
  meta_title text,
  meta_description text,
  focus_keyword text,
  images jsonb,
  categories jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on products
alter table public.products enable row level security;

-- Products policies
create policy "Users can view products of their shops"
  on public.products for select
  using (
    exists (
      select 1 from public.shops
      where shops.id = products.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can create products in their shops"
  on public.products for insert
  with check (
    exists (
      select 1 from public.shops
      where shops.id = products.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can update products in their shops"
  on public.products for update
  using (
    exists (
      select 1 from public.shops
      where shops.id = products.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can delete products in their shops"
  on public.products for delete
  using (
    exists (
      select 1 from public.shops
      where shops.id = products.shop_id
      and shops.user_id = auth.uid()
    )
  );

-- Create seo_diagnostics table
create table public.seo_diagnostics (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops on delete cascade not null,
  item_type text not null,
  item_id uuid not null,
  status text default 'pending',
  score integer,
  issues jsonb,
  recommendations jsonb,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on seo_diagnostics
alter table public.seo_diagnostics enable row level security;

-- SEO diagnostics policies
create policy "Users can view diagnostics of their shops"
  on public.seo_diagnostics for select
  using (
    exists (
      select 1 from public.shops
      where shops.id = seo_diagnostics.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can create diagnostics for their shops"
  on public.seo_diagnostics for insert
  with check (
    exists (
      select 1 from public.shops
      where shops.id = seo_diagnostics.shop_id
      and shops.user_id = auth.uid()
    )
  );

-- Create blog_posts table
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops on delete cascade not null,
  external_id text,
  title text not null,
  slug text not null,
  content text,
  excerpt text,
  status text default 'draft',
  featured_image text,
  meta_title text,
  meta_description text,
  focus_keyword text,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on blog_posts
alter table public.blog_posts enable row level security;

-- Blog posts policies
create policy "Users can view blog posts of their shops"
  on public.blog_posts for select
  using (
    exists (
      select 1 from public.shops
      where shops.id = blog_posts.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can create blog posts in their shops"
  on public.blog_posts for insert
  with check (
    exists (
      select 1 from public.shops
      where shops.id = blog_posts.shop_id
      and shops.user_id = auth.uid()
    )
  );

create policy "Users can update blog posts in their shops"
  on public.blog_posts for update
  using (
    exists (
      select 1 from public.shops
      where shops.id = blog_posts.shop_id
      and shops.user_id = auth.uid()
    )
  );

-- Create tracked_keywords table
create table public.tracked_keywords (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops on delete cascade not null,
  keyword text not null,
  target_url text not null,
  current_position integer,
  previous_position integer,
  search_volume integer,
  competition text,
  last_checked_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on tracked_keywords
alter table public.tracked_keywords enable row level security;

-- Tracked keywords policies
create policy "Users can view keywords of their shops"
  on public.tracked_keywords for select
  using (
    exists (
      select 1 from public.shops
      where shops.id = tracked_keywords.shop_id
      and shops.user_id = auth.uid()
    )
  );

-- Create automation_rules table
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops on delete cascade not null,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_value text not null,
  actions jsonb not null,
  status text default 'active',
  last_run timestamp with time zone,
  total_runs integer default 0,
  successful_runs integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on automation_rules
alter table public.automation_rules enable row level security;

-- Automation rules policies
create policy "Users can view automation rules of their shops"
  on public.automation_rules for select
  using (
    exists (
      select 1 from public.shops
      where shops.id = automation_rules.shop_id
      and shops.user_id = auth.uid()
    )
  );