export default function RootLoading() {
  return (
    <div className="page-wrap">
      <div className="page-heading">
        <div className="skeleton-shimmer skeleton-text" style={{ width: 140, height: 12 }} />
        <div className="skeleton-shimmer skeleton-title" style={{ width: 220, height: 32, marginTop: 8 }} />
        <div className="skeleton-shimmer skeleton-text" style={{ width: 180, height: 14 }} />
      </div>

      <div className="skeleton-card" style={{ marginTop: 24, minHeight: 200 }}>
        <div className="skeleton-shimmer skeleton-title" style={{ width: '40%', height: 22 }} />
        <div className="skeleton-shimmer skeleton-text" style={{ width: '70%', height: 14 }} />
        <div className="skeleton-shimmer skeleton-text" style={{ width: '50%', height: 14 }} />
      </div>
    </div>
  );
}
