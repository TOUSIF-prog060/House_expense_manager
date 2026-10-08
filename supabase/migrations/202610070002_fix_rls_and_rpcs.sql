-- ============================================================================
-- Fix: Make RPC functions SECURITY DEFINER & Add Missing RLS Policies
-- ============================================================================

-- 1. Cat feeding RPCs
create or replace function public.mark_cat_fed(
  p_household_id uuid,
  p_meal_slot_id uuid,
  p_feeding_date date,
  p_note text default null
) returns public.cat_feedings
language plpgsql security definer set search_path = '' as $$
declare result public.cat_feedings;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;
  if not exists(select 1 from public.meal_slots where id=p_meal_slot_id and household_id=p_household_id) then
    raise exception 'Invalid meal slot';
  end if;
  insert into public.cat_feedings(household_id, meal_slot_id, feeding_date, fed_by, note, feeding_type)
  values(p_household_id, p_meal_slot_id, p_feeding_date, auth.uid(), p_note, 'scheduled')
  returning * into result;

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
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;
  insert into public.cat_feedings(household_id, feeding_date, fed_by, note, feeding_type)
  values(p_household_id, (now() at time zone (select timezone from public.households where id=p_household_id))::date, auth.uid(), p_note, 'extra')
  returning * into result;

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id)
  values(p_household_id, auth.uid(), 'cat.extra_fed', 'cat_feeding', result.id);

  return result;
end $$;
grant execute on function public.record_extra_feeding to authenticated;

-- 2. Expense RPCs
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

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(p_household_id, auth.uid(), 'expense.created', 'expense', new_expense, jsonb_build_object('title', trim(p_title), 'amount', p_amount));

  return new_expense;
end $$;
grant execute on function public.create_expense_with_shares to authenticated;

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

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, auth.uid(), 'expense.updated', 'expense', p_expense_id, jsonb_build_object('title', trim(p_title), 'old_amount', current_expense.amount, 'new_amount', p_amount));
end $$;
grant execute on function public.update_expense_with_shares to authenticated;

create or replace function public.delete_expense(p_expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare current_expense public.expenses%rowtype;
begin
  select * into current_expense from public.expenses where id=p_expense_id for update;
  if not found or not public.is_household_member(current_expense.household_id) then raise exception 'Household access denied' using errcode='42501'; end if;
  if current_expense.created_by <> auth.uid() and not public.is_household_admin(current_expense.household_id) then raise exception 'Expense delete denied' using errcode='42501'; end if;
  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(current_expense.household_id, auth.uid(), 'expense.deleted', 'expense', p_expense_id, jsonb_build_object('title', current_expense.title, 'amount', current_expense.amount));
  delete from public.expenses where id=p_expense_id;
end $$;
grant execute on function public.delete_expense to authenticated;

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

-- 3. RLS Policies for cat_feedings and activity_events
drop policy if exists feedings_insert on public.cat_feedings;
create policy feedings_insert on public.cat_feedings for insert to authenticated
with check(public.is_household_member(household_id));

drop policy if exists feedings_delete on public.cat_feedings;
create policy feedings_delete on public.cat_feedings for delete to authenticated
using(public.is_household_member(household_id) and (fed_by = auth.uid() or public.is_household_admin(household_id)));

drop policy if exists activity_insert on public.activity_events;
create policy activity_insert on public.activity_events for insert to authenticated
with check(public.is_household_member(household_id));
