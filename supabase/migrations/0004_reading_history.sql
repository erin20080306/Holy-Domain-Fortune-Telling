-- Persist paid deep reports so subscribers can reopen them across devices.
create table if not exists public.fortune_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_type usage_type not null,
  category text not null,
  title text not null,
  question text,
  content text not null check (char_length(content) <= 120000),
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_fortune_readings_user_created
  on public.fortune_readings(user_id, created_at desc);

alter table public.fortune_readings enable row level security;

drop policy if exists readings_select_own on public.fortune_readings;
create policy readings_select_own on public.fortune_readings
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists readings_delete_own on public.fortune_readings;
create policy readings_delete_own on public.fortune_readings
  for delete using (user_id = auth.uid() or public.is_admin());

grant all privileges on public.fortune_readings to service_role;

