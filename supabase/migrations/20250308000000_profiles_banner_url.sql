-- Banner/cover personalizzabile nel profilo (come avatar).
alter table public.profiles add column if not exists banner_url text;
