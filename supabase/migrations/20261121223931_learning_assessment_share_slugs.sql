-- Human-readable, stable share URLs for learning assessments.
-- UUIDs remain the canonical primary keys; existing UUID links continue to work.

alter table public.learning_assessments
  add column slug text;

with normalized as (
  select
    id,
    coalesce(
      nullif(trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'assessment'
    ) as base_slug
  from public.learning_assessments
),
ranked as (
  select id, base_slug, count(*) over (partition by base_slug) as copies
  from normalized
)
update public.learning_assessments a
set slug = case
  when r.copies = 1 then r.base_slug
  else r.base_slug || '-' || left(replace(a.id::text, '-', ''), 6)
end
from ranked r
where a.id = r.id;

alter table public.learning_assessments
  alter column slug set not null;

create unique index learning_assessments_slug_key
  on public.learning_assessments (slug);

create or replace function public.set_learning_assessment_slug()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  base_slug text;
  candidate_slug text;
  id_suffix text;
  collision_number integer := 2;
begin
  base_slug := coalesce(
    nullif(trim(both '-' from lower(regexp_replace(
      coalesce(nullif(btrim(new.slug), ''), new.title),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    ))), ''),
    'assessment'
  );

  candidate_slug := base_slug;
  id_suffix := left(replace(new.id::text, '-', ''), 6);

  if exists (
    select 1 from public.learning_assessments
    where slug = candidate_slug and id is distinct from new.id
  ) then
    candidate_slug := base_slug || '-' || id_suffix;
  end if;

  while exists (
    select 1 from public.learning_assessments
    where slug = candidate_slug and id is distinct from new.id
  ) loop
    candidate_slug := base_slug || '-' || id_suffix || '-' || collision_number::text;
    collision_number := collision_number + 1;
  end loop;

  new.slug := candidate_slug;
  return new;
end;
$function$;

drop trigger if exists learning_assessments_set_slug on public.learning_assessments;
create trigger learning_assessments_set_slug
before insert on public.learning_assessments
for each row execute function public.set_learning_assessment_slug();

revoke all on function public.set_learning_assessment_slug() from public, anon, authenticated;
