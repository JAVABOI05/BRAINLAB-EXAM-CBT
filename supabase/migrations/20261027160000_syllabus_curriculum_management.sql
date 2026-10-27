-- ============================================================================
-- Migration: 20261027160000_syllabus_curriculum_management.sql
-- Description: Unified Syllabus & Curriculum schema, subtopics, recommended texts,
--              and curriculum topic link to classroom masterclasses.
-- ============================================================================

-- 1. Extend learning_subjects with syllabus metadata
ALTER TABLE public.learning_subjects 
  ADD COLUMN IF NOT EXISTS syllabus_overview TEXT,
  ADD COLUMN IF NOT EXISTS general_objectives JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_textbooks JSONB DEFAULT '[]'::jsonb;

-- 2. Extend learning_topics with subtopics and curriculum fields
ALTER TABLE public.learning_topics
  ADD COLUMN IF NOT EXISTS subtopics JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_texts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'JAMB_UTME';

-- 3. Extend classroom_lessons or live_classes with topic reference if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'classroom_lessons') THEN
    ALTER TABLE public.classroom_lessons 
      ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID REFERENCES public.learning_topics(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS subtopic_focus TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_classes') THEN
    ALTER TABLE public.live_classes
      ADD COLUMN IF NOT EXISTS curriculum_topic_id UUID REFERENCES public.learning_topics(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS subtopic_focus TEXT;
  END IF;
END $$;
