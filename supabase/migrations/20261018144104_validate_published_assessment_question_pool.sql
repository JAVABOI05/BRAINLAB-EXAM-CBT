-- Prevent publishing assessment configurations that cannot be filled from the active question pool.
begin;
create or replace function public.validate_published_learning_assessment()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_available integer;
begin
  if new.is_published and new.question_source='legacy_questions' then
    if coalesce(cardinality(new.subjects),0)=0 then raise exception 'Select at least one question-bank subject before publishing' using errcode='22023'; end if;
    select count(*)::integer into v_available from public.questions q
    where q.is_active=true and q.subject=any(new.subjects)
      and (coalesce(cardinality(new.categories),0)=0 or q.category=any(new.categories));
    if v_available<new.question_count then
      raise exception 'Cannot publish: only % matching active questions are available for a % question assessment',v_available,new.question_count using errcode='22023';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.validate_published_learning_assessment() from public,anon,authenticated;
drop trigger if exists validate_published_learning_assessment on public.learning_assessments;
create trigger validate_published_learning_assessment
before insert or update of is_published,subjects,categories,question_count,question_source
on public.learning_assessments for each row execute function public.validate_published_learning_assessment();
commit;
