import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Printer, ChevronDown, User, Truck, FileText, Users } from 'lucide-react';

export default function PrintMenu({ booking, setPrintMode }) {
  const isFarmOut = booking?.driver_source === 'FarmOut';
  const hasInvoice = !!booking?.invoice_id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-1" /> Print <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={() => setPrintMode('receipt')} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> Reservation Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrintMode('customer')} className="cursor-pointer">
          <Users className="w-4 h-4 mr-2 text-muted-foreground" /> Customer Trip Sheet
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isFarmOut && (
          <DropdownMenuItem onClick={() => setPrintMode('affiliate')} className="cursor-pointer">
            <Truck className="w-4 h-4 mr-2 text-muted-foreground" /> Affiliate Trip Sheet
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setPrintMode('driver')} className="cursor-pointer">
          <User className="w-4 h-4 mr-2 text-muted-foreground" /> Driver Trip Sheet
        </DropdownMenuItem>
        {hasInvoice && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(`/invoices/${booking.invoice_id}`, '_blank')} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> Open Invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}