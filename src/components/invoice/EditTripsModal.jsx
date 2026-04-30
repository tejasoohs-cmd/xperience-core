import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';
import { AlertCircle } from 'lucide-react';

export default function EditTripsModal({ open, onClose, invoice, invBookings, allBookings, onSave }) {
  const isPaid = invoice?.payment_status === 'Paid';
  const [paidWarningShown, setPaidWarningShown] = useState(false);

  // IDs currently linked
  const [linkedIds, setLinkedIds] = useState(new Set(invoice?.booking_ids || []));

  // Date range filter for available trips
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (open) {
      setLinkedIds(new Set(invoice?.booking_ids || []));
      setPaidWarningShown(false);
      setDateFrom('');
      setDateTo('');
    }
  }, [open, invoice]);

  // Available = completed, same account, not on any invoice (or on this invoice)
  const availableBookings = useMemo(() => {
    return allBookings.filter(b =>
      b.account_id === invoice?.account_id &&
      b.status === 'Completed' &&
      (!b.invoice_id || b.invoice_id === invoice?.id) &&
      !linkedIds.has(b.id)
    );
  }, [allBookings, invoice, linkedIds]);

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

  const liveTotals = useMemo(() => {
    let subtotal = 0;
    currentLinkedBookings.forEach(b => {
      const t = calcBookingTotals(b);
      subtotal += t.clientNet;
    });
    const vatPercent = invBookings[0]?.client_vat_percent ?? 5;
    const vat = subtotal * (vatPercent / 100);
    return { subtotal, vat, grand: subtotal + vat };
  }, [currentLinkedBookings, invBookings]);

  const toggleRemove = (bookingId) => {
    setLinkedIds(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const toggleAdd = (bookingId) => {
    setLinkedIds(prev => {
      const next = new Set(prev);
      next.add(bookingId);
      return next;
    });
  };

  const selectAllInRange = () => {
    filteredAvailable.forEach(b => {
      setLinkedIds(prev => new Set([...prev, b.id]));
    });
  };

  const handleSave = () => {
    if (isPaid && !paidWarningShown) {
      setPaidWarningShown(true);
      return;
    }
    onSave(Array.from(linkedIds), liveTotals);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Edit Trips — {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>

        {isPaid && paidWarningShown && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>This invoice has been paid. Editing will change totals. Click Save again to confirm.</span>
          </div>
        )}
        {isPaid && !paidWarningShown && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>This invoice is marked Paid. Changes will affect totals.</span>
          </div>
        )}

        {/* Currently Linked */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Currently Linked Trips</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {invBookings.map(b => {
              const t = calcBookingTotals(b);
              const isKept = linkedIds.has(b.id);
              return (
                <label key={b.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer ${isKept ? 'bg-secondary/50' : 'bg-red-500/10 opacity-60'}`}>
                  <Checkbox checked={isKept} onCheckedChange={() => toggleRemove(b.id)} />
                  <span className="font-mono text-xs text-primary">{formatConfNumber(b.confirmation_number)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(b.pickup_date)}</span>
                  <span className="text-xs flex-1 truncate">{b.primary_passenger_name || b.booker_name}</span>
                  <span className="font-mono text-xs">{formatCurrency(t.clientNet)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Available Trips */}
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
            {filteredAvailable.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No available trips for this client.</p>
            )}
            {filteredAvailable.map(b => {
              const t = calcBookingTotals(b);
              return (
                <label key={b.id} className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-secondary/50">
                  <Checkbox checked={false} onCheckedChange={() => toggleAdd(b.id)} />
                  <span className="font-mono text-xs text-primary">{formatConfNumber(b.confirmation_number)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(b.pickup_date)}</span>
                  <span className="text-xs flex-1 truncate">{b.primary_passenger_name || b.booker_name}</span>
                  <span className="font-mono text-xs">{formatCurrency(t.clientNet)}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Live Totals */}
        <div className="border-t border-border pt-3">
          <div className="flex justify-end">
            <div className="space-y-1 text-sm min-w-40">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span className="font-mono">{formatCurrency(liveTotals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT:</span><span className="font-mono">{formatCurrency(liveTotals.vat)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total:</span><span className="font-mono">{formatCurrency(liveTotals.grand)}</span></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">
            {isPaid && !paidWarningShown ? 'Save (will affect paid total)' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}