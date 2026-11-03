-- BRAINLAB CBT ENGINE - CLOZE TEST INTEGRATION, SUBJECT CONSTRAINTS & RLS HARMONIZATION
-- Migration: 20261103210000_cloze_test_integration_and_subject_constraints.sql

begin;

-- ============================================================================
-- 1. EXTEND SUBJECT AND SECTION CHECK CONSTRAINTS ON PUBLIC.QUESTIONS
-- ============================================================================
alter table public.questions drop constraint if exists questions_subject_check;
alter table public.questions add constraint questions_subject_check check (
  subject in (
    'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Literature in English', 'Government', 'Economics', 'Commerce',
    'Christian Religious Studies', 'Islamic Religious Studies',
    'Geography', 'Agricultural Science', 'Civic Education', 'Computer Studies',
    'History', 'French', 'Music', 'Visual Arts', 'Home Economics',
    'Physical and Health Education', 'Yoruba', 'Hausa', 'Igbo',
    'Further Mathematics', 'General'
  )
);

alter table public.questions drop constraint if exists questions_section_check;
alter table public.questions add constraint questions_section_check check (
  section in ('objective', 'comprehension', 'literature', 'cloze')
);

-- Performance indexes for passage and cloze lookups
create index if not exists idx_questions_passage_id on public.questions (passage_id) where passage_id is not null;
create index if not exists idx_questions_cloze_active on public.questions (subject, is_active, section) where subject = 'English';

-- ============================================================================
-- 2. ROW LEVEL SECURITY POLICIES FOR UNPROTECTED CBT & COMPETITION TABLES
-- ============================================================================
-- Exam Blueprints
alter table public.exam_blueprints enable row level security;
drop policy if exists exam_blueprints_read_all on public.exam_blueprints;
create policy exam_blueprints_read_all on public.exam_blueprints for select using (true);
drop policy if exists exam_blueprints_admin_write on public.exam_blueprints;
create policy exam_blueprints_admin_write on public.exam_blueprints for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reading Texts
alter table public.reading_texts enable row level security;
drop policy if exists reading_texts_read_all on public.reading_texts;
create policy reading_texts_read_all on public.reading_texts for select using (true);
drop policy if exists reading_texts_admin_write on public.reading_texts;
create policy reading_texts_admin_write on public.reading_texts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- High Yield Topics
alter table public.high_yield_topics enable row level security;
drop policy if exists high_yield_topics_read_all on public.high_yield_topics;
create policy high_yield_topics_read_all on public.high_yield_topics for select using (true);
drop policy if exists high_yield_topics_admin_write on public.high_yield_topics;
create policy high_yield_topics_admin_write on public.high_yield_topics for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Duplicate Question Reviews
alter table public.duplicate_question_reviews enable row level security;
drop policy if exists duplicate_reviews_admin on public.duplicate_question_reviews;
create policy duplicate_reviews_admin on public.duplicate_question_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Exam Attempt Snapshots
alter table public.exam_attempt_snapshots enable row level security;
drop policy if exists exam_snapshots_read on public.exam_attempt_snapshots;
create policy exam_snapshots_read on public.exam_attempt_snapshots for select using (true);
drop policy if exists exam_snapshots_insert on public.exam_attempt_snapshots;
create policy exam_snapshots_insert on public.exam_attempt_snapshots for insert with check (true);

-- Competitions
alter table public.competitions enable row level security;
drop policy if exists competitions_read_policy on public.competitions;
create policy competitions_read_policy on public.competitions for select using (
  status in ('active', 'completed', 'published', 'upcoming') or public.is_admin()
);
drop policy if exists competitions_admin_write on public.competitions;
create policy competitions_admin_write on public.competitions for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

alter table public.competition_question_banks enable row level security;
drop policy if exists comp_banks_read on public.competition_question_banks;
create policy comp_banks_read on public.competition_question_banks for select using (
  visibility = 'public' or owner_id = auth.uid() or public.is_admin()
);
drop policy if exists comp_banks_write on public.competition_question_banks;
create policy comp_banks_write on public.competition_question_banks for all to authenticated using (
  owner_id = auth.uid() or public.is_admin()
) with check (
  owner_id = auth.uid() or public.is_admin()
);

alter table public.competition_questions enable row level security;
drop policy if exists comp_questions_read on public.competition_questions;
create policy comp_questions_read on public.competition_questions for select using (
  public.is_admin() or exists (
    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (
      b.visibility = 'public' or b.owner_id = auth.uid()
    )
  )
);
drop policy if exists comp_questions_write on public.competition_questions;
create policy comp_questions_write on public.competition_questions for all to authenticated using (
  public.is_admin() or exists (
    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (
      b.owner_id = auth.uid()
    )
  )
) with check (
  public.is_admin() or exists (
    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (
      b.owner_id = auth.uid()
    )
  )
);

alter table public.competition_participants enable row level security;
drop policy if exists comp_participants_read on public.competition_participants;
create policy comp_participants_read on public.competition_participants for select using (
  user_id = auth.uid() or public.is_admin()
);
drop policy if exists comp_participants_insert on public.competition_participants;
create policy comp_participants_insert on public.competition_participants for insert to authenticated with check (
  user_id = auth.uid() or public.is_admin()
);
drop policy if exists comp_participants_update on public.competition_participants;
create policy comp_participants_update on public.competition_participants for update to authenticated using (
  user_id = auth.uid() or public.is_admin()
);

alter table public.competition_user_permissions enable row level security;
drop policy if exists comp_perms_read on public.competition_user_permissions;
create policy comp_perms_read on public.competition_user_permissions for select using (
  user_id = auth.uid() or public.is_admin()
);
drop policy if exists comp_perms_write on public.competition_user_permissions;
create policy comp_perms_write on public.competition_user_permissions for all to authenticated using (
  public.is_admin()
) with check (
  public.is_admin()
);

alter table public.competition_attempt_snapshots enable row level security;
drop policy if exists comp_snapshots_read on public.competition_attempt_snapshots;
create policy comp_snapshots_read on public.competition_attempt_snapshots for select using (
  user_id = auth.uid() or public.is_admin()
);
drop policy if exists comp_snapshots_insert on public.competition_attempt_snapshots;
create policy comp_snapshots_insert on public.competition_attempt_snapshots for insert with check (true);

alter table public.competition_audit_logs enable row level security;
drop policy if exists competition_audit_logs_admin_policy on public.competition_audit_logs;
create policy competition_audit_logs_admin_policy on public.competition_audit_logs for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

alter table public.competition_import_batches enable row level security;
drop policy if exists competition_import_batches_admin_policy on public.competition_import_batches;
create policy competition_import_batches_admin_policy on public.competition_import_batches for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

alter table public.competition_moderation_cases enable row level security;
drop policy if exists competition_moderation_cases_admin_policy on public.competition_moderation_cases;
create policy competition_moderation_cases_admin_policy on public.competition_moderation_cases for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

