'use client';
import { useState } from 'react';

export function ExtraFeedingButton({ householdId }: { householdId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    if (!window.confirm('Record an extra feeding outside the regular meal schedule?')) return;
    if (!navigator.onLine) { setMessage('Reconnect before recording the feeding.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/backend/cat/extra', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ householdId }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not record the feeding.');
      setMessage('Extra feeding recorded.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not record the feeding. Try again.'); }
    finally { setBusy(false); }
  }
  return <span className="extra-action"><button type="button" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Record extra feeding'}</button>{message && <span role="status">{message}</span>}</span>;
}
