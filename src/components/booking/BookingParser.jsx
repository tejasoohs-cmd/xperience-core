import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bot, Loader2, CheckCircle, AlertTriangle, MapPin, Clock, User, Phone } from 'lucide-react';

function fuzzyMatch(input, candidates, key) {
  if (!input) return null;
  const inp = input.toLowerCase().trim();
  return candidates.find(c => {
    const val = (key ? c[key] : c).toLowerCase();
    return val.includes(inp) || inp.includes(val.split(' ')[0]);
  }) || null;
}

export default function BookingParser({ onApply, accounts, companies, affiliates, vehicleTypes, serviceTypes }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const companyMap = Object.fromEntries((companies || []).map(c => [c.id, c]));

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setParsed(null);
    setWarnings([]);

    const vtNames = (vehicleTypes || []).map(v => `${v.code}: ${v.name}`).join(', ');
    const svcTypes = (serviceTypes || ['Arrival', 'Departure', 'Point-to-Point', 'Hourly', 'Tour']).join(', ');
    const accountNames = (accounts || []).map(a => {
      const comp = companyMap[a.company_id];
      return `"${comp?.company_name || a.contact_name}" (id:${a.id})`;
    }).join(', ');
    const affiliateNames = (affiliates || []).map(af => `"${af.name}" (id:${af.id})`).join(', ');

    const prompt = `You are a professional limousine/transport booking assistant. Extract structured data from the following booking message.

CRITICAL RULES:
1. CLIENT ACCOUNT vs PASSENGER AGENCY:
   - "client" / "account" = the COMPANY placing/paying (e.g. "Universal Travels")
   - "passenger agency" / "remarks" = words near passenger names like "GALAXIA TOURS", "ELEVATE" — these are NOT our client, they are the passenger's affiliated sub-agency for DRIVER reference only
   - Store passenger agencies in routing_point.remarks — do NOT try to match them as client accounts

2. MULTI-PICKUP ROUTING (CRITICAL):
   - If the message contains MULTIPLE pickup points (multiple locations + times + passenger groups), extract EACH as a separate routing_point entry with type "Pickup"
   - Do NOT flatten multiple pickups into a single pickup — create one routing_point per pickup location
   - Example: "06:30 PM Location A, Passenger X, AGENCY1 | 07:00 PM Location B, Passenger Y, AGENCY2" → 2 Pickup routing_points + 1 Dropoff

3. REFERENCE CODES: Patterns like "CODE: MK 3-7", "REF: XXX", "PO#XXX" → extract into po_client_ref field

Available vehicle types: ${vtNames}
Available service types: ${svcTypes}
Known client accounts (match ONLY if explicitly stated as client/booker): ${accountNames || 'none yet'}
Known affiliates/vendors: ${affiliateNames || 'none yet'}

Return ONLY valid JSON matching this schema exactly:

{
  "service_type": string or null,
  "pickup_date": "YYYY-MM-DD" or null,
  "dropoff_location": string or null,
  "vehicle_type_id": "exact id from known vehicle types" or null,
  "vehicle_type_name_raw": string or null,
  "account_id": "exact id from known accounts ONLY if explicitly identified as client" or null,
  "client_name_raw": "company/agency name explicitly identified as the PAYING CLIENT" or null,
  "booker_name": string or null,
  "po_client_ref": "reference code or PO number" or null,
  "driver_source": "InHouse" or "FarmOut" or null,
  "affiliate_id": string or null,
  "affiliate_name_raw": string or null,
  "client_base_rate": number or null,
  "notes": string or null,
  "greeting_sign": string or null,
  "passenger_count_total": number or null,
  "routing_points": [
    {
      "type": "Pickup" | "Stop" | "Dropoff",
      "time_in": "HH:MM" (24h) or null,
      "location_description": string,
      "passenger_names": [string] or [],
      "passenger_count": number or null,
      "phone_number": string or null,
      "notes": "passenger agency name / remarks for driver" or null
    }
  ]
}

Booking message:
${text}`;

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: {
        type: 'object', properties: {
          service_type: { type: ['string','null'] },
          pickup_date: { type: ['string','null'] },
          dropoff_location: { type: ['string','null'] },
          vehicle_type_id: { type: ['string','null'] },
          vehicle_type_name_raw: { type: ['string','null'] },
          account_id: { type: ['string','null'] },
          client_name_raw: { type: ['string','null'] },
          booker_name: { type: ['string','null'] },
          po_client_ref: { type: ['string','null'] },
          driver_source: { type: ['string','null'] },
          affiliate_id: { type: ['string','null'] },
          affiliate_name_raw: { type: ['string','null'] },
          client_base_rate: { type: ['number','null'] },
          notes: { type: ['string','null'] },
          greeting_sign: { type: ['string','null'] },
          passenger_count_total: { type: ['number','null'] },
          routing_points: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string' }, time_in: { type: ['string','null'] },
            location_description: { type: 'string' }, passenger_names: { type: 'array', items: { type: 'string' } },
            passenger_count: { type: ['number','null'] }, phone_number: { type: ['string','null'] },
            notes: { type: ['string','null'] }
          }}}
        }
      }});
    } catch (e) {
      setParsing(false);
      alert('AI parsing failed. Please try again.');
      return;
    }

    // Post-process: fuzzy match vehicle type
    if (!result.vehicle_type_id && result.vehicle_type_name_raw) {
      const match = fuzzyMatch(result.vehicle_type_name_raw, vehicleTypes || [], 'name') ||
                    fuzzyMatch(result.vehicle_type_name_raw, vehicleTypes || [], 'code');
      if (match) result.vehicle_type_id = match.id;
    }

    const warns = [];
    if (!result.account_id && result.client_name_raw) {
      const accMatch = (accounts || []).find(a => {
        const comp = companyMap[a.company_id];
        const name = (comp?.company_name || a.contact_name || '').toLowerCase();
        return name.includes(result.client_name_raw.toLowerCase()) ||
               result.client_name_raw.toLowerCase().includes(name.split(' ')[0]);
      });
      if (accMatch) result.account_id = accMatch.id;
      else warns.push(`Client "${result.client_name_raw}" not found in accounts — please select manually`);
    }
    if (!result.vehicle_type_id && result.vehicle_type_name_raw) {
      warns.push(`Vehicle "${result.vehicle_type_name_raw}" not matched — please select manually`);
    }

    // Summary warnings for routing
    const pickups = (result.routing_points || []).filter(p => p.type === 'Pickup');
    if (pickups.length > 1) {
      warns.push(`Found ${pickups.length} pickup points — multi-pickup routing detected`);
    }

    setParsed(result);
    setWarnings(warns);
    setParsing(false);
  };

  const applyToForm = () => {
    if (!parsed) return;
    const formData = {};
    if (parsed.service_type) formData.service_type = parsed.service_type;
    if (parsed.pickup_date) formData.pickup_date = parsed.pickup_date;
    if (parsed.dropoff_location) formData.dropoff_location = parsed.dropoff_location;
    if (parsed.vehicle_type_id) formData.vehicle_type_id = parsed.vehicle_type_id;
    if (parsed.account_id) formData.account_id = parsed.account_id;
    if (parsed.booker_name) formData.booker_name = parsed.booker_name;
    if (parsed.po_client_ref) formData.po_client_ref = parsed.po_client_ref;
    if (parsed.driver_source) formData.driver_source = parsed.driver_source;
    if (parsed.affiliate_id) formData.affiliate_id = parsed.affiliate_id;
    if (parsed.client_base_rate) formData.client_base_rate = parsed.client_base_rate;
    if (parsed.notes) formData.trip_notes = parsed.notes;
    if (parsed.greeting_sign) formData.greeting_sign = parsed.greeting_sign;
    if (parsed.passenger_count_total) formData.passenger_count = parsed.passenger_count_total;

    // Routing points
    const pts = parsed.routing_points || [];
    if (pts.length > 0) {
      formData.routing_points = pts;
      // Also set pickup_location from first Pickup point, dropoff from last Dropoff
      const firstPickup = pts.find(p => p.type === 'Pickup');
      const lastDropoff = [...pts].reverse().find(p => p.type === 'Dropoff');
      if (firstPickup) {
        formData.pickup_location = firstPickup.location_description;
        formData.pickup_time = firstPickup.time_in || '';
        formData.primary_passenger_name = firstPickup.passenger_names?.[0] || '';
        formData.primary_passenger_phone = firstPickup.phone_number || '';
      }
      if (lastDropoff && !formData.dropoff_location) {
        formData.dropoff_location = lastDropoff.location_description;
      }
      // Build legacy stops for compatibility
      const stops = pts.filter(p => p.type === 'Stop');
      if (stops.length) formData.stops = stops.map(s => ({ location: s.location_description, notes: s.notes || '' }));
    }

    onApply(formData);
    setOpen(false);
    setText('');
    setParsed(null);
    setWarnings([]);
  };

  const vtMap = Object.fromEntries((vehicleTypes || []).map(v => [v.id, v]));
  const accMap = Object.fromEntries((accounts || []).map(a => [a.id, a]));
  const affMap = Object.fromEntries((affiliates || []).map(a => [a.id, a]));
  const getAccountLabel = (id) => { if (!id) return null; const a = accMap[id]; const c = companyMap[a?.company_id]; return c?.company_name || a?.contact_name; };

  const pickupPts = (parsed?.routing_points || []).filter(p => p.type === 'Pickup');
  const stopPts = (parsed?.routing_points || []).filter(p => p.type === 'Stop');
  const dropoffPts = (parsed?.routing_points || []).filter(p => p.type === 'Dropoff');

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 font-medium" variant="outline">
        <Bot className="w-4 h-4 mr-2" /> Parse Booking Text (AI)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> AI Booking Parser
            </DialogTitle>
          </DialogHeader>

          {!parsed ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Paste a WhatsApp message, email, or booking details. Supports multi-pickup tour routing.</p>
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste booking message here..." className="bg-secondary border-border h-48 text-sm font-mono" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={parse} disabled={parsing || !text.trim()} className="bg-primary text-primary-foreground">
                  {parsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing...</> : <><Bot className="w-4 h-4 mr-2" /> Parse</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Routing Points Preview */}
              {(parsed.routing_points || []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Route Timeline — {pickupPts.length} pickup{pickupPts.length !== 1 ? 's' : ''}, {stopPts.length} stop{stopPts.length !== 1 ? 's' : ''}, {dropoffPts.length} dropoff{dropoffPts.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-2">
                    {parsed.routing_points.map((pt, i) => (
                      <div key={i} className={`flex gap-3 p-2 rounded text-xs ${pt.type === 'Pickup' ? 'bg-emerald-500/10 border border-emerald-500/20' : pt.type === 'Dropoff' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-secondary border border-border'}`}>
                        <div className="flex items-center gap-1 w-20 flex-shrink-0">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono font-bold">{pt.time_in || '—'}</span>
                        </div>
                        <div className={`text-xs font-bold uppercase w-16 flex-shrink-0 ${pt.type === 'Pickup' ? 'text-emerald-400' : pt.type === 'Dropoff' ? 'text-blue-400' : 'text-amber-400'}`}>{pt.type}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <MapPin className="w-3 h-3" />{pt.location_description}
                          </div>
                          {(pt.passenger_names || []).length > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                              <User className="w-3 h-3" />{pt.passenger_names.join(', ')}
                              {pt.passenger_count && <span className="ml-1 font-mono">×{pt.passenger_count}</span>}
                            </div>
                          )}
                          {pt.phone_number && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{pt.phone_number}</div>}
                          {pt.notes && <div className="mt-0.5 italic text-amber-400">Remarks: {pt.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <ParsedField label="Service Type" value={parsed.service_type} />
                <ParsedField label="Date" value={parsed.pickup_date} />
                <ParsedField label="Dropoff" value={parsed.dropoff_location} />
                <ParsedField label="Total Pax" value={parsed.passenger_count_total} />
                <ParsedField label="Vehicle Type" value={parsed.vehicle_type_id ? vtMap[parsed.vehicle_type_id]?.name : parsed.vehicle_type_name_raw} warn={!parsed.vehicle_type_id && !!parsed.vehicle_type_name_raw} />
                <ParsedField label="Client Account" value={parsed.account_id ? getAccountLabel(parsed.account_id) : parsed.client_name_raw} warn={!parsed.account_id && !!parsed.client_name_raw} />
                <ParsedField label="Booker" value={parsed.booker_name} />
                <ParsedField label="PO / Ref" value={parsed.po_client_ref} />
                <ParsedField label="Rate" value={parsed.client_base_rate ? `AED ${parsed.client_base_rate}` : null} />
                <ParsedField label="Greeting Sign" value={parsed.greeting_sign} />
              </div>
              {parsed.notes && <div className="text-xs text-foreground bg-secondary rounded p-2">{parsed.notes}</div>}

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setParsed(null)}>← Re-parse</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={applyToForm} className="bg-primary text-primary-foreground">
                  <CheckCircle className="w-4 h-4 mr-2" /> Apply to Form
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ParsedField({ label, value, warn }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-28 flex-shrink-0">{label}:</span>
      <span className={`font-medium ${warn ? 'text-amber-400' : 'text-foreground'}`}>
        {warn && <AlertTriangle className="w-3 h-3 inline mr-1" />}
        {String(value)}
      </span>
    </div>
  );
}