alter table public.competition_question_duplicates enable row level security;
drop policy if exists competition_question_duplicates_admin_policy on public.competition_question_duplicates;
create policy competition_question_duplicates_admin_policy on public.competition_question_duplicates for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

alter table public.competition_reward_proposals enable row level security;
drop policy if exists competition_reward_proposals_admin_policy on public.competition_reward_proposals;
create policy competition_reward_proposals_admin_policy on public.competition_reward_proposals for all to authenticated using (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')
) with check (
  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')
);

-- ============================================================================
-- 3. SEED 23 CLOZE TEST PASSAGES AND 230 LINKED QUESTIONS
-- ============================================================================
-- Each passage forms one complete 10-question independent selection unit.
-- Preserves passage_id, sequential blanks [1]..[10], and marks = 2 per question.

-- Passage CLOZE_001: Environmental Conservation and the African Sahel
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [1] in the passage.', 'cover', 'blanket', 'coating', 'shield',
  'A', '''Vegetative cover'' is the standard botanical and ecological collocation referring to plants covering the soil surface.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [2] in the passage.', 'deforestation', 'afforestation', 'cultivation', 'germination',
  'B', '''Afforestation'' refers to the establishment of a forest or stand of trees in an area where there was no previous tree cover.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [3] in the passage.', 'resilience', 'rigidity', 'fragility', 'obsolescence',
  'A', '''Resilience'' denotes the capacity of an ecosystem to recover quickly from environmental stress and difficulties.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [4] in the passage.', 'evaporation', 'harvesting', 'depletion', 'dilution',
  'B', '''Water harvesting'' is the technical agronomic term for collecting and storing rainwater for irrigation.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [5] in the passage.', 'harmony', 'conflicts', 'accords', 'alliances',
  'B', '''Conflicts'' accurately describes disputes or confrontations between herders and farmers over scarce grazing resources.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [6] in the passage.', 'pests', 'predators', 'livestock', 'minerals',
  'A', 'Crops are bred to resist agricultural ''pests'' and diseases in agronomic contexts.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [7] in the passage.', 'aquifer', 'canal', 'gutter', 'estuary',
  'A', 'An ''aquifer'' is an underground layer of water-bearing permeable rock or gravel, fitting ''subterranean aquifer reserves''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [8] in the passage.', 'symbolic', 'genuine', 'tangible', 'colossal',
  'A', '''Symbolic gestures'' denotes actions done merely as a token without real practical impact.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [9] in the passage.', 'telephony', 'imagery', 'frequency', 'broadcast',
  'B', '''Satellite imagery'' is the standard technical term for photographic maps captured by orbital satellites.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Environmental Conservation and the African Sahel',
  'CLOZE_001', 'Environmental Conservation and the African Sahel', 'Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].',
  'Select the option that best completes blank [10] in the passage.', 'collapse', 'prosperity', 'renewal', 'stagnation',
  'A', '''Ecological collapse'' is the recognized term describing catastrophic systemic breakdown of an ecosystem.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_001' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_002: Public Health and Epidemiological Surveillance
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [1] in the passage.', 'hesitation', 'promptitude', 'reluctance', 'indifference',
  'B', '''Promptitude'' denotes promptness and speed in action, essential during a disease outbreak.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [2] in the passage.', 'tracing', 'stalking', 'shadowing', 'surveying',
  'A', '''Contact tracing'' is the standard epidemiological term for finding and monitoring people exposed to an infected person.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [3] in the passage.', 'assays', 'guesses', 'hypotheses', 'prescriptions',
  'A', '''Diagnostic assays'' are investigative laboratory procedures for qualitatively assessing or quantitatively measuring a target substance.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [4] in the passage.', 'epidemic', 'quarantine', 'remission', 'convalescence',
  'A', 'An ''epidemic'' is a widespread occurrence of an infectious disease in a community at a particular time.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [5] in the passage.', 'gear', 'drapery', 'costume', 'attire',
  'A', '''Protective gear'' (specifically Personal Protective Equipment / PPE) is the established healthcare term.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [6] in the passage.', 'lockdowns', 'celebrations', 'assemblies', 'amnesty',
  'A', '''Lockdowns'' refers to emergency protocols restricting movement to contain disease spread.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [7] in the passage.', 'misinformation', 'truth', 'dogma', 'science',
  'A', '''Misinformation'' correctly denotes false or inaccurate information spread regardless of intent.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [8] in the passage.', 'trials', 'tribulations', 'hearings', 'inquests',
  'A', '''Clinical trials'' is the established biomedical term for rigorous research studies evaluating medical treatments.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [9] in the passage.', 'immunity', 'instinct', 'mentality', 'behavior',
  'A', '''Herd immunity'' is the standard immunological term for collective resistance to the spread of an infectious disease.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Public Health and Epidemiological Surveillance',
  'CLOZE_002', 'Public Health and Epidemiological Surveillance', 'When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.',
  'Select the option that best completes blank [10] in the passage.', 'preparedness', 'complacency', 'fatigue', 'neglect',
  'A', '''Emergency preparedness'' is the standard institutional term for readiness to respond to disasters.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_002' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_003: Artificial Intelligence and the Modern Digital Economy
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [1] in the passage.', 'business', 'merchandise', 'commodity', 'retail',
  'A', '''Business models'' is the standard economic phrase describing how an enterprise creates and delivers value.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [2] in the passage.', 'fidelity', 'ambiguity', 'falsity', 'crudeness',
  'A', '''Fidelity'' in computing and media refers to exactness, accuracy, and degree of realism.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [3] in the passage.', 'overhead', 'turnover', 'revenue', 'dividend',
  'A', '''Operational overhead'' is the standard business accounting term for running expenses of an enterprise.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [4] in the passage.', 'prejudices', 'virtues', 'veracities', 'objectivities',
  'A', '''Perpetuate institutional prejudices'' aligns with algorithmic bias derived from skewed datasets.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [5] in the passage.', 'policing', 'legislation', 'election', 'litigation',
  'A', '''Predictive policing'' is the technical term for using machine learning algorithms to forecast potential criminal activity.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [6] in the passage.', 'phishing', 'debugging', 'encrypting', 'compiling',
  'A', '''Phishing attacks'' refers to fraudulent attempts to obtain sensitive information by disguising as a trustworthy entity.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [7] in the passage.', 'reskilling', 'retrenchment', 'demotion', 'attrition',
  'A', '''Workforce reskilling'' is the standard term for training workers in new skills to adapt to changing job markets.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [8] in the passage.', 'landscape', 'scenery', 'panorama', 'spectacle',
  'A', '''Employment landscape'' is the customary idiomatic expression for the overall state and makeup of the labor market.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [9] in the passage.', 'consent', 'coercion', 'dissent', 'denial',
  'A', 'Intellectual property use requires ''explicit consent'' from creators before ingesting their content.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Artificial Intelligence and the Modern Digital Economy',
  'CLOZE_003', 'Artificial Intelligence and the Modern Digital Economy', 'The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow''s employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].',
  'Select the option that best completes blank [10] in the passage.', 'integrity', 'duplicity', 'apathy', 'infraction',
  'A', '''Ethical integrity'' is the standard phrase denoting adherence to moral and ethical principles.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_003' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_004: Agricultural Mechanisation and Food Security
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [1] in the passage.', 'agriculture', 'horticulture', 'floriculture', 'aquaculture',
  'A', '''Mechanised agriculture'' is the broad, accurate term encompassing full-scale farming operations.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [2] in the passage.', 'labor', 'leisure', 'deliberation', 'contemplation',
  'A', '''Manual labor'' is the standard collocation describing physical work performed with hands.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [3] in the passage.', 'facilities', 'luxuries', 'ornaments', 'impediments',
  'A', '''Storage facilities'' is the established technical phrase for warehouses, silos, and cold storage.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [4] in the passage.', 'prices', 'famines', 'rations', 'tastes',
  'A', 'Preserving harvests between seasons prevents wild price volatility, thus stabilizing food ''prices''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [5] in the passage.', 'precarious', 'invulnerable', 'lucrative', 'impervious',
  'A', '''Precarious'' means dangerously unstable, uncertain, or risky, describing rain-fed agriculture under changing climate.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [6] in the passage.', 'fertilisation', 'inundation', 'fumigation', 'stagnation',
  'A', '''Soil testing and balanced fertilisation'' is the standard agricultural science pairing.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [7] in the passage.', 'migration', 'congestions', 'planning', 'architecture',
  'A', '''Urban migration'' (or rural-urban migration) describes rural populations moving to cities.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [8] in the passage.', 'schemes', 'hoaxes', 'illusions', 'gambles',
  'A', '''Credit-guarantee schemes'' is the official financial term for government/institutional loan de-risking mechanisms.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [9] in the passage.', 'yield', 'loss', 'residue', 'spoilage',
  'A', '''Crop yield'' is the standard agronomic term for the volume of crop harvested per unit of land.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Agricultural Mechanisation and Food Security',
  'CLOZE_004', 'Agricultural Mechanisation and Food Security', 'Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion''s share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].',
  'Select the option that best completes blank [10] in the passage.', 'attained', 'abandoned', 'forfeited', 'diminished',
  'A', '''Attained'' means achieved through effort, fitting ''food sovereignty be successfully attained''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_004' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_005: Constitutional Law and the Separation of Powers
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [1] in the passage.', 'balances', 'weights', 'counterparts', 'remedies',
  'A', '''Checks and balances'' is the universally recognized constitutional law maxim.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [2] in the passage.', 'expenditure', 'debts', 'donations', 'tariffs',
  'A', '''Approve public expenditure'' is the standard legal and fiscal term for parliamentary appropriation.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [3] in the passage.', 'service', 'court', 'war', 'unrest',
  'A', '''Civil service'' refers to the permanent professional administrative branch of a government.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [4] in the passage.', 'supremacy', 'defiance', 'servitude', 'obsolescence',
  'A', '''Constitutional supremacy'' is the legal doctrine establishing the constitution as the highest law of the land.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [5] in the passage.', 'emoluments', 'penalties', 'bribes', 'levies',
  'A', '''Emoluments'' denotes the salaries, fees, or profit from employment or office, protected for judicial independence.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [6] in the passage.', 'review', 'pardon', 'immunity', 'amnesty',
  'A', '''Judicial review'' is the legal process where courts examine the lawfulness of actions taken by public bodies.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [7] in the passage.', 'effect', 'interest', 'record', 'value',
  'A', '''Null, void, and of no effect'' is the classic canonical common law legal phrase.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [8] in the passage.', 'representatives', 'monarchs', 'magistrates', 'oligarchs',
  'A', '''Elected representatives'' refers to legislators chosen democratically by the populace.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [9] in the passage.', 'liberty', 'capture', 'subjugation', 'detention',
  'A', '''Personal liberty'' is the foundational constitutional right protecting individuals from unlawful arrest.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Constitutional Law and the Separation of Powers',
  'CLOZE_005', 'Constitutional Law and the Separation of Powers', 'The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].',
  'Select the option that best completes blank [10] in the passage.', 'rule', 'anarchy', 'liberation', 'justice',
  'A', '''Authoritarian rule'' refers to governance characterized by strict obedience to authority at the expense of personal freedom.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_005' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_006: Urban Planning and Mass Rapid Transit Systems
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [1] in the passage.', 'ordeal', 'delight', 'picnic', 'trifle',
  'A', '''Ordeal'' refers to a painful or horrific experience, perfectly capturing stressful traffic commuting.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [2] in the passage.', 'congestion', 'desertion', 'dispersion', 'evacuation',
  'A', '''Traffic congestion'' is the technical and standard term for gridlock on roads.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [3] in the passage.', 'transit', 'exile', 'stagnation', 'halt',
  'A', '''Mass rapid transit'' (MRT) is the standard urban planning term for passenger rail and high-capacity buses.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [4] in the passage.', 'quality', 'pressure', 'temperature', 'velocity',
  'A', '''Ambient air quality'' is the environmental science measurement of outdoor air purity.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [5] in the passage.', 'studies', 'fantasies', 'rumors', 'illusions',
  'A', '''Feasibility studies'' is the formal engineering and business term for project viability assessments.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [6] in the passage.', 'landowners', 'trespassers', 'bystanders', 'commuters',
  'A', '''Landowners'' are the title holders whose property must be acquired for transport corridors.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [7] in the passage.', 'hubs', 'deserts', 'barriers', 'cul-de-sacs',
  'A', '''Transport hubs'' refers to central interchange stations where multiple routes or transport modes connect.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [8] in the passage.', 'fatalities', 'gridlock', 'lanes', 'surfaces',
  'B', '''Decreasing highway gridlock'' collocate smoothly in transport economics.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [9] in the passage.', 'collapse', 'surplus', 'bonanza', 'windfall',
  'A', '''Fiscal collapse'' denotes financial failure or unsustainability from excessive subsidization.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Urban Planning and Mass Rapid Transit Systems',
  'CLOZE_006', 'Urban Planning and Mass Rapid Transit Systems', 'Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].',
  'Select the option that best completes blank [10] in the passage.', 'connectivity', 'isolation', 'estrangement', 'separation',
  'A', '''Seamless connectivity'' is the standard transport and urban design ideal.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_006' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_007: Aviation Safety and Air Traffic Control
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [1] in the passage.', 'protocols', 'traditions', 'fashions', 'superstitions',
  'A', '''Safety protocols'' is the formal term for official procedures governing safety.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [2] in the passage.', 'clearance', 'eviction', 'dismissal', 'exemption',
  'A', '''Takeoff clearance'' is the mandatory authorization granted by air traffic control to depart.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [3] in the passage.', 'waypoints', 'curbstones', 'milestones', 'headstones',
  'A', '''Navigation waypoints'' are specific geographic coordinates used in aerial navigation flight plans.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [4] in the passage.', 'separation', 'collision', 'junction', 'merging',
  'A', '''Spatial separation'' is the aviation term for mandatory minimum distance maintained between aircraft.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [5] in the passage.', 'patterns', 'cells', 'cages', 'tanks',
  'A', '''Holding patterns'' is the formal aviation term for predetermined maneuvers that keep an aircraft within a specified airspace.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [6] in the passage.', 'terrain', 'clouds', 'hangars', 'runways',
  'A', '''Controlled Flight Into Terrain'' (CFIT) is an official aviation accident classification.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [7] in the passage.', 'checklists', 'novels', 'diaries', 'leaflets',
  'A', '''Emergency checklists'' are structured procedures followed by pilots during in-flight emergencies.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [8] in the passage.', 'catastrophes', 'victories', 'triumphs', 'festivities',
  'A', '''Fatal catastrophes'' denotes disastrous accidents involving loss of life.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [9] in the passage.', 'investigations', 'speculations', 'fabrications', 'allegations',
  'A', '''Accident investigations'' is the official statutory inquiry conducted by transport safety bureaus.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Aviation Safety and Air Traffic Control',
  'CLOZE_007', 'Aviation Safety and Air Traffic Control', 'Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].',
  'Select the option that best completes blank [10] in the passage.', 'life', 'chattel', 'merchandise', 'cargo',
  'A', '''Every human life'' fits the moral and professional aviation imperative.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_007' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_008: Monetary Policy and Central Banking
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [1] in the passage.', 'currency', 'commodity', 'consortium', 'conglomerate',
  'A', '''National currency'' is the official legal tender money issued by a nation''s central bank.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [2] in the passage.', 'growth', 'stagnation', 'decay', 'decline',
  'A', '''Sustainable economic growth'' is the universally accepted economic policy objective.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [3] in the passage.', 'rate', 'fine', 'toll', 'ransom',
  'A', '''Benchmark interest rate'' (e.g. Monetary Policy Rate / MPR) is the core instrument of monetary policy.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [4] in the passage.', 'demand', 'supply', 'deficit', 'surplus',
  'A', '''Aggregate demand'' is the total spending on domestic goods and services in an economy.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [5] in the passage.', 'liquidity', 'insolvency', 'bankruptcy', 'liabilities',
  'A', '''Injecting liquidity'' is the financial term for increasing available cash flow in the banking sector.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [6] in the passage.', 'reserves', 'deficits', 'sanctions', 'debts',
  'A', '''External reserves'' (foreign exchange reserves) are foreign assets held by a central bank.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [7] in the passage.', 'crises', 'bonanzas', 'windfalls', 'rebates',
  'A', '''Balance of payments crises'' occurs when a nation cannot pay for essential imports or service debt.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [8] in the passage.', 'targets', 'fables', 'illusions', 'superstitions',
  'A', '''Inflation targets'' are numerical objectives set by central banks for the rate of inflation.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [9] in the passage.', 'credibility', 'duplicity', 'subservience', 'hypocrisy',
  'A', '''Policy credibility'' is the degree to which markets and the public trust the central bank''s commitments.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Monetary Policy and Central Banking',
  'CLOZE_008', 'Monetary Policy and Central Banking', 'Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank''s policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].',
  'Select the option that best completes blank [10] in the passage.', 'authorities', 'agitators', 'protesters', 'insurgents',
  'A', '''Monetary authorities'' refers collectively to the central bank and associated regulatory bodies.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_008' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_009: Renewable Energy and Clean Power Grid Transition
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [1] in the passage.', 'challenge', 'triviality', 'relaxation', 'recreation',
  'A', '''Environmental challenge'' is the standard phrase describing major environmental undertakings.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [2] in the passage.', 'emissions', 'injections', 'absorptions', 'filtrations',
  'A', '''Carbon dioxide emissions'' is the technical term for greenhouse gases released into the atmosphere.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [3] in the passage.', 'extremes', 'stabilities', 'moderations', 'constants',
  'A', '''Climatic extremes'' refers to severe weather phenomena resulting from climate disruption.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [4] in the passage.', 'scale', 'miniature', 'footnote', 'whisper',
  'A', '''Commercial scale'' is the business and technical term denoting large-scale industrial deployment.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [5] in the passage.', 'capacity', 'deficit', 'shortage', 'vacuum',
  'A', '''Baseline capacity'' (or baseload capacity) is the minimum electric power a utility must deliver continuously.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [6] in the passage.', 'hours', 'seconds', 'centuries', 'epochs',
  'A', '''Peak hours'' is the established power grid term for periods of highest electricity demand.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [7] in the passage.', 'balancing', 'overload', 'blackout', 'rupture',
  'A', '''Load balancing'' is the electrical engineering technique of distributing electrical loads across a grid.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [8] in the passage.', 'lines', 'cables', 'twines', 'ropes',
  'A', '''High-voltage transmission lines'' is the formal term for electrical power transit infrastructure.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [9] in the passage.', 'banks', 'casinos', 'pawnshops', 'vaults',
  'A', '''Multilateral development banks'' (like World Bank, AfDB) are international financial institutions supporting development.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Renewable Energy and Clean Power Grid Transition',
  'CLOZE_009', 'Renewable Energy and Clean Power Grid Transition', 'The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity''s defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].',
  'Select the option that best completes blank [10] in the passage.', 'technologies', 'superstitions', 'illusions', 'antiques',
  'A', '''Green technologies'' is the universally accepted terminology for environmentally sustainable technologies.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_009' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_010: Maritime Commerce and Deep Sea Ports
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [1] in the passage.', 'lanes', 'alleys', 'corridors', 'avenues',
  'A', '''Shipping lanes'' is the established geographical and nautical term for regularly used ocean transit routes.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [2] in the passage.', 'cranes', 'anchors', 'oars', 'rudders',
  'A', '''Quay cranes'' (or ship-to-shore gantry cranes) are the essential equipment used to load/unload container vessels.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [3] in the passage.', 'times', 'speed', 'records', 'distances',
  'A', '''Turnaround times'' is the logistics metric measuring the time between a vessel arriving in port and departing.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [4] in the passage.', 'materials', 'luxuries', 'trinkets', 'curios',
  'A', '''Raw materials'' is the standard economic phrase for basic unprocessed goods used in manufacturing.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [5] in the passage.', 'platforms', 'barriers', 'impediments', 'hurdles',
  'A', '''Single-window clearance platforms'' is the official international trade term for unified digital customs portals.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [6] in the passage.', 'border', 'sanctuary', 'boundary', 'frontier',
  'A', '''Maritime border'' refers to national frontiers at sea and port terminals where customs control operates.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [7] in the passage.', 'arteries', 'tunnels', 'gutters', 'ditches',
  'A', '''Urban arteries'' is the standard transport metaphor for primary transit corridors in a metropolitan area.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [8] in the passage.', 'fuel', 'water', 'timber', 'coal',
  'A', '''Bunker fuel'' is the technical maritime term for fuel oil loaded onto ships for propulsion.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [9] in the passage.', 'pollution', 'purification', 'filtration', 'ventilation',
  'A', '''Maritime air pollution'' describes pollutants emitted by ships into coastal environments.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Maritime Commerce and Deep Sea Ports',
  'CLOZE_010', 'Maritime Commerce and Deep Sea Ports', 'Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today''s interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].',
  'Select the option that best completes blank [10] in the passage.', 'resilience', 'fragility', 'decline', 'regression',
  'A', '''Economic resilience'' denotes an economy''s capacity to withstand trade disruptions and shocks.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_010' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_011: Telecommunications and Fiber Optic Infrastructure
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [1] in the passage.', 'commerce', 'barter', 'piracy', 'contraband',
  'A', '''Electronic commerce'' (e-commerce) is the buying and selling of goods/services using the internet.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [2] in the passage.', 'trenches', 'mountains', 'valleys', 'deserts',
  'A', '''Oceanic trenches'' refers to deep depressions on the sea floor traversed by submarine cables.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [3] in the passage.', 'traffic', 'cargo', 'smuggling', 'ballast',
  'A', '''Internet traffic'' is the recognized computing term for data sent and received across network connections.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [4] in the passage.', 'disruptions', 'celebrations', 'expansions', 'enhancements',
  'A', '''Service disruptions'' is the standard term for interruptions or outages in telecommunications networks.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [5] in the passage.', 'frequencies', 'harmonies', 'chords', 'melodies',
  'A', '''Radio frequencies'' refers to the electromagnetic spectrum bands allocated for wireless communications.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [6] in the passage.', 'latency', 'gravity', 'density', 'toxicity',
  'A', '''Network latency'' is the measure of delay in data communication across a network.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [7] in the passage.', 'power', 'water', 'weather', 'climate',
  'A', '''Electrical power'' is required to run telecom base stations and transceivers.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [8] in the passage.', 'divide', 'canyon', 'bridge', 'junction',
  'A', '''Digital divide'' is the standard sociological and economic term for the gap in internet access.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [9] in the passage.', 'tariffs', 'donations', 'ransoms', 'bribes',
  'A', '''Consumer tariffs'' is the telecommunications regulatory term for user rates and prices.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Telecommunications and Fiber Optic Infrastructure',
  'CLOZE_011', 'Telecommunications and Fiber Optic Infrastructure', 'The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].',
  'Select the option that best completes blank [10] in the passage.', 'opportunity', 'adversity', 'deprivation', 'insolvency',
  'A', '''Economic opportunity'' is the standard phrase for fair chance at economic success.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_011' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_012: Mineral Exploration and Solid Minerals Mining
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [1] in the passage.', 'deposits', 'debris', 'refuse', 'rubble',
  'A', '''Mineral deposits'' is the standard geological term for natural accumulations of minerals in the earth''s crust.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [2] in the passage.', 'exploration', 'demolition', 'evacuation', 'fumigation',
  'A', '''Mineral exploration'' is the sequential process of finding commercially viable mineral deposits.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [3] in the passage.', 'reserves', 'deficits', 'bankruptcies', 'shortages',
  'A', '''Mineral reserves'' is the technical term for resources that are commercially and legally extractable.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [4] in the passage.', 'clearance', 'condemnation', 'penalty', 'confiscation',
  'A', '''Environmental impact clearance'' (or approval) is the statutory permit issued to allow project execution.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [5] in the passage.', 'methodologies', 'fantasies', 'superstitions', 'folktales',
  'A', '''Extraction methodologies'' refers to standard engineering techniques used to harvest minerals.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [6] in the passage.', 'enforced', 'flouted', 'disregarded', 'subverted',
  'A', 'Environmental regulations prevent damage only when properly ''enforced''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [7] in the passage.', 'mercury', 'oxygen', 'nitrogen', 'hydrogen',
  'A', '''Mercury'' is a notoriously toxic heavy metal widely used in artisanal gold extraction.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [8] in the passage.', 'communities', 'intruders', 'trespassers', 'rivals',
  'A', '''Host communities'' is the legal and social terminology for local populations resident in mining catchment areas.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [9] in the passage.', 'collection', 'evasion', 'pilfering', 'forfeiture',
  'A', '''Royalty collection'' refers to collecting statutory taxes paid by miners to the government.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Mineral Exploration and Solid Minerals Mining',
  'CLOZE_012', 'Mineral Exploration and Solid Minerals Mining', 'The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].',
  'Select the option that best completes blank [10] in the passage.', 'prosperity', 'poverty', 'bankruptcy', 'penury',
  'A', '''Industrial prosperity'' denotes economic success and thriving productive capability.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_012' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_013: Forensic Science and Criminal Justice
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [1] in the passage.', 'doubt', 'hope', 'belief', 'expectation',
  'A', '''Beyond reasonable doubt'' is the universal standard of evidence required to validate a criminal conviction.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [2] in the passage.', 'proof', 'gossip', 'hearsay', 'conjecture',
  'A', '''Objective, verifiable proof'' is the standard evidentiary standard in law.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [3] in the passage.', 'contamination', 'purification', 'sanitization', 'distillation',
  'A', '''Cross-contamination'' is the forensic science term for inadvertent transfer of trace evidence between specimens.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [4] in the passage.', 'profiling', 'doodling', 'sketching', 'caricature',
  'A', '''DNA profiling'' (or genetic fingerprinting) is the forensic scientific technique identifying individuals by DNA characteristics.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [5] in the passage.', 'fingerprint', 'trademark', 'watermark', 'postcard',
  'A', '''Genetic fingerprint'' is the standard biological metaphor for unique individual DNA identification.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [6] in the passage.', 'weapon', 'target', 'bullet', 'holster',
  'A', 'Ballistic striations link a fired bullet directly to a suspect firearm or ''weapon''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [7] in the passage.', 'content', 'volume', 'shortage', 'depletion',
  'A', '''Blood-alcohol content'' (BAC) is the standard metric used in forensic toxicology.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [8] in the passage.', 'devices', 'furnaces', 'apparel', 'appliances',
  'A', '''Mobile devices'' (smartphones, tablets) are the primary sources of digital forensic data.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [9] in the passage.', 'custody', 'events', 'islands', 'mountains',
  'A', '''Chain of custody'' is the vital legal evidentiary rule requiring paper trail tracking physical evidence handling.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Forensic Science and Criminal Justice',
  'CLOZE_013', 'Forensic Science and Criminal Justice', 'The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].',
  'Select the option that best completes blank [10] in the passage.', 'justice', 'mercy', 'praise', 'recompense',
  'A', '''Escape justice'' is the established idiom for evading legal punishment for a crime.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_013' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_014: Educational Technology and Digital Pedagogy
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [1] in the passage.', 'institutions', 'sanctuaries', 'convents', 'barracks',
  'A', '''Educational institutions'' is the formal term for schools, colleges, and universities.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [2] in the passage.', 'tools', 'weapons', 'fetishes', 'talismans',
  'A', '''Digital tools'' refers to digital software, platforms, and interactive applications used in learning.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [3] in the passage.', 'ability', 'indifference', 'sloth', 'reluctance',
  'A', '''Cognitive ability'' is the standard psychometric term for mental capability and reasoning skill.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [4] in the passage.', 'feedback', 'backlash', 'stagnation', 'paralysis',
  'A', '''Performance feedback'' is the pedagogical term for information provided to learners regarding their score and performance.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [5] in the passage.', 'labs', 'riots', 'strikes', 'pranks',
  'A', '''Simulation labs'' (virtual science labs) allow students to conduct science experiments digitally.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [6] in the passage.', 'teachers', 'agitators', 'spectators', 'trespassers',
  'A', '''Qualified teachers'' are essential professionals providing student mentorship.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [7] in the passage.', 'solving', 'making', 'hunting', 'dodging',
  'A', '''Collaborative problem solving'' is a foundational modern pedagogical methodology.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [8] in the passage.', 'students', 'tycoons', 'magnates', 'investors',
  'A', 'Low-income students are the demographic most affected by equipment and connectivity costs.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [9] in the passage.', 'exercises', 'escapades', 'conspiracies', 'escapes',
  'A', '''Revision exercises'' is the standard educational term for academic practice questions.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Educational Technology and Digital Pedagogy',
  'CLOZE_014', 'Educational Technology and Digital Pedagogy', 'The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student''s cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].',
  'Select the option that best completes blank [10] in the passage.', 'excellence', 'mediocrity', 'failure', 'neglect',
  'A', '''Academic excellence'' is the standard expression for high achievement in education.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_014' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_015: Sports Science and Athletic Kinesiology
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [1] in the passage.', 'science', 'myth', 'fiction', 'folklore',
  'A', '''Sports science'' is the academic and practical discipline studying human physiology in sport.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [2] in the passage.', 'output', 'fatigue', 'lethargy', 'slumber',
  'A', '''Athletic output'' (or athletic performance) refers to the physical work produced by an athlete.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [3] in the passage.', 'precision', 'clumsiness', 'indifference', 'ambiguity',
  'A', '''Millimeter precision'' emphasizes meticulous exactness in technique refinement.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [4] in the passage.', 'max', 'min', 'zero', 'mid',
  'A', '''VO2 max'' is the standard physiological notation for maximal oxygen consumption during exercise.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [5] in the passage.', 'syndrome', 'triumph', 'jubilation', 'euphoria',
  'A', '''Overtraining syndrome'' is the medical condition caused by excessive athletic training without adequate rest.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [6] in the passage.', 'repair', 'ruin', 'decay', 'atrophy',
  'A', 'Nutritional amino acids and carbohydrates facilitate muscle protein synthesis and ''cellular repair''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [7] in the passage.', 'cramps', 'wings', 'feathers', 'armors',
  'A', '''Muscle cramps'' are painful involuntary muscle contractions often provoked by dehydration.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [8] in the passage.', 'protocols', 'conspiracies', 'escapades', 'pranks',
  'A', '''Rehabilitation protocols'' is the formal clinical term for structured injury recovery plans.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [9] in the passage.', 'pressure', 'vacation', 'recess', 'leisure',
  'A', '''Competitive pressure'' refers to the psychological strain experienced in elite sports contests.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Sports Science and Athletic Kinesiology',
  'CLOZE_015', 'Sports Science and Athletic Kinesiology', 'Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete''s technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].',
  'Select the option that best completes blank [10] in the passage.', 'achievement', 'failure', 'mediocrity', 'disqualification',
  'A', '''Athletic achievement'' denotes notable milestones and records achieved in sports.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_015' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_016: Space Exploration and Satellite Meteorology
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [1] in the passage.', 'technology', 'superstition', 'witchcraft', 'mythology',
  'A', '''Satellite technology'' refers to operational systems using artificial satellites.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [2] in the passage.', 'humidity', 'solidarity', 'animosity', 'hostility',
  'A', '''Atmospheric humidity'' is the moisture concentration in the air measured by weather satellites.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [3] in the passage.', 'droughts', 'parties', 'festivals', 'banquets',
  'A', '''Droughts'' are prolonged periods of deficient rainfall, a severe meteorological event.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [4] in the passage.', 'evacuations', 'celebrations', 'coronations', 'parades',
  'A', '''Mass evacuations'' is the emergency management term for moving populations out of danger zones.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [5] in the passage.', 'television', 'telegraph', 'scrolls', 'papyrus',
  'A', '''Digital television'' is widely transmitted via geostationary broadcast satellites.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [6] in the passage.', 'stress', 'delight', 'euphoria', 'contentment',
  'A', '''Drought stress'' is the botanical term describing physiological strain on crops from moisture deficiency.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [7] in the passage.', 'navigation', 'obliteration', 'confusion', 'stagnation',
  'A', '''GPS navigation'' is the ubiquitous system for positional routing.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [8] in the passage.', 'debris', 'monuments', 'treasures', 'gems',
  'A', '''Space debris'' (or space junk) is the formal aeronautical term for defunct human-made objects in orbit.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [9] in the passage.', 'impassable', 'luxurious', 'peaceful', 'inviting',
  'A', '''Impassable'' describes orbital zones rendered too dangerous to traverse due to debris.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Space Exploration and Satellite Meteorology',
  'CLOZE_016', 'Space Exploration and Satellite Meteorology', 'The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].',
  'Select the option that best completes blank [10] in the passage.', 'management', 'sabotage', 'neglect', 'dereliction',
  'A', '''Orbital traffic management'' is the formal international term for spaceflight safety coordination.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_016' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_017: Veterinary Medicine and Animal Husbandry
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [1] in the passage.', 'Africa', 'Antarctica', 'Arctic', 'Atlantic',
  'A', '''Sub-Saharan Africa'' is the standard geographical region referenced.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [2] in the passage.', 'diseases', 'virtues', 'honors', 'awards',
  'A', '''Zoonotic diseases'' are infectious diseases transmitted from animals to humans.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [3] in the passage.', 'neglected', 'upheld', 'venerated', 'celebrated',
  'A', 'Contagions spread rapidly when vaccination protocols are ''neglected''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [4] in the passage.', 'techniques', 'rituals', 'superstitions', 'fantasies',
  'A', '''Acaricide dipping techniques'' is the veterinary phrase for chemical tick/parasite control.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [5] in the passage.', 'pathogens', 'nutrients', 'vitamins', 'minerals',
  'A', '''Pathogens'' are biological agents (viruses, bacteria) causing disease.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [6] in the passage.', 'resistance', 'susceptibility', 'surrender', 'submission',
  'A', '''Microbial drug resistance'' (antimicrobial resistance / AMR) is a major global public health menace.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [7] in the passage.', 'chain', 'fence', 'ditch', 'wall',
  'A', '''Food chain'' is the standard ecological and public health term for food transfer pathways.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [8] in the passage.', 'yields', 'spills', 'leaks', 'evaporations',
  'A', '''Milk yields'' is the standard dairy science measure of milk production per cow.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [9] in the passage.', 'baling', 'burning', 'drowning', 'trampling',
  'A', '''Hay baling'' is the mechanical packaging of dried grass into compressed bales for feed.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Veterinary Medicine and Animal Husbandry',
  'CLOZE_017', 'Veterinary Medicine and Animal Husbandry', 'Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].',
  'Select the option that best completes blank [10] in the passage.', 'livelihoods', 'catastrophes', 'bankruptcies', 'misfortunes',
  'A', '''Pastoral livelihoods'' denotes the means of earning sustenance for livestock herders.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_017' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_018: Civil Engineering and Water Dams Management
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [1] in the passage.', 'power', 'famine', 'drought', 'scarcity',
  'A', '''Hydroelectric power'' is the standard engineering and energy term for electricity generated by flowing water.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [2] in the passage.', 'irrigation', 'evaporation', 'submersion', 'depletion',
  'A', '''Agricultural irrigation'' is the artificial application of water to soil for crop growth.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [3] in the passage.', 'turbines', 'anchors', 'hammers', 'levers',
  'A', '''Hydraulic turbines'' are rotary engines that extract energy from fluid flow.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [4] in the passage.', 'pressure', 'vacuum', 'suction', 'deficiency',
  'A', '''Hydrostatic pressure'' is the fluid mechanical force exerted by water at rest.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [5] in the passage.', 'fill', 'rubbish', 'ashes', 'charcoal',
  'A', '''Rock fill'' (or earth-and-rock fill) is the civil engineering material used in embankment dams.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [6] in the passage.', 'settlement', 'celebration', 'prosperity', 'triumph',
  'A', '''Foundation settlement'' is the sinking or shifting of a structure into the ground.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [7] in the passage.', 'catastrophic', 'delightful', 'trivial', 'negligible',
  'A', '''Catastrophic'' captures the immense destruction of dam failures.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [8] in the passage.', 'crest', 'furrow', 'crater', 'pit',
  'A', '''Structural crest'' is the highest top surface of a dam wall.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [9] in the passage.', 'capacity', 'deficit', 'shortage', 'debt',
  'A', '''Storage capacity'' is the total volume of water a reservoir can contain.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Civil Engineering and Water Dams Management',
  'CLOZE_018', 'Civil Engineering and Water Dams Management', 'Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam''s active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].',
  'Select the option that best completes blank [10] in the passage.', 'lifespan', 'demise', 'expiry', 'obsolescence',
  'A', '''Structural lifespan'' (design life) is the period during which a structure is expected to function.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_018' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_019: Petroleum Refining and Petrochemical Processing
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [1] in the passage.', 'state', 'country', 'province', 'territory',
  'A', '''In its raw state'' is the standard English idiom meaning unrefined or unprocessed.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [2] in the passage.', 'distillation', 'explosion', 'combustion', 'incineration',
  'A', '''Fractional distillation'' column (or atmospheric distillation unit) is the core refinery unit.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [3] in the passage.', 'points', 'dots', 'lines', 'marks',
  'A', '''Boiling points'' is the physical chemistry term for temperatures at which liquids turn to vapor.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [4] in the passage.', 'bottom', 'pinnacle', 'apex', 'summit',
  'A', 'Heaviest unvaporized residues settle at the ''bottom'' of the distillation column.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [5] in the passage.', 'fuel', 'water', 'steam', 'ice',
  'A', '''Aviation fuel'' (aviation turbine kerosene / Jet-A1) is an essential refined petroleum product.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [6] in the passage.', 'standards', 'customs', 'fashions', 'traditions',
  'A', '''Emission standards'' are regulatory requirements setting specific limits to the amount of pollutants released.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [7] in the passage.', 'plastics', 'timber', 'pottery', 'stones',
  'A', '''Synthetic polymers and consumer plastics'' are primary products of petrochemical processing.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [8] in the passage.', 'bodies', 'corpses', 'skeletons', 'carcasses',
  'A', '''Water bodies'' is the formal environmental science term for rivers, lakes, and oceans.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [9] in the passage.', 'discharge', 'retention', 'absorption', 'consumption',
  'A', '''Environmental discharge'' refers to releasing treated liquid or gaseous waste into nature.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Petroleum Refining and Petrochemical Processing',
  'CLOZE_019', 'Petroleum Refining and Petrochemical Processing', 'Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].',
  'Select the option that best completes blank [10] in the passage.', 'growth', 'decay', 'stagnation', 'recession',
  'A', '''Industrial growth'' is the economic expansion of the manufacturing and industrial base.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_019' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_020: Diplomatic Relations and International Law
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [1] in the passage.', 'law', 'superstition', 'myth', 'anarchy',
  'A', '''Customary international law'' is the recognized body of international legal norms.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [2] in the passage.', 'jurisdiction', 'commerce', 'trade', 'transport',
  'A', 'Diplomatic immunity protects diplomats from local court ''jurisdiction''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [3] in the passage.', 'detention', 'hospitality', 'elevation', 'promotion',
  'A', 'Diplomatic protection shields diplomats from arbitrary ''detention'' or arrest.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [4] in the passage.', 'mission', 'court', 'parliament', 'hospital',
  'A', '''Head of mission'' is the official international diplomatic title for the chief diplomat or ambassador.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [5] in the passage.', 'concessions', 'bribes', 'threats', 'extortions',
  'A', 'Negotiations succeed through compromise and ''reciprocal concessions''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [6] in the passage.', 'grata', 'fide', 'facto', 'juris',
  'A', '''Persona non grata'' is the international diplomatic legal phrase meaning an unwelcome person.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [7] in the passage.', 'intervention', 'celebration', 'congratulation', 'relaxation',
  'A', '''Military intervention'' is the authorized collective military enforcement under Chapter VII of the UN Charter.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [8] in the passage.', 'jurisdiction', 'banquet', 'hospitality', 'condemnation',
  'A', 'Tribunals hear cases between states that submit to their legal ''jurisdiction''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [9] in the passage.', 'Charter', 'Diary', 'Pamphlet', 'Bulletin',
  'A', '''United Nations Charter'' is the foundational treaty and constitution of the UN.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Diplomatic Relations and International Law',
  'CLOZE_020', 'Diplomatic Relations and International Law', 'The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].',
  'Select the option that best completes blank [10] in the passage.', 'conflict', 'harmony', 'concord', 'solidarity',
  'A', 'Geopolitical coercion leads to armed ''military conflict''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_020' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_021: Cognitive Psychology and Memory Retention
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [1] in the passage.', 'information', 'debris', 'rubbish', 'contraband',
  'A', '''Acquire, store, and retrieve information'' is the classic definition of cognitive memory.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [2] in the passage.', 'sound', 'telepathy', 'clairvoyance', 'superstition',
  'A', 'Sensory memory registers physical sensory inputs, notably sight and ''sound''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [3] in the passage.', 'capacity', 'deficit', 'abyss', 'vacuum',
  'A', '''Storage capacity'' refers to the limited quantity of items working memory can hold.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [4] in the passage.', 'occurs', 'prevails', 'survives', 'lingers',
  'A', 'Before decay or displacement ''occurs'' fits the temporal clause.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [5] in the passage.', 'rehearsal', 'parody', 'mimicry', 'burlesque',
  'A', '''Elaborative rehearsal'' is the psychological term for connecting new info with already stored knowledge.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [6] in the passage.', 'memory', 'oblivion', 'amnesia', 'void',
  'A', '''Active retrieval from memory'' is the proven testing effect in cognitive psychology.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [7] in the passage.', 'schemas', 'caricatures', 'sketches', 'doodles',
  'A', '''Schemas'' (or schemata) are cognitive frameworks that help organize and interpret information.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [8] in the passage.', 'restructuring', 'demolition', 'vandalism', 'destruction',
  'A', '''Conceptual restructuring'' is the cognitive re-organization of knowledge.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [9] in the passage.', 'data', 'flesh', 'bone', 'cartilage',
  'A', 'The brain consolidates neural connections and prunes extraneous neural ''data''.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Cognitive Psychology and Memory Retention',
  'CLOZE_021', 'Cognitive Psychology and Memory Retention', 'Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].',
  'Select the option that best completes blank [10] in the passage.', 'success', 'stagnation', 'failure', 'paralysis',
  'A', '''Academic success'' denotes positive achievement in educational endeavors.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_021' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_022: Journalism, Media Ethics and Digital Literacy
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [1] in the passage.', 'discourse', 'silence', 'apathy', 'lethargy',
  'A', '''Civic discourse'' refers to dialogue and debate among citizens on public matters.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [2] in the passage.', 'sources', 'fables', 'rumors', 'gossip',
  'A', '''Verified sources'' is the cornerstone of journalistic integrity and fact checking.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [3] in the passage.', 'reply', 'arrest', 'eviction', 'sentence',
  'A', '''Right of reply'' is the fundamental media ethics principle allowing accused persons to state their side.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [4] in the passage.', 'oversight', 'negligence', 'paralysis', 'subversion',
  'A', '''Editorial oversight'' is the professional supervision and verification exercised by newspaper editors.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [5] in the passage.', 'disinformation', 'veracity', 'honesty', 'authenticity',
  'A', '''Deliberate disinformation'' refers to intentionally fabricated falsehoods spread to deceive.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [6] in the passage.', 'institutions', 'prisons', 'dungeons', 'asylums',
  'A', '''Democratic institutions'' refers to the foundational bodies and systems sustaining democracy.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [7] in the passage.', 'maligned', 'exalted', 'venerated', 'extolled',
  'A', '''Maligned'' means spoken ill of or defamed unjustly.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [8] in the passage.', 'participation', 'apathy', 'indifference', 'paralysis',
  'A', '''Strategic Lawsuits Against Public Participation'' (SLAPP suits) are abusive lawsuits intended to censor critics.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [9] in the passage.', 'images', 'dreams', 'hallucinations', 'fantasies',
  'A', '''Verify digital images'' (checking for AI deepfakes and doctored photos) is a core media literacy skill.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'Journalism, Media Ethics and Digital Literacy',
  'CLOZE_022', 'Journalism, Media Ethics and Digital Literacy', 'In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].',
  'Select the option that best completes blank [10] in the passage.', 'falsehoods', 'truths', 'realities', 'facts',
  'A', '''Fabricated falsehoods'' contrasts sharply with truth in public discourse.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_022' and question = 'Select the option that best completes blank [10] in the passage.'
);

-- Passage CLOZE_023: African Historiography and Archaeological Discoveries
insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [1] in the passage.', 'civilizations', 'ruins', 'deserts', 'swamps',
  'A', '''Ancient civilizations'' is the historical term for advanced human societies with complex institutions.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [1] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [2] in the passage.', 'narratives', 'facts', 'truths', 'realities',
  'A', '''Prejudiced narratives'' refers to biased and false historical accounts.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [2] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [3] in the passage.', 'achievements', 'failures', 'stagnations', 'crises',
  'A', '''Metallurgical achievements'' celebrates the skilled iron and bronze smelting technologies of ancient Africa.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [3] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [4] in the passage.', 'scholarship', 'piracy', 'banditry', 'anarchy',
  'A', '''Centers of Islamic scholarship'' is the recognized historical description of Timbuktu and Djenne.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [4] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [5] in the passage.', 'sciences', 'superstitions', 'myths', 'fables',
  'A', '''Optical sciences'' refers to the study of optics and light documented in ancient Timbuktu manuscripts.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [5] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [6] in the passage.', 'dating', 'speculation', 'guessing', 'divination',
  'A', '''Radiocarbon dating'' is the standard scientific archaeological method of determining age of organic matter.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [6] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [7] in the passage.', 'structures', 'conflicts', 'crises', 'fractures',
  'A', '''Social structures'' refers to the organized patterns of relationships and institutions in society.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [7] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [8] in the passage.', 'dynasties', 'deserts', 'jungles', 'swamps',
  'A', '''Nubian dynasties'' (such as the 25th Dynasty of Egypt) represents Kushite pharaohs.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [8] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [9] in the passage.', 'priority', 'diversion', 'triviality', 'recreation',
  'A', '''Continental priority'' stresses the urgent importance of cultural heritage protection.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [9] in the passage.'
);

insert into public.questions (
  subject, section, category, topic, subtopic,
  passage_id, passage_title, passage_text,
  question, option_a, option_b, option_c, option_d,
  correct_answer, explanation, marks, difficulty, is_active, verification_status
)
select
  'English', 'cloze', 'Cloze passage', 'Cloze passage', 'African Historiography and Archaeological Discoveries',
  'CLOZE_023', 'African Historiography and Archaeological Discoveries', 'For generations, colonial historiography distorted Africa''s past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa''s antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers'' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa''s historical dignity and cultural [10].',
  'Select the option that best completes blank [10] in the passage.', 'heritage', 'extinction', 'dereliction', 'oblivion',
  'A', '''Cultural heritage'' encompasses the legacy of physical artifacts and intangible attributes of a group.', 2, 'medium', true, 'verified'
where not exists (
  select 1 from public.questions where passage_id = 'CLOZE_023' and question = 'Select the option that best completes blank [10] in the passage.'
);

commit;
