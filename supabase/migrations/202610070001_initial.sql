create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum ('admin', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type public.member_status as enum ('active', 'invited', 'removed');
  end if;
  if not exists (select 1 from pg_type where typname = 'feeding_type') then
    create type public.feeding_type as enum ('scheduled', 'extra');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('recorded', 'confirmed');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  created_by uuid not null references auth.users(id),
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id, household_id) where status = 'active';

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  name text not null,
  icon text not null default 'receipt',
  is_pet boolean not null default false,
  unique nulls not distinct (household_id, name)
);

insert into public.expense_categories(household_id, name, icon, is_pet) values
  (null,'Rent','house',false),
  (null,'Groceries','shopping-basket',false),
  (null,'Electricity','zap',false),
  (null,'Water','droplets',false),
  (null,'Internet','wifi',false),
  (null,'Gas','flame',false),
  (null,'Maid','sparkles',false),
  (null,'Household','house',false),
  (null,'Transport','car',false),
  (null,'Food','utensils',false),
  (null,'Cat Food','cat',true),
  (null,'Cat Litter','cat',true),
  (null,'Cat Vet','heart-pulse',true),
  (null,'Cat Medicine','pill',true),
  (null,'Cat Supplies','paw-print',true),
  (null,'Other','circle-ellipsis',false)
on conflict do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120),
  amount numeric(12,2) not null check(amount > 0),
  category_id uuid references public.expense_categories(id) on delete set null,
  paid_by uuid not null references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_household_date_idx on public.expenses(household_id, expense_date desc);
create index if not exists expenses_paid_by_idx on public.expenses(paid_by, household_id);

create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  share_amount numeric(12,2) not null check(share_amount >= 0),
  share_percentage numeric(7,4),
  unique(expense_id, user_id)
);
create index if not exists expense_shares_user_idx on public.expense_shares(user_id, expense_id);

create table if not exists public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  object_path text not null unique,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size bigint not null check(file_size between 1 and 10485760),
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_user uuid not null references auth.users(id),
  to_user uuid not null references auth.users(id),
  amount numeric(12,2) not null check(amount > 0),
  payment_method text not null check(payment_method in ('upi','cash','bank_transfer','other')),
  payment_date date not null default current_date,
  status public.payment_status not null default 'recorded',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  check(from_user <> to_user)
);
create index if not exists payments_household_date_idx on public.payments(household_id, payment_date desc);

create table if not exists public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 40),
  display_order int not null default 0,
  reminder_enabled boolean not null default false,
  reminder_time time,
  created_at timestamptz not null default now(),
  unique(household_id, name)
);

create table if not exists public.cat_feedings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  meal_slot_id uuid references public.meal_slots(id) on delete set null,
  feeding_date date not null,
  fed_by uuid not null default auth.uid() references auth.users(id),
  fed_at timestamptz not null default now(),
  note text,
  feeding_type public.feeding_type not null default 'scheduled'
);
create unique index if not exists cat_feedings_scheduled_unique on public.cat_feedings(household_id, feeding_date, meal_slot_id)
  where feeding_type = 'scheduled';
