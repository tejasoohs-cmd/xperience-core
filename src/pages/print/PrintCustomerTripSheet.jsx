import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatConfNumber } from '@/lib/formatters';

function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' - ' + d.toLocaleDateString('en-GB', { weekday: 'long' });
}

export default function PrintCustomerTripSheet() {
  const { id } = useParams();

  const { data: bookingArr = [] } = useQuery({ queryKey: ['print-booking', id], queryFn: () => base44.entities.Booking.filter({ id }) });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const booking = bookingArr[0];
  const settings = settingsArr[0] || {};
  const vehicleType = vehicleTypes.find(v => v.id === booking?.vehicle_type_id);
  const vehicle = vehicles.find(v => v.id === booking?.vehicle_id);
  const driver = drivers.find(d => d.id === booking?.driver_id);
  const account = accounts.find(a => a.id === booking?.account_id);
  const company = companies.find(c => c.id === account?.company_id);
  const invoice = invoices.find(inv => inv.id === booking?.invoice_id);

  const isReady = booking && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  const getRoutingPoints = () => {
    if (booking?.routing_points?.length > 0) return booking.routing_points;
    const pts = [];
    if (booking?.pickup_location) pts.push({ type: 'Pickup', time_in: booking.pickup_time, location_description: booking.pickup_location, passenger_names: booking.primary_passenger_name ? [booking.primary_passenger_name] : [], phone_number: booking.primary_passenger_phone });
    (booking?.stops || []).forEach(s => pts.push({ type: 'Stop', location_description: s.location, notes: s.notes }));
    if (booking?.dropoff_location) pts.push({ type: 'Dropoff', location_description: booking.dropoff_location });
    return pts;
  };

  if (!booking) return <div style={{ padding: 40 }}>Loading...</div>;

  const pts = getRoutingPoints();
  const isFarmOut = booking.driver_source === 'FarmOut';
  const paid = invoice?.paid_amount || 0;
  const balance = (booking.client_total || 0) - paid;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print" style={{ textAlign: 'right', marginBottom: 10 }}>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 10 }}>
        <div>
          {settings.company_logo_url ? <img src={settings.company_logo_url} alt="Logo" style={{ height: 48, marginBottom: 4 }} /> : <div style={{ fontWeight: 'bold', fontSize: 18 }}>{settings.company_name}</div>}
          <div style={{ fontSize: 10, color: '#555' }}>{settings.company_address}</div>
          <div style={{ fontSize: 10, color: '#555' }}>{settings.company_phone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Customer Trip Sheet</div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>Pick-up Date: {formatDateLong(booking.pickup_date)}</div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>Pick-up Time: {booking.pickup_time || '—'}</div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>Reservation# {formatConfNumber(booking.confirmation_number)} {booking.service_type || ''}</div>
        </div>
      </div>

      {/* Info Band */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ width: '33%', verticalAlign: 'top', border: '1px solid #ccc', padding: 6 }}>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>Bill To</div>
              <div style={{ fontWeight: 'bold' }}>{company?.company_name || account?.contact_name || '—'}</div>
              {account?.contact_name && company && <div style={{ fontSize: 10 }}>Attn: {account.contact_name}</div>}
              {company?.billing_address && <div style={{ fontSize: 10 }}>{company.billing_address}</div>}
            </td>
            <td style={{ width: '33%', verticalAlign: 'top', border: '1px solid #ccc', padding: 6 }}>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>Primary Passenger</div>
              <div style={{ fontWeight: 'bold' }}>{booking.primary_passenger_name || '—'}</div>
              {booking.primary_passenger_phone && <div style={{ fontSize: 10 }}>{booking.primary_passenger_phone}</div>}
            </td>
            <td style={{ width: '33%', verticalAlign: 'top', border: '1px solid #ccc', padding: 6 }}>
              <div style={{ fontSize: 9, color: '#666' }}>Booked On: <span style={{ color: '#000' }}>{booking.created_date ? new Date(booking.created_date).toLocaleDateString() : '—'}</span></div>
              <div style={{ fontSize: 9, color: '#666' }}>PO/Client #: <span style={{ color: '#000', fontFamily: 'monospace' }}>{booking.po_client_ref || '—'}</span></div>
              {booking.booker_name && <div style={{ fontSize: 9, color: '#666' }}>Booker: <span style={{ color: '#000' }}>{booking.booker_name}</span></div>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Detail Boxes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textAlign: 'center', textTransform: 'uppercase' }}>No. of Pax</th>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textAlign: 'center', textTransform: 'uppercase' }}>Vehicle Type</th>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textAlign: 'center', textTransform: 'uppercase' }}>Car(s)</th>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textAlign: 'center', textTransform: 'uppercase' }}>Driver(s)</th>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>{booking.passenger_count || 1}</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', fontWeight: 'bold' }}>{vehicleType ? `${vehicleType.code} - ${vehicleType.name}` : '—'}</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{isFarmOut ? 'To be confirmed' : (vehicle?.plate_number || 'Unassigned')}</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center' }}>{isFarmOut ? 'To be confirmed' : (driver?.name || 'Unassigned')}</td>
          </tr>
        </tbody>
      </table>

      {/* Routing */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead><tr style={{ background: '#1f2937' }}><th colSpan={2} style={{ padding: 6, color: '#fff', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Passenger & Routing Information</th></tr></thead>
        <tbody>
          <tr><td style={{ border: '1px solid #ccc', padding: 5, width: 120, fontSize: 9, color: '#555' }}>Passenger:</td><td style={{ border: '1px solid #ccc', padding: 5, fontWeight: 'bold' }}>{booking.primary_passenger_name || '—'}</td></tr>
          {(booking.additional_passengers || []).length > 0 && (
            <tr><td style={{ border: '1px solid #ccc', padding: 5, fontSize: 9, color: '#555' }}>Addt's Pax:</td><td style={{ border: '1px solid #ccc', padding: 5 }}>{booking.additional_passengers.join(', ')}</td></tr>
          )}
          {booking.flight_number && (
            <tr><td style={{ border: '1px solid #ccc', padding: 5, fontSize: 9, color: '#555' }}>Flight #:</td><td style={{ border: '1px solid #ccc', padding: 5, fontFamily: 'monospace' }}>{booking.flight_number} {booking.flight_schedule_time ? `(Sched: ${booking.flight_schedule_time})` : ''}</td></tr>
          )}
          {pts.map((pt, i) => (
            <React.Fragment key={i}>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: 5, fontSize: 9, color: '#555', fontWeight: 'bold' }}>
                  {pt.type === 'Pickup' ? '▶ PU' : pt.type === 'Dropoff' ? '■ DO' : '● Stop'} {pt.time_in || ''}:
                </td>
                <td style={{ border: '1px solid #ccc', padding: 5 }}>
                  {pt.location_description}
                  {(pt.passenger_names || []).length > 0 && <span style={{ color: '#555', fontSize: 9 }}> — {pt.passenger_names.join(', ')}</span>}
                  {pt.phone_number && <span style={{ color: '#555', fontSize: 9 }}> | ☎ {pt.phone_number}</span>}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Charges */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textTransform: 'uppercase', textAlign: 'left', width: '50%' }}>Pmt Type</th>
            <th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textTransform: 'uppercase', textAlign: 'left' }}>Status</th>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: 5 }}>Direct Bill / Invoice</td>
            <td style={{ border: '1px solid #ccc', padding: 5 }}>{invoice?.payment_status || 'Not Invoiced'}</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr style={{ background: '#f3f4f6' }}><th style={{ border: '1px solid #ccc', padding: 4, fontSize: 9, textTransform: 'uppercase', textAlign: 'left' }}>Charges &amp; Fees</th></tr>
          <tr><td style={{ border: '1px solid #ccc', padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>Flat Rate:</span><span style={{ fontFamily: 'monospace' }}>AED {(booking.client_base_rate || 0).toFixed(2)}</span></div>
            {(booking.client_extras || []).map((ex, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span>{ex.label}:</span><span style={{ fontFamily: 'monospace' }}>AED {(ex.amount || 0).toFixed(2)}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: 4, marginTop: 4 }}><span>Total Due (AED):</span><span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{formatCurrency(booking.client_total || 0)}</span></div>
            {paid > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Payments/Deposits:</span><span style={{ fontFamily: 'monospace' }}>-{formatCurrency(paid)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: balance > 0 ? '#dc2626' : '#16a34a' }}><span>Total Outstanding:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(balance)}</span></div>
          </td></tr>
        </tbody>
      </table>

      {/* Notes */}
      {booking.trip_notes && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead><tr style={{ background: '#1f2937' }}><th colSpan={2} style={{ padding: 6, color: '#fff', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Notes</th></tr></thead>
          <tbody><tr><td style={{ border: '1px solid #ccc', padding: 8 }}>{booking.trip_notes}</td></tr></tbody>
        </table>
      )}

      {/* Reservation Agreement */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead><tr style={{ background: '#f3f4f6' }}><th style={{ border: '1px solid #ccc', padding: 6, fontSize: 10, textTransform: 'uppercase', textAlign: 'left' }}>Reservation Agreement</th></tr></thead>
        <tbody><tr><td style={{ border: '1px solid #ccc', padding: 8, color: '#666', fontStyle: 'italic', fontSize: 10 }}>&lt; NO AGREEMENT PROVIDED &gt;</td></tr></tbody>
      </table>
    </div>
  );
}