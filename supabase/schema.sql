-- Run this in Supabase: SQL Editor. Replace the admin email in the final policy.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  viber_group text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null check (char_length(title) <= 160),
  body text not null,
  type text not null check (type in ('Important','Procedure','Inquiry','Client update','Resolved case')),
  status text not null default 'resolved' check (status in ('waiting','resolved')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Run this too if the notes table already exists.
alter table public.notes add column if not exists image_path text;
alter table public.notes add column if not exists image_paths text[] not null default '{}';

alter table public.clients enable row level security;
alter table public.notes enable row level security;

-- All signed-in team members may read. Only the named admin may change content.
create policy "authenticated users can read clients" on public.clients for select to authenticated using (true);
create policy "authenticated users can read notes" on public.notes for select to authenticated using (true);
create policy "admin manages clients" on public.clients for all to authenticated using (auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com') with check (auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com');
create policy "admin manages notes" on public.notes for all to authenticated using (auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com') with check (auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com');

-- Add your first client after setting your own email in the policies.
insert into public.clients (name, summary, viber_group) values
  ('Example client', 'Replace this client with a real approved client record.', '');

-- Private image storage. Readers can view images; only the admin can upload or remove them.
insert into storage.buckets (id, name, public) values ('note-images', 'note-images', false)
on conflict (id) do update set public = false;

drop policy if exists "team can view note images" on storage.objects;
drop policy if exists "admin manages note images" on storage.objects;
create policy "team can view note images" on storage.objects for select to authenticated
  using (bucket_id = 'note-images');
create policy "admin manages note images" on storage.objects for all to authenticated
  using (bucket_id = 'note-images' and auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com')
  with check (bucket_id = 'note-images' and auth.jwt() ->> 'email' = 'tundaggeraldaldrian@gmail.com');
