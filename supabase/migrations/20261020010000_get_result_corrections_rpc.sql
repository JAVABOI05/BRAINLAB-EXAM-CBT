-- Returns corrections for a finalised exam result.
-- Checks that the result exists, belongs to a finalised session, and that
-- show_results is enabled globally. Never exposes answer keys before release.
create or replace function get_result_corrections(
  p_result_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_show_results boolean;
  v_result record;
begin
  -- Check global show_results setting
  select (value::text = 'true') into v_show_results
  from settings
  where key = 'show_results'
  limit 1;

  if not coalesce(v_show_results, false) then
    return jsonb_build_object(
      'ok', false,
      'error', 'results_not_released',
      'message', 'Results have not been released yet. Please check back later.'
    );
  end if;

  -- Verify the result exists and is finalised
  select r.id, r.items, r.status
  into v_result
  from results r
  where r.id = p_result_id
    and r.status in ('submitted', 'completed', 'auto_submitted')
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'not_found',
      'message', 'This result could not be found or is not yet finalised.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_result.items, '[]'::jsonb)
  );
end;
$$;

-- Grant execute to anon and authenticated (result_id acts as the capability token)
grant execute on function get_result_corrections(uuid) to anon, authenticated;
