import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';

export default function EditStatementTripsModal({ open, onClose, statement, stmtBookings, allBookings, onSave }) {
  const isPaid = statement?.payment_status === 'Paid';
  const [paidWarningShown, setPaidWarningShown] = useState(false);
  const [linkedIds, setLinkedIds] = useState(new Set(statement?.booking_ids || []));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (open) {
      setLinkedIds(new Set(statement?.booking_ids || []));
      setPaidWarningShown(false);
      setDateFrom('');
      setDateTo('');
    }
  }, [open, statement]);

  const availableBookings = useMemo(() => {
    return allBookings.filter(b =>
      b.affiliate_id === statement?.affiliate_id &&
      b.driver_source === 'FarmOut' &&
      b.status === 'Completed' &&
      (!b.statement_id || b.statement_id === statement?.id) &&
      !linkedIds.has(b.id)
    );
  }, [allBookings, statement, linkedIds]);

  const filteredAvailable = useMemo(() => {
    return availableBookings.filter(b => {
      if (dateFrom && b.pickup_date < dateFrom) return false;
      if (dateTo && b.pickup_date > dateTo) return false;
      return true;
    });
  }, [availableBookings, dateFrom, dateTo]);

  const currentLinkedBookings = useMemo(() =>
    allBookings.filter(b => linkedIds.has(b.id)),
    [allBookings, linkedIds]);

  const liveTotal = useMemo(() => {
    return currentLinkedBookings.reduce((sum, b) => sum + calcBookingTotals(b).vendorTotal, 0);
  }, [currentLinkedBookings]);

  const toggleRemove = (id) => {
    setLinkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAdd = (id) => {
    setLinkedIds(prev => new Set([...prev, id]));
  };

  const selectAllInRange = () => {
    filteredAvailable.forEach(b => setLinkedIds(prev => new Set([...prev, b.id])));
  };

  const handleSave = () => {
    if (isPaid && !paidWarningShown) { setPaidWarningShown(true); return; }
    onSave(Array.from(linkedIds), liveTotal);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Edit Trips — {statement?.statement_number}</DialogTitle>
        </DialogHeader>

        {isPaid && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{paidWarningShown ? 'Click Save again to confirm.' : 'This statement is marked Paid. Changes will affect totals.'}</span>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Currently Linked Trips</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {stmtBookings.map(b => {
              const t = calcBookingTotals(b);
              const isKept = linkedIds.has(b.id);
              return (
                <label key={b.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer ${isKept ? 'bg-secondary/50' : 'bg-red-500/10 opacity-60'}`}>
                  <Checkbox checked={isKept} onCheckedChange={() => toggleRemove(b.id)} />
                  <span className="font-mono text-xs text-primary">{formatConfNumber(b.confirmation_number)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(b.pickup_date)}</span>
                  <span className="text-xs flex-1 truncate">{b.primary_passenger_name}</span>
                  <span className="font-mono text-xs">{formatCurrency(t.vendorTotal)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Available Trips to Add</h4>
          <div className="flex gap-2 items-end mb-2 flex-wrap">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
            </div>
            <Button variant="outline" size="sm" onClick={selectAllInRange} className="text-xs">Select All in Range</Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredAvailable.length === 0 && <p className="text-xs text-muted-foreground p-2">No available trips for this vendor.</p>}
            {filteredAvailable.map(b => {
              const t = calcBookingTotals(b);
              return (
                <label key={b.id} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-secondary/50">
                  <Checkbox checked={false} onCheckedChange={() => toggleAdd(b.id)} />
                  <span className="font-mono text-xs text-primary">{formatConfNumber(b.confirmation_number)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(b.pickup_date)}</span>
                  <span className="text-xs flex-1 truncate">{b.primary_passenger_name}</span>
                  <span className="font-mono text-xs">{formatCurrency(t.vendorTotal)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-3 flex justify-end">
          <div className="space-y-1 text-sm min-w-40">
            <div className="flex justify-between font-bold text-base"><span>Total:</span><span className="font-mono">{formatCurrency(liveTotal)}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            {isPaid && !paidWarningShown ? 'Save (affects paid total)' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}