-- BRAINLAB CBT MASTER ENGINE BLUEPRINT MIGRATION
-- Adds Option E support, topics, reading texts, blueprints, high yield rules, attempt snapshots, and duplicate reviews.

begin;

-- 1. Enhance public.questions with Option E, topic fields, reading text association, and archival flags
alter table public.questions
  add column if not exists option_e text,
  add column if not exists option_e_image_url text,
  add column if not exists option_e_image_alt text,
  add column if not exists topic text,
  add column if not exists subtopic text,
  add column if not exists reading_text_id text,
  add column if not exists verification_status text default 'verified',
  add column if not exists is_archived boolean default false,
  add column if not exists duplicate_of_id bigint;

-- Backfill topic from category where category is not null and topic is null
update public.questions
set topic = category
where topic is null and category is not null;

-- Add https check constraint for option_e_image_url
do $constraints$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'questions_option_e_image_url_https_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_option_e_image_url_https_check
      check (option_e_image_url is null or option_e_image_url ~* '^https://');
  end if;
end;
$constraints$;

-- 2. Reading Texts registry (The Lekki Headmaster active, The Life Changer deferred)
create table if not exists public.reading_texts (
  id text primary key,
  title text not null,
  author text,
  year text,
  is_active boolean default false,
  description text,
  created_at timestamptz default now()
);

insert into public.reading_texts (id, title, author, is_active, description)
values
  ('lekki_headmaster', 'The Lekki Headmaster', 'Kabir Alabi Garba', true, 'Official UTME English prescribed reading text for the active academic session.'),
  ('life_changer', 'The Life Changer', 'Khadija Abubakar Jalli', false, 'Deferred previous prescribed text retained in archive.')
on conflict (id) do update set
  title = excluded.title,
  is_active = excluded.is_active;

-- 3. Examination Blueprints
create table if not exists public.exam_blueprints (
  id text primary key,
  name text not null,
  subject text not null,
  total_questions int not null,
  raw_max_marks numeric not null,
  converted_max_marks numeric not null default 100,
  score_conversion_formula text not null default 'direct', -- 'direct' or 'english_90_to_100'
  sections_config jsonb not null default '[]'::jsonb,
  reading_text_config jsonb default '{}'::jsonb,
  topic_coverage_rule jsonb default '{"strategy": "maximise_distinct", "min_per_topic": 1, "max_per_topic": 4}'::jsonb,
  is_active boolean default true,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed UTME English blueprint (60 questions, raw max 90 marks, converted to 100)
insert into public.exam_blueprints (
  id, name, subject, total_questions, raw_max_marks, converted_max_marks, score_conversion_formula, sections_config, reading_text_config
)
values (
  'utme_english_60',
  'JAMB UTME English Language Official Blueprint',
  'English',
  60,
  90,
  100,
  'english_90_to_100',
  '[
    {"section": "Comprehension", "quota": 5, "marks_per_question": 3, "raw_total": 15, "passage_required": true},
    {"section": "Cloze passage", "quota": 10, "marks_per_question": 2, "raw_total": 20, "passage_required": true},
    {"section": "Reading text", "quota": 10, "marks_per_question": 1, "raw_total": 10, "reading_text_id": "lekki_headmaster"},
    {"section": "Sentence interpretation", "quota": 5, "marks_per_question": 2, "raw_total": 10},
    {"section": "Antonyms", "quota": 5, "marks_per_question": 2, "raw_total": 10},
    {"section": "Synonyms", "quota": 5, "marks_per_question": 1, "raw_total": 5},
    {"section": "Sentence completion", "quota": 10, "marks_per_question": 1, "raw_total": 10},
    {"section": "Oral forms", "quota": 10, "marks_per_question": 1, "raw_total": 10}
  ]'::jsonb,
  '{"active_text_id": "lekki_headmaster", "active_title": "The Lekki Headmaster", "question_quota": 10}'::jsonb
)
on conflict (id) do update set
  sections_config = excluded.sections_config,
  raw_max_marks = excluded.raw_max_marks,
  total_questions = excluded.total_questions;

-- Seed Standard Subject blueprint (40 questions, 2.5 marks each = 100 marks)
insert into public.exam_blueprints (
  id, name, subject, total_questions, raw_max_marks, converted_max_marks, score_conversion_formula, sections_config
)
values (
  'utme_standard_40',
  'JAMB UTME Standard Subject Blueprint',
  'General',
  40,
  100,
  100,
  'direct',
  '[
    {"section": "objective", "quota": 40, "marks_per_question": 2.5, "raw_total": 100}
  ]'::jsonb
)
on conflict (id) do update set
  raw_max_marks = excluded.raw_max_marks,
  total_questions = excluded.total_questions;

