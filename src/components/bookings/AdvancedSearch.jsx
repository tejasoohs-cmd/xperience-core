import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Save, X } from 'lucide-react';

const STORAGE_KEY = 'xperience_saved_searches';

function loadSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveToDisk(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

export default function AdvancedSearch({ filters, onChange, accounts, drivers, affiliates }) {
  const [open, setOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState(loadSaved);
  const [saveName, setSaveName] = useState('');

  const set = (k, v) => onChange({ ...filters, [k]: v });

  const saveSearch = () => {
    if (!saveName.trim()) return;
    const list = [...savedSearches, { name: saveName.trim(), filters: { ...filters } }];
    setSavedSearches(list);
    saveToDisk(list);
    setSaveName('');
  };

  const applyPreset = (preset) => onChange(preset.filters);
  const deletePreset = (i) => {
    const list = savedSearches.filter((_, idx) => idx !== i);
    setSavedSearches(list);
    saveToDisk(list);
  };

  return (
    <div className="space-y-2">
      {/* Saved presets */}
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {savedSearches.map((s, i) => (
            <div key={i} className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full pl-3 pr-1.5 py-0.5">
              <button onClick={() => applyPreset(s)} className="text-xs text-primary hover:text-primary/80">{s.name}</button>
              <button onClick={() => deletePreset(i)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setOpen(!open)}>
        <SlidersHorizontal className="w-3.5 h-3.5" /> Advanced Search {open ? '▲' : '▼'}
      </Button>

      {open && (
        <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Guest Phone</Label>
              <Input value={filters.phone || ''} onChange={e => set('phone', e.target.value)} className="bg-secondary border-border text-xs h-8" placeholder="+971…" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Flight #</Label>
              <Input value={filters.flight || ''} onChange={e => set('flight', e.target.value)} className="bg-secondary border-border text-xs h-8" placeholder="EK101" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Client Ref / PO</Label>
              <Input value={filters.clientRef || ''} onChange={e => set('clientRef', e.target.value)} className="bg-secondary border-border text-xs h-8" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Driver</Label>
              <Select value={filters.driverId || 'all'} onValueChange={v => set('driverId', v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-secondary border-border text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  {(drivers || []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vendor / Affiliate</Label>
              <Select value={filters.affiliateId || 'all'} onValueChange={v => set('affiliateId', v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-secondary border-border text-xs h-8"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  {(affiliates || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Save search */}
          <div className="flex gap-2 items-center pt-1 border-t border-border">
            <Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Name this search…" className="bg-secondary border-border text-xs h-8 max-w-[200px]" />
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={saveSearch} disabled={!saveName.trim()}>
              <Save className="w-3 h-3" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => onChange({ phone: '', flight: '', clientRef: '', driverId: '', affiliateId: '' })}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}