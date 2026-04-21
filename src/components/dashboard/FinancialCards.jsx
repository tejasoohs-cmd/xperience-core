import React from 'react';
import MoneyCard from '@/components/ui/MoneyCard';
import { DollarSign, TrendingDown, TrendingUp, Percent } from 'lucide-react';

export default function FinancialCards({ invoices, statements, bookings }) {
  const owedToYou = (invoices || [])
    .filter(i => i.payment_status !== 'Paid')
    .reduce((s, i) => s + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

  const youOwe = (statements || [])
    .filter(s => s.payment_status !== 'Paid')
    .reduce((s, v) => s + ((v.total || 0) - (v.paid_amount || 0)), 0);

  const net = owedToYou - youOwe;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const profitThisMonth = (bookings || [])
    .filter(b => b.status === 'Completed' && b.pickup_date >= monthStart)
    .reduce((s, b) => s + (b.profit || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <MoneyCard title="Owed to You" amount={owedToYou} icon={DollarSign} variant="positive" />
      <MoneyCard title="You Owe Vendors" amount={youOwe} icon={TrendingDown} variant="negative" />
      <MoneyCard title="Net Cash Position" amount={net} icon={TrendingUp} variant={net >= 0 ? 'positive' : 'negative'} />
      <MoneyCard title="Profit This Month" amount={profitThisMonth} icon={Percent} variant="accent" />
    </div>
  );
}