import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DirectoryPage from '@/components/directory/DirectoryPage';
import StatusPill from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

function AddressForm({ item, onSave, onCancel, accounts, companies }) {
  const [f, setF] = useState(item || {
    name: '', account_id: '', location_type: 'Address',
    street_1: '', street_2: '', city: 'Dubai', state_province: '',
    country: 'UAE', zip_postal: '', phone: '', notes: '', status: 'active'
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      <div><Label className="text-xs text-muted-foreground">Name / Label *</Label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-secondary border-border" placeholder="e.g. DXB Terminal 3, Grand Hyatt Dubai" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={f.location_type} onValueChange={v => set('location_type', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Address', 'Airport', 'Seaport', 'FBO', 'POI'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground">Account (leave blank = global)</Label>
          <Select value={f.account_id || ''} onValueChange={v => set('account_id', v === '_global' ? '' : v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Global (all accounts)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_global">Global</SelectItem>
              {accounts.map(a => { const c = companyMap[a.company_id]; return <SelectItem key={a.id} value={a.id}>{c?.company_name || a.contact_name}</SelectItem>; })}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Street Address</Label><Input value={f.street_1} onChange={e => set('street_1', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label className="text-xs text-muted-foreground">City</Label><Input value={f.city} onChange={e => set('city', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Country</Label><Input value={f.country} onChange={e => set('country', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={f.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={f.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-border h-16" /></div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(f)} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function StoredAddresses() {
  const { data: addresses = [] } = useQuery({ queryKey: ['storedAddresses'], queryFn: () => base44.entities.StoredAddress.list() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const accountMap = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts]);
  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const getAccountLabel = (id) => {
    if (!id) return 'Global';
    const a = accountMap[id];
    const c = a ? companyMap[a.company_id] : null;
    return c?.company_name || a?.contact_name || '—';
  };

  const columns = [
    { header: 'Name', accessor: i => i.name, cellClassName: 'font-medium text-foreground' },
    { header: 'Type', accessor: i => i.location_type, cellClassName: 'text-muted-foreground text-xs' },
    { header: 'Account', accessor: i => getAccountLabel(i.account_id), cellClassName: 'text-muted-foreground', className: 'hidden md:table-cell' },
    { header: 'City', accessor: i => i.city, cellClassName: 'text-muted-foreground', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    const clean = { ...data };
    if (!clean.account_id) clean.account_id = null;
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = clean;
      await base44.entities.StoredAddress.update(existing.id, d);
    } else {
      await base44.entities.StoredAddress.create(clean);
    }
  };

  return (
    <DirectoryPage
      title="Stored Addresses"
      subtitle="Global and per-account saved locations"
      items={addresses}
      columns={columns}
      renderForm={(p) => <AddressForm {...p} accounts={accounts} companies={companies} />}
      onSave={handleSave}
      onDelete={(id) => base44.entities.StoredAddress.delete(id)}
      queryKey="storedAddresses"
    />
  );
}