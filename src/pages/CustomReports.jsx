import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatCurrency, formatDate, formatConfNumber, calcBookingTotals, getDaysOverdue } from '@/lib/formatters';
import { Download, Play, Save, Trash2, BarChart2 } from 'lucide-react';

// ── Column definitions per entity ──────────────────────────────────────────
const BOOKING_COLS = [
  { key: 'confirmation_number', label: 'Conf #', get: (b, m) => formatConfNumber(b.confirmation_number) },
  { key: 'pickup_date', label: 'Pickup Date', get: b => formatDate(b.pickup_date) },
  { key: 'pickup_time', label: 'Pickup Time', get: b => b.pickup_time || '' },
  { key: 'service_type', label: 'Service Type', get: b => b.service_type || '' },
  { key: 'status', label: 'Status', get: b => b.status || '' },
  { key: 'account', label: 'Client', get: (b, m) => m.getAccountName(b.account_id) },
  { key: 'booker_name', label: 'Booker', get: b => b.booker_name || '' },
  { key: 'primary_passenger_name', label: 'Passenger', get: b => b.primary_passenger_name || '' },
  { key: 'primary_passenger_phone', label: 'Phone', get: b => b.primary_passenger_phone || '' },
  { key: 'primary_passenger_email', label: 'Email', get: b => b.primary_passenger_email || '' },
  { key: 'pickup_location', label: 'Pickup Location', get: b => b.pickup_location || '' },
  { key: 'dropoff_location', label: 'Dropoff Location', get: b => b.dropoff_location || '' },
  { key: 'passenger_count', label: 'Pax Count', get: b => b.passenger_count ?? '' },
  { key: 'luggage_count', label: 'Luggage', get: b => b.luggage_count ?? '' },
  { key: 'vehicle_type', label: 'Vehicle Type', get: (b, m) => m.getVehicleType(b.vehicle_type_id) },
  { key: 'driver', label: 'Driver', get: (b, m) => m.getDriver(b.driver_id) },
  { key: 'driver_source', label: 'Driver Source', get: b => b.driver_source || '' },
  { key: 'affiliate', label: 'Affiliate', get: (b, m) => m.getAffiliate(b.affiliate_id) },
  { key: 'client_base_rate', label: 'Client Base Rate', get: b => b.client_base_rate ?? 0 },
  { key: 'client_total', label: 'Client Total', get: b => b.client_total ?? 0 },
  { key: 'vendor_base_rate', label: 'Vendor Base Rate', get: b => b.vendor_base_rate ?? 0 },
  { key: 'vendor_total', label: 'Vendor Total', get: b => b.vendor_total ?? 0 },
  { key: 'profit', label: 'Profit', get: b => b.profit ?? 0 },
  { key: 'flight_number', label: 'Flight #', get: b => b.flight_number || '' },
  { key: 'flight_schedule_time', label: 'Flight Time', get: b => b.flight_schedule_time || '' },
  { key: 'po_client_ref', label: 'Client Ref / PO', get: b => b.po_client_ref || '' },
  { key: 'trip_notes', label: 'Trip Notes', get: b => b.trip_notes || '' },
  { key: 'dispatch_notes', label: 'Dispatch Notes', get: b => b.dispatch_notes || '' },
  { key: 'created_date', label: 'Created At', get: b => formatDate(b.created_date) },
];

const INVOICE_COLS = [
  { key: 'invoice_number', label: 'Invoice #', get: i => i.invoice_number },
  { key: 'invoice_date', label: 'Invoice Date', get: i => formatDate(i.invoice_date) },
  { key: 'due_date', label: 'Due Date', get: i => formatDate(i.due_date) },
  { key: 'client', label: 'Client', get: (i, m) => m.getAccountName(i.account_id) },
  { key: 'grand_total', label: 'Total', get: i => i.grand_total ?? 0 },
  { key: 'paid_amount', label: 'Paid', get: i => i.paid_amount ?? 0 },
  { key: 'outstanding', label: 'Outstanding', get: i => (i.grand_total || 0) - (i.paid_amount || 0) },
  { key: 'payment_status', label: 'Status', get: i => i.payment_status },
  { key: 'days_overdue', label: 'Days Overdue', get: i => getDaysOverdue(i.due_date) },
  { key: 'payment_method', label: 'Payment Method', get: i => i.payment_method || '' },
  { key: 'payment_date', label: 'Payment Date', get: i => formatDate(i.payment_date) },
  { key: 'payment_reference', label: 'Payment Ref', get: i => i.payment_reference || '' },
  { key: 'booking_count', label: '# Bookings', get: i => (i.booking_ids || []).length },
];

