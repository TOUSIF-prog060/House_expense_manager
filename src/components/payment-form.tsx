'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, RotateCcw } from 'lucide-react';
import { paymentSchema } from '@/lib/validation/schemas';

type Person = { userId: string; name: string };

export type PaymentPrefill = {
  from: string;
  to: string;
  amount: string;
  note?: string;
  label?: string;
};

export function PaymentForm({
  householdId,
  members,
  currentUserId,
  prefill,
  onClearPrefill,
}: {
  householdId: string;
  members: Person[];
  currentUserId: string;
  prefill?: PaymentPrefill | null;
  onClearPrefill?: () => void;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(prefill?.from ?? currentUserId);
  const [to, setTo] = useState(
    prefill?.to ?? (members.find((member) => member.userId !== currentUserId)?.userId ?? '')
  );
  const [amount, setAmount] = useState(prefill?.amount ?? '');
  const [method, setMethod] = useState<'upi' | 'cash' | 'bank_transfer' | 'other'>('upi');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [notes, setNotes] = useState(prefill?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefill) {
      if (prefill.from) setFrom(prefill.from);
      if (prefill.to) setTo(prefill.to);
      if (prefill.amount) setAmount(prefill.amount);
      if (prefill.note) setNotes(prefill.note);
      setError('');
    }
  }, [prefill]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      householdId,
      fromUser: from,
      toUser: to,
      amount,
      paymentMethod: method,
      paymentDate: date,
      notes: notes.trim() || undefined,
    };

    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check payment details.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/backend/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? 'Could not record payment.');
      }

      setAmount('');
      setNotes('');
      setSuccess(true);
      if (onClearPrefill) onClearPrefill();
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  }

  const fromMemberName = members.find((m) => m.userId === from)?.name;
  const toMemberName = members.find((m) => m.userId === to)?.name;

  return (
    <section className="panel-card payment-form-card" id="record-payment-section">
      <div className="section-heading">
        <div className="section-icon expense-icon">
          <ArrowUpRight size={17} />
        </div>
        <div>
          <h2>Record a payment</h2>
          <p>Mark a settlement transfer as paid.</p>
        </div>
      </div>

      {prefill && (
        <div className="prefill-notice">
          <div>
            <strong>Settling: {prefill.label || `${fromMemberName} → ${toMemberName}`}</strong>
            <small>Amount ₹{Number(prefill.amount).toFixed(2)} loaded</small>
          </div>
          {onClearPrefill && (
            <button
              type="button"
              className="text-button-subtle"
              onClick={onClearPrefill}
              title="Reset fields"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      )}

      <form onSubmit={submit} className="payment-form">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="form-success" role="status">
            <Check size={15} /> Payment recorded successfully! Balances updated.
          </div>
        )}

        <label className="field">
          <span>Payer (Who paid)</span>
          <select value={from} onChange={(event) => setFrom(event.target.value)}>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name} {member.userId === currentUserId ? '(You)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Recipient (Who received)</span>
          <select value={to} onChange={(event) => setTo(event.target.value)}>
            {members
              .filter((member) => member.userId !== from)
              .map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} {member.userId === currentUserId ? '(You)' : ''}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          <span>Amount</span>
          <div className="amount-input">
            <span>₹</span>
            <input
              required
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Payment Method</span>
            <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Note <em>optional</em></span>
          <input
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. UPI transfer for household split"
          />
        </label>

        <button className="button button-primary button-full" disabled={busy}>
          {busy ? 'Recording payment…' : 'Record payment'}
        </button>
      </form>
    </section>
  );
}
