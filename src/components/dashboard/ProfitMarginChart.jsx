import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Dot } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { calcBookingTotals } from '@/lib/formatters';

export default function ProfitMarginChart({ bookings }) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const start = startOfMonth(monthDate).toISOString().split('T')[0];
      const end = endOfMonth(monthDate).toISOString().split('T')[0];
      const monthBookings = bookings.filter(b => b.pickup_date >= start && b.pickup_date <= end && b.status === 'Completed');
      const totals = monthBookings.reduce((acc, b) => {
        const t = calcBookingTotals(b);
        return { client: acc.client + t.clientTotal, profit: acc.profit + t.profit };
      }, { client: 0, profit: 0 });
      const margin = totals.client > 0 ? (totals.profit / totals.client) * 100 : 0;
      return { month: format(monthDate, 'MMM'), margin: parseFloat(margin.toFixed(1)), low: margin < 20 };
    });
  }, [bookings]);

  const avgMargin = data.length > 0 ? data.reduce((s, d) => s + d.margin, 0) / data.length : 0;

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    return <circle cx={cx} cy={cy} r={5} fill={payload.low ? '#ef4444' : '#f59e0b'} stroke="none" />;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-serif italic text-foreground">Profit Margin Trend</h3>
        <span className="text-xs text-muted-foreground font-mono">avg {avgMargin.toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(20 5% 18%)" />
          <XAxis dataKey="month" tick={{ fill: 'hsl(40 4% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'hsl(40 4% 50%)', fontSize: 11 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'hsl(20 6% 10%)', border: '1px solid hsl(20 5% 18%)', borderRadius: 6, fontSize: 12 }} formatter={v => [`${v}%`, 'Margin']} />
          <ReferenceLine y={avgMargin} stroke="hsl(40 4% 50%)" strokeDasharray="4 4" label={{ value: 'Avg', fill: 'hsl(40 4% 50%)', fontSize: 10, position: 'insideTopRight' }} />
          <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground mt-1">Red points = below 20% margin threshold</p>
    </div>
  );
}