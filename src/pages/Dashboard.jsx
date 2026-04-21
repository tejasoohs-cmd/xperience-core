import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';
import FinancialCards from '@/components/dashboard/FinancialCards';
import TripVolumeCards from '@/components/dashboard/TripVolumeCards';
import TodayOps from '@/components/dashboard/TodayOps';
import PipelineCards from '@/components/dashboard/PipelineCards';
import MonthlyChart from '@/components/dashboard/MonthlyChart';
import TopLists from '@/components/dashboard/TopLists';
import OverdueInvoices from '@/components/dashboard/OverdueInvoices';
import QuickActions from '@/components/dashboard/QuickActions';

export default function Dashboard() {
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings'], queryFn: () => base44.entities.Booking.list('-pickup_date', 500) });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => base44.entities.Invoice.list('-invoice_date', 200) });
  const { data: statements = [] } = useQuery({ queryKey: ['statements'], queryFn: () => base44.entities.VendorStatement.list('-date', 200) });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => base44.entities.Account.list() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => base44.entities.Company.list() });
  const { data: affiliates = [] } = useQuery({ queryKey: ['affiliates'], queryFn: () => base44.entities.Affiliate.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => base44.entities.Driver.list() });
  const { data: vehicleTypes = [] } = useQuery({ queryKey: ['vehicleTypes'], queryFn: () => base44.entities.VehicleType.list() });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const todayBookings = bookings.filter(b => b.pickup_date === todayStr);
  const tomorrowBookings = bookings.filter(b => b.pickup_date === tomorrowStr);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={format(new Date(), 'EEEE, dd MMMM yyyy')} actions={<QuickActions bookings={bookings} />} />

      <FinancialCards invoices={invoices} statements={statements} bookings={bookings} />
      <TripVolumeCards bookings={bookings} />
      <PipelineCards bookings={bookings} invoices={invoices} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayOps title="Today's Operations" bookings={todayBookings} accounts={accounts} drivers={drivers} affiliates={affiliates} vehicleTypes={vehicleTypes} />
        <TodayOps title="Tomorrow's Operations" bookings={tomorrowBookings} accounts={accounts} drivers={drivers} affiliates={affiliates} vehicleTypes={vehicleTypes} />
      </div>

      <MonthlyChart bookings={bookings} />
      <TopLists bookings={bookings} accounts={accounts} companies={companies} affiliates={affiliates} />
      <OverdueInvoices invoices={invoices} accounts={accounts} companies={companies} />
    </div>
  );
}