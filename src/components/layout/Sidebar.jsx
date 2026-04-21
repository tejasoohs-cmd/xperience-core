import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Receipt,
  Building2,
  Users,
  Truck,
  Car,
  CarFront,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Bookings', path: '/bookings', icon: CalendarCheck },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Statements', path: '/statements', icon: Receipt },
  { type: 'divider' },
  { label: 'Companies', path: '/companies', icon: Building2 },
  { label: 'Accounts', path: '/accounts', icon: Users },
  { label: 'Affiliates', path: '/affiliates', icon: Truck },
  { label: 'Drivers', path: '/drivers', icon: CarFront },
  { label: 'Vehicle Types', path: '/vehicle-types', icon: Car },
  { label: 'Fleet', path: '/fleet', icon: Car },
  { type: 'divider' },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        flex flex-col
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2" onClick={onClose}>
            <span className="text-2xl font-serif italic text-primary">X</span>
            <span className="text-sm font-medium text-sidebar-foreground tracking-wide">XPERIENCE CORE</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item, i) => {
            if (item.type === 'divider') {
              return <div key={i} className="my-3 border-t border-sidebar-border" />;
            }
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-sidebar-accent text-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}