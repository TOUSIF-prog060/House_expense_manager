'use client';

import { useState } from 'react';
import { Check, Clock3 } from 'lucide-react';

interface FeedButtonProps {
  householdId: string;
  slotId: string;
  slotName: string;
  feedingDate: string;
  alreadyFed: boolean;
  petId?: string;
  petName?: string;
  onFed?: () => void;
}

export function FeedButton({
  householdId,
  slotId,
  slotName,
  feedingDate,
  alreadyFed,
  petId,
  petName,
  onFed,
}: FeedButtonProps) {
  const [fed, setFed] = useState(alreadyFed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);

  const displayName = petName ? petName : 'Cat';

  async function feed() {
    if (!navigator.onLine) {
      setMessage('Reconnect before recording a meal.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/backend/cat/feedings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          householdId,
          mealSlotId: slotId,
          feedingDate,
          petId: petId || undefined,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        duplicate?: boolean;
        code?: string;
        fedByName?: string;
        data?: { fed_at?: string };
      };

      if (response.status === 409 && result.code === 'CAT_ALREADY_FED') {
        const time = result.data?.fed_at
          ? new Date(result.data.fed_at).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })
          : '';
        setMessage(
          `${displayName}'s ${slotName.toLowerCase()} meal was already recorded by ${
            result.fedByName ?? 'a housemate'
          }${time ? ` at ${time}` : ''}.`
        );
        setFed(true);
        onFed?.();
      } else if (!response.ok) {
        throw new Error(result.error ?? 'Could not save the feeding.');
      } else {
        setFed(true);
        onFed?.();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Couldn’t update right now. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <>
      {fed ? (
        <span className="meal-status fed">
          <Check size={14} /> FED
        </span>
      ) : (
        <button
          type="button"
          className="button button-primary button-small button-feed"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          <Check size={15} />
          {busy ? 'Updating…' : petName ? `Feed ${petName}` : 'Mark as Fed'}
        </button>
      )}

      {message && (
        <p className="meal-message" role="status">
          {message}
        </p>
      )}

      {confirm && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-${slotId}-${petId ?? 'default'}`}
          >
            <span className="modal-icon">
              <Clock3 size={21} />
            </span>
            <h2 id={`confirm-${slotId}-${petId ?? 'default'}`}>
              {displayName} has been fed?
            </h2>
            <p>
              Record the {slotName.toLowerCase()} meal as completed for {displayName} on{' '}
              {new Date(`${feedingDate}T12:00:00`).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
              })}.
            </p>
            <div className="modal-actions">
              <button type="button" className="button button-primary" onClick={feed}>
                Yes, {displayName} is Fed
              </button>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
