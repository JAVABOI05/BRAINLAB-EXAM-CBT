begin;
alter table public.competitions
  add column if not exists spectator_questions_visible boolean not null default false,
  add column if not exists spectator_scoreboard_visible boolean not null default true;
commit;