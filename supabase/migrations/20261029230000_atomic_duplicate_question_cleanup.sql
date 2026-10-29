-- Atomic duplicate-question cleanup.
-- Enforces the retain-at-least-one-active-question invariant inside one transaction.
begin;

create or replace function public.admin_cleanup_duplicate_questions(
  p_group_ids bigint[],
  p_target_ids bigint[],
  p_retain_question_id bigint,
  p_action text
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_group_count integer;
  v_target_count integer;
  v_active_group_count integer;
  v_active_target_count integer;
  v_retain_active boolean;
  v_affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_action not in ('archive', 'delete') then
    raise exception 'Invalid duplicate cleanup action' using errcode = '22023';
  end if;

  if p_group_ids is null or cardinality(p_group_ids) < 2
     or p_target_ids is null or cardinality(p_target_ids) < 1
     or p_retain_question_id is null then
    raise exception 'A duplicate group, target list, and retained question are required'
      using errcode = '22023';
  end if;

  if cardinality(p_group_ids) <> (select count(distinct x) from unnest(p_group_ids) as ids(id))
     or cardinality(p_target_ids) <> (select count(distinct x) from unnest(p_target_ids) as ids(id)) then
    raise exception 'Duplicate IDs are not allowed in cleanup requests' using errcode = '22023';
  end if;

  if not (p_retain_question_id = any(p_group_ids))
     or p_retain_question_id = any(p_target_ids) then
    raise exception 'The retained question must belong to the group and cannot be a cleanup target'
      using errcode = '22023';
  end if;

  if not public.admin_has_permission('cbt.questions.manage') then
    raise exception 'Insufficient permission to manage questions' using errcode = '42501';
  end if;

  if p_action = 'delete'
     and not public.admin_has_permission('cbt.questions.delete') then
    raise exception 'Insufficient permission to delete questions' using errcode = '42501';
  end if;

  -- Lock every row in a deterministic order so concurrent cleanup requests for
  -- the same duplicate group serialize before the safety checks and mutation.
  perform q.id
    from public.questions q
    where q.id = any(p_group_ids)
    order by q.id
    for update;

  select count(*) into v_group_count
    from public.questions q
    where q.id = any(p_group_ids);

  select count(*) into v_target_count
    from public.questions q
    where q.id = any(p_target_ids)
      and q.id = any(p_group_ids);

  if v_group_count <> cardinality(p_group_ids)
     or v_target_count <> cardinality(p_target_ids) then
    raise exception 'The duplicate group changed or contains unavailable questions; refresh and review it'
      using errcode = '40001';
  end if;

  select count(*) into v_active_group_count
    from public.questions q
    where q.id = any(p_group_ids)
      and q.is_active is true;

  select count(*) into v_active_target_count
    from public.questions q
    where q.id = any(p_target_ids)
      and q.is_active is true;

  select exists (
    select 1 from public.questions q
    where q.id = p_retain_question_id and q.is_active is true
  ) into v_retain_active;

  if not v_retain_active
     or v_active_target_count <> cardinality(p_target_ids)
     or v_active_group_count - cardinality(p_target_ids) < 1 then
    raise exception 'Cleanup blocked: at least one active question must remain in this duplicate group'
      using errcode = '23514';
  end if;

  if p_action = 'archive' then
    update public.questions
      set is_active = false
      where id = any(p_target_ids)
        and id = any(p_group_ids)
        and is_active is true;
    get diagnostics v_affected = row_count;
  else
    delete from public.questions
      where id = any(p_target_ids)
        and id = any(p_group_ids)
        and is_active is true;
    get diagnostics v_affected = row_count;
  end if;

  if v_affected <> cardinality(p_target_ids) then
    raise exception 'Cleanup did not affect the expected number of questions; transaction rolled back'
      using errcode = '40001';
  end if;

  return v_affected;
end;
$function$;

revoke all on function public.admin_cleanup_duplicate_questions(bigint[], bigint[], bigint, text) from public, anon;
grant execute on function public.admin_cleanup_duplicate_questions(bigint[], bigint[], bigint, text) to authenticated;

commit;
