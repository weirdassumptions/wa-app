-- Challenge del giorno: l’admin (@wa) può sovrascrivere il topic per data.
-- Lettura: tutti. Scrittura: solo chi ha is_admin = true (o policy su username = 'wa').

create table if not exists public.daily_challenges (
  date text primary key,
  topic text not null
);

-- RLS: tutti possono leggere
alter table public.daily_challenges enable row level security;

create policy "daily_challenges_read"
  on public.daily_challenges for select
  using (true);

-- Inserimento/aggiornamento solo per admin (usa profilo con is_admin = true)
create policy "daily_challenges_upsert_admin"
  on public.daily_challenges for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
