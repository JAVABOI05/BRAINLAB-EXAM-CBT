-- Classroom Studio: add attachments column to store imported lesson materials (PDF, PPTX, DOCX, CSV)
ALTER TABLE IF EXISTS public.classroom_lessons
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
