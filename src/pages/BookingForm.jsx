import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import BookingFormFields from '@/components/booking/BookingFormFields';
import PricingSummary from '@/components/booking/PricingSummary';
import { useAppSettings } from '@/lib/useAppSettings';
import { calcBookingTotals, formatConfNumber } from '@/lib/formatters';
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

  const isLocked = !isNew && (form.invoice_id || form.statement_id);

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
      await base44.entities.Booking.create(data);
    } else {
      const { id: _id, created_date, updated_date, created_by, ...updateData } = data;
      await base44.entities.Booking.update(id, updateData);
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    setSaving(false);
    navigate('/bookings');
  };

  const handleDuplicate = async () => {
    setSaving(true);
    const confNum = await getNextBookingNumber();
    const totals = calcBookingTotals(form);
    const { id: _id, created_date, updated_date, created_by, invoice_id, statement_id, ...dup } = form;
    await base44.entities.Booking.create({
      ...dup, confirmation_number: confNum, status: 'New',
      invoice_id: null, statement_id: null,
      client_total: totals.clientTotal, vendor_total: totals.vendorTotal, profit: totals.profit,
    });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setSaving(false);
    navigate('/bookings');
  };

  const handleRoundTrip = async () => {
    setSaving(true);
    const confNum = await getNextBookingNumber();
    const totals = calcBookingTotals(form);
    const { id: _id, created_date, updated_date, created_by, invoice_id, statement_id, ...dup } = form;
    await base44.entities.Booking.create({
      ...dup,
      confirmation_number: confNum, status: 'New',
      pickup_location: form.dropoff_location, dropoff_location: form.pickup_location,
      pickup_date: '', pickup_time: '',
      round_trip_parent_id: id,
      invoice_id: null, statement_id: null,
      client_total: totals.clientTotal, vendor_total: totals.vendorTotal, profit: totals.profit,
    });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    setSaving(false);
    navigate('/bookings');
  };

  const handleDelete = async () => {
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

      <PricingSummary form={form} />

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