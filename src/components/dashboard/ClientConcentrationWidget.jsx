import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { calcBookingTotals, formatCurrency } from '@/lib/formatters';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function ClientConcentrationWidget({ bookings, accounts, companies }) {
  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));

  const data = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now).toISOString().split('T')[0];
    const end = endOfMonth(now).toISOString().split('T')[0];
    const monthBookings = bookings.filter(b => b.pickup_date >= start && b.pickup_date <= end && b.status !== 'Cancelled');
    const totalRevenue = monthBookings.reduce((s, b) => s + calcBookingTotals(b).clientTotal, 0);
    const byClient = {};
    monthBookings.forEach(b => {
      const rev = calcBookingTotals(b).clientTotal;
      byClient[b.account_id] = (byClient[b.account_id] || 0) + rev;
    });
    return Object.entries(byClient)
      .map(([aid, rev]) => {
        const acc = accountMap[aid];
        const comp = companyMap[acc?.company_id];
        return { name: comp?.company_name || acc?.contact_name || '—', revenue: rev, pct: totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0 };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookings, accounts, companies]);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-serif italic text-foreground mb-3">Client Concentration — This Month</h3>
      {data.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No bookings this month</p>}
      <div className="space-y-2.5">
        {data.map((c, i) => {
          const isHigh = c.pct > 50;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {isHigh && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  <span className={`text-xs font-medium truncate max-w-[150px] ${isHigh ? 'text-amber-400' : 'text-foreground'}`}>{c.name}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{c.pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isHigh ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(c.pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}