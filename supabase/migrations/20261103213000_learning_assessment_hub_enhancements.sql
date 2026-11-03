-- Migration: 20261103210000_learning_assessment_hub_enhancements.sql
-- Purpose:
-- 1. Grant execute on learning_can_manage_all to avoid permission errors.
-- 2. Expand learning_assessments schema: custom_questions, shuffle_questions, pass_percentage, status, instructions.
-- 3. Upgrade start_organisation_assessment RPC to support custom_builder and csv_import question sources and optional shuffling.
-- 4. Update validation trigger to support custom questions pool.

-- 1. FUNCTION & TABLE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.learning_can_manage_all() TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.learning_assessments TO authenticated, service_role;
GRANT SELECT ON TABLE public.learning_assessments TO anon, authenticated;

-- 2. EXTEND LEARNING_ASSESSMENTS SCHEMA
ALTER TABLE IF EXISTS public.learning_assessments
  ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS pass_percentage INTEGER DEFAULT 70,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Drop and loosen outdated check constraints
DO $$
BEGIN
  -- Loosen assessment_type constraint
  ALTER TABLE public.learning_assessments DROP CONSTRAINT IF EXISTS learning_assessments_assessment_type_check;
  ALTER TABLE public.learning_assessments ADD CONSTRAINT learning_assessments_assessment_type_check
    CHECK (assessment_type IN ('organisation_quiz', 'competition', 'academic_quiz', 'topic_test', 'subject_assessment', 'general_quiz', 'custom_assessment'));

  -- Loosen question_source constraint
  ALTER TABLE public.learning_assessments DROP CONSTRAINT IF EXISTS learning_assessments_question_source_check;
  ALTER TABLE public.learning_assessments ADD CONSTRAINT learning_assessments_question_source_check
    CHECK (question_source IN ('legacy_questions', 'learning_test_questions', 'bank', 'custom_builder', 'csv_import'));

  -- Loosen status constraint
  ALTER TABLE public.learning_assessments DROP CONSTRAINT IF EXISTS learning_assessments_status_check;
  ALTER TABLE public.learning_assessments ADD CONSTRAINT learning_assessments_status_check
    CHECK (status IN ('draft', 'open', 'closed'));
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal if table not yet created
END $$;

-- 3. UPDATE VALIDATION TRIGGER TO ACCOMMODATE CUSTOM QUESTIONS
CREATE OR REPLACE FUNCTION public.validate_published_learning_assessment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_available INTEGER;
  v_custom_count INTEGER;
BEGIN
  IF new.is_published THEN
    -- If using platform question bank
    IF new.question_source IN ('legacy_questions', 'bank') THEN
      IF coalesce(cardinality(new.subjects), 0) = 0 THEN
        RAISE EXCEPTION 'Select at least one subject before publishing assessment' USING errcode = '22023';
      END IF;

      SELECT count(*)::integer INTO v_available
      FROM public.questions q
      WHERE q.is_active = true
        AND q.subject = ANY(new.subjects)
        AND (coalesce(cardinality(new.categories), 0) = 0 OR q.category = ANY(new.categories));

      IF v_available < new.question_count THEN
        RAISE EXCEPTION 'Cannot publish: only % matching active questions found in bank for % requested questions', v_available, new.question_count USING errcode = '22023';
      END IF;
    -- If using custom builder or CSV import
    ELSIF new.question_source IN ('custom_builder', 'csv_import') THEN
      v_custom_count := jsonb_array_length(coalesce(new.custom_questions, '[]'::jsonb));
      IF v_custom_count = 0 THEN
        RAISE EXCEPTION 'Add at least one question via Question Builder or CSV Import before publishing' USING errcode = '22023';
      END IF;
      -- Auto-adjust question_count if custom questions added is less than limit
      IF v_custom_count < new.question_count THEN
        new.question_count := v_custom_count;
      END IF;
    END IF;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS validate_published_learning_assessment ON public.learning_assessments;
