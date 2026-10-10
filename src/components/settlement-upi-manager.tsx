'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Edit2, Plus, ShieldCheck, Smartphone, X } from 'lucide-react';

export type UpiMember = {
  userId: string;
  name: string;
  upiId?: string | null;
  isCurrentUser: boolean;
};

export function SettlementUpiManager({
  members,
  currentUserId,
}: {
  members: UpiMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const currentUser = members.find((m) => m.userId === currentUserId);
  const initialUpi = currentUser?.upiId ?? '';

  const [activeUpi, setActiveUpi] = useState(initialUpi);
  const [isEditing, setIsEditing] = useState(false);
  const [upiInput, setUpiInput] = useState(initialUpi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleSaveUpi(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess(false);

    const cleanInput = upiInput.trim();

    try {
      const res = await fetch('/api/backend/profile/upi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ upiId: cleanInput }),
      });
      const data = (await res.json()) as { error?: string; data?: { upiId: string | null } };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save UPI ID');
      }

      setActiveUpi(cleanInput);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save UPI ID');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearUpi() {
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/backend/profile/upi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ upiId: '' }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear UPI ID');
      }

      setActiveUpi('');
      setUpiInput('');
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear UPI ID');
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(upi: string, id: string) {
    navigator.clipboard.writeText(upi);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <section className="panel-card upi-manager-card">
      <div className="section-heading">
        <div className="section-icon upi-icon-wrap">
          <Smartphone size={18} />
        </div>
        <div>
          <h2>Household UPI Directory</h2>
          <p>Add your UPI ID so housemates can pay you directly via GPay, PhonePe, or Paytm.</p>
        </div>
      </div>

      {success && (
        <div className="form-success" role="status">
          <Check size={15} /> UPI ID updated successfully!
        </div>
      )}

      {/* Your Personal UPI Card */}
      <div className="my-upi-box">
        <div className="my-upi-info">
          <span className="my-upi-label">Your UPI ID (For receiving payments)</span>
          {activeUpi ? (
            <div className="my-upi-val-row">
              <strong className="my-upi-value">{activeUpi}</strong>
              <span className="upi-active-badge">
                <ShieldCheck size={13} /> Active
              </span>
            </div>
          ) : (
            <p className="no-upi-prompt">
              You haven’t added a UPI ID yet. Add it so others can pay you with 1 click.
            </p>
          )}
        </div>

        {!isEditing ? (
          <button
            type="button"
            className="button button-sm button-secondary"
            onClick={() => {
              setUpiInput(activeUpi);
              setError('');
              setIsEditing(true);
            }}
          >
            {activeUpi ? (
              <>
                <Edit2 size={13} /> Edit UPI
              </>
            ) : (
              <>
                <Plus size={13} /> Add your UPI
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="text-button-subtle"
            onClick={() => {
              setIsEditing(false);
              setError('');
            }}
            title="Cancel"
          >
            <X size={15} /> Cancel
          </button>
        )}
      </div>

      {/* Inline Edit Form */}
      {isEditing && (
        <form onSubmit={handleSaveUpi} className="upi-edit-form">
          {error && <div className="form-error">{error}</div>}
          <div className="upi-input-group">
            <input
              type="text"
              placeholder="e.g. yourname@oksbi or 9876543210@paytm"
              value={upiInput}
              onChange={(e) => setUpiInput(e.target.value)}
              className="upi-text-input"
              required
              autoFocus
            />
            <button className="button button-sm button-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save UPI'}
            </button>
            {activeUpi && (
              <button
                type="button"
                className="button button-sm button-secondary"
                disabled={busy}
                onClick={handleClearUpi}
              >
                Clear
              </button>
            )}
          </div>
          <small className="upi-helper-note">
            Supported handles: @okhdfcbank, @oksbi, @okaxis, @ybl, @paytm, @icici, @ptsbi, etc.
          </small>
        </form>
      )}

      {/* All Housemates UPI List */}
      <div className="housemates-upi-list">
        <h3>Housemate UPI IDs</h3>
        <div className="upi-directory-grid">
          {members.map((member) => {
            const memberUpi = member.isCurrentUser ? activeUpi : member.upiId;
            const hasUpi = Boolean(memberUpi);
            const isCopied = copiedId === member.userId;

            return (
              <div
                className={`upi-member-card ${member.isCurrentUser ? 'upi-member-current' : ''}`}
                key={member.userId}
              >
                <div className="upi-member-top">
                  <span className="upi-member-avatar">
                    {member.name[0]?.toUpperCase() ?? 'H'}
                  </span>
                  <div className="upi-member-name-box">
                    <strong>
                      {member.name} {member.isCurrentUser && <span className="you-pill">You</span>}
                    </strong>
                    {hasUpi ? (
                      <span className="upi-id-text">{memberUpi}</span>
                    ) : (
                      <span className="upi-missing-text">No UPI ID added</span>
                    )}
                  </div>
                </div>

                {hasUpi && memberUpi && (
                  <div className="upi-card-actions">
                    <button
                      type="button"
                      className="button button-xs button-secondary copy-upi-btn"
                      onClick={() => handleCopy(memberUpi, member.userId)}
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy UPI
                        </>
                      )}
                    </button>

                    <a
                      href={`upi://pay?pa=${encodeURIComponent(
                        memberUpi
                      )}&pn=${encodeURIComponent(member.name)}&cu=INR`}
                      className="button button-xs button-primary pay-upi-direct-btn"
                      title={`Open UPI app to pay ${member.name}`}
                    >
                      Pay in App
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
