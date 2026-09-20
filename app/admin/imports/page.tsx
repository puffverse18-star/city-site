'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  ArrowRight,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { appConfig } from '@/lib/config/store';

export default function AdminImportsPage() {
  const { user } = useAdminSession();

  const [imports, setImports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New import form
  const [sourceCode, setSourceCode] = useState('fournisseur_officiel_tech');
  const [isFullSnapshot, setIsFullSnapshot] = useState(true);
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [fileContent, setFileContent] = useState('');
  const [filename, setFilename] = useState('catalogue_fournisseur.csv');
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/imports')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) setImports(data.imports || []);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement imports:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Sample data pre-loaders for demonstration & immediate testing
  const loadNormalSnapshot = () => {
    setFileType('csv');
    setFilename('arrivage_officiel_tech_mars.csv');
    setIsFullSnapshot(true);
    setFileContent(
`source_record_id,name,sku,barcode,price,stock
REC-APPLE-15P,"Apple iPhone 15 Pro (Titane Noir)",IPH15P-128-BLK,0195949012345,12990.00,16
REC-SONY-XM5,"Sony WH-1000XM5 Noir",SNY-WHXM5-BLK,4548736132580,3890.00,8
REC-ANKER-200W,"Anker Prime 200W PowerBank",ANK-PRM-20K,,1290.00,5
REC-NEW-AIRPODS,"Apple AirPods Pro 2 USB-C",APP-PRO-2-USBC,0195949888777,2790.00,12
REC-NEW-WATCH,"Apple Watch Series 9 GPS 45mm",AW9-45-MID,0195949666555,4890.00,6`
    );
  };

  const loadDangerousDropSnapshot = () => {
    setFileType('csv');
    setFilename('flux_incomplet_anomalie_drop.csv');
    setIsFullSnapshot(true);
    setFileContent(
`source_record_id,name,sku,barcode,price,stock
REC-SEUL-ARTICLE,"Câble USB-C vers Lightning 1m",CAB-USBC-LTG,0195949111222,290.00,50`
    );
  };

  const loadPartialUpdate = () => {
    setFileType('csv');
    setFilename('maj_prix_partielle.csv');
    setIsFullSnapshot(false);
    setFileContent(
`source_record_id,name,sku,barcode,price,stock
REC-SONY-XM5,"Sony WH-1000XM5 Noir",SNY-WHXM5-BLK,4548736132580,3790.00,10`
    );
  };

  const handleStartDryRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSimulating(true);

    try {
      const res = await fetch('/api/admin/imports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({
          sourceCode,
          fileContent,
          fileType,
          filename,
          isFullSnapshot,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de la simulation');
      }

      const newImport = await res.json();
      window.location.href = `/admin/imports/${newImport.id}`;
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Pipeline d'Importation Sécurisé (Safe Import)"
        subtitle="Intégration étagée de flux fournisseurs avec Snapshot Safety Guard et prévisualisation complète."
      />

      <main className="p-8 space-y-8 max-w-7xl w-full">
        {/* Safety Guard Explaination Card */}
        <div className="p-5 rounded-lg bg-[#0F1115] border border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-white">
                Garde-Fou d&apos;Intégrité (Snapshot Safety Guard)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Seuil: {appConfig.safety.maxDropPercentage}% max
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              1. <strong>Mise à jour partielle</strong> : ne déclenche JAMAIS de désactivation par absence.<br />
              2. <strong>Instantané complet (Full Snapshot)</strong> : si le volume chute de plus de {appConfig.safety.maxDropPercentage}%, les désactivations sont suspendues et l&apos;import est bloqué jusqu&apos;à dérogation explicite d&apos;un Superadmin.
            </p>
          </div>
        </div>

        {/* Section: Initier un Nouvel Import */}
        <section className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-semibold text-white">
                Préparer un Import Fournisseur (Mode Simulation / Dry Run)
              </h2>
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              Aucune modification n&apos;est appliquée avant votre validation finale
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleStartDryRun} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">Fournisseur / Source *</label>
                <select
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  className="w-full bg-[#14171D] border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="fournisseur_officiel_tech">
                    Distributeur Officiel High-Tech Maroc
                  </option>
                  <option value="importateur_audio_direct">
                    Importateur Audio Direct Casablanca
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Type d&apos;Importation *</label>
                <select
                  value={isFullSnapshot ? 'full' : 'partial'}
                  onChange={(e) => setIsFullSnapshot(e.target.value === 'full')}
                  className="w-full bg-[#14171D] border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="full">Instantané Complet (Protégé par seuil {appConfig.safety.maxDropPercentage}%)</option>
                  <option value="partial">Mise à jour Partielle (Sans désactivation)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Format de Données</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="w-full bg-[#14171D] border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="csv">Fichier CSV Tabulaire</option>
                  <option value="json">Format JSON Structuré</option>
                </select>
              </div>
            </div>

            {/* Quick Test Preloaders */}
            <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 flex flex-wrap items-center gap-2">
              <span className="text-neutral-400 font-mono text-[11px] mr-2">
                Jeux d&apos;essais prédéfinis :
              </span>
              <button
                type="button"
                onClick={loadNormalSnapshot}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium"
              >
                1. Flux Normal (Nouveaux articles)
              </button>
              <button
                type="button"
                onClick={loadDangerousDropSnapshot}
                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium flex items-center gap-1"
              >
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                2. Flux Tronqué (Déclenche le Blocage Sécurité)
              </button>
              <button
                type="button"
                onClick={loadPartialUpdate}
                className="px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium"
              >
                3. Mise à jour Partielle ciblée
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-neutral-400">Contenu du Flux (CSV ou JSON brut) *</label>
                <span className="text-[11px] font-mono text-neutral-500">
                  Colonnes : source_record_id, name, sku, barcode, price, stock
                </span>
              </div>
              <textarea
                required
                rows={7}
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="Collez ici les lignes CSV ou le tableau JSON..."
                className="w-full bg-[#14171D] border border-neutral-700 rounded-md p-3 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSimulating || !fileContent.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                {isSimulating ? 'Calcul du diff en cours...' : 'Générer le Rapport Diff (Simulation)'}
              </button>
            </div>
          </form>
        </section>

        {/* Section: Historique des Imports */}
        <section className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Historique des Imports et Simulations
            </h2>
            <div className="text-xs text-neutral-400 font-mono">
              {imports.length} opérations enregistrées
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Import #</th>
                  <th className="py-3 px-4">Source &amp; Fichier</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Créations</th>
                  <th className="py-3 px-4 text-right">Mises à jour</th>
                  <th className="py-3 px-4 text-center">Garde-Fou Sécurité</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-500">
                      Chargement des imports...
                    </td>
                  </tr>
                ) : imports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-500">
                      Aucun import enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        #{imp.importNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{imp.sourceName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">{imp.filename}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            imp.isFullSnapshot
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {imp.isFullSnapshot ? 'Instantané Complet' : 'Mise à jour Partielle'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        +{imp.wouldCreateCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sky-400">
                        ~{imp.wouldUpdateCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {imp.safetyThresholdTriggered ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" /> Chute {imp.safetyDropPercentage.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400">
                            ✓ Conforme (&lt;{appConfig.safety.maxDropPercentage}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {imp.status === 'committed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Engagé
                          </span>
                        )}
                        {imp.status === 'blocked_safety' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium">
                            <AlertTriangle className="w-3 h-3" /> Bloqué Sécurité
                          </span>
                        )}
                        {imp.status === 'dry_run_ready' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            Simulation Prête
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/imports/${imp.id}`}
                          className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-medium transition-colors inline-flex items-center gap-1"
                        >
                          Examiner le Diff <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
