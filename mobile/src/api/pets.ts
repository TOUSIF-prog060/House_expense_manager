import { supabase } from './supabase';
import type { MealSlot, Pet, CatFeeding } from '@ourhome/core';

export type FeedingWithDetails = CatFeeding & {
  feeder?: { display_name: string; avatar_url: string | null };
  meal_slot?: { name: string };
  pet?: { name: string };
};

export async function fetchPets(householdId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Pet[]) ?? [];
}

export async function fetchMealSlots(householdId: string): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from('meal_slots')
    .select('*')
    .eq('household_id', householdId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as MealSlot[]) ?? [];
}

export async function fetchFeedings(householdId: string, date: string): Promise<FeedingWithDetails[]> {
  const { data, error } = await supabase
    .from('cat_feedings')
    .select(`
      *,
      feeder:profiles!cat_feedings_fed_by_fkey(display_name, avatar_url),
      meal_slot:meal_slots(name),
      pet:pets(name)
    `)
    .eq('household_id', householdId)
    .eq('feeding_date', date)
    .order('fed_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as unknown as FeedingWithDetails[]) ?? [];
}

export async function markCatFed(params: {
  householdId: string;
  mealSlotId: string;
  feedingDate: string;
  petId?: string;
  note?: string;
}): Promise<CatFeeding> {
  // Try the RPC first (preferred path)
  let { data, error } = await supabase.rpc('mark_cat_fed', {
    p_household_id: params.householdId,
    p_meal_slot_id: params.mealSlotId,
    p_feeding_date: params.feedingDate,
    p_pet_id: params.petId ?? null,
    p_note: params.note?.trim() || null,
  });

  // If RPC failed due to older signature without p_pet_id, retry without it
  if (error && (error.message.includes('parameter') || error.message.includes('p_pet_id'))) {
    const retry = await supabase.rpc('mark_cat_fed', {
      p_household_id: params.householdId,
      p_meal_slot_id: params.mealSlotId,
      p_feeding_date: params.feedingDate,
      p_note: params.note?.trim() || null,
    } as Parameters<typeof supabase.rpc<'mark_cat_fed'>>[1]);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    // Unique violation = already fed
    if (error.code === '23505' || error.message.includes('unique') || error.message.includes('already been recorded') || error.message.includes('CAT_ALREADY_FED')) {
      const err = new Error('This meal has already been recorded by a roommate.');
      (err as unknown as { code: string }).code = 'CAT_ALREADY_FED';
      throw err;
    }

    // RLS block — fall back to direct insert
    if (error.code === '42501' || error.message.includes('row-level security') || error.message.includes('Household access denied')) {
      const insertPayload: Record<string, unknown> = {
        household_id: params.householdId,
        meal_slot_id: params.mealSlotId,
        feeding_date: params.feedingDate,
        feeding_type: 'scheduled',
        note: params.note?.trim() || null,
      };
      if (params.petId) insertPayload.pet_id = params.petId;

      const { data: insertData, error: insertError } = await supabase
        .from('cat_feedings')
        .insert(insertPayload as never)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const err = new Error('This meal has already been recorded by a roommate.');
          (err as unknown as { code: string }).code = 'CAT_ALREADY_FED';
          throw err;
        }
        throw new Error(insertError.message);
      }
      return insertData as CatFeeding;
    }

    throw new Error(error.message);
  }

  return data as CatFeeding;
}

export async function recordExtraFeeding(params: {
  householdId: string;
  petId?: string;
  note?: string;
}): Promise<CatFeeding> {
  // Try the RPC first (preferred path)
  const { data, error } = await supabase.rpc('record_extra_feeding', {
    p_household_id: params.householdId,
    p_pet_id: params.petId ?? null,
    p_note: params.note?.trim() || null,
  });

  if (error) {
    // RLS block — fall back to direct insert using today's date in household timezone
    if (error.code === '42501' || error.message.includes('row-level security') || error.message.includes('Household access denied')) {
      const today = new Date().toISOString().split('T')[0];
      const insertPayload: Record<string, unknown> = {
        household_id: params.householdId,
        feeding_date: today,
        feeding_type: 'extra',
        note: params.note?.trim() || null,
      };
      if (params.petId) insertPayload.pet_id = params.petId;

      const { data: insertData, error: insertError } = await supabase
        .from('cat_feedings')
        .insert(insertPayload as never)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);
      return insertData as CatFeeding;
    }
    throw new Error(error.message);
  }

  return data as CatFeeding;
}

export async function addPet(householdId: string, name: string): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .insert({
      household_id: householdId,
      name: name.trim(),
      species: 'cat',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Pet;
}

export async function deletePet(petId: string): Promise<void> {
  const { error } = await supabase.from('pets').delete().eq('id', petId);
  if (error) throw new Error(error.message);
}
