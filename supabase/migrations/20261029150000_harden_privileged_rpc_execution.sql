-- Restrict privileged SECURITY DEFINER RPCs to the roles and callers that need them.
-- This migration changes function execution privileges and adds a caller-identity check;
-- it does not change learner data, payment rows, or table RLS policies.

begin;

-- Payment fulfillment must only be invoked by trusted server-side code after provider
-- verification. PostgreSQL grants EXECUTE to PUBLIC by default, so a service_role-only
-- GRANT is not sufficient unless PUBLIC/anon/authenticated are explicitly revoked.
revoke all on function public.finalize_successful_payment(text, text, text, timestamptz, bigint)
  from public, anon, authenticated;
grant execute on function public.finalize_successful_payment(text, text, text, timestamptz, bigint)
  to service_role;

-- Topic content mutations are intended for signed-in administrators only. The function
-- bodies also perform an admin-role check; remove anonymous execution as defense in depth.
revoke all on function public.admin_save_topic_content_item(uuid, uuid, text, text, text, jsonb, jsonb, jsonb, boolean)
  from public, anon;
grant execute on function public.admin_save_topic_content_item(uuid, uuid, text, text, text, jsonb, jsonb, jsonb, boolean)
  to authenticated;

revoke all on function public.admin_duplicate_topic_content_item(uuid)
  from public, anon;
grant execute on function public.admin_duplicate_topic_content_item(uuid)
  to authenticated;

revoke all on function public.admin_reorder_topic_content_items(uuid, uuid[])
  from public, anon;
grant execute on function public.admin_reorder_topic_content_items(uuid, uuid[])
  to authenticated;

-- XP awards are an internal primitive called by record_learning_activity. Prevent direct
-- client calls from choosing an arbitrary learner and awarding arbitrary XP.
revoke all on function public.award_user_xp(uuid, integer, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.award_user_xp(uuid, integer, text, text, text, jsonb)
  to service_role;

-- Activity recording must only mutate the caller's own profile. Preserve authenticated
-- learner use, while allowing trusted service-role calls where the JWT role is service_role.
create or replace function public.record_learning_activity(
  p_user_id uuid,
  p_activity_type text,
  p_reference_id text,
  p_score_percent numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_today date := current_date;
  v_profile record;
  v_streak integer := 1;
  v_longest integer := 1;
  v_xp_base integer := 10;
  v_xp_bonus integer := 0;
  v_total_awarded integer := 0;
  v_idemp_key text;
  v_award_res jsonb;
  v_new_badges text[] := '{}';
begin
  if p_user_id is null
     or (
       auth.uid() is distinct from p_user_id
       and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     ) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_activity_type is null
     or p_activity_type not in ('lesson_complete', 'quiz_complete', 'topic_mcq', 'competition') then
    return jsonb_build_object('ok', false, 'error', 'invalid_activity_type');
  end if;

  insert into public.user_gamification_profiles (user_id, last_activity_date, current_streak_days, longest_streak_days)
  values (p_user_id, v_today, 1, 1)
  on conflict (user_id) do nothing;

  select * into v_profile
  from public.user_gamification_profiles
  where user_id = p_user_id
  for update;

  if v_profile.last_activity_date is null then
    v_streak := 1;
  elsif v_profile.last_activity_date = v_today then
    v_streak := v_profile.current_streak_days;
  elsif v_profile.last_activity_date = v_today - 1 then
    v_streak := v_profile.current_streak_days + 1;
  else
    v_streak := 1;
  end if;

  v_longest := greatest(v_streak, v_profile.longest_streak_days);

  update public.user_gamification_profiles
  set current_streak_days = v_streak,
      longest_streak_days = v_longest,
      last_activity_date = v_today,
      quizzes_completed_count = case when p_activity_type in ('quiz_complete', 'competition', 'topic_mcq') then quizzes_completed_count + 1 else quizzes_completed_count end,
      perfect_scores_count = case when p_score_percent >= 100 then perfect_scores_count + 1 else perfect_scores_count end,
      updated_at = now()
  where user_id = p_user_id;

  if p_activity_type = 'lesson_complete' then
    v_xp_base := 10;
  elsif p_activity_type in ('quiz_complete', 'topic_mcq') then
    v_xp_base := 5;
    if p_score_percent >= 80 then v_xp_bonus := 15; end if;
    if p_score_percent >= 100 then v_xp_bonus := 25; end if;
  elsif p_activity_type = 'competition' then
    v_xp_base := 20;
    if p_score_percent >= 100 then v_xp_bonus := 30; end if;
  end if;

  v_idemp_key := format('xp_%s_%s_%s', p_user_id, p_activity_type, coalesce(p_reference_id, ''));
  v_award_res := public.award_user_xp(
    p_user_id,
    v_xp_base + v_xp_bonus,
    p_activity_type,
    v_idemp_key,
    format('%s completed (%s%%)', p_activity_type, coalesce(p_score_percent::text, '100')),
    jsonb_build_object('ref_id', p_reference_id, 'score', p_score_percent)
  );

  v_total_awarded := v_xp_base + v_xp_bonus;

  if p_score_percent >= 100 then
    insert into public.user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'perfect_score', jsonb_build_object('event', p_activity_type, 'ref', p_reference_id))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, 'perfect_score');
  end if;

  if v_streak >= 7 then
    insert into public.user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'unstoppable', jsonb_build_object('streak_days', v_streak))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, 'unstoppable');
  end if;

  if (v_profile.quizzes_completed_count + 1) >= 100 then
    insert into public.user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, '100_quizzes', jsonb_build_object('total_quizzes', v_profile.quizzes_completed_count + 1))
    on conflict (user_id, badge_id) do nothing;
    v_new_badges := array_append(v_new_badges, '100_quizzes');
  end if;

  if exists (
    select 1 from public.user_subscriptions
    where user_id = p_user_id and status = 'active' and current_period_end > now()
  ) then
    insert into public.user_badge_awards (user_id, badge_id, provenance)
    values (p_user_id, 'premium_member', jsonb_build_object('source', 'subscription_verified'))
    on conflict (user_id, badge_id) do nothing;
  else
    delete from public.user_badge_awards
    where user_id = p_user_id and badge_id = 'premium_member';
  end if;

  return jsonb_build_object(
    'ok', true,
    'streak_days', v_streak,
    'longest_streak', v_longest,
    'xp_awarded', v_total_awarded,
    'new_badges', v_new_badges,
    'profile', (select row_to_json(p) from public.user_gamification_profiles p where p.user_id = p_user_id)
  );
end;
$function$;

revoke all on function public.record_learning_activity(uuid, text, text, numeric) from public, anon;
grant execute on function public.record_learning_activity(uuid, text, text, numeric) to authenticated, service_role;

-- Pin the search path for the remaining SECURITY DEFINER functions whose bodies use
-- public table names without schema qualification. Listing pg_temp last prevents a
-- caller-created temporary object from shadowing a public relation.
alter function public.finalize_successful_payment(text, text, text, timestamptz, bigint)
  set search_path = public, pg_temp;
alter function public.admin_save_topic_content_item(uuid, uuid, text, text, text, jsonb, jsonb, jsonb, boolean)
  set search_path = public, pg_temp;
alter function public.admin_duplicate_topic_content_item(uuid)
  set search_path = public, pg_temp;
alter function public.admin_reorder_topic_content_items(uuid, uuid[])
  set search_path = public, pg_temp;
alter function public.award_user_xp(uuid, integer, text, text, text, jsonb)
  set search_path = public, pg_temp;

commit;
