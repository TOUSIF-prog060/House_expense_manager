-- ============================================================================
-- Migration: Create Supplies Board Table, Policies, and Realtime publication
-- ============================================================================

-- 1. Create supplies table
create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 120),
  quantity text,
  category text not null default 'Groceries',
  notes text,
  is_purchased boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  purchased_by uuid references auth.users(id) on delete set null,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast retrieval
create index if not exists supplies_household_idx on public.supplies(household_id, is_purchased, created_at desc);
create index if not exists supplies_category_idx on public.supplies(household_id, category);

-- 3. Enable RLS
alter table public.supplies enable row level security;

-- 4. RLS Policies
drop policy if exists "Household members can view supplies" on public.supplies;
create policy "Household members can view supplies" on public.supplies
  for select using (public.is_household_member(household_id));

drop policy if exists "Household members can insert supplies" on public.supplies;
create policy "Household members can insert supplies" on public.supplies
  for insert with check (public.is_household_member(household_id));

drop policy if exists "Household members can update supplies" on public.supplies;
create policy "Household members can update supplies" on public.supplies
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "Household members can delete supplies" on public.supplies;
create policy "Household members can delete supplies" on public.supplies
  for delete using (public.is_household_member(household_id));

-- 5. Add to realtime publication if not already present
do $$
begin
  alter publication supabase_realtime add table public.supplies;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
