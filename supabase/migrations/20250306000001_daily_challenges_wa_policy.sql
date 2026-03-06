-- Consenti all’account @wa di fare upsert sulla challenge anche se is_admin non è impostato.

create policy "daily_challenges_upsert_wa"
  on public.daily_challenges for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.username = 'wa'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.username = 'wa'
    )
  );
