-- AI usage tracking table
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  action_type text not null,
  target_key text not null,
  use_count integer not null default 0,
  extra_credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, action_type, target_key)
);

alter table ai_usage enable row level security;

create policy "Users can view own ai_usage" on ai_usage
  for select using (auth.uid() = user_id);

-- RPC: check and increment usage for an AI action
-- Returns { allowed, reason, remaining }
-- Free / Protection tier: 4 uses per (action_type, target_key) = 1 free + 3 refreshes
-- Extra credits added when user purchases a pack (extra_credits += 10)
create or replace function check_ai_usage(
  p_user_id uuid,
  p_action_type text,
  p_target_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_use_count     integer;
  v_extra_credits integer;
  v_base_limit    integer := 4;   -- 1 free + 3 refreshes
  v_total_limit   integer;
  v_remaining     integer;
begin
  insert into ai_usage (user_id, action_type, target_key, use_count, extra_credits)
  values (p_user_id, p_action_type, p_target_key, 0, 0)
  on conflict (user_id, action_type, target_key) do nothing;

  select use_count, extra_credits
    into v_use_count, v_extra_credits
    from ai_usage
   where user_id    = p_user_id
     and action_type = p_action_type
     and target_key  = p_target_key;

  v_total_limit := v_base_limit + v_extra_credits;

  if v_use_count >= v_total_limit then
    return jsonb_build_object(
      'allowed',   false,
      'reason',    'countdown_exhausted',
      'remaining', 0
    );
  end if;

  update ai_usage
     set use_count = use_count + 1,
         updated_at = now()
   where user_id    = p_user_id
     and action_type = p_action_type
     and target_key  = p_target_key;

  v_remaining := greatest(0, v_total_limit - v_use_count - 1);

  return jsonb_build_object(
    'allowed',   true,
    'reason',    null,
    'remaining', v_remaining
  );
end;
$$;
