-- Create public bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public can read images in this bucket
create policy "Public can read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Authenticated users can upload to this bucket
create policy "Authenticated can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

-- Authenticated users can update objects in this bucket
create policy "Authenticated can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images');

-- Authenticated users can delete objects in this bucket
create policy "Authenticated can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');