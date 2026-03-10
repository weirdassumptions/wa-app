-- Crea il profilo in public.profiles quando viene creato un utente in auth.users.
-- I dati (username, display_name, bio, avatar_color, email) vanno passati in signUp options.data.
-- Così il profilo viene creato anche con "Confirm email" attivo (nessuna sessione al signup).

-- Tabella profiles se non esiste (per progetti nuovi)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  avatar_color text,
  email text,
  is_verified boolean default false,
  is_admin boolean default false
);

-- RLS: lettura pubblica, scrittura solo sul proprio profilo
alter table public.profiles enable row level security;
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    bio,
    avatar_url,
    avatar_color,
    email
  )
  values (
    new.id,
    coalesce(nullif(trim((new.raw_user_meta_data->>'username')::text), ''), (new.raw_user_meta_data->>'email')::text, 'user'),
    coalesce(nullif(trim((new.raw_user_meta_data->>'display_name')::text), ''), nullif(trim((new.raw_user_meta_data->>'username')::text), ''), 'user'),
    nullif(trim((new.raw_user_meta_data->>'bio')::text), ''),
    null,
    coalesce(nullif(trim((new.raw_user_meta_data->>'avatar_color')::text), ''), '#6366f1'),
    nullif(trim((new.raw_user_meta_data->>'email')::text), '')
  )
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    bio = excluded.bio,
    avatar_color = excluded.avatar_color,
    email = excluded.email;
  return new;
end;
$$;

-- Trigger su auth.users (solo se non esiste già)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
