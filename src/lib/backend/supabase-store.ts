import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sheetSchema, type SheetRow, type SheetTable } from './sheet-schema';

type LegacyRecord = Record<string, string>;

const nullableFields: Partial<Record<SheetTable, Set<string>>> = {
  expense_categories: new Set(['household_id']),
  expenses: new Set(['category_id', 'notes']),
  expense_shares: new Set(['share_percentage']),
  expense_attachments: new Set(),
  household_invites: new Set(['used_at', 'used_by']),
  meal_slots: new Set(['reminder_time']),
  cat_feedings: new Set(['meal_slot_id', 'note']),
  payments: new Set(['notes']),
  notifications: new Set(['entity_id', 'entity_type', 'read_at']),
  activity_events: new Set(['entity_id']),
};

function fromDatabase(table: SheetTable, row: Record<string, unknown>): LegacyRecord {
  const result: LegacyRecord = {};
  for (const field of sheetSchema[table] as readonly string[]) {
    let value = row[field];
    if (table === 'expenses' && field === 'amount_paise') value = Math.round(Number(row.amount) * 100);
    if (table === 'expense_shares' && field === 'share_amount_paise') value = Math.round(Number(row.share_amount) * 100);
    if (table === 'payments' && field === 'amount_paise') value = Math.round(Number(row.amount) * 100);
    if (table === 'activity_events' && field === 'metadata_json') value = JSON.stringify(row.metadata ?? {});
    if (table === 'expense_attachments' && field === 'drive_file_id') value = row.object_path;
    if (typeof value === 'boolean') value = String(value);
    result[field] = value == null ? '' : String(value);
  }
  return result;
}

function toDatabase(table: SheetTable, source: LegacyRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [legacyField, raw] of Object.entries(source)) {
    if (!(sheetSchema[table] as readonly string[]).includes(legacyField)) continue;
    let field = legacyField;
    let value: unknown = raw;
    if (raw === '' && nullableFields[table]?.has(legacyField)) value = null;
    if (table === 'expenses' && legacyField === 'amount_paise') { field = 'amount'; value = (Number(raw) / 100).toFixed(2); }
    if (table === 'expense_shares' && legacyField === 'share_amount_paise') { field = 'share_amount'; value = (Number(raw) / 100).toFixed(2); }
    if (table === 'payments' && legacyField === 'amount_paise') { field = 'amount'; value = (Number(raw) / 100).toFixed(2); }
    if (table === 'activity_events' && legacyField === 'metadata_json') { field = 'metadata'; try { value = JSON.parse(raw); } catch { value = {}; } }
    if (table === 'expense_attachments' && legacyField === 'drive_file_id') field = 'object_path';
    if (['is_pet', 'reminder_enabled', 'is_active', 'expense_enabled', 'cat_enabled', 'reminder_enabled', 'payment_enabled'].includes(legacyField) && (table === 'expense_categories' || table === 'meal_slots' || table === 'push_subscriptions')) value = raw === 'true';
    if (['file_size', 'display_order'].includes(legacyField)) value = Number(raw);
    result[field] = value;
  }
  return result;
}

export class SupabaseStore {
  private async client(): Promise<SupabaseClient> { return await createClient() as SupabaseClient; }

  async list<T extends SheetTable>(table: T): Promise<SheetRow<T>[]> {
    const client = await this.client();
    // The union of table names loses its generated row type; conversion is checked against sheetSchema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).from(table).select('*');
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => fromDatabase(table, row) as SheetRow<T>);
  }

  async append<T extends SheetTable>(table: T, records: Array<Partial<SheetRow<T>>>): Promise<void> {
    if (!records.length) return;
    const client = await this.client();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any).from(table).insert(records.map((row) => toDatabase(table, row as LegacyRecord)));
    if (error) throw error;
  }

  async update<T extends SheetTable>(table: T, id: string, changes: Record<string, string>): Promise<boolean> {
    const client = await this.client();
    const mapped = toDatabase(table, changes);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).from(table).update(mapped).eq('id', id).select('id');
    if (error) throw error;
    return Boolean(data?.length);
  }

  async remove<T extends SheetTable>(table: T, id: string): Promise<boolean> {
    const client = await this.client();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).from(table).delete().eq('id', id).select('id');
    if (error) throw error;
    return Boolean(data?.length);
  }

  async replaceMatching<T extends SheetTable>(table: T, field: string, value: string, records: Array<Record<string, string>>): Promise<void> {
    const client = await this.client();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (client as any).from(table).delete().eq(field, value);
    if (deleteError) throw deleteError;
    await this.append(table, records as Array<Partial<SheetRow<T>>>);
  }
}

export function getStore(): SupabaseStore { return new SupabaseStore(); }
