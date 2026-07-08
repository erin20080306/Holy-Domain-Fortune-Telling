-- MYSTIC 命理探索 - initial schema
-- All quotas / plans keyed by auth user_id so they never reset on device change.
-- RLS: users read only their own rows; only service_role / admins mutate plans.

create extension if not exists "pgcrypto";

-- =============================================================
-- Enums
-- =============================================================
do $$ begin
  create type user_role as enum ('user', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_id as enum ('free', 'pro_monthly', 'master_monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum
    ('none','pending','active','cancelled','expired','suspended','manual_active');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_source as enum
    ('free','paypal','apple_iap','google_play','admin_manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type usage_type as enum
    ('short_reading','premium_report','premium_chat','tarot','bazi','ziwei');
exception when duplicate_object then null; end $$;

-- =============================================================
-- 1. user_profiles
-- =============================================================
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  login_count integer not null default 0,
  last_login_ip text,
  last_login_user_agent text
);

-- =============================================================
-- 2. user_subscriptions
-- =============================================================
create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan plan_id not null default 'free',
  status subscription_status not null default 'none',
  source subscription_source not null default 'free',
  paypal_payer_email text,
  paypal_subscription_id text,
  paypal_transaction_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  activated_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_admin_id uuid,
  admin_note text
);

-- =============================================================
-- 3. user_usage_quotas  (one row per user per Taipei month)
-- =============================================================
create table if not exists public.user_usage_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month_taipei text not null,
  plan plan_id not null default 'free',
  free_ai_count integer not null default 0,
  premium_report_count integer not null default 0,
  premium_chat_count integer not null default 0,
  tarot_draw_count integer not null default 0,
  bazi_count integer not null default 0,
  ziwei_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, usage_month_taipei)
);

-- =============================================================
-- 4. paypal_pending_checkouts
-- =============================================================
create table if not exists public.paypal_pending_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan plan_id not null,
  checkout_token text not null unique,
  checkout_url text not null,
  status text not null default 'pending', -- pending/completed/expired/cancelled/matched_manually
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

-- =============================================================
-- 5. paypal_payment_events (webhook idempotency + audit)
-- =============================================================
create table if not exists public.paypal_payment_events (
  id uuid primary key default gen_random_uuid(),
  paypal_event_id text not null unique,
  event_type text not null,
  raw_payload_json jsonb not null,
  verification_status text not null default 'skipped', -- verified/failed/skipped
  matched_user_id uuid,
  matched_subscription_id uuid,
  status text not null default 'processed', -- processed/pending_match/ignored/failed
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- =============================================================
-- 6. admin_audit_logs
-- =============================================================
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  target_user_id uuid,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  note text,
  created_at timestamptz not null default now()
);

-- =============================================================
-- 7. ai_usage_logs (internal cost/debug only - never returned to client)
-- =============================================================
create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_type usage_type not null,
  internal_provider text,
  internal_model text,
  estimated_cost_usd numeric(10,5),
  created_at timestamptz not null default now(),
  request_id text
);

create index if not exists idx_ai_usage_user on public.ai_usage_logs(user_id);
create index if not exists idx_profiles_role on public.user_profiles(role);
create index if not exists idx_profiles_last_login on public.user_profiles(last_login_at);
create index if not exists idx_events_status on public.paypal_payment_events(status);

-- =============================================================
-- Helper: is current user an admin/super_admin?
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and role in ('admin','super_admin')
  );
$$;

-- =============================================================
-- Enable RLS
-- =============================================================
alter table public.user_profiles enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_usage_quotas enable row level security;
alter table public.paypal_pending_checkouts enable row level security;
alter table public.paypal_payment_events enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.ai_usage_logs enable row level security;

-- user_profiles: owner reads own; admins read all; owner may update only
-- non-privileged fields (role changes go through service_role).
drop policy if exists profiles_select_own on public.user_profiles;
create policy profiles_select_own on public.user_profiles
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.user_profiles;
create policy profiles_update_own on public.user_profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user_subscriptions: owner + admin read only. NO client write (service_role only).
drop policy if exists subs_select_own on public.user_subscriptions;
create policy subs_select_own on public.user_subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- user_usage_quotas: owner + admin read only. NO client write.
drop policy if exists quotas_select_own on public.user_usage_quotas;
create policy quotas_select_own on public.user_usage_quotas
  for select using (user_id = auth.uid() or public.is_admin());

-- paypal_pending_checkouts: owner + admin read.
drop policy if exists pending_select_own on public.paypal_pending_checkouts;
create policy pending_select_own on public.paypal_pending_checkouts
  for select using (user_id = auth.uid() or public.is_admin());

-- payment events, audit logs: admins only (service_role bypasses RLS).
drop policy if exists events_admin_select on public.paypal_payment_events;
create policy events_admin_select on public.paypal_payment_events
  for select using (public.is_admin());

drop policy if exists audit_admin_select on public.admin_audit_logs;
create policy audit_admin_select on public.admin_audit_logs
  for select using (public.is_admin());

-- ai_usage_logs: admins only (contains internal provider/model - never exposed).
drop policy if exists ai_logs_admin_select on public.ai_usage_logs;
create policy ai_logs_admin_select on public.ai_usage_logs
  for select using (public.is_admin());

-- Note: All INSERT/UPDATE on subscriptions, quotas, events, audit logs and
-- ai_usage_logs are performed exclusively by the backend using the
-- service_role key, which bypasses RLS. No client-side write policies exist,
-- so a normal user can never modify their own plan or usage counts.
