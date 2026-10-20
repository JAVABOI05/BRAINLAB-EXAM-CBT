-- Admin-managed public question media and tighter execution grants for admin probes.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-media',
  'question-media',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists question_media_admin_read on storage.objects;
create policy question_media_admin_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'question-media'
  and public.admin_has_permission('cbt.questions.manage')
);

drop policy if exists question_media_admin_upload on storage.objects;
create policy question_media_admin_upload
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'question-media'
  and public.admin_has_permission('cbt.questions.manage')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists question_media_admin_update on storage.objects;
create policy question_media_admin_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'question-media'
  and public.admin_has_permission('cbt.questions.manage')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'question-media'
  and public.admin_has_permission('cbt.questions.manage')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists question_media_admin_delete on storage.objects;
create policy question_media_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'question-media'
  and public.admin_has_permission('cbt.questions.manage')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- These boolean probes are only needed after authentication. Keep public exam RPCs
-- public where the legacy candidate flow requires them; each validates its token/code.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated, service_role;

-- Trigger functions are invoked by their triggers, not through the Data API.
revoke all on function public.set_learning_updated_at() from public, anon, authenticated;

commit;
