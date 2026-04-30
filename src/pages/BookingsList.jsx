import React, { useState, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatConfNumber, formatDate, formatCurrency } from '@/lib/formatters';
import { Plus, Search, Download, Upload, Trash2 } from 'lucide-react';
import { exportBookingsToCsv } from '@/lib/excelExport';
import { useAppSettings } from '@/lib/useAppSettings';
import BulkImportModal from '@/components/bookings/BulkImportModal';
import BulkActionsBar from '@/components/bookings/BulkActionsBar';
import AdvancedSearch from '@/components/bookings/AdvancedSearch';
import TrashView from '@/components/bookings/TrashView';
import { useKeyboardShortcuts } from '@/components/ui/KeyboardShortcuts';

export default function BookingsList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextBookingNumber } = useAppSettings();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [advFilters, setAdvFilters] = useState({ phone: '', flight: '', clientRef: '', driverId: '', affiliateId: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const searchRef = useRef(null);

  useKeyboardShortcuts(searchRef);

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '—';
    const comp = companyMap[acc.company_id];
    return comp?.company_name || acc.contact_name;
  };

  const activeBookings = useMemo(() => bookings.filter(b => b.status !== 'Deleted'), [bookings]);

  const filtered = useMemo(() => {
    return activeBookings.filter(b => {
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
      if (advFilters.phone && !(b.primary_passenger_phone || '').includes(advFilters.phone)) return false;
      if (advFilters.flight && !(b.flight_number || '').toLowerCase().includes(advFilters.flight.toLowerCase())) return false;
      if (advFilters.clientRef && !(b.po_client_ref || '').toLowerCase().includes(advFilters.clientRef.toLowerCase())) return false;
      if (advFilters.driverId && b.driver_id !== advFilters.driverId) return false;
      if (advFilters.affiliateId && b.affiliate_id !== advFilters.affiliateId) return false;
      return true;
    });
  }, [activeBookings, statusFilter, dateFrom, dateTo, search, advFilters, accountMap, companyMap]);

  const allSelected = filtered.length > 0 && filtered.every(b => selectedIds.includes(b.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : filtered.map(b => b.id));
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSoftDelete = async (id) => {
    const b = bookings.find(x => x.id === id);
    if (b?.invoice_id || b?.statement_id) { alert('Cannot delete: booking is linked to an invoice or statement.'); return; }
    if (!confirm('Move this booking to trash?')) return;
    await base44.entities.Booking.update(id, { status: 'Deleted', _prev_status: b?.status || 'New' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  if (showTrash) return <TrashView bookings={bookings} onClose={() => setShowTrash(false)} />;

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={`${filtered.length} trips`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowTrash(true)} className="gap-1.5 text-muted-foreground">
              <Trash2 className="w-4 h-4" /> Trash
            </Button>
            <Button variant="outline" onClick={() => exportBookingsToCsv(filtered, Object.fromEntries(accounts.map(a=>[a.id,a])), Object.fromEntries(companies.map(c=>[c.id,c])), {})}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4 mr-1" /> Import
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
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
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
            <SelectItem value="No-Show">No-Show</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 bg-secondary border-border text-sm" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 bg-secondary border-border text-sm" />
      </div>

      <AdvancedSearch filters={advFilters} onChange={setAdvFilters} accounts={accounts} drivers={drivers} affiliates={affiliates} />

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="mt-3">
          <BulkActionsBar
            selectedIds={selectedIds}
            bookings={filtered}
            drivers={drivers}
            onDone={() => queryClient.invalidateQueries({ queryKey: ['bookings'] })}
            onClear={() => setSelectedIds([])}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto mt-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 w-8">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conf#</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date / Time</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Route</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">Profit</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(b => (
              <tr key={b.id} className={`hover:bg-secondary/50 transition-colors ${selectedIds.includes(b.id) ? 'bg-primary/5' : ''}`}>
                <td className="px-3 py-3">
                  <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggleOne(b.id)} />
                </td>
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
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleSoftDelete(b.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No bookings found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <BulkImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        accounts={accounts}
        getNextBookingNumber={getNextBookingNumber}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['bookings'] })}
      />
    </div>
  );
}