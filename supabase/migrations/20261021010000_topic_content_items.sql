-- ============================================================================
-- Migration: 20261021010000_topic_content_items.sql
-- Description: Flexible Topic Content Studio, Ordered Multi-Type Content Items,
--              Configurable Limits, and Atomic Concurrency Controls
-- ============================================================================

begin;

-- ============================================================================
-- 1. Topic Content Items Table
-- ============================================================================
create table if not exists public.learning_topic_content_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  content_type text not null check (
    content_type in (
      'rich_text',
      'audio',
      'video',
      'in_class_mcq',
      'external_link',
      'document',
      'image',
      'interactive_diagram'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  summary text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  ai_metadata jsonb default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_topic_content_topic_order
  on public.learning_topic_content_items(topic_id, order_index);

create index if not exists idx_topic_content_topic_published
  on public.learning_topic_content_items(topic_id, is_published);

alter table public.learning_topic_content_items enable row level security;

-- Public can read published content items belonging to published topics and subjects
DROP POLICY IF EXISTS "topic_content_items_public_select" ON public.learning_topic_content_items;
create policy topic_content_items_public_select on public.learning_topic_content_items
  for select
  using (
    is_published = true
    and exists (
      select 1 from public.learning_topics t
      join public.learning_subjects s on s.id = t.subject_id
      where t.id = learning_topic_content_items.topic_id
        and t.is_published = true
        and s.is_published = true
    )
  );

-- Authorized administrators have full access
DROP POLICY IF EXISTS "topic_content_items_admin_all" ON public.learning_topic_content_items;
create policy topic_content_items_admin_all on public.learning_topic_content_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer', 'teacher')
    )
  )
  with check (
    exists (
      select 1 from public.admin_users a
      where a.id = auth.uid()
        and a.role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer', 'teacher')
    )
  );

-- ============================================================================
-- 2. Configurable Item Limits Setting
-- ============================================================================
insert into public.platform_configuration (
  key,
  category,
  value,
  description,
  is_secret
) values (
  'max_content_items_per_topic',
  'general',
  '50'::jsonb,
  'Maximum number of content items allowed per topic. Configurable by administrators.',
  false
) on conflict (key) do nothing;

