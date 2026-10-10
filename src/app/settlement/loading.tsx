export default function SettlementLoading() {
  return (
    <div className="page-wrap settlement-page">
      <div className="settlement-header">
        <div className="settlement-title-box">
          <span className="eyebrow skeleton-shimmer" style={{ width: 140, height: 12, display: 'inline-block' }} />
          <h1>Settlement</h1>
          <p>Total household expenses divided equally among all housemates.</p>
        </div>
      </div>

      <div className="skeleton-card" style={{ marginBottom: 20, height: 100 }}>
        <div className="skeleton-shimmer skeleton-text" style={{ width: 130, height: 13, marginBottom: 8 }} />
        <div className="skeleton-shimmer skeleton-title" style={{ width: 220, height: 32 }} />
      </div>

      <div className="skeleton-card" style={{ marginBottom: 20, height: 80 }} />

      <div className="settlement-layout">
        <div className="settlement-main-col">
          <div className="skeleton-card" style={{ height: 200 }} />
        </div>
        <div className="payment-side">
          <div className="skeleton-card" style={{ height: 300 }} />
        </div>
      </div>
    </div>
  );
}
