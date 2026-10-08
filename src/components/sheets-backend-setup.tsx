'use client';

import { useState } from 'react';
import { Database, LoaderCircle } from 'lucide-react';

export function SheetsBackendSetup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function initialize() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/backend/setup', { method: 'POST' });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not initialize the workbook.');
      setMessage(result.message ?? 'Workbook tabs are ready.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not initialize the workbook.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="settings-card">
    <span className="side-eyebrow">DATA BACKEND</span>
    <h2>Connect the MR HEIGHTS workbook</h2>
    <p>After adding the Google service account credentials to the server environment and sharing the workbook with that account, initialize the app tabs here.</p>
    <button className="button button-primary" type="button" onClick={initialize} disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={16}/> : <Database size={16}/>} {busy ? 'Preparing workbook…' : 'Initialize Google Sheets'}
    </button>
    {message && <p className="settings-message" role="status">{message}</p>}
  </section>;
}
