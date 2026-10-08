import { Cat, History } from 'lucide-react';

export default function CatLoading() {
  return (
    <div className="page-wrap cat-page">
      <div className="cat-page-heading">
        <span className="cat-heading-icon"><Cat size={22} /></span>
        <span className="eyebrow skeleton-shimmer" style={{ width: 140, height: 12, display: 'inline-block' }} />
        <h1>Cat care</h1>
        <p>A little check-in keeps everyone in the know.</p>
      </div>

      <section className="cat-today-panel">
        <div className="cat-date-heading">
          <div>
            <span className="eyebrow">TODAY</span>
            <div className="skeleton-shimmer skeleton-title" style={{ width: 180, height: 26 }} />
          </div>
          <div className="skeleton-shimmer skeleton-badge" style={{ width: 110 }} />
        </div>

        <div className="cat-slot-list">
          {[1, 2, 3].map((slot) => (
            <article className="cat-slot-card" key={slot}>
              <div className="slot-number skeleton-shimmer" style={{ width: 34, height: 34 }} />
              <div className="slot-details" style={{ flex: 1 }}>
                <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: 18 }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '60%', height: 13 }} />
              </div>
              <div className="slot-action">
                <div className="skeleton-shimmer skeleton-badge" style={{ width: 72, height: 32 }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cat-history-section">
        <div className="section-heading">
          <div className="section-icon cat-icon"><History size={17} /></div>
          <div>
            <h2>Recent feedings</h2>
            <p>A little history for peace of mind.</p>
          </div>
        </div>
        <div className="recent-feedings">
          {[1, 2, 3].map((row) => (
            <div className="history-row" key={row}>
              <span className="history-paw skeleton-shimmer skeleton-circle" style={{ width: 24, height: 24 }} />
              <span className="recent-main" style={{ flex: 1 }}>
                <div className="skeleton-shimmer skeleton-text" style={{ width: '35%', height: 14 }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '50%', height: 12 }} />
              </span>
              <div className="skeleton-shimmer skeleton-text" style={{ width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