const STATEMENT_COLS = [
  { key: 'statement_number', label: 'Statement #', get: s => s.statement_number },
  { key: 'date', label: 'Date', get: s => formatDate(s.date) },
  { key: 'affiliate', label: 'Vendor / Affiliate', get: (s, m) => m.getAffiliate(s.affiliate_id) },
  { key: 'total', label: 'Total', get: s => s.total ?? 0 },
  { key: 'paid_amount', label: 'Paid', get: s => s.paid_amount ?? 0 },
  { key: 'outstanding', label: 'Outstanding', get: s => (s.total || 0) - (s.paid_amount || 0) },
  { key: 'payment_status', label: 'Status', get: s => s.payment_status },
  { key: 'payment_method', label: 'Method', get: s => s.payment_method || '' },
  { key: 'payment_date', label: 'Payment Date', get: s => formatDate(s.payment_date) },
  { key: 'payment_reference', label: 'Ref', get: s => s.payment_reference || '' },
  { key: 'booking_count', label: '# Bookings', get: s => (s.booking_ids || []).length },
];

const QUOTE_COLS = [
  { key: 'quote_number', label: 'Quote #', get: q => q.quote_number },
  { key: 'quote_date', label: 'Date', get: q => formatDate(q.quote_date) },
  { key: 'expiry_date', label: 'Expiry', get: q => formatDate(q.expiry_date) },
  { key: 'client', label: 'Client', get: (q, m) => m.getAccountName(q.account_id) },
  { key: 'client_total', label: 'Total', get: q => q.client_total ?? 0 },
  { key: 'status', label: 'Status', get: q => q.status },
  { key: 'booker_name', label: 'Booker', get: q => q.booker_name || '' },
  { key: 'service_type', label: 'Service Type', get: q => q.service_type || '' },
  { key: 'created_date', label: 'Created At', get: q => formatDate(q.created_date) },
];

const COLS_MAP = { Bookings: BOOKING_COLS, Invoices: INVOICE_COLS, 'Vendor Statements': STATEMENT_COLS, Quotes: QUOTE_COLS };
const DEFAULT_COLS = { Bookings: ['confirmation_number','pickup_date','service_type','status','account','primary_passenger_name','client_total'], Invoices: ['invoice_number','invoice_date','client','grand_total','payment_status'], 'Vendor Statements': ['statement_number','date','affiliate','total','payment_status'], Quotes: ['quote_number','quote_date','client','client_total','status'] };

