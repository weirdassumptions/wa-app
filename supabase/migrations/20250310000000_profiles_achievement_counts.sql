-- Conteggi achievement per profilo (utente settimana, challenge vinte).
alter table public.profiles add column if not exists weeks_won_count integer default 0;
alter table public.profiles add column if not exists challenges_won_count integer default 0;
