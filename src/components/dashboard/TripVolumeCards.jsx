import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { CalendarCheck, Calendar, CalendarDays, CalendarClock } from 'lucide-react';
import { isToday, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function TripVolumeCards({ bookings }) {
  const all = bookings || [];
  const total = all.length;
  const today = new Date();

  const todayStr = today.toISOString().split('T')[0];
  const tripsToday = all.filter(b => b.pickup_date === todayStr).length;

  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
  const tripsThisWeek = all.filter(b => b.pickup_date >= weekStart && b.pickup_date <= weekEnd).length;

  const monthStart = startOfMonth(today).toISOString().split('T')[0];
  const monthEnd = endOfMonth(today).toISOString().split('T')[0];
  const tripsThisMonth = all.filter(b => b.pickup_date >= monthStart && b.pickup_date <= monthEnd).length;

  const lastMonthStart = startOfMonth(subMonths(today, 1)).toISOString().split('T')[0];
  const lastMonthEnd = endOfMonth(subMonths(today, 1)).toISOString().split('T')[0];
  const tripsLastMonth = all.filter(b => b.pickup_date >= lastMonthStart && b.pickup_date <= lastMonthEnd).length;

  const monthPct = tripsLastMonth > 0
    ? Math.round(((tripsThisMonth - tripsLastMonth) / tripsLastMonth) * 100)
    : tripsThisMonth > 0 ? 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard title="Total Trips" value={total} icon={CalendarCheck} />
      <StatCard
        title="This Month"
        value={tripsThisMonth}
        subtitle={`${monthPct >= 0 ? '↑' : '↓'} ${Math.abs(monthPct)}% vs last month`}
        icon={Calendar}
      />
      <StatCard title="This Week" value={tripsThisWeek} icon={CalendarDays} />
      <StatCard title="Today" value={tripsToday} icon={CalendarClock} />
    </div>
  );
}