function exportCsv(rows, cols) {
  const header = cols.map(c => c.label).join(',');
  const body = rows.map(r => cols.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function CustomReports() {
  const [entity, setEntity] = useState('Bookings');
  const [selectedCols, setSelectedCols] = useState(new Set(DEFAULT_COLS['Bookings']));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [results, setResults] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [running, setRunning] = useState(false);

  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 1000) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-invoice_date', 500) });
  const { data: statements = [] } = useQuery({ queryKey: ['statements'], queryFn: () => base44.entities.VendorStatement.list('-date', 500) });
  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list('-quote_date', 500) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });
  const { data: templates = [] } = useQuery({ queryKey: ['reportTemplates'], queryFn: () => base44.entities.ReportTemplate.list() });
  const queryClient = useQueryClient();

  const maps = useMemo(() => {
    const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
    return {
      getAccountName: (id) => { const a = accountMap[id]; const c = companyMap[a?.company_id]; return c?.company_name || a?.contact_name || id || '—'; },
      getAffiliate: (id) => affiliates.find(a => a.id === id)?.name || '—',
      getDriver: (id) => drivers.find(d => d.id === id)?.name || '—',
      getVehicleType: (id) => vehicleTypes.find(v => v.id === id)?.name || '—',
    };
  }, [accounts, companies, affiliates, drivers, vehicleTypes]);

  const cols = COLS_MAP[entity] || [];

  const toggleCol = (key) => {
    setSelectedCols(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleEntityChange = (e) => {
    setEntity(e);
    setSelectedCols(new Set(DEFAULT_COLS[e] || []));
    setResults(null);
  };

  const runReport = () => {
    setRunning(true);
    let src = [];
    if (entity === 'Bookings') src = bookings;
    else if (entity === 'Invoices') src = invoices;
    else if (entity === 'Vendor Statements') src = statements;
    else if (entity === 'Quotes') src = quotes;

    // Date filter
    const dateField = { Bookings: 'pickup_date', Invoices: 'invoice_date', 'Vendor Statements': 'date', Quotes: 'quote_date' }[entity];
    if (dateFrom) src = src.filter(r => r[dateField] >= dateFrom);
    if (dateTo) src = src.filter(r => r[dateField] <= dateTo);
    if (statusFilter) src = src.filter(r => (r.status || r.payment_status) === statusFilter);

    const activeCols = cols.filter(c => selectedCols.has(c.key));
    const rows = src.map(r => {
      const row = {};
      activeCols.forEach(c => { row[c.key] = c.get(r, maps); });
      return row;
    });
    setResults({ rows, activeCols });
    setRunning(false);
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    await base44.entities.ReportTemplate.create({
      name: templateName, entity_type: entity,
      selected_columns: Array.from(selectedCols),
      filters: { dateFrom, dateTo, statusFilter }
    });
    queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
    setTemplateName('');
  };

  const loadTemplate = (t) => {
    setEntity(t.entity_type);
    setSelectedCols(new Set(t.selected_columns || []));
    setDateFrom(t.filters?.dateFrom || '');
    setDateTo(t.filters?.dateTo || '');
    setStatusFilter(t.filters?.statusFilter || '');
    setResults(null);
  };

  const deleteTemplate = async (id) => {
    await base44.entities.ReportTemplate.delete(id);
    queryClient.invalidateQueries({ queryKey: ['reportTemplates'] });
  };

  const activeCols = cols.filter(c => selectedCols.has(c.key));

  return (
    <div>
      <PageHeader title="Custom Report Builder" subtitle="Select data source, columns, and filters to generate reports" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Builder */}
        <div className="lg:col-span-3 space-y-6">
          {/* Step 1 */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="text-sm font-serif italic text-foreground mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
              Data Source
            </h3>
            <div className="flex gap-2 flex-wrap">
              {['Bookings', 'Invoices', 'Vendor Statements', 'Quotes'].map(e => (
                <button key={e} onClick={() => handleEntityChange(e)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${entity === e ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="text-sm font-serif italic text-foreground mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
              Columns ({selectedCols.size} selected)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {cols.map(c => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer text-sm text-foreground hover:text-primary">
                  <Checkbox checked={selectedCols.has(c.key)} onCheckedChange={() => toggleCol(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="text-sm font-serif italic text-foreground mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
              Filters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label className="text-xs text-muted-foreground">Date From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Date To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Status</Label>
                <Input value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="e.g. Completed" className="bg-secondary border-border" />
              </div>
            </div>
          </div>

          {/* Run */}
          <div className="flex gap-3">
            <Button onClick={runReport} disabled={running} className="bg-primary text-primary-foreground">
              <Play className="w-4 h-4 mr-1" /> Run Report
            </Button>
            {results && (
              <Button variant="outline" onClick={() => exportCsv(results.rows, results.activeCols)}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="bg-card rounded-lg border border-border overflow-x-auto">
              <div className="px-4 py-3 border-b border-border text-xs text-muted-foreground">{results.rows.length} records</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {results.activeCols.map(c => (
                      <th key={c.key} className="px-3 py-2 text-left text-muted-foreground font-medium whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.rows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-secondary/50">
                      {results.activeCols.map(c => (
                        <td key={c.key} className="px-3 py-2 text-foreground whitespace-nowrap">{String(r[c.key] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.rows.length > 100 && <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">Showing first 100 of {results.rows.length} rows. Export CSV for full data.</div>}
            </div>
          )}

          {/* Save Template */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="text-sm font-serif italic text-foreground mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
              Save as Template
            </h3>
            <div className="flex gap-2">
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name..." className="bg-secondary border-border max-w-xs" />
              <Button variant="outline" onClick={saveTemplate} disabled={!templateName.trim()}>
                <Save className="w-4 h-4 mr-1" /> Save Template
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Saved Templates */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-serif italic text-foreground mb-3">My Templates</h3>
            {templates.length === 0 && <p className="text-xs text-muted-foreground">No saved templates yet.</p>}
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="bg-secondary rounded p-2">
                  <p className="text-xs font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.entity_type}</p>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => loadTemplate(t)}>
                      <Play className="w-3 h-3 mr-1" /> Load
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}