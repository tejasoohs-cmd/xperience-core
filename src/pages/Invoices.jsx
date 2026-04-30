import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals, getDaysOverdue } from '@/lib/formatters';
import { exportInvoicesToCsv } from '@/lib/excelExport';
import { useAppSettings } from '@/lib/useAppSettings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Download } from 'lucide-react';
import { logActivity } from '@/lib/activityLog';

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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applyCredit, setApplyCredit] = useState(false);
  const [creditPromptDone, setCreditPromptDone] = useState(false);

  const openPicker = (accountId) => {
    setPickModal(accountId);
    setSelected(readyBookings[accountId]?.map(b => b.id) || []);
    setDateFrom('');
    setDateTo('');
    setApplyCredit(false);
    setCreditPromptDone(false);
  };

  const pickerBookings = useMemo(() => {
    const all = readyBookings[pickModal] || [];
    if (!dateFrom && !dateTo) return all;
    return all.filter(b => {
      if (dateFrom && b.pickup_date < dateFrom) return false;
      if (dateTo && b.pickup_date > dateTo) return false;
      return true;
    });
  }, [readyBookings, pickModal, dateFrom, dateTo]);

  const toggleBooking = (bookingId) => {
    setSelected(prev => prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]);
  };

  const selectAllInRange = () => {
    const ids = pickerBookings.map(b => b.id);
    setSelected(prev => Array.from(new Set([...prev, ...ids])));
  };

  const selectedBookingsList = useMemo(() => (readyBookings[pickModal] || []).filter(b => selected.includes(b.id)), [readyBookings, pickModal, selected]);

  const liveTotals = useMemo(() => {
    let subtotal = 0, vatTotal = 0;
    selectedBookingsList.forEach(b => {
      const t = calcBookingTotals(b);
      subtotal += t.clientNet;
      vatTotal += t.clientVat;
    });
    return { subtotal, vatTotal, grand: subtotal + vatTotal };
  }, [selectedBookingsList]);

  const accountCredit = accountMap[pickModal]?.client_credit_balance || 0;
  const creditToApply = applyCredit ? Math.min(accountCredit, liveTotals.grand) : 0;

  const createInvoice = async () => {
    setCreating(true);
    const invoiceNumber = await getNextInvoiceNumber();
    const acc = accountMap[pickModal];

    const dueOffset = acc?.payment_terms === 'Net 30' ? 30 : acc?.payment_terms === 'Net 15' ? 15 : 0;
    const now = new Date();
    const dueDate = new Date(now.getTime() + dueOffset * 86400000).toISOString().split('T')[0];

    const grandAfterCredit = liveTotals.grand - creditToApply;

    const inv = await base44.entities.Invoice.create({
      invoice_number: invoiceNumber,
      invoice_date: now.toISOString().split('T')[0],
      due_date: dueDate,
      account_id: pickModal,
      booking_ids: selected,
      subtotal: liveTotals.subtotal,
      vat_total: liveTotals.vatTotal,
      grand_total: grandAfterCredit,
      paid_amount: 0,
      payment_status: 'Pending',
      notes: creditToApply > 0 ? `Client credit of AED ${creditToApply.toFixed(2)} applied.` : undefined,
    });

    for (const bId of selected) {
      await base44.entities.Booking.update(bId, { invoice_id: inv.id });
    }

    if (creditToApply > 0) {
      const newBalance = accountCredit - creditToApply;
      await base44.entities.Account.update(pickModal, { client_credit_balance: newBalance });
      await logActivity({
        action_type: 'credit_applied',
        entity_type: 'invoice',
        entity_id: inv.id,
        entity_label: invoiceNumber,
        message: `AED ${creditToApply.toFixed(2)} credit applied to ${invoiceNumber} for ${acc?.contact_name || pickModal}`,
      });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }

    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setPickModal(null);
    setCreating(false);
    navigate(`/invoices/${inv.id}`);
  };

  // Show credit prompt before creating if not yet acknowledged
  const handleCreateClick = () => {
    if (accountCredit > 0 && !creditPromptDone) {
      setCreditPromptDone(true); // show the prompt section inline
      return;
    }
    createInvoice();
  };

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '—';
    return companyMap[acc.company_id]?.company_name || acc.contact_name;
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices`}
        actions={
          <Button variant="outline" onClick={() => exportInvoicesToCsv(invoices, accountMap, companyMap)}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        }
      />

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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusPill status={inv.payment_status} size="xs" />
                    {inv.payment_status !== 'Paid' && getDaysOverdue(inv.due_date) > 0 && (
                      <span className="text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{getDaysOverdue(inv.due_date)}d overdue</span>
                    )}
                  </div>
                </td>
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

          {/* Date range filter */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[110px]">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-border font-mono text-xs h-8" />
            </div>
            <div className="flex-1 min-w-[110px]">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-border font-mono text-xs h-8" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllInRange}>
              Select All in Range
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border border border-border rounded-md">
            {pickerBookings.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No trips in this range</p>
            )}
            {pickerBookings.map(b => (
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

          {/* Live totals */}
          <div className="flex justify-between items-center text-sm border-t border-border pt-2">
            <span className="text-muted-foreground">{selected.length} trip{selected.length !== 1 ? 's' : ''} selected</span>
            <span className="font-mono font-semibold text-foreground">{formatCurrency(liveTotals.grand)}</span>
          </div>

          {/* Credit prompt */}
          {creditPromptDone && accountCredit > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 space-y-2">
              <p className="text-sm text-amber-400 font-medium">This client has <span className="font-mono">AED {accountCredit.toFixed(2)}</span> available credit.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={`text-xs border-amber-500/50 ${applyCredit ? 'bg-amber-500/20 text-amber-300' : 'text-muted-foreground'}`} onClick={() => setApplyCredit(true)}>
                  Yes — Apply AED {Math.min(accountCredit, liveTotals.grand).toFixed(2)}
                </Button>
                <Button size="sm" variant="outline" className={`text-xs ${!applyCredit ? 'bg-secondary' : 'text-muted-foreground'}`} onClick={() => setApplyCredit(false)}>
                  No — Skip
                </Button>
              </div>
              {applyCredit && (
                <p className="text-xs text-muted-foreground">Invoice total after credit: <span className="font-mono text-foreground">{formatCurrency(liveTotals.grand - creditToApply)}</span></p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickModal(null)}>Cancel</Button>
            <Button onClick={handleCreateClick} disabled={selected.length === 0 || creating} className="bg-primary text-primary-foreground">
              <FileText className="w-4 h-4 mr-1" />
              {creditPromptDone ? `Create Invoice${applyCredit ? ' with Credit' : ''}` : `Create Invoice (${selected.length} trips)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}