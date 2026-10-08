import Link from 'next/link';

export function SheetsSetupNotice() {
  return <div className="page-wrap"><div className="page-heading"><span className="eyebrow">ONE LAST SETUP STEP</span><h1>Connect MR HEIGHTS</h1><p>Expense Manager needs the Google Sheets service account before it can load household data.</p></div><section className="setup-notice"><strong>Configure the server connection</strong><p>Add <code>GOOGLE_SHEETS_ID</code> and <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> to <code>.env.local</code>. Share the MR HEIGHTS spreadsheet with the service account email as an editor, then restart the development server.</p></section><p className="muted-copy" style={{marginTop:20}}>The workbook ID is already set in the project example file. Keep the service account JSON private and server-only.</p><Link className="button button-quiet" href="/home">Back to home</Link></div>;
}
