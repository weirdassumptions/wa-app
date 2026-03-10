-- Profilo creato SOLO quando l'utente verifica l'email (clic sul link).
-- Niente profilo alla registrazione: niente profili "a caso" senza mail verificata.

-- Rimuovi il trigger che creava il profilo all'INSERT (signup)
drop trigger if exists on_auth_user_created on auth.users;

-- Funzione che crea il profilo quando email_confirmed_at viene impostato
create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
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
      lower(regexp_replace(coalesce(nullif(trim((new.raw_user_meta_data->>'username')::text), ''), split_part(new.email, '@', 1), 'user_' || left(replace(new.id::text, '-', ''), 8)), '\s+', '_', 'g')),
      coalesce(nullif(trim((new.raw_user_meta_data->>'display_name')::text), ''), nullif(trim((new.raw_user_meta_data->>'username')::text), '')),
      nullif(trim((new.raw_user_meta_data->>'bio')::text), ''),
      null,
      coalesce(nullif(trim((new.raw_user_meta_data->>'avatar_color')::text), ''), '#6366f1'),
      new.email
    )
    on conflict (id) do update set
      username = excluded.username,
      display_name = excluded.display_name,
      bio = excluded.bio,
      avatar_color = excluded.avatar_color,
      email = excluded.email;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute procedure public.handle_email_confirmed();
