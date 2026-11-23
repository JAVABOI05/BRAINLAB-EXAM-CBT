-- Candidate Session Recovery: preserve the canonical active state and expose
-- the server checkpoint timestamp so clients can safely reconcile offline queues.
-- This migration is additive and must be applied to staging before any deployment.

CREATE OR REPLACE FUNCTION public._session_payload(
  s public.exam_sessions,
  p_resumed boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'ok', true,
    'finished', false,
    'resumed', p_resumed,
    'session_id', s.id,
    'token', s.attempt_token,
    'elective', s.elective,
    'duration_seconds', s.duration_seconds,
    'time_left_seconds', public._seconds_left(s.deadline_at),
    'tab_switch_count', s.tab_switch_count,
    'answers', s.draft_answers,
    'questions', public._paper_json(s.paper_ids),
    'last_saved_at', s.last_saved_at
  );
$function$;

CREATE OR REPLACE FUNCTION public.resume_exam(
  p_session uuid,
  p_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s public.exam_sessions%ROWTYPE;
BEGIN
  SELECT *
    INTO s
    FROM public.exam_sessions
   WHERE id = p_session
     AND attempt_token = p_token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN public._err('invalid_session', 'Session not found.');
  END IF;

  IF s.status = 'cancelled' THEN
    RETURN public._err('cancelled', 'This attempt was cancelled.');
  END IF;

  -- The deployed schema permits only started, submitted, expired and
  -- cancelled. Do not invent or write in_progress; it violates the check.
  IF s.status IN ('submitted', 'expired') THEN
    RETURN public._result_payload(s.id, '{}'::jsonb);
  END IF;

  IF s.status <> 'started' THEN
    RETURN public._err('invalid_state', 'This examination is not in a recoverable state.');
  END IF;

  IF s.deadline_at IS NULL THEN
    RETURN public._err('invalid_deadline', 'The examination deadline is missing. Contact the invigilator.');
  END IF;

  IF now() > s.deadline_at THEN
    RETURN public._finalize_session(s.id, NULL, true, '{}'::jsonb);
  END IF;

  RETURN public._session_payload(s, true);
END;
$function$;

COMMENT ON FUNCTION public.resume_exam(uuid, uuid) IS
  'Restores an active CBT attempt without resetting its paper, answers or deadline; finalizes only when the authoritative deadline has elapsed.';

NOTIFY pgrst, 'reload schema';
