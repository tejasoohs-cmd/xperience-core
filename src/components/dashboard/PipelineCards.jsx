import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/formatters';
import { Clock, CheckCircle, FileText, Banknote } from 'lucide-react';

export default function PipelineCards({ bookings, invoices }) {
  const all = bookings || [];

  const newCount = all.filter(b => b.status === 'New').length;
  const confirmedUpcoming = all.filter(b => b.status === 'Confirmed' && b.pickup_date >= new Date().toISOString().split('T')[0]).length;

  const completedNotInvoiced = all.filter(b => b.status === 'Completed' && !b.invoice_id);
  const cniValue = completedNotInvoiced.reduce((s, b) => s + (b.client_total || 0), 0);

  const invoicedNotPaid = (invoices || []).filter(i => i.payment_status !== 'Paid');
  const inpValue = invoicedNotPaid.reduce((s, i) => s + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatCard title="New Bookings" value={newCount} icon={Clock} />
      <StatCard title="Confirmed Upcoming" value={confirmedUpcoming} icon={CheckCircle} />
      <StatCard
        title="Completed / Not Invoiced"
        value={completedNotInvoiced.length}
        subtitle={formatCurrency(cniValue)}
        icon={FileText}
      />
      <StatCard
        title="Invoiced / Not Paid"
        value={invoicedNotPaid.length}
        subtitle={formatCurrency(inpValue)}
        icon={Banknote}
      />
    </div>
  );
}