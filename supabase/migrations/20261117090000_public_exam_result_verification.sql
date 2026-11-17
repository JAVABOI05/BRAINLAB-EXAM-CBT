-- Public verification for completed CBT result slips.
-- This is intentionally independent of learning_certificates so existing
-- result QR links can be verified even where the certificate ledger rollout
-- has not yet been applied.
begin;

create or replace function public.verify_exam_result(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result record;
  v_show_results boolean := false;
  v_percentage numeric;
  v_grade text;
begin
  if p_query is null or trim(p_query) = ''
     or trim(p_query) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'No completed BrainLab result matches this verification identifier.'
    );
  end if;

  select coalesce((
    select s.value = 'true'::jsonb
    from public.settings s
    where s.key = 'show_results'
    limit 1
  ), false)
  into v_show_results;

  if not v_show_results then
    return jsonb_build_object(
      'ok', false,
      'error', 'results_not_released',
      'message', 'BrainLab has not released results for public verification.'
    );
  end if;

  select
    r.id,
    r.name,
    r.subject,
    r.score,
    r.total,
    r.created_at,
    es.candidate_name,
    es.status as session_status
  into v_result
  from public.results r
  left join public.exam_sessions es
    on es.id::text = r.session_id
  where r.id = trim(p_query)::uuid
    and (es.id is null or es.status in ('submitted', 'completed', 'auto_submitted'))
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'No completed BrainLab result matches this verification identifier.'
    );
  end if;

  v_percentage := case
    when coalesce(v_result.total, 0) > 0
      then round((v_result.score::numeric / v_result.total::numeric) * 100, 1)
    else 0
  end;

  if v_percentage >= 75 then v_grade := 'Distinction';
  elsif v_percentage >= 60 then v_grade := 'Very Good';
  elsif v_percentage >= 50 then v_grade := 'Credit';
  elsif v_percentage >= 40 then v_grade := 'Pass';
  else v_grade := 'Revision Pass';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'valid',
    'certificate', jsonb_build_object(
      'id', v_result.id,
      'certificate_number', 'BL-MOCK-' || to_char(v_result.created_at, 'YYYY') || '-' || upper(substr(md5(v_result.id::text), 1, 8)),
      'recipient_name', coalesce(nullif(trim(v_result.name), ''), nullif(trim(v_result.candidate_name), ''), 'Verified Candidate'),
      'title', 'JAMB UTME Standardized Milestone Mock Examination (' || coalesce(nullif(trim(v_result.subject), ''), 'CBT') || ')',
      'issuer_name', 'BrainLab Academy',
      'score', v_percentage,
      'grade', v_grade,
      'issued_at', v_result.created_at,
      'expires_at', null,
      'revoked_at', null,
      'revocation_reason', null
    )
  );
end;
$$;

revoke all on function public.verify_exam_result(text) from public;
grant execute on function public.verify_exam_result(text) to anon, authenticated;

comment on function public.verify_exam_result(text) is
  'Public, release-gated verification of completed CBT result slips by result UUID. Returns only certificate-style display fields.';

commit;
