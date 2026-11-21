-- Normalize assessment categories to the canonical attempt types.
-- The catalogue accepts academic_quiz and other assessment categories, while
-- the attempt engine intentionally stores only self_practice, organisation_quiz,
-- or competition. Apply after the Learning Assessment foundation/engine migrations.

CREATE OR REPLACE FUNCTION public.start_organisation_assessment(p_assessment_id uuid, p_access_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      CASE WHEN a.assessment_type = 'competition' THEN 'competition' ELSE 'organisation_quiz' END,
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
      CASE WHEN a.assessment_type = 'competition' THEN 'competition' ELSE 'organisation_quiz' END,
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
$function$


