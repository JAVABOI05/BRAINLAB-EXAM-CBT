-- Pin trigger-function search_path values to prevent object shadowing.
-- This migration only changes function configuration; it does not modify table data
-- or RLS policies. Apply through the reviewed Supabase migration process.

begin;

alter function public.set_classroom_lesson_updated_at()
  set search_path = '';

alter function public.prevent_audit_log_mutation()
  set search_path = '';

commit;
