import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import { useAppSettings } from '@/lib/useAppSettings';
import { formatCurrency, calcBookingTotals } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, parseISO } from 'date-fns';
import { Printer, Download } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

export default function VatReport() {
  const { settings } = useAppSettings();
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-invoice_date', 500) });
  const { data: statements = [] } = useQuery({ queryKey: ['statements'], queryFn: () => base44.entities.VendorStatement.list('-date', 500) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 1000) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
  const affiliateMap = Object.fromEntries(affiliates.map(a => [a.id, a]));
  const bookingMap = Object.fromEntries(bookings.map(b => [b.id, b]));

  const handlePeriodChange = (p) => {
    setPeriod(p);
    const now = new Date();
    if (p === 'month') { setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd')); setDateTo(format(endOfMonth(now), 'yyyy-MM-dd')); }
    else if (p === 'quarter') { setDateFrom(format(startOfQuarter(now), 'yyyy-MM-dd')); setDateTo(format(endOfQuarter(now), 'yyyy-MM-dd')); }
  };

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    return acc ? (companyMap[acc.company_id]?.company_name || acc.contact_name) : '—';
  };

  // Output VAT — from invoices in period
  const outputRows = useMemo(() => {
    return invoices.filter(inv => inv.invoice_date >= dateFrom && inv.invoice_date <= dateTo)
      .map(inv => {
        // Calculate from linked bookings if available
        const invBookings = (inv.booking_ids || []).map(bid => bookingMap[bid]).filter(Boolean);
        let taxableAmount = 0, vatAmount = 0;
        if (invBookings.length > 0) {
          invBookings.forEach(b => { const t = calcBookingTotals(b); taxableAmount += t.clientNet; vatAmount += t.clientVat; });
        } else {
          taxableAmount = inv.subtotal || 0; vatAmount = inv.vat_total || 0;
        }
        return {
          number: inv.invoice_number, date: inv.invoice_date,
          client: getClientName(inv.account_id),
          taxableAmount, vatAmount, total: taxableAmount + vatAmount,
          vatRate: taxableAmount > 0 ? Math.round((vatAmount / taxableAmount) * 100 * 10) / 10 : 0,
        };
      });
  }, [invoices, dateFrom, dateTo, bookingMap, accountMap, companyMap]);

  // Input VAT — from vendor statements in period
  const inputRows = useMemo(() => {
    return statements.filter(s => s.date >= dateFrom && s.date <= dateTo)
      .map(stmt => {
        const stmtBookings = (stmt.booking_ids || []).map(bid => bookingMap[bid]).filter(Boolean);
        let taxableAmount = 0, vatAmount = 0;
        stmtBookings.forEach(b => { const t = calcBookingTotals(b); taxableAmount += t.vendorNet; vatAmount += t.vendorVat; });
        if (stmtBookings.length === 0) { taxableAmount = stmt.total || 0; }
        return {
          number: stmt.statement_number, date: stmt.date,
          vendor: affiliateMap[stmt.affiliate_id]?.name || '—',
          taxableAmount, vatAmount, total: taxableAmount + vatAmount,
          vatRate: taxableAmount > 0 ? Math.round((vatAmount / taxableAmount) * 100 * 10) / 10 : 0,
        };
      });
  }, [statements, dateFrom, dateTo, bookingMap, affiliateMap]);

  const totalOutputVat = outputRows.reduce((s, r) => s + r.vatAmount, 0);
  const totalInputVat = inputRows.reduce((s, r) => s + r.vatAmount, 0);
  const netVatPayable = totalOutputVat - totalInputVat;

  const exportToCsv = () => {
    const lines = ['VAT RETURN REPORT', `Period: ${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`, `TRN: ${settings.company_tax_id || ''}`, '', 'OUTPUT VAT', 'Invoice#,Date,Client,Taxable Amount,VAT %,VAT Amount,Total'];
    outputRows.forEach(r => lines.push(`${r.number},${fmtDate(r.date)},"${r.client}",${r.taxableAmount.toFixed(2)},${r.vatRate}%,${r.vatAmount.toFixed(2)},${r.total.toFixed(2)}`));
    lines.push(`,,Total Output VAT,,,${totalOutputVat.toFixed(2)},`);
    lines.push('', 'INPUT VAT', 'Statement#,Date,Vendor,Taxable Amount,VAT %,VAT Amount,Total');
    inputRows.forEach(r => lines.push(`${r.number},${fmtDate(r.date)},"${r.vendor}",${r.taxableAmount.toFixed(2)},${r.vatRate}%,${r.vatAmount.toFixed(2)},${r.total.toFixed(2)}`));
    lines.push(`,,Total Input VAT,,,${totalInputVat.toFixed(2)},`);
    lines.push('', 'SUMMARY', `Total Output VAT,${totalOutputVat.toFixed(2)}`, `Total Input VAT,${totalInputVat.toFixed(2)}`, `Net VAT Payable,${netVatPayable.toFixed(2)}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `VAT-Report-${dateFrom}-${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="VAT Report"
        subtitle={`${settings.company_name} — TRN: ${settings.company_tax_id || 'Not set'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCsv}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 no-print">
        <div>
          <Label className="text-xs text-muted-foreground">Period</Label>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriod('custom'); }} className="bg-secondary border-border w-36" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPeriod('custom'); }} className="bg-secondary border-border w-36" />
        </div>
      </div>

      <div className="space-y-8" id="vat-report-content">
        {/* Report Header for print */}
        <div className="print-only mb-8">
          <h1 className="text-2xl font-bold">VAT Return</h1>
          <p className="text-lg">{settings.company_name}</p>
          <p>TRN: {settings.company_tax_id || '—'}</p>
          <p>Period: {fmtDate(dateFrom)} to {fmtDate(dateTo)}</p>
        </div>

        {/* Output VAT */}
        <div>
          <h3 className="text-base font-serif italic text-foreground mb-3 flex items-center gap-2">
            Output VAT <span className="text-sm font-mono text-emerald-400 font-normal">(Sales)</span>
          </h3>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Invoice #</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Taxable (AED)</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">VAT %</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">VAT (AED)</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Total (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {outputRows.map((r, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-primary">{r.number}</td>
                    <td className="px-4 py-2">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.client}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.taxableAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.vatRate}%</td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-400">{r.vatAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">{r.total.toFixed(2)}</td>
                  </tr>
                ))}
                {outputRows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices in period</td></tr>}
                <tr className="border-t-2 border-border bg-secondary/50 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right">Total Output VAT</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{totalOutputVat.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{outputRows.reduce((s, r) => s + r.total, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Input VAT */}
        <div>
          <h3 className="text-base font-serif italic text-foreground mb-3 flex items-center gap-2">
            Input VAT <span className="text-sm font-mono text-red-400 font-normal">(Purchases)</span>
          </h3>
          <div className="bg-card rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Statement #</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Taxable (AED)</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">VAT %</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">VAT (AED)</th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Total (AED)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inputRows.map((r, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-primary">{r.number}</td>
                    <td className="px-4 py-2">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.vendor}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.taxableAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.vatRate}%</td>
                    <td className="px-4 py-2 text-right font-mono text-red-400">{r.vatAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">{r.total.toFixed(2)}</td>
                  </tr>
                ))}
                {inputRows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No statements in period</td></tr>}
                <tr className="border-t-2 border-border bg-secondary/50 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right">Total Input VAT</td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">{totalInputVat.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{inputRows.reduce((s, r) => s + r.total, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="max-w-md">
          <h3 className="text-base font-serif italic text-foreground mb-3">VAT Summary</h3>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex justify-between px-5 py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Output VAT (Sales)</span>
              <span className="font-mono font-medium text-emerald-400">AED {totalOutputVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-5 py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Input VAT (Purchases)</span>
              <span className="font-mono font-medium text-red-400">AED {totalInputVat.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between px-5 py-4 ${netVatPayable >= 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
              <span className="font-bold text-foreground">Net VAT Payable to FTA</span>
              <span className={`font-mono font-bold text-lg ${netVatPayable >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>AED {netVatPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}