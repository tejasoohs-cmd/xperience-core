import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, getDaysOverdue, formatDate } from '@/lib/formatters';

export default function OverdueInvoices({ invoices, accounts, companies }) {
  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));

  const overdue = (invoices || [])
    .filter(i => i.payment_status !== 'Paid' && i.due_date && getDaysOverdue(i.due_date) > 0)
    .sort((a, b) => getDaysOverdue(b.due_date) - getDaysOverdue(a.due_date));

  if (overdue.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-serif italic text-foreground mb-2">Overdue Invoices</h3>
        <p className="text-sm text-muted-foreground">None — you're all caught up</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-serif italic text-foreground">Overdue Invoices</h3>
      </div>
      <div className="divide-y divide-border">
        {overdue.slice(0, 10).map(inv => {
          const acc = accountMap[inv.account_id];
          const company = acc ? companyMap[acc.company_id] : null;
          const days = getDaysOverdue(inv.due_date);
          const balance = (inv.grand_total || 0) - (inv.paid_amount || 0);
          return (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{company?.company_name || acc?.contact_name || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-foreground">{formatCurrency(balance)}</span>
                <span className="text-xs font-mono bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                  {days}d overdue
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}