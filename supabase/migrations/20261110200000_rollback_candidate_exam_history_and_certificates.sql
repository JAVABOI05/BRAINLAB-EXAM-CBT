-- ============================================================================
-- Migration Rollback: 20261110200000_rollback_candidate_exam_history_and_certificates.sql
-- Description: Rollback candidate examination history & verifiable certificates
-- ============================================================================

begin;

drop function if exists public.issue_milestone_exam_certificate(text, text, text, numeric, text, jsonb);

drop index if exists public.idx_learning_certificates_meta_result_id;
drop index if exists public.idx_learning_certificates_meta_session_id;
drop index if exists public.idx_learning_certificates_user_issued;

commit;
