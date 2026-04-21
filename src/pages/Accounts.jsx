import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DirectoryPage from '@/components/directory/DirectoryPage';
import StatusPill from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAppSettings } from '@/lib/useAppSettings';

function AccountForm({ item, onSave, onCancel, companies, settings, getNextAccountNumber }) {
  const [f, setF] = useState(item || {
    account_number: 0, company_id: '', contact_name: '', job_title: '', department: '',
    email: '', phone: '', cell_phone: '', vat_percent: settings.default_vat_percent || 5,
    payment_terms: 'Due Upon Receipt', status: 'active',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const paymentTerms = settings.payment_terms_list || ['Due Upon Receipt', 'Net 15', 'Net 30'];

  const handleSave = async () => {
    let data = { ...f };
    if (!item && !data.account_number) {
      data.account_number = await getNextAccountNumber();
    }
    onSave(data);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Account #</Label><Input value={f.account_number || 'Auto'} readOnly className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Company *</Label>
          <Select value={f.company_id || ''} onValueChange={v => set('company_id', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Contact Name *</Label><Input value={f.contact_name} onChange={e => set('contact_name', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Job Title</Label><Input value={f.job_title} onChange={e => set('job_title', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Department</Label><Input value={f.department} onChange={e => set('department', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={f.email} onChange={e => set('email', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={f.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label className="text-xs text-muted-foreground">VAT %</Label><Input type="number" value={f.vat_percent} onChange={e => set('vat_percent', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Payment Terms</Label>
          <Select value={f.payment_terms} onValueChange={v => set('payment_terms', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{paymentTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={f.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { settings, getNextAccountNumber } = useAppSettings();

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const columns = [
    { header: '#', accessor: i => i.account_number, cellClassName: 'font-mono text-primary' },
    { header: 'Company', accessor: i => companyMap[i.company_id]?.company_name || '—', cellClassName: 'text-foreground', className: 'hidden md:table-cell' },
    { header: 'Contact', accessor: i => i.contact_name, cellClassName: 'font-medium text-foreground' },
    { header: 'Email', accessor: i => i.email, cellClassName: 'text-muted-foreground', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.Account.update(existing.id, d);
    } else {
      await base44.entities.Account.create(data);
    }
  };

  return (
    <DirectoryPage
      title="Accounts"
      items={accounts}
      columns={columns}
      renderForm={(p) => <AccountForm {...p} companies={companies} settings={settings} getNextAccountNumber={getNextAccountNumber} />}
      onSave={handleSave}
      onDelete={(id) => base44.entities.Account.delete(id)}
      queryKey="accounts"
    />
  );
}