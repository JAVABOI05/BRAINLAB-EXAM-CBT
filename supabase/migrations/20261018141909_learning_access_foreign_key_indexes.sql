-- Cover new organisation/access-code/entitlement foreign keys with indexes.
begin;
create index if not exists learning_access_code_redemptions_entitlement_idx on public.learning_access_code_redemptions(entitlement_id);
create index if not exists learning_access_code_redemptions_user_idx on public.learning_access_code_redemptions(user_id);
create index if not exists learning_access_codes_assessment_idx on public.learning_access_codes(assessment_id);
create index if not exists learning_access_codes_created_by_idx on public.learning_access_codes(created_by);
create index if not exists learning_access_codes_organisation_idx on public.learning_access_codes(organisation_id);
create index if not exists learning_assessments_created_by_idx on public.learning_assessments(created_by);
create index if not exists learning_entitlements_assessment_idx on public.learning_entitlements(assessment_id);
create index if not exists learning_entitlements_created_by_idx on public.learning_entitlements(created_by);
create index if not exists learning_entitlements_organisation_idx on public.learning_entitlements(organisation_id);
create index if not exists learning_organisation_members_invited_by_idx on public.learning_organisation_members(invited_by);
create index if not exists learning_organisations_created_by_idx on public.learning_organisations(created_by);
commit;
