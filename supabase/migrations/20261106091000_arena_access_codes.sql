-- Competition and round access codes. Store only a one-way hash, never the redeemable code.
begin;
create table if not exists public.competition_access_codes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_id uuid references public.competition_rounds(id) on delete cascade,
  code_hash text not null,
  label text,
  expires_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (length(code_hash) = 64),
  check (max_uses is null or max_uses > 0),
  check (used_count >= 0),
  unique (competition_id, round_id, code_hash)
);
create index if not exists competition_access_codes_lookup_idx
  on public.competition_access_codes (competition_id, code_hash)
  where is_active = true;
alter table public.competition_access_codes enable row level security;
commit;
