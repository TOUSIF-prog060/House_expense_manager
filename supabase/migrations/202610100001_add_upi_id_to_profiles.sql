-- Migration: 202610100001_add_upi_id_to_profiles.sql
-- Description: Add upi_id to profiles so members can share their UPI ID for settlements

alter table public.profiles
  add column if not exists upi_id text;

-- Allow authenticated users to update their own profile including upi_id
drop policy if exists profile_update_self on public.profiles;
create policy profile_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Security definer function for updating UPI ID
create or replace function public.set_my_upi_id(p_upi_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set upi_id = nullif(trim(p_upi_id), ''),
      updated_at = now()
  where id = auth.uid();
end;
$$;