CREATE TRIGGER validate_published_learning_assessment
  BEFORE INSERT OR UPDATE OF is_published, subjects, categories, question_count, question_source, custom_questions
  ON public.learning_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_published_learning_assessment();

-- 4. ROBUST START_ORGANISATION_ASSESSMENT RPC
CREATE OR REPLACE FUNCTION public.start_organisation_assessment(
  p_assessment_id UUID,
  p_access_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  a public.learning_assessments%ROWTYPE;
  c public.learning_access_codes%ROWTYPE;
  v_ids BIGINT[];
  v_selected_ids BIGINT[];
  v_snapshot JSONB;
  v_attempt public.learning_practice_attempts%ROWTYPE;
  v_number INTEGER;
  v_redeem JSONB;
  v_custom_q JSONB;
  v_custom_count INTEGER;
  v_shuffled_custom JSONB := '[]'::jsonb;
  v_paper JSONB := '[]'::jsonb;
  v_elem JSONB;
  v_idx INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN public._err('authentication_required', 'Sign in to start this assessment.');
  END IF;

  SELECT * INTO a
  FROM public.learning_assessments
  WHERE id = p_assessment_id AND is_published;

  IF NOT FOUND THEN
    RETURN public._err('assessment_unavailable', 'This assessment is not currently available or published.');
  END IF;

  IF a.starts_at IS NOT NULL AND now() < a.starts_at THEN
    RETURN public._err('assessment_not_started', 'This assessment has not opened yet.');
  END IF;

  IF a.ends_at IS NOT NULL AND now() >= a.ends_at THEN
    RETURN public._err('assessment_closed', 'This assessment has concluded and is closed.');
  END IF;

  -- Organisation checks only apply if assessment is bound to an organisation
  IF a.organisation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.learning_organisations o WHERE o.id = a.organisation_id AND o.status = 'active') THEN
      RETURN public._err('organisation_unavailable', 'The host institution is not active.');
    END IF;

    IF NOT a.access_code_required AND NOT EXISTS (
      SELECT 1 FROM public.learning_organisation_members m
      WHERE m.organisation_id = a.organisation_id AND m.user_id = v_user AND m.status = 'active'
    ) THEN
      RETURN public._err('organisation_membership_required', 'Institutional membership is required for this assessment.');
    END IF;
  END IF;

  -- Access Code verification
  IF a.access_code_required THEN
    IF nullif(trim(coalesce(p_access_code, '')), '') IS NULL THEN
      RETURN public._err('access_code_required', 'Please enter your assessment access code or PIN.');
    END IF;

    SELECT * INTO c
    FROM public.learning_access_codes
    WHERE code_hash = encode(extensions.digest(upper(trim(p_access_code)), 'sha256'), 'hex')
      AND scope_type = 'assessment' AND assessment_id = a.id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Check access_codes table as fallback
      IF EXISTS (
        SELECT 1 FROM public.access_codes
        WHERE upper(trim(code)) = upper(trim(p_access_code))
          AND is_used = false
      ) THEN
        UPDATE public.access_codes
        SET is_used = true, used_by = v_user::text, used_at = now()
        WHERE upper(trim(code)) = upper(trim(p_access_code));
      ELSE
        RETURN public._err('invalid_assessment_code', 'The access code or PIN entered is invalid for this assessment.');
      END IF;
    ELSE
      IF c.revoked_at IS NOT NULL THEN
        RETURN public._err('code_revoked', 'This access code has been revoked.');
      END IF;
      IF NOT c.permanent AND c.expires_at <= now() THEN
        RETURN public._err('code_expired', 'This access code has expired.');
      END IF;
      IF c.redemption_count >= c.max_redemptions AND NOT EXISTS (
        SELECT 1 FROM public.learning_access_code_redemptions r
        WHERE r.access_code_id = c.id AND r.user_id = v_user
      ) THEN
        RETURN public._err('code_fully_redeemed', 'This access code has reached its maximum redemptions.');
      END IF;

      v_redeem := public.redeem_learning_access_code(p_access_code);
      IF coalesce((v_redeem->>'ok')::boolean, false) = false THEN
        RETURN v_redeem;
      END IF;
    END IF;
  END IF;

  -- Max attempts check
  SELECT count(*)::integer + 1 INTO v_number
  FROM public.learning_practice_attempts
  WHERE user_id = v_user AND assessment_id = a.id;

  IF a.max_attempts > 0 AND v_number > a.max_attempts THEN
    RETURN public._err('attempt_limit_reached', 'You have exhausted all allowed attempts for this assessment.');
  END IF;

  -- =========================================================================
  -- BRANCH 1: QUESTION BUILDER OR CSV IMPORT SOURCE
  -- =========================================================================
  IF a.question_source IN ('custom_builder', 'csv_import') THEN
    v_custom_q := coalesce(a.custom_questions, '[]'::jsonb);
    v_custom_count := jsonb_array_length(v_custom_q);

    IF v_custom_count = 0 THEN
      RETURN public._err('insufficient_questions', 'No questions have been configured for this assessment.');
    END IF;

    -- Handle optional random shuffling
    IF coalesce(a.shuffle_questions, true) = true THEN
      SELECT jsonb_agg(elem ORDER BY random()) INTO v_shuffled_custom
      FROM jsonb_array_elements(v_custom_q) AS elem;
    ELSE
      v_shuffled_custom := v_custom_q;
    END IF;

    -- Truncate to question_count with consistent 1-based sequential IDs for custom questions
    SELECT 
      jsonb_agg(elem || jsonb_build_object('id', ord, 'marks', coalesce((elem->>'marks')::numeric, 1))),
      array_agg(ord::bigint)
    INTO v_snapshot, v_selected_ids
    FROM (
      SELECT elem, row_number() OVER () AS ord
      FROM jsonb_array_elements(v_shuffled_custom) AS elem
      LIMIT a.question_count
    ) s;

    -- Generate candidate-facing paper (without answer keys)
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', (elem->>'id')::bigint,
        'subject', coalesce(elem->>'subject', a.title),
        'category', coalesce(elem->>'category', 'General'),
        'question', coalesce(elem->>'prompt', elem->>'question', ''),
        'question_image_url', coalesce(elem->>'image_url', elem->>'question_image_url'),
        'option_a', coalesce(elem->'options'->>'A', elem->>'option_a', ''),
        'option_b', coalesce(elem->'options'->>'B', elem->>'option_b', ''),
        'option_c', coalesce(elem->'options'->>'C', elem->>'option_c', ''),
        'option_d', coalesce(elem->'options'->>'D', elem->>'option_d', ''),
        'option_e', coalesce(elem->'options'->>'E', elem->>'option_e', null)
      )
    ) INTO v_paper
    FROM jsonb_array_elements(v_snapshot) AS elem;

    INSERT INTO public.learning_practice_attempts(
      user_id,
      assessment_id,
      organisation_id,
      attempt_type,
      attempt_number,
      access_code_id,
      selected_question_ids,
      question_snapshot,
      deadline_at
    )
    VALUES (
      v_user,
      a.id,
      a.organisation_id,
      a.assessment_type,
      v_number,
      c.id,
      v_selected_ids,
      v_snapshot,
      CASE WHEN a.duration_seconds IS NULL THEN NULL ELSE now() + make_interval(secs => a.duration_seconds) END
    )
    RETURNING * INTO v_attempt;

    RETURN jsonb_build_object(
      'ok', true,
      'attempt_id', v_attempt.id,
      'attempt_token', v_attempt.attempt_token,
      'attempt_number', v_number,
      'status', v_attempt.status,
      'started_at', v_attempt.started_at,
      'deadline_at', v_attempt.deadline_at,
      'assessment_title', a.title,
      'questions', v_paper
    );

  -- =========================================================================
  -- BRANCH 2: GENERAL MAIN QUESTION BANK SOURCE
  -- =========================================================================
  ELSE
    IF coalesce(a.shuffle_questions, true) = true THEN
      SELECT array_agg(q.id ORDER BY random()) INTO v_ids FROM (
        SELECT id FROM public.questions
        WHERE is_active = true AND subject = ANY(a.subjects)
          AND (coalesce(cardinality(a.categories), 0) = 0 OR category = ANY(a.categories))
          AND NOT EXISTS (SELECT 1 FROM public.question_exposure_history h WHERE h.user_id = v_user AND h.question_id = public.questions.id)
        ORDER BY random()
        LIMIT a.question_count
      ) q;

      IF coalesce(cardinality(v_ids), 0) < a.question_count THEN
        SELECT array_agg(q.id ORDER BY random()) INTO v_ids FROM (
          SELECT id FROM public.questions
          WHERE is_active = true AND subject = ANY(a.subjects)
            AND (coalesce(cardinality(a.categories), 0) = 0 OR category = ANY(a.categories))
          ORDER BY random()
          LIMIT a.question_count
        ) q;
      END IF;
    ELSE
      -- Fixed sequential order
      SELECT array_agg(q.id ORDER BY q.id ASC) INTO v_ids FROM (
        SELECT id FROM public.questions
        WHERE is_active = true AND subject = ANY(a.subjects)
          AND (coalesce(cardinality(a.categories), 0) = 0 OR category = ANY(a.categories))
        ORDER BY id ASC
        LIMIT a.question_count
      ) q;
    END IF;

    IF coalesce(cardinality(v_ids), 0) < a.question_count THEN
      RETURN public._err('insufficient_questions', 'There are not enough active questions in the bank matching this configuration.');
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id, 'subject', q.subject, 'section', q.section, 'category', q.category, 'passage_id', q.passage_id, 'passage_title', q.passage_title, 'passage_text', q.passage_text,
      'question', q.question, 'question_image_url', q.question_image_url, 'question_image_alt', q.question_image_alt,
      'option_a', q.option_a, 'option_a_image_url', q.option_a_image_url, 'option_a_image_alt', q.option_a_image_alt,
      'option_b', q.option_b, 'option_b_image_url', q.option_b_image_url, 'option_b_image_alt', q.option_b_image_alt,
      'option_c', q.option_c, 'option_c_image_url', q.option_c_image_url, 'option_c_image_alt', q.option_c_image_alt,
      'option_d', q.option_d, 'option_d_image_url', q.option_d_image_url, 'option_d_image_alt', q.option_d_image_alt,
      'option_e', q.option_e, 'option_e_image_url', q.option_e_image_url, 'option_e_image_alt', q.option_e_image_alt,
      'correct_answer', q.correct_answer, 'explanation', q.explanation, 'explanation_image_url', q.explanation_image_url, 'explanation_image_alt', q.explanation_image_alt, 'marks', coalesce(q.marks, 1)
    ) ORDER BY array_position(v_ids, q.id)) INTO v_snapshot
    FROM public.questions q
    WHERE q.id = ANY(v_ids);

    INSERT INTO public.learning_practice_attempts(
      user_id,
      assessment_id,
      organisation_id,
      attempt_type,
      attempt_number,
      access_code_id,
      selected_question_ids,
      question_snapshot,
      deadline_at
    )
    VALUES (
      v_user,
      a.id,
      a.organisation_id,
      a.assessment_type,
      v_number,
      c.id,
      v_ids,
      v_snapshot,
      CASE WHEN a.duration_seconds IS NULL THEN NULL ELSE now() + make_interval(secs => a.duration_seconds) END
    )
    RETURNING * INTO v_attempt;

    RETURN jsonb_build_object(
      'ok', true,
      'attempt_id', v_attempt.id,
      'attempt_token', v_attempt.attempt_token,
      'attempt_number', v_number,
      'status', v_attempt.status,
      'started_at', v_attempt.started_at,
      'deadline_at', v_attempt.deadline_at,
      'assessment_title', a.title,
      'questions', public._paper_json(v_ids)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.start_organisation_assessment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_organisation_assessment(UUID, TEXT) TO authenticated, service_role;

-- 5. RLS POLICY ENSURING UNIVERSAL ADMIN ACCESS
DROP POLICY IF EXISTS "learning_assessments_read_published_scoped" ON public.learning_assessments;
CREATE POLICY "learning_assessments_read_published_scoped"
ON public.learning_assessments FOR SELECT TO authenticated
USING (
  public.learning_can_manage_all()
  OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  OR (
    is_published
    AND (
      organisation_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.learning_organisation_members m
        WHERE m.organisation_id = learning_assessments.organisation_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
      )
    )
  )
);

