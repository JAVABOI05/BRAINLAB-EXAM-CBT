-- Auditable normalization of historical four-subject UTME result aggregates.
-- Raw answers and question-level marks remain untouched.

begin;

create table if not exists public.exam_score_standardization_audit (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null unique references public.results(id) on delete cascade,
  previous_score integer not null,
  previous_total integer not null,
  standardized_score integer not null,
  standardized_total integer not null default 400,
  reason text not null default 'Normalize four-subject UTME result to 400-mark scale',
  standardized_at timestamptz not null default now()
);

alter table public.exam_score_standardization_audit enable row level security;
revoke all on public.exam_score_standardization_audit from public, anon, authenticated;

with normalized as (
  select
    r.id,
    r.score as previous_score,
    r.total as previous_total,
    public._standardized_utme_scores(r.id) as standardized
  from public.results r
),
eligible as (
  select
    id,
    previous_score,
    previous_total,
    (standardized ->> 'score')::integer as standardized_score
  from normalized
  where coalesce((standardized ->> 'is_utme')::boolean, false)
)
insert into public.exam_score_standardization_audit (
  result_id, previous_score, previous_total, standardized_score, standardized_total
)
select id, previous_score, previous_total, standardized_score, 400
from eligible
where previous_total <> 400 or previous_score <> standardized_score
on conflict (result_id) do nothing;

with normalized as (
  select
    r.id,
    public._standardized_utme_scores(r.id) as standardized
  from public.results r
)
update public.results r
set score = (normalized.standardized ->> 'score')::integer,
    total = 400
from normalized
where normalized.id = r.id
  and coalesce((normalized.standardized ->> 'is_utme')::boolean, false)
  and (r.total <> 400 or r.score <> (normalized.standardized ->> 'score')::integer);

commit;
