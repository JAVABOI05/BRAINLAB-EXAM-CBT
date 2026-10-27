-- Candidate & Subscriber Notification Preferences
-- Allows learners, mock candidates, and subscribers to manage channels or unsubscribe completely.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  exam_results BOOLEAN NOT NULL DEFAULT true,
  classroom_alerts BOOLEAN NOT NULL DEFAULT true,
  streak_reminders BOOLEAN NOT NULL DEFAULT true,
  assignments BOOLEAN NOT NULL DEFAULT true,
  marketing_announcements BOOLEAN NOT NULL DEFAULT true,
  sms_alerts BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_all BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_notification_preferences_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_email ON public.notification_preferences(lower(email));

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and update their own preferences
DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can read own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR lower(email) = lower(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR lower(email) = lower(auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR lower(email) = lower(auth.jwt()->>'email'))
  WITH CHECK (auth.uid() = user_id OR lower(email) = lower(auth.jwt()->>'email'));

-- Service role has full access
GRANT ALL ON public.notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO anon;
