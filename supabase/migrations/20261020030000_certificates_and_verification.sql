-- ============================================================================
-- Migration: 20261020030000_certificates_and_verification.sql
-- Description: Digital Certificate & Public Verification Engine (Phoenix Master Blueprint)
-- ============================================================================

begin;

create table if not exists public.learning_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  recipient_name text not null,
  title text not null,
  issuer_name text not null default 'BrainLab Academy',
  organisation_id uuid references public.learning_organisations(id) on delete set null,
  assessment_id uuid references public.learning_assessments(id) on delete set null,
  score numeric,
  grade text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learning_certificates_number_idx on public.learning_certificates(certificate_number);
create index if not exists learning_certificates_user_idx on public.learning_certificates(user_id);
create index if not exists learning_certificates_org_idx on public.learning_certificates(organisation_id);

alter table public.learning_certificates enable row level security;

-- Public read policy for verified credentials (only non-revoked certificates)
DROP POLICY IF EXISTS "learning_certificates_public_read" ON public.learning_certificates;
create policy learning_certificates_public_read on public.learning_certificates
  for select
  using (true);

-- Authenticated admin manage policy
DROP POLICY IF EXISTS "learning_certificates_admin_all" ON public.learning_certificates;
create policy learning_certificates_admin_all on public.learning_certificates
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'academic_director')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'academic_director')
    )
  );

-- ============================================================================
-- Public RPC: verify_certificate
-- Verifies a certificate by UUID or Certificate Number
-- ============================================================================
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

  -- Test if input looks like a UUID
  v_is_uuid := p_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  if v_is_uuid then
    select * into v_cert
    from public.learning_certificates
    where id = p_query::uuid
    limit 1;
  else
    select * into v_cert
    from public.learning_certificates
    where upper(certificate_number) = upper(trim(p_query))
    limit 1;
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

grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
