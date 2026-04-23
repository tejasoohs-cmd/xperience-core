import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatConfNumber } from '@/lib/formatters';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import StatusPill from '@/components/ui/StatusPill';

const STATUS_BLOCK_COLORS = {
  'New': 'bg-gray-500/30 border-gray-500/50 text-gray-200',
  'Confirmed': 'bg-blue-500/30 border-blue-500/50 text-blue-200',
  'Completed': 'bg-emerald-500/30 border-emerald-500/50 text-emerald-200',
  'Cancelled': 'bg-red-500/30 border-red-500/50 text-red-300',
  'No-show': 'bg-amber-500/30 border-amber-500/50 text-amber-200',
};

export default function CalendarView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  // Filters
  const [accountFilter, setAccountFilter] = useState('');
  const [affiliateFilter, setAffiliateFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [svcFilter, setSvcFilter] = useState('');

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);
  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (accountFilter && b.account_id !== accountFilter) return false;
      if (affiliateFilter && b.affiliate_id !== affiliateFilter) return false;
      if (driverFilter && b.driver_id !== driverFilter) return false;
      if (svcFilter && b.service_type !== svcFilter) return false;
      return true;
    });
  }, [bookings, accountFilter, affiliateFilter, driverFilter, svcFilter]);

  const bookingsByDate = useMemo(() => {
    const map = {};
    filteredBookings.forEach(b => {
      if (!b.pickup_date) return;
      if (!map[b.pickup_date]) map[b.pickup_date] = [];
      map[b.pickup_date].push(b);
    });
    return map;
  }, [filteredBookings]);

  const serviceTypes = useMemo(() => [...new Set(bookings.map(b => b.service_type).filter(Boolean))], [bookings]);

  // Month view grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const openDay = (day) => {
    setSelectedDay(day);
    setDayModalOpen(true);
  };

  const BookingBlock = ({ booking }) => {
    const vt = vtMap[booking.vehicle_type_id];
    return (
      <div
        onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${booking.id}`); }}
        className={`text-[10px] rounded border px-1 py-0.5 mb-0.5 cursor-pointer truncate ${STATUS_BLOCK_COLORS[booking.status] || STATUS_BLOCK_COLORS['New']}`}
      >
        {booking.pickup_time && <span className="font-mono mr-1">{booking.pickup_time}</span>}
        {booking.primary_passenger_name || '—'}
        {vt && <span className="ml-1 opacity-70">{vt.code}</span>}
      </div>
    );
  };

  const getAccountLabel = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '';
    return companyMap[acc.company_id]?.company_name || acc.contact_name;
  };

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Booking calendar view" />

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
          {['month', 'week', 'day'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 text-sm capitalize transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {v}
            </button>
          ))}
        </div>

        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground">Today</button>
        <button onClick={() => setCurrentDate(v => subMonths(v, 1))} className="p-1.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrentDate(v => addMonths(v, 1))} className="p-1.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>

        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} className="bg-secondary border border-border text-sm rounded px-2 py-1.5 text-muted-foreground">
          <option value="">All Clients</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{getAccountLabel(a.id) || a.contact_name}</option>)}
        </select>
        <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} className="bg-secondary border border-border text-sm rounded px-2 py-1.5 text-muted-foreground">
          <option value="">All Drivers</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={affiliateFilter} onChange={e => setAffiliateFilter(e.target.value)} className="bg-secondary border border-border text-sm rounded px-2 py-1.5 text-muted-foreground">
          <option value="">All Vendors</option>
          {affiliates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={svcFilter} onChange={e => setSvcFilter(e.target.value)} className="bg-secondary border border-border text-sm rounded px-2 py-1.5 text-muted-foreground">
          <option value="">All Service Types</option>
          {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate[dateStr] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={i}
                  onClick={() => dayBookings.length > 0 && openDay(day)}
                  className={`min-h-[90px] p-1.5 border-b border-r border-border cursor-pointer hover:bg-secondary/30 transition-colors ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isCurrentDay ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(b => <BookingBlock key={b.id} booking={b} />)}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{dayBookings.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <WeekView currentDate={currentDate} bookingsByDate={bookingsByDate} navigate={navigate} vtMap={vtMap} />
      )}

      {/* Day View */}
      {view === 'day' && (
        <DayView currentDate={currentDate} bookingsByDate={bookingsByDate} navigate={navigate} vtMap={vtMap} />
      )}

      {/* Day Drill-down Modal */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif italic">{selectedDay ? format(selectedDay, 'EEEE, dd MMMM yyyy') : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(selectedDay ? (bookingsByDate[format(selectedDay, 'yyyy-MM-dd')] || []) : [])
              .sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''))
              .map(b => {
                const vt = vtMap[b.vehicle_type_id];
                return (
                  <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="bg-secondary border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-primary font-bold">{formatConfNumber(b.confirmation_number)}</span>
                      <div className="flex items-center gap-2">
                        <StatusPill status={b.status} size="xs" />
                        <span className="font-mono text-sm text-foreground">{b.pickup_time || '—'}</span>
                      </div>
                    </div>
                    <div className="text-sm text-foreground font-medium">{b.primary_passenger_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{b.pickup_location} → {b.dropoff_location}</div>
                    {vt && <div className="text-xs text-primary mt-1">{vt.code} — {vt.name}</div>}
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeekView({ currentDate, bookingsByDate, navigate, vtMap }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 0 }) });
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6am - midnight

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
      <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', minWidth: 700 }}>
        {/* Header */}
        <div className="border-b border-r border-border p-2" />
        {weekDays.map(day => (
          <div key={day} className={`border-b border-r border-border px-2 py-2 text-xs text-center ${isToday(day) ? 'bg-primary/10' : ''}`}>
            <div className="font-medium text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={`font-bold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</div>
          </div>
        ))}

        {/* Time slots */}
        {hours.map(hour => (
          <React.Fragment key={hour}>
            <div className="border-b border-r border-border px-2 py-1 text-[10px] text-muted-foreground text-right">{hour}:00</div>
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = (bookingsByDate[dateStr] || []).filter(b => {
                if (!b.pickup_time) return hour === 9;
                const h = parseInt(b.pickup_time.split(':')[0]);
                return h === hour;
              });
              return (
                <div key={day} className={`border-b border-r border-border px-1 py-0.5 min-h-[36px] ${isToday(day) ? 'bg-primary/5' : ''}`}>
                  {dayBookings.map(b => {
                    const vt = vtMap[b.vehicle_type_id];
                    return (
                      <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)}
                        className={`text-[10px] rounded px-1 py-0.5 cursor-pointer mb-0.5 truncate border ${STATUS_BLOCK_COLORS[b.status] || 'bg-gray-500/20 text-gray-200 border-gray-500/50'}`}>
                        {b.pickup_time} {b.primary_passenger_name || '—'}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function DayView({ currentDate, bookingsByDate, navigate, vtMap }) {
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayBookings = (bookingsByDate[dateStr] || []).sort((a, b) => (a.pickup_time || '').localeCompare(b.pickup_time || ''));
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border px-4 py-3 bg-secondary/50">
        <h3 className="text-sm font-serif italic">{format(currentDate, 'EEEE, dd MMMM yyyy')} — {dayBookings.length} trips</h3>
      </div>
      <div>
        {hours.map(hour => {
          const slotBookings = dayBookings.filter(b => {
            if (!b.pickup_time) return hour === 9;
            const h = parseInt(b.pickup_time.split(':')[0]);
            return h === hour;
          });
          return (
            <div key={hour} className="flex border-b border-border min-h-[50px]">
              <div className="w-16 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground border-r border-border">{hour}:00</div>
              <div className="flex-1 px-2 py-1">
                {slotBookings.map(b => {
                  const vt = vtMap[b.vehicle_type_id];
                  return (
                    <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)}
                      className={`flex items-center gap-3 text-xs rounded px-2 py-1.5 cursor-pointer mb-1 border ${STATUS_BLOCK_COLORS[b.status] || 'bg-gray-500/20 text-gray-200 border-gray-500/50'}`}>
                      <span className="font-mono font-bold">{b.pickup_time}</span>
                      <span className="font-medium">{b.primary_passenger_name || '—'}</span>
                      <span className="text-opacity-70 truncate">{b.pickup_location} → {b.dropoff_location}</span>
                      {vt && <span className="ml-auto flex-shrink-0">{vt.code}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}