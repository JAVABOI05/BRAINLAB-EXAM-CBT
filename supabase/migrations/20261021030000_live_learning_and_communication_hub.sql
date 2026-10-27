-- ==============================================================================
-- BRAINLAB ACADEMY MASTER UPGRADE: LIVE LEARNING, COMMUNICATION, PRESENCE & AUDIO
-- Migration: 20261021030000_live_learning_and_communication_hub.sql
-- ==============================================================================

-- 1. COURSES & ENROLLMENTS
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  subject_id UUID REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  tutor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cover_image TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  price_kobo BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  capacity INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'assistant', 'auditor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_course_user UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_subject ON public.courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_tutor ON public.courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.course_enrollments(course_id);

-- 2. LIVE CLASSES & SESSIONS
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  class_format TEXT NOT NULL DEFAULT 'interactive' CHECK (class_format IN ('interactive', 'broadcast', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'open', 'live', 'completed', 'cancelled', 'failed')),
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  max_capacity INTEGER NOT NULL DEFAULT 100,
  room_name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'webrtc' CHECK (provider IN ('livekit', 'agora', 'daily', 'webrtc')),
  is_recording_enabled BOOLEAN NOT NULL DEFAULT true,
  waiting_room_enabled BOOLEAN NOT NULL DEFAULT false,
  student_mic_enabled BOOLEAN NOT NULL DEFAULT true,
  student_camera_enabled BOOLEAN NOT NULL DEFAULT false,
  student_chat_enabled BOOLEAN NOT NULL DEFAULT true,
  student_screenshare_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_live_classes_course ON public.live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_tutor ON public.live_classes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_schedule ON public.live_classes(scheduled_start_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON public.live_classes(status);

-- 3. CLASS ATTENDANCE & PARTICIPATION
CREATE TABLE IF NOT EXISTS public.class_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  join_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  leave_time TIMESTAMPTZ,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  attendance_status TEXT NOT NULL DEFAULT 'present' CHECK (attendance_status IN ('present', 'partial', 'absent', 'manual_verified')),
  provider_session_id TEXT,
  manual_correction_reason TEXT,
  corrected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attendance_class ON public.class_attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.class_attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_user ON public.class_attendance_records(class_id, user_id);

-- 4. AUDIO ASSETS (VOICE NOTES, AUDIO LESSONS, SUBMISSIONS)
CREATE TABLE IF NOT EXISTS public.audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('tutor_voice_note', 'student_submission', 'lesson_audio', 'discussion_audio')),
  title TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  duration_seconds NUMERIC(8,2) NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  transcript_text TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_user ON public.audio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_type ON public.audio_assets(asset_type);

-- 5. CLASS RECORDINGS
CREATE TABLE IF NOT EXISTS public.class_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  storage_path TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'ready' CHECK (processing_status IN ('processing', 'ready', 'failed')),
  is_downloadable BOOLEAN NOT NULL DEFAULT false,
  access_policy TEXT NOT NULL DEFAULT 'enrolled_only' CHECK (access_policy IN ('enrolled_only', 'public', 'tutors_only')),
  captions_url TEXT,
  transcript_text TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recordings_class ON public.class_recordings(class_id);
CREATE INDEX IF NOT EXISTS idx_recordings_course ON public.class_recordings(course_id);

-- 6. CALENDAR & TIMETABLE
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'class' CHECK (event_type IN ('class', 'assignment', 'exam', 'revision', 'custom')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  location_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'rescheduled', 'cancelled', 'completed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_calendar_user ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_course ON public.calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_times ON public.calendar_events(start_time, end_time);

-- 7. CONVERSATIONS & PRIVATE/GROUP MESSAGING
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'course', 'class')),
  title TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'tutor', 'moderator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio_note', 'file', 'system', 'announcement')),
  content TEXT NOT NULL,
  audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);

