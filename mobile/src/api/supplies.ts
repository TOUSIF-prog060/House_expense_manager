import { supabase } from './supabase';
import type { SupplyItem } from '@ourhome/core';

export type SupplyWithProfiles = SupplyItem & {
  adder?: { display_name: string } | null;
  buyer?: { display_name: string } | null;
};

export async function fetchSupplies(householdId: string): Promise<SupplyWithProfiles[]> {
  const { data, error } = await supabase
    .from('supplies')
    .select(`
      *,
      adder:profiles!supplies_added_by_fkey(display_name),
      buyer:profiles!supplies_purchased_by_fkey(display_name)
    `)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as SupplyWithProfiles[]) ?? [];
}

export async function addSupplyItem(params: {
  householdId: string;
  name: string;
  quantity?: string | null;
  category: string;
  notes?: string | null;
  addedBy: string;
}): Promise<SupplyItem> {
  const { data, error } = await supabase
    .from('supplies')
    .insert({
      household_id: params.householdId,
      name: params.name.trim(),
      quantity: params.quantity?.trim() || null,
      category: params.category,
      notes: params.notes?.trim() || null,
      added_by: params.addedBy,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as SupplyItem;
}

export async function toggleSupplyPurchased(params: {
  id: string;
  isPurchased: boolean;
  userId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('supplies')
    .update({
      is_purchased: params.isPurchased,
      purchased_by: params.isPurchased ? params.userId : null,
      purchased_at: params.isPurchased ? new Date().toISOString() : null,
    })
    .eq('id', params.id);

  if (error) throw new Error(error.message);
}

export async function deleteSupplyItem(id: string): Promise<void> {
  const { error } = await supabase.from('supplies').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
