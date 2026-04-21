import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import BookingsList from '@/pages/BookingsList';
import BookingForm from '@/pages/BookingForm';
import Invoices from '@/pages/Invoices';
import InvoiceView from '@/pages/InvoiceView';
import VendorStatements from '@/pages/VendorStatements';
import StatementView from '@/pages/StatementView';
import Companies from '@/pages/Companies';
import Accounts from '@/pages/Accounts';
import Affiliates from '@/pages/Affiliates';
import Drivers from '@/pages/Drivers';
import VehicleTypes from '@/pages/VehicleTypes';
import Fleet from '@/pages/Fleet';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="text-3xl font-serif italic text-primary">X</span>
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<BookingsList />} />
        <Route path="/bookings/new" element={<BookingForm />} />
        <Route path="/bookings/:id" element={<BookingForm />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceView />} />
        <Route path="/statements" element={<VendorStatements />} />
        <Route path="/statements/:id" element={<StatementView />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/affiliates" element={<Affiliates />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/vehicle-types" element={<VehicleTypes />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App