-- 8. MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_message_user_reaction UNIQUE (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_msg_reactions_msg ON public.message_reactions(message_id);

-- 9. OFFICIAL TAGS
CREATE TABLE IF NOT EXISTS public.official_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0284c7',
  bg_color TEXT NOT NULL DEFAULT '#e0f2fe',
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_roles TEXT[] NOT NULL DEFAULT '{"admin","tutor","super_admin"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.official_tags (name, display_label, color, bg_color, description, sort_order)
VALUES 
  ('IMPORTANT', 'Important', '#b91c1c', '#fee2e2', 'Crucial academic notice or deadline', 1),
  ('EXAM_TIP', 'Exam Tip', '#7c3aed', '#f3e8ff', 'High-yield exam strategy or technique', 2),
  ('ASSIGNMENT', 'Assignment', '#0369a1', '#e0f2fe', 'Required practical or homework task', 3),
  ('CORRECTION', 'Correction', '#c2410c', '#ffedd5', 'Errata or syllabus correction note', 4),
  ('REVISION', 'Revision', '#15803d', '#dcfce7', 'Key revision material for upcoming test', 5),
  ('READ_THIS', 'Read This', '#0f766e', '#ccfbf1', 'Essential foundational reading', 6),
  ('CLASS_UPDATE', 'Class Update', '#4338ca', '#e0e7ff', 'Schedule change or live session announcement', 7)
ON CONFLICT (name) DO NOTHING;

-- 10. COURSE FEED & ASYNCHRONOUS CONTENT POSTS
CREATE TABLE IF NOT EXISTS public.course_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'announcement' CHECK (post_type IN ('announcement', 'lesson_note', 'resource', 'assignment', 'revision')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'scheduled', 'published', 'archived', 'deleted')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  scheduled_publish_at TIMESTAMPTZ,
  audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feed_course_created ON public.course_feed_posts(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_author ON public.course_feed_posts(author_id);

-- 11. CONTENT TAGS RELATIONSHIP
CREATE TABLE IF NOT EXISTS public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.official_tags(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'message', 'resource', 'lesson', 'class')),
  content_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_content_tag UNIQUE (tag_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_tags_lookup ON public.content_tags(content_type, content_id);

-- 12. MEANINGFUL CONTENT VIEWS & ANALYTICS
CREATE TABLE IF NOT EXISTS public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'recording', 'lesson', 'resource')),
  content_id UUID NOT NULL,
  viewing_session_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_view_session UNIQUE (user_id, content_type, content_id, viewing_session_id)
);

CREATE INDEX IF NOT EXISTS idx_content_views_target ON public.content_views(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_user ON public.content_views(user_id);

-- 13. MESSAGE READ RECEIPTS
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_msg_read_receipt UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_receipts_msg ON public.message_read_receipts(message_id);

-- 14. ASSIGNMENTS & AUDIO SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.learning_subjects(id) ON DELETE SET NULL,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  allow_audio_submission BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMPTZ,
  max_points INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_submission TEXT,
  audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  grade NUMERIC(5,2),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'resubmission_requested')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_student_assignment UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.assignment_submissions(student_id);

-- 15. PRESENCE & ONLINE STATUS
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'recently_active', 'offline', 'in_class', 'studying', 'away')),
  custom_status TEXT,
  current_class_id UUID REFERENCES public.live_classes(id) ON DELETE SET NULL,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_visible BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_presence_heartbeat ON public.user_presence(last_heartbeat_at);

-- 16. CENTRAL NOTIFICATIONS
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Courses: Published courses visible to everyone, tutors manage their courses, admins manage all
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses" ON public.courses
  FOR SELECT USING (is_published = true OR auth.uid() = tutor_id);

DROP POLICY IF EXISTS "Tutors and admins can manage courses" ON public.courses;
CREATE POLICY "Tutors and admins can manage courses" ON public.courses
  FOR ALL USING (auth.uid() = tutor_id OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

-- Enrollments: Users can view their own enrollments, tutors & admins can view for their courses
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.tutor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

-- Live Classes: Enrolled students or public if free, tutor can manage
DROP POLICY IF EXISTS "View live classes" ON public.live_classes;
CREATE POLICY "View live classes" ON public.live_classes
  FOR SELECT USING (
    status != 'draft' OR tutor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors manage own classes" ON public.live_classes;
CREATE POLICY "Tutors manage own classes" ON public.live_classes
  FOR ALL USING (tutor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

-- Attendance: Users view own attendance, tutors view class attendance
DROP POLICY IF EXISTS "Users view own attendance" ON public.class_attendance_records;
CREATE POLICY "Users view own attendance" ON public.class_attendance_records
  FOR SELECT USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.live_classes lc WHERE lc.id = class_id AND lc.tutor_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

-- Messages & Conversations: Participants can view and post
DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;
CREATE POLICY "Participants view conversations" ON public.conversations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
CREATE POLICY "Participants view messages" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
  ));

DROP POLICY IF EXISTS "Send messages in joined conversations" ON public.messages;
CREATE POLICY "Send messages in joined conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

-- Notifications: User only
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Official Tags: Everyone can view active tags
DROP POLICY IF EXISTS "Everyone can view active tags" ON public.official_tags;
CREATE POLICY "Everyone can view active tags" ON public.official_tags
  FOR SELECT USING (is_active = true);

-- User presence: visible presence can be seen by authenticated users
DROP POLICY IF EXISTS "Authenticated users view visible presence" ON public.user_presence;
CREATE POLICY "Authenticated users view visible presence" ON public.user_presence
  FOR SELECT USING (is_visible = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own presence" ON public.user_presence;
CREATE POLICY "Users update own presence" ON public.user_presence
  FOR ALL USING (user_id = auth.uid());

-- Audio Assets: Tutors/Creators view/manage, student submissions visible to tutors
DROP POLICY IF EXISTS "Users view accessible audio" ON public.audio_assets;
CREATE POLICY "Users view accessible audio" ON public.audio_assets
  FOR SELECT USING (
    user_id = auth.uid() OR 
    asset_type IN ('tutor_voice_note', 'lesson_audio') OR
    EXISTS (
      SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users create own audio" ON public.audio_assets;
CREATE POLICY "Users create own audio" ON public.audio_assets
  FOR INSERT WITH CHECK (user_id = auth.uid());
