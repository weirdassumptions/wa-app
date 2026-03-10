-- RPC per ottenere un'assumption casuale (esclude contenuti segnalati).
-- Usato dalla pagina /random.

create or replace function public.get_random_assumption()
returns table (id uuid, text text, username text)
language sql
security definer
stable
as $$
  select a.id, a.text, a.username
  from public.assumptions a
  where not exists (
    select 1 from public.reports r
    where r.content_type = 'post' and r.content_id = a.id
  )
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_assumption() to anon;
grant execute on function public.get_random_assumption() to authenticated;
