-- ============================================================================
-- Migration: Fix ambiguous "item" column reference in expense RPC functions
-- ============================================================================

-- 1. Fix: create_expense_with_shares
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
declare
  new_expense uuid;
  share_total numeric;
  elem jsonb;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;

  if p_paid_by is distinct from auth.uid() and not exists(
    select 1 from public.household_members
    where household_id = p_household_id and user_id = p_paid_by and status = 'active'
  ) then
    raise exception 'Invalid payer';
  end if;

  if length(trim(p_title)) not between 1 and 120 or p_amount <= 0 or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Invalid expense';
  end if;

  select coalesce(sum((s.value->>'share_amount')::numeric), 0) into share_total
  from jsonb_array_elements(p_shares) as s(value);

  if round(share_total, 2) <> round(p_amount, 2) then
    raise exception 'Shares must equal expense amount';
  end if;

  for elem in select value from jsonb_array_elements(p_shares) loop
    if not exists(
      select 1 from public.household_members
      where household_id = p_household_id and user_id = (elem->>'user_id')::uuid and status = 'active'
    ) then
      raise exception 'Invalid expense participant';
    end if;
  end loop;

  insert into public.expenses(household_id, title, amount, category_id, paid_by, created_by, expense_date, notes)
  values(p_household_id, trim(p_title), p_amount, p_category_id, p_paid_by, auth.uid(), p_expense_date, p_notes)
  returning id into new_expense;

  insert into public.expense_shares(expense_id, user_id, share_amount, share_percentage)
  select
    new_expense,
    (s.value->>'user_id')::uuid,
    (s.value->>'share_amount')::numeric,
    nullif(s.value->>'share_percentage', '')::numeric
  from jsonb_array_elements(p_shares) as s(value);

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(p_household_id, auth.uid(), 'expense.created', 'expense', new_expense, jsonb_build_object('title', trim(p_title), 'amount', p_amount));

  return new_expense;
end $$;
grant execute on function public.create_expense_with_shares to authenticated;

-- 2. Fix: update_expense_with_shares
create or replace function public.update_expense_with_shares(
  p_expense_id uuid,
  p_title text,
  p_amount numeric,
  p_expense_date date,
  p_notes text,
  p_shares jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  current_expense public.expenses%rowtype;
  share_total numeric;
  elem jsonb;
begin
  select * into current_expense from public.expenses where id = p_expense_id for update;

  if not found or not public.is_household_member(current_expense.household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;

  if current_expense.created_by <> auth.uid() and not public.is_household_admin(current_expense.household_id) then
    raise exception 'Expense edit denied' using errcode='42501';
  end if;

  if length(trim(p_title)) not between 1 and 120 or p_amount <= 0 or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Invalid expense';
  end if;

  select coalesce(sum((s.value->>'share_amount')::numeric), 0) into share_total
  from jsonb_array_elements(p_shares) as s(value);

  if round(share_total, 2) <> round(p_amount, 2) then
    raise exception 'Shares must equal expense amount';
  end if;

  for elem in select value from jsonb_array_elements(p_shares) loop
    if not exists(
      select 1 from public.household_members
      where household_id = current_expense.household_id and user_id = (elem->>'user_id')::uuid and status = 'active'
    ) then
      raise exception 'Invalid expense participant';
    end if;
  end loop;

  update public.expenses
  set title = trim(p_title), amount = p_amount, expense_date = p_expense_date, notes = p_notes, updated_at = now()
  where id = p_expense_id;

  delete from public.expense_shares where expense_id = p_expense_id;

  insert into public.expense_shares(expense_id, user_id, share_amount, share_percentage)
  select
    p_expense_id,
    (s.value->>'user_id')::uuid,
    (s.value->>'share_amount')::numeric,
    nullif(s.value->>'share_percentage', '')::numeric
  from jsonb_array_elements(p_shares) as s(value);

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, auth.uid(), 'expense.updated', 'expense', p_expense_id, jsonb_build_object('title', trim(p_title), 'old_amount', current_expense.amount, 'new_amount', p_amount));
end $$;
grant execute on function public.update_expense_with_shares to authenticated;
