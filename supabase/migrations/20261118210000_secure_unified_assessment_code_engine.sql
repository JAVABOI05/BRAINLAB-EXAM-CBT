-- =============================================================================
-- Migration: 20261118210000_secure_unified_assessment_code_engine.sql
-- Purpose:
-- 1. Correct security flaw in start_organisation_assessment:
--    - Remove indiscriminate fallback to public.access_codes
--    - Check attempt limits and schedule BEFORE code redemption
--    - Atomic, transaction-safe redemption with FOR UPDATE locking
-- 2. Allow assessment creators to manage assessment codes for their own assessments
-- 3. Provide manage_assessment_code RPC for instructors to generate, set, view, or revoke codes
-- =============================================================================

BEGIN;

-- 1. UPDATE RLS POLICY ON learning_access_codes TO ALLOW ASSESSMENT CREATORS ACCESS
DROP POLICY IF EXISTS learning_access_codes_manage_scoped ON public.learning_access_codes;
CREATE POLICY learning_access_codes_manage_scoped ON public.learning_access_codes
FOR ALL
USING (
  public.learning_can_manage_all()
  OR (scope_type = 'assessment' AND (
    public.admin_has_permission('cbt.codes.manage')
    OR EXISTS (
      SELECT 1 FROM public.learning_assessments a
      WHERE a.id = learning_access_codes.assessment_id
        AND (
          (a.organisation_id IS NOT NULL AND public.learning_can_manage_organisation(a.organisation_id))
          OR a.created_by = auth.uid()
        )
    )
  ))
  OR (scope_type = 'organisation' AND organisation_id IS NOT NULL AND public.learning_can_manage_organisation(organisation_id))
)
WITH CHECK (
  public.learning_can_manage_all()
  OR (scope_type = 'assessment' AND (
    public.admin_has_permission('cbt.codes.manage')
    OR EXISTS (
      SELECT 1 FROM public.learning_assessments a
      WHERE a.id = learning_access_codes.assessment_id
        AND (
          (a.organisation_id IS NOT NULL AND public.learning_can_manage_organisation(a.organisation_id))
          OR a.created_by = auth.uid()
        )
    )
  ))
  OR (scope_type = 'organisation' AND organisation_id IS NOT NULL AND public.learning_can_manage_organisation(organisation_id))
);

-- 2. SECURE & AUDITED start_organisation_assessment RPC
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
  v_entitlement UUID;
  v_clean_code TEXT := upper(trim(coalesce(p_access_code, '')));
  v_custom_q JSONB;
  v_custom_count INTEGER;
  v_shuffled_custom JSONB := '[]'::jsonb;
  v_paper JSONB := '[]'::jsonb;
  v_elem JSONB;
  v_idx INTEGER := 0;
  v_is_already_redeemed BOOLEAN := false;
