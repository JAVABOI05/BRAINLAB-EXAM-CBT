-- Make tutor profile identity and creation timestamps immutable.
create or replace function public.enforce_tutor_profile_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
  end if;

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

revoke all on function public.enforce_tutor_profile_ownership() from public, anon, authenticated;
