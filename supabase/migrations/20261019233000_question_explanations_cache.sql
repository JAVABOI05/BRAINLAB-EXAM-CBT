-- Migration: Shared Question Explanations Cache
-- Allows BrainLab AI Tutor to generate a high-quality pedagogical explanation once
-- and reuse it for all learners, eliminating duplicate token expenditure and latency.

create table if not exists public.question_explanations (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  subject text,
  fingerprint text not null,
  explanation text not null,
  model text not null,
  prompt_version text not null default 'v1',
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_explanations_question_id_key unique (question_id)
);

create index if not exists idx_question_explanations_qid on public.question_explanations (question_id);
create index if not exists idx_question_explanations_fingerprint on public.question_explanations (fingerprint);

-- Enable Row Level Security
alter table public.question_explanations enable row level security;

-- Policy: All authenticated learners or visitors on corrections can read cached explanations
create policy "Allow read access to question_explanations"
  on public.question_explanations
  for select
  using (true);

-- Policy: Inserts/Updates restricted to service role
create policy "Allow service_role full access to question_explanations"
  on public.question_explanations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
