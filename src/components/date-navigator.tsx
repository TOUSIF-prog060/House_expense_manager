'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useRef } from 'react';

interface DateNavigatorProps {
  currentDate: string; // YYYY-MM-DD
  todayDate: string;   // YYYY-MM-DD
  baseUrl?: string;    // default '/cat'
}

export function DateNavigator({
  currentDate,
  todayDate,
  baseUrl = '/cat',
}: DateNavigatorProps) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isToday = currentDate === todayDate;

  // Calculate previous day (YYYY-MM-DD)
  const getShiftedDate = (dateStr: string, offsetDays: number): string => {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const prevDate = getShiftedDate(currentDate, -1);
  const nextDate = getShiftedDate(currentDate, 1);
  const canGoNext = currentDate < todayDate;

  const navigateToDate = (targetDate: string) => {
    if (targetDate === todayDate) {
      router.push(baseUrl);
    } else {
      router.push(`${baseUrl}?date=${targetDate}`);
    }
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      navigateToDate(val);
    }
  };

  return (
    <div className="date-navigator-container">
      <div className="date-nav-buttons">
        <button
          type="button"
          className="date-nav-btn"
          onClick={() => navigateToDate(prevDate)}
          title={`Previous day (${prevDate})`}
          aria-label="Previous day"
        >
          <ChevronLeft size={17} />
          <span className="date-nav-btn-text">Previous</span>
        </button>

        <div className="date-nav-center">
          <label className="date-nav-picker-label" title="Pick any date from calendar">
            <Calendar size={15} />
            <input
              ref={dateInputRef}
              type="date"
              className="date-nav-hidden-input"
              value={currentDate}
              max={todayDate}
              onChange={handleDatePickerChange}
              aria-label="Select date"
            />
            <span className="date-nav-picker-text">Choose date</span>
          </label>

          {!isToday && (
            <button
              type="button"
              className="date-nav-today-btn"
              onClick={() => navigateToDate(todayDate)}
              title="Jump back to today"
            >
              <RotateCcw size={12} /> Today
            </button>
          )}
        </div>

        <button
          type="button"
          className="date-nav-btn"
          disabled={!canGoNext}
          onClick={() => navigateToDate(nextDate)}
          title={canGoNext ? `Next day (${nextDate})` : 'Cannot view future dates'}
          aria-label="Next day"
        >
          <span className="date-nav-btn-text">Next</span>
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
