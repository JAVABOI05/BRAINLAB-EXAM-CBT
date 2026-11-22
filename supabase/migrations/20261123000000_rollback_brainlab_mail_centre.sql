-- Rollback BrainLab Mail Centre schema

DROP TABLE IF EXISTS public.mail_audit_logs CASCADE;
DROP TABLE IF EXISTS public.mail_automations CASCADE;
DROP TABLE IF EXISTS public.mail_events CASCADE;
DROP TABLE IF EXISTS public.mail_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.mail_campaigns CASCADE;
DROP TABLE IF EXISTS public.mail_templates CASCADE;
DROP TABLE IF EXISTS public.mail_messages CASCADE;
DROP TABLE IF EXISTS public.mail_conversations CASCADE;
DROP TABLE IF EXISTS public.mail_contacts CASCADE;
