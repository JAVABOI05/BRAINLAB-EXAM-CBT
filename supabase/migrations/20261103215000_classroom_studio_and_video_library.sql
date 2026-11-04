-- ============================================================================
-- MIGRATION: BrainLab Academy Classroom Studio, Video Projects & Library Upgrade
-- File: supabase/migrations/20261103220000_classroom_studio_and_video_library.sql
-- Description: Supports independent Video Lesson Studio recording, video projects,
--              reusable library assets, and decouples recordings from live classes.
-- ============================================================================

BEGIN;

-- 1. DECOUPLE RECORDINGS: Allow class_recordings to support standalone studio lessons
ALTER TABLE public.class_recordings
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE public.class_recordings
  ADD COLUMN IF NOT EXISTS recording_source TEXT NOT NULL DEFAULT 'live_class'
    CHECK (recording_source IN ('live_class', 'lesson_studio')),
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '1080p',
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16 / 9',
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.classroom_lessons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_recordings_source_tutor
  ON public.class_recordings(recording_source, created_by, created_at DESC);

-- 2. CREATE CLASSROOM VIDEO PROJECTS TABLE (Drafts, configurations, PiP layout)
CREATE TABLE IF NOT EXISTS public.classroom_video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.classroom_lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Video Lesson',
  subject TEXT,
  topic TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'recording', 'exported', 'archived')),
  layout_mode TEXT NOT NULL DEFAULT 'whiteboard_pip' 
    CHECK (layout_mode IN ('whiteboard_only', 'camera_only', 'whiteboard_pip', 'whiteboard_mic', 'slides_pip')),
  pip_position TEXT NOT NULL DEFAULT 'bottom_right' 
    CHECK (pip_position IN ('top_left', 'top_right', 'bottom_left', 'bottom_right', 'custom')),
  pip_size TEXT NOT NULL DEFAULT 'medium' 
    CHECK (pip_size IN ('small', 'medium', 'large')),
  pip_custom_coords JSONB DEFAULT '{"x": 80, "y": 80, "width": 240, "height": 160}'::jsonb,
  quality_preset TEXT NOT NULL DEFAULT '1080p' 
    CHECK (quality_preset IN ('480p', '720p', '1080p')),
  orientation TEXT NOT NULL DEFAULT 'landscape' 
    CHECK (orientation IN ('landscape', 'portrait')),
  audio_settings JSONB DEFAULT '{"micEnabled": true, "noiseSuppression": true, "echoCancellation": true}'::jsonb,
  trim_start_seconds NUMERIC(8,2) DEFAULT 0,
  trim_end_seconds NUMERIC(8,2) DEFAULT 0,
  last_recording_url TEXT,
  last_recording_duration NUMERIC(8,2) DEFAULT 0,
  last_recording_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_classroom_video_projects_tutor 
  ON public.classroom_video_projects(tutor_id, updated_at DESC);

ALTER TABLE public.classroom_video_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors manage their own video projects" ON public.classroom_video_projects;
CREATE POLICY "Tutors manage their own video projects"
  ON public.classroom_video_projects FOR ALL
  TO authenticated
  USING (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  )
  WITH CHECK (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_video_projects TO authenticated;

-- 3. EXPAND CLASSROOM_LESSONS FOR BETTER METADATA & REUSABILITY
ALTER TABLE public.classroom_lessons
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS curriculum_topic_id TEXT,
  ADD COLUMN IF NOT EXISTS subtopic_focus TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 4. UPDATE CLASS_RECORDINGS RLS POLICIES FOR TUTORS & ADMINS
DROP POLICY IF EXISTS "class_recordings_select_visible_or_owner" ON public.class_recordings;
CREATE POLICY "class_recordings_select_visible_or_owner"
  ON public.class_recordings FOR SELECT
  TO authenticated
  USING (
    (is_visible_to_students = true AND processing_status = 'ready')
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id AND lc.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid() AND a.role IN ('super_admin', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "class_recordings_tutor_manage" ON public.class_recordings;
CREATE POLICY "class_recordings_tutor_manage"
  ON public.class_recordings FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id AND lc.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid() AND a.role IN ('super_admin', 'platform_admin')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.live_classes lc
      WHERE lc.id = class_recordings.class_id AND lc.tutor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.id = auth.uid() AND a.role IN ('super_admin', 'platform_admin')
    )
  );

COMMIT;
