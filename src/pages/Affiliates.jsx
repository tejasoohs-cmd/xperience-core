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

function AffiliateForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: '', contact_person: '', phone: '', email: '', address: '', city: '', country: 'UAE', default_rate: 0, internal_notes: '', status: 'active' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Contact Person</Label><Input value={f.contact_person} onChange={e => set('contact_person', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={f.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={f.email} onChange={e => set('email', e.target.value)} className="bg-secondary border-border" /></div>
      <div><Label className="text-xs text-muted-foreground">Address</Label><Input value={f.address} onChange={e => set('address', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">City</Label><Input value={f.city} onChange={e => set('city', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Country</Label><Input value={f.country} onChange={e => set('country', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Default Rate</Label><Input type="number" value={f.default_rate} onChange={e => set('default_rate', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={f.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Internal Notes</Label><Textarea value={f.internal_notes} onChange={e => set('internal_notes', e.target.value)} className="bg-secondary border-border h-16" /></div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(f)} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function Affiliates() {
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });

  const columns = [
    { header: 'Name', accessor: i => i.name, cellClassName: 'font-medium text-foreground' },
    { header: 'Contact', accessor: i => i.contact_person, cellClassName: 'text-muted-foreground', className: 'hidden md:table-cell' },
    { header: 'Phone', accessor: i => i.phone, cellClassName: 'font-mono text-muted-foreground', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.Affiliate.update(existing.id, d);
    } else {
      await base44.entities.Affiliate.create(data);
    }
  };

  return <DirectoryPage title="Affiliates" items={affiliates} columns={columns} renderForm={(p) => <AffiliateForm {...p} />} onSave={handleSave} onDelete={(id) => base44.entities.Affiliate.delete(id)} queryKey="affiliates" />;
}