import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mic, MicOff, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function VoiceInput({ onApply }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech Recognition is not supported in this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      parseWithClaude(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    setTranscript('');
    setParsed(null);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const parseWithClaude = async (text) => {
    setParsing(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    const prompt = `Today is ${today}. Tomorrow is ${tomorrow}. Extract booking details from this voice input and return ONLY valid JSON.\n\nVoice input: "${text}"\n\nReturn JSON with these fields (omit missing ones):\n{"date": "YYYY-MM-DD", "pickup_time": "HH:mm", "pickup_location": "string", "dropoff_location": "string", "flight_number": "string", "pax_count": number, "luggage_count": number, "guest_name": "string", "guest_phone": "string", "stops": [{"location": "string", "time": "HH:mm"}], "notes": "string"}\n\nResolve "today" to ${today} and "tomorrow" to ${tomorrow}. Return only the JSON object, no explanation.`;
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            pickup_time: { type: 'string' },
            pickup_location: { type: 'string' },
            dropoff_location: { type: 'string' },
            flight_number: { type: 'string' },
            pax_count: { type: 'number' },
            luggage_count: { type: 'number' },
            guest_name: { type: 'string' },
            guest_phone: { type: 'string' },
            stops: { type: 'array', items: { type: 'object' } },
            notes: { type: 'string' },
          },
        },
      });
      setParsed(result);
      setShowPreview(true);
    } catch (e) {
      alert('Parsing failed: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    const mapped = {};
    if (parsed.date) mapped.pickup_date = parsed.date;
    if (parsed.pickup_time) mapped.pickup_time = parsed.pickup_time;
    if (parsed.pickup_location) mapped.pickup_location = parsed.pickup_location;
    if (parsed.dropoff_location) mapped.dropoff_location = parsed.dropoff_location;
    if (parsed.flight_number) mapped.flight_number = parsed.flight_number;
    if (parsed.pax_count) mapped.passenger_count = parsed.pax_count;
    if (parsed.luggage_count !== undefined) mapped.luggage_count = parsed.luggage_count;
    if (parsed.guest_name) mapped.primary_passenger_name = parsed.guest_name;
    if (parsed.guest_phone) mapped.primary_passenger_phone = parsed.guest_phone;
    if (parsed.notes) mapped.trip_notes = parsed.notes;
    if (parsed.stops?.length) mapped.stops = parsed.stops.map(s => ({ location: s.location || '', time: s.time || '', notes: '' }));
    onApply(mapped);
    setShowPreview(false);
    setTranscript('');
    setParsed(null);
  };

  const detectedFields = parsed ? Object.entries(parsed).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) : [];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={listening ? stopListening : startListening}
        disabled={parsing}
        className={`gap-2 ${listening ? 'border-red-500 text-red-400 animate-pulse' : 'border-primary/50 text-primary'}`}
      >
        {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {parsing ? 'Parsing…' : listening ? 'Stop' : 'Voice Input'}
      </Button>

      <Dialog open={showPreview} onOpenChange={v => { if (!v) setShowPreview(false); }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif italic flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Voice Booking Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="bg-secondary/50 rounded p-3 text-muted-foreground italic">"{transcript}"</div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Detected Fields</p>
              <div className="space-y-1">
                {detectedFields.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-foreground">{Array.isArray(v) ? `${v.length} items` : String(v)}</span>
                  </div>
                ))}
                {detectedFields.length === 0 && <p className="text-muted-foreground text-xs">No fields detected.</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={detectedFields.length === 0} className="bg-primary text-primary-foreground">Apply to Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}