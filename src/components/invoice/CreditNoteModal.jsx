import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function CreditNoteModal({ open, onClose, invoice, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [lineItems, setLineItems] = useState([{ description: '', amount: 0 }]);
  const [status, setStatus] = useState('Draft');

  const addLine = () => setLineItems(p => [...p, { description: '', amount: 0 }]);
  const removeLine = (i) => setLineItems(p => p.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLineItems(p => {
    const next = [...p];
    next[i] = { ...next[i], [field]: val };
    return next;
  });

  const totalCredit = lineItems.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const handleSave = () => {
    onSave({ date, reason, line_items: lineItems, total_credit: totalCredit, status });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Issue Credit Note — {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} className="bg-secondary border-border h-16" placeholder="Reason for credit note..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Line Items (enter as positive values — will appear as credit)</Label>
            <div className="space-y-2">
              {lineItems.map((li, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} className="bg-secondary border-border flex-1" placeholder="Description" />
                  <Input type="number" step="0.01" min={0} value={li.amount} onChange={e => updateLine(i, 'amount', e.target.value)} className="bg-secondary border-border font-mono w-28" />
                  <Button variant="ghost" size="icon" onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive h-8 w-8"><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addLine} className="mt-2"><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
          </div>
          <div className="flex justify-end border-t border-border pt-2">
            <span className="text-sm font-mono font-bold">Total Credit: {formatCurrency(totalCredit)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground">Save Credit Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}