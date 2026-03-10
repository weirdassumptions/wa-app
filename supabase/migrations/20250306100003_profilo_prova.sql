-- Classe "profilo prova": se attiva, l'utente può accedere anche senza aver verificato l'email.
-- Si applica a utenti preesistenti e ai nuovi account di prova.

alter table public.profiles
  add column if not exists profilo_prova boolean not null default false;

comment on column public.profiles.profilo_prova is 'Se true, login consentito anche senza verifica email (account di prova / preesistenti).';

-- Gli admin possono aggiornare qualsiasi profilo (per attivare/disattivare Profilo prova)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
