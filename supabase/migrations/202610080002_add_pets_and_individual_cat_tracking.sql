-- ============================================================================
-- Migration: Add Pets table and Individual Cat Meal Tracking
-- ============================================================================

-- 1. Create pets table
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 60),
  species text not null default 'cat',
  created_at timestamptz not null default now()
);

create index if not exists pets_household_idx on public.pets(household_id);

-- Enable RLS on pets
alter table public.pets enable row level security;

create policy "Household members can view pets" on public.pets
  for select using (public.is_household_member(household_id));

create policy "Household members can insert pets" on public.pets
  for insert with check (public.is_household_member(household_id));

create policy "Household members can update pets" on public.pets
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "Household members can delete pets" on public.pets
  for delete using (public.is_household_member(household_id));

-- 2. Add pet_id to cat_feedings
alter table public.cat_feedings
  add column if not exists pet_id uuid references public.pets(id) on delete cascade;

create index if not exists cat_feedings_pet_idx on public.cat_feedings(pet_id);

-- 3. Replace single-feeding constraint with per-pet constraint
drop index if exists public.cat_feedings_scheduled_unique;

create unique index if not exists cat_feedings_scheduled_pet_unique
  on public.cat_feedings(household_id, feeding_date, meal_slot_id, pet_id)
  where feeding_type = 'scheduled' and pet_id is not null;

create unique index if not exists cat_feedings_scheduled_legacy_unique
  on public.cat_feedings(household_id, feeding_date, meal_slot_id)
  where feeding_type = 'scheduled' and pet_id is null;

-- 4. Drop older function signatures to avoid PostgreSQL overload ambiguity
drop function if exists public.mark_cat_fed(uuid, uuid, date, text);
drop function if exists public.mark_cat_fed(uuid, uuid, date, text, uuid);

create or replace function public.mark_cat_fed(
  p_household_id uuid,
  p_meal_slot_id uuid,
  p_feeding_date date,
  p_note text default null,
  p_pet_id uuid default null
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
  if p_pet_id is not null and not exists(select 1 from public.pets where id=p_pet_id and household_id=p_household_id) then
    raise exception 'Invalid pet';
  end if;

  insert into public.cat_feedings(household_id, meal_slot_id, feeding_date, fed_by, note, feeding_type, pet_id)
  values(p_household_id, p_meal_slot_id, p_feeding_date, auth.uid(), p_note, 'scheduled', p_pet_id)
  returning * into result;

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(
    p_household_id,
    auth.uid(),
    'cat.fed',
    'cat_feeding',
    result.id,
    jsonb_build_object(
      'meal_slot_id', p_meal_slot_id,
      'feeding_date', p_feeding_date,
      'pet_id', p_pet_id
    )
  );

  return result;
exception when unique_violation then
  raise exception 'This meal has already been recorded' using errcode='23505';
end $$;
grant execute on function public.mark_cat_fed(uuid, uuid, date, text, uuid) to authenticated;

-- 5. Drop and recreate record_extra_feeding
drop function if exists public.record_extra_feeding(uuid, text);
drop function if exists public.record_extra_feeding(uuid, text, uuid);

create or replace function public.record_extra_feeding(
  p_household_id uuid,
  p_note text default null,
  p_pet_id uuid default null
) returns public.cat_feedings
language plpgsql security definer set search_path = '' as $$
declare result public.cat_feedings;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'Household access denied' using errcode='42501';
  end if;
  if p_pet_id is not null and not exists(select 1 from public.pets where id=p_pet_id and household_id=p_household_id) then
    raise exception 'Invalid pet';
  end if;

  insert into public.cat_feedings(household_id, feeding_date, fed_by, note, feeding_type, pet_id)
  values(
    p_household_id,
    (now() at time zone (select timezone from public.households where id=p_household_id))::date,
    auth.uid(),
    p_note,
    'extra',
    p_pet_id
  )
  returning * into result;

  insert into public.activity_events(household_id, actor, event_type, entity_type, entity_id, metadata)
  values(
    p_household_id,
    auth.uid(),
    'cat.extra_fed',
    'cat_feeding',
    result.id,
    jsonb_build_object('pet_id', p_pet_id)
  );

  return result;
end $$;
grant execute on function public.record_extra_feeding(uuid, text, uuid) to authenticated;
