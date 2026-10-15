-- Storage bucket for menu and site images.
-- Public read (images are served by public URL); only admins may upload/replace/delete,
-- only under products/ or site/, only JPEG/PNG/WebP, max 5 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Listing objects is admin-only (public URLs do not need a select policy).
create policy "menu-images: admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()));

create policy "menu-images: admin insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-images'
    and (select public.is_admin())
    and (storage.foldername(name))[1] in ('products', 'site')
  );

create policy "menu-images: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()))
  with check (
    bucket_id = 'menu-images'
    and (select public.is_admin())
    and (storage.foldername(name))[1] in ('products', 'site')
  );

create policy "menu-images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'menu-images' and (select public.is_admin()));
