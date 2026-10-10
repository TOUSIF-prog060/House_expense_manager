'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  History,
  Scale,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { formatRupees, type Transfer } from '@/lib/calculations/money';
import { PaymentForm, type PaymentPrefill } from '@/components/payment-form';

type Member = {
  userId: string;
  name: string;
  upiId?: string | null;
};

type RecentPayment = {
  id: string;
  fromUser: string;
  toUser: string;
  fromName: string;
  toName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  notes?: string | null;
};

export function SettlementInteractive({
  householdId,
  currentUserId,
  members,
  transfers,
  recentPayments,
}: {
  householdId: string;
  currentUserId: string;
  members: Member[];
  transfers: Transfer[];
  recentPayments: RecentPayment[];
}) {
  const [prefill, setPrefill] = useState<PaymentPrefill | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function handleSelectTransfer(transfer: Transfer) {
    setPrefill({
      from: transfer.fromUserId,
      to: transfer.toUserId,
      amount: (transfer.amountPaise / 100).toFixed(2),
      label: `${transfer.fromName} → ${transfer.toName}`,
      note: 'Household expense split settlement',
    });

    const el = document.getElementById('record-payment-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleCopyUpi(upiId: string, key: string) {
    navigator.clipboard.writeText(upiId);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  return (
    <div className="settlement-layout">
      {/* Left Column: Settlement Transfers */}
      <div className="settlement-main-col">
        <section className="panel-card settle-list-card">
          <div className="section-heading">
            <div className="section-icon settle-icon">
              <Scale size={18} />
            </div>
            <div>
              <h2>Who pays whom</h2>
              <p>Simple step-by-step transfers to square all balances.</p>
            </div>
          </div>

          {transfers.length > 0 ? (
            <div className="transfer-list">
              {transfers.map((transfer, index) => {
                const isUserPayer = transfer.fromUserId === currentUserId;
                const isUserReceiver = transfer.toUserId === currentUserId;
                const receiverMember = memberMap.get(transfer.toUserId);
                const receiverUpi = receiverMember?.upiId?.trim();
                const copyKey = `${transfer.fromUserId}-${transfer.toUserId}-${index}`;

                // UPI URI scheme pre-fills recipient, name, and exact amount
                const upiPayUrl = receiverUpi
                  ? `upi://pay?pa=${encodeURIComponent(receiverUpi)}&pn=${encodeURIComponent(
                      transfer.toName
                    )}&am=${(transfer.amountPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                      'Household settlement'
                    )}`
                  : null;

                return (
                  <div
                    className={`transfer-row-card ${isUserPayer ? 'user-owes-card' : ''} ${
                      isUserReceiver ? 'user-receives-card' : ''
                    }`}
                    key={copyKey}
                  >
                    <div className="transfer-flow">
                      <div className="party-chip payer-chip">
                        <span className="party-avatar">
                          {transfer.fromName[0]?.toUpperCase() ?? 'U'}
                        </span>
                        <div className="party-meta">
                          <strong>{transfer.fromName}</strong>
                          {isUserPayer && <span className="role-tag-owes">You pay</span>}
                        </div>
                      </div>

                      <div className="transfer-amount-pill">
                        <span className="transfer-subtext">pays</span>
                        <span className="transfer-val">{formatRupees(transfer.amountPaise)}</span>
                        <ArrowRight size={14} className="transfer-arrow-icon" />
                      </div>

                      <div className="party-chip receiver-chip">
                        <span className="party-avatar receiver-avatar-bg">
                          {transfer.toName[0]?.toUpperCase() ?? 'U'}
                        </span>
                        <div className="party-meta">
                          <strong>{transfer.toName}</strong>
                          {isUserReceiver && <span className="role-tag-gets">You get</span>}
                        </div>
                      </div>
                    </div>

                    {/* Receiver UPI Info & Direct Payment */}
                    <div className="transfer-upi-details">
                      {receiverUpi ? (
                        <div className="transfer-upi-row">
                          <span className="transfer-upi-badge">
                            <Smartphone size={13} /> UPI: <b>{receiverUpi}</b>
                          </span>

                          <button
                            type="button"
                            className="text-button-subtle copy-upi-link"
                            onClick={() => handleCopyUpi(receiverUpi, copyKey)}
                          >
                            {copiedKey === copyKey ? (
                              <>
                                <Check size={12} /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy UPI
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="transfer-upi-missing">
                          No UPI ID added yet by {transfer.toName}
                        </span>
                      )}
                    </div>

                    <div className="transfer-action-group">
                      {receiverUpi && isUserPayer && upiPayUrl && (
                        <a
                          href={upiPayUrl}
                          className="button button-sm button-primary upi-direct-pay-btn"
                          title="Open UPI app (GPay / PhonePe / Paytm) to pay"
                        >
                          <Smartphone size={13} /> Pay via UPI App
                        </a>
                      )}

                      <button
                        type="button"
                        className="button button-sm button-secondary settle-action-btn"
                        onClick={() => handleSelectTransfer(transfer)}
                      >
                        Record as paid
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state settled-empty-state">
              <div className="empty-state-badge">
                <CheckCircle2 size={28} />
              </div>
              <h3>Everyone is square!</h3>
              <p>All house expenses are evenly split and settled for this period.</p>
            </div>
          )}
        </section>

        {recentPayments.length > 0 && (
          <section className="panel-card recent-settlements-card">
            <button
              type="button"
              className="accordion-toggle"
              onClick={() => setShowHistory((prev) => !prev)}
            >
              <div className="section-heading-inline">
                <History size={16} />
                <span>Recorded settlements in this period ({recentPayments.length})</span>
              </div>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showHistory && (
              <div className="recent-payments-table">
                {recentPayments.map((p) => (
                  <div className="recent-payment-row" key={p.id}>
                    <div className="recent-payment-left">
                      <strong>
                        {p.fromName} {p.fromUser === currentUserId ? '(You)' : ''} → {p.toName}{' '}
                        {p.toUser === currentUserId ? '(You)' : ''}
                      </strong>
                      <small>
                        {p.paymentDate} · {p.paymentMethod.toUpperCase()}
                        {p.notes ? ` · "${p.notes}"` : ''}
                      </small>
                    </div>
                    <span className="recent-payment-amount">
                      ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Right Column: Payment Form & Helper */}
      <aside className="payment-side">
        <PaymentForm
          householdId={householdId}
          members={members}
          currentUserId={currentUserId}
          prefill={prefill}
          onClearPrefill={() => setPrefill(null)}
        />

        <div className="payment-info simple-guide-card">
          <div className="guide-header">
            <Wallet size={16} />
            <strong>How settlements work</strong>
          </div>
          <p>
            1. Total household expenses are divided equally among all housemates.
          </p>
          <p>
            2. Transfer directly via UPI using the <strong>Pay via UPI App</strong> button or copy the receiver&apos;s UPI ID.
          </p>
          <p>
            3. Once sent, click <strong>Record as paid</strong> to update household balances.
          </p>
        </div>
      </aside>
    </div>
  );
}
