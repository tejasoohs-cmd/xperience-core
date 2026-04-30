import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import BookingFormFields from '@/components/booking/BookingFormFields';
import PricingSummary from '@/components/booking/PricingSummary';
import BookingParser from '@/components/booking/BookingParser';
import { useAppSettings } from '@/lib/useAppSettings';
import { calcBookingTotals, formatConfNumber } from '@/lib/formatters';
import { logActivity } from '@/lib/activityLog';
import PrintMenu from '@/components/booking/PrintMenu';
import VoiceInput from '@/components/booking/VoiceInput';
import { Save, Copy, ArrowLeftRight, Trash2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function BookingForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextBookingNumber, settings } = useAppSettings();

  const { toast } = useToast();
  const [form, setForm] = useState({
    status: 'New', driver_source: 'InHouse', currency: 'AED',
    client_vat_percent: 5, vendor_vat_percent: 5, passenger_count: 1, luggage_count: 0,
    client_base_rate: 0, vendor_base_rate: 0, stops: [], client_extras: [], vendor_extras: [],
    additional_passengers: [],
  });
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => base44.entities.Booking.filter({ id }),
    enabled: !isNew,
  });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });


  useEffect(() => {
    if (!isNew && existing?.length > 0) {
      setForm(existing[0]);
    }
  }, [existing, isNew]);

  // Pre-populate vat from account settings
  useEffect(() => {
    if (isNew && form.account_id) {
      const acc = accounts.find(a => a.id === form.account_id);
      if (acc?.vat_percent !== undefined) {
        setForm(prev => ({ ...prev, client_vat_percent: acc.vat_percent }));
      }
    }
  }, [form.account_id, accounts, isNew]);

  const [rateChangeModal, setRateChangeModal] = useState(null); // { type, oldAmount, newAmount, linkedId, linkedNumber, data }
  const [dupModal, setDupModal] = useState(null); // { booking, data } to create anyway

  const handleParserApply = (parsedData) => {
    setForm(prev => ({ ...prev, ...parsedData }));
  };

  const validateForm = () => {
    const missing = [];
    if (!form.pickup_date) missing.push('Pickup Date');
    if (!form.pickup_time) missing.push('Pickup Time');
    if (!form.pickup_location) missing.push('Pickup Location');
    if (!form.dropoff_location) missing.push('Dropoff Location');
    if (!form.account_id) missing.push('Account');
    if (!form.client_base_rate && form.client_base_rate !== 0) missing.push('Client Rate');
    return missing;
  };

  const handleSave = async () => {
    const missing = validateForm();
    if (missing.length > 0) {
      toast({ title: 'Missing required fields', description: `Please fill in: ${missing.join(', ')}`, variant: 'destructive' });
      return;
    }

    // Apply no-show vendor zeroing
    let saveForm = { ...form };
    if ((saveForm.status === 'No-show' || saveForm.status === 'No-Show') && saveForm.noshow_pay_vendor === false) {
      saveForm = { ...saveForm, vendor_base_rate: 0, vendor_extras: [] };
    }
    if ((saveForm.status === 'No-show' || saveForm.status === 'No-Show') && saveForm.noshow_charge_client && saveForm.cancellation_fee_amount > 0) {
      saveForm = { ...saveForm, client_base_rate: saveForm.cancellation_fee_amount, client_extras: [] };
    }

    const totals = calcBookingTotals(saveForm);
    const data = { ...saveForm, client_total: totals.clientTotal, vendor_total: totals.vendorTotal, profit: totals.profit };

    // Duplicate detection for new bookings
    if (isNew) {
      const allBookings = queryClient.getQueryData(['bookings']) || [];
      const guestName = (data.primary_passenger_name || '').toLowerCase().trim();
      const pickup10 = (data.pickup_location || '').slice(0, 10).toLowerCase();
      const dup = allBookings.find(b =>
        b.status !== 'Cancelled' &&
        (b.primary_passenger_name || '').toLowerCase().trim() === guestName &&
        b.pickup_date === data.pickup_date &&
        (b.pickup_location || '').slice(0, 10).toLowerCase() === pickup10
      );
      if (dup && guestName) {
        setDupModal({ dup, data });
        return;
      }
    }

    await doSave(data);
  };

  const doSave = async (data) => {
    setSaving(true);
    try {
      if (isNew) {
        const confNum = await getNextBookingNumber();
        data.confirmation_number = confNum;
        const created = await base44.entities.Booking.create(data);
        await logActivity({ action_type: 'created', entity_type: 'booking', entity_id: created.id, entity_label: formatConfNumber(confNum), message: `Booking ${formatConfNumber(confNum)} created` });
      } else {
        const prevStatus = existing?.[0]?.status;
        const prevClientTotal = existing?.[0]?.client_total || 0;
        const prevVendorTotal = existing?.[0]?.vendor_total || 0;
        const { id: _id, created_date, updated_date, created_by, ...updateData } = data;
        await base44.entities.Booking.update(id, updateData);
        const label = formatConfNumber(form.confirmation_number);

        // Rate change cascade
        const clientChanged = Math.abs(data.client_total - prevClientTotal) > 0.01;
        const vendorChanged = Math.abs(data.vendor_total - prevVendorTotal) > 0.01;

        if (clientChanged && form.invoice_id) {
          const invArr = await base44.entities.Invoice.filter({ id: form.invoice_id });
          const inv = invArr[0];
          if (inv) {
            const allInvBookings = await base44.entities.Booking.filter({});
            const bookingsOnInv = (allInvBookings || []).filter(b => (inv.booking_ids || []).includes(b.id));
            let newSubtotal = 0;
            bookingsOnInv.forEach(b => {
              const t = calcBookingTotals(b.id === id ? data : b);
              newSubtotal += t.clientNet;
            });
            const vatPercent = inv.vat_percent || data.client_vat_percent || 5;
            const newVat = newSubtotal * (vatPercent / 100);
            const newGrand = newSubtotal + newVat;
            const newStatus = inv.payment_status === 'Paid' ? 'Partial' : inv.payment_status;
            await base44.entities.Invoice.update(form.invoice_id, { subtotal: newSubtotal, vat_total: newVat, grand_total: newGrand, payment_status: newStatus });
            await logActivity({ action_type: 'updated', entity_type: 'invoice', entity_id: form.invoice_id, entity_label: inv.invoice_number, message: `${label} rate changed from AED ${prevClientTotal.toFixed(2)} to AED ${data.client_total.toFixed(2)} — ${inv.invoice_number} updated from AED ${inv.grand_total?.toFixed(2)} to AED ${newGrand.toFixed(2)}` });
          }
        }

        if (vendorChanged && form.statement_id) {
          const stmtArr = await base44.entities.VendorStatement.filter({ id: form.statement_id });
          const stmt = stmtArr[0];
          if (stmt) {
            const allStmtBookings = await base44.entities.Booking.filter({});
            const bookingsOnStmt = (allStmtBookings || []).filter(b => (stmt.booking_ids || []).includes(b.id));
            const newTotal = bookingsOnStmt.reduce((s, b) => s + calcBookingTotals(b.id === id ? data : b).vendorTotal, 0);
            const newStatus = stmt.payment_status === 'Paid' ? 'Partial' : stmt.payment_status;
            await base44.entities.VendorStatement.update(form.statement_id, { total: newTotal, payment_status: newStatus });
            await logActivity({ action_type: 'updated', entity_type: 'statement', entity_id: form.statement_id, entity_label: stmt.statement_number, message: `${label} vendor rate changed — ${stmt.statement_number} total updated to AED ${newTotal.toFixed(2)}` });
          }
        }

        if (prevStatus && prevStatus !== form.status) {
          await logActivity({ action_type: 'status_changed', entity_type: 'booking', entity_id: id, entity_label: label, message: `${label} status changed from ${prevStatus} to ${form.status}` });
        } else {
          await logActivity({ action_type: 'updated', entity_type: 'booking', entity_id: id, entity_label: label, message: `${label} updated` });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['activityLog'] });
      navigate('/bookings');
    } catch (err) {
      toast({ title: 'Save failed', description: err?.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setSaving(true);
    const confNum = await getNextBookingNumber();
    const totals = calcBookingTotals(form);
    const { id: _id, created_date, updated_date, created_by, invoice_id, statement_id, ...dup } = form;
    const created = await base44.entities.Booking.create({
      ...dup, confirmation_number: confNum, status: 'New',
      invoice_id: null, statement_id: null,
      client_total: totals.clientTotal, vendor_total: totals.vendorTotal, profit: totals.profit,
    });
    await logActivity({ action_type: 'duplicated', entity_type: 'booking', entity_id: created.id, entity_label: formatConfNumber(confNum), message: `Booking ${formatConfNumber(confNum)} duplicated from ${formatConfNumber(form.confirmation_number)}` });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    setSaving(false);
    navigate('/bookings');
  };

  const handleRoundTrip = async () => {
    setSaving(true);
    const confNum = await getNextBookingNumber();
    const totals = calcBookingTotals(form);
    const { id: _id, created_date, updated_date, created_by, invoice_id, statement_id, ...dup } = form;
    const created = await base44.entities.Booking.create({
      ...dup,
      confirmation_number: confNum, status: 'New',
      pickup_location: form.dropoff_location, dropoff_location: form.pickup_location,
      pickup_date: '', pickup_time: '',
      round_trip_parent_id: id,
      invoice_id: null, statement_id: null,
      client_total: totals.clientTotal, vendor_total: totals.vendorTotal, profit: totals.profit,
    });
    await logActivity({ action_type: 'created', entity_type: 'booking', entity_id: created.id, entity_label: formatConfNumber(confNum), message: `Round-trip ${formatConfNumber(confNum)} created from ${formatConfNumber(form.confirmation_number)}` });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    setSaving(false);
    navigate('/bookings');
  };

  const handleDelete = async () => {
    if (form.invoice_id || form.statement_id) {
      alert('Cannot delete: this booking is linked to an invoice or statement.');
      return;
    }
    if (!confirm('Delete this booking?')) return;
    await base44.entities.Booking.delete(id);
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    navigate('/bookings');
  };

  return (
    <div>
      {/* Duplicate detection modal */}
      {dupModal && (
        <Dialog open={!!dupModal} onOpenChange={() => setDupModal(null)}>
          <DialogContent className="max-w-sm bg-card border-border">
            <DialogHeader><DialogTitle className="font-serif italic text-amber-400">Possible Duplicate</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Booking <span className="font-mono text-primary">{formatConfNumber(dupModal.dup.confirmation_number)}</span> already has the same guest (<strong>{dupModal.dup.primary_passenger_name}</strong>) on <strong>{dupModal.dup.pickup_date}</strong>. Create anyway?
            </p>
            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => setDupModal(null)}>Cancel</Button>
              <Button className="bg-primary text-primary-foreground" onClick={() => { const d = dupModal.data; setDupModal(null); doSave(d); }}>Create Anyway</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <PageHeader
        title={isNew ? 'New Booking' : `Booking ${formatConfNumber(form.confirmation_number)}`}
        subtitle={!isNew && (form.invoice_id || form.statement_id) ? 'Linked to invoice/statement — rate changes will cascade' : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/bookings')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {!isNew && (
              <PrintMenu booking={form} />
            )}
            {!isNew && (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={saving}>
                  <Copy className="w-4 h-4 mr-1" /> Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleRoundTrip} disabled={saving}>
                  <ArrowLeftRight className="w-4 h-4 mr-1" /> Round Trip
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </>
            )}
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* AI Parser + Voice Input — top of form */}
      <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Smart Booking Parser</p>
          <p className="text-xs text-muted-foreground">Paste a WhatsApp message or email, or use voice input to auto-fill</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <VoiceInput onApply={handleParserApply} />
          <BookingParser
            onApply={handleParserApply}
            accounts={accounts}
            companies={companies}
            affiliates={affiliates}
            vehicleTypes={vehicleTypes}
            serviceTypes={settings.service_types_list}
          />
        </div>
      </div>

      <PricingSummary form={form} />

      <div className="mt-6">
        <BookingFormFields
          form={form} setForm={setForm}
          accounts={accounts} companies={companies}
          drivers={drivers} vehicles={vehicles}
          affiliates={affiliates} vehicleTypes={vehicleTypes}
        />
      </div>
    </div>
  );
}