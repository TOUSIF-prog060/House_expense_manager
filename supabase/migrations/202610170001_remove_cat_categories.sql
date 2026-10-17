-- ============================================================================
-- Migration: Remove Cat Food, Cat Litter, and Cat Supplies from expense_categories
-- ============================================================================

do $$
declare
  other_cat_id uuid;
begin
  -- Find the 'Other' category if available to reassign any existing expenses
  select id into other_cat_id
  from public.expense_categories
  where lower(trim(name)) = 'other' and household_id is null
  limit 1;

  if other_cat_id is not null then
    update public.expenses
    set category_id = other_cat_id
    where category_id in (
      select id from public.expense_categories
      where lower(trim(name)) in ('cat food', 'cat litter', 'cat supplies')
    );
  else
    update public.expenses
    set category_id = null
    where category_id in (
      select id from public.expense_categories
      where lower(trim(name)) in ('cat food', 'cat litter', 'cat supplies')
    );
  end if;

  -- Delete the categories so they no longer appear
  delete from public.expense_categories
  where lower(trim(name)) in ('cat food', 'cat litter', 'cat supplies');
end $$;
