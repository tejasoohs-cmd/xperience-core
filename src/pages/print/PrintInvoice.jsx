import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';

export default function PrintInvoice() {
  const { id } = useParams();

  const { data: invoiceArr = [] } = useQuery({ queryKey: ['print-invoice', id], queryFn: () => base44.entities.Invoice.filter({ id }) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const inv = invoiceArr[0];
  const settings = settingsArr[0] || {};
  const account = useMemo(() => accounts.find(a => a.id === inv?.account_id), [accounts, inv]);
  const company = useMemo(() => companies.find(c => c.id === account?.company_id), [companies, account]);
  const invBookings = useMemo(() => bookings.filter(b => (inv?.booking_ids || []).includes(b.id)), [bookings, inv]);
  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);
  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);

  const isReady = inv && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  if (!inv) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 850, margin: '0 auto', padding: 24 }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print" style={{ textAlign: 'right', marginBottom: 10 }}>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {settings.company_logo_url ? <img src={settings.company_logo_url} alt="Logo" style={{ height: 60, marginBottom: 6 }} /> : <div style={{ fontWeight: 'bold', fontSize: 20 }}>{settings.company_name}</div>}
          <div style={{ fontSize: 10, color: '#555' }}>{settings.company_address}</div>
          {settings.company_phone && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_phone}</div>}
          {settings.company_email && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_email}</div>}
          {settings.company_tax_id && <div style={{ fontSize: 10, color: '#555' }}>TRN: {settings.company_tax_id}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555' }}>Sales Invoice</div>
          <div style={{ fontWeight: 'bold', fontSize: 16, fontFamily: 'monospace' }}>Invoice# {inv.invoice_number}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Invoice Date: {formatDate(inv.invoice_date)}</div>
          <div style={{ fontSize: 11 }}>Terms: {account?.payment_terms || 'Due Upon Receipt'}</div>
          <div style={{ fontSize: 11 }}>Due By: {formatDate(inv.due_date)}</div>
        </div>
      </div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: 14 }} />

      {/* Invoice To */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', fontWeight: 'bold', marginBottom: 4 }}>Invoice To</div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{company?.company_name || account?.contact_name || '—'}</div>
          {account?.contact_name && company && <div style={{ fontSize: 11 }}>Attn: {account.contact_name}</div>}
          {company?.billing_address && <div style={{ fontSize: 10, color: '#444' }}>{company.billing_address}</div>}
          {company?.tax_id && <div style={{ fontSize: 10 }}>TRN: {company.tax_id}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#666' }}>PO Number: <span style={{ color: '#000', fontFamily: 'monospace' }}>{invBookings[0]?.po_client_ref || '—'}</span></div>
        </div>
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#1f2937', color: '#fff' }}>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Conf# / Svc</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>PU Date / Time</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Passenger / Booker</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Vehicle / Driver</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Ref / Route</th>
            <th style={{ padding: '7px 6px', textAlign: 'right' }}>NET</th>
            <th style={{ padding: '7px 6px', textAlign: 'right' }}>VAT</th>
          </tr>
        </thead>
        <tbody>
          {invBookings.map((b, idx) => {
            const t = calcBookingTotals(b);
            const vt = vtMap[b.vehicle_type_id];
            const drv = driverMap[b.driver_id];
            return (
              <tr key={b.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', verticalAlign: 'top' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{formatConfNumber(b.confirmation_number)}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>{b.service_type || '—'}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>
                  <div>{formatDate(b.pickup_date)}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#555' }}>{b.pickup_time || '—'}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>
                  <div>{b.primary_passenger_name || '—'}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>{b.booker_name || '—'}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>
                  <div>{vt?.name || '—'}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>{drv?.name || '—'}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px', fontSize: 9 }}>
                  <div style={{ fontFamily: 'monospace' }}>{b.po_client_ref || '—'}</div>
                  <div style={{ color: '#555' }}>{b.pickup_location} → {b.dropoff_location}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(t.clientNet)}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(t.clientVat)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
            <td colSpan={5} style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right' }}>Totals:</td>
            <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(inv.subtotal)}</td>
            <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(inv.vat_total)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Grand Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 260, border: '2px solid #000', padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(inv.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(inv.vat_total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: 6, marginTop: 4, fontWeight: 'bold', fontSize: 14 }}><span>TOTAL DUE:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(inv.grand_total)}</span></div>
          {inv.paid_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginTop: 4 }}><span>Paid:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(inv.paid_amount)}</span></div>}
        </div>
      </div>

      {/* Footer */}
      {settings.bank_details && (
        <div style={{ borderTop: '1px solid #ccc', paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 4 }}>Bank Details:</div>
          <div style={{ fontSize: 10, color: '#555', whiteSpace: 'pre-line' }}>{settings.bank_details}</div>
        </div>
      )}
      {settings.invoice_footer_notes && (
        <div style={{ marginTop: 10, fontSize: 9, color: '#888', fontStyle: 'italic' }}>{settings.invoice_footer_notes}</div>
      )}
    </div>
  );
}