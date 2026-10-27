-- Migration: Create ai_generations table for logging prompts and responses from Gemini / Google AI Studio

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  prompt text not null,
  response text not null,
  model text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_ai_generations_created_at on public.ai_generations (created_at desc);
create index if not exists idx_ai_generations_user_id on public.ai_generations (user_id);

-- Enable Row Level Security
alter table public.ai_generations enable row level security;

-- Policy: Allow inserts from authenticated users or service role
drop policy if exists "Allow inserts to ai_generations" on public.ai_generations;
create policy "Allow inserts to ai_generations"
  on public.ai_generations
  for insert
  with check (
    user_id is null or user_id = auth.uid() or auth.role() = 'service_role'
  );

-- Policy: Users can view their own generated responses
create policy "Users can view their own ai_generations"
  on public.ai_generations
  for select
  using (
    auth.uid() = user_id or auth.role() = 'service_role'
  );