-- 4. High Yield Topics configuration
create table if not exists public.high_yield_topics (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  blueprint_id text default 'utme_standard_40',
  topic text not null,
  section text,
  quota int not null default 5,
  priority int not null default 1,
  min_questions int default 1,
  max_questions int default 10,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- 5. Exam Attempt Snapshots for immutable historical reproducibility
create table if not exists public.exam_attempt_snapshots (
  session_id uuid primary key,
  blueprint_id text,
  blueprint_version int default 1,
  paper_ids bigint[] not null,
  questions_snapshot jsonb not null,
  marking_rules jsonb not null,
  created_at timestamptz default now()
);

-- 6. Duplicate Question Reviews
create table if not exists public.duplicate_question_reviews (
  id uuid primary key default gen_random_uuid(),
  group_hash text not null,
  duplicate_type text not null, -- 'exact', 'likely', 'potential'
  question_ids bigint[] not null,
  status text not null default 'pending', -- 'pending', 'resolved_keep_both', 'resolved_archived', 'resolved_merged'
  retained_question_id bigint,
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- 7. Update _paper_json to return option_e if present
create or replace function public._paper_json(p_ids bigint[])
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id,
      'subject', q.subject,
      'section', q.section,
      'category', coalesce(q.topic, q.category),
      'topic', coalesce(q.topic, q.category),
      'subtopic', q.subtopic,
      'passage_id', q.passage_id,
      'passage_title', q.passage_title,
      'passage_text', q.passage_text,
      'question', q.question,
      'question_image_url', q.question_image_url,
      'question_image_alt', q.question_image_alt,
      'option_a', q.option_a, 'option_a_image_url', q.option_a_image_url, 'option_a_image_alt', q.option_a_image_alt,
      'option_b', q.option_b, 'option_b_image_url', q.option_b_image_url, 'option_b_image_alt', q.option_b_image_alt,
      'option_c', q.option_c, 'option_c_image_url', q.option_c_image_url, 'option_c_image_alt', q.option_c_image_alt,
      'option_d', q.option_d, 'option_d_image_url', q.option_d_image_url, 'option_d_image_alt', q.option_d_image_alt,
      'option_e', q.option_e, 'option_e_image_url', q.option_e_image_url, 'option_e_image_alt', q.option_e_image_alt,
      'marks', q.marks) order by array_position(p_ids, q.id)), '[]'::jsonb)
  from public.questions q where q.id = any (p_ids) and not coalesce(q.is_archived, false);
$function$;

-- 8. Update get_result_corrections to support option_e in corrections
create or replace function public.get_result_corrections(p_result_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_items jsonb;
begin
  if not public._setting_bool('show_results', false) then
    return jsonb_build_object(
      'ok', false,
      'error', 'results_not_released',
      'message', 'Results have not been released yet. Please check back later.'
    );
  end if;

  if p_result_id is null or not exists (
    select 1
    from public.results r
    join public.exam_sessions s on s.id::text = r.session_id
    where r.id = p_result_id
      and s.result_id = r.id
      and s.submitted_at is not null
      and s.status in ('submitted', 'expired')
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'This result could not be found or is not yet finalised.'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.question_id::text,
        'subject', coalesce(a.subject, q.subject, ''),
        'type', coalesce(q.topic, q.category, ''),
        'text', coalesce(a.question_text, q.question, ''),
        'options', case
          when q.option_e is not null and trim(q.option_e) <> '' then
            jsonb_build_object(
              'A', coalesce(q.option_a, ''),
              'B', coalesce(q.option_b, ''),
              'C', coalesce(q.option_c, ''),
              'D', coalesce(q.option_d, ''),
              'E', coalesce(q.option_e, '')
            )
          else
            jsonb_build_object(
              'A', coalesce(q.option_a, ''),
              'B', coalesce(q.option_b, ''),
              'C', coalesce(q.option_c, ''),
              'D', coalesce(q.option_d, '')
            )
        end,
        'optionImages', jsonb_build_object(
          'A', q.option_a_image_url,
          'B', q.option_b_image_url,
          'C', q.option_c_image_url,
          'D', q.option_d_image_url,
          'E', q.option_e_image_url
        ),
        'optionImageAlts', jsonb_build_object(
          'A', q.option_a_image_alt,
          'B', q.option_b_image_alt,
          'C', q.option_c_image_alt,
          'D', q.option_d_image_alt,
          'E', q.option_e_image_alt
        ),
        'questionImageUrl', q.question_image_url,
        'questionImageAlt', q.question_image_alt,
        'correctAnswer', a.correct_answer,
        'explanation', coalesce(q.explanation, ''),
        'explanationImageUrl', q.explanation_image_url,
        'explanationImageAlt', q.explanation_image_alt,
        'userAnswer', a.selected_answer,
        'isCorrect', a.is_correct,
        'flagged', false,
        'marks', a.marks
      ) order by array_position(s.paper_ids, a.question_id), a.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.answers a
  join public.results r on r.id = a.result_id
  join public.exam_sessions s on s.id::text = r.session_id
  left join public.questions q on q.id = a.question_id
  where a.result_id = p_result_id;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$function$;

commit;
