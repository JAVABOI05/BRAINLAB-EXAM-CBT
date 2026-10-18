-- Public delivery for question illustrations, but only authorised admins may upload/change/delete them.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('question-media','question-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$
begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='question_media_admin_insert') then
    create policy question_media_admin_insert on storage.objects for insert to authenticated
    with check(bucket_id='question-media' and (public.admin_has_permission('cbt.questions.manage') or public.admin_has_permission('learning.content.manage')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='question_media_admin_update') then
    create policy question_media_admin_update on storage.objects for update to authenticated
    using(bucket_id='question-media' and (public.admin_has_permission('cbt.questions.manage') or public.admin_has_permission('learning.content.manage')))
    with check(bucket_id='question-media' and (public.admin_has_permission('cbt.questions.manage') or public.admin_has_permission('learning.content.manage')));
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='question_media_admin_delete') then
    create policy question_media_admin_delete on storage.objects for delete to authenticated
    using(bucket_id='question-media' and (public.admin_has_permission('cbt.questions.manage') or public.admin_has_permission('learning.content.manage')));
  end if;
end $$;
commit;
