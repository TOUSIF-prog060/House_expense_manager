'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Filter, X } from 'lucide-react';

interface ExpenseDateFilterProps {
  currentDate?: string;
  totalFilteredRecords?: number;
  totalAmountPaise?: number;
}

export function ExpenseDateFilter({
  currentDate,
  totalFilteredRecords,
}: ExpenseDateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('date', val);
    } else {
      params.delete('date');
    }
    router.push(`/expenses?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('date');
    router.push('/expenses');
  };

  const formattedDate = currentDate
    ? new Date(`${currentDate}T12:00:00`).toLocaleDateString('en', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="expense-filter-toolbar">
      <div className="expense-filter-left">
        <label className="expense-date-input-wrap">
          <Calendar size={15} />
          <span>Filter by date:</span>
          <input
            type="date"
            className="expense-date-input"
            value={currentDate ?? ''}
            onChange={handleDateChange}
            aria-label="Filter expenses by date"
          />
        </label>
      </div>

      {currentDate && (
        <div className="active-date-filter-pill">
          <Filter size={13} />
          <span>
            {formattedDate} ({totalFilteredRecords ?? 0} {totalFilteredRecords === 1 ? 'expense' : 'expenses'})
          </span>
          <button
            type="button"
            className="clear-filter-btn"
            onClick={handleClear}
            title="Clear date filter"
            aria-label="Clear date filter"
          >
            <X size={13} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
