import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function MonthlyChart({ bookings }) {
  const now = new Date();
  const days = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });

  const data = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayBookings = (bookings || []).filter(b => b.pickup_date === dateStr && b.status === 'Completed');
    const revenue = dayBookings.reduce((s, b) => s + (b.client_total || 0), 0);
    return {
      day: format(day, 'd'),
      revenue: Math.round(revenue),
    };
  });

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-serif italic text-foreground mb-4">Daily Revenue — {format(now, 'MMMM yyyy')}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(40 4% 50%)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(40 4% 50%)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(20 6% 12%)',
                border: '1px solid hsl(20 5% 18%)',
                borderRadius: '6px',
                color: 'hsl(40 6% 90%)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
              formatter={(val) => [`AED ${val}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="hsl(38 92% 50%)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}