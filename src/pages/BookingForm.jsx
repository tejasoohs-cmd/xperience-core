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
import { DriverTripSheet, AffiliateTripSheet, CustomerTripSheet } from '@/components/booking/TripSheetPrint';
import { Save, Copy, ArrowLeftRight, Trash2, ArrowLeft } from 'lucide-react';

export default function BookingForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getNextBookingNumber, settings } = useAppSettings();

  const [form, setForm] = useState({
    status: 'New', driver_source: 'InHouse', currency: 'AED',
    client_vat_percent: 5, vendor_vat_percent: 5, passenger_count: 1, luggage_count: 0,
    client_base_rate: 0, vendor_base_rate: 0, stops: [], client_extras: [], vendor_extras: [],
    additional_passengers: [],
  });
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState(null); // 'driver' | 'affiliate' | 'customer' | 'receipt'

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

  const isLocked = !isNew && (form.invoice_id || form.statement_id);

  const vehicleType = vehicleTypes.find(v => v.id === form.vehicle_type_id);
  const vehicle = vehicles.find(v => v.id === form.vehicle_id);
  const driver = drivers.find(d => d.id === form.driver_id);
  const affiliate = affiliates.find(a => a.id === form.affiliate_id);
  const account = accounts.find(a => a.id === form.account_id);
  const company = null; // fetched in print component if needed

  // Print trigger: when printMode changes to a valid mode, print then clear
  React.useEffect(() => {
    if (printMode) {
      const t = setTimeout(() => { window.print(); setPrintMode(null); }, 300);
      return () => clearTimeout(t);
    }
  }, [printMode]);

  const handleParserApply = (parsedData) => {
    setForm(prev => ({ ...prev, ...parsedData }));
  };

  const handleSave = async () => {
    setSaving(true);
    const totals = calcBookingTotals(form);
    const data = {
      ...form,
      client_total: totals.clientTotal,
      vendor_total: totals.vendorTotal,
      profit: totals.profit,
    };

    if (isNew) {
      const confNum = await getNextBookingNumber();
      data.confirmation_number = confNum;
      const created = await base44.entities.Booking.create(data);
      await logActivity({ action_type: 'created', entity_type: 'booking', entity_id: created.id, entity_label: formatConfNumber(confNum), message: `Booking ${formatConfNumber(confNum)} created` });
    } else {
      const prevStatus = existing?.[0]?.status;
      const { id: _id, created_date, updated_date, created_by, ...updateData } = data;
      await base44.entities.Booking.update(id, updateData);
      const label = formatConfNumber(form.confirmation_number);
      if (prevStatus && prevStatus !== form.status) {
        await logActivity({ action_type: 'status_changed', entity_type: 'booking', entity_id: id, entity_label: label, message: `${label} status changed from ${prevStatus} to ${form.status}` });
      } else {
        await logActivity({ action_type: 'updated', entity_type: 'booking', entity_id: id, entity_label: label, message: `${label} updated` });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['activityLog'] });
    setSaving(false);
    navigate('/bookings');
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
      <PageHeader
        title={isNew ? 'New Booking' : `Booking ${formatConfNumber(form.confirmation_number)}`}
        subtitle={isLocked ? 'Financial fields locked (linked to invoice/statement)' : undefined}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/bookings')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {!isNew && (
              <PrintMenu booking={form} setPrintMode={setPrintMode} />
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

      {/* AI Parser — top of form */}
      <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Smart Booking Parser</p>
          <p className="text-xs text-muted-foreground">Paste a WhatsApp message or email and let AI extract the booking details</p>
        </div>
        <BookingParser
          onApply={handleParserApply}
          accounts={accounts}
          companies={companies}
          affiliates={affiliates}
          vehicleTypes={vehicleTypes}
          serviceTypes={settings.service_types_list}
        />
      </div>

      <PricingSummary form={form} />

      {/* Trip Sheet Print Templates */}
      {printMode === 'driver' && <DriverTripSheet booking={form} settings={settings} vehicleType={vehicleType} vehicle={vehicle} driver={driver} />}
      {printMode === 'affiliate' && <AffiliateTripSheet booking={form} settings={settings} vehicleType={vehicleType} affiliate={affiliate} />}
      {(printMode === 'customer' || printMode === 'receipt') && <CustomerTripSheet booking={form} settings={settings} vehicleType={vehicleType} account={account} company={null} mode={printMode} />}

      <div className="mt-6">
        <BookingFormFields
          form={form} setForm={setForm}
          accounts={accounts} companies={companies}
          drivers={drivers} vehicles={vehicles}
          affiliates={affiliates} vehicleTypes={vehicleTypes}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
}