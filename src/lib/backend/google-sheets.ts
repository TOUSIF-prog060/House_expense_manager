import { google, type sheets_v4 } from 'googleapis';
import { objectToRow, rowToObject, sheetSchema, type SheetRow, type SheetTable } from './sheet-schema';

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
let cachedSheets: sheets_v4.Sheets | undefined;

export function getGoogleSheets(): sheets_v4.Sheets {
  if (cachedSheets) return cachedSheets;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!spreadsheetId || !rawCredentials) throw new Error('Google Sheets backend is not configured. Set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_JSON.');
  const credentials = JSON.parse(rawCredentials) as { client_email: string; private_key: string; project_id?: string };
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  const auth = new google.auth.GoogleAuth({ credentials, scopes });
  cachedSheets = google.sheets({ version: 'v4', auth });
  return cachedSheets;
}

export class GoogleSheetsStore {
  constructor(private readonly api: sheets_v4.Sheets, private readonly spreadsheetId: string) {}

  async initialize(): Promise<void> {
    const metadata = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: 'sheets.properties(sheetId,title)' });
    const present = new Map((metadata.data.sheets ?? []).map((sheet) => [sheet.properties?.title ?? '', sheet.properties?.sheetId]));
    const missing = (Object.keys(sheetSchema) as SheetTable[]).filter((name) => !present.has(name));
    if (missing.length) {
      await this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) } });
    }
    const updates: sheets_v4.Schema$ValueRange[] = [];
    for (const [name, headers] of Object.entries(sheetSchema)) {
      const quoted = `'${name}'!A1:${columnName(headers.length)}1`;
      const current = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: quoted });
      const actual = current.data.values?.[0] ?? [];
      if (actual.length && headers.some((header, index) => actual[index] !== header)) throw new Error(`The ${name} tab already has a different header row. Rename or back up its existing columns before connecting.`);
      if (!actual.length) updates.push({ range: quoted, values: [[...headers]] });
    }
    if (updates.length) await this.api.spreadsheets.values.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { valueInputOption: 'RAW', data: updates } });
  }

  async list<T extends SheetTable>(table: T): Promise<SheetRow<T>[]> {
    const headers = sheetSchema[table];
    const result = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `'${table}'!A2:${columnName(headers.length)}` });
    return (result.data.values ?? []).filter((row) => row.some((cell) => cell !== '')).map((row) => rowToObject(table, row as string[]));
  }

  async append<T extends SheetTable>(table: T, records: Array<Partial<SheetRow<T>>>): Promise<void> {
    if (!records.length) return;
    const headers = sheetSchema[table];
    await this.api.spreadsheets.values.append({ spreadsheetId: this.spreadsheetId, range: `'${table}'!A:${columnName(headers.length)}`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: records.map((record) => objectToRow(table, record)) } });
  }

  async appendTransaction(entries: Array<{ table: SheetTable; records: Array<Record<string, string>> }>): Promise<void> {
    const updates: sheets_v4.Schema$ValueRange[] = [];
    for (const entry of entries) {
      if (!entry.records.length) continue;
      const headers = sheetSchema[entry.table];
      const existing = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `'${entry.table}'!A2:${columnName(headers.length)}` });
      const firstRow = (existing.data.values?.length ?? 0) + 2;
      updates.push({ range: `'${entry.table}'!A${firstRow}:${columnName(headers.length)}${firstRow + entry.records.length - 1}`, values: entry.records.map((record) => objectToRow(entry.table, record)) });
    }
    if (updates.length) await this.api.spreadsheets.values.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { valueInputOption: 'RAW', data: updates } });
  }

  async replace<T extends SheetTable>(table: T, records: Array<Partial<SheetRow<T>>>): Promise<void> {
    const headers = sheetSchema[table];
    const current = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `'${table}'!A2:${columnName(headers.length)}` });
    const count = current.data.values?.length ?? 0;
    const requests: sheets_v4.Schema$Request[] = [];
    const meta = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: 'sheets.properties(sheetId,title)' });
    const sheetId = meta.data.sheets?.find((sheet) => sheet.properties?.title === table)?.properties?.sheetId;
    if (sheetId === undefined) throw new Error(`Missing Google Sheet tab: ${table}`);
    if (count) requests.push({ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: count + 1 } } });
    if (records.length) requests.push({ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: records.length + 1 }, inheritFromBefore: true } });
    if (requests.length) await this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests } });
    if (records.length) await this.api.spreadsheets.values.update({ spreadsheetId: this.spreadsheetId, range: `'${table}'!A2:${columnName(headers.length)}${records.length + 1}`, valueInputOption: 'RAW', requestBody: { values: records.map((record) => objectToRow(table, record)) } });
  }

  async update<T extends SheetTable>(table: T, id: string, changes: Record<string, string>): Promise<boolean> {
    const headers = sheetSchema[table];
    const records = await this.list(table);
    const index = records.findIndex((record) => (record as Record<string, string>).id === id);
    if (index < 0) return false;
    const merged = { ...(records[index] as Record<string, string>), ...changes };
    await this.api.spreadsheets.values.update({ spreadsheetId: this.spreadsheetId, range: `'${table}'!A${index + 2}:${columnName(headers.length)}${index + 2}`, valueInputOption: 'RAW', requestBody: { values: [objectToRow(table, merged)] } });
    return true;
  }

  async remove<T extends SheetTable>(table: T, id: string): Promise<boolean> {
    const rows = await this.list(table);
    const index = rows.findIndex((row) => (row as Record<string,string>).id === id);
    if (index < 0) return false;
    await this.deleteRowRange(table, index + 1);
    return true;
  }

  async replaceMatching<T extends SheetTable>(table: T, field: string, value: string, records: Array<Record<string,string>>): Promise<void> {
    const rows = await this.list(table);
    const indexes = rows.map((row,index) => (row as Record<string,string>)[field] === value ? index : -1).filter((index) => index >= 0).sort((a,b)=>b-a);
    for (const index of indexes) await this.deleteRowRange(table,index+1);
    await this.appendTransaction([{table,records}]);
  }

  private async deleteRowRange(table: SheetTable, startIndex: number): Promise<void> {
    const meta = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: 'sheets.properties(sheetId,title)' });
    const sheetId = meta.data.sheets?.find((sheet) => sheet.properties?.title === table)?.properties?.sheetId;
    if (sheetId === undefined) throw new Error(`Missing Google Sheet tab: ${table}`);
    await this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 } } }] } });
  }
}

export function getStore(): GoogleSheetsStore {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('Set GOOGLE_SHEETS_ID to connect the MR HEIGHTS workbook.');
  return new GoogleSheetsStore(getGoogleSheets(), id);
}

export function columnName(column: number): string {
  let result = '';
  while (column > 0) { const remainder = (column - 1) % 26; result = String.fromCharCode(65 + remainder) + result; column = Math.floor((column - 1) / 26); }
  return result;
}
