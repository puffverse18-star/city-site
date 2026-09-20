'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  UploadCloud,
  Boxes,
  Image as ImageIcon,
  History,
  Store,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useAdminSession } from './AdminSessionContext';

const NAV_ITEMS = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Produits & Variantes', icon: Layers },
  { href: '/admin/imports', label: 'Imports Fournisseurs', icon: UploadCloud },
  { href: '/admin/inventory', label: 'Stocks & Entrepôts', icon: Boxes },
  { href: '/admin/images', label: 'Galerie & Médias', icon: ImageIcon },
  { href: '/admin/audit', label: 'Journal d\'Audit', icon: History },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, switchRole, isLoading } = useAdminSession();

  return (
    <aside className="w-64 bg-[#0F1115] border-r border-neutral-800/80 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-neutral-800/80">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-neutral-950 font-bold text-xs tracking-wider">
              CE
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                CITY Admin
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Phase 3
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono">
                Casablanca • MAD
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            Gestion Commerciale
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Role Switcher & Store Link */}
      <div className="p-3 border-t border-neutral-800/80 space-y-3">
        {/* Role Switcher */}
        <div className="p-2.5 rounded-md bg-neutral-900/90 border border-neutral-800 text-xs">
          <div className="flex items-center justify-between gap-1 text-[11px] text-neutral-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" />
              Rôle Actif (RBAC)
            </span>
            {isLoading && <span className="text-amber-400 animate-spin text-[10px]">●</span>}
          </div>
          <select
            value={user.role}
            onChange={(e) => switchRole(e.target.value as any)}
            className="w-full text-xs font-medium bg-[#14171D] text-white border border-neutral-700/80 rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="superadmin">Superadmin (Directeur Général)</option>
            <option value="admin">Admin (Opérations Magasin)</option>
            <option value="catalog_manager">Catalog Manager (Catalogue)</option>
          </select>
          <div className="mt-1.5 text-[10px] text-neutral-400 leading-tight">
            {user.role === 'superadmin' && '✓ Autorisation de dérogation de sécurité'}
            {user.role === 'admin' && '✓ Gestion stocks & imports réguliers'}
            {user.role === 'catalog_manager' && '✓ Fiches produits et photos uniquement'}
          </div>
        </div>

        {/* Storefront Link */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-md bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs transition-colors"
        >
          <span className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-neutral-400" />
            Voir la vitrine client
          </span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </Link>
      </div>
    </aside>
  );
}
