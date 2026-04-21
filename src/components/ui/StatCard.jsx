import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className="text-xl md:text-2xl font-mono font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}