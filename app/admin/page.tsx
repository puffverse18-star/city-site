'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  History,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { appConfig } from '@/lib/config/store';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setMetrics(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erreur chargement métriques dashboard:', err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Tableau de bord Opérationnel"
        subtitle="Vue d'ensemble du catalogue CITY Électronique, des stocks et du pipeline d'importation."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/imports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Nouvel Import
            </Link>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau Produit
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-8 max-w-7xl w-full">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Produits Catalogués
            </div>
            <div className="text-2xl font-semibold text-white">
              {isLoading ? '...' : metrics?.totalProducts ?? 0}
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <span>{metrics?.totalVariants ?? 0} variantes</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Actifs en Ligne
            </div>
            <div className="text-2xl font-semibold text-emerald-400">
              {isLoading ? '...' : metrics?.activeProducts ?? 0}
            </div>
            <div className="text-[11px] text-neutral-400">
              Disponibles sur la boutique
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              À Réviser
            </div>
            <div className="text-2xl font-semibold text-amber-400">
              {isLoading ? '...' : metrics?.productsRequiringReview ?? 0}
            </div>
            <Link
              href="/admin/products?needsReview=true"
              className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
            >
              Voir les anomalies <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Stocks Faibles
            </div>
            <div className="text-2xl font-semibold text-rose-400">
              {isLoading ? '...' : metrics?.lowStockItems ?? 0}
            </div>
            <Link
              href="/admin/inventory?filter=low"
              className="text-[11px] text-rose-400/80 hover:text-rose-300 flex items-center gap-1"
            >
              Surveiller les dépôts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Surcharges Actives
            </div>
            <div className="text-2xl font-semibold text-sky-400">
              {isLoading ? '...' : metrics?.productsWithOverrides ?? 0}
            </div>
            <Link
              href="/admin/products?hasOverride=true"
              className="text-[11px] text-sky-400/80 hover:text-sky-300 flex items-center gap-1"
            >
              Valeurs protégées <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-1">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
              Emplacements
            </div>
            <div className="text-2xl font-semibold text-neutral-200">
              {isLoading ? '...' : metrics?.inventoryLocationsCount ?? 2}
            </div>
            <div className="text-[11px] text-neutral-400">
              Maârif + Aïn Sebaâ
            </div>
          </div>
        </div>

        {/* Safety Guard Status Banner */}
        <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                Snapshot Safety Guard Actif
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Seuil: {appConfig.safety.maxDropPercentage}% max
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Tout flux d&apos;importation complet constatant une baisse de catalogue &gt;15% est automatiquement bloqué avant engagement.
              </p>
            </div>
          </div>
          <Link
            href="/admin/imports"
            className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700 whitespace-nowrap"
          >
            Vérifier les flux <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Two-Column Grid: Recent Imports & Live Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Imports (7 cols) */}
          <section className="lg:col-span-7 bg-[#0F1115] border border-neutral-800/80 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-white">Dernières Opérations d&apos;Import</h2>
              </div>
              <Link
                href="/admin/imports"
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
              >
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[11px]">
                    <th className="pb-2">Réf / Source</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Créations</th>
                    <th className="pb-2 text-right">Mises à jour</th>
                    <th className="pb-2 text-center">Statut</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {metrics?.recentImports?.length > 0 ? (
                    metrics.recentImports.map((imp: any) => (
                      <tr key={imp.id} className="hover:bg-neutral-900/40">
                        <td className="py-2.5">
                          <div className="font-medium text-white">#{imp.importNumber}</div>
                          <div className="text-[10px] text-neutral-400 truncate max-w-[150px]">
                            {imp.sourceName}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              imp.isFullSnapshot
                                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {imp.isFullSnapshot ? 'Instantané' : 'Partiel'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-emerald-400">
                          +{imp.wouldCreateCount}
                        </td>
                        <td className="py-2.5 text-right font-mono text-sky-400">
                          ~{imp.wouldUpdateCount}
                        </td>
                        <td className="py-2.5 text-center">
                          {imp.status === 'committed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Engagé
                            </span>
                          )}
                          {imp.status === 'blocked_safety' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" /> Bloqué
                            </span>
                          )}
                          {imp.status === 'dry_run_ready' && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Simulation
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/admin/imports/${imp.id}`}
                            className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                          >
                            Détails →
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-neutral-500">
                        Aucun import récent enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Live Audit Log Stream (5 cols) */}
          <section className="lg:col-span-5 bg-[#0F1115] border border-neutral-800/80 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-400" />
                <h2 className="text-sm font-semibold text-white">Activité Récente (Audit)</h2>
              </div>
              <Link
                href="/admin/audit"
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
              >
                Journal complet <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {metrics?.recentAuditEvents?.length > 0 ? (
                metrics.recentAuditEvents.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-neutral-900/60 border border-neutral-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span className="text-amber-400/90 font-medium">{log.adminName}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-neutral-200 leading-snug">
                      {log.summary}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500 uppercase">
                      Action : {log.action}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  Aucun événement d&apos;audit récent.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
