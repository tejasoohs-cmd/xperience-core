import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DirectoryPage from '@/components/directory/DirectoryPage';
import StatusPill from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

function validateTRN(trn) {
  if (!trn) return null;
  const digits = trn.replace(/\D/g, '');
  if (digits.length !== 15 || !digits.startsWith('1')) return 'TRN format appears invalid (UAE TRNs are 15 digits starting with 1).';
  return null;
}

function CompanyForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { company_name: '', billing_address: '', tax_id: '', internal_notes: '', status: 'active' });
  const [trnWarning, setTrnWarning] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const warn = validateTRN(f.tax_id);
    if (warn && !trnWarning) { setTrnWarning(true); return; }
    onSave(f);
  };

  return (
    <div className="space-y-4">
      <div><Label className="text-xs text-muted-foreground">Company Name *</Label><Input value={f.company_name} onChange={e => set('company_name', e.target.value)} className="bg-secondary border-border" /></div>
      <div><Label className="text-xs text-muted-foreground">Billing Address</Label><Textarea value={f.billing_address} onChange={e => set('billing_address', e.target.value)} className="bg-secondary border-border h-20" /></div>
      <div>
        <Label className="text-xs text-muted-foreground">Tax ID / TRN</Label>
        <Input value={f.tax_id} onChange={e => { set('tax_id', e.target.value); setTrnWarning(false); }} className="bg-secondary border-border font-mono" />
        {trnWarning && <p className="text-xs text-amber-400 mt-1">⚠ {validateTRN(f.tax_id)} Save anyway?</p>}
      </div>
      <div><Label className="text-xs text-muted-foreground">Internal Notes</Label><Textarea value={f.internal_notes} onChange={e => set('internal_notes', e.target.value)} className="bg-secondary border-border h-20" /></div>
      <div><Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={f.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground">{trnWarning ? 'Save Anyway' : 'Save'}</Button>
      </div>
    </div>
  );
}

export default function Companies() {
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });

  const columns = [
    { header: 'Name', accessor: i => i.company_name, cellClassName: 'font-medium text-foreground' },
    { header: 'Tax ID', accessor: i => i.tax_id, cellClassName: 'font-mono text-muted-foreground', className: 'hidden md:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.Company.update(existing.id, d);
    } else {
      await base44.entities.Company.create(data);
    }
  };

  return <DirectoryPage title="Companies" items={companies} columns={columns} renderForm={(p) => <CompanyForm {...p} />} onSave={handleSave} onDelete={(id) => base44.entities.Company.delete(id)} queryKey="companies" />;
}