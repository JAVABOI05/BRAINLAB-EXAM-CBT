-- Remove the redundant permissive INSERT policy; the stricter owner-folder policy is retained.
drop policy if exists question_media_admin_insert on storage.objects;
