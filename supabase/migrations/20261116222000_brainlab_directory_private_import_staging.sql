-- Private staging tables for the Nigerian institutions directory seed import.
-- All imported source rows remain pending review and are not student-facing.

create table if not exists public.directory_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_url text not null,
  source_file_path text not null,
  source_blob_sha text not null,
  licence text not null,
  source_snapshot_date date not null,
  retrieved_at timestamptz not null default now(),
  coverage_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.directory_import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.directory_sources(id),
  import_version text not null,
  status text not null default 'staged'
    check (status in ('staged','validated','review_required','published','failed','rolled_back')),
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_staged integer not null default 0 check (rows_staged >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.directory_import_rows (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.directory_import_jobs(id) on delete restrict,
  source_key text not null,
  source_row_number integer not null check (source_row_number > 0),
  source_record_key text not null,
  source_name text not null,
  raw_record jsonb not null,
  review_status text not null default 'pending'
    check (review_status in ('pending','approved','rejected','duplicate_candidate','needs_clarification')),
  review_notes text,
  matched_institution_id uuid,
  created_at timestamptz not null default now(),
  unique(job_id, source_record_key)
);

create index if not exists directory_import_rows_job_idx
  on public.directory_import_rows(job_id);
create index if not exists directory_import_rows_source_name_idx
  on public.directory_import_rows using gin (to_tsvector('simple', source_name));

alter table public.directory_sources enable row level security;
alter table public.directory_import_jobs enable row level security;
alter table public.directory_import_rows enable row level security;

revoke all on public.directory_sources from anon, authenticated;
revoke all on public.directory_import_jobs from anon, authenticated;
revoke all on public.directory_import_rows from anon, authenticated;
grant all on public.directory_sources to service_role;
grant all on public.directory_import_jobs to service_role;
grant all on public.directory_import_rows to service_role;
grant usage, select on sequence public.directory_import_rows_id_seq to service_role;
