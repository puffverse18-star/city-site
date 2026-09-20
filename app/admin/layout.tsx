import React from 'react';
import { AdminSessionProvider } from '@/components/admin/AdminSessionContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'CITY Électronique - Administration Opérationnelle',
  description: 'Panneau de contrôle marchand et gestion du catalogue CITY Électronique Casablanca.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <div className="min-h-screen bg-[#0A0C0E] text-neutral-100 flex font-sans antialiased">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </AdminSessionProvider>
  );
}
