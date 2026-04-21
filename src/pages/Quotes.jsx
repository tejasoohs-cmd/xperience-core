import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Plus, FileText, TrendingUp } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

export default function Quotes() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: quotes = [] } = useQuery({ queryKey: ['quotes'], queryFn: () => base44.entities.Quote.list('-quote_date', 200) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const getClientName = (accountId) => {
    const acc = accountMap[accountId];
    if (!acc) return '—';
    return companyMap[acc.company_id]?.company_name || acc.contact_name;
  };

  const filtered = useMemo(() => {
    return quotes.filter(q => statusFilter === 'all' || q.status === statusFilter);
  }, [quotes, statusFilter]);

  // Analytics
  const sent = quotes.filter(q => ['Sent', 'Accepted', 'Rejected', 'Converted'].includes(q.status));
  const accepted = quotes.filter(q => ['Accepted', 'Converted'].includes(q.status));
  const winRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0;
  const avgValue = quotes.length > 0 ? quotes.reduce((s, q) => s + (q.client_total || 0), 0) / quotes.length : 0;
  const awaitingResponse = quotes.filter(q => q.status === 'Sent').length;

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle={`${quotes.length} quotes`}
        actions={
          <Link to="/quotes/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> New Quote
            </Button>
          </Link>
        }
      />

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{winRate}%</p>
          <p className="text-xs text-muted-foreground">{accepted.length} of {sent.length} sent</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Quote Value</p>
          <p className="text-2xl font-mono font-bold text-foreground mt-1">{formatCurrency(avgValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Awaiting Response</p>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{awaitingResponse}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Quotes</p>
          <p className="text-2xl font-mono font-bold text-foreground mt-1">{quotes.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Quote #</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pickup</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Total</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Expires</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(q => {
              const isExpired = q.expiry_date && q.expiry_date < new Date().toISOString().split('T')[0] && !['Accepted', 'Converted', 'Rejected'].includes(q.status);
              return (
                <tr key={q.id} className="hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                  <td className="px-4 py-3 font-mono text-primary">{q.quote_number}</td>
                  <td className="px-4 py-3 text-foreground">{formatDate(q.quote_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{getClientName(q.account_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(q.pickup_date)}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(q.client_total)}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">
                    {q.expiry_date ? (isExpired ? <span className="text-red-400">Expired</span> : formatDate(q.expiry_date)) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={q.status} size="xs" /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No quotes found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}