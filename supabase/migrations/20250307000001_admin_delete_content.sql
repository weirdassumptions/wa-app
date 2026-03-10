-- Consenti agli admin di eliminare qualsiasi post (assumption) e commento per moderazione.
-- Se le tabelle assumptions/comments non hanno ancora RLS, questa migration abilita RLS e aggiunge le policy necessarie.

-- assumptions: abilita RLS se non già attivo, poi policy per delete admin
alter table public.assumptions enable row level security;

drop policy if exists "assumptions_delete_admin" on public.assumptions;
create policy "assumptions_delete_admin"
  on public.assumptions for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- comments: idem
alter table public.comments enable row level security;

drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin"
  on public.comments for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
