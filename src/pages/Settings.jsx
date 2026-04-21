import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/ui/PageHeader';
import { useAppSettings } from '@/lib/useAppSettings';
import { Textarea } from '@/components/ui/textarea';
import { Save, Upload, Plus, Trash2, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function Settings() {
  const { settings, updateSettings, isLoading } = useAppSettings();
  const [form, setForm] = useState({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading) setForm({ ...settings });
  }, [settings, isLoading]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    await updateSettings.mutateAsync(form);
    toast({ title: 'Settings saved' });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('company_logo_url', file_url);
  };

  const addListItem = (key) => {
    const list = [...(form[key] || [])];
    list.push('');
    set(key, list);
  };

  const removeListItem = (key, index) => {
    const list = [...(form[key] || [])];
    list.splice(index, 1);
    set(key, list);
  };

  const updateListItem = (key, index, value) => {
    const list = [...(form[key] || [])];
    list[index] = value;
    set(key, list);
  };

  const exportData = async () => {
    const [bookings, invoices, statements, companies, accounts, affiliates, drivers, vTypes, vehicles] = await Promise.all([
      base44.entities.Booking.list('-pickup_date', 1000),
      base44.entities.Invoice.list('-invoice_date', 500),
      base44.entities.VendorStatement.list('-date', 500),
      base44.entities.Company.list(),
      base44.entities.Account.list(),
      base44.entities.Affiliate.list(),
      base44.entities.Driver.list(),
      base44.entities.VehicleType.list(),
      base44.entities.Vehicle.list(),
    ]);
    const data = { bookings, invoices, statements, companies, accounts, affiliates, drivers, vehicleTypes: vTypes, vehicles, settings: form };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `xperience-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader
        title="Settings"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}><Download className="w-4 h-4 mr-1" /> Export Backup</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground"><Save className="w-4 h-4 mr-1" /> Save</Button>
          </div>
        }
      />

      <div className="space-y-8 max-w-2xl">
        {/* Company Info */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Company Information</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Company Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {form.company_logo_url && <img src={form.company_logo_url} alt="Logo" className="h-10 rounded" />}
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors">
                  <Upload className="w-4 h-4" /> Upload
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Company Name</Label><Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Tax ID / TRN</Label><Input value={form.company_tax_id || ''} onChange={e => set('company_tax_id', e.target.value)} className="bg-secondary border-border font-mono" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Address</Label><Input value={form.company_address || ''} onChange={e => set('company_address', e.target.value)} className="bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.company_phone || ''} onChange={e => set('company_phone', e.target.value)} className="bg-secondary border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={form.company_email || ''} onChange={e => set('company_email', e.target.value)} className="bg-secondary border-border" /></div>
            </div>
          </div>
        </section>

        {/* Defaults */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Invoice Settings</h3>
          <div className="space-y-4">
            <div><Label className="text-xs text-muted-foreground">Bank Details (appears on invoice footer)</Label><Textarea value={form.bank_details || ''} onChange={e => set('bank_details', e.target.value)} className="bg-secondary border-border h-24" placeholder="Bank name, IBAN, account number..." /></div>
            <div><Label className="text-xs text-muted-foreground">Invoice Footer Notes</Label><Textarea value={form.invoice_footer_notes || ''} onChange={e => set('invoice_footer_notes', e.target.value)} className="bg-secondary border-border h-16" placeholder="Thank you for your business..." /></div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Defaults & Counters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><Label className="text-xs text-muted-foreground">Default VAT %</Label><Input type="number" value={form.default_vat_percent ?? 5} onChange={e => set('default_vat_percent', parseFloat(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Default Quote Expiry (days)</Label><Input type="number" value={form.default_quote_expiry_days ?? 30} onChange={e => set('default_quote_expiry_days', parseInt(e.target.value) || 30)} className="bg-secondary border-border font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div><Label className="text-xs text-muted-foreground">Next Booking #</Label><Input type="number" value={form.next_booking_number ?? 18100} onChange={e => set('next_booking_number', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Next Account #</Label><Input type="number" value={form.next_account_number ?? 50000} onChange={e => set('next_account_number', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Next Invoice Counter</Label><Input type="number" value={form.next_invoice_counter ?? 1} onChange={e => set('next_invoice_counter', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Next Statement Counter</Label><Input type="number" value={form.next_statement_counter ?? 1} onChange={e => set('next_statement_counter', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
            <div><Label className="text-xs text-muted-foreground">Next Quote Counter</Label><Input type="number" value={form.next_quote_counter ?? 1} onChange={e => set('next_quote_counter', parseInt(e.target.value) || 0)} className="bg-secondary border-border font-mono" /></div>
          </div>
        </section>

        {/* Editable Lists */}
        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Payment Terms</h3>
          <div className="space-y-2">
            {(form.payment_terms_list || []).map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input value={t} onChange={e => updateListItem('payment_terms_list', i, e.target.value)} className="bg-secondary border-border" />
                <Button variant="ghost" size="icon" onClick={() => removeListItem('payment_terms_list', i)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addListItem('payment_terms_list')}><Plus className="w-3 h-3 mr-1" /> Add Term</Button>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-serif italic text-foreground mb-4 pb-2 border-b border-border">Service Types</h3>
          <div className="space-y-2">
            {(form.service_types_list || []).map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input value={t} onChange={e => updateListItem('service_types_list', i, e.target.value)} className="bg-secondary border-border" />
                <Button variant="ghost" size="icon" onClick={() => removeListItem('service_types_list', i)}><Trash2 className="w-4 h-4 text-muted-foreground" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addListItem('service_types_list')}><Plus className="w-3 h-3 mr-1" /> Add Type</Button>
          </div>
        </section>
      </div>
    </div>
  );
}