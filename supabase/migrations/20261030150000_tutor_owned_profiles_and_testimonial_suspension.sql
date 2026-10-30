-- Tutor-owned public profiles with moderator approval; suspend student testimonials.
begin;

alter table public.tutor_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists education text not null default '',
  add column if not exists certifications text not null default '',
  add column if not exists years_experience integer not null default 0,
  add column if not exists specialties text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists teaching_approach text not null default '',
  add column if not exists website_url text,
  add column if not exists linkedin_url text,
  add column if not exists profile_status text not null default 'draft',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.tutor_profiles
  add constraint tutor_profiles_years_experience_check check (years_experience between 0 and 60),
  add constraint tutor_profiles_profile_status_check check (profile_status in ('draft','pending','approved','rejected','suspended'));

create unique index if not exists tutor_profiles_user_id_unique
  on public.tutor_profiles(user_id) where user_id is not null;
create index if not exists tutor_profiles_status_order_idx
  on public.tutor_profiles(profile_status, sort_order);

create or replace function public.current_user_is_brainlab_tutor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1 from public.admin_profiles ap
    where ap.user_id = auth.uid() and ap.role = 'teacher'
  );
$function$;

revoke all on function public.current_user_is_brainlab_tutor() from public, anon;
grant execute on function public.current_user_is_brainlab_tutor() to authenticated;

create or replace function public.enforce_tutor_profile_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if public.current_user_is_brainlab_tutor() then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid();
      new.profile_status := 'pending';
      new.is_published := false;
      new.sort_order := 0;
      new.review_note := '';
      new.reviewed_at := null;
      new.reviewed_by := null;
    else
      if old.user_id is distinct from auth.uid() or new.user_id is distinct from old.user_id then
        raise exception 'Tutors may only edit their own profile';
      end if;
      new.profile_status := 'pending';
      new.is_published := false;
      new.review_note := '';
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.sort_order := old.sort_order;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists enforce_tutor_profile_ownership on public.tutor_profiles;
create trigger enforce_tutor_profile_ownership
before insert or update on public.tutor_profiles
for each row execute function public.enforce_tutor_profile_ownership();

drop policy if exists tutor_profiles_public_read on public.tutor_profiles;
create policy tutor_profiles_public_read on public.tutor_profiles
  for select to anon, authenticated using (is_published and profile_status = 'approved');

drop policy if exists tutor_profiles_owner_read on public.tutor_profiles;
create policy tutor_profiles_owner_read on public.tutor_profiles
  for select to authenticated using (user_id = (select auth.uid()) and public.current_user_is_brainlab_tutor());

drop policy if exists tutor_profiles_owner_insert on public.tutor_profiles;
create policy tutor_profiles_owner_insert on public.tutor_profiles
  for insert to authenticated with check (user_id = (select auth.uid()) and public.current_user_is_brainlab_tutor());

drop policy if exists tutor_profiles_owner_update on public.tutor_profiles;
create policy tutor_profiles_owner_update on public.tutor_profiles
  for update to authenticated
  using (user_id = (select auth.uid()) and public.current_user_is_brainlab_tutor())
  with check (user_id = (select auth.uid()) and public.current_user_is_brainlab_tutor());

-- Admins retain review/moderation access through the existing permission policies.
-- Admin-created profiles are no longer the default authoring workflow.

-- Public testimonial display and writes are disabled without deleting existing records.
update public.student_testimonials
set is_approved = false, show_on_homepage = false, show_on_pricing = false, updated_at = now()
where is_approved or show_on_homepage or show_on_pricing;

drop policy if exists student_testimonials_public_read on public.student_testimonials;
create policy student_testimonials_public_read on public.student_testimonials
  for select to anon, authenticated using (false);
drop policy if exists student_testimonials_admin_insert on public.student_testimonials;
drop policy if exists student_testimonials_admin_update on public.student_testimonials;
drop policy if exists student_testimonials_admin_delete on public.student_testimonials;

-- Public tutor headshots; each teacher may upload only into their own UUID folder.
insert into storage.buckets (id, name, public)
values ('tutor-avatars', 'tutor-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists tutor_avatar_public_read on storage.objects;
create policy tutor_avatar_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'tutor-avatars');

drop policy if exists tutor_avatar_owner_insert on storage.objects;
create policy tutor_avatar_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tutor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_is_brainlab_tutor()
  );

drop policy if exists tutor_avatar_owner_update on storage.objects;
create policy tutor_avatar_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tutor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_is_brainlab_tutor()
  )
  with check (
    bucket_id = 'tutor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_is_brainlab_tutor()
  );

drop policy if exists tutor_avatar_owner_delete on storage.objects;
create policy tutor_avatar_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tutor-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_is_brainlab_tutor()
  );

commit;
