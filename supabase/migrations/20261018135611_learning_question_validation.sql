-- Tighten the learning question bank at the database boundary.
-- The Tutor UI validates these fields too, but direct authenticated API calls must
-- not be able to persist malformed options or a correct answer that is not an option.
-- This migration is additive and must be validated on an isolated staging database.

begin;

create or replace function public.learning_question_options_valid(
  p_options jsonb,
  p_question_type public.topic_question_type,
  p_correct_answer text
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $function$
declare
  item jsonb;
  option_id text;
  option_text text;
  seen_ids text[] := array[]::text[];
  true_text text;
  false_text text;
begin
  if jsonb_typeof(p_options) is distinct from 'array' then
    return false;
  end if;

  if jsonb_array_length(p_options) < 2 or jsonb_array_length(p_options) > 8 then
    return false;
  end if;

  if p_correct_answer is null or length(btrim(p_correct_answer)) = 0 then
    return false;
  end if;

  for item in select value from jsonb_array_elements(p_options)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item -> 'id') is distinct from 'string'
      or jsonb_typeof(item -> 'text') is distinct from 'string' then
      return false;
    end if;

    option_id := item ->> 'id';
    option_text := item ->> 'text';

    if length(btrim(option_id)) = 0 or length(btrim(option_text)) = 0 then
      return false;
    end if;

    if option_id = any(seen_ids) then
      return false;
    end if;

    seen_ids := array_append(seen_ids, option_id);

    if option_id = 'true' then
      true_text := option_text;
    elsif option_id = 'false' then
      false_text := option_text;
    end if;
  end loop;

  if p_question_type = 'true_false' then
    return cardinality(seen_ids) = 2
      and array_position(seen_ids, 'true') is not null
      and array_position(seen_ids, 'false') is not null
      and true_text = 'True'
      and false_text = 'False'
      and p_correct_answer in ('true', 'false');
  end if;

  return p_correct_answer = any(seen_ids);
end;
$function$;

revoke all on function public.learning_question_options_valid(
  jsonb, public.topic_question_type, text
) from public, anon;
grant execute on function public.learning_question_options_valid(
  jsonb, public.topic_question_type, text
) to authenticated, service_role;

alter table public.learning_test_questions
  add constraint learning_test_questions_options_valid
  check (
    public.learning_question_options_valid(options, question_type, correct_answer)
  );

commit;
