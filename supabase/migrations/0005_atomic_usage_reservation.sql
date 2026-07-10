-- Reserve quota atomically before an AI request so concurrent calls cannot
-- all pass the same stale usage check. Failed generations release the slot.
create or replace function public.reserve_usage_counter(
  p_user_id uuid,
  p_month text,
  p_plan plan_id,
  p_column text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved boolean;
begin
  if p_column not in (
    'free_ai_count','premium_report_count','premium_chat_count',
    'tarot_draw_count','bazi_count','ziwei_count'
  ) then
    raise exception 'invalid usage column %', p_column;
  end if;
  if p_limit <= 0 then
    return false;
  end if;

  insert into public.user_usage_quotas (user_id, usage_month_taipei, plan)
  values (p_user_id, p_month, p_plan)
  on conflict (user_id, usage_month_taipei) do nothing;

  execute format(
    'update public.user_usage_quotas
     set %I = %I + 1, updated_at = now()
     where user_id = $1 and usage_month_taipei = $2 and %I < $3
     returning true',
    p_column, p_column, p_column
  ) into reserved using p_user_id, p_month, p_limit;

  return coalesce(reserved, false);
end;
$$;

create or replace function public.release_usage_counter(
  p_user_id uuid,
  p_month text,
  p_column text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_column not in (
    'free_ai_count','premium_report_count','premium_chat_count',
    'tarot_draw_count','bazi_count','ziwei_count'
  ) then
    raise exception 'invalid usage column %', p_column;
  end if;

  execute format(
    'update public.user_usage_quotas
     set %I = greatest(%I - 1, 0), updated_at = now()
     where user_id = $1 and usage_month_taipei = $2',
    p_column, p_column
  ) using p_user_id, p_month;
end;
$$;

revoke all on function public.reserve_usage_counter(uuid, text, plan_id, text, integer)
  from public, anon, authenticated;
revoke all on function public.release_usage_counter(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_usage_counter(uuid, text, plan_id, text, integer)
  to service_role;
grant execute on function public.release_usage_counter(uuid, text, text)
  to service_role;