-- ============================================================================
-- 3. Atomic Save Topic Content Item RPC
-- ============================================================================
create or replace function public.admin_save_topic_content_item(
  p_topic_id uuid,
  p_item_id uuid default null,
  p_content_type text default 'rich_text',
  p_title text default 'Untitled Content',
  p_summary text default null,
  p_data jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb,
  p_ai_metadata jsonb default '{}'::jsonb,
  p_is_published boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_max_items integer := 50;
  v_current_count integer := 0;
  v_order_index integer := 0;
  v_item record;
  v_is_update boolean := false;
  v_config_val jsonb;
begin
  -- 1. Authorization check
  if not exists (
    select 1 from admin_users
    where id = v_caller_id
      and role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer', 'teacher')
  ) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'You do not have permission to manage topic content.');
  end if;

  -- 2. Concurrency lock on parent topic
  perform id from learning_topics where id = p_topic_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'topic_not_found', 'message', 'The target topic does not exist.');
  end if;

  -- 3. Retrieve dynamic configurable limit
  select value into v_config_val from platform_configuration where key = 'max_content_items_per_topic' limit 1;
  if v_config_val is not null then
    v_max_items := coalesce((v_config_val #>> '{}')::integer, 50);
  end if;

  -- 4. Check if creating new or updating
  if p_item_id is not null then
    select * into v_item from learning_topic_content_items where id = p_item_id and topic_id = p_topic_id;
    if found then
      v_is_update := true;
    end if;
  end if;

  select count(*)::integer into v_current_count
  from learning_topic_content_items
  where topic_id = p_topic_id;

  -- 5. Enforce limit on new items
  if not v_is_update and v_current_count >= v_max_items then
    return jsonb_build_object(
      'ok', false,
      'error', 'limit_exceeded',
      'message', format('This topic has reached the configured maximum of %s content items. Remove existing items or ask an administrator to adjust the limit in Platform Configuration.', v_max_items),
      'current_count', v_current_count,
      'max_limit', v_max_items
    );
  end if;

  -- 6. Execute Insert or Update
  if v_is_update then
    update learning_topic_content_items
    set
      content_type = coalesce(p_content_type, content_type),
      title = trim(coalesce(p_title, title)),
      summary = p_summary,
      data = coalesce(p_data, data),
      metadata = coalesce(p_metadata, metadata),
      ai_metadata = coalesce(p_ai_metadata, ai_metadata),
      is_published = coalesce(p_is_published, is_published),
      version = version + 1,
      updated_at = now()
    where id = p_item_id
    returning * into v_item;
  else
    -- Next order index at end of topic
    select coalesce(max(order_index) + 1, 0) into v_order_index
    from learning_topic_content_items
    where topic_id = p_topic_id;

    insert into learning_topic_content_items (
      topic_id,
      content_type,
      title,
      summary,
      order_index,
      is_published,
      data,
      metadata,
      ai_metadata,
      created_by
    ) values (
      p_topic_id,
      p_content_type,
      trim(p_title),
      p_summary,
      v_order_index,
      coalesce(p_is_published, false),
      coalesce(p_data, '{}'::jsonb),
      coalesce(p_metadata, '{}'::jsonb),
      coalesce(p_ai_metadata, '{}'::jsonb),
      v_caller_id
    )
    returning * into v_item;

    v_current_count := v_current_count + 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item', row_to_json(v_item),
    'current_count', v_current_count,
    'max_limit', v_max_items
  );
end;
$$;

grant execute on function public.admin_save_topic_content_item to authenticated;

-- ============================================================================
-- 4. Atomic Reorder Topic Content Items RPC
-- ============================================================================
create or replace function public.admin_reorder_topic_content_items(
  p_topic_id uuid,
  p_item_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_idx integer;
begin
  if not exists (
    select 1 from admin_users
    where id = v_caller_id
      and role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer', 'teacher')
  ) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Permission denied.');
  end if;

  perform id from learning_topics where id = p_topic_id for update;

  for v_idx in 1 .. coalesce(cardinality(p_item_ids), 0) loop
    update learning_topic_content_items
    set order_index = v_idx - 1,
        updated_at = now()
    where id = p_item_ids[v_idx]
      and topic_id = p_topic_id;
  end loop;

  return jsonb_build_object('ok', true, 'reordered_count', cardinality(p_item_ids));
end;
$$;

grant execute on function public.admin_reorder_topic_content_items to authenticated;

-- ============================================================================
-- 5. Duplicate Content Item RPC
-- ============================================================================
create or replace function public.admin_duplicate_topic_content_item(
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_source record;
  v_max_items integer := 50;
  v_current_count integer := 0;
  v_new_item record;
  v_config_val jsonb;
begin
  if not exists (
    select 1 from admin_users
    where id = v_caller_id
      and role in ('super_admin', 'platform_admin', 'ai_learning_admin', 'content_reviewer', 'teacher')
  ) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized', 'message', 'Permission denied.');
  end if;

  select * into v_source from learning_topic_content_items where id = p_item_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'Content item not found.');
  end if;

  perform id from learning_topics where id = v_source.topic_id for update;

  select value into v_config_val from platform_configuration where key = 'max_content_items_per_topic' limit 1;
  if v_config_val is not null then
    v_max_items := coalesce((v_config_val #>> '{}')::integer, 50);
  end if;

  select count(*)::integer into v_current_count
  from learning_topic_content_items
  where topic_id = v_source.topic_id;

  if v_current_count >= v_max_items then
    return jsonb_build_object('ok', false, 'error', 'limit_exceeded', 'message', format('Duplication blocked: topic has reached maximum of %s items.', v_max_items));
  end if;

  -- Shift subsequent items down by 1
  update learning_topic_content_items
  set order_index = order_index + 1
  where topic_id = v_source.topic_id
    and order_index > v_source.order_index;

  -- Insert duplicated item directly after original
  insert into learning_topic_content_items (
    topic_id,
    content_type,
    title,
    summary,
    order_index,
    is_published,
    metadata,
    data,
    ai_metadata,
    created_by
  ) values (
    v_source.topic_id,
    v_source.content_type,
    v_source.title || ' (Copy)',
    v_source.summary,
    v_source.order_index + 1,
    false, -- Duplicates always start as draft
    v_source.metadata,
    v_source.data,
    jsonb_build_object('duplicated_from', v_source.id),
    v_caller_id
  )
  returning * into v_new_item;

  return jsonb_build_object('ok', true, 'item', row_to_json(v_new_item));
end;
$$;

grant execute on function public.admin_duplicate_topic_content_item to authenticated;

-- ============================================================================
-- 6. Public Learner Fetch RPC with Answer Key Masking
-- ============================================================================
create or replace function public.get_published_topic_content(
  p_topic_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'content_type', i.content_type,
        'title', i.title,
        'summary', i.summary,
        'order_index', i.order_index,
        'metadata', i.metadata,
        -- Safe learner payload: Mask correct answers for in_class_mcq
        'data', case 
          when i.content_type = 'in_class_mcq' then
            jsonb_set(
              i.data,
              '{questions}',
              (
                select coalesce(
                  jsonb_agg(
                    q - 'correct_option_id' - 'explanation' - 'distractor_explanations'
                  ),
                  '[]'::jsonb
                )
                from jsonb_array_elements(coalesce(i.data -> 'questions', '[]'::jsonb)) q
              )
            )
          else i.data
        end
      )
      order by i.order_index asc
    ),
    '[]'::jsonb
  ) into v_items
  from learning_topic_content_items i
  where i.topic_id = p_topic_id
    and i.is_published = true;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;

grant execute on function public.get_published_topic_content(uuid) to anon, authenticated;

-- ============================================================================
-- 7. In-Class MCQ Server-Side Grader RPC (Prevents Client Answer Key Exposure)
-- ============================================================================
create or replace function public.grade_topic_mcq_assessment(
  p_content_item_id uuid,
  p_candidate_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_questions jsonb;
  v_q jsonb;
  v_q_id text;
  v_correct_opt text;
  v_chosen_opt text;
  v_score integer := 0;
  v_total integer := 0;
  v_feedback jsonb := '[]'::jsonb;
begin
  select * into v_item
  from learning_topic_content_items
  where id = p_content_item_id
    and content_type = 'in_class_mcq';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found', 'message', 'In-class MCQ assessment not found.');
  end if;

  v_questions := coalesce(v_item.data -> 'questions', '[]'::jsonb);
  v_total := jsonb_array_length(v_questions);

  for v_q in select * from jsonb_array_elements(v_questions) loop
    v_q_id := v_q ->> 'id';
    v_correct_opt := upper(trim(v_q ->> 'correct_option_id'));
    v_chosen_opt := upper(trim(p_candidate_answers ->> v_q_id));

    if v_chosen_opt = v_correct_opt then
      v_score := v_score + 1;
      v_feedback := v_feedback || jsonb_build_object(
        'question_id', v_q_id,
        'correct', true,
        'chosen', v_chosen_opt,
        'correct_answer', v_correct_opt,
        'explanation', v_q ->> 'explanation'
      );
    else
      v_feedback := v_feedback || jsonb_build_object(
        'question_id', v_q_id,
        'correct', false,
        'chosen', v_chosen_opt,
        'correct_answer', v_correct_opt,
        'explanation', v_q ->> 'explanation',
        'distractor_note', (v_q -> 'distractor_explanations') ->> v_chosen_opt
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'score', v_score,
    'total', v_total,
    'percentage', case when v_total > 0 then round((v_score::numeric / v_total::numeric) * 100.0, 1) else 0 end,
    'feedback', v_feedback
  );
end;
$$;

grant execute on function public.grade_topic_mcq_assessment(uuid, jsonb) to anon, authenticated;

commit;
