begin;

select plan(11);

select ok(
  not has_function_privilege('anon', 'public.record_learning_activity(uuid,text,text,numeric)', 'EXECUTE'),
  'anonymous clients cannot call the generic activity RPC'
);

select ok(
  not has_function_privilege('authenticated', 'public.record_learning_activity(uuid,text,text,numeric)', 'EXECUTE'),
  'authenticated clients cannot forge generic activity references or scores'
);

select ok(
  has_function_privilege('service_role', 'public.record_learning_activity(uuid,text,text,numeric)', 'EXECUTE'),
  'trusted server-side execution retains access to the generic activity RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.record_verified_assessment_activity(uuid)', 'EXECUTE'),
  'authenticated learners can call the verified attempt-specific award RPC'
);

select ok(
  not has_function_privilege('anon', 'public.record_verified_assessment_activity(uuid)', 'EXECUTE'),
  'anonymous clients cannot call the verified award RPC'
);

select ok(
  not has_table_privilege('anon', 'public.verified_gamification_award_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.verified_gamification_award_events', 'SELECT'),
  'clients cannot read private award-event records'
);

select ok(
  has_table_privilege('service_role', 'public.verified_gamification_award_events', 'SELECT')
  and has_table_privilege('service_role', 'public.verified_gamification_award_events', 'INSERT'),
  'trusted server-side execution can inspect and record award events'
);

select ok(
  not has_function_privilege('anon', 'public.grade_topic_mcq_assessment(uuid,jsonb)', 'EXECUTE'),
  'anonymous clients cannot call the topic MCQ grader'
);

select ok(
  has_function_privilege('authenticated', 'public.grade_topic_mcq_assessment(uuid,jsonb)', 'EXECUTE'),
  'authenticated learners retain the topic MCQ grading flow'
);

select ok(
  not has_table_privilege('anon', 'public.learning_topic_mcq_grading_attempts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.learning_topic_mcq_grading_attempts', 'SELECT'),
  'clients cannot inspect topic MCQ attempt-limit records'
);

select ok(
  has_table_privilege('service_role', 'public.learning_topic_mcq_grading_attempts', 'SELECT')
  and has_table_privilege('service_role', 'public.learning_topic_mcq_grading_attempts', 'INSERT'),
  'trusted server-side execution can manage topic MCQ attempt records'
);

select * from finish();

rollback;
