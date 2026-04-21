import React from 'react';
import { calcBookingTotals, formatCurrency } from '@/lib/formatters';

export default function PricingSummary({ form }) {
  const { clientNet, clientVat, clientTotal, vendorNet, vendorVat, vendorTotal, profit } = calcBookingTotals(form);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h4 className="text-sm font-serif italic text-foreground mb-3">Pricing Summary</h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
          <p className="text-muted-foreground">Net: <span className="font-mono text-foreground">{formatCurrency(clientNet)}</span></p>
          <p className="text-muted-foreground">VAT: <span className="font-mono text-foreground">{formatCurrency(clientVat)}</span></p>
          <p className="font-medium mt-1">Total: <span className="font-mono text-foreground">{formatCurrency(clientTotal)}</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Vendor</p>
          <p className="text-muted-foreground">Net: <span className="font-mono text-foreground">{formatCurrency(vendorNet)}</span></p>
          <p className="text-muted-foreground">VAT: <span className="font-mono text-foreground">{formatCurrency(vendorVat)}</span></p>
          <p className="font-medium mt-1">Total: <span className="font-mono text-foreground">{formatCurrency(vendorTotal)}</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Profit</p>
          <p className={`text-2xl font-mono font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(profit)}
          </p>
        </div>
      </div>
    </div>
  );
}