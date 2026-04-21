import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import PricingSummary from '@/components/booking/PricingSummary';
import BookingParser from '@/components/booking/BookingParser';
import { useAppSettings } from '@/lib/useAppSettings';
import { calcBookingTotals, formatCurrency, formatDate } from '@/lib/formatters';
import { logActivity } from '@/lib/activityLog';
import { Save, ArrowLeft, Send, CheckCircle, XCircle, ArrowRight, Printer, Plus, Trash2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function QuoteForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextQuoteNumber, getNextBookingNumber, settings } = useAppSettings();

  const [form, setForm] = useState({
    status: 'Draft', currency: 'AED',
    client_vat_percent: 5, passenger_count: 1, luggage_count: 0,
    client_base_rate: 0, client_extras: [],
    quote_date: new Date().toISOString().split('T')[0],
    expiry_date: addDays(new Date(), 30).toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => base44.entities.Quote.filter({ id }),
    enabled: !isNew,
  });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));

  useEffect(() => {
    if (!isNew && existing?.length > 0) setForm(existing[0]);
  }, [existing, isNew]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleParserApply = (parsedData) => {
    setForm(prev => ({ ...prev, ...parsedData }));
  };

  const totals = calcBookingTotals(form);

  const handleSave = async (status = form.status) => {
    setSaving(true);
    const data = { ...form, status, client_total: totals.clientTotal };
    if (isNew) {
      const qNum = await getNextQuoteNumber();
      data.quote_number = qNum;
      const created = await base44.entities.Quote.create(data);
      await logActivity({ action_type: 'created', entity_type: 'quote', entity_id: created.id, entity_label: qNum, message: `Quote ${qNum} created` });
    } else {
      const { id: _id, created_date, updated_date, created_by, ...updateData } = data;
      await base44.entities.Quote.update(id, updateData);
      if (status !== form.status) {
        await logActivity({ action_type: status === 'Sent' ? 'sent' : 'updated', entity_type: 'quote', entity_id: id, entity_label: form.quote_number, message: `Quote ${form.quote_number} ${status === 'Sent' ? 'marked as sent' : 'updated'}` });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    setSaving(false);
    navigate('/quotes');
  };

  const handleConvert = async () => {
    if (!confirm('Convert this quote to a booking?')) return;
    setSaving(true);
    const confNum = await getNextBookingNumber();
    const bookingData = {
      confirmation_number: confNum, status: 'New',
      service_type: form.service_type,
      pickup_date: form.pickup_date, pickup_time: form.pickup_time,
      pickup_location: form.pickup_location, dropoff_location: form.dropoff_location,
      vehicle_type_id: form.vehicle_type_id,
      passenger_count: form.passenger_count, luggage_count: form.luggage_count,
      primary_passenger_name: form.primary_passenger_name,
      primary_passenger_phone: form.primary_passenger_phone,
      primary_passenger_email: form.primary_passenger_email,
      account_id: form.account_id, booker_name: form.booker_name,
      po_client_ref: form.po_client_ref,
      flight_number: form.flight_number, flight_schedule_time: form.flight_schedule_time,
      client_base_rate: form.client_base_rate, client_extras: form.client_extras,
      client_vat_percent: form.client_vat_percent,
      client_total: totals.clientTotal, vendor_base_rate: 0, vendor_total: 0, profit: totals.clientTotal,
      trip_notes: form.notes, driver_source: 'InHouse', currency: 'AED',
    };
    const booking = await base44.entities.Booking.create(bookingData);
    await base44.entities.Quote.update(id, { status: 'Converted', converted_booking_id: booking.id });
    await logActivity({ action_type: 'converted_to_booking', entity_type: 'quote', entity_id: id, entity_label: form.quote_number, message: `Quote ${form.quote_number} converted to booking XT-${confNum}` });
    queryClient.invalidateQueries({ queryKey: ['quotes', 'bookings', 'activityLog'] });
    setSaving(false);
    navigate(`/bookings/${booking.id}`);
  };

  const isConverted = form.status === 'Converted';
  const canEdit = !isConverted;

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Quote' : `Quote ${form.quote_number || ''}`}
        subtitle={isConverted ? `Converted to booking` : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/quotes')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
                {!isNew && form.status === 'Draft' && (
                  <Button variant="outline" size="sm" onClick={() => handleSave('Sent')}>
                    <Send className="w-4 h-4 mr-1" /> Mark Sent
                  </Button>
                )}
                {!isNew && form.status === 'Sent' && (
                  <>
                    <Button variant="outline" size="sm" className="text-emerald-400" onClick={() => handleSave('Accepted')}><CheckCircle className="w-4 h-4 mr-1" /> Accept</Button>
                    <Button variant="outline" size="sm" className="text-red-400" onClick={() => handleSave('Rejected')}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                  </>
                )}
                {!isNew && form.status === 'Accepted' && (
                  <Button onClick={handleConvert} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
                    <ArrowRight className="w-4 h-4 mr-1" /> Convert to Booking
                  </Button>
                )}
                <Button onClick={() => handleSave()} disabled={saving} className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* AI Parser */}
      {canEdit && (
        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Smart Quote Parser</p>
            <p className="text-xs text-muted-foreground">Paste an enquiry email or WhatsApp message to auto-fill</p>
          </div>
          <BookingParser
            onApply={handleParserApply}
            accounts={accounts} companies={companies} affiliates={affiliates}
            vehicleTypes={vehicleTypes} serviceTypes={settings.service_types_list}
          />
        </div>
      )}

      {/* Pricing Summary */}
      <PricingSummary form={form} />

      {/* Quote Form */}
      <div className="mt-6 space-y-8">
        {/* Header Fields */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Quote Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label className="text-xs text-muted-foreground">Quote #</Label><Input value={form.quote_number || 'Auto'} readOnly className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Quote Date</Label><Input type="date" value={form.quote_date || ''} onChange={e => set('quote_date', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Expiry Date</Label><Input type="date" value={form.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Status</Label><Input value={form.status || 'Draft'} readOnly className="bg-secondary border-border" /></div>
          </div>
        </section>

        {/* Client */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Client</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Account * (dropdown only)</Label>
              <Select value={form.account_id || ''} onValueChange={v => set('account_id', v)} disabled={!canEdit}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.status === 'active').map(a => {
                    const comp = companyMap[a.company_id];
                    return <SelectItem key={a.id} value={a.id}>{comp?.company_name || ''} — {a.contact_name} ({a.account_number})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-muted-foreground">Booker Name</Label><Input value={form.booker_name || ''} onChange={e => set('booker_name', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">PO / Ref</Label><Input value={form.po_client_ref || ''} onChange={e => set('po_client_ref', e.target.value)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
          </div>
        </section>

        {/* Trip */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Trip Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label className="text-xs text-muted-foreground">Service Type</Label>
              <Select value={form.service_type || ''} onValueChange={v => set('service_type', v)} disabled={!canEdit}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{(settings.service_types_list || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-muted-foreground">Pickup Date</Label><Input type="date" value={form.pickup_date || ''} onChange={e => set('pickup_date', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Pickup Time</Label><Input type="time" value={form.pickup_time || ''} onChange={e => set('pickup_time', e.target.value)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Vehicle Type</Label>
              <Select value={form.vehicle_type_id || ''} onValueChange={v => set('vehicle_type_id', v)} disabled={!canEdit}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} — {vt.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Pickup Location</Label><Input value={form.pickup_location || ''} onChange={e => set('pickup_location', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Dropoff Location</Label><Input value={form.dropoff_location || ''} onChange={e => set('dropoff_location', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Pax</Label><Input type="number" min={0} value={form.passenger_count ?? 1} onChange={e => set('passenger_count', parseInt(e.target.value) || 0)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Luggage</Label><Input type="number" min={0} value={form.luggage_count ?? 0} onChange={e => set('luggage_count', parseInt(e.target.value) || 0)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Flight #</Label><Input value={form.flight_number || ''} onChange={e => set('flight_number', e.target.value)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Passenger Name</Label><Input value={form.primary_passenger_name || ''} onChange={e => set('primary_passenger_name', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.primary_passenger_phone || ''} onChange={e => set('primary_passenger_phone', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
            <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={form.primary_passenger_email || ''} onChange={e => set('primary_passenger_email', e.target.value)} disabled={!canEdit} className="bg-secondary border-border" /></div>
          </div>
        </section>

        {/* Pricing */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Pricing</h3>
          <div className="max-w-md space-y-3">
            <div><Label className="text-xs text-muted-foreground">Base Rate (AED)</Label><Input type="number" min={0} step="0.01" value={form.client_base_rate ?? 0} onChange={e => set('client_base_rate', parseFloat(e.target.value) || 0)} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
            {(form.client_extras || []).map((ex, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><Input value={ex.label} onChange={e => { const arr = [...(form.client_extras || [])]; arr[i] = { ...arr[i], label: e.target.value }; set('client_extras', arr); }} disabled={!canEdit} className="bg-secondary border-border" placeholder="Extra label" /></div>
                <div className="w-28"><Input type="number" step="0.01" value={ex.amount} onChange={e => { const arr = [...(form.client_extras || [])]; arr[i] = { ...arr[i], amount: parseFloat(e.target.value) || 0 }; set('client_extras', arr); }} disabled={!canEdit} className="bg-secondary border-border font-mono" /></div>
                {canEdit && <Button variant="ghost" size="icon" onClick={() => set('client_extras', (form.client_extras || []).filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>}
              </div>
            ))}
            {canEdit && <Button variant="outline" size="sm" onClick={() => set('client_extras', [...(form.client_extras || []), { label: '', amount: 0 }])}><Plus className="w-3 h-3 mr-1" /> Extra</Button>}
            <div><Label className="text-xs text-muted-foreground">VAT %</Label><Input type="number" min={0} step="0.1" value={form.client_vat_percent ?? 5} onChange={e => set('client_vat_percent', parseFloat(e.target.value) || 0)} disabled={!canEdit} className="bg-secondary border-border font-mono w-24" /></div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Client Notes (appears on PDF)</Label><Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} disabled={!canEdit} className="bg-secondary border-border h-24" /></div>
            <div><Label className="text-xs text-muted-foreground">Internal Notes (not on PDF)</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} disabled={!canEdit} className="bg-secondary border-border h-24" /></div>
          </div>
        </section>
      </div>

      {/* Printable Quote PDF */}
      <div className="print-only mt-8 bg-white text-black p-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="font-bold text-lg">{settings.company_name}</p>
            <p className="text-sm text-gray-600">{settings.company_address}</p>
            {settings.company_tax_id && <p className="text-sm text-gray-600">TRN: {settings.company_tax_id}</p>}
          </div>
          <div className="text-right">
            <p className="font-bold text-2xl text-gray-800">QUOTATION</p>
            <p className="text-sm">Quote #: <span className="font-mono">{form.quote_number}</span></p>
            <p className="text-sm">Date: {formatDate(form.quote_date)}</p>
            {form.expiry_date && <p className="text-sm font-medium text-red-600">Valid Until: {formatDate(form.expiry_date)}</p>}
          </div>
        </div>
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prepared For</p>
          <p className="font-bold">{companyMap[accounts.find(a => a.id === form.account_id)?.company_id]?.company_name || '—'}</p>
        </div>
        <table className="w-full text-sm mb-6 border-collapse">
          <tbody>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500 w-40">Service Type</td><td className="py-2 font-medium">{form.service_type || '—'}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">Pickup Date</td><td className="py-2">{formatDate(form.pickup_date)}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">Pickup Time</td><td className="py-2 font-mono">{form.pickup_time || '—'}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">From</td><td className="py-2">{form.pickup_location || '—'}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">To</td><td className="py-2">{form.dropoff_location || '—'}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">Passengers</td><td className="py-2 font-mono">{form.passenger_count}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">Subtotal</td><td className="py-2 font-mono">{formatCurrency(totals.clientNet)}</td></tr>
            <tr className="border-b border-gray-200"><td className="py-2 text-gray-500">VAT ({form.client_vat_percent}%)</td><td className="py-2 font-mono">{formatCurrency(totals.clientVat)}</td></tr>
            <tr><td className="py-2 font-bold">Total (AED)</td><td className="py-2 font-bold font-mono text-lg">{formatCurrency(totals.clientTotal)}</td></tr>
          </tbody>
        </table>
        {form.notes && <div className="mt-4 p-4 bg-gray-50 rounded text-sm text-gray-700">{form.notes}</div>}
        {form.expiry_date && <p className="mt-6 text-sm text-gray-500 italic">This quotation is valid until {formatDate(form.expiry_date)}. Prices are subject to availability.</p>}
      </div>
    </div>
  );
}