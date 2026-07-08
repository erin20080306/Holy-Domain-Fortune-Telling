-- Atomic usage counter increment. Column name is validated against an allowlist
-- to prevent injection. Runs as service_role from the backend only.
create or replace function public.increment_usage_counter(
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

  insert into public.user_usage_quotas (user_id, usage_month_taipei)
  values (p_user_id, p_month)
  on conflict (user_id, usage_month_taipei) do nothing;

  execute format(
    'update public.user_usage_quotas set %I = %I + 1, updated_at = now()
     where user_id = $1 and usage_month_taipei = $2',
    p_column, p_column
  ) using p_user_id, p_month;
end;
$$;

-- Aggregate: total login count across all users (admin dashboard KPI).
create or replace function public.total_login_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(login_count), 0)::bigint from public.user_profiles;
$$;

-- Login tracking: increment login_count + timestamps atomically.
create or replace function public.record_login(
  p_user_id uuid,
  p_ip text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set login_count = login_count + 1,
      last_login_at = now(),
      last_login_ip = p_ip,
      last_login_user_agent = p_user_agent,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;
