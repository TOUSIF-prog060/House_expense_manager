import { CalendarDays, Cat, ReceiptText, Sparkles } from 'lucide-react';

export default function HomeLoading() {
  return (
    <div className="page-wrap dashboard-page">
      <div className="dashboard-greeting">
        <div>
          <div className="skeleton-shimmer skeleton-text" style={{ width: 140, height: 12 }} />
          <div className="skeleton-shimmer skeleton-title" style={{ width: 220, height: 32, marginTop: 8 }} />
          <div className="skeleton-shimmer skeleton-text" style={{ width: 180, height: 14 }} />
        </div>
        <span className="date-pill skeleton-shimmer" style={{ width: 100, height: 28 }} />
      </div>

      <div className="dashboard-grid">
        <section className="hero-card">
          <div className="hero-card-top">
            <span className="hero-label">
              <Sparkles size={14} /> THIS MONTH
            </span>
            <span className="hero-caption">Shared at home</span>
          </div>
          <div className="skeleton-shimmer skeleton-title" style={{ width: 160, height: 38, margin: '14px 0' }} />
          <div className="hero-divider" />
          <div className="hero-bottom">
            <div>
              <span className="skeleton-shimmer skeleton-text" style={{ width: 70, height: 12, display: 'inline-block' }} />
              <div className="skeleton-shimmer skeleton-text" style={{ width: 90, height: 18, marginTop: 4 }} />
            </div>
            <div className="hero-position">
              <span className="skeleton-shimmer skeleton-text" style={{ width: 80, height: 12, display: 'inline-block' }} />
              <div className="skeleton-shimmer skeleton-text" style={{ width: 100, height: 18, marginTop: 4 }} />
            </div>
          </div>
        </section>

        <section className="panel-card cat-today-card">
          <div className="section-heading">
            <div className="section-icon cat-icon">
              <Cat size={17} />
            </div>
            <div>
              <h2>Cat, today</h2>
              <p>All meals in the know.</p>
            </div>
          </div>
          <div className="today-meals">
            {[1, 2, 3].map((slot) => (
              <div className="today-meal" key={slot}>
                <div className="meal-dot skeleton-shimmer skeleton-circle" style={{ width: 20, height: 20 }} />
                <div className="today-meal-main" style={{ flex: 1 }}>
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: 15 }} />
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '60%', height: 12 }} />
                </div>
                <div className="skeleton-shimmer skeleton-badge" style={{ width: 56, height: 22 }} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card expenses-card">
          <div className="section-heading">
            <div className="section-icon expense-icon">
              <ReceiptText size={17} />
            </div>
            <div>
              <h2>Recent expenses</h2>
              <p>Shared things, handled.</p>
            </div>
          </div>
          <div className="recent-list">
            {[1, 2, 3].map((item) => (
              <div className="recent-row" key={item}>
                <span className="expense-emoji skeleton-shimmer skeleton-circle" style={{ width: 34, height: 34 }} />
                <span className="recent-main" style={{ flex: 1 }}>
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '45%', height: 15 }} />
                  <div className="skeleton-shimmer skeleton-text" style={{ width: '55%', height: 12 }} />
                </span>
                <div className="skeleton-shimmer skeleton-text" style={{ width: 65, height: 16 }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
