import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';
import { exportStatementsToCsv } from '@/lib/excelExport';
import { useAppSettings } from '@/lib/useAppSettings';
import { FileText, Download } from 'lucide-react';

export default function VendorStatements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextStatementNumber } = useAppSettings();

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: statements = [] } = useQuery({ queryKey: ['statements'], queryFn: () => base44.entities.VendorStatement.list('-date', 200) });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });

  const affiliateMap = useMemo(() => Object.fromEntries(affiliates.map(a => [a.id, a])), [affiliates]);

  const readyBookings = useMemo(() => {
    const groups = {};
    bookings.filter(b => b.status === 'Completed' && b.driver_source === 'FarmOut' && b.affiliate_id && !b.statement_id).forEach(b => {
      if (!groups[b.affiliate_id]) groups[b.affiliate_id] = [];
      groups[b.affiliate_id].push(b);
    });
    return groups;
  }, [bookings]);

  const [pickModal, setPickModal] = useState(null);
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  const openPicker = (affiliateId) => {
    setPickModal(affiliateId);
    setSelected(readyBookings[affiliateId]?.map(b => b.id) || []);
  };

  const toggleBooking = (bookingId) => {
    setSelected(prev => prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]);
  };

  const createStatement = async () => {
    setCreating(true);
    const stmtNumber = await getNextStatementNumber();
    const selectedBookings = readyBookings[pickModal]?.filter(b => selected.includes(b.id)) || [];
    const total = selectedBookings.reduce((s, b) => s + (calcBookingTotals(b).vendorTotal), 0);

    const stmt = await base44.entities.VendorStatement.create({
      statement_number: stmtNumber,
      date: new Date().toISOString().split('T')[0],
      affiliate_id: pickModal,
      booking_ids: selected,
      total, paid_amount: 0, payment_status: 'Pending',
    });

    for (const bId of selected) {
      await base44.entities.Booking.update(bId, { statement_id: stmt.id });
    }

    queryClient.invalidateQueries({ queryKey: ['statements'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setPickModal(null);
    setCreating(false);
    navigate(`/statements/${stmt.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Vendor Statements"
        subtitle={`${statements.length} statements`}
        actions={
          <Button variant="outline" onClick={() => exportStatementsToCsv(statements, affiliateMap)}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        }
      />

      {Object.keys(readyBookings).length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-serif italic text-foreground mb-3">Ready to Pay</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(readyBookings).map(([affId, trips]) => {
              const total = trips.reduce((s, b) => s + (calcBookingTotals(b).vendorTotal), 0);
              return (
                <button key={affId} onClick={() => openPicker(affId)} className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 transition-colors">
                  <p className="text-sm font-medium text-foreground">{affiliateMap[affId]?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{trips.length} trips</p>
                  <p className="text-lg font-mono font-bold text-primary mt-2">{formatCurrency(total)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statement #</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Affiliate</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {statements.map(s => (
              <tr key={s.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/statements/${s.id}`)}>
                <td className="px-4 py-3 font-mono text-primary">{s.statement_number}</td>
                <td className="px-4 py-3 text-foreground">{formatDate(s.date)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{affiliateMap[s.affiliate_id]?.name || '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(s.total)}</td>
                <td className="px-4 py-3"><StatusPill status={s.payment_status} size="xs" /></td>
              </tr>
            ))}
            {statements.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No statements yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!pickModal} onOpenChange={() => setPickModal(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif italic">Select Trips — {affiliateMap[pickModal]?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {(readyBookings[pickModal] || []).map(b => (
              <label key={b.id} className="flex items-center gap-3 px-2 py-3 hover:bg-secondary/50 cursor-pointer">
                <Checkbox checked={selected.includes(b.id)} onCheckedChange={() => toggleBooking(b.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground">{formatConfNumber(b.confirmation_number)} — {formatDate(b.pickup_date)}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.primary_passenger_name}</p>
                </div>
                <span className="font-mono text-sm text-foreground">{formatCurrency(calcBookingTotals(b).vendorTotal)}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickModal(null)}>Cancel</Button>
            <Button onClick={createStatement} disabled={selected.length === 0 || creating} className="bg-primary text-primary-foreground">
              <FileText className="w-4 h-4 mr-1" /> Create Statement ({selected.length} trips)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}