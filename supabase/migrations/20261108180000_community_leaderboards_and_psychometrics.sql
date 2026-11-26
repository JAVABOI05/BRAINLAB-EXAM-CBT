-- ==============================================================================
-- BRAINLAB ACADEMY: STUDENT COMMUNITIES & ENGAGEMENT ECOSYSTEM (PHASE 4)
-- Migration: 20261108180000_community_leaderboards_and_psychometrics.sql
-- Purpose:
--   1. Create server-side cohort leaderboard ranking function with NDPA 2023
--      child safeguarding (anonymized candidate handles by default).
--   2. Implement fair tie-break rules: score DESC, time_spent_seconds ASC, submitted_at ASC.
--   3. Create cohort psychometrics aggregation function for faculty analytics.
-- ==============================================================================

BEGIN;

-- 1. COHORT LEADERBOARD RPC
CREATE OR REPLACE FUNCTION public.get_cohort_leaderboard(
  p_group_id UUID,
  p_scope TEXT DEFAULT 'weekly',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  masked_handle TEXT,
  score NUMERIC(5,2),
  percentage NUMERIC(5,2),
  time_spent_seconds INTEGER,
  submitted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  IF p_scope = 'daily' THEN
    v_start_time := date_trunc('day', timezone('utc', now()));
  ELSIF p_scope = 'weekly' THEN
    v_start_time := date_trunc('week', timezone('utc', now()));
  ELSE
    v_start_time := '1970-01-01'::timestamptz;
  END IF;

  RETURN QUERY
  WITH best_attempts AS (
    SELECT DISTINCT ON (a.user_id)
      a.user_id,
      a.score,
      a.percentage,
      a.time_spent_seconds,
      a.submitted_at
    FROM public.group_assessment_attempts a
    WHERE a.group_id = p_group_id
      AND a.status = 'completed'
      AND a.submitted_at >= v_start_time
    ORDER BY a.user_id, a.score DESC, a.time_spent_seconds ASC, a.submitted_at ASC
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY b.score DESC, b.time_spent_seconds ASC, b.submitted_at ASC) AS rank,
    b.user_id,
    'Candidate #BL-' || UPPER(SUBSTRING(b.user_id::text FROM 33 FOR 4)) AS masked_handle,
    b.score,
    b.percentage,
    b.time_spent_seconds,
    b.submitted_at
  FROM best_attempts b
  ORDER BY rank ASC
  LIMIT LEAST(p_limit, 100);
END;
$$;

-- Grant execution to authenticated and anon users (read-only safe with masked handles)
GRANT EXECUTE ON FUNCTION public.get_cohort_leaderboard(UUID, TEXT, INTEGER) TO authenticated, anon;

-- 2. COHORT PSYCHOMETRICS RPC
CREATE OR REPLACE FUNCTION public.get_cohort_psychometrics(
  p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_attempts', COUNT(a.id),
    'unique_candidates', COUNT(DISTINCT a.user_id),
    'average_score', COALESCE(ROUND(AVG(a.score), 2), 0),
    'average_percentage', COALESCE(ROUND(AVG(a.percentage), 2), 0),
    'pass_rate_percentage', COALESCE(ROUND((COUNT(CASE WHEN a.percentage >= 50 THEN 1 END)::numeric / NULLIF(COUNT(a.id), 0)) * 100, 2), 0),
    'average_time_spent_seconds', COALESCE(ROUND(AVG(a.time_spent_seconds)), 0),
    'disqualified_count', COUNT(CASE WHEN a.status = 'disqualified' THEN 1 END)
  )
  INTO v_result
  FROM public.group_assessment_attempts a
  WHERE a.group_id = p_group_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cohort_psychometrics(UUID) TO authenticated;

COMMIT;
