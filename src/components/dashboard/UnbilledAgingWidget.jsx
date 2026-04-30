import React from 'react';
import { useNavigate } from 'react-router-dom';
import { calcBookingTotals, formatCurrency } from '@/lib/formatters';
import { differenceInDays, parseISO } from 'date-fns';

const BANDS = [
  { label: '0–7 days', min: 0, max: 7, color: 'text-foreground' },
  { label: '8–14 days', min: 8, max: 14, color: 'text-amber-400' },
  { label: '15–30 days', min: 15, max: 30, color: 'text-orange-400' },
  { label: '30+ days', min: 31, max: Infinity, color: 'text-red-400' },
];

export default function UnbilledAgingWidget({ bookings, title = 'Unbilled Revenue', filterField = 'invoice_id' }) {
  const navigate = useNavigate();
  const today = new Date();

  const unbilled = bookings.filter(b => b.status === 'Completed' && !b[filterField]);

  const bands = BANDS.map(band => {
    const trips = unbilled.filter(b => {
      const age = differenceInDays(today, parseISO(b.pickup_date));
      return age >= band.min && age <= band.max;
    });
    const total = trips.reduce((s, b) => s + (calcBookingTotals(b).clientTotal || 0), 0);
    return { ...band, count: trips.length, total };
  });

  const grandTotal = unbilled.reduce((s, b) => s + (calcBookingTotals(b).clientTotal || 0), 0);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-serif italic text-foreground">{title}</h3>
        <span className="font-mono text-primary text-sm font-bold">{formatCurrency(grandTotal)}</span>
      </div>
      <div className="space-y-1.5">
        {bands.map(band => (
          <button
            key={band.label}
            onClick={() => navigate(`/bookings?status=Completed`)}
            disabled={band.count === 0}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-secondary/40 hover:bg-secondary/70 transition-colors disabled:opacity-40 text-left"
          >
            <span className="text-xs text-muted-foreground">{band.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">{band.count} trips</span>
              <span className={`text-xs font-mono font-semibold ${band.color}`}>{formatCurrency(band.total)}</span>
            </div>
          </button>
        ))}
      </div>
      {unbilled.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">All trips billed ✓</p>}
    </div>
  );
}