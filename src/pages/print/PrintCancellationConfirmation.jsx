import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, formatConfNumber } from '@/lib/formatters';

export default function PrintCancellationConfirmation() {
  const { id } = useParams();

  const { data: bookingArr = [] } = useQuery({ queryKey: ['print-booking', id], queryFn: () => base44.entities.Booking.filter({ id }) });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const booking = bookingArr[0];
  const settings = settingsArr[0] || {};
  const vehicleType = vehicleTypes.find(v => v.id === booking?.vehicle_type_id);
  const account = accounts.find(a => a.id === booking?.account_id);
  const company = companies.find(c => c.id === account?.company_id);

  const isReady = booking && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  if (!booking) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print" style={{ textAlign: 'right', marginBottom: 10 }}>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #dc2626', paddingBottom: 10, marginBottom: 14 }}>
        <div>
          {settings.company_logo_url ? <img src={settings.company_logo_url} alt="Logo" style={{ height: 48 }} /> : <div style={{ fontWeight: 'bold', fontSize: 18 }}>{settings.company_name}</div>}
          <div style={{ fontSize: 10, color: '#555' }}>{settings.company_address}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 20, color: '#dc2626' }}>Cancellation Confirmation</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Date: {new Date().toLocaleDateString('en-GB')}</div>
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>Cancelled Reservation Confirmation # {formatConfNumber(booking.confirmation_number)}</div>
        <div style={{ fontSize: 10, color: '#555' }}>Last Modified: {booking.updated_date ? new Date(booking.updated_date).toLocaleString() : '—'}</div>
      </div>

      {/* Warning Bar */}
      <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 4, padding: '10px 14px', marginBottom: 14, color: '#991b1b', fontWeight: 'bold', fontSize: 11 }}>
        ⚠ This reservation has been cancelled. If this trip should not have been cancelled, please contact our office immediately at {settings.company_phone || '[office phone]'}.
      </div>

      {/* Detail Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
        <tbody>
          {[
            ['Pick-up Date', formatDate(booking.pickup_date)],
            ['Pick-up Time', booking.pickup_time || '—'],
            ['Service Type', booking.service_type || '—'],
            ['Primary Contact', account?.contact_name || '—'],
            ['Company', company?.company_name || '—'],
            ['Passenger', booking.primary_passenger_name || '—'],
            ['Phone', booking.primary_passenger_phone || '—'],
            ['No. of Passengers', booking.passenger_count || 1],
            ['Vehicle Type', vehicleType ? `${vehicleType.code} - ${vehicleType.name}` : '—'],
            ['Payment Method', 'Direct Bill / Invoice'],
          ].map(([label, val]) => (
            <tr key={label}>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', width: 180, fontWeight: 'bold', fontSize: 10 }}>{label}</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Trip Routing */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
        <thead><tr style={{ background: '#f3f4f6' }}><th colSpan={2} style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 10 }}>Trip Routing</th></tr></thead>
        <tbody>
          <tr><td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', width: 180, fontWeight: 'bold', fontSize: 10 }}>Pickup Location</td><td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{booking.pickup_location || '—'}{booking.flight_number ? ` | Flt: ${booking.flight_number}` : ''}</td></tr>
          <tr><td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', fontWeight: 'bold', fontSize: 10 }}>Drop-off Location</td><td style={{ border: '1px solid #ccc', padding: '5px 8px' }}>{booking.dropoff_location || '—'}</td></tr>
        </tbody>
      </table>

      {/* Charges */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
        <thead><tr style={{ background: '#f3f4f6' }}><th colSpan={2} style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 10 }}>Charges & Fees</th></tr></thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', width: 180, fontWeight: 'bold', fontSize: 10 }}>Flat Rate</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontFamily: 'monospace' }}>{formatCurrency(booking.client_base_rate || 0)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', fontWeight: 'bold', fontSize: 10 }}>Reservation Total</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontFamily: 'monospace', color: '#16a34a', fontWeight: 'bold' }}>{formatCurrency(booking.client_total || 0)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', background: '#f9fafb', fontWeight: 'bold', fontSize: 10 }}>Total Due</td>
            <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontFamily: 'monospace', color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(booking.client_total || 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}