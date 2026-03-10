-- Segnalazioni contenuti: gli utenti possono segnalare post o commenti.
-- Lettura: solo admin. Inserimento: utenti autenticati (solo le proprie segnalazioni).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  content_type text not null check (content_type in ('post', 'comment')),
  content_id uuid not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_content_idx on public.reports (content_type, content_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);
create index if not exists reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

-- Inserimento: solo utenti autenticati, reporter_id deve essere l'utente corrente
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Lettura: solo admin (per moderazione)
create policy "reports_select_admin"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Aggiornamento (es. cambio status): solo admin
create policy "reports_update_admin"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
