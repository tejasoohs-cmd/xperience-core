import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, calcBookingTotals } from '@/lib/formatters';

export default function PrintQuote() {
  const { id } = useParams();

  const { data: quoteArr = [] } = useQuery({ queryKey: ['print-quote', id], queryFn: () => base44.entities.Quote.filter({ id }) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const quote = quoteArr[0];
  const settings = settingsArr[0] || {};
  const account = useMemo(() => accounts.find(a => a.id === quote?.account_id), [accounts, quote]);
  const company = useMemo(() => companies.find(c => c.id === account?.company_id), [companies, account]);
  const vehicleType = vehicleTypes.find(v => v.id === quote?.vehicle_type_id);

  const isReady = quote && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  if (!quote) return <div style={{ padding: 40 }}>Loading...</div>;

  const totals = calcBookingTotals(quote);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } @page { size: A4 portrait; margin: 12mm; } }`}</style>

      <div className="no-print" style={{ textAlign: 'right', marginBottom: 10 }}>
        <button onClick={() => window.close()} style={{ padding: '6px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          {settings.company_logo_url ? <img src={settings.company_logo_url} alt="Logo" style={{ height: 56, marginBottom: 6 }} /> : <div style={{ fontWeight: 'bold', fontSize: 20 }}>{settings.company_name}</div>}
          <div style={{ fontSize: 10, color: '#555' }}>{settings.company_address}</div>
          {settings.company_phone && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_phone}</div>}
          {settings.company_email && <div style={{ fontSize: 10, color: '#555' }}>{settings.company_email}</div>}
          {settings.company_tax_id && <div style={{ fontSize: 10, color: '#555' }}>TRN: {settings.company_tax_id}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 26, letterSpacing: 2 }}>QUOTATION</div>
          <div style={{ fontWeight: 'bold', fontSize: 14, fontFamily: 'monospace', marginTop: 4 }}>Quote# {quote.quote_number}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Date: {formatDate(quote.quote_date)}</div>
          {quote.expiry_date && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 'bold' }}>Valid Until: {formatDate(quote.expiry_date)}</div>}
        </div>
      </div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: 14 }} />

      {/* Prepared For */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', fontWeight: 'bold', marginBottom: 4 }}>Prepared For</div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{company?.company_name || account?.contact_name || '—'}</div>
          {account?.contact_name && company && <div style={{ fontSize: 11 }}>Attn: {account.contact_name}</div>}
          {company?.billing_address && <div style={{ fontSize: 10, color: '#444' }}>{company.billing_address}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {quote.po_client_ref && <div style={{ fontSize: 9, color: '#666' }}>PO Ref: <span style={{ color: '#000', fontFamily: 'monospace' }}>{quote.po_client_ref}</span></div>}
          <div style={{ fontSize: 9, color: '#666' }}>Status: <span style={{ color: '#000' }}>{quote.status}</span></div>
        </div>
      </div>

      {/* Trip Details */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
        <thead><tr style={{ background: '#1f2937', color: '#fff' }}><th colSpan={2} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Trip Details</th></tr></thead>
        <tbody>
          {[
            ['Service Type', quote.service_type || '—'],
            ['Pickup Date', formatDate(quote.pickup_date)],
            ['Pickup Time', quote.pickup_time || '—'],
            ['From', quote.pickup_location || '—'],
            ['To', quote.dropoff_location || '—'],
            ['Vehicle Type', vehicleType ? `${vehicleType.code} - ${vehicleType.name}` : '—'],
            ['No. of Passengers', quote.passenger_count || 1],
            ['No. of Luggage', quote.luggage_count || 0],
            ...(quote.flight_number ? [['Flight #', quote.flight_number]] : []),
            ['Passenger Name', quote.primary_passenger_name || '—'],
          ].map(([label, val]) => (
            <tr key={label}>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb', width: 180, fontSize: 10, fontWeight: 'bold' }}>{label}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px' }}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pricing */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
        <thead><tr style={{ background: '#1f2937', color: '#fff' }}><th colSpan={2} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase' }}>Pricing</th></tr></thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb', width: 180, fontSize: 10, fontWeight: 'bold' }}>Base Rate</td>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontFamily: 'monospace' }}>{formatCurrency(quote.client_base_rate || 0)}</td>
          </tr>
          {(quote.client_extras || []).map((ex, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb', fontSize: 10, fontWeight: 'bold' }}>{ex.label}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontFamily: 'monospace' }}>{formatCurrency(ex.amount || 0)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb', fontSize: 10, fontWeight: 'bold' }}>Subtotal</td>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontFamily: 'monospace' }}>{formatCurrency(totals.clientNet)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', background: '#f9fafb', fontSize: 10, fontWeight: 'bold' }}>VAT ({quote.client_vat_percent || 5}%)</td>
            <td style={{ border: '1px solid #e5e7eb', padding: '5px 8px', fontFamily: 'monospace' }}>{formatCurrency(totals.clientVat)}</td>
          </tr>
          <tr style={{ background: '#1f2937', color: '#fff' }}>
            <td style={{ border: '1px solid #374151', padding: '7px 8px', fontWeight: 'bold', fontSize: 12 }}>TOTAL (AED)</td>
            <td style={{ border: '1px solid #374151', padding: '7px 8px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 14 }}>{formatCurrency(totals.clientTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      {quote.notes && (
        <div style={{ padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 16, fontSize: 10 }}>
          <strong>Notes:</strong> {quote.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 12, marginTop: 12, fontSize: 10, color: '#666', fontStyle: 'italic' }}>
        This quotation is valid until {formatDate(quote.expiry_date)}. Please confirm acceptance to convert to booking.
        {settings.invoice_footer_notes && <div style={{ marginTop: 6 }}>{settings.invoice_footer_notes}</div>}
      </div>
    </div>
  );
}