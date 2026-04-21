import React from 'react';
import { formatCurrency } from '@/lib/formatters';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function TopLists({ bookings, accounts, companies, affiliates }) {
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const monthBookings = (bookings || []).filter(b =>
    b.status === 'Completed' && b.pickup_date >= monthStart && b.pickup_date <= monthEnd
  );

  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));
  const affiliateMap = Object.fromEntries((affiliates || []).map(a => [a.id, a]));

  // Top 5 clients by revenue
  const clientRevenue = {};
  monthBookings.forEach(b => {
    const acc = accountMap[b.account_id];
    const name = acc ? (companyMap[acc.company_id]?.company_name || acc.contact_name) : 'Unknown';
    clientRevenue[name] = (clientRevenue[name] || 0) + (b.client_total || 0);
  });
  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top 5 vendors by trip count
  const vendorTrips = {};
  monthBookings.filter(b => b.affiliate_id).forEach(b => {
    const name = affiliateMap[b.affiliate_id]?.name || 'Unknown';
    vendorTrips[name] = (vendorTrips[name] || 0) + 1;
  });
  const topVendors = Object.entries(vendorTrips).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Avg profit per trip
  const avgProfit = monthBookings.length > 0
    ? monthBookings.reduce((s, b) => s + (b.profit || 0), 0) / monthBookings.length
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Avg Profit / Trip</h4>
        <p className="text-xl font-mono font-bold text-primary">{formatCurrency(avgProfit)}</p>
        <p className="text-xs text-muted-foreground mt-1">{monthBookings.length} completed trips this month</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Top Clients (Revenue)</h4>
        {topClients.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          <div className="space-y-2">
            {topClients.map(([name, rev], i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-foreground truncate mr-2">{name}</span>
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{formatCurrency(rev)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Top Vendors (Trips)</h4>
        {topVendors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          <div className="space-y-2">
            {topVendors.map(([name, count], i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-foreground truncate mr-2">{name}</span>
                <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{count} trips</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}