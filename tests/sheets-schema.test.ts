import { describe, expect, it, vi } from 'vitest';
import { columnName, GoogleSheetsStore } from '../src/lib/backend/google-sheets';
import { objectToRow, rowToObject, sheetSchema } from '../src/lib/backend/sheet-schema';
import type { sheets_v4 } from 'googleapis';

describe('Google Sheets schema mapping', () => {
  it('uses stable tab headers for the app entities', () => {
    expect(sheetSchema.expenses.slice(0, 6)).toEqual(['id', 'household_id', 'title', 'amount_paise', 'category_id', 'paid_by']);
    expect(sheetSchema.cat_feedings).toContain('feeding_type');
    expect(sheetSchema.expense_shares).toContain('share_amount_paise');
  });

  it('maps rows to named values and back in header order', () => {
    const row = objectToRow('expenses', { id: 'e-1', household_id: 'h-1', title: 'Cat food', amount_paise: '25000' });
    expect(row.slice(0, 4)).toEqual(['e-1', 'h-1', 'Cat food', '25000']);
    expect(rowToObject('expenses', row)).toMatchObject({ id: 'e-1', household_id: 'h-1', amount_paise: '25000' });
  });

  it('handles spreadsheet column names beyond Z', () => {
    expect(columnName(1)).toBe('A');
    expect(columnName(26)).toBe('Z');
    expect(columnName(27)).toBe('AA');
    expect(columnName(53)).toBe('BA');
  });

  it('creates missing tabs and writes the header row without replacing an existing blank tab', async () => {
    const get = vi.fn().mockResolvedValue({ data: { sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }] } });
    const batchUpdate = vi.fn().mockResolvedValue({});
    const valuesGet = vi.fn().mockResolvedValue({ data: {} });
    const valuesBatchUpdate = vi.fn().mockResolvedValue({});
    const fake = { spreadsheets: { get, batchUpdate, values: { get: valuesGet, batchUpdate: valuesBatchUpdate } } } as unknown as sheets_v4.Sheets;
    await new GoogleSheetsStore(fake, 'spreadsheet-id').initialize();
    expect(batchUpdate).toHaveBeenCalledOnce();
    expect(batchUpdate.mock.calls[0][0].requestBody?.requests).toHaveLength(Object.keys(sheetSchema).length);
    expect(valuesBatchUpdate.mock.calls[0][0].requestBody?.data).toHaveLength(Object.keys(sheetSchema).length);
  });
});
