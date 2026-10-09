-- Migration: 202610090001_push_subscriptions_update.sql
-- Description: Modernize push_subscriptions schema for multi-device Web Push support

do $$
begin
  -- Make household_id nullable to support user-level subscriptions across devices
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'push_subscriptions' and column_name = 'household_id' and is_nullable = 'NO'
  ) then
    alter table public.push_subscriptions alter column household_id drop not null;
  end if;
end $$;

-- Add device metadata and last_used_at columns
alter table public.push_subscriptions
  add column if not exists user_agent text,
  add column if not exists device_type text,
  add column if not exists last_used_at timestamptz default now();

-- Ensure unique constraint on endpoint
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_endpoint_key'
  ) then
    -- Drop old composite constraint if it exists
    alter table public.push_subscriptions drop constraint if exists push_subscriptions_user_id_household_id_endpoint_key;
    -- Add unique constraint on endpoint
    alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key unique (endpoint);
  end if;
exception when others then
  null;
end $$;

-- Indexes for efficient lookup
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_active_idx on public.push_subscriptions(user_id, is_active);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies allowing authenticated users to manage their own push subscriptions
drop policy if exists subscriptions_self on public.push_subscriptions;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());
