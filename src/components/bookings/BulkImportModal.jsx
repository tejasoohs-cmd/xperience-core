import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const TEMPLATE_HEADERS = [
  'Date', 'Pickup Time', 'Pickup Location', 'Dropoff Location',
  'Guest Name', 'Guest Phone', 'Guest Email', 'Pax Count', 'Luggage Count',
  'Flight Number', 'Notes', 'Client Base Rate', 'Vendor Base Rate',
];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ['2026-05-01', '10:00', 'Dubai Airport T3', 'Burj Al Arab', 'John Smith', '+971501234567', 'john@example.com', '2', '2', 'EK101', '', '350', '200']]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
  XLSX.writeFile(wb, 'booking_import_template.xlsx');
}

function validateRow(row) {
  const errors = [];
  if (!row['Date']) errors.push('Date required');
  if (!row['Pickup Location']) errors.push('Pickup Location required');
  if (!row['Dropoff Location']) errors.push('Dropoff Location required');
  if (row['Date'] && !/^\d{4}-\d{2}-\d{2}$/.test(String(row['Date']).trim())) errors.push('Date must be YYYY-MM-DD');
  return errors;
}

export default function BulkImportModal({ open, onClose, accounts, vehicleTypes, getNextBookingNumber, onImported }) {
  const [tab, setTab] = useState('template');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const processed = data.map((row, i) => {
        const errs = validateRow(row);
        return { ...row, _id: i, _errors: errs, _valid: errs.length === 0 };
      });
      setRows(processed);
      setSelected(processed.filter(r => r._valid).map(r => r._id));
      setSummary(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleRow = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleImport = async () => {
    setImporting(true);
    const toImport = rows.filter(r => selected.includes(r._id) && r._valid);
    let created = 0, skipped = rows.filter(r => !selected.includes(r._id) || !r._valid).length;
    for (const row of toImport) {
      const confNum = await getNextBookingNumber();
      const d = {
        confirmation_number: confNum,
        status: 'New',
        pickup_date: String(row['Date']).trim(),
        pickup_time: String(row['Pickup Time'] || '').trim(),
        pickup_location: String(row['Pickup Location'] || '').trim(),
        dropoff_location: String(row['Dropoff Location'] || '').trim(),
        primary_passenger_name: String(row['Guest Name'] || '').trim(),
        primary_passenger_phone: String(row['Guest Phone'] || '').trim(),
        primary_passenger_email: String(row['Guest Email'] || '').trim(),
        passenger_count: parseInt(row['Pax Count']) || 1,
        luggage_count: parseInt(row['Luggage Count']) || 0,
        flight_number: String(row['Flight Number'] || '').trim(),
        trip_notes: String(row['Notes'] || '').trim(),
        client_base_rate: parseFloat(row['Client Base Rate']) || 0,
        vendor_base_rate: parseFloat(row['Vendor Base Rate']) || 0,
        client_vat_percent: 5, vendor_vat_percent: 5,
        driver_source: 'InHouse', currency: 'AED',
        stops: [], client_extras: [], vendor_extras: [], additional_passengers: [],
      };
      d.client_total = d.client_base_rate * 1.05;
      d.vendor_total = d.vendor_base_rate * 1.05;
      d.profit = d.client_total - d.vendor_total;
      await base44.entities.Booking.create(d);
      created++;
    }
    setImporting(false);
    setSummary({ created, skipped });
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setRows([]); setSelected([]); setSummary(null); setTab('template'); } }}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif italic">Import Bookings</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-md p-1 w-fit">
          {[['template', 'Download Template'], ['upload', 'Upload & Import']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-xs rounded transition-colors ${tab === k ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>
          ))}
        </div>

        {tab === 'template' && (
          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-primary" /> Booking Import Template</p>
              <p className="text-xs text-muted-foreground">Download the Excel template with the required column headers. Fill in your bookings and upload in the next tab.</p>
              <p className="text-xs text-muted-foreground">Required columns: <span className="text-foreground font-mono">Date (YYYY-MM-DD), Pickup Location, Dropoff Location</span></p>
            </div>
            <Button onClick={downloadTemplate} className="bg-primary text-primary-foreground gap-2">
              <Download className="w-4 h-4" /> Download Template (.xlsx)
            </Button>
          </div>
        )}

        {tab === 'upload' && (
          <div className="space-y-4 py-2">
            {summary ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-emerald-400 font-medium">{summary.created} bookings created, {summary.skipped} skipped</p>
                <Button variant="outline" size="sm" onClick={() => { setRows([]); setSelected([]); setSummary(null); if (fileRef.current) fileRef.current.value = ''; }}>Import More</Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">Select .xlsx or .csv file</label>
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" onChange={handleFile} className="text-sm text-muted-foreground file:bg-secondary file:border-0 file:text-foreground file:px-3 file:py-1.5 file:rounded file:mr-3 file:cursor-pointer" />
                </div>

                {rows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{rows.length} rows parsed · {selected.length} selected</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelected(rows.filter(r => r._valid).map(r => r._id))}>Select Valid</Button>
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelected([])}>Deselect All</Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-secondary/50">
                            <th className="px-2 py-2 w-8"></th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Date</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Time</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Pickup</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Dropoff</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Guest</th>
                            <th className="px-2 py-2 text-left text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rows.map(row => (
                            <tr key={row._id} className={`${row._valid ? '' : 'opacity-50'}`}>
                              <td className="px-2 py-2"><Checkbox checked={selected.includes(row._id) && row._valid} disabled={!row._valid} onCheckedChange={() => toggleRow(row._id)} /></td>
                              <td className="px-2 py-2 font-mono">{row['Date']}</td>
                              <td className="px-2 py-2 font-mono">{row['Pickup Time']}</td>
                              <td className="px-2 py-2 truncate max-w-[120px]">{row['Pickup Location']}</td>
                              <td className="px-2 py-2 truncate max-w-[120px]">{row['Dropoff Location']}</td>
                              <td className="px-2 py-2">{row['Guest Name']}</td>
                              <td className="px-2 py-2">
                                {row._valid
                                  ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Valid</span>
                                  : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> {row._errors[0]}</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={onClose}>Cancel</Button>
                      <Button onClick={handleImport} disabled={selected.length === 0 || importing} className="bg-primary text-primary-foreground gap-2">
                        <Upload className="w-4 h-4" /> {importing ? 'Importing…' : `Import ${selected.length} Bookings`}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}