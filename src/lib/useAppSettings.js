import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_SETTINGS = {
  settings_key: 'main',
  company_name: 'Xperience Tourism LLC',
  company_address: 'Dubai, UAE',
  company_phone: '',
  company_email: '',
  company_tax_id: '',
  company_logo_url: '',
  default_vat_percent: 5,
  next_booking_number: 18100,
  next_account_number: 50000,
  next_invoice_counter: 1,
  next_statement_counter: 1,
  payment_terms_list: ['Due Upon Receipt', 'Net 15', 'Net 30'],
  service_types_list: ['Arrival', 'Departure', 'Point-to-Point', 'Hourly', 'Tour'],
};

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: settingsArr, isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ settings_key: 'main' }),
    initialData: [],
  });

  const settings = settingsArr?.length > 0 ? { ...DEFAULT_SETTINGS, ...settingsArr[0] } : DEFAULT_SETTINGS;
  const settingsId = settingsArr?.length > 0 ? settingsArr[0].id : null;

  const updateSettings = useMutation({
    mutationFn: async (data) => {
      if (settingsId) {
        return base44.entities.AppSettings.update(settingsId, data);
      } else {
        return base44.entities.AppSettings.create({ ...DEFAULT_SETTINGS, ...data });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
  });

  const getNextBookingNumber = async () => {
    const current = settings.next_booking_number || 18100;
    await updateSettings.mutateAsync({ next_booking_number: current + 1 });
    return current;
  };

  const getNextAccountNumber = async () => {
    const current = settings.next_account_number || 50000;
    await updateSettings.mutateAsync({ next_account_number: current + 1 });
    return current;
  };

  const getNextInvoiceNumber = async () => {
    const current = settings.next_invoice_counter || 1;
    const year = new Date().getFullYear();
    await updateSettings.mutateAsync({ next_invoice_counter: current + 1 });
    return `INV-${year}-${String(current).padStart(3, '0')}`;
  };

  const getNextStatementNumber = async () => {
    const current = settings.next_statement_counter || 1;
    const year = new Date().getFullYear();
    await updateSettings.mutateAsync({ next_statement_counter: current + 1 });
    return `VST-${year}-${String(current).padStart(3, '0')}`;
  };

  return {
    settings,
    settingsId,
    isLoading,
    updateSettings,
    getNextBookingNumber,
    getNextAccountNumber,
    getNextInvoiceNumber,
    getNextStatementNumber,
  };
}