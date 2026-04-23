import React from 'react';
import { formatDate, formatConfNumber, formatCurrency } from '@/lib/formatters';

// ─── helpers ────────────────────────────────────────────────────────────────
function Row({ label, value }) {
  if (!value) return null;
  return (
    <tr>
      <td className="py-1 pr-4 text-gray-500 text-xs w-36 whitespace-nowrap align-top">{label}</td>
      <td className="py-1 text-gray-900 text-xs font-medium">{value}</td>
    </tr>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="mt-6 mb-2 border-b-2 border-gray-800 pb-1">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-700">{children}</span>
    </div>
  );
}

function ManualField({ label }) {
  return (
    <div className="flex gap-2 items-end mb-3">
      <span className="text-xs text-gray-600 w-36 flex-shrink-0">{label}:</span>
      <div className="flex-1 border-b border-gray-400" style={{ height: 20 }} />
    </div>
  );
}

// ─── routing points table ────────────────────────────────────────────────────
function RoutingTable({ points, showRemarks = true }) {
  if (!points || points.length === 0) return null;
  return (
    <table className="w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-2 py-1 text-left w-16">Time</th>
          <th className="border border-gray-300 px-2 py-1 text-left w-20">Type</th>
          <th className="border border-gray-300 px-2 py-1 text-left">Location</th>
          <th className="border border-gray-300 px-2 py-1 text-left w-28">Passengers</th>
          <th className="border border-gray-300 px-2 py-1 text-center w-10">Pax</th>
          {showRemarks && <th className="border border-gray-300 px-2 py-1 text-left w-24">Remarks</th>}
        </tr>
      </thead>
      <tbody>
        {points.map((pt, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="border border-gray-300 px-2 py-1 font-mono">{pt.time_in || pt.time || '—'}</td>
            <td className="border border-gray-300 px-2 py-1 font-medium">{pt.type || '—'}</td>
            <td className="border border-gray-300 px-2 py-1">{pt.location_description || pt.location || '—'}</td>
            <td className="border border-gray-300 px-2 py-1 text-gray-600">
              {(pt.passenger_names || []).join(', ') || (pt.phone_number ? pt.phone_number : '—')}
            </td>
            <td className="border border-gray-300 px-2 py-1 text-center font-mono">{pt.passenger_count || '—'}</td>
            {showRemarks && <td className="border border-gray-300 px-2 py-1 text-gray-600 italic">{pt.notes || pt.remarks || ''}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Build routing points from booking — supports legacy stops + routing_points array
function buildRoutingPoints(booking) {
  // If we have proper routing_points array, use it
  if (booking.routing_points && booking.routing_points.length > 0) {
    return booking.routing_points;
  }
  // Fall back to building from pickup/stops/dropoff
  const pts = [];
  if (booking.pickup_location) {
    pts.push({
      type: 'Pickup', time_in: booking.pickup_time, location_description: booking.pickup_location,
      passenger_names: booking.primary_passenger_name ? [booking.primary_passenger_name] : [],
      passenger_count: booking.passenger_count, phone_number: booking.primary_passenger_phone, notes: '',
    });
  }
  (booking.stops || []).forEach((s, i) => {
    pts.push({ type: 'Stop', time_in: '', location_description: s.location, passenger_names: [], passenger_count: '', notes: s.notes || '' });
  });
  if (booking.dropoff_location) {
    pts.push({ type: 'Dropoff', time_in: '', location_description: booking.dropoff_location, passenger_names: [], passenger_count: '', notes: '' });
  }
  return pts;
}

// ─── DRIVER TRIP SHEET ───────────────────────────────────────────────────────
export function DriverTripSheet({ booking, settings, vehicleType, vehicle, driver }) {
  const pts = buildRoutingPoints(booking);
  return (
    <div className="print-only bg-white text-black p-8 font-sans text-sm" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '210mm', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-gray-900 pb-4 mb-4">
        <div>
          {settings?.company_logo_url && <img src={settings.company_logo_url} alt="Logo" className="h-12 mb-1" />}
          <div className="text-lg font-bold">{settings?.company_name}</div>
          <div className="text-xs text-gray-500">{settings?.company_address}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight text-gray-900">DRIVER TRIP SHEET</div>
          <div className="text-base font-mono font-bold text-gray-800 mt-1">{formatConfNumber(booking.confirmation_number)}</div>
          <div className="text-xs text-gray-500 mt-1">CONFIDENTIAL — DRIVER USE ONLY</div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="grid grid-cols-2 gap-x-8">
        <table className="w-full">
          <tbody>
            <Row label="Service Date" value={formatDate(booking.pickup_date)} />
            <Row label="Pickup Time" value={booking.pickup_time} />
            <Row label="Service Type" value={booking.service_type} />
            <Row label="Vehicle Type" value={vehicleType?.name} />
            <Row label="Vehicle (Plate)" value={vehicle ? `${vehicle.plate_number} — ${vehicle.make} ${vehicle.model}` : null} />
            <Row label="Driver" value={driver?.name} />
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <Row label="Guest Name" value={booking.primary_passenger_name} />
            <Row label="Guest Phone" value={booking.primary_passenger_phone} />
            <Row label="Flight #" value={booking.flight_number} />
            <Row label="Flight Time (Sched)" value={booking.flight_schedule_time} />
            <Row label="Greeting Sign" value={booking.greeting_sign} />
            <Row label="Client Ref / PO" value={booking.po_client_ref} />
          </tbody>
        </table>
      </div>

      {/* Routing Points */}
      <SectionHeader>Routing Points</SectionHeader>
      <RoutingTable points={pts} showRemarks={true} />

      {/* Notes */}
      {(booking.trip_notes || booking.dispatch_notes) && (
        <>
          <SectionHeader>Instructions</SectionHeader>
          {booking.trip_notes && <p className="text-xs text-gray-800 mb-1"><strong>Trip Notes:</strong> {booking.trip_notes}</p>}
          {booking.dispatch_notes && <p className="text-xs text-gray-800"><strong>Dispatch:</strong> {booking.dispatch_notes}</p>}
        </>
      )}

      {/* Manual Fields */}
      <SectionHeader>Driver Completion (Fill In)</SectionHeader>
      <div className="grid grid-cols-2 gap-x-8 mt-2">
        <div>
          <ManualField label="GAR Out Time" />
          <ManualField label="GAR In Time" />
          <ManualField label="Actual Flight Time" />
          <ManualField label="Mileage Out" />
        </div>
        <div>
          <ManualField label="Mileage In" />
          <ManualField label="Pax Load (actual)" />
          <ManualField label="Driver Signature" />
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
        Printed: {new Date().toLocaleString('en-GB')} — {settings?.company_name}
      </div>
    </div>
  );
}

// ─── AFFILIATE TRIP SHEET ────────────────────────────────────────────────────
export function AffiliateTripSheet({ booking, settings, vehicleType, affiliate }) {
  const pts = buildRoutingPoints(booking);
  const totals = { vendorTotal: booking.vendor_total || 0 };
  return (
    <div className="print-only bg-white text-black p-8 font-sans text-sm" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '210mm', margin: '0 auto' }}>
      <div className="flex justify-between items-start border-b-4 border-gray-900 pb-4 mb-4">
        <div>
          {settings?.company_logo_url && <img src={settings.company_logo_url} alt="Logo" className="h-12 mb-1" />}
          <div className="text-lg font-bold">{settings?.company_name}</div>
          <div className="text-xs text-gray-500">{settings?.company_address}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight text-gray-900">AFFILIATE TRIP SHEET</div>
          <div className="text-base font-mono font-bold text-gray-800 mt-1">{formatConfNumber(booking.confirmation_number)}</div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">To Affiliate / Vendor</p>
        <p className="font-bold">{affiliate?.name || '—'}</p>
        {affiliate?.contact_person && <p className="text-xs text-gray-600">Attn: {affiliate.contact_person}</p>}
        {affiliate?.phone && <p className="text-xs text-gray-600">Tel: {affiliate.phone}</p>}
        {affiliate?.email && <p className="text-xs text-gray-600">Email: {affiliate.email}</p>}
      </div>

      <div className="grid grid-cols-2 gap-x-8">
        <table className="w-full">
          <tbody>
            <Row label="Service Date" value={formatDate(booking.pickup_date)} />
            <Row label="Pickup Time" value={booking.pickup_time} />
            <Row label="Service Type" value={booking.service_type} />
            <Row label="Vehicle Type" value={vehicleType?.name} />
            <Row label="Our Ref" value={formatConfNumber(booking.confirmation_number)} />
            <Row label="Client Ref / PO" value={booking.po_client_ref} />
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <Row label="Guest Name" value={booking.primary_passenger_name} />
            <Row label="Guest Phone" value={booking.primary_passenger_phone} />
            <Row label="Flight #" value={booking.flight_number} />
            <Row label="Flight Time" value={booking.flight_schedule_time} />
            <Row label="Greeting Sign" value={booking.greeting_sign} />
          </tbody>
        </table>
      </div>

      <SectionHeader>Routing Points</SectionHeader>
      <RoutingTable points={pts} showRemarks={true} />

      {booking.partner_notes && (
        <>
          <SectionHeader>Instructions for Affiliate</SectionHeader>
          <p className="text-xs text-gray-800">{booking.partner_notes}</p>
        </>
      )}

      <SectionHeader>Driver &amp; Vehicle (Affiliate to Confirm)</SectionHeader>
      <div className="grid grid-cols-2 gap-x-8 mt-2">
        <div>
          <ManualField label="Driver Name" />
          <ManualField label="Driver Phone" />
        </div>
        <div>
          <ManualField label="Vehicle / Plate" />
          <ManualField label="Vehicle Color" />
        </div>
      </div>

      <SectionHeader>Vendor Rate</SectionHeader>
      <div className="flex justify-end mt-2">
        <div className="w-48">
          <div className="flex justify-between py-1 text-sm border-t-2 border-gray-800 font-bold">
            <span>Total (AED):</span>
            <span className="font-mono">{formatCurrency(booking.vendor_total || 0)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
        Printed: {new Date().toLocaleString('en-GB')} — {settings?.company_name}
      </div>
    </div>
  );
}

// ─── CUSTOMER CONFIRMATION ───────────────────────────────────────────────────
export function CustomerTripSheet({ booking, settings, vehicleType, account, company, mode = 'confirmation' }) {
  const pts = buildRoutingPoints(booking);
  const title = mode === 'receipt' ? 'RESERVATION RECEIPT' : 'CUSTOMER CONFIRMATION';
  return (
    <div className="print-only bg-white text-black p-8 font-sans text-sm" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '210mm', margin: '0 auto' }}>
      <div className="flex justify-between items-start border-b-4 border-gray-900 pb-4 mb-4">
        <div>
          {settings?.company_logo_url && <img src={settings.company_logo_url} alt="Logo" className="h-12 mb-1" />}
          <div className="text-lg font-bold">{settings?.company_name}</div>
          <div className="text-xs text-gray-500">{settings?.company_address}</div>
          {settings?.company_phone && <div className="text-xs text-gray-500">Tel: {settings.company_phone}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tracking-tight text-gray-900">{title}</div>
          <div className="text-base font-mono font-bold text-gray-800 mt-1">{formatConfNumber(booking.confirmation_number)}</div>
          <div className="text-xs text-gray-500">Date: {formatDate(booking.pickup_date)}</div>
        </div>
      </div>

      {(account || company) && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Booking For</p>
          <p className="font-bold">{company?.company_name || account?.contact_name || '—'}</p>
          {account?.contact_name && company && <p className="text-xs text-gray-600">Attn: {account.contact_name}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-8">
        <table className="w-full">
          <tbody>
            <Row label="Confirmation #" value={formatConfNumber(booking.confirmation_number)} />
            <Row label="Service Date" value={formatDate(booking.pickup_date)} />
            <Row label="Pickup Time" value={booking.pickup_time} />
            <Row label="Service Type" value={booking.service_type} />
            <Row label="Vehicle Type" value={vehicleType?.name} />
            <Row label="Passengers" value={booking.passenger_count} />
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <Row label="Guest Name" value={booking.primary_passenger_name} />
            <Row label="Guest Phone" value={booking.primary_passenger_phone} />
            <Row label="Flight #" value={booking.flight_number} />
            <Row label="Flight Time" value={booking.flight_schedule_time} />
            <Row label="Client Ref / PO" value={booking.po_client_ref} />
          </tbody>
        </table>
      </div>

      <SectionHeader>Itinerary</SectionHeader>
      <RoutingTable points={pts} showRemarks={false} />

      <SectionHeader>Pricing</SectionHeader>
      <div className="flex justify-end mt-2">
        <div className="w-56">
          <div className="flex justify-between py-1 text-sm"><span>Amount (AED):</span><span className="font-mono">{formatCurrency(booking.client_total || 0)}</span></div>
        </div>
      </div>

      {booking.trip_notes && (
        <>
          <SectionHeader>Notes</SectionHeader>
          <p className="text-xs text-gray-800">{booking.trip_notes}</p>
        </>
      )}

      {mode === 'receipt' && settings?.invoice_footer_notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">{settings.invoice_footer_notes}</div>
      )}

      <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
        {settings?.company_name}{settings?.company_tax_id ? ` · TRN: ${settings.company_tax_id}` : ''} · Printed: {new Date().toLocaleString('en-GB')}
      </div>
    </div>
  );
}