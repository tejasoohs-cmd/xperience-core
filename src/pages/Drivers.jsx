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

function DriverForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { name: '', phone: '', email: '', license_number: '', notes: '', status: 'active' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-secondary border-border" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={f.phone} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={f.email} onChange={e => set('email', e.target.value)} className="bg-secondary border-border" /></div>
      </div>
      <div><Label className="text-xs text-muted-foreground">License Number</Label><Input value={f.license_number} onChange={e => set('license_number', e.target.value)} className="bg-secondary border-border font-mono" /></div>
      <div><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={f.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-border h-16" /></div>
      <div><Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={f.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(f)} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function Drivers() {
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });

  const columns = [
    { header: 'Name', accessor: i => i.name, cellClassName: 'font-medium text-foreground' },
    { header: 'Phone', accessor: i => i.phone, cellClassName: 'font-mono text-muted-foreground', className: 'hidden md:table-cell' },
    { header: 'License', accessor: i => i.license_number, cellClassName: 'font-mono text-muted-foreground', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.Driver.update(existing.id, d);
    } else {
      await base44.entities.Driver.create(data);
    }
  };

  return <DirectoryPage title="Drivers" items={drivers} columns={columns} renderForm={(p) => <DriverForm {...p} />} onSave={handleSave} onDelete={(id) => base44.entities.Driver.delete(id)} queryKey="drivers" />;
}