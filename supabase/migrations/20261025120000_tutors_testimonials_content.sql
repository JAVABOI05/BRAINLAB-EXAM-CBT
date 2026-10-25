-- Admin-managed tutor profiles and approved student testimonials.
begin;

create table if not exists public.tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null default '',
  bio text not null default '',
  qualifications text not null default '',
  photo_url text,
  subject_slugs text[] not null default '{}',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_testimonials (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (length(trim(student_name)) between 2 and 120),
  student_context text not null default '',
  story text not null check (length(trim(story)) between 10 and 3000),
  quote text not null default '' check (length(quote) <= 320),
  attribution text not null default '',
  is_approved boolean not null default false,
  show_on_homepage boolean not null default false,
  show_on_pricing boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonial_placements_require_approval check (
    (not show_on_homepage and not show_on_pricing) or is_approved
  )
);

create index if not exists tutor_profiles_published_order_idx
  on public.tutor_profiles (is_published, sort_order);
create index if not exists student_testimonials_public_order_idx
  on public.student_testimonials (is_approved, sort_order);

alter table public.tutor_profiles enable row level security;
alter table public.student_testimonials enable row level security;

drop policy if exists tutor_profiles_public_read on public.tutor_profiles;
create policy tutor_profiles_public_read on public.tutor_profiles
  for select to anon, authenticated using (is_published);

drop policy if exists tutor_profiles_admin_read on public.tutor_profiles;
create policy tutor_profiles_admin_read on public.tutor_profiles
  for select to authenticated using (public.admin_has_permission('learning.content.manage'));

drop policy if exists tutor_profiles_admin_insert on public.tutor_profiles;
create policy tutor_profiles_admin_insert on public.tutor_profiles
  for insert to authenticated with check (public.admin_has_permission('learning.content.manage'));

drop policy if exists tutor_profiles_admin_update on public.tutor_profiles;
create policy tutor_profiles_admin_update on public.tutor_profiles
  for update to authenticated using (public.admin_has_permission('learning.content.manage'))
  with check (public.admin_has_permission('learning.content.manage'));

drop policy if exists tutor_profiles_admin_delete on public.tutor_profiles;
create policy tutor_profiles_admin_delete on public.tutor_profiles
  for delete to authenticated using (public.admin_has_permission('learning.content.manage'));

drop policy if exists student_testimonials_public_read on public.student_testimonials;
create policy student_testimonials_public_read on public.student_testimonials
  for select to anon, authenticated using (is_approved);

drop policy if exists student_testimonials_admin_read on public.student_testimonials;
create policy student_testimonials_admin_read on public.student_testimonials
  for select to authenticated using (public.admin_has_permission('learning.content.manage'));

drop policy if exists student_testimonials_admin_insert on public.student_testimonials;
create policy student_testimonials_admin_insert on public.student_testimonials
  for insert to authenticated with check (public.admin_has_permission('learning.content.manage'));

drop policy if exists student_testimonials_admin_update on public.student_testimonials;
create policy student_testimonials_admin_update on public.student_testimonials
  for update to authenticated using (public.admin_has_permission('learning.content.manage'))
  with check (public.admin_has_permission('learning.content.manage'));

drop policy if exists student_testimonials_admin_delete on public.student_testimonials;
create policy student_testimonials_admin_delete on public.student_testimonials
  for delete to authenticated using (public.admin_has_permission('learning.content.manage'));

grant select on public.tutor_profiles, public.student_testimonials to anon, authenticated;
grant insert, update, delete on public.tutor_profiles, public.student_testimonials to authenticated;

commit;
