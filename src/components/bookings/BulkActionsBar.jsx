import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, UserCheck, FileText, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { logActivity } from '@/lib/activityLog';
import { formatConfNumber } from '@/lib/formatters';

export default function BulkActionsBar({ selectedIds, bookings, drivers, onDone, onClear }) {
  const [confirm, setConfirm] = useState(null); // {action, label, exec}
  const [driverPicker, setDriverPicker] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const count = selectedIds.length;

  const exec = async (action, extra = {}) => {
    if (action === 'complete') {
      for (const id of selectedIds) {
        await base44.entities.Booking.update(id, { status: 'Completed' });
      }
      await logActivity({ action_type: 'bulk_status', entity_type: 'booking', entity_id: selectedIds[0], entity_label: formatConfNumber(bookings.find(b => b.id === selectedIds[0])?.confirmation_number), message: `Bulk: ${count} bookings marked Completed` });
    } else if (action === 'assign_driver') {
      const drv = drivers.find(d => d.id === extra.driver_id);
      for (const id of selectedIds) {
        await base44.entities.Booking.update(id, { driver_id: extra.driver_id, driver_source: 'InHouse' });
      }
      await logActivity({ action_type: 'bulk_assign', entity_type: 'booking', entity_id: selectedIds[0], entity_label: formatConfNumber(bookings.find(b => b.id === selectedIds[0])?.confirmation_number), message: `Bulk: ${count} bookings assigned to driver ${drv?.name || extra.driver_id}` });
    }
    onDone();
    onClear();
    setConfirm(null);
    setDriverPicker(false);
  };

  const ask = (action, label, execFn) => setConfirm({ action, label, exec: execFn });

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/30 rounded-lg mb-3">
        <span className="text-sm font-medium text-primary">{count} selected</span>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => ask('complete', 'Mark as Completed', () => exec('complete'))}>
            <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
            onClick={() => setDriverPicker(true)}>
            <UserCheck className="w-3.5 h-3.5" /> Assign Driver
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0 text-muted-foreground" onClick={onClear}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Confirm modal */}
      <Dialog open={!!confirm} onOpenChange={v => { if (!v) setConfirm(null); }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader><DialogTitle className="font-serif italic">Confirm Bulk Action</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apply "{confirm?.label}" to <strong className="text-foreground">{count} booking{count !== 1 ? 's' : ''}</strong>. Continue?</p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => confirm?.exec()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Driver picker modal */}
      <Dialog open={driverPicker} onOpenChange={v => { if (!v) setDriverPicker(false); }}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader><DialogTitle className="font-serif italic">Assign Driver to {count} Bookings</DialogTitle></DialogHeader>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select driver…" /></SelectTrigger>
            <SelectContent>
              {(drivers || []).filter(d => d.status === 'active').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDriverPicker(false)}>Cancel</Button>
            <Button disabled={!selectedDriver} className="bg-primary text-primary-foreground" onClick={() => ask('assign_driver', `Assign to ${drivers.find(d => d.id === selectedDriver)?.name}`, () => exec('assign_driver', { driver_id: selectedDriver }))}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}