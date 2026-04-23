import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Printer, ChevronDown, User, Truck, FileText, Users, XCircle } from 'lucide-react';

export default function PrintMenu({ booking }) {
  const isFarmOut = booking?.driver_source === 'FarmOut';
  const isCancelled = booking?.status === 'Cancelled';
  const hasInvoice = !!booking?.invoice_id;
  const id = booking?.id;

  const open = (path) => window.open(path, '_blank');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-1" /> Print <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={() => open(`/print/reservation-receipt/${id}`)} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> Reservation Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(`/print/customer-trip-sheet/${id}`)} className="cursor-pointer">
          <Users className="w-4 h-4 mr-2 text-muted-foreground" /> Customer Trip Sheet
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open(`/print/driver-trip-sheet/${id}`)} className="cursor-pointer">
          <User className="w-4 h-4 mr-2 text-muted-foreground" /> Driver Trip Sheet
        </DropdownMenuItem>
        {isFarmOut && (
          <DropdownMenuItem onClick={() => open(`/print/affiliate-trip-sheet/${id}`)} className="cursor-pointer">
            <Truck className="w-4 h-4 mr-2 text-muted-foreground" /> Affiliate Trip Sheet
          </DropdownMenuItem>
        )}
        {isCancelled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => open(`/print/cancellation-confirmation/${id}`)} className="cursor-pointer text-red-400">
              <XCircle className="w-4 h-4 mr-2" /> Cancellation Confirmation
            </DropdownMenuItem>
          </>
        )}
        {hasInvoice && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => open(`/print/invoice/${booking.invoice_id}`)} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2 text-muted-foreground" /> Print Invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}