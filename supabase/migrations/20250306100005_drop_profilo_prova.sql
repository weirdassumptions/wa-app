-- Rimuovi la colonna profilo_prova e la policy admin update che serviva solo per quella.
alter table public.profiles drop column if exists profilo_prova;
drop policy if exists "profiles_admin_update" on public.profiles;
