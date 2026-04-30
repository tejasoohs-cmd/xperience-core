import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { formatConfNumber, formatDate } from '@/lib/formatters';

export default function ConflictWarningModal({ conflict, onAssignAnyway, onCancel }) {
  if (!conflict) return null;
  return (
    <Dialog open={!!conflict} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif italic text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Scheduling Conflict
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">{conflict.resourceName}</strong> is already assigned to{' '}
            <span className="font-mono text-primary">{formatConfNumber(conflict.conflictBooking.confirmation_number)}</span>{' '}
            at <strong className="text-foreground">{conflict.conflictBooking.pickup_time}</strong> on{' '}
            <strong className="text-foreground">{formatDate(conflict.conflictBooking.pickup_date)}</strong>.
          </p>
          <p>The two bookings overlap within 2 hours. Assign anyway?</p>
        </div>
        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button className="bg-amber-500 text-black hover:bg-amber-600" onClick={onAssignAnyway}>Assign Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}