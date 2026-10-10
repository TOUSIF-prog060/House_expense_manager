'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Edit2, Plus, QrCode, ShieldCheck, Smartphone, User, X } from 'lucide-react';

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
  const currentUpi = currentUser?.upiId ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [upiInput, setUpiInput] = useState(currentUpi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleSaveUpi(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/backend/profile/upi', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ upiId: upiInput.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save UPI ID');
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save UPI ID');
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

      {/* Your Personal UPI Card */}
      <div className="my-upi-box">
        <div className="my-upi-info">
          <span className="my-upi-label">Your UPI ID (For receiving payments)</span>
          {currentUpi ? (
            <div className="my-upi-val-row">
              <strong className="my-upi-value">{currentUpi}</strong>
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
              setUpiInput(currentUpi);
              setIsEditing(true);
            }}
          >
            {currentUpi ? (
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
            onClick={() => setIsEditing(false)}
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
            {currentUpi && (
              <button
                type="button"
                className="button button-sm button-secondary"
                disabled={busy}
                onClick={async () => {
                  setUpiInput('');
                  setBusy(true);
                  try {
                    await fetch('/api/backend/profile/upi', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ upiId: '' }),
                    });
                    setIsEditing(false);
                    router.refresh();
                  } catch {
                    setError('Failed to clear UPI');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Clear
              </button>
            )}
          </div>
          <small className="upi-helper-note">
            Supported handles: @okhdfcbank, @oksbi, @okaxis, @ybl, @paytm, @icici, etc.
          </small>
        </form>
      )}

      {/* All Housemates UPI List */}
      <div className="housemates-upi-list">
        <h3>Housemate UPI IDs</h3>
        <div className="upi-directory-grid">
          {members.map((member) => {
            const hasUpi = Boolean(member.upiId);
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
                      <span className="upi-id-text">{member.upiId}</span>
                    ) : (
                      <span className="upi-missing-text">No UPI ID added</span>
                    )}
                  </div>
                </div>

                {hasUpi && (
                  <div className="upi-card-actions">
                    <button
                      type="button"
                      className="button button-xs button-secondary copy-upi-btn"
                      onClick={() => handleCopy(member.upiId!, member.userId)}
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
                        member.upiId!
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
