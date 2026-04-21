import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatConfNumber, formatDate, formatCurrency } from '@/lib/formatters';
import { Plus, Search, Download } from 'lucide-react';
import { exportBookingsToCsv } from '@/lib/excelExport';

export default function BookingsList() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '—';
    const comp = companyMap[acc.company_id];
    return comp?.company_name || acc.contact_name;
  };

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (dateFrom && b.pickup_date < dateFrom) return false;
      if (dateTo && b.pickup_date > dateTo) return false;
      if (search) {
        const s = search.toLowerCase();
        const confMatch = String(b.confirmation_number).includes(s);
        const guestMatch = (b.primary_passenger_name || '').toLowerCase().includes(s);
        const pickupMatch = (b.pickup_location || '').toLowerCase().includes(s);
        const dropMatch = (b.dropoff_location || '').toLowerCase().includes(s);
        const clientMatch = getClientName(b.account_id).toLowerCase().includes(s);
        if (!confMatch && !guestMatch && !pickupMatch && !dropMatch && !clientMatch) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, dateFrom, dateTo, search, accountMap, companyMap]);

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={`${filtered.length} trips`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportBookingsToCsv(filtered, Object.fromEntries(accounts.map(a=>[a.id,a])), Object.fromEntries(companies.map(c=>[c.id,c])), {})}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Link to="/bookings/new">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> New Booking
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conf#, guest, location, client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="No-show">No-show</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 bg-secondary border-border text-sm" placeholder="From" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 bg-secondary border-border text-sm" placeholder="To" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conf#</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date / Time</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Route</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">Profit</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-secondary/50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/bookings/${b.id}`} className="font-mono text-primary hover:underline text-sm">
                    {formatConfNumber(b.confirmation_number)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-foreground">{formatDate(b.pickup_date)}</span>
                  <span className="text-muted-foreground ml-2 font-mono">{b.pickup_time}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{getClientName(b.account_id)}</td>
                <td className="px-4 py-3 text-foreground">{b.primary_passenger_name || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs truncate max-w-xs">
                  {b.pickup_location} → {b.dropoff_location}
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className={`font-mono text-sm ${(b.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(b.profit || 0)}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusPill status={b.status} size="xs" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}