'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  UserCheck,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const url = actionFilter === 'all' ? '/api/admin/audit' : `/api/admin/audit?action=${actionFilter}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) setLogs(data.logs || []);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement journal audit:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.summary.toLowerCase().includes(q) ||
      log.adminName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entityId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Journal d'Audit Immuable (Audit Trail)"
        subtitle="Traçabilité cryptographique et immuable de toutes les actions administratives, surcharges et dérogations."
      />

      <main className="p-8 space-y-6 max-w-7xl w-full">
        {/* Filter bar */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par résumé, administrateur, action ou ID entité..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md pl-9 pr-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">Toutes les Actions ({logs.length})</option>
            <option value="PRICE_OVERRIDE_SET">Surcharges de Prix</option>
            <option value="PRICE_OVERRIDE_REMOVED">Suppressions de Surcharges</option>
            <option value="INVENTORY_ADJUSTED">Ajustements de Stock</option>
            <option value="IMPORT_SAFETY_OVERRIDDEN">Dérogations de Sécurité Superadmin</option>
            <option value="IMPORT_COMMITTED">Imports Engagés</option>
            <option value="IMAGE_VERIFIED">Photos Validées</option>
            <option value="PRODUCT_UPDATED">Fiches Produits Modifiées</option>
          </select>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <div>
              <span className="text-white font-semibold">{filteredLogs.length}</span> événements enregistrés
            </div>
            <div className="font-mono text-[11px] text-emerald-400">
              ● Journal immuable (Append-only)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Date &amp; Heure</th>
                  <th className="py-3 px-4">Administrateur</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Résumé de l&apos;Opération</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      Chargement des événements d&apos;audit...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      Aucun événement d&apos;audit trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-neutral-900/40">
                          <td className="py-3 px-4 font-mono text-neutral-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{log.adminName}</div>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase">
                              {log.adminRole}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                              {log.action}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-neutral-200">
                            {log.summary}
                            {log.entityId && (
                              <span className="text-[10px] font-mono text-neutral-500 block">
                                Entité : {log.entityType} #{log.entityId}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-neutral-950/60">
                            <td colSpan={5} className="p-4 border-t border-neutral-800/40">
                              <div className="space-y-2">
                                <div className="text-[11px] font-mono text-neutral-400 uppercase">
                                  Payload des Modifications (Before / After / Context) :
                                </div>
                                <pre className="p-3 rounded bg-black/60 border border-neutral-800 text-neutral-300 font-mono text-[11px] overflow-x-auto">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
