import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRESET_LABELS = ['Extra Hour', 'Waiting Time', 'Extra Stop', 'Parking', 'Tip', 'Other'];

export default function ExtraChargeModal({ open, onClose, onAdd }) {
  const [label, setLabel] = useState('Extra Hour');
  const [customLabel, setCustomLabel] = useState('');
  const [amount, setAmount] = useState(0);
  const [applyTo, setApplyTo] = useState('Both');

  const handleAdd = () => {
    const finalLabel = label === 'Other' ? (customLabel || 'Other') : label;
    onAdd({ label: finalLabel, amount: parseFloat(amount) || 0, applyTo });
    setLabel('Extra Hour');
    setCustomLabel('');
    setAmount(0);
    setApplyTo('Both');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Add Extra Charge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Label</Label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESET_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {label === 'Other' && (
            <div>
              <Label className="text-xs text-muted-foreground">Custom Label</Label>
              <Input value={customLabel} onChange={e => setCustomLabel(e.target.value)} className="bg-secondary border-border" placeholder="Enter label..." />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Amount (AED)</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Apply To</Label>
            <Select value={applyTo} onValueChange={setApplyTo}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Client Only">Client Only</SelectItem>
                <SelectItem value="Vendor Only">Vendor Only</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} className="bg-primary text-primary-foreground">Add Charge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}