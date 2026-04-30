import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useAppSettings } from '@/lib/useAppSettings';
import ExtraChargeModal from '@/components/booking/ExtraChargeModal';
import ConflictWarningModal from '@/components/bookings/ConflictWarningModal';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function checkConflict(allBookings, field, value, form) {
  if (!value || !form.pickup_date || !form.pickup_time) return null;
  const [h, m] = form.pickup_time.split(':').map(Number);
  const pickupMins = h * 60 + m;
  return allBookings.find(b => {
    if (b.id === form.id) return false;
    if (b[field] !== value) return false;
    if (b.pickup_date !== form.pickup_date) return false;
    if (!b.pickup_time) return false;
    const [bh, bm] = b.pickup_time.split(':').map(Number);
    return Math.abs(bh * 60 + bm - pickupMins) < 120;
  }) || null;
}

export default function BookingFormFields({ form, setForm, accounts, companies, drivers, vehicles, affiliates, vehicleTypes }) {
  const { settings } = useAppSettings();
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [conflict, setConflict] = useState(null); // { resourceName, conflictBooking, pendingField, pendingValue }
  const { data: allBookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const serviceTypes = settings.service_types_list || ['Arrival', 'Departure', 'Point-to-Point', 'Hourly', 'Tour'];
  const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const addStop = () => set('stops', [...(form.stops || []), { location: '', notes: '' }]);
  const removeStop = (i) => set('stops', (form.stops || []).filter((_, idx) => idx !== i));
  const updateStop = (i, field, val) => {
    const stops = [...(form.stops || [])];
    stops[i] = { ...stops[i], [field]: val };
    set('stops', stops);
  };

  const addRoutingPoint = (type) => set('routing_points', [...(form.routing_points || []), { type, time_in: '', location_description: '', passenger_names: [], passenger_count: null, phone_number: '', notes: '' }]);
  const removeRoutingPoint = (i) => set('routing_points', (form.routing_points || []).filter((_, idx) => idx !== i));
  const updateRoutingPoint = (i, field, val) => {
    const pts = [...(form.routing_points || [])];
    pts[i] = { ...pts[i], [field]: val };
    set('routing_points', pts);
  };

  const addPassenger = () => set('additional_passengers', [...(form.additional_passengers || []), '']);
  const removePassenger = (i) => set('additional_passengers', (form.additional_passengers || []).filter((_, idx) => idx !== i));

  const addClientExtra = () => set('client_extras', [...(form.client_extras || []), { label: '', amount: 0 }]);
  const removeClientExtra = (i) => set('client_extras', (form.client_extras || []).filter((_, idx) => idx !== i));

  const addVendorExtra = () => set('vendor_extras', [...(form.vendor_extras || []), { label: '', amount: 0 }]);
  const removeVendorExtra = (i) => set('vendor_extras', (form.vendor_extras || []).filter((_, idx) => idx !== i));

  const handleAddExtraCharge = ({ label, amount, applyTo }) => {
    if (applyTo === 'Client Only' || applyTo === 'Both') {
      set('client_extras', [...(form.client_extras || []), { label, amount }]);
    }
    if (applyTo === 'Vendor Only' || applyTo === 'Both') {
      set('vendor_extras', [...(form.vendor_extras || []), { label, amount }]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Trip Details */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Trip Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Confirmation #</Label>
            <Input value={form.confirmation_number || ''} readOnly className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={form.status || 'New'} onValueChange={v => set('status', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['New', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Service Type</Label>
            <Select value={form.service_type || ''} onValueChange={v => set('service_type', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pickup Date *</Label>
            <Input type="date" value={form.pickup_date || ''} onChange={e => set('pickup_date', e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pickup Time *</Label>
            <Input type="time" value={form.pickup_time || ''} onChange={e => set('pickup_time', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Vehicle Type</Label>
            <Select value={form.vehicle_type_id || ''} onValueChange={v => set('vehicle_type_id', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {(vehicleTypes || []).map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} — {vt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Pickup Location *</Label>
            <Input value={form.pickup_location || ''} onChange={e => set('pickup_location', e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Dropoff Location *</Label>
            <Input value={form.dropoff_location || ''} onChange={e => set('dropoff_location', e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
        {/* Routing Points (multi-pickup) */}
        {(form.routing_points || []).length > 0 && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Routing Points</Label>
            {(form.routing_points || []).map((pt, i) => (
              <div key={i} className={`border rounded-md p-3 space-y-2 ${pt.type === 'Pickup' ? 'border-emerald-500/30 bg-emerald-500/5' : pt.type === 'Dropoff' ? 'border-blue-500/30 bg-blue-500/5' : 'border-border bg-secondary/30'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${pt.type === 'Pickup' ? 'bg-emerald-500/20 text-emerald-400' : pt.type === 'Dropoff' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{pt.type}</span>
                  <Input type="time" value={pt.time_in || ''} onChange={e => updateRoutingPoint(i, 'time_in', e.target.value)} className="bg-secondary border-border font-mono w-28" placeholder="Time" />
                  <Button variant="ghost" size="icon" onClick={() => removeRoutingPoint(i)} className="ml-auto text-muted-foreground hover:text-destructive h-7 w-7"><Trash2 className="w-3 h-3" /></Button>
                </div>
                <Input value={pt.location_description || ''} onChange={e => updateRoutingPoint(i, 'location_description', e.target.value)} className="bg-secondary border-border" placeholder="Location" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={pt.phone_number || ''} onChange={e => updateRoutingPoint(i, 'phone_number', e.target.value)} className="bg-secondary border-border text-xs" placeholder="Phone" />
                  <Input value={pt.notes || ''} onChange={e => updateRoutingPoint(i, 'notes', e.target.value)} className="bg-secondary border-border text-xs" placeholder="Remarks (agency name for driver)" />
                </div>
                <Input value={(pt.passenger_names || []).join(', ')} onChange={e => updateRoutingPoint(i, 'passenger_names', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="bg-secondary border-border text-xs" placeholder="Passenger names (comma separated)" />
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => addRoutingPoint('Pickup')}><Plus className="w-3 h-3 mr-1" /> Pickup Point</Button>
          <Button variant="outline" size="sm" onClick={() => addRoutingPoint('Stop')}><Plus className="w-3 h-3 mr-1" /> Stop</Button>
          <Button variant="outline" size="sm" onClick={() => addRoutingPoint('Dropoff')}><Plus className="w-3 h-3 mr-1" /> Dropoff</Button>
        </div>
        {/* Legacy simple stops */}
        {(form.routing_points || []).length === 0 && (form.stops || []).map((stop, i) => (
          <div key={i} className="flex gap-2 items-end mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Stop {i + 1} Time</Label>
              <Input type="time" value={stop.time || ''} onChange={e => updateStop(i, 'time', e.target.value)} className="bg-secondary border-border font-mono w-28" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input value={stop.location} onChange={e => updateStop(i, 'location', e.target.value)} className="bg-secondary border-border" placeholder="Location" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeStop(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        {(form.routing_points || []).length === 0 && <Button variant="outline" size="sm" onClick={addStop} className="mt-2"><Plus className="w-3 h-3 mr-1" /> Add Stop</Button>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">Passengers</Label>
            <Input type="number" min={0} value={form.passenger_count ?? 1} onChange={e => set('passenger_count', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Luggage</Label>
            <Input type="number" min={0} value={form.luggage_count ?? 0} onChange={e => set('luggage_count', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Flight #</Label>
            <Input value={form.flight_number || ''} onChange={e => set('flight_number', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Flight Sched. Time</Label>
            <Input type="time" value={form.flight_schedule_time || ''} onChange={e => set('flight_schedule_time', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
        </div>
      </section>

      {/* Guest Info */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Guest Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Primary Passenger Name</Label>
            <Input value={form.primary_passenger_name || ''} onChange={e => set('primary_passenger_name', e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Phone</Label>
            <Input value={form.primary_passenger_phone || ''} onChange={e => set('primary_passenger_phone', e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={form.primary_passenger_email || ''} onChange={e => set('primary_passenger_email', e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>
        {(form.additional_passengers || []).map((p, i) => (
          <div key={i} className="flex gap-2 items-end mt-2">
            <div className="flex-1">
              <Input value={p} onChange={e => { const arr = [...(form.additional_passengers || [])]; arr[i] = e.target.value; set('additional_passengers', arr); }} className="bg-secondary border-border" placeholder={`Additional passenger ${i + 1}`} />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removePassenger(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPassenger} className="mt-2"><Plus className="w-3 h-3 mr-1" /> Add Passenger</Button>
        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Greeting Sign</Label>
          <Input value={form.greeting_sign || ''} onChange={e => set('greeting_sign', e.target.value)} className="bg-secondary border-border" placeholder="Name shown on sign board" />
        </div>
      </section>

      {/* Client (Account) */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Client Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Account * (dropdown only)</Label>
            <Select value={form.account_id || ''} onValueChange={v => set('account_id', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select account..." /></SelectTrigger>
              <SelectContent>
                {(accounts || []).filter(a => a.status === 'active').map(a => {
                  const comp = companyMap[a.company_id];
                  return <SelectItem key={a.id} value={a.id}>{comp?.company_name || ''} — {a.contact_name} ({a.account_number})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Booker Name</Label>
            <Input value={form.booker_name || ''} onChange={e => set('booker_name', e.target.value)} className="bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">PO / Client Ref</Label>
            <Input value={form.po_client_ref || ''} onChange={e => set('po_client_ref', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Voucher #</Label>
            <Input value={form.voucher_number || ''} onChange={e => set('voucher_number', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
        </div>
      </section>

      {/* Driver / Vendor */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Driver / Vendor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={form.driver_source || 'InHouse'} onValueChange={v => set('driver_source', v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="InHouse">In-House</SelectItem>
                <SelectItem value="FarmOut">Farm Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.driver_source === 'FarmOut' ? (
            <div>
              <Label className="text-xs text-muted-foreground">Affiliate *</Label>
              <Select value={form.affiliate_id || ''} onValueChange={v => set('affiliate_id', v)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select affiliate..." /></SelectTrigger>
                <SelectContent>
                  {(affiliates || []).filter(a => a.status === 'active').map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Driver</Label>
                <Select value={form.driver_id || ''} onValueChange={v => {
                  const conflicting = checkConflict(allBookings, 'driver_id', v, form);
                  if (conflicting) {
                    const drv = (drivers || []).find(d => d.id === v);
                    setConflict({ resourceName: drv?.name || 'Driver', conflictBooking: conflicting, pendingField: 'driver_id', pendingValue: v });
                  } else {
                    set('driver_id', v);
                  }
                }}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select driver..." /></SelectTrigger>
                  <SelectContent>
                    {(drivers || []).filter(d => d.status === 'active').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vehicle</Label>
                <Select value={form.vehicle_id || ''} onValueChange={v => {
                  const conflicting = checkConflict(allBookings, 'vehicle_id', v, form);
                  if (conflicting) {
                    const veh = (vehicles || []).find(x => x.id === v);
                    setConflict({ resourceName: veh?.plate_number || 'Vehicle', conflictBooking: conflicting, pendingField: 'vehicle_id', pendingValue: v });
                  } else {
                    set('vehicle_id', v);
                  }
                }}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
                  <SelectContent>
                    {(vehicles || []).filter(v => v.status === 'active').map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <Label className="text-xs text-muted-foreground">GAR Out Time</Label>
            <Input type="time" value={form.gar_out_time || ''} onChange={e => set('gar_out_time', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">GAR In Time</Label>
            <Input type="time" value={form.gar_in_time || ''} onChange={e => set('gar_in_time', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Flight Actual Time</Label>
            <Input type="time" value={form.flight_actual_time || ''} onChange={e => set('flight_actual_time', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
        </div>
      </section>

      {/* No-Show Options */}
      {(form.status === 'No-show' || form.status === 'No-Show') && (
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">No-Show Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Charge client cancellation fee?</Label>
              <div className="flex gap-3">
                <Button size="sm" variant={form.noshow_charge_client ? 'default' : 'outline'} onClick={() => set('noshow_charge_client', true)} className={form.noshow_charge_client ? 'bg-primary text-primary-foreground' : ''}>Yes</Button>
                <Button size="sm" variant={form.noshow_charge_client === false ? 'default' : 'outline'} onClick={() => set('noshow_charge_client', false)}>No</Button>
              </div>
              {form.noshow_charge_client && (
                <div>
                  <Label className="text-xs text-muted-foreground">Cancellation Fee Amount (AED)</Label>
                  <Input type="number" min={0} step="0.01" value={form.cancellation_fee_amount || 0} onChange={e => set('cancellation_fee_amount', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pay vendor?</Label>
              <div className="flex gap-3">
                <Button size="sm" variant={form.noshow_pay_vendor !== false ? 'default' : 'outline'} onClick={() => set('noshow_pay_vendor', true)} className={form.noshow_pay_vendor !== false ? 'bg-primary text-primary-foreground' : ''}>Yes</Button>
                <Button size="sm" variant={form.noshow_pay_vendor === false ? 'default' : 'outline'} onClick={() => set('noshow_pay_vendor', false)}>No (zero vendor rate)</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Pricing</h3>
        <div className="mb-3">
          <Button variant="outline" size="sm" onClick={() => setShowExtraModal(true)}><Plus className="w-3 h-3 mr-1" /> Add Extra Charge</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client side */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Client Rate</h4>
            <div>
              <Label className="text-xs text-muted-foreground">Base Rate (AED) *</Label>
              <Input type="number" min={0} step="0.01" value={form.client_base_rate ?? 0} onChange={e => set('client_base_rate', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
            </div>
            {(form.client_extras || []).map((ex, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><Input value={ex.label} onChange={e => { const arr = [...(form.client_extras || [])]; arr[i] = { ...arr[i], label: e.target.value }; set('client_extras', arr); }} className="bg-secondary border-border" placeholder="Extra label" /></div>
                <div className="w-28"><Input type="number" step="0.01" value={ex.amount} onChange={e => { const arr = [...(form.client_extras || [])]; arr[i] = { ...arr[i], amount: parseFloat(e.target.value) || 0 }; set('client_extras', arr); }} className="bg-secondary border-border font-mono" /></div>
                <Button variant="ghost" size="icon" onClick={() => removeClientExtra(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addClientExtra}><Plus className="w-3 h-3 mr-1" /> Extra</Button>
            <div>
              <Label className="text-xs text-muted-foreground">VAT %</Label>
              <Input type="number" min={0} step="0.1" value={form.client_vat_percent ?? 5} onChange={e => set('client_vat_percent', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono w-24" />
            </div>
          </div>
          {/* Vendor side */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Vendor Rate</h4>
            <div>
              <Label className="text-xs text-muted-foreground">Base Rate (AED)</Label>
              <Input type="number" min={0} step="0.01" value={form.vendor_base_rate ?? 0} onChange={e => set('vendor_base_rate', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" />
            </div>
            {(form.vendor_extras || []).map((ex, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1"><Input value={ex.label} onChange={e => { const arr = [...(form.vendor_extras || [])]; arr[i] = { ...arr[i], label: e.target.value }; set('vendor_extras', arr); }} className="bg-secondary border-border" placeholder="Extra label" /></div>
                <div className="w-28"><Input type="number" step="0.01" value={ex.amount} onChange={e => { const arr = [...(form.vendor_extras || [])]; arr[i] = { ...arr[i], amount: parseFloat(e.target.value) || 0 }; set('vendor_extras', arr); }} className="bg-secondary border-border font-mono" /></div>
                <Button variant="ghost" size="icon" onClick={() => removeVendorExtra(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addVendorExtra}><Plus className="w-3 h-3 mr-1" /> Extra</Button>
            <div>
              <Label className="text-xs text-muted-foreground">VAT %</Label>
              <Input type="number" min={0} step="0.1" value={form.vendor_vat_percent ?? 5} onChange={e => set('vendor_vat_percent', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono w-24" />
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Trip Notes</Label>
            <Textarea value={form.trip_notes || ''} onChange={e => set('trip_notes', e.target.value)} className="bg-secondary border-border h-20" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Dispatch Notes</Label>
            <Textarea value={form.dispatch_notes || ''} onChange={e => set('dispatch_notes', e.target.value)} className="bg-secondary border-border h-20" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Partner Notes</Label>
            <Textarea value={form.partner_notes || ''} onChange={e => set('partner_notes', e.target.value)} className="bg-secondary border-border h-20" />
          </div>
        </div>
      </section>

      <ExtraChargeModal open={showExtraModal} onClose={() => setShowExtraModal(false)} onAdd={handleAddExtraCharge} />
      <ConflictWarningModal
        conflict={conflict}
        onCancel={() => setConflict(null)}
        onAssignAnyway={() => {
          if (conflict) set(conflict.pendingField, conflict.pendingValue);
          setConflict(null);
        }}
      />
    </div>
  );
}