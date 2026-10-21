import { supabase } from './supabase';
import type { Database, Household, Member } from '@ourhome/core';

export async function createHousehold(name: string, timezone: string = 'Asia/Kolkata'): Promise<string> {
  const { data, error } = await supabase.rpc('create_household', {
    p_name: name.trim(),
    p_timezone: timezone,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function createHouseholdInvite(householdId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_household_invite', {
    p_household_id: householdId,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function joinHousehold(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_household', {
    p_code: code.trim(),
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function leaveHousehold(householdId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_household', {
    p_household_id: householdId,
  });

  if (error) throw new Error(error.message);
}

export async function setMyUpiId(upiId: string): Promise<void> {
  const { error } = await supabase.rpc('set_my_upi_id', {
    p_upi_id: upiId.trim(),
  });

  if (error) throw new Error(error.message);
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
