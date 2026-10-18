-- Cover Learning Hub foreign keys identified by Supabase performance advisors.
-- This migration is additive; indexes may show as unused until real query traffic exists.
begin;
create index if not exists learning_lesson_progress_lesson_idx on public.learning_lesson_progress(lesson_id);
create index if not exists learning_lesson_progress_last_block_idx on public.learning_lesson_progress(last_block_id);
create index if not exists learning_lessons_created_by_idx on public.learning_lessons(created_by);
create index if not exists learning_subject_memberships_assigned_by_idx on public.learning_subject_memberships(assigned_by);
create index if not exists learning_subjects_created_by_idx on public.learning_subjects(created_by);
create index if not exists learning_test_questions_created_by_idx on public.learning_test_questions(created_by);
create index if not exists learning_topic_tests_created_by_idx on public.learning_topic_tests(created_by);
create index if not exists learning_topics_created_by_idx on public.learning_topics(created_by);
commit;
