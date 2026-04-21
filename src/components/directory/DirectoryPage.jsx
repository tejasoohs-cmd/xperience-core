import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/PageHeader';
import StatusPill from '@/components/ui/StatusPill';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

export default function DirectoryPage({
  title, subtitle, items, columns, renderForm, onSave, onDelete, queryKey, emptyText = 'No records yet',
}) {
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const filtered = items.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return columns.some(col => {
      const val = col.accessor(item);
      return val && String(val).toLowerCase().includes(s);
    });
  });

  const handleSave = async (data) => {
    await onSave(data, editItem);
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    setShowForm(false);
    setEditItem(null);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${columns[0].accessor(item)}"?`)) return;
    await onDelete(item.id);
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  };

  const openNew = () => { setEditItem(null); setShowForm(true); };
  const openEdit = (item) => { setEditItem(item); setShowForm(true); };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle || `${filtered.length} records`}
        actions={
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> New
          </Button>
        }
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border text-sm" />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-secondary/50 transition-colors">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(item) : (col.accessor(item) || '—')}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="h-7 w-7">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">{emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={(v) => { if (!v) { setShowForm(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif italic">{editItem ? 'Edit' : 'New'} {title.replace(/s$/, '').replace(/ies$/, 'y')}</DialogTitle>
          </DialogHeader>
          {showForm && renderForm({ item: editItem, onSave: handleSave, onCancel: () => { setShowForm(false); setEditItem(null); } })}
        </DialogContent>
      </Dialog>
    </div>
  );
}