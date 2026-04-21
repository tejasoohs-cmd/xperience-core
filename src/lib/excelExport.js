/**
 * Simple CSV-based "Excel" export (no external lib needed)
 * Downloads a CSV file per sheet. For true .xlsx, SheetJS would be needed.
 */

import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals, getDaysOverdue } from './formatters';

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowToCsv(row) {
  return row.map(escapeCsv).join(',');
}

function downloadCsv(filename, rows) {
  const content = rows.map(rowToCsv).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportBookingsToCsv(bookings, accountMap, companyMap, vehicleTypeMap) {
  const headers = ['Conf#', 'Date', 'Time', 'Status', 'Service Type', 'Client', 'Guest', 'Pickup', 'Dropoff', 'Vehicle', 'Driver Source', 'Client Total (AED)', 'Vendor Total (AED)', 'Profit (AED)', 'Invoice ID', 'Statement ID'];
  const rows = [headers];
  bookings.forEach(b => {
    const acc = accountMap[b.account_id];
    const comp = acc ? companyMap[acc.company_id] : null;
    const t = calcBookingTotals(b);
    rows.push([
      formatConfNumber(b.confirmation_number), b.pickup_date || '', b.pickup_time || '',
      b.status || '', b.service_type || '',
      comp?.company_name || acc?.contact_name || '',
      b.primary_passenger_name || '', b.pickup_location || '', b.dropoff_location || '',
      vehicleTypeMap[b.vehicle_type_id]?.name || '',
      b.driver_source || '',
      (b.client_total || t.clientTotal).toFixed(2),
      (b.vendor_total || t.vendorTotal).toFixed(2),
      (b.profit || t.profit).toFixed(2),
      b.invoice_id || '', b.statement_id || '',
    ]);
  });
  downloadCsv(`bookings-export-${new Date().toISOString().split('T')[0]}.csv`, rows);
}

export function exportInvoicesToCsv(invoices, accountMap, companyMap) {
  const headers = ['Invoice #', 'Date', 'Due Date', 'Client', 'Total (AED)', 'Paid (AED)', 'Outstanding (AED)', 'Status', 'Days Overdue', 'Finalized'];
  const rows = [headers];
  invoices.forEach(inv => {
    const acc = accountMap[inv.account_id];
    const comp = acc ? companyMap[acc.company_id] : null;
    const outstanding = (inv.grand_total || 0) - (inv.paid_amount || 0);
    const daysOverdue = getDaysOverdue(inv.due_date);
    rows.push([
      inv.invoice_number || '', inv.invoice_date || '', inv.due_date || '',
      comp?.company_name || acc?.contact_name || '',
      (inv.grand_total || 0).toFixed(2), (inv.paid_amount || 0).toFixed(2), outstanding.toFixed(2),
      inv.payment_status || '', daysOverdue > 0 ? daysOverdue : '',
      inv.finalized ? 'Yes' : 'No',
    ]);
  });
  downloadCsv(`invoices-export-${new Date().toISOString().split('T')[0]}.csv`, rows);
}

export function exportStatementsToCsv(statements, affiliateMap) {
  const headers = ['Statement #', 'Date', 'Vendor', 'Total (AED)', 'Paid (AED)', 'Outstanding (AED)', 'Status'];
  const rows = [headers];
  statements.forEach(s => {
    const outstanding = (s.total || 0) - (s.paid_amount || 0);
    rows.push([
      s.statement_number || '', s.date || '',
      affiliateMap[s.affiliate_id]?.name || '',
      (s.total || 0).toFixed(2), (s.paid_amount || 0).toFixed(2), outstanding.toFixed(2),
      s.payment_status || '',
    ]);
  });
  downloadCsv(`statements-export-${new Date().toISOString().split('T')[0]}.csv`, rows);
}

export function exportQuotesToCsv(quotes, accountMap, companyMap) {
  const headers = ['Quote #', 'Date', 'Expiry', 'Client', 'Service Type', 'Pickup Date', 'Total (AED)', 'Status', 'Converted Booking ID'];
  const rows = [headers];
  quotes.forEach(q => {
    const acc = accountMap[q.account_id];
    const comp = acc ? companyMap[acc.company_id] : null;
    rows.push([
      q.quote_number || '', q.quote_date || '', q.expiry_date || '',
      comp?.company_name || acc?.contact_name || '',
      q.service_type || '', q.pickup_date || '',
      (q.client_total || 0).toFixed(2), q.status || '',
      q.converted_booking_id || '',
    ]);
  });
  downloadCsv(`quotes-export-${new Date().toISOString().split('T')[0]}.csv`, rows);
}