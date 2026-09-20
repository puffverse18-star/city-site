'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  FileText,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { appConfig } from '@/lib/config/store';

export default function AdminImportDetailPage() {
  const params = useParams();
  const importId = params.id as string;
  const { user } = useAdminSession();

  const [importData, setImportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diffFilter, setDiffFilter] = useState<'all' | 'create' | 'update' | 'unchanged' | 'error'>('all');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/imports/${importId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) setImportData(data);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement import:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [importId, reloadKey]);

  const handleOverrideSafety = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 10) {
      setFeedback({ type: 'error', message: 'Une justification d\'au moins 10 caractères est obligatoire' });
      return;
    }

    setIsOverriding(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/imports/${importId}/override-safety`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({ reason: overrideReason }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de la dérogation de sécurité');
      }

      setFeedback({ type: 'success', message: 'Dépassement de sécurité autorisé avec succès par le Superadmin.' });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsOverriding(false);
    }
  };

  const handleCommitImport = async () => {
    if (!confirm('Engager définitivement cet import dans le catalogue CITY Électronique ?')) return;

    setIsCommitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/imports/${importId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de l\'engagement');
      }

      setFeedback({ type: 'success', message: 'Import engagé avec succès dans le catalogue !' });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsCommitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 text-neutral-400 text-xs">
        Analyse du rapport de simulation d&apos;import...
      </div>
    );
  }

  if (!importData) {
    return (
      <div className="flex-1 p-8 space-y-4">
        <Link href="/admin/imports" className="text-xs text-amber-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour aux imports
        </Link>
        <div className="text-rose-400 text-sm">Import introuvable.</div>
      </div>
    );
  }

  const report = importData.dryRunReport;
  const isSafetyBlocked = importData.status === 'blocked_safety' && !importData.adminOverrideSafety;
  const canCommit = importData.status === 'dry_run_ready' || importData.adminOverrideSafety;

  const filteredItems = report?.items?.filter((item: any) => {
    if (diffFilter === 'all') return true;
    return item.action === diffFilter;
  }) || [];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title={`Rapport de Simulation - Import #${importData.importNumber}`}
        subtitle={`Source : ${importData.sourceName} • Fichier : ${importData.filename}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/imports"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-6 max-w-7xl w-full">
        {feedback && (
          <div
            className={`p-3 rounded text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80">
            <div className="text-[10px] font-mono text-neutral-500 uppercase">Lignes Reçues</div>
            <div className="text-xl font-bold text-white font-mono mt-1">
              {importData.totalRecordsReceived}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80">
            <div className="text-[10px] font-mono text-emerald-500 uppercase">À Créer</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
              +{importData.wouldCreateCount}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80">
            <div className="text-[10px] font-mono text-sky-500 uppercase">Mises à Jour</div>
            <div className="text-xl font-bold text-sky-400 font-mono mt-1">
              ~{importData.wouldUpdateCount}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80">
            <div className="text-[10px] font-mono text-neutral-500 uppercase">Inchangés</div>
            <div className="text-xl font-bold text-neutral-300 font-mono mt-1">
              {importData.unchangedCount}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80">
            <div className="text-[10px] font-mono text-rose-500 uppercase">Erreurs / Rejets</div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-1">
              {importData.errorCount}
            </div>
          </div>
        </div>

        {/* CRITICAL: SNAPSHOT SAFETY GUARD BANNER */}
        {isSafetyBlocked && (
          <div className="p-5 rounded-lg bg-rose-950/20 border border-rose-600/40 text-rose-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-rose-500/20 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  DÉCLENCHEMENT DU GARDE-FOU (SNAPSHOT SAFETY GUARD)
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Baisse constatée : {importData.safetyDropPercentage.toFixed(1)}%
                  </span>
                </h3>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  Ce fichier complet contient une volumétrie nettement inférieure (&gt;15% de perte) à l&apos;instantané précédent. 
                  Pour éviter toute désactivation accidentelle massive de produits dans le catalogue en ligne de Casablanca, 
                  l&apos;engagement automatique est <strong>bloqué</strong>.
                </p>
              </div>
            </div>

            {/* Superadmin Override Section */}
            {user.role === 'superadmin' ? (
              <form onSubmit={handleOverrideSafety} className="pt-3 border-t border-rose-800/40 space-y-3">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  Autorisation de Dérogation Superadmin
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Justification obligatoire (Ex: Remplacement officiel de gamme validé par la direction)..."
                    className="flex-1 bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isOverriding}
                    className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors whitespace-nowrap"
                  >
                    {isOverriding ? 'Validation...' : 'Forcer le Déblocage (Override)'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-3 border-t border-rose-800/40 text-xs text-rose-300/80 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  Votre rôle actuel (<strong>{user.role}</strong>) ne possède pas l&apos;habilitation de sécurité. 
                  Basculez sur le rôle <strong>Superadmin</strong> dans le menu latéral pour débloquer.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Safety Override Confirmation Banner */}
        {importData.adminOverrideSafety && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <strong className="text-white">Dérogation de sécurité validée :</strong> {importData.adminOverrideReason}
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              Débloqué
            </span>
          </div>
        )}

        {/* Action Commit Card */}
        <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Prêt pour l&apos;Engagement en Production ?</div>
            <div className="text-xs text-neutral-400">
              {importData.status === 'committed'
                ? `Import déjà engagé le ${new Date(importData.committedAt).toLocaleString('fr-FR')} par ${importData.approvedByAdmin || 'le système'}.`
                : 'Les modifications identifiées ci-dessous seront appliquées de manière idempotente.'}
            </div>
          </div>

          {importData.status !== 'committed' && (
            <button
              onClick={handleCommitImport}
              disabled={!canCommit || isCommitting}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded font-semibold text-xs transition-colors ${
                canCommit
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCommitting ? 'Engagement en cours...' : 'Engager l\'Import dans le Catalogue'}
            </button>
          )}
        </div>

        {/* Detailed Diff Table with Action Filters */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden space-y-3">
          <div className="p-4 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-semibold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" />
              Visualisation Granulaire des Écarts (Diff Engine)
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-md border border-neutral-800">
              <button
                onClick={() => setDiffFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  diffFilter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tous ({report?.items?.length || 0})
              </button>
              <button
                onClick={() => setDiffFilter('create')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  diffFilter === 'create' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Créations (+{importData.wouldCreateCount})
              </button>
              <button
                onClick={() => setDiffFilter('update')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  diffFilter === 'update' ? 'bg-sky-500/20 text-sky-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Mises à Jour (~{importData.wouldUpdateCount})
              </button>
              <button
                onClick={() => setDiffFilter('unchanged')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  diffFilter === 'unchanged' ? 'bg-neutral-800 text-neutral-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Inchangés ({importData.unchangedCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Réf Source</th>
                  <th className="py-3 px-4">Détail des Écarts (Avant → Après)</th>
                  <th className="py-3 px-4 text-right">Protection Surcharges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-500">
                      Aucun élément dans cette catégorie.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-4">
                        {item.action === 'create' && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            + Création
                          </span>
                        )}
                        {item.action === 'update' && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                            ~ Mise à Jour
                          </span>
                        )}
                        {item.action === 'unchanged' && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium">
                            = Inchangé
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-300">
                        {item.sourceRecordId}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {item.diff?.name && (
                            <div>
                              <span className="text-neutral-500">Nom : </span>
                              {item.diff.name.from ? (
                                <span>
                                  <span className="line-through text-neutral-500">{item.diff.name.from}</span>
                                  {' → '}
                                  <strong className="text-white">{item.diff.name.to}</strong>
                                </span>
                              ) : (
                                <strong className="text-white">{item.diff.name.to}</strong>
                              )}
                            </div>
                          )}

                          {item.diff?.price && (
                            <div className="font-mono">
                              <span className="text-neutral-500">Prix : </span>
                              {item.diff.price.from ? (
                                <span>
                                  <span className="line-through text-neutral-500">{item.diff.price.from} {appConfig.store.currencySymbol}</span>
                                  {' → '}
                                  <strong className="text-amber-400">{item.diff.price.to} {appConfig.store.currencySymbol}</strong>
                                </span>
                              ) : (
                                <strong className="text-amber-400">{item.diff.price.to} {appConfig.store.currencySymbol}</strong>
                              )}
                            </div>
                          )}

                          {item.diff?.sku && (
                            <div className="font-mono text-[11px] text-neutral-400">
                              SKU : {item.diff.sku.to}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {item.diff?.price?.overriddenBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            <Shield className="w-3 h-3" /> Surcharge Protégée (Ignoré)
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Non surchargé
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
