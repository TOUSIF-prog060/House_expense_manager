export const sheetSchema = {
  profiles: ['id', 'display_name', 'email', 'avatar_url', 'created_at', 'updated_at'],
  households: ['id', 'name', 'created_by', 'currency', 'timezone', 'created_at', 'updated_at'],
  household_members: ['id', 'household_id', 'user_id', 'role', 'status', 'joined_at'],
  household_invites: ['id', 'household_id', 'code_hash', 'created_by', 'expires_at', 'used_at', 'used_by', 'created_at'],
  expense_categories: ['id', 'household_id', 'name', 'icon', 'is_pet'],
  expenses: ['id', 'household_id', 'title', 'amount_paise', 'category_id', 'paid_by', 'created_by', 'expense_date', 'notes', 'created_at', 'updated_at'],
  expense_shares: ['id', 'expense_id', 'user_id', 'share_amount_paise', 'share_percentage'],
  expense_attachments: ['id', 'expense_id', 'household_id', 'drive_file_id', 'mime_type', 'file_size', 'uploaded_by', 'created_at'],
  payments: ['id', 'household_id', 'from_user', 'to_user', 'amount_paise', 'payment_method', 'payment_date', 'status', 'notes', 'created_by', 'created_at'],
  meal_slots: ['id', 'household_id', 'name', 'display_order', 'reminder_enabled', 'reminder_time', 'created_at'],
  cat_feedings: ['id', 'household_id', 'meal_slot_id', 'feeding_date', 'fed_by', 'fed_at', 'note', 'feeding_type'],
  push_subscriptions: ['id', 'user_id', 'household_id', 'endpoint', 'p256dh', 'auth', 'is_active', 'expense_enabled', 'cat_enabled', 'reminder_enabled', 'payment_enabled', 'created_at', 'updated_at'],
  notifications: ['id', 'user_id', 'household_id', 'type', 'title', 'body', 'entity_id', 'entity_type', 'read_at', 'created_at'],
  activity_events: ['id', 'household_id', 'actor', 'event_type', 'entity_type', 'entity_id', 'metadata_json', 'created_at'],
} as const;

export type SheetTable = keyof typeof sheetSchema;
export type SheetRow<T extends SheetTable> = Record<(typeof sheetSchema)[T][number], string>;

export function rowToObject<T extends SheetTable>(table: T, row: string[]): SheetRow<T> {
  const headers = sheetSchema[table] as readonly string[];
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])) as SheetRow<T>;
}

export function objectToRow<T extends SheetTable>(table: T, value: Record<string, string | undefined>): string[] {
  return (sheetSchema[table] as readonly string[]).map((header) => value[header] ?? '');
}
