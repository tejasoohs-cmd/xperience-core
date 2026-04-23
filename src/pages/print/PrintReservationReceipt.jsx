import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, formatConfNumber } from '@/lib/formatters';

export default function PrintReservationReceipt() {
  const { id } = useParams();

  const { data: bookingArr = [] } = useQuery({ queryKey: ['print-booking', id], queryFn: () => base44.entities.Booking.filter({ id }) });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const booking = bookingArr[0];
  const settings = settingsArr[0] || {};
  const vehicleType = vehicleTypes.find(v => v.id === booking?.vehicle_type_id);
  const account = accounts.find(a => a.id === booking?.account_id);
  const company = companies.find(c => c.id === account?.company_id);
  const invoice = invoices.find(inv => inv.id === booking?.invoice_id);

  const isReady = booking && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  if (!booking) return <div style={{ padding: 40 }}>Loading...</div>;

  const paid = invoice?.paid_amount || 0;
  const balance = (booking.client_total || 0) - paid;
  const today = new Date().toLocaleDateString('en-GB');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print" style={{ textAlign: 'right', marginBottom: 10 }}>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #000', paddingBottom: 12, marginBottom: 12 }}>
        <div>
          {settings.company_logo_url ? <img src={settings.company_logo_url} alt="Logo" style={{ height: 56 }} /> : <div style={{ fontWeight: 'bold', fontSize: 20 }}>{settings.company_name}</div>}
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{settings.company_address}</div>
          {settings.company_phone && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_phone}</div>}
          {settings.company_email && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_email}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 22 }}>Reservation Receipt</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Date of Receipt: {today}</div>
          {account?.account_number && <div style={{ fontSize: 11 }}>Account # {account.account_number}</div>}
          <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>{formatConfNumber(booking.confirmation_number)}</div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: 12, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', fontWeight: 'bold', marginBottom: 4 }}>Bill To</div>
        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{company?.company_name || account?.contact_name || '—'}</div>
        {account?.contact_name && company && <div style={{ fontSize: 11 }}>Attn: {account.contact_name}</div>}
        {company?.billing_address && <div style={{ fontSize: 10, color: '#444' }}>{company.billing_address}</div>}
      </div>

      {/* Main Detail Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 10 }}>
        <thead>
          <tr style={{ background: '#1f2937', color: '#fff' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', width: '12%' }}>CONF#</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', width: '22%' }}>DATE & TIME(S)</th>
            <th style={{ padding: '6px 8px', textAlign: 'left', width: '36%' }}>DESCRIPTION</th>
            <th style={{ padding: '6px 8px', textAlign: 'right', width: '30%' }}>CHARGES & CREDITS</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ verticalAlign: 'top' }}>
            <td style={{ border: '1px solid #ccc', padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {formatConfNumber(booking.confirmation_number)}
              <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>{booking.service_type || '—'}</div>
            </td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>{formatDate(booking.pickup_date)}</div>
              <div>PU: {booking.pickup_time || 'N/A'}</div>
              <div>DO: N/A</div>
            </td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>
              <div><strong>Passenger:</strong> {booking.primary_passenger_name || '—'}</div>
              {(booking.additional_passengers || []).length > 0 && (
                <div><strong>Addt'l:</strong> {booking.additional_passengers.join(', ')}</div>
              )}
              <div><strong>PU:</strong> {booking.pickup_location || '—'}{booking.flight_number ? ` (Flt: ${booking.flight_number})` : ''}</div>
              <div><strong>DO:</strong> {booking.dropoff_location || '—'}</div>
              {booking.booker_name && <div><strong>Booked By:</strong> {booking.booker_name}</div>}
              <div><strong>Vehicle:</strong> {vehicleType?.code || '—'}</div>
            </td>
            <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
              <div style={{ marginBottom: 4 }}>Flat Rate: <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(booking.client_base_rate || 0)}</strong></div>
              {(booking.client_extras || []).map((ex, i) => (
                <div key={i} style={{ marginBottom: 2 }}>{ex.label}: <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(ex.amount || 0)}</strong></div>
              ))}
              <div style={{ borderTop: '1px solid #ccc', paddingTop: 4, marginTop: 4 }}>
                <div>Reservation Total: <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(booking.client_total || 0)}</strong></div>
                <div style={{ fontWeight: 'bold', fontSize: 12, marginTop: 4 }}>Total Due: <span style={{ fontFamily: 'monospace' }}>{formatCurrency(balance)}</span></div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 10 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left' }}>PAYMENT METHOD</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left' }}>PAYMENT TERMS</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left' }}>PAYMENT STATUS</th>
            <th style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left' }}>TRANS ID / REF #</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>Direct Bill / Invoice</td>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>{account?.payment_terms || 'Due Upon Receipt'}</td>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}>{invoice?.payment_status || 'Not Invoiced'}</td>
            <td style={{ border: '1px solid #ccc', padding: '6px 8px', fontFamily: 'monospace' }}>{invoice?.payment_reference || 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #ccc' }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>THANK YOU FOR YOUR BUSINESS!</div>
        {settings.bank_details && <div style={{ fontSize: 9, color: '#666', whiteSpace: 'pre-line', textAlign: 'left', marginBottom: 8 }}>{settings.bank_details}</div>}
        <div style={{ fontSize: 8, color: '#888', fontStyle: 'italic' }}>* Pre-authorized transaction amounts are not subtracted from total due until after they are fully captured.</div>
      </div>
    </div>
  );
}