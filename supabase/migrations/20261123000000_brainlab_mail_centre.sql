-- BrainLab Academy — Mail Centre & Communications Hub Schema
-- Upgrades the Super Admin Communications Hub into a full SaaS-quality email communication and management platform.
-- Features: Unified Inbox (hello@, support@, admin@, info@), Server-Enforced Campaign Approvals,
-- Delivery Tracking with Idempotent Resend Webhooks, Reusable Templates, Automated Triggers, and Audit Logging.

-- 1. Contacts & Audience Directory
CREATE TABLE IF NOT EXISTS public.mail_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  is_suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_mail_contacts_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_mail_contacts_email ON public.mail_contacts(lower(email));
CREATE INDEX IF NOT EXISTS idx_mail_contacts_user_id ON public.mail_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_contacts_consent ON public.mail_contacts(marketing_consent, is_suppressed);
CREATE INDEX IF NOT EXISTS idx_mail_contacts_tier ON public.mail_contacts(subscription_tier);

-- 2. Unified Inbox Conversations
CREATE TABLE IF NOT EXISTS public.mail_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_inbox TEXT NOT NULL DEFAULT 'support@brainlabacademy.com.ng',
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_admin_name TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  message_count INT NOT NULL DEFAULT 1,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_conversations_inbox ON public.mail_conversations(recipient_inbox);
CREATE INDEX IF NOT EXISTS idx_mail_conversations_customer ON public.mail_conversations(lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_mail_conversations_status ON public.mail_conversations(status);
CREATE INDEX IF NOT EXISTS idx_mail_conversations_assigned ON public.mail_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_mail_conversations_last_msg ON public.mail_conversations(last_message_at DESC);

-- 3. Messages & Internal Notes
CREATE TABLE IF NOT EXISTS public.mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.mail_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal_note')),
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT NOT NULL,
  resend_id TEXT,
  raw_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sender_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_conversation ON public.mail_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_resend_id ON public.mail_messages(resend_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_created_at ON public.mail_messages(created_at DESC);

-- 4. Reusable Email Templates
CREATE TABLE IF NOT EXISTS public.mail_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'marketing' CHECK (category IN ('marketing', 'transactional', 'announcement', 'newsletter', 'system')),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  available_tokens TEXT[] NOT NULL DEFAULT ARRAY['{{first_name}}', '{{full_name}}', '{{email}}', '{{subscription_plan}}', '{{unsubscribe_url}}', '{{current_year}}'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_templates_category ON public.mail_templates(category);

-- 5. Broadcast Campaigns & Server-Enforced Approval Workflow
CREATE TABLE IF NOT EXISTS public.mail_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_id UUID REFERENCES public.mail_templates(id) ON DELETE SET NULL,
  from_sender TEXT NOT NULL DEFAULT 'BrainLab Academy <noreply@mail.brainlabacademy.com.ng>',
  reply_to TEXT NOT NULL DEFAULT 'support@brainlabacademy.com.ng',
  category TEXT NOT NULL DEFAULT 'marketing' CHECK (category IN ('marketing', 'service_notification', 'transactional')),
  target_audience TEXT NOT NULL DEFAULT 'active_subscribers' CHECK (target_audience IN ('all_registered', 'active_subscribers', 'paid_tiers', 'custom_filter')),
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'queued', 'sending', 'sent', 'failed')),
  created_by_admin_id UUID NOT NULL,
  created_by_admin_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_by_admin_id UUID,
  approved_by_admin_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  approval_snapshot JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "complained": 0, "failed": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_campaigns_status ON public.mail_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_created_by ON public.mail_campaigns(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_created_at ON public.mail_campaigns(created_at DESC);

-- 6. Campaign Recipients Tracking
CREATE TABLE IF NOT EXISTS public.mail_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.mail_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.mail_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped')),
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_campaign ON public.mail_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_email ON public.mail_campaign_recipients(lower(email));
CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_resend ON public.mail_campaign_recipients(resend_id);
CREATE INDEX IF NOT EXISTS idx_mail_campaign_recipients_status ON public.mail_campaign_recipients(status);

-- 7. Delivery Events & Webhook Idempotency (Resend)
CREATE TABLE IF NOT EXISTS public.mail_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_event_id TEXT UNIQUE NOT NULL,
  resend_email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  campaign_id UUID REFERENCES public.mail_campaigns(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_events_resend_event_id ON public.mail_events(resend_event_id);
CREATE INDEX IF NOT EXISTS idx_mail_events_resend_email_id ON public.mail_events(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_mail_events_recipient ON public.mail_events(lower(recipient));
CREATE INDEX IF NOT EXISTS idx_mail_events_type ON public.mail_events(event_type);

-- 8. Mail Automations
CREATE TABLE IF NOT EXISTS public.mail_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  template_id UUID REFERENCES public.mail_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  delay_minutes INT NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Mail Audit Logs
CREATE TABLE IF NOT EXISTS public.mail_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mail_audit_logs_action ON public.mail_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_mail_audit_logs_created_at ON public.mail_audit_logs(created_at DESC);

-- 10. Initial Seed Templates
INSERT INTO public.mail_templates (name, description, category, subject, html_content, text_content)
VALUES
(
  'Welcome to BrainLab Academy',
  'Sent to new students upon registration or welcome broadcast.',
  'transactional',
  'Welcome to BrainLab Academy — Prepare Smarter, Progress Further',
  '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:24px;">
    <h2 style="color:#0B1536;margin-top:0;font-size:24px;font-weight:800;">Welcome to BrainLab, {{first_name}}!</h2>
    <p style="font-size:15px;line-height:1.6;color:#334155;">We are thrilled to welcome you to Nigeria''s premier examination preparation platform. Practise with purpose, understand deeply, and progress with confidence.</p>
    <div style="background-color:#F0F6FF;border-left:4px solid #1356E8;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0B1536;">Your Plan: <strong>{{subscription_plan}}</strong></h3>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">You have access to interactive CBT simulations, curriculum breakdowns, and AI-assisted performance analytics.</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://brainlabacademy.com.ng/account" style="background-color:#1356E8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">Launch CBT Portal &rarr;</a>
    </div>
  </div>',
  'Welcome to BrainLab, {{first_name}}! Practise with purpose, understand deeply, and progress with confidence. Launch CBT Portal at https://brainlabacademy.com.ng/account'
),
(
  'Official Examination Access PIN',
  'Delivers high-stakes CBT examination access code to registered candidate.',
  'transactional',
  'Your Examination Access Code for {{exam_title}}',
  '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:24px;">
    <h2 style="color:#0B1536;margin-top:0;font-size:22px;font-weight:800;">Official Exam Access Code</h2>
    <p style="font-size:15px;line-height:1.6;color:#334155;">Hello {{first_name}}, here is your verified access credentials for your upcoming session.</p>
    <div style="background-color:#F0FDF4;border:2px dashed #22C55E;border-radius:12px;padding:24px;text-align:center;margin:28px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#15803D;margin-bottom:8px;">Access PIN / Passcode</div>
      <div style="font-size:32px;font-weight:900;letter-spacing:4px;color:#14532D;font-family:Courier,monospace;">{{access_code}}</div>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#64748B;">Enter this PIN at <a href="https://brainlabacademy.com.ng/access" style="color:#1356E8;">brainlabacademy.com.ng/access</a> when instructed by your examination supervisor.</p>
  </div>',
  'Hello {{first_name}}, here is your access code: {{access_code}}. Enter this PIN at https://brainlabacademy.com.ng/access'
),
(
  'Weekly Academic Revision Digest',
  'Weekly digest sent to opted-in learners summarizing upcoming tests and challenges.',
  'marketing',
  'Your Weekly BrainLab Revision Digest — Ready for Next Weekend?',
  '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0B1536;padding:24px;">
    <h2 style="color:#0B1536;margin-top:0;font-size:24px;font-weight:800;">Weekly Academic Briefing</h2>
    <p style="font-size:15px;line-height:1.6;color:#334155;">Hello {{first_name}}, keep your streak alive! Explore high-yield practice questions and live challenge arena sessions scheduled for this week.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://brainlabacademy.com.ng/arena" style="background-color:#1356E8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block;">Join Live Challenge Arena &rarr;</a>
    </div>
    <p style="font-size:12px;color:#94A3B8;text-align:center;margin-top:32px;">You received this email because you opted in to BrainLab announcements. <a href="{{unsubscribe_url}}" style="color:#64748B;">Unsubscribe</a></p>
  </div>',
  'Hello {{first_name}}, keep your streak alive! Explore high-yield questions at https://brainlabacademy.com.ng/arena'
)
ON CONFLICT DO NOTHING;

-- 11. Security: Enable Row Level Security (RLS)
ALTER TABLE public.mail_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full unrestricted access
DROP POLICY IF EXISTS "Service role full access on mail_contacts" ON public.mail_contacts;
CREATE POLICY "Service role full access on mail_contacts" ON public.mail_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_conversations" ON public.mail_conversations;
CREATE POLICY "Service role full access on mail_conversations" ON public.mail_conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_messages" ON public.mail_messages;
CREATE POLICY "Service role full access on mail_messages" ON public.mail_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_templates" ON public.mail_templates;
CREATE POLICY "Service role full access on mail_templates" ON public.mail_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_campaigns" ON public.mail_campaigns;
CREATE POLICY "Service role full access on mail_campaigns" ON public.mail_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_campaign_recipients" ON public.mail_campaign_recipients;
CREATE POLICY "Service role full access on mail_campaign_recipients" ON public.mail_campaign_recipients FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_events" ON public.mail_events;
CREATE POLICY "Service role full access on mail_events" ON public.mail_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_automations" ON public.mail_automations;
CREATE POLICY "Service role full access on mail_automations" ON public.mail_automations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mail_audit_logs" ON public.mail_audit_logs;
CREATE POLICY "Service role full access on mail_audit_logs" ON public.mail_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated administrators can read templates & conversations
DROP POLICY IF EXISTS "Authenticated admins can view mail_templates" ON public.mail_templates;
CREATE POLICY "Authenticated admins can view mail_templates" ON public.mail_templates FOR SELECT TO authenticated USING (true);

-- End of BrainLab Mail Centre migration
