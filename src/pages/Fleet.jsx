import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DirectoryPage from '@/components/directory/DirectoryPage';
import StatusPill from '@/components/ui/StatusPill';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

function VehicleForm({ item, onSave, onCancel, vehicleTypes }) {
  const [f, setF] = useState(item || { plate_number: '', vehicle_type_id: '', make: '', model: '', year: new Date().getFullYear(), color: '', vin: '', status: 'active' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Plate # *</Label><Input value={f.plate_number} onChange={e => set('plate_number', e.target.value)} className="bg-secondary border-border font-mono" /></div>
        <div><Label className="text-xs text-muted-foreground">Vehicle Type *</Label>
          <Select value={f.vehicle_type_id || ''} onValueChange={v => set('vehicle_type_id', v)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.code} — {vt.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label className="text-xs text-muted-foreground">Make</Label><Input value={f.make} onChange={e => set('make', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Model</Label><Input value={f.model} onChange={e => set('model', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">Year</Label><Input type="number" value={f.year} onChange={e => set('year', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className="text-xs text-muted-foreground">Color</Label><Input value={f.color} onChange={e => set('color', e.target.value)} className="bg-secondary border-border" /></div>
        <div><Label className="text-xs text-muted-foreground">VIN</Label><Input value={f.vin} onChange={e => set('vin', e.target.value)} className="bg-secondary border-border font-mono" /></div>
      </div>
      <div><Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={f.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(f)} className="bg-primary text-primary-foreground">Save</Button>
      </div>
    </div>
  );
}

export default function Fleet() {
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => base44.entities.Vehicle.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const vtMap = useMemo(() => Object.fromEntries(vehicleTypes.map(v => [v.id, v])), [vehicleTypes]);

  const columns = [
    { header: 'Plate #', accessor: i => i.plate_number, cellClassName: 'font-mono font-bold text-primary' },
    { header: 'Type', accessor: i => vtMap[i.vehicle_type_id]?.name || '—', cellClassName: 'text-foreground' },
    { header: 'Make / Model', accessor: i => `${i.make || ''} ${i.model || ''}`.trim() || '—', cellClassName: 'text-muted-foreground', className: 'hidden md:table-cell' },
    { header: 'Year', accessor: i => i.year, cellClassName: 'font-mono text-muted-foreground', className: 'hidden lg:table-cell' },
    { header: 'Status', accessor: i => i.status, render: i => <StatusPill status={i.status} size="xs" /> },
  ];

  const handleSave = async (data, existing) => {
    if (existing) {
      const { id, created_date, updated_date, created_by, ...d } = data;
      await base44.entities.Vehicle.update(existing.id, d);
    } else {
      if (vehicles.length >= 5) { alert('Maximum 5 vehicles allowed'); return; }
      await base44.entities.Vehicle.create(data);
    }
  };

  return (
    <DirectoryPage
      title="Fleet"
      items={vehicles}
      columns={columns}
      renderForm={(p) => <VehicleForm {...p} vehicleTypes={vehicleTypes} />}
      onSave={handleSave}
      onDelete={(id) => base44.entities.Vehicle.delete(id)}
      queryKey="vehicles"
    />
  );
}