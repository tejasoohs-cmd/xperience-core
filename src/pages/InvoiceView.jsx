import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { useAppSettings } from '@/lib/useAppSettings';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';
import { ArrowLeft, Printer, Trash2, Save } from 'lucide-react';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();

  const { data: invoiceArr = [] } = useQuery({ queryKey: ['invoice', id], queryFn: () => base44.entities.Invoice.filter({ id }) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });

  const inv = invoiceArr[0];
  const account = useMemo(() => accounts.find(a => a.id === inv?.account_id), [accounts, inv]);
  const company = useMemo(() => companies.find(c => c.id === account?.company_id), [companies, account]);
  const invBookings = useMemo(() => bookings.filter(b => (inv?.booking_ids || []).includes(b.id)), [bookings, inv]);
  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);

  const [payment, setPayment] = useState({});
  const [dates, setDates] = useState({ invoice_date: '', due_date: '' });
  const [datesSaving, setDatesSaving] = useState(false);

  useEffect(() => {
    if (inv) {
      setPayment({
        paid_amount: inv.paid_amount || 0,
        payment_status: inv.payment_status || 'Pending',
        payment_date: inv.payment_date || '',
        payment_reference: inv.payment_reference || '',
        payment_method: inv.payment_method || '',
      });
      setDates({ invoice_date: inv.invoice_date || '', due_date: inv.due_date || '' });
    }
  }, [inv]);

  const savePayment = async () => {
    await base44.entities.Invoice.update(id, payment);
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const saveDates = async () => {
    setDatesSaving(true);
    await base44.entities.Invoice.update(id, dates);
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setDatesSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? Linked bookings will be unlinked.')) return;
    for (const bId of (inv.booking_ids || [])) {
      await base44.entities.Booking.update(bId, { invoice_id: null });
    }
    await base44.entities.Invoice.delete(id);
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    navigate('/invoices');
  };

  if (!inv) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  // Use live dates state for PDF rendering
  const displayDate = dates.invoice_date || inv.invoice_date;
  const displayDueDate = dates.due_date || inv.due_date;

  return (
    <div>
      <PageHeader
        title={inv.invoice_number}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`/print/invoice/${id}`, '_blank')}><Printer className="w-4 h-4 mr-1" /> Print Invoice</Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
          </div>
        }
      />

      {/* Editable Date Controls (no-print) */}
      <div className="no-print mb-4 bg-card rounded-lg border border-border p-4 flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Invoice Date</Label>
          <Input type="date" value={dates.invoice_date} onChange={e => setDates(d => ({ ...d, invoice_date: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <Input type="date" value={dates.due_date} onChange={e => setDates(d => ({ ...d, due_date: e.target.value }))} className="bg-secondary border-border" />
        </div>
        <Button onClick={saveDates} disabled={datesSaving} variant="outline" size="sm">
          <Save className="w-4 h-4 mr-1" /> {datesSaving ? 'Saving...' : 'Save Dates'}
        </Button>
        <span className="text-xs text-muted-foreground self-center">Invoice # <span className="font-mono text-foreground">{inv.invoice_number}</span> is immutable</span>
      </div>

      {/* Printable Invoice */}
      <div className="bg-white text-black rounded-lg p-6 md:p-10 print:p-0 print:shadow-none" id="invoice-print">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {settings.company_logo_url && <img src={settings.company_logo_url} alt="Logo" className="h-12 mb-2" />}
            <p className="font-bold text-lg">{settings.company_name}</p>
            <p className="text-sm text-gray-600">{settings.company_address}</p>
            {settings.company_tax_id && <p className="text-sm text-gray-600">TRN: {settings.company_tax_id}</p>}
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-lg">SALES INVOICE</p>
            <p>Invoice #: <span className="font-mono">{inv.invoice_number}</span></p>
            <p>Date: {formatDate(displayDate)}</p>
            <p>Terms: {account?.payment_terms || 'Due Upon Receipt'}</p>
            <p>Due: {formatDate(displayDueDate)}</p>
          </div>
        </div>

        {/* Invoice To */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Invoice To</p>
          <p className="font-bold">{company?.company_name || account?.contact_name || '—'}</p>
          {company?.billing_address && <p className="text-sm text-gray-600">{company.billing_address}</p>}
          {company?.tax_id && <p className="text-sm text-gray-600">TRN: {company.tax_id}</p>}
        </div>

        {/* Line Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2 text-left text-xs font-medium text-gray-500">Conf# / Service</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">PU Date / Time</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Passenger / Booker</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Vehicle / Driver</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Ref / Route</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500">NET</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500">VAT</th>
            </tr>
          </thead>
          <tbody>
            {invBookings.map(b => {
              const t = calcBookingTotals(b);
              const vt = vtMap[b.vehicle_type_id];
              const driver = driverMap[b.driver_id];
              return (
                <tr key={b.id} className="border-b border-gray-200">
                  <td className="py-2">
                    <span className="font-mono">{formatConfNumber(b.confirmation_number)}</span>
                    <br /><span className="text-xs text-gray-500">{b.service_type}</span>
                  </td>
                  <td className="py-2">{formatDate(b.pickup_date)}<br /><span className="font-mono text-xs">{b.pickup_time}</span></td>
                  <td className="py-2">{b.primary_passenger_name}<br /><span className="text-xs text-gray-500">{b.booker_name}</span></td>
                  <td className="py-2">{vt?.name || '—'}<br /><span className="text-xs text-gray-500">{driver?.name || '—'}</span></td>
                  <td className="py-2 text-xs">{b.po_client_ref || '—'}<br /><span className="text-gray-500">{b.pickup_location} → {b.dropoff_location}</span></td>
                  <td className="py-2 text-right font-mono">{formatCurrency(t.clientNet)}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(t.clientVat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-1 text-sm"><span>Subtotal:</span><span className="font-mono">{formatCurrency(inv.subtotal)}</span></div>
            <div className="flex justify-between py-1 text-sm"><span>VAT:</span><span className="font-mono">{formatCurrency(inv.vat_total)}</span></div>
            <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-800 mt-1">
              <span>Total:</span><span className="font-mono">{formatCurrency(inv.grand_total)}</span>
            </div>
            {inv.paid_amount > 0 && (
              <div className="flex justify-between py-1 text-sm text-gray-600"><span>Paid:</span><span className="font-mono">{formatCurrency(inv.paid_amount)}</span></div>
            )}
          </div>
        </div>

        {/* Bank / Footer */}
        {settings.bank_details && (
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-600">
            <p className="font-medium mb-1">Bank Details:</p>
            <p style={{ whiteSpace: 'pre-line' }}>{settings.bank_details}</p>
          </div>
        )}
        {settings.invoice_footer_notes && (
          <p className="mt-3 text-xs text-gray-500 italic">{settings.invoice_footer_notes}</p>
        )}
      </div>

      {/* Payment Tracking (no-print) */}
      <div className="no-print mt-6 bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-serif italic text-foreground mb-4">Payment Tracking</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={payment.payment_status} onValueChange={v => setPayment(p => ({ ...p, payment_status: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Paid Amount</Label>
            <Input type="number" step="0.01" value={payment.paid_amount} onChange={e => setPayment(p => ({ ...p, paid_amount: parseFloat(e.target.value) || 0 }))} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={payment.payment_date} onChange={e => setPayment(p => ({ ...p, payment_date: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reference</Label>
            <Input value={payment.payment_reference} onChange={e => setPayment(p => ({ ...p, payment_reference: e.target.value }))} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Method</Label>
            <Input value={payment.payment_method} onChange={e => setPayment(p => ({ ...p, payment_method: e.target.value }))} className="bg-secondary border-border" placeholder="Bank/Cash/Check" />
          </div>
        </div>
        <Button onClick={savePayment} className="mt-4 bg-primary text-primary-foreground"><Save className="w-4 h-4 mr-1" /> Save Payment</Button>
      </div>
    </div>
  );
}