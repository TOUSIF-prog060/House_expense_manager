export default function ProfileLoading() {
  return (
    <div className="page-wrap profile-page">
      <div className="page-heading">
        <span className="eyebrow skeleton-shimmer" style={{ width: 130, height: 12, display: 'inline-block' }} />
        <h1>Profile</h1>
        <p>Your household, just the way you like it.</p>
      </div>

      <section className="profile-card">
        <div className="skeleton-shimmer skeleton-circle" style={{ width: 64, height: 64 }} />
        <div className="profile-info" style={{ flex: 1 }}>
          <div className="skeleton-shimmer skeleton-title" style={{ width: 160, height: 24 }} />
          <div className="skeleton-shimmer skeleton-text" style={{ width: 120, height: 14 }} />
        </div>
      </section>

      <div className="profile-links" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {[1, 2, 3].map((item) => (
          <div className="skeleton-card" key={item} style={{ padding: '14px 18px', flexDirection: 'row', alignItems: 'center' }}>
            <div className="skeleton-shimmer skeleton-circle" style={{ width: 20, height: 20 }} />
            <div className="skeleton-shimmer skeleton-text" style={{ width: 140, height: 15, margin: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
