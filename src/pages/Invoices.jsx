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
import { useAppSettings } from '@/lib/useAppSettings';
import { Plus, FileText } from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextInvoiceNumber, settings } = useAppSettings();

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-invoice_date', 200) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  // Ready to invoice: completed bookings without invoice_id, grouped by account
  const readyBookings = useMemo(() => {
    const groups = {};
    bookings.filter(b => b.status === 'Completed' && !b.invoice_id).forEach(b => {
      if (!groups[b.account_id]) groups[b.account_id] = [];
      groups[b.account_id].push(b);
    });
    return groups;
  }, [bookings]);

  const [pickModal, setPickModal] = useState(null); // account_id
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  const openPicker = (accountId) => {
    setPickModal(accountId);
    setSelected(readyBookings[accountId]?.map(b => b.id) || []);
  };

  const toggleBooking = (bookingId) => {
    setSelected(prev => prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]);
  };

  const createInvoice = async () => {
    setCreating(true);
    const invoiceNumber = await getNextInvoiceNumber();
    const selectedBookings = readyBookings[pickModal]?.filter(b => selected.includes(b.id)) || [];
    const acc = accountMap[pickModal];

    let subtotal = 0;
    let vatTotal = 0;
    selectedBookings.forEach(b => {
      const t = calcBookingTotals(b);
      subtotal += t.clientNet;
      vatTotal += t.clientVat;
    });

    const dueOffset = acc?.payment_terms === 'Net 30' ? 30 : acc?.payment_terms === 'Net 15' ? 15 : 0;
    const now = new Date();
    const dueDate = new Date(now.getTime() + dueOffset * 86400000).toISOString().split('T')[0];

    const inv = await base44.entities.Invoice.create({
      invoice_number: invoiceNumber,
      invoice_date: now.toISOString().split('T')[0],
      due_date: dueDate,
      account_id: pickModal,
      booking_ids: selected,
      subtotal, vat_total: vatTotal, grand_total: subtotal + vatTotal,
      paid_amount: 0, payment_status: 'Pending',
    });

    // Link bookings to invoice
    for (const bId of selected) {
      await base44.entities.Booking.update(bId, { invoice_id: inv.id });
    }

    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setPickModal(null);
    setCreating(false);
    navigate(`/invoices/${inv.id}`);
  };

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '—';
    return companyMap[acc.company_id]?.company_name || acc.contact_name;
  };

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`} />

      {/* Ready to Invoice */}
      {Object.keys(readyBookings).length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-serif italic text-foreground mb-3">Ready to Invoice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(readyBookings).map(([accountId, trips]) => {
              const total = trips.reduce((s, b) => s + (calcBookingTotals(b).clientTotal), 0);
              return (
                <button key={accountId} onClick={() => openPicker(accountId)} className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 transition-colors">
                  <p className="text-sm font-medium text-foreground">{getClientName(accountId)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{trips.length} trips</p>
                  <p className="text-lg font-mono font-bold text-primary mt-2">{formatCurrency(total)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All Invoices */}
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice #</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right hidden md:table-cell">Paid</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td className="px-4 py-3 font-mono text-primary">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-foreground">{formatDate(inv.invoice_date)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{getClientName(inv.account_id)}</td>
                <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(inv.grand_total)}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground hidden md:table-cell">{formatCurrency(inv.paid_amount)}</td>
                <td className="px-4 py-3"><StatusPill status={inv.payment_status} size="xs" /></td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No invoices yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cherry-pick Modal */}
      <Dialog open={!!pickModal} onOpenChange={() => setPickModal(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif italic">Select Trips to Invoice — {getClientName(pickModal)}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {(readyBookings[pickModal] || []).map(b => (
              <label key={b.id} className="flex items-center gap-3 px-2 py-3 hover:bg-secondary/50 cursor-pointer">
                <Checkbox checked={selected.includes(b.id)} onCheckedChange={() => toggleBooking(b.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground">{formatConfNumber(b.confirmation_number)} — {formatDate(b.pickup_date)}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.primary_passenger_name} · {b.pickup_location} → {b.dropoff_location}</p>
                </div>
                <span className="font-mono text-sm text-foreground">{formatCurrency(calcBookingTotals(b).clientTotal)}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickModal(null)}>Cancel</Button>
            <Button onClick={createInvoice} disabled={selected.length === 0 || creating} className="bg-primary text-primary-foreground">
              <FileText className="w-4 h-4 mr-1" /> Create Invoice ({selected.length} trips)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}