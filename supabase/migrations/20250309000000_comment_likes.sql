-- Like ai commenti (come likes per i post).
create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

-- Lettura: tutti
create policy "comment_likes_read"
  on public.comment_likes for select
  using (true);

-- Inserimento/eliminazione: solo utenti autenticati sul proprio like
create policy "comment_likes_insert"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create policy "comment_likes_delete"
  on public.comment_likes for delete
  using (auth.uid() = user_id);
