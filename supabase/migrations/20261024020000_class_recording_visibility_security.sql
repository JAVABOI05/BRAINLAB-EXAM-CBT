-- Tutor-controlled classroom recording visibility and private media storage.
begin;

alter table public.class_recordings
  add column if not exists is_visible_to_students boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

-- Recordings are private by default. Access is granted through server-issued signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-class-recordings',
  'live-class-recordings',
  false,
  1073741824,
  array['video/webm', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
set public = false,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public delivery is appropriate for published lesson assets; only the server can mint upload tokens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-content-media',
  'learning-content-media',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "class_recordings_select_visible_or_owner" on public.class_recordings;
create policy "class_recordings_select_visible_or_owner"
on public.class_recordings
for select
to authenticated
using (
  (is_visible_to_students = true and processing_status = 'ready')
  or exists (
    select 1 from public.live_classes lc
    where lc.id = class_recordings.class_id and lc.tutor_id = auth.uid()
  )
  or exists (
    select 1 from public.admin_users a WHERE a.id = auth.uid()
      and a.role in ('super_admin', 'platform_admin')
  )
);

drop policy if exists "class_recordings_insert_tutor_or_admin" on public.class_recordings;
create policy "class_recordings_insert_tutor_or_admin"
on public.class_recordings
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1 from public.live_classes lc
      where lc.id = class_recordings.class_id and lc.tutor_id = auth.uid()
    )
    or exists (
      select 1 from public.admin_users a WHERE a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin')
    )
  )
);

drop policy if exists "class_recordings_update_tutor_or_admin" on public.class_recordings;
create policy "class_recordings_update_tutor_or_admin"
on public.class_recordings
for update
to authenticated
using (
  exists (
    select 1 from public.live_classes lc
    where lc.id = class_recordings.class_id and lc.tutor_id = auth.uid()
  )
  or exists (
    select 1 from public.admin_users a WHERE a.id = auth.uid()
      and a.role in ('super_admin', 'platform_admin')
  )
)
with check (
  exists (
    select 1 from public.live_classes lc
    where lc.id = class_recordings.class_id and lc.tutor_id = auth.uid()
  )
  or exists (
    select 1 from public.admin_users a WHERE a.id = auth.uid()
      and a.role in ('super_admin', 'platform_admin')
  )
);

commit;
