import React from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '@/components/ui/StatusPill';
import { formatConfNumber, formatTime } from '@/lib/formatters';
import { AlertTriangle } from 'lucide-react';

export default function TodayOps({ title, bookings, accounts, drivers, affiliates, vehicleTypes }) {
  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const driverMap = Object.fromEntries((drivers || []).map(d => [d.id, d]));
  const affiliateMap = Object.fromEntries((affiliates || []).map(a => [a.id, a]));
  const vtMap = Object.fromEntries((vehicleTypes || []).map(v => [v.id, v]));

  const sorted = [...bookings].sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-serif italic text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground font-mono">{sorted.length} trips</p>
      </div>
      {sorted.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No trips</p>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map(b => {
            const account = accountMap[b.account_id];
            const missingAssignment = !b.driver_id && !b.affiliate_id && b.status !== 'Cancelled';
            const driverOrVendor = b.driver_source === 'FarmOut'
              ? affiliateMap[b.affiliate_id]?.name
              : driverMap[b.driver_id]?.name;
            const vt = vtMap[b.vehicle_type_id];

            return (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="w-12 flex-shrink-0 text-right">
                  <p className="text-sm font-mono font-medium text-foreground">{formatTime(b.pickup_time)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {b.primary_passenger_name || 'No guest'}
                    </p>
                    {missingAssignment && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.pickup_location} → {b.dropoff_location}
                  </p>
                </div>
                <div className="hidden md:block text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{vt?.code || '—'}</p>
                  <p className="text-xs text-muted-foreground">{driverOrVendor || '—'}</p>
                </div>
                <StatusPill status={b.status} size="xs" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}