DROP POLICY IF EXISTS "learning_assessments_manage_admin" ON public.learning_assessments;
CREATE POLICY "learning_assessments_manage_admin"
ON public.learning_assessments FOR ALL TO authenticated
USING (
  public.learning_can_manage_all()
  OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
)
WITH CHECK (
  public.learning_can_manage_all()
  OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
);

-- 6. PROGRESS SAVING & SUBMISSION ENGINE UPGRADES
CREATE OR REPLACE FUNCTION public.save_organisation_assessment_progress(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_answers jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $function$
DECLARE 
  a public.learning_practice_attempts%ROWTYPE; 
  cleaned jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN public._err('authentication_required', 'Sign in to save this assessment.'); END IF;
  IF jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' THEN RETURN public._err('invalid_answers', 'Answers must be an object.'); END IF;
  
  SELECT * INTO a 
  FROM public.learning_practice_attempts 
  WHERE id = p_attempt_id AND user_id = auth.uid()
  FOR UPDATE;
  
  IF NOT FOUND OR a.attempt_token <> p_attempt_token THEN RETURN public._err('invalid_attempt', 'Attempt not found.'); END IF;
  IF a.status <> 'in_progress' THEN RETURN public._err('attempt_closed', 'This attempt is no longer active.'); END IF;
  IF a.deadline_at IS NOT NULL AND now() >= a.deadline_at THEN RETURN public._err('attempt_expired', 'Time has expired. Submit saved answers now.'); END IF;
  
  SELECT coalesce(jsonb_object_agg(e.key, to_jsonb(upper(e.value #>> '{}'))), '{}'::jsonb) INTO cleaned 
  FROM jsonb_each(coalesce(p_answers, '{}'::jsonb)) e
  WHERE e.key ~ '^[0-9]+$' 
    AND (a.selected_question_ids IS NULL OR cardinality(a.selected_question_ids) = 0 OR e.key::bigint = ANY(a.selected_question_ids)) 
    AND upper(e.value #>> '{}') IN ('A', 'B', 'C', 'D', 'E');
    
  UPDATE public.learning_practice_attempts 
  SET answers = answers || cleaned, updated_at = now() 
  WHERE id = a.id;
  
  RETURN jsonb_build_object('ok', true, 'saved_at', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_organisation_assessment(
  p_attempt_id uuid,
  p_attempt_token uuid,
  p_answers jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $function$
DECLARE 
  a public.learning_practice_attempts%ROWTYPE; 
  cfg public.learning_assessments%ROWTYPE; 
  cleaned jsonb; 
  s numeric; 
  t numeric; 
  items jsonb; 
  release_results boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN public._err('authentication_required', 'Sign in to submit this assessment.'); END IF;
  IF jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' THEN RETURN public._err('invalid_answers', 'Answers must be an object.'); END IF;
  
  SELECT * INTO a 
  FROM public.learning_practice_attempts 
  WHERE id = p_attempt_id AND user_id = auth.uid()
  FOR UPDATE;
  
  IF NOT FOUND OR a.attempt_token <> p_attempt_token THEN RETURN public._err('invalid_attempt', 'Attempt not found.'); END IF;
  
  SELECT * INTO cfg FROM public.learning_assessments WHERE id = a.assessment_id;
  IF NOT FOUND THEN RETURN public._err('assessment_missing', 'Assessment configuration is unavailable.'); END IF;
  IF a.status NOT IN ('in_progress', 'submitted') THEN RETURN public._err('attempt_closed', 'This attempt cannot be submitted.'); END IF;

  IF a.status = 'in_progress' THEN
    SELECT coalesce(jsonb_object_agg(e.key, to_jsonb(upper(e.value #>> '{}'))), '{}'::jsonb) INTO cleaned 
    FROM jsonb_each(coalesce(p_answers, '{}'::jsonb)) e
    WHERE e.key ~ '^[0-9]+$' 
      AND (a.selected_question_ids IS NULL OR cardinality(a.selected_question_ids) = 0 OR e.key::bigint = ANY(a.selected_question_ids)) 
      AND upper(e.value #>> '{}') IN ('A', 'B', 'C', 'D', 'E');
      
    a.answers := a.answers || cleaned;
    
    SELECT 
      coalesce(sum(CASE WHEN upper(coalesce(a.answers->>(item->>'id'), '')) = upper(coalesce(item->>'correct_answer', '')) THEN coalesce((item->>'marks')::numeric, 1) ELSE 0 END), 0),
      coalesce(sum(coalesce((item->>'marks')::numeric, 1)), 0) 
    INTO s, t 
    FROM jsonb_array_elements(a.question_snapshot) AS x(item);
    
    UPDATE public.learning_practice_attempts 
    SET answers = a.answers,
        status = 'submitted',
        score = s,
        total = t,
        auto_submitted = (deadline_at IS NOT NULL AND now() >= deadline_at),
        submitted_at = now(),
        updated_at = now() 
    WHERE id = a.id 
    RETURNING * INTO a;
  END IF;

  release_results := cfg.result_release = 'after_submit' OR (cfg.result_release = 'after_close' AND cfg.ends_at IS NOT NULL AND now() >= cfg.ends_at);
  IF NOT release_results THEN 
    RETURN jsonb_build_object(
      'ok', true,
      'status', a.status,
      'attempt_id', a.id,
      'results_available', false,
      'message', CASE WHEN cfg.result_release = 'admin_only' THEN 'Submission recorded; results are held for administrators.' ELSE 'Submission recorded; results will be available after the assessment closes.' END
    ); 
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', item->>'id',
    'subject', coalesce(item->>'subject', cfg.title),
    'type', coalesce(item->>'section', 'General'),
    'text', coalesce(item->>'question', item->>'prompt', ''),
    'questionImageUrl', coalesce(item->>'question_image_url', item->>'image_url'),
    'questionImageAlt', coalesce(item->>'question_image_alt', ''),
    'options', jsonb_build_object(
      'A', coalesce(item->'options'->>'A', item->>'option_a', ''),
      'B', coalesce(item->'options'->>'B', item->>'option_b', ''),
      'C', coalesce(item->'options'->>'C', item->>'option_c', ''),
      'D', coalesce(item->'options'->>'D', item->>'option_d', ''),
      'E', coalesce(item->'options'->>'E', item->>'option_e', '')
    ),
    'correctAnswer', coalesce(item->>'correct_answer', ''),
    'userAnswer', a.answers->>(item->>'id'),
    'isCorrect', upper(coalesce(a.answers->>(item->>'id'), '')) = upper(coalesce(item->>'correct_answer', '')),
    'explanation', coalesce(item->>'explanation', ''),
    'explanationImageUrl', item->>'explanation_image_url',
    'marks', coalesce((item->>'marks')::numeric, 1)
  ) ORDER BY ord), '[]'::jsonb) INTO items 
  FROM jsonb_array_elements(a.question_snapshot) WITH ORDINALITY AS x(item, ord);

  RETURN jsonb_build_object(
    'ok', true,
    'status', a.status,
    'attempt_id', a.id,
    'results_available', true,
    'score', a.score,
    'total', a.total,
    'percentage', CASE WHEN coalesce(a.total, 0) > 0 THEN round((a.score / a.total) * 100, 2) ELSE 0 END,
    'auto_submitted', a.auto_submitted,
    'submitted_at', a.submitted_at,
    'items', items
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_organisation_assessment_progress(uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_organisation_assessment(uuid, uuid, jsonb) TO authenticated, service_role;
