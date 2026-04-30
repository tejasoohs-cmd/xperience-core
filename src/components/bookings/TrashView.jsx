import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { formatConfNumber, formatDate } from '@/lib/formatters';
import { differenceInDays, parseISO } from 'date-fns';

export default function TrashView({ bookings, onClose }) {
  const queryClient = useQueryClient();
  const deleted = bookings.filter(b => b.status === 'Deleted');

  // Auto-purge items older than 30 days
  useEffect(() => {
    const toPurge = deleted.filter(b => {
      const age = differenceInDays(new Date(), parseISO(b.updated_date || b.created_date || b.pickup_date));
      return age > 30;
    });
    if (toPurge.length > 0) {
      Promise.all(toPurge.map(b => base44.entities.Booking.delete(b.id))).then(() => {
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
      });
    }
  }, []);

  const handleRestore = async (booking) => {
    await base44.entities.Booking.update(booking.id, { status: booking._prev_status || 'New' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-serif italic text-foreground">Trash ({deleted.length})</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-muted-foreground">← Back to list</Button>
      </div>
      {deleted.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Trash is empty</p>}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Booking</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left hidden md:table-cell">Guest</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase text-left hidden md:table-cell">Deleted On</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {deleted.map(b => (
              <tr key={b.id} className="opacity-70 hover:opacity-100 transition-opacity">
                <td className="px-4 py-3 font-mono text-muted-foreground">{formatConfNumber(b.confirmation_number)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(b.pickup_date)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{b.primary_passenger_name || '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(b.updated_date?.split('T')[0])}</td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleRestore(b)}>
                    <RotateCcw className="w-3 h-3" /> Restore
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}