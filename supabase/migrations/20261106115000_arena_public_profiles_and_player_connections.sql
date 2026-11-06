begin;
create table if not exists public.competition_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 280),
  visibility text not null default 'private' check (visibility in ('public','private')),
  challenge_availability text not null default 'anyone'
    check (challenge_availability in ('anyone','approved_only','nobody','available_only')),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists competition_public_profiles_visibility_idx
  on public.competition_public_profiles (visibility, display_name);

create table if not exists public.competition_player_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_player_connections_not_self check (user_id <> connected_user_id),
  constraint competition_player_connections_unique unique (user_id, connected_user_id)
);
create index if not exists competition_player_connections_reverse_idx
  on public.competition_player_connections (connected_user_id, status);

alter table public.competition_public_profiles enable row level security;
alter table public.competition_player_connections enable row level security;

drop policy if exists competition_public_profiles_read on public.competition_public_profiles;
create policy competition_public_profiles_read on public.competition_public_profiles
  for select to authenticated
  using (visibility = 'public' or user_id = auth.uid());

drop policy if exists competition_public_profiles_insert_own on public.competition_public_profiles;
create policy competition_public_profiles_insert_own on public.competition_public_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists competition_public_profiles_update_own on public.competition_public_profiles;
create policy competition_public_profiles_update_own on public.competition_public_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists competition_player_connections_read_own on public.competition_player_connections;
create policy competition_player_connections_read_own on public.competition_player_connections
  for select to authenticated using (user_id = auth.uid() or connected_user_id = auth.uid());

commit;