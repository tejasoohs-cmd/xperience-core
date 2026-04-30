import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { logActivity } from '@/lib/activityLog';

export default function AddCreditModal({ open, onClose, account, onSaved }) {
  const [form, setForm] = useState({ amount: '', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    setSaving(true);

    const newBalance = (account.client_credit_balance || 0) + amount;
    await base44.entities.Account.update(account.id, { client_credit_balance: newBalance });

    await logActivity({
      action_type: 'credit_added',
      entity_type: 'account',
      entity_id: account.id,
      entity_label: account.contact_name,
      message: `Credit of AED ${amount.toFixed(2)} added to ${account.contact_name} — Ref: ${form.reference || 'N/A'}${form.notes ? ` — ${form.notes}` : ''}`,
    });

    setSaving(false);
    setForm({ amount: '', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Add Credit — {account?.contact_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Amount (AED) *</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="bg-secondary border-border font-mono" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reference</Label>
            <Input value={form.reference} onChange={e => set('reference', e.target.value)} className="bg-secondary border-border" placeholder="e.g. CN-2026-001" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="bg-secondary border-border font-mono" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} className="bg-secondary border-border" placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.amount} className="bg-primary text-primary-foreground">
            {saving ? 'Saving…' : 'Add Credit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}