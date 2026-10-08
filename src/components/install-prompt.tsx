'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted'|'dismissed' }> };
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(localStorage.getItem('expense-manager-install-dismissed') === 'true');
    const handler = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (!installEvent || dismissed) return null;
  return <div className="install-banner"><span className="install-icon"><Download size={18}/></span><div><strong>Install Expense Manager</strong><p>Keep household updates one tap away.</p></div><button className="button button-small" onClick={async () => { await installEvent.prompt(); const result = await installEvent.userChoice; if (result.outcome === 'accepted') setDismissed(true); }}>Install</button><button className="plain-icon" aria-label="Dismiss install prompt" onClick={() => { localStorage.setItem('expense-manager-install-dismissed','true'); setDismissed(true); }}><X size={17}/></button></div>;
}
