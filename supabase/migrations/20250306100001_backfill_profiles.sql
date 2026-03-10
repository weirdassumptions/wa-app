-- Una tantum: crea un profilo per ogni utente in auth.users che non ha ancora una riga in public.profiles.
-- Usa email come username di fallback se non c'è raw_user_meta_data.

-- Username univoco: da meta, oppure parte prima della @ + suffisso id per evitare duplicati
insert into public.profiles (id, username, display_name, bio, avatar_url, avatar_color, email)
select
  u.id,
  coalesce(
    nullif(trim((u.raw_user_meta_data->>'username')::text), ''),
    lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '_', 'g')) || '_' || left(replace(u.id::text, '-', ''), 8)
  ),
  coalesce(nullif(trim((u.raw_user_meta_data->>'display_name')::text), ''), (u.raw_user_meta_data->>'username')::text, ''),
  nullif(trim((u.raw_user_meta_data->>'bio')::text), ''),
  null,
  coalesce(nullif(trim((u.raw_user_meta_data->>'avatar_color')::text), ''), '#6366f1'),
  u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
