-- Correct subject scoping in Learning Hub topic RLS policies.
-- The original unqualified subject_id comparison was resolved as m.subject_id = m.subject_id,
-- making the membership predicate tautological and allowing cross-subject access.
-- This migration only changes policies on learning_topics; it does not modify CBT data.

begin;

drop policy if exists learning_topics_manage_scoped
  on public.learning_topics;

create policy learning_topics_manage_scoped
on public.learning_topics
for all
to authenticated
using (
  public.learning_can_manage_all()
  or exists (
    select 1
    from public.learning_subject_memberships m
    where m.subject_id = learning_topics.subject_id
      and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
)
with check (
  public.learning_can_manage_all()
  or exists (
    select 1
    from public.learning_subject_memberships m
    where m.subject_id = learning_topics.subject_id
      and m.user_id = (select auth.uid())
      and m.membership_role = 'tutor'
  )
);

drop policy if exists learning_topics_read_published_or_assigned
  on public.learning_topics;

create policy learning_topics_read_published_or_assigned
on public.learning_topics
for select
to anon, authenticated
using (
  (
    is_published
    and exists (
      select 1
      from public.learning_subjects s
      where s.id = learning_topics.subject_id
        and s.is_published
    )
  )
  or exists (
    select 1
    from public.learning_subject_memberships m
    where m.subject_id = learning_topics.subject_id
      and m.user_id = (select auth.uid())
  )
  or public.learning_can_manage_all()
);

commit;
