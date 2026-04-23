import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals } from '@/lib/formatters';

export default function PrintVendorStatement() {
  const { id } = useParams();

  const { data: stmtArr = [] } = useQuery({ queryKey: ['print-stmt', id], queryFn: () => base44.entities.VendorStatement.filter({ id }) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: settingsArr = [] } = useQuery({ queryKey: ['appSettings'], queryFn: () => base44.entities.AppSettings.list() });

  const stmt = stmtArr[0];
  const settings = settingsArr[0] || {};
  const affiliate = useMemo(() => affiliates.find(a => a.id === stmt?.affiliate_id), [affiliates, stmt]);
  const stmtBookings = useMemo(() => bookings.filter(b => (stmt?.booking_ids || []).includes(b.id)), [bookings, stmt]);
  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);

  const isReady = stmt && settings;

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [isReady]);

  if (!stmt) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#000', background: '#fff', maxWidth: 850, margin: '0 auto', padding: 24 }}>
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
          {settings.company_tax_id && <div style={{ fontSize: 10, color: '#555' }}>TRN: {settings.company_tax_id}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555' }}>Vendor Statement</div>
          <div style={{ fontWeight: 'bold', fontSize: 16, fontFamily: 'monospace' }}>Stmt# {stmt.statement_number}</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Date: {formatDate(stmt.date)}</div>
        </div>
      </div>

      <div style={{ borderBottom: '2px solid #000', marginBottom: 14 }} />

      {/* Vendor info */}
      <div style={{ marginBottom: 14, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#666', fontWeight: 'bold', marginBottom: 4 }}>Vendor</div>
        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{affiliate?.name || '—'}</div>
        {affiliate?.contact_person && <div style={{ fontSize: 11 }}>Attn: {affiliate.contact_person}</div>}
        {affiliate?.address && <div style={{ fontSize: 10, color: '#444' }}>{affiliate.address}</div>}
        {affiliate?.email && <div style={{ fontSize: 10, color: '#444' }}>{affiliate.email}</div>}
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#1f2937', color: '#fff' }}>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Conf# / Svc</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>PU Date</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Passenger</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Vehicle Type</th>
            <th style={{ padding: '7px 6px', textAlign: 'left' }}>Route</th>
            <th style={{ padding: '7px 6px', textAlign: 'right' }}>Vendor Rate</th>
          </tr>
        </thead>
        <tbody>
          {stmtBookings.map((b, idx) => {
            const t = calcBookingTotals(b);
            const vt = vtMap[b.vehicle_type_id];
            return (
              <tr key={b.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', verticalAlign: 'top' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{formatConfNumber(b.confirmation_number)}</div>
                  <div style={{ fontSize: 9, color: '#555' }}>{b.service_type || '—'}</div>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>{formatDate(b.pickup_date)}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>{b.primary_passenger_name || '—'}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px' }}>{vt?.name || '—'}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px', fontSize: 9, color: '#555' }}>{b.pickup_location} → {b.dropoff_location}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(t.vendorTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ width: 220, border: '2px solid #000', padding: '10px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14 }}>
            <span>TOTAL DUE:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(stmt.total)}</span>
          </div>
          {stmt.paid_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginTop: 4 }}>
              <span>Paid:</span><span style={{ fontFamily: 'monospace' }}>{formatCurrency(stmt.paid_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {stmt.notes && <div style={{ borderTop: '1px solid #ccc', paddingTop: 10, fontSize: 10, color: '#555' }}><strong>Notes:</strong> {stmt.notes}</div>}
    </div>
  );
}