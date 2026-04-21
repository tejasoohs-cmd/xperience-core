import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';

export function formatCurrency(amount, currency = 'AED') {
  if (amount == null || isNaN(amount)) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, 'dd MMM yyyy');
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  return timeStr;
}

export function formatConfNumber(num) {
  if (!num) return '—';
  return `XT-${num}`;
}

export function calcBookingTotals(booking) {
  const clientExtrasSum = (booking.client_extras || []).reduce((s, e) => s + (e.amount || 0), 0);
  const clientNet = (booking.client_base_rate || 0) + clientExtrasSum;
  const clientVat = clientNet * ((booking.client_vat_percent || 0) / 100);
  const clientTotal = clientNet + clientVat;

  const vendorExtrasSum = (booking.vendor_extras || []).reduce((s, e) => s + (e.amount || 0), 0);
  const vendorNet = (booking.vendor_base_rate || 0) + vendorExtrasSum;
  const vendorVat = vendorNet * ((booking.vendor_vat_percent || 0) / 100);
  const vendorTotal = vendorNet + vendorVat;

  const profit = clientTotal - vendorTotal;

  return { clientNet, clientVat, clientTotal, vendorNet, vendorVat, vendorTotal, profit };
}

export function getDaysOverdue(dueDateStr) {
  if (!dueDateStr) return 0;
  const due = parseISO(dueDateStr);
  const diff = differenceInDays(new Date(), due);
  return diff > 0 ? diff : 0;
}