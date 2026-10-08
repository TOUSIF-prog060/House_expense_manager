import { ReceiptText } from 'lucide-react';

export default function ExpensesLoading() {
  return (
    <div className="page-wrap expenses-page">
      <div className="page-heading">
        <span className="eyebrow skeleton-shimmer" style={{ width: 150, height: 12, display: 'inline-block' }} />
        <h1>Expenses</h1>
        <p>Keep track of household costs together.</p>
      </div>

      <div className="expense-stat-banner skeleton-card" style={{ marginBottom: 20 }}>
        <div className="skeleton-shimmer skeleton-text" style={{ width: 120, height: 13 }} />
        <div className="skeleton-shimmer skeleton-title" style={{ width: 160, height: 32 }} />
      </div>

      <div className="expenses-list">
        {[1, 2, 3, 4, 5].map((item) => (
          <div className="recent-row" key={item}>
            <span className="expense-emoji skeleton-shimmer skeleton-circle" style={{ width: 34, height: 34 }} />
            <span className="recent-main" style={{ flex: 1 }}>
              <div className="skeleton-shimmer skeleton-text" style={{ width: '45%', height: 15 }} />
              <div className="skeleton-shimmer skeleton-text" style={{ width: '55%', height: 12 }} />
            </span>
            <div className="skeleton-shimmer skeleton-text" style={{ width: 70, height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
