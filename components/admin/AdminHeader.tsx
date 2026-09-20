'use client';

import React from 'react';
import { useAdminSession } from './AdminSessionContext';
import { appConfig } from '@/lib/config/store';
import { UserCheck, Clock } from 'lucide-react';

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { user } = useAdminSession();

  const roleColors: Record<string, string> = {
    superadmin: 'bg-red-500/10 text-red-400 border-red-500/30',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    catalog_manager: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  };

  const roleLabels: Record<string, string> = {
    superadmin: 'Superadmin',
    admin: 'Admin Opérations',
    catalog_manager: 'Catalog Manager',
  };

  return (
    <header className="px-8 py-5 border-b border-neutral-800/80 bg-[#0F1115]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Casablanca live info */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400">
          <Clock className="w-3 h-3 text-neutral-500" />
          <span>Casablanca (Showroom Maârif ouvert)</span>
          <span className="text-neutral-600">•</span>
          <span className="text-amber-400 font-semibold">{appConfig.store.currencySymbol} (MAD)</span>
        </div>

        {/* User Role Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800">
          <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-200 font-medium">{user.name}</span>
          <span
            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
              roleColors[user.role] || 'bg-neutral-800 text-neutral-300'
            }`}
          >
            {roleLabels[user.role] || user.role}
          </span>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
