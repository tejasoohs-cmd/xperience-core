import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatConfNumber } from '@/lib/formatters';
import { ExternalLink, Printer, AlertTriangle } from 'lucide-react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';

const STATUS_COLORS = {
  'New': 'bg-gray-500/20 text-gray-300',
  'Confirmed': 'bg-blue-500/20 text-blue-300',
  'Completed': 'bg-emerald-500/20 text-emerald-300',
  'Cancelled': 'bg-red-500/20 text-red-300',
  'No-show': 'bg-amber-500/20 text-amber-300',
};

export default function Dispatch() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [vtFilter, setVtFilter] = useState('All');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const affiliateMap = useMemo(() => Object.fromEntries(affiliates.map(a => [a.id, a])), [affiliates]);
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map(v => [v.id, v])), [vehicles]);
  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);

  const getClientName = (b) => {
    const acc = accountMap[b.account_id];
    if (!acc) return '—';
    return companyMap[acc.company_id]?.company_name || acc.contact_name;
  };

  const isUnassigned = (b) => {
    if (b.driver_source === 'FarmOut') return !b.affiliate_id;
    return !b.driver_id;
  };
  const hasNoVehicle = (b) => b.driver_source === 'InHouse' && !b.vehicle_id;

  const filterBookings = (dateStr) => {
    return bookings
      .filter(b => b.pickup_date === dateStr)
      .filter(b => statusFilter === 'All' || b.status === statusFilter)
      .filter(b => sourceFilter === 'All' || (sourceFilter === 'In-House' ? b.driver_source === 'InHouse' : b.driver_source === 'FarmOut'))
      .filter(b => vtFilter === 'All' || b.vehicle_type_id === vtFilter)
      .filter(b => !unassignedOnly || isUnassigned(b))
      .sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));
  };

  const todayBookings = filterBookings(today);
  const tomorrowBookings = filterBookings(tomorrow);
  const totalUnassigned = [...bookings.filter(b => b.pickup_date === today || b.pickup_date === tomorrow)].filter(isUnassigned).length;

  const DayColumn = ({ label, dayBookings }) => (
    <div className="flex-1 min-w-0">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center justify-between">
          <h2 className="text-sm font-serif italic text-foreground">{label}</h2>
          <span className="bg-primary/20 text-primary text-xs font-mono px-2 py-0.5 rounded-full">{dayBookings.length} trips</span>
        </div>
        <div className="divide-y divide-border">
          {dayBookings.length === 0 && (
            <div className="px-4 py-10 text-center text-muted-foreground text-sm">No trips</div>
          )}
          {dayBookings.map(b => {
            const unassigned = isUnassigned(b);
            const noVehicle = hasNoVehicle(b);
            const isFarm = b.driver_source === 'FarmOut';
            const vt = vtMap[b.vehicle_type_id];
            const vehicle = vehicleMap[b.vehicle_id];
            const driver = driverMap[b.driver_id];
            const aff = affiliateMap[b.affiliate_id];

            return (
              <div key={b.id} className={`p-3 ${unassigned ? 'border-l-2 border-l-red-500' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="font-mono text-primary font-bold text-base w-14 flex-shrink-0 pt-0.5">{b.pickup_time || '—'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{formatConfNumber(b.confirmation_number)}</span>
                      <StatusPill status={b.status} size="xs" />
                      {unassigned && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">UNASSIGNED</span>}
                      {noVehicle && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">NO VEHICLE</span>}
                      {isFarm && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold">FARM-OUT</span>}
                    </div>
                    <div className="text-sm font-medium text-foreground truncate">{b.primary_passenger_name || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{getClientName(b)}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {b.pickup_location} → {b.dropoff_location}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {vt && <span className="text-primary font-medium">{vt.code}</span>}
                      {vehicle && <span>{vehicle.plate_number}</span>}
                      {!isFarm && driver && <span className="text-emerald-400">{driver.name}</span>}
                      {isFarm && aff && <span className="text-orange-400">{aff.name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Link to={`/bookings/${b.id}`} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Open
                      </Link>
                      <button
                        onClick={() => window.open(`/print/driver-trip-sheet/${b.id}`, '_blank')}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Driver
                      </button>
                      {isFarm && (
                        <button
                          onClick={() => window.open(`/print/affiliate-trip-sheet/${b.id}`, '_blank')}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-secondary border border-border rounded hover:bg-secondary/80 transition-colors"
                        >
                          <Printer className="w-3 h-3" /> Affiliate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Dispatch"
        subtitle="Operations board — Today & Tomorrow"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-secondary border border-border text-foreground text-sm rounded px-3 py-1.5">
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-secondary border border-border text-foreground text-sm rounded px-3 py-1.5">
          <option value="All">All Sources</option>
          <option value="In-House">In-House</option>
          <option value="Farm-Out">Farm-Out</option>
        </select>
        <select value={vtFilter} onChange={e => setVtFilter(e.target.value)} className="bg-secondary border border-border text-foreground text-sm rounded px-3 py-1.5">
          <option value="All">All Vehicle Types</option>
          {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.code} — {vt.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={unassignedOnly} onChange={e => setUnassignedOnly(e.target.checked)} className="accent-amber-500" />
          Unassigned only
        </label>
      </div>

      {/* Day Columns */}
      <div className="flex gap-4">
        <DayColumn label={`TODAY — ${format(new Date(), 'dd MMM yyyy')}`} dayBookings={todayBookings} />
        <DayColumn label={`TOMORROW — ${format(addDays(new Date(), 1), 'dd MMM yyyy')}`} dayBookings={tomorrowBookings} />
      </div>

      {/* Summary Bar */}
      <div className="mt-4 bg-card border border-border rounded-lg px-5 py-3 flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">Today: <span className="font-mono text-foreground">{todayBookings.length}</span></span>
        <span className="text-muted-foreground">Tomorrow: <span className="font-mono text-foreground">{tomorrowBookings.length}</span></span>
        <span className={`flex items-center gap-1.5 ${totalUnassigned > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {totalUnassigned > 0 && <AlertTriangle className="w-4 h-4" />}
          Unassigned: <span className="font-mono">{totalUnassigned}</span>
        </span>
      </div>
    </div>
  );
}