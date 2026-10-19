-- Migration: Create ai_generations table for logging prompts and responses from Gemini / Google AI Studio

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  response text not null,
  model text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index created_at for fast time-series queries
create index if not exists idx_ai_generations_created_at on public.ai_generations (created_at desc);

-- Enable Row Level Security
alter table public.ai_generations enable row level security;

-- Policy to allow inserts from server or authenticated clients
create policy "Allow inserts to ai_generations"
  on public.ai_generations
  for insert
  with check (true);

-- Policy to allow select from ai_generations
create policy "Allow select on ai_generations"
  on public.ai_generations
  for select
  using (true);
