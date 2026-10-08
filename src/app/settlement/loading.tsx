export default function SettlementLoading() {
  return (
    <div className="page-wrap settlement-page">
      <div className="page-heading">
        <span className="eyebrow skeleton-shimmer" style={{ width: 140, height: 12, display: 'inline-block' }} />
        <h1>Settlement</h1>
        <p>Keep things even without any awkwardness.</p>
      </div>

      <div className="skeleton-card" style={{ marginBottom: 20 }}>
        <div className="skeleton-shimmer skeleton-text" style={{ width: 130, height: 13 }} />
        <div className="skeleton-shimmer skeleton-title" style={{ width: 180, height: 32 }} />
        <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: 14 }} />
      </div>

      <div className="settlement-layout">
        <div className="settlement-side skeleton-card">
          <div className="skeleton-shimmer skeleton-title" style={{ width: 140, height: 22 }} />
          <div className="skeleton-shimmer skeleton-text" style={{ width: '100%', height: 40 }} />
          <div className="skeleton-shimmer skeleton-text" style={{ width: '100%', height: 40 }} />
        </div>
      </div>
    </div>
  );
}
