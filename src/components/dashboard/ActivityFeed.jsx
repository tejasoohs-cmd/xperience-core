import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { CalendarCheck, FileText, Receipt, FileQuestion, User, ArrowRight } from 'lucide-react';

const ENTITY_ICONS = {
  booking: CalendarCheck,
  invoice: FileText,
  statement: Receipt,
  quote: FileQuestion,
  account: User,
};

const ACTION_COLORS = {
  created: 'text-emerald-400',
  updated: 'text-blue-400',
  status_changed: 'text-amber-400',
  payment_updated: 'text-emerald-400',
  sent: 'text-blue-400',
  accepted: 'text-emerald-400',
  rejected: 'text-red-400',
  converted_to_booking: 'text-primary',
  duplicated: 'text-muted-foreground',
  cancelled: 'text-red-400',
};

export default function ActivityFeed() {
  const { data: logs = [] } = useQuery({
    queryKey: ['activityLog'],
    queryFn: () => base44.entities.ActivityLog.list('-created_date', 15),
  });

  if (logs.length === 0) return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-serif italic text-foreground mb-2">Recent Activity</h3>
      <p className="text-sm text-muted-foreground">No activity yet</p>
    </div>
  );

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-serif italic text-foreground">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border">
        {logs.map(log => {
          const Icon = ENTITY_ICONS[log.entity_type] || ArrowRight;
          const color = ACTION_COLORS[log.action_type] || 'text-muted-foreground';
          let timeAgo = '—';
          try { timeAgo = formatDistanceToNow(parseISO(log.created_date), { addSuffix: true }); } catch {}
          return (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3">
              <div className={`mt-0.5 flex-shrink-0 ${color}`}><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{log.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}