import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { useAppSettings } from '@/lib/useAppSettings';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';
import { ArrowLeft, Printer, Trash2, Save } from 'lucide-react';

export default function StatementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();

  const { data: stmtArr = [] } = useQuery({ queryKey: ['statement', id], queryFn: () => base44.entities.VendorStatement.filter({ id }) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });

  const stmt = stmtArr[0];
  const affiliate = useMemo(() => affiliates.find(a => a.id === stmt?.affiliate_id), [affiliates, stmt]);
  const stmtBookings = useMemo(() => bookings.filter(b => (stmt?.booking_ids || []).includes(b.id)), [bookings, stmt]);

  const [payment, setPayment] = useState({});
  const [stmtDate, setStmtDate] = useState('');
  const [dateSaving, setDateSaving] = useState(false);

  useEffect(() => {
    if (stmt) {
      setPayment({
        paid_amount: stmt.paid_amount || 0, payment_status: stmt.payment_status || 'Pending',
        payment_date: stmt.payment_date || '', payment_reference: stmt.payment_reference || '',
        payment_method: stmt.payment_method || '',
      });
      setStmtDate(stmt.date || '');
    }
  }, [stmt]);

  const savePayment = async () => {
    await base44.entities.VendorStatement.update(id, payment);
    queryClient.invalidateQueries({ queryKey: ['statement', id] });
    queryClient.invalidateQueries({ queryKey: ['statements'] });
  };

  const saveDate = async () => {
    setDateSaving(true);
    await base44.entities.VendorStatement.update(id, { date: stmtDate });
    queryClient.invalidateQueries({ queryKey: ['statement', id] });
    queryClient.invalidateQueries({ queryKey: ['statements'] });
    setDateSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this statement? Linked bookings will be unlinked.')) return;
    for (const bId of (stmt.booking_ids || [])) {
      await base44.entities.Booking.update(bId, { statement_id: null });
    }
    await base44.entities.VendorStatement.delete(id);
    queryClient.invalidateQueries({ queryKey: ['statements'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    navigate('/statements');
  };

  if (!stmt) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader
        title={stmt.statement_number}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/statements')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
          </div>
        }
      />

      {/* Editable Date (no-print) */}
      <div className="no-print mb-4 bg-card rounded-lg border border-border p-4 flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Statement Date</Label>
          <Input type="date" value={stmtDate} onChange={e => setStmtDate(e.target.value)} className="bg-secondary border-border" />
        </div>
        <Button onClick={saveDate} disabled={dateSaving} variant="outline" size="sm">
          <Save className="w-4 h-4 mr-1" /> {dateSaving ? 'Saving...' : 'Save Date'}
        </Button>
        <span className="text-xs text-muted-foreground self-center">Statement # <span className="font-mono text-foreground">{stmt.statement_number}</span> is immutable</span>
      </div>

      {/* Printable Statement - shows VENDOR amounts only */}
      <div className="bg-white text-black rounded-lg p-6 md:p-10 print:p-0 print:shadow-none">
        <div className="flex justify-between items-start mb-8">
          <div>
            {settings.company_logo_url && <img src={settings.company_logo_url} alt="Logo" className="h-12 mb-2" />}
            <p className="font-bold text-lg">{settings.company_name}</p>
            <p className="text-sm text-gray-600">{settings.company_address}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-lg">VENDOR STATEMENT</p>
            <p>Statement #: <span className="font-mono">{stmt.statement_number}</span></p>
            <p>Date: {formatDate(stmtDate || stmt.date)}</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vendor</p>
          <p className="font-bold">{affiliate?.name || '—'}</p>
          {affiliate?.address && <p className="text-sm text-gray-600">{affiliate.address}</p>}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2 text-left text-xs font-medium text-gray-500">Conf# / Service</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">PU Date</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Passenger</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Route</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {stmtBookings.map(b => {
              const t = calcBookingTotals(b);
              return (
                <tr key={b.id} className="border-b border-gray-200">
                  <td className="py-2"><span className="font-mono">{formatConfNumber(b.confirmation_number)}</span><br /><span className="text-xs text-gray-500">{b.service_type}</span></td>
                  <td className="py-2">{formatDate(b.pickup_date)}</td>
                  <td className="py-2">{b.primary_passenger_name || '—'}</td>
                  <td className="py-2 text-xs">{b.pickup_location} → {b.dropoff_location}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(t.vendorTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-48">
            <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-800">
              <span>Total:</span><span className="font-mono">{formatCurrency(stmt.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Tracking */}
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
            <Input value={payment.payment_method} onChange={e => setPayment(p => ({ ...p, payment_method: e.target.value }))} className="bg-secondary border-border" placeholder="Bank/Cash" />
          </div>
        </div>
        <Button onClick={savePayment} className="mt-4 bg-primary text-primary-foreground"><Save className="w-4 h-4 mr-1" /> Save Payment</Button>
      </div>
    </div>
  );
}