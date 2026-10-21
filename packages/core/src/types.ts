export type UUID = string;
export type Household = {
  id: UUID;
  name: string;
  currency: string;
  timezone: string;
  created_at: string;
};
export type Member = {
  household_id: UUID;
  user_id: UUID;
  role: 'admin' | 'member';
  status: 'active' | 'invited' | 'removed';
  profile?: { display_name: string; avatar_url: string | null; upi_id?: string | null };
};
export type ExpenseShare = {
  id: UUID;
  expense_id: UUID;
  user_id: UUID;
  share_amount: string;
  share_percentage: string | null;
};
export type Expense = {
  id: UUID;
  household_id: UUID;
  title: string;
  amount: string;
  category_id: UUID | null;
  paid_by: UUID;
  created_by: UUID;
  expense_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shares?: ExpenseShare[];
};
export type MealSlot = {
  id: UUID;
  household_id: UUID;
  name: string;
  display_order: number;
  reminder_enabled: boolean;
  reminder_time: string | null;
};
export type Pet = {
  id: UUID;
  household_id: UUID;
  name: string;
  species: string;
  created_at: string;
};
export type CatFeeding = {
  id: UUID;
  household_id: UUID;
  meal_slot_id: UUID | null;
  feeding_date: string;
  fed_by: UUID;
  fed_at: string;
  note: string | null;
  feeding_type: 'scheduled' | 'extra';
  pet_id?: UUID | null;
};
export type Payment = {
  id: UUID;
  household_id: UUID;
  from_user: UUID;
  to_user: UUID;
  amount: string;
  payment_method: 'upi' | 'cash' | 'bank_transfer' | 'other';
  payment_date: string;
  status: 'recorded' | 'confirmed';
  notes: string | null;
};
export type Notification = {
  id: UUID;
  user_id: UUID;
  household_id: UUID;
  type: string;
  title: string;
  body: string;
  entity_id: UUID | null;
  entity_type: string | null;
  read_at: string | null;
  created_at: string;
};
export type SupplyItem = {
  id: UUID;
  household_id: UUID;
  name: string;
  quantity: string | null;
  category: string;
  notes: string | null;
  is_purchased: boolean;
  added_by: UUID | null;
  purchased_by: UUID | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
};
