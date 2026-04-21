import React from 'react';
import { formatCurrency } from '@/lib/formatters';

export default function MoneyCard({ title, amount, icon: Icon, trend, trendLabel, variant = 'default' }) {
  const variants = {
    default: 'border-border',
    positive: 'border-emerald-500/30',
    negative: 'border-red-500/30',
    accent: 'border-primary/30',
  };

  return (
    <div className={`bg-card rounded-lg border ${variants[variant]} p-4 md:p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-xl md:text-2xl font-mono font-bold text-foreground">
        {formatCurrency(amount)}
      </p>
      {trend !== undefined && (
        <p className={`text-xs mt-2 font-mono ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || ''}
        </p>
      )}
    </div>
  );
}