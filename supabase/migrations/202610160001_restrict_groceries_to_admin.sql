-- ============================================================================
-- Migration: Restrict Groceries expense upload/management to household admins
-- ============================================================================

-- 1. Helper function: check if category is Groceries
create or replace function public.is_grocery_category(p_category_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.expense_categories
    where id = p_category_id and lower(trim(name)) = 'groceries'
  );
$$;

-- 2. Update create_expense_with_shares to check admin access for Groceries
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

  -- Only household admin can create/upload grocery expenses
  if p_category_id is not null and public.is_grocery_category(p_category_id) then
    if not public.is_household_admin(p_household_id) then
      raise exception 'Only household admins can upload grocery expenses' using errcode='42501';
    end if;
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

-- 3. Update update_expense_with_shares to check admin access for Groceries
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

  -- Only household admin can edit grocery expenses
  if current_expense.category_id is not null and public.is_grocery_category(current_expense.category_id) then
    if not public.is_household_admin(current_expense.household_id) then
      raise exception 'Only household admins can edit grocery expenses' using errcode='42501';
    end if;
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

-- 4. Update delete_expense to check admin access for Groceries
create or replace function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_expense public.expenses%rowtype;
begin
  select * into current_expense from public.expenses where id = p_expense_id for update;
  if not found or not public.is_household_member(current_expense.household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;

  -- Only household admin can delete grocery expenses
  if current_expense.category_id is not null and public.is_grocery_category(current_expense.category_id) then
    if not public.is_household_admin(current_expense.household_id) then
      raise exception 'Only household admins can delete grocery expenses' using errcode='42501';
    end if;
  end if;

  if current_expense.created_by <> auth.uid() and not public.is_household_admin(current_expense.household_id) then
    raise exception 'Expense delete denied' using errcode='42501';
  end if;

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, auth.uid(), 'expense.deleted', 'expense', p_expense_id, jsonb_build_object('title', current_expense.title, 'amount', current_expense.amount));

  delete from public.expenses where id = p_expense_id;
end $$;
grant execute on function public.delete_expense to authenticated;

-- 5. Trigger to enforce admin-only on direct inserts/updates of grocery expenses
create or replace function public.check_grocery_expense_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  caller_user uuid;
begin
  caller_user := auth.uid();
  if caller_user is null then
    caller_user := new.created_by;
  end if;

  if new.category_id is not null and public.is_grocery_category(new.category_id) then
    if not exists (
      select 1 from public.household_members m
      where m.household_id = new.household_id
        and m.user_id = caller_user
        and m.status = 'active'
        and m.role = 'admin'
    ) then
      raise exception 'Only household admins can upload grocery expenses' using errcode='42501';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_check_grocery_expense on public.expenses;
create trigger trg_check_grocery_expense
  before insert or update on public.expenses
  for each row execute function public.check_grocery_expense_admin();

-- 6. Update receipt attachments policy to forbid non-admins from uploading receipts to grocery expenses
drop policy if exists attachments_insert on public.expense_attachments;
create policy attachments_insert on public.expense_attachments for insert to authenticated with check(
  uploaded_by = auth.uid()
  and public.is_household_member(household_id)
  and exists (
    select 1 from public.expenses e
    where e.id = expense_id
      and e.household_id = household_id
      and (
        case
          when public.is_grocery_category(e.category_id) then public.is_household_admin(household_id)
          else (e.created_by = auth.uid() or public.is_household_admin(household_id))
        end
      )
  )
);
