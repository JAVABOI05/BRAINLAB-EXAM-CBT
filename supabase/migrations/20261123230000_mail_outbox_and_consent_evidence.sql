-- BrainLab shared email engine foundation.
-- Adds a durable outbox and append-only marketing-consent evidence.
-- This migration is prepared for review; it has NOT been applied to any database.

CREATE TABLE IF NOT EXISTS public.mail_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_kind TEXT NOT NULL CHECK (message_kind IN ('transactional', 'marketing', 'service_notification')),
  recipient_email TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  resend_email_id TEXT,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_campaign_recipients_campaign_email
  ON public.mail_campaign_recipients (campaign_id, email);

CREATE INDEX IF NOT EXISTS idx_mail_outbox_ready
  ON public.mail_outbox (available_at, created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_mail_outbox_expired_lease
  ON public.mail_outbox (locked_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_mail_outbox_recipient
  ON public.mail_outbox (lower(recipient_email), created_at DESC);

ALTER TABLE public.mail_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mail_outbox FROM anon, authenticated;
GRANT ALL ON public.mail_outbox TO service_role;

DROP POLICY IF EXISTS "Service role full access on mail_outbox" ON public.mail_outbox;
CREATE POLICY "Service role full access on mail_outbox"
  ON public.mail_outbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Append-only evidence for marketing subscription changes.
CREATE TABLE IF NOT EXISTS public.mail_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.mail_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  source TEXT NOT NULL CHECK (source IN ('signup_form', 'preferences_center', 'admin', 'import', 'resend_webhook', 'legacy_migration')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legacy contacts without a saved preference or opt-in evidence are not marketing subscribers.
UPDATE public.mail_contacts AS contact
SET marketing_consent = COALESCE(
  (
    SELECT preference.marketing_announcements AND NOT preference.unsubscribed_all
    FROM public.notification_preferences AS preference
    WHERE lower(preference.email) = lower(contact.email)
  ),
  false
),
updated_at = now();

INSERT INTO public.mail_consent_events (contact_id, email, action, source, evidence)
SELECT contact.id, contact.email, 'opt_in', 'legacy_migration',
       jsonb_build_object('migrated_from', 'notification_preferences', 'preference_updated_at', preference.updated_at)
FROM public.mail_contacts AS contact
JOIN public.notification_preferences AS preference
  ON lower(preference.email) = lower(contact.email)
WHERE preference.marketing_announcements = true
  AND preference.unsubscribed_all = false
  AND NOT EXISTS (
    SELECT 1 FROM public.mail_consent_events AS event
    WHERE lower(event.email) = lower(contact.email)
  );

CREATE INDEX IF NOT EXISTS idx_mail_consent_events_email
  ON public.mail_consent_events (lower(email), created_at DESC);

ALTER TABLE public.mail_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mail_consent_events FROM anon, authenticated;
GRANT ALL ON public.mail_consent_events TO service_role;

DROP POLICY IF EXISTS "Service role full access on mail_consent_events" ON public.mail_consent_events;
CREATE POLICY "Service role full access on mail_consent_events"
  ON public.mail_consent_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Atomically claim queued jobs. Expired processing leases are recoverable.
CREATE OR REPLACE FUNCTION public.claim_mail_outbox_jobs(
  p_limit INTEGER DEFAULT 20,
  p_worker_id TEXT DEFAULT 'mail-worker',
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.mail_outbox
LANGUAGE sql
VOLATILE
SET search_path = public, pg_temp
AS $$
  WITH candidates AS (
    SELECT id
    FROM public.mail_outbox
    WHERE (status = 'queued' AND available_at <= now())
       OR (status = 'processing' AND locked_at < now() - make_interval(secs => GREATEST(p_lease_seconds, 30)))
    ORDER BY available_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.mail_outbox AS jobs
  SET status = 'processing',
      attempt_count = jobs.attempt_count + 1,
      locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  FROM candidates
  WHERE jobs.id = candidates.id
  RETURNING jobs.*;
$$;

REVOKE ALL ON FUNCTION public.claim_mail_outbox_jobs(INTEGER, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mail_outbox_jobs(INTEGER, TEXT, INTEGER) TO service_role;
