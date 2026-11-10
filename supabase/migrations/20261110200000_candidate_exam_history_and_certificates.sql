-- ============================================================================
-- Migration: 20261110200000_candidate_exam_history_and_certificates.sql
-- Description: Candidate Examination History & Verifiable Digital Certificates
-- ============================================================================

begin;

-- 1. Ensure indexes for efficient certificate lookups by result_id and session_id
create index if not exists idx_learning_certificates_meta_result_id
  on public.learning_certificates ((metadata->>'result_id'));

create index if not exists idx_learning_certificates_meta_session_id
  on public.learning_certificates ((metadata->>'session_id'));

create index if not exists idx_learning_certificates_user_issued
  on public.learning_certificates (user_id, issued_at desc);

-- 2. Secure RPC to issue or retrieve milestone exam certificate
create or replace function public.issue_milestone_exam_certificate(
  p_result_id text,
  p_recipient_name text,
  p_title text default 'JAMB UTME Standardized Milestone Mock Examination',
  p_score numeric default null,
  p_grade text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.learning_certificates%rowtype;
  v_cert_num text;
  v_hash text;
  v_new_cert public.learning_certificates%rowtype;
begin
  if p_result_id is null or trim(p_result_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_request', 'message', 'Result ID is required.');
  end if;

  if p_recipient_name is null or trim(p_recipient_name) = '' then
    p_recipient_name := 'Verified Candidate';
  end if;

  -- 1. Check if a certificate has already been issued for this result_id
  select * into v_existing
  from public.learning_certificates
  where metadata->>'result_id' = trim(p_result_id)
     or metadata->>'session_id' = trim(p_result_id)
     or (p_result_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and id = p_result_id::uuid)
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'already_issued', true,
      'status', case when v_existing.revoked_at is not null then 'revoked' else 'valid' end,
      'certificate', jsonb_build_object(
        'id', v_existing.id,
        'certificate_number', v_existing.certificate_number,
        'recipient_name', v_existing.recipient_name,
        'title', v_existing.title,
        'issuer_name', v_existing.issuer_name,
        'score', v_existing.score,
        'grade', v_existing.grade,
        'issued_at', v_existing.issued_at,
        'metadata', v_existing.metadata
      )
    );
  end if;

  -- 2. Generate deterministic tamper-evident certificate number
  v_hash := upper(substring(encode(extensions.digest(p_result_id || coalesce(v_user_id::text, 'anon') || 'brainlab_salt', 'sha256'), 'hex') from 1 for 8));
  v_cert_num := 'BL-MOCK-' || to_char(now(), 'YYYY') || '-' || v_hash;

  -- 3. Insert into immutable certificate ledger
  insert into public.learning_certificates (
    certificate_number,
    user_id,
    recipient_name,
    title,
    issuer_name,
    score,
    grade,
    metadata
  ) values (
    v_cert_num,
    v_user_id,
    trim(p_recipient_name),
    trim(p_title),
    'BrainLab Academy',
    p_score,
    p_grade,
    jsonb_build_object('result_id', trim(p_result_id)) || coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_new_cert;

  return jsonb_build_object(
    'ok', true,
    'already_issued', false,
    'status', 'valid',
    'certificate', jsonb_build_object(
      'id', v_new_cert.id,
      'certificate_number', v_new_cert.certificate_number,
      'recipient_name', v_new_cert.recipient_name,
      'title', v_new_cert.title,
      'issuer_name', v_new_cert.issuer_name,
      'score', v_new_cert.score,
      'grade', v_new_cert.grade,
      'issued_at', v_new_cert.issued_at,
      'metadata', v_new_cert.metadata
    )
  );
end;
$$;

-- 3. Enhanced verify_certificate RPC that resolves certificates by cert_num, UUID, or result_id
create or replace function public.verify_certificate(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cert public.learning_certificates%rowtype;
  v_status text;
  v_is_uuid boolean := false;
begin
  if p_query is null or trim(p_query) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_query', 'message', 'Please provide a valid certificate identifier.');
  end if;

  v_is_uuid := p_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  -- 1. Query by UUID or Certificate Number
  if v_is_uuid then
    select * into v_cert
    from public.learning_certificates
    where id = p_query::uuid
       or metadata->>'result_id' = p_query
       or metadata->>'session_id' = p_query
    limit 1;
  else
    select * into v_cert
    from public.learning_certificates
    where upper(certificate_number) = upper(trim(p_query))
       or metadata->>'result_id' = trim(p_query)
       or metadata->>'session_id' = trim(p_query)
    limit 1;
  end if;

  -- 2. Fallback check: If not in learning_certificates, check if p_query matches a finished result in results table
  if not found and v_is_uuid then
    declare
      v_res record;
      v_grade text;
      v_score_pct numeric;
    begin
      select r.id, r.score, r.total, r.created_at, s.candidate_name, s.subject
      into v_res
      from public.results r
      left join public.exam_sessions s on s.id = r.session_id
      where r.id = p_query::uuid or r.session_id = p_query::uuid
      limit 1;

      if found then
        v_score_pct := case when coalesce(v_res.total, 0) > 0 then round((v_res.score::numeric / v_res.total::numeric) * 100, 1) else 0 end;
        if v_score_pct >= 75 then v_grade := 'Distinction';
        elsif v_score_pct >= 60 then v_grade := 'Very Good';
        elsif v_score_pct >= 50 then v_grade := 'Credit';
        elsif v_score_pct >= 40 then v_grade := 'Pass';
        else v_grade := 'Revision Pass';
        end if;

        return jsonb_build_object(
          'ok', true,
          'status', 'valid',
          'certificate', jsonb_build_object(
            'id', v_res.id,
            'certificate_number', 'BL-MOCK-' || to_char(v_res.created_at, 'YYYY') || '-' || upper(substring(encode(extensions.digest(v_res.id::text, 'sha256'), 'hex') from 1 for 8)),
            'recipient_name', coalesce(v_res.candidate_name, 'Verified Candidate'),
            'title', 'JAMB UTME Standardized Milestone Mock Examination (' || coalesce(v_res.subject, 'Science Combination') || ')',
            'issuer_name', 'BrainLab Academy',
            'score', v_score_pct,
            'grade', v_grade,
            'issued_at', v_res.created_at,
            'expires_at', null,
            'revoked_at', null,
            'revocation_reason', null
          )
        );
      end if;
    end;
  end if;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'No certificate was found matching this identifier.'
    );
  end if;

  if v_cert.revoked_at is not null then
    v_status := 'revoked';
  elsif v_cert.expires_at is not null and v_cert.expires_at <= now() then
    v_status := 'expired';
  else
    v_status := 'valid';
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'certificate', jsonb_build_object(
      'id', v_cert.id,
      'certificate_number', v_cert.certificate_number,
      'recipient_name', v_cert.recipient_name,
      'title', v_cert.title,
      'issuer_name', v_cert.issuer_name,
      'score', v_cert.score,
      'grade', v_cert.grade,
      'issued_at', v_cert.issued_at,
      'expires_at', v_cert.expires_at,
      'revoked_at', v_cert.revoked_at,
      'revocation_reason', case when v_status = 'revoked' then v_cert.revocation_reason else null end
    )
  );
end;
$$;

-- 4. Function permissions
grant execute on function public.issue_milestone_exam_certificate(text, text, text, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
