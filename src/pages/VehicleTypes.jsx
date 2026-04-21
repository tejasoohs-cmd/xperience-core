import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DirectoryPage from '@/components/directory/DirectoryPage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function VTForm({ item, onSave, onCancel }) {
  const [f, setF] = useState(item || { code: '', name: '', passenger_capacity: 0, luggage_capacity: 0, color_code: '#F59E0B' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Code *</Label><Input value={f.code} onChange={e => set('code', e.target.value)} className="bg-secondary border-border font-mono" placeholder="SDN" /></div>
        <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-secondary border-border" placeholder="Sedan" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label className="text-xs text-muted-foreground">Passengers</Label><Input type="number" min={0} value={f.passenger_capacity} onChange={e => set('passenger_capacity', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Luggage</Label><Input type="number" min={0} value={f.luggage_capacity} onChange={e => set('luggage_capacity', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Color</Label><Input type="color" value={f.color_code || '#F59E0B'} onChange={e => set('color_code', e.target.value)} className="bg-secondary border-border h-10 p-1" /></div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(f)} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function VehicleTypes() {
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const columns = [
    { header: 'Code', accessor: i => i.code, cellClassName: 'font-mono font-bold text-primary' },
    { header: 'Name', accessor: i => i.name, cellClassName: 'font-medium text-foreground' },
    { header: 'Pax', accessor: i => i.passenger_capacity, cellClassName: 'font-mono text-muted-foreground' },
    { header: 'Luggage', accessor: i => i.luggage_capacity, cellClassName: 'font-mono text-muted-foreground', className: 'hidden md:table-cell' },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.VehicleType.update(existing.id, d);
    } else {
      if (vehicleTypes.length >= 15) { alert('Maximum 15 vehicle types allowed'); return; }
      await base44.entities.VehicleType.create(data);
    }
  };

  return <DirectoryPage title="Vehicle Types" items={vehicleTypes} columns={columns} renderForm={(p) => <VTForm {...p} />} onSave={handleSave} onDelete={(id) => base44.entities.VehicleType.delete(id)} queryKey="vehicleTypes" />;
}