create index if not exists cat_feedings_date_idx on public.cat_feedings(household_id, feeding_date desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  is_active boolean not null default true,
  expense_enabled boolean not null default true,
  cat_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, household_id, endpoint)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  entity_id uuid,
  entity_type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor uuid not null default auth.uid() references auth.users(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
create or replace function public.is_household_member(household uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members m where m.household_id = household and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.is_household_admin(household uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members m where m.household_id = household and m.user_id = auth.uid() and m.status = 'active' and m.role = 'admin');
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_admin(uuid) from public;
grant execute on function public.is_household_member(uuid), public.is_household_admin(uuid) to authenticated;

-- User Profile Trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill profile for any existing users
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', '')
from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- RPC: create_household
-- ============================================================================
create or replace function public.create_household(p_name text, p_timezone text default 'Asia/Kolkata') returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_household uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(p_name)) not between 1 and 80 then raise exception 'Household name must be 1 to 80 characters'; end if;
  insert into public.households(name, created_by, timezone)
  values(trim(p_name), auth.uid(), coalesce(nullif(p_timezone, ''), 'Asia/Kolkata'))
  returning id into new_household;

  insert into public.household_members(household_id, user_id, role)
  values(new_household, auth.uid(), 'admin');

  insert into public.meal_slots(household_id, name, display_order)
  values(new_household, 'Morning', 1), (new_household, 'Afternoon', 2), (new_household, 'Evening', 3);

  return new_household;
end $$;
grant execute on function public.create_household to authenticated;

-- ============================================================================
-- RPC: create_household_invite & join_household
-- ============================================================================
create or replace function public.create_household_invite(p_household_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare invite_code text := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
begin
  if not public.is_household_admin(p_household_id) then raise exception 'Household admin required'; end if;
  insert into public.household_invites(household_id, code_hash, created_by, expires_at)
  values(p_household_id, encode(extensions.digest(invite_code, 'sha256'), 'hex'), auth.uid(), now() + interval '7 days');
  return invite_code;
end $$;

create or replace function public.join_household(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invite public.household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into invite from public.household_invites
  where code_hash = encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex') and used_at is null and expires_at > now()
  for update;

  if not found then raise exception 'Invite code is invalid or expired'; end if;

  insert into public.household_members(household_id, user_id, role, status)
  values(invite.household_id, auth.uid(), 'member', 'active')
  on conflict(household_id, user_id) do update set status = 'active';

  update public.household_invites set used_at = now(), used_by = auth.uid() where id = invite.id;
  return invite.household_id;
end $$;
grant execute on function public.create_household_invite to authenticated;
grant execute on function public.join_household to authenticated;

-- ============================================================================
-- RPC: create_expense_with_shares
-- ============================================================================
create or replace function public.create_expense_with_shares(
  p_household_id uuid,
  p_title text,
  p_amount numeric,
  p_category_id uuid,
  p_paid_by uuid,
  p_expense_date date,
  p_notes text,
  p_shares jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_expense uuid; share_total numeric; item jsonb;
begin
  if not public.is_household_member(p_household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if p_paid_by is distinct from auth.uid() and not exists(select 1 from public.household_members where household_id=p_household_id and user_id=p_paid_by and status='active') then
    raise exception 'Invalid payer';
  end if;
  if length(trim(p_title)) not between 1 and 120 or p_amount <= 0 or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Invalid expense';
  end if;
  select coalesce(sum((value->>'share_amount')::numeric), 0) into share_total from jsonb_array_elements(p_shares);
  if round(share_total, 2) <> round(p_amount, 2) then raise exception 'Shares must equal expense amount'; end if;
  for item in select value from jsonb_array_elements(p_shares) loop
    if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=(item->>'user_id')::uuid and status='active') then
      raise exception 'Invalid expense participant';
    end if;
  end loop;

  insert into public.expenses(household_id, title, amount, category_id, paid_by, created_by, expense_date, notes)
  values(p_household_id, trim(p_title), p_amount, p_category_id, p_paid_by, auth.uid(), p_expense_date, p_notes)
  returning id into new_expense;

  insert into public.expense_shares(expense_id, user_id, share_amount, share_percentage)
  select new_expense, (s.value->>'user_id')::uuid, (s.value->>'share_amount')::numeric, nullif(s.value->>'share_percentage', '')::numeric
  from jsonb_array_elements(p_shares) as s(value);

  insert into public.activity_events(household_id, event_type, entity_type, entity_id, metadata)
  values(p_household_id, 'expense.created', 'expense', new_expense, jsonb_build_object('title', trim(p_title), 'amount', p_amount));

  return new_expense;
end $$;
grant execute on function public.create_expense_with_shares to authenticated;

-- ============================================================================
-- RPC: update_expense_with_shares
-- ============================================================================
create or replace function public.update_expense_with_shares(
  p_expense_id uuid,
  p_title text,
  p_amount numeric,
  p_expense_date date,
  p_notes text,
  p_shares jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses%rowtype; share_total numeric; item jsonb;
begin
  select * into current_expense from public.expenses where id=p_expense_id for update;
  if not found or not public.is_household_member(current_expense.household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if current_expense.created_by <> auth.uid() and not public.is_household_admin(current_expense.household_id) then raise exception 'Expense edit denied' using errcode='42501'; end if;
  if length(trim(p_title)) not between 1 and 120 or p_amount <= 0 or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then raise exception 'Invalid expense'; end if;
  select coalesce(sum((value->>'share_amount')::numeric), 0) into share_total from jsonb_array_elements(p_shares);
  if round(share_total, 2) <> round(p_amount, 2) then raise exception 'Shares must equal expense amount'; end if;
  for item in select value from jsonb_array_elements(p_shares) loop
    if not exists(select 1 from public.household_members where household_id=current_expense.household_id and user_id=(item->>'user_id')::uuid and status='active') then raise exception 'Invalid expense participant'; end if;
  end loop;

  update public.expenses set title=trim(p_title), amount=p_amount, expense_date=p_expense_date, notes=p_notes, updated_at=now() where id=p_expense_id;
  delete from public.expense_shares where expense_id=p_expense_id;

  insert into public.expense_shares(expense_id, user_id, share_amount, share_percentage)
  select p_expense_id, (s.value->>'user_id')::uuid, (s.value->>'share_amount')::numeric, nullif(s.value->>'share_percentage', '')::numeric
  from jsonb_array_elements(p_shares) as s(value);

  insert into public.activity_events(household_id, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, 'expense.updated', 'expense', p_expense_id, jsonb_build_object('title', trim(p_title), 'old_amount', current_expense.amount, 'new_amount', p_amount));
end $$;
grant execute on function public.update_expense_with_shares to authenticated;

-- ============================================================================
-- RPC: delete_expense
-- ============================================================================
create or replace function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses%rowtype;
begin
  select * into current_expense from public.expenses where id=p_expense_id for update;
  if not found or not public.is_household_member(current_expense.household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if current_expense.created_by <> auth.uid() and not public.is_household_admin(current_expense.household_id) then raise exception 'Expense delete denied' using errcode='42501'; end if;
  insert into public.activity_events(household_id, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, 'expense.deleted', 'expense', p_expense_id, jsonb_build_object('title', current_expense.title, 'amount', current_expense.amount));
  delete from public.expenses where id=p_expense_id;
end $$;
grant execute on function public.delete_expense to authenticated;

-- ============================================================================
-- RPC: mark_cat_fed & record_extra_feeding
-- ============================================================================
create or replace function public.mark_cat_fed(p_household_id uuid, p_meal_slot_id uuid, p_feeding_date date, p_note text default null) returns public.cat_feedings
language plpgsql security definer set search_path = '' as $$
declare result public.cat_feedings;
begin
  if not public.is_household_member(p_household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if not exists(select 1 from public.meal_slots where id=p_meal_slot_id and household_id=p_household_id) then raise exception 'Invalid meal slot'; end if;
  insert into public.cat_feedings(household_id, meal_slot_id, feeding_date, fed_by, note, feeding_type)
  values(p_household_id, p_meal_slot_id, p_feeding_date, auth.uid(), p_note, 'scheduled') returning * into result;
  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(p_household_id, auth.uid(), 'cat.fed', 'cat_feeding', result.id, jsonb_build_object('meal_slot_id', p_meal_slot_id, 'feeding_date', p_feeding_date));
  return result;
exception when unique_violation then
  raise exception 'This meal has already been recorded' using errcode='23505';
end $$;
grant execute on function public.mark_cat_fed to authenticated;

create or replace function public.record_extra_feeding(p_household_id uuid, p_note text default null) returns public.cat_feedings
language plpgsql security definer set search_path = '' as $$
declare result public.cat_feedings;
begin
  if not public.is_household_member(p_household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  insert into public.cat_feedings(household_id, feeding_date, fed_by, note, feeding_type)
  values(p_household_id, (now() at time zone (select timezone from public.households where id=p_household_id))::date, auth.uid(), p_note, 'extra')
  returning * into result;
  insert into public.activity_events(household_id, event_type, entity_type, entity_id)
  values(p_household_id, 'cat.extra_fed', 'cat_feeding', result.id);
  return result;
end $$;
grant execute on function public.record_extra_feeding to authenticated;

-- ============================================================================
-- RPC: leave_household
-- ============================================================================
create or replace function public.leave_household(p_household_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.household_members
  set status = 'removed'
  where household_id = p_household_id and user_id = auth.uid();
  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id)
  values(p_household_id, auth.uid(), 'member.left', 'household_member', auth.uid());
end $$;
grant execute on function public.leave_household to authenticated;

-- ============================================================================
-- RPC: record_payment
-- ============================================================================
create or replace function public.record_payment(
  p_household_id uuid,
  p_to_user uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date default current_date,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_payment uuid;
begin
  if not public.is_household_member(p_household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if not exists(select 1 from public.household_members where household_id = p_household_id and user_id = p_to_user and status = 'active') then
    raise exception 'Invalid recipient';
  end if;
  if auth.uid() = p_to_user then raise exception 'Cannot pay yourself'; end if;
  if p_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  insert into public.payments(household_id, from_user, to_user, amount, payment_method, payment_date, notes, created_by, status)
  values(p_household_id, auth.uid(), p_to_user, p_amount, p_payment_method, p_payment_date, p_notes, auth.uid(), 'recorded')
  returning id into new_payment;

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(p_household_id, auth.uid(), 'payment.recorded', 'payment', new_payment, jsonb_build_object('amount', p_amount, 'to_user', p_to_user));

  return new_payment;
end $$;
grant execute on function public.record_payment to authenticated;

-- ============================================================================
-- TRIGGERS: set_updated_at
-- ============================================================================
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists households_updated_at on public.households;
create trigger households_updated_at before update on public.households for each row execute function public.set_updated_at();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
do $$ declare t text; begin
  foreach t in array array['profiles','households','household_members','household_invites','expense_categories','expenses','expense_shares','expense_attachments','payments','meal_slots','cat_feedings','push_subscriptions','notifications','activity_events'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Drop existing policies if any to ensure clean re-runs
drop policy if exists profile_select_household on public.profiles;
create policy profile_select_household on public.profiles for select to authenticated using (id=auth.uid() or exists(select 1 from public.household_members mine join public.household_members theirs using(household_id) where mine.user_id=auth.uid() and mine.status='active' and theirs.user_id=profiles.id and theirs.status='active'));

drop policy if exists profile_update_self on public.profiles;
create policy profile_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists household_member_read on public.households;
create policy household_member_read on public.households for select to authenticated using(public.is_household_member(id));

drop policy if exists household_create_self on public.households;
create policy household_create_self on public.households for insert to authenticated with check(created_by=auth.uid());

drop policy if exists household_admin_update on public.households;
create policy household_admin_update on public.households for update to authenticated using(public.is_household_admin(id)) with check(public.is_household_admin(id));

drop policy if exists membership_read on public.household_members;
create policy membership_read on public.household_members for select to authenticated using(public.is_household_member(household_id));

drop policy if exists membership_admin_update on public.household_members;
create policy membership_admin_update on public.household_members for update to authenticated using(public.is_household_admin(household_id)) with check(public.is_household_admin(household_id));

drop policy if exists invites_admin_read on public.household_invites;
create policy invites_admin_read on public.household_invites for select to authenticated using(public.is_household_admin(household_id));

drop policy if exists categories_read on public.expense_categories;
create policy categories_read on public.expense_categories for select to authenticated using(household_id is null or public.is_household_member(household_id));

drop policy if exists categories_admin_write on public.expense_categories;
create policy categories_admin_write on public.expense_categories for all to authenticated using(household_id is not null and public.is_household_admin(household_id)) with check(household_id is not null and public.is_household_admin(household_id));

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select to authenticated using(public.is_household_member(household_id));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated with check(public.is_household_member(household_id) and created_by=auth.uid());

drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated using(public.is_household_member(household_id) and (created_by=auth.uid() or public.is_household_admin(household_id))) with check(public.is_household_member(household_id));

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated using(public.is_household_member(household_id) and (created_by=auth.uid() or public.is_household_admin(household_id)));

drop policy if exists shares_read on public.expense_shares;
create policy shares_read on public.expense_shares for select to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id and public.is_household_member(e.household_id)));

drop policy if exists shares_insert on public.expense_shares;
create policy shares_insert on public.expense_shares for insert to authenticated with check(exists(select 1 from public.expenses e where e.id=expense_id and public.is_household_member(e.household_id) and (select count(*) from public.household_members m where m.household_id=e.household_id and m.user_id=user_id and m.status='active')=1));

drop policy if exists shares_delete on public.expense_shares;
create policy shares_delete on public.expense_shares for delete to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id and public.is_household_member(e.household_id) and (e.created_by=auth.uid() or public.is_household_admin(e.household_id))));

drop policy if exists attachments_read on public.expense_attachments;
create policy attachments_read on public.expense_attachments for select to authenticated using(public.is_household_member(household_id) and exists(select 1 from public.expenses e where e.id=expense_id and e.household_id=household_id));

drop policy if exists attachments_insert on public.expense_attachments;
create policy attachments_insert on public.expense_attachments for insert to authenticated with check(uploaded_by=auth.uid() and public.is_household_member(household_id) and exists(select 1 from public.expenses e where e.id=expense_id and e.household_id=household_id and (e.created_by=auth.uid() or public.is_household_admin(household_id))));

drop policy if exists attachments_delete on public.expense_attachments;
create policy attachments_delete on public.expense_attachments for delete to authenticated using(public.is_household_member(household_id) and exists(select 1 from public.expenses e where e.id=expense_id and e.household_id=household_id and (e.created_by=auth.uid() or public.is_household_admin(household_id))));

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated using(public.is_household_member(household_id));

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated with check(public.is_household_member(household_id) and created_by=auth.uid() and exists(select 1 from public.household_members where household_id=payments.household_id and user_id=payments.from_user and status='active') and exists(select 1 from public.household_members where household_id=payments.household_id and user_id=payments.to_user and status='active'));

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated using(public.is_household_member(household_id) and (created_by=auth.uid() or to_user=auth.uid()));

drop policy if exists meal_slots_read on public.meal_slots;
create policy meal_slots_read on public.meal_slots for select to authenticated using(public.is_household_member(household_id));

drop policy if exists meal_slots_admin_write on public.meal_slots;
create policy meal_slots_admin_write on public.meal_slots for all to authenticated using(public.is_household_admin(household_id)) with check(public.is_household_admin(household_id));

drop policy if exists feedings_read on public.cat_feedings;
create policy feedings_read on public.cat_feedings for select to authenticated using(public.is_household_member(household_id));

drop policy if exists feedings_insert on public.cat_feedings;
create policy feedings_insert on public.cat_feedings for insert to authenticated with check(public.is_household_member(household_id));

drop policy if exists feedings_delete on public.cat_feedings;
create policy feedings_delete on public.cat_feedings for delete to authenticated using(public.is_household_member(household_id) and (fed_by = auth.uid() or public.is_household_admin(household_id)));

drop policy if exists subscriptions_self on public.push_subscriptions;
create policy subscriptions_self on public.push_subscriptions for all to authenticated using(user_id=auth.uid() and public.is_household_member(household_id)) with check(user_id=auth.uid() and public.is_household_member(household_id));

drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications for select to authenticated using(user_id=auth.uid() and public.is_household_member(household_id));

drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications for update to authenticated using(user_id=auth.uid() and public.is_household_member(household_id)) with check(user_id=auth.uid() and public.is_household_member(household_id));

drop policy if exists activity_read on public.activity_events;
create policy activity_read on public.activity_events for select to authenticated using(public.is_household_member(household_id));

drop policy if exists activity_insert on public.activity_events;
create policy activity_insert on public.activity_events for insert to authenticated with check(public.is_household_member(household_id));

-- ============================================================================
-- STORAGE: receipts bucket and RLS policies
-- ============================================================================
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;

drop policy if exists receipt_members_read on storage.objects;
create policy receipt_members_read on storage.objects for select to authenticated
using(bucket_id='receipts' and public.is_household_member((storage.foldername(name))[1]::uuid));

drop policy if exists receipt_members_upload on storage.objects;
create policy receipt_members_upload on storage.objects for insert to authenticated
with check(bucket_id='receipts' and public.is_household_member((storage.foldername(name))[1]::uuid));

drop policy if exists receipt_owner_delete on storage.objects;
create policy receipt_owner_delete on storage.objects for delete to authenticated
using(bucket_id='receipts' and owner_id=auth.uid()::text and public.is_household_member((storage.foldername(name))[1]::uuid));

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
do $$ begin
  begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.expense_shares; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.cat_feedings; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.payments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.activity_events; exception when duplicate_object then null; end;
end $$;
