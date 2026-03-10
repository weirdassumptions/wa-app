-- Lettura pubblica di assumptions e comments (necessaria per il feed).
-- Senza queste policy, con RLS attivo nessuno può leggere i post.

-- assumptions: tutti possono leggere
drop policy if exists "assumptions_read" on public.assumptions;
create policy "assumptions_read"
  on public.assumptions for select
  using (true);

-- assumptions: tutti possono inserire (anon e utenti)
drop policy if exists "assumptions_insert" on public.assumptions;
create policy "assumptions_insert"
  on public.assumptions for insert
  with check (true);

-- assumptions: utente può aggiornare solo i propri post
drop policy if exists "assumptions_update_own" on public.assumptions;
create policy "assumptions_update_own"
  on public.assumptions for update
  using (
    username in (
      select profiles.username from public.profiles where profiles.id = auth.uid()
    )
  );

-- comments: tutti possono leggere
drop policy if exists "comments_read" on public.comments;
create policy "comments_read"
  on public.comments for select
  using (true);

-- comments: tutti possono inserire
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert"
  on public.comments for insert
  with check (true);

-- comments: utente può aggiornare solo i propri commenti
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
  on public.comments for update
  using (
    username in (
      select profiles.username from public.profiles where profiles.id = auth.uid()
    )
  );