BEGIN
  -- 1. Authentication check
  IF v_user IS NULL THEN
    RETURN public._err('authentication_required', 'Sign in to start this assessment.');
  END IF;

  -- 2. Assessment existence & publication check
  SELECT * INTO a
  FROM public.learning_assessments
  WHERE id = p_assessment_id AND is_published;

  IF NOT FOUND THEN
    RETURN public._err('assessment_unavailable', 'This assessment is not currently available or published.');
  END IF;

  -- 3. Schedule checks
  IF a.starts_at IS NOT NULL AND now() < a.starts_at THEN
    RETURN public._err('assessment_not_started', 'This assessment has not opened yet.');
  END IF;

  IF a.ends_at IS NOT NULL AND now() >= a.ends_at THEN
    RETURN public._err('assessment_closed', 'This assessment has concluded and is closed.');
  END IF;

  -- 4. Organisation membership check (if bound to an active host institution)
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

  -- 5. ATTEMPT LIMIT CHECK (Checked FIRST before redeeming or locking any code)
  SELECT count(*)::integer + 1 INTO v_number
  FROM public.learning_practice_attempts
  WHERE user_id = v_user AND assessment_id = a.id;

  IF a.max_attempts > 0 AND v_number > a.max_attempts THEN
    RETURN public._err('attempt_limit_reached', 'You have exhausted all allowed attempts for this assessment.');
  END IF;

  -- 6. SECURE ACCESS CODE VERIFICATION & ATOMIC REDEMPTION
  IF a.access_code_required THEN
    IF v_clean_code = '' THEN
      RETURN public._err('access_code_required', 'Please enter your assessment access code or PIN.');
    END IF;

    -- Query strictly scoped to this assessment
    SELECT * INTO c
    FROM public.learning_access_codes
    WHERE code_hash = encode(extensions.digest(v_clean_code, 'sha256'), 'hex')
      AND scope_type = 'assessment'
      AND assessment_id = a.id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Strict fallback check: only allow if access_codes row explicitly specifies cohort_assessment_id = a.id
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'access_codes' AND column_name = 'cohort_assessment_id'
      ) THEN
        -- Safely query via dynamic sql to avoid syntax errors if column is absent in older migrations
        EXECUTE 'SELECT id FROM public.access_codes WHERE upper(trim(code)) = $1 AND cohort_assessment_id = $2 AND is_used = false FOR UPDATE'
        INTO v_entitlement
        USING v_clean_code, a.id;

        IF v_entitlement IS NOT NULL THEN
          UPDATE public.access_codes
          SET is_used = true, used_by = v_user::text, used_at = now()
          WHERE id = v_entitlement;
        ELSE
          RETURN public._err('invalid_assessment_code', 'The access code or PIN entered is invalid for this assessment.');
        END IF;
      ELSE
        RETURN public._err('invalid_assessment_code', 'The access code or PIN entered is invalid for this assessment.');
      END IF;
    ELSE
      -- Verified in learning_access_codes table
      IF c.revoked_at IS NOT NULL THEN
        RETURN public._err('code_revoked', 'This access code has been revoked by the instructor.');
      END IF;

      IF NOT c.permanent AND c.expires_at <= now() THEN
        RETURN public._err('code_expired', 'This access code has expired.');
      END IF;

      -- Check if current user has already redeemed this code
      SELECT EXISTS (
        SELECT 1 FROM public.learning_access_code_redemptions r
        WHERE r.access_code_id = c.id AND r.user_id = v_user
      ) INTO v_is_already_redeemed;

      IF NOT v_is_already_redeemed THEN
        -- New redemption: check capacity
        IF c.redemption_count >= c.max_redemptions THEN
          RETURN public._err('code_fully_redeemed', 'This access code has reached its maximum redemptions limit.');
        END IF;

        -- Atomically increment redemption count
        UPDATE public.learning_access_codes
        SET redemption_count = redemption_count + 1
        WHERE id = c.id;

        -- Record entitlement
        INSERT INTO public.learning_entitlements(
          user_id, entitlement_type, membership_type, resource_key,
          organisation_id, assessment_id, max_questions, status,
          permanent, expires_at, created_by
        )
        VALUES (
          v_user, 'assessment', null, null,
          a.organisation_id, a.id, a.question_count, 'active',
          c.permanent, c.expires_at, c.created_by
        )
        RETURNING id INTO v_entitlement;

        -- Record redemption audit
        INSERT INTO public.learning_access_code_redemptions(
          access_code_id, user_id, entitlement_id, redeemed_at
        )
        VALUES (
          c.id, v_user, v_entitlement, now()
        );
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- QUESTION GENERATION & PAPER ASSEMBLY
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
        'marks', coalesce((elem->>'marks')::numeric, 1)
      )
    ) INTO v_paper
    FROM jsonb_array_elements(v_snapshot) AS elem;

  ELSE
    -- Legacy questions bank source
    SELECT coalesce(array_agg(q.id ORDER BY random()), '{}'::bigint[])
    INTO v_ids
    FROM public.questions q
    WHERE q.is_active = true
      AND (cardinality(a.subjects) = 0 OR q.subject = ANY(a.subjects))
      AND (cardinality(a.categories) = 0 OR q.category = ANY(a.categories));

    IF cardinality(v_ids) < a.question_count THEN
      RETURN public._err('insufficient_questions', 'Not enough active questions match the subject and category criteria.');
    END IF;

    v_selected_ids := v_ids[1:a.question_count];

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'subject', q.subject,
        'category', q.category,
        'question', q.question,
        'option_a', q.option_a,
        'option_b', q.option_b,
        'option_c', q.option_c,
        'option_d', q.option_d,
        'correct_option', q.correct_option,
        'explanation', q.explanation,
        'marks', q.marks
      )
    ) INTO v_snapshot
    FROM public.questions q
    WHERE q.id = ANY(v_selected_ids);

    SELECT jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'subject', q.subject,
        'category', q.category,
        'question', q.question,
        'option_a', q.option_a,
        'option_b', q.option_b,
        'option_c', q.option_c,
        'option_d', q.option_d,
        'marks', q.marks
      )
    ) INTO v_paper
    FROM public.questions q
    WHERE q.id = ANY(v_selected_ids);
  END IF;

  -- Create attempt record
  INSERT INTO public.learning_practice_attempts(
    user_id,
    attempt_type,
    organisation_id,
    assessment_id,
    status,
    question_count,
    time_spent_seconds,
    duration_seconds,
    deadline_at,
    attempt_token,
    questions_snapshot,
    started_at
  )
  VALUES (
    v_user,
    a.assessment_type,
    a.organisation_id,
    a.id,
    'started',
    cardinality(v_selected_ids),
    0,
    a.duration_seconds,
    CASE WHEN a.duration_seconds IS NOT NULL THEN now() + (a.duration_seconds || ' seconds')::interval ELSE NULL END,
    gen_random_uuid(),
    v_snapshot,
    now()
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt.id,
    'attempt_token', v_attempt.attempt_token,
    'assessment_title', a.title,
    'duration_seconds', a.duration_seconds,
    'deadline_at', v_attempt.deadline_at,
    'questions', v_paper
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_organisation_assessment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_organisation_assessment(UUID, TEXT) TO authenticated, service_role;

-- 3. INSTRUCTOR / ADMIN ASSESSMENT CODE MANAGEMENT RPC
CREATE OR REPLACE FUNCTION public.manage_assessment_code(
  p_assessment_id UUID,
  p_action TEXT, -- 'get' | 'set' | 'generate' | 'revoke'
  p_custom_code TEXT DEFAULT NULL,
  p_max_redemptions INTEGER DEFAULT 500,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  a public.learning_assessments%ROWTYPE;
  c public.learning_access_codes%ROWTYPE;
  v_allowed BOOLEAN := false;
  v_code TEXT;
  v_hash TEXT;
  v_id UUID;
  v_clean_code TEXT := upper(trim(coalesce(p_custom_code, '')));
BEGIN
  IF v_actor IS NULL THEN
    RETURN public._err('authentication_required', 'Sign in to manage assessment examination codes.');
  END IF;

  SELECT * INTO a
  FROM public.learning_assessments
  WHERE id = p_assessment_id;

  IF NOT FOUND THEN
    RETURN public._err('assessment_not_found', 'Assessment not found.');
  END IF;

  -- Verify permissions: Super Admin, CBT Codes Admin, Org Manager, or assessment creator
  v_allowed := public.learning_can_manage_all()
    OR public.admin_has_permission('cbt.codes.manage')
    OR (a.organisation_id IS NOT NULL AND public.learning_can_manage_organisation(a.organisation_id))
    OR a.created_by = v_actor;

  IF NOT v_allowed THEN
    RETURN public._err('permission_denied', 'You do not have permission to manage codes for this examination.');
  END IF;

  -- ACTION: GET
  IF p_action = 'get' THEN
    SELECT * INTO c
    FROM public.learning_access_codes
    WHERE scope_type = 'assessment' AND assessment_id = a.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'has_code', false,
        'access_code_required', a.access_code_required
      );
    ELSE
      RETURN jsonb_build_object(
        'ok', true,
        'has_code', true,
        'id', c.id,
        'code_hint', c.code_hint,
        'max_redemptions', c.max_redemptions,
        'redemption_count', c.redemption_count,
        'permanent', c.permanent,
        'expires_at', c.expires_at,
        'revoked_at', c.revoked_at,
        'is_active', (c.revoked_at IS NULL AND (c.permanent OR c.expires_at > now()) AND c.redemption_count < c.max_redemptions),
        'access_code_required', a.access_code_required
      );
    END IF;

  -- ACTION: SET (custom code) OR GENERATE (clean auto code)
  ELSIF p_action IN ('set', 'generate') THEN
    IF p_action = 'set' THEN
      IF length(v_clean_code) < 4 OR length(v_clean_code) > 64 THEN
        RETURN public._err('invalid_custom_code', 'Custom code must be between 4 and 64 characters.');
      END IF;
      v_code := v_clean_code;
    ELSE
      -- Generate clean, readable 8-character code: e.g. BLT-7W9X2M
      v_code := 'BLT-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    END IF;

    v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

    -- Revoke any prior active codes for this assessment
    UPDATE public.learning_access_codes
    SET revoked_at = now()
    WHERE scope_type = 'assessment' AND assessment_id = a.id AND revoked_at IS NULL;

    -- Insert new code
    INSERT INTO public.learning_access_codes(
      code_hash, code_hint, scope_type, assessment_id, organisation_id,
      max_questions, permanent, expires_at, max_redemptions, redemption_count,
      created_by, created_at
    )
    VALUES (
      v_hash,
      right(v_code, 4),
      'assessment',
      a.id,
      a.organisation_id,
      a.question_count,
      (p_expires_at IS NULL),
      coalesce(p_expires_at, a.ends_at, now() + interval '90 days'),
      greatest(1, coalesce(p_max_redemptions, 500)),
      0,
      v_actor,
      now()
    )
    RETURNING id INTO v_id;

    -- Ensure access_code_required is enabled on the assessment
    UPDATE public.learning_assessments
    SET access_code_required = true
    WHERE id = a.id;

    -- Log audit trail
    INSERT INTO public.audit_logs(action, target_table, target_id, details)
    VALUES (
      'assessment_code_generated',
      'learning_access_codes',
      v_id::text,
      jsonb_build_object(
        'assessment_id', a.id,
        'hint', right(v_code, 4),
        'max_redemptions', p_max_redemptions,
        'action', p_action
      )
    );

    RETURN jsonb_build_object(
      'ok', true,
      'id', v_id,
      'code', v_code,
      'hint', right(v_code, 4),
      'max_redemptions', greatest(1, coalesce(p_max_redemptions, 500)),
      'message', 'Examination access code configured successfully. Copy and share it with your students.'
    );

  -- ACTION: REVOKE
  ELSIF p_action = 'revoke' THEN
    UPDATE public.learning_access_codes
    SET revoked_at = now()
    WHERE scope_type = 'assessment' AND assessment_id = a.id AND revoked_at IS NULL;

    -- Log audit trail
    INSERT INTO public.audit_logs(action, target_table, target_id, details)
    VALUES (
      'assessment_code_revoked',
      'learning_assessments',
      a.id::text,
      jsonb_build_object('assessment_id', a.id)
    );

    RETURN jsonb_build_object(
      'ok', true,
      'message', 'All examination codes for this assessment have been revoked.'
    );

  ELSE
    RETURN public._err('invalid_action', 'Valid actions are get, set, generate, or revoke.');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_assessment_code(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_assessment_code(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated, service_role;

COMMIT;
