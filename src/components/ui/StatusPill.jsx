import React from 'react';

const STATUS_CONFIG = {
  'New': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  'Confirmed': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'Completed': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'Cancelled': { bg: 'bg-gray-500/20', text: 'text-gray-400 line-through' },
  'No-show': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'No-Show': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'Pending': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  'Partial': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'Paid': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'Overdue': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'active': { bg: 'bg-green-500/20', text: 'text-green-400' },
  'inactive': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  'maintenance': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'Draft': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  'Sent': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'Accepted': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  'Rejected': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'Expired': { bg: 'bg-red-500/20', text: 'text-red-400' },
  'Converted': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  'InHouse': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  'FarmOut': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
};

export default function StatusPill({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' };
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium font-mono uppercase tracking-wider ${config.bg} ${config.text} ${sizeClass}`}>
      {status}
    </span>
  );
}