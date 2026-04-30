import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SHORTCUTS = [
  { key: 'N', desc: 'New Booking' },
  { key: '/', desc: 'Focus Search' },
  { key: 'ESC', desc: 'Close Modal' },
];

export function KeyboardShortcutsHint() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Keyboard className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border text-xs p-3 space-y-1.5">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex gap-3 items-center">
              <kbd className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground min-w-[28px] text-center">{s.key}</kbd>
              <span className="text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function useKeyboardShortcuts(searchRef) {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = ['input', 'textarea', 'select'].includes(tag) || document.activeElement?.contentEditable === 'true';
      if (e.key === 'Escape') {
        // ESC is handled natively by Radix dialogs
        return;
      }
      if (isInput) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/bookings/new');
      }
      if (e.key === '/') {
        e.preventDefault();
        if (searchRef?.current) searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, searchRef]);
}