-- Run this once in Supabase SQL Editor to enable note images.
alter table public.notes add column if not exists image_path text;
alter table public.notes add column if not exists image_paths text[] not null default '{}';

-- Preserve any previously attached single image in the new multi-image field.
update public.notes set image_paths = array_append(image_paths, image_path)
where image_path is not null and not (image_path = any(image_paths));

insert into storage.buckets (id, name, public) values ('note-images', 'note-images', false)
on conflict (id) do update set public = false;

drop policy if exists "team can view note images" on storage.objects;
drop policy if exists "admin manages note images" on storage.objects;

create policy "team can view note images" on storage.objects for select to authenticated
  using (bucket_id = 'note-images');

create policy "admin manages note images" on storage.objects for all to authenticated
  using (bucket_id = 'note-images' and auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com')
  with check (bucket_id = 'note-images' and auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com');
