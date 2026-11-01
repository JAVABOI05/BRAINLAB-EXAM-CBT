-- Migration: 20261101230000_access_codes_tracking_and_maintenance_notifications.sql
-- Purpose:
-- 1. Ensure access_codes table properly tracks used_at and session linkage, with atomic mark_access_code_used RPC.
-- 2. Ensure central notifications table and broadcast_system_notification RPC are available for maintenance notices.

-- 1. ACCESS CODES TRACKING
ALTER TABLE IF EXISTS public.access_codes
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exam_session_id UUID;

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes (code);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_used ON public.access_codes (is_used);

-- Atomic RPC to mark access code as used with race-condition protection
CREATE OR REPLACE FUNCTION public.mark_access_code_used(
  p_code TEXT,
  p_used_by TEXT,
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_code TEXT := upper(trim(p_code));
  v_row public.access_codes%ROWTYPE;
BEGIN
  IF v_clean_code IS NULL OR length(v_clean_code) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_code', 'message', 'Access code is required.');
  END IF;

  -- Lock row for update
  SELECT * INTO v_row
  FROM public.access_codes
  WHERE upper(trim(code)) = v_clean_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Access code does not exist.');
  END IF;

  IF v_row.is_used THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used', 'message', 'This access code has already been used.');
  END IF;

  UPDATE public.access_codes
  SET
    is_used = true,
    used_by = p_used_by,
    used_at = timezone('utc'::text, now()),
    exam_session_id = COALESCE(p_session_id, exam_session_id)
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_clean_code,
    'used_by', p_used_by,
    'used_at', timezone('utc'::text, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_access_code_used(TEXT, TEXT, UUID) TO service_role, authenticated, anon;


-- 2. CENTRAL NOTIFICATIONS TABLE VERIFICATION & BROADCAST RPC
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('class', 'assignment', 'announcement', 'message', 'system', 'billing', 'quiz')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and service role manage notifications" ON public.notifications;
CREATE POLICY "Admins and service role manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.admin_has_permission('community.moderate') OR public.admin_has_permission('cbt.config.manage'));

GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;


-- Broadcast RPC: sends an in-app notification to all registered candidates
CREATE OR REPLACE FUNCTION public.broadcast_system_notification(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'system',
  p_link_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_inserted_count INT := 0;
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_title');
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link_url, is_read, created_at)
  SELECT
    u.id,
    p_title,
    p_message,
    COALESCE(p_type, 'system'),
    p_link_url,
    false,
    timezone('utc'::text, now())
  FROM auth.users u
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'inserted_count', v_inserted_count,
    'title', p_title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_system_notification(TEXT, TEXT, TEXT, TEXT) TO service_role, authenticated;
