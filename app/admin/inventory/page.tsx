'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { appConfig } from '@/lib/config/store';

export default function AdminInventoryPage() {
  const { user } = useAdminSession();

  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');
  const [locationFilter, setLocationFilter] = useState('all');

  // Adjustment Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMode, setAdjustMode] = useState<'delta' | 'absolute'>('delta');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/inventory')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) {
            setItems(data.items || []);
            setLocations(data.locations || []);
          }
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement inventaire:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason || adjustReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'Un motif d\'au moins 3 caractères est obligatoire pour l\'audit' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({
          variantId: selectedItem.variantId,
          locationId: selectedItem.locationId,
          quantityChange: Number(adjustQty),
          mode: adjustMode,
          reason: adjustReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de l\'ajustement');
      }

      setShowModal(false);
      setAdjustQty('');
      setAdjustReason('');
      setFeedback({ type: 'success', message: 'Stock ajusté avec succès et tracé dans le journal d\'audit.' });
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (locationFilter !== 'all' && item.locationId !== locationFilter) return false;
    if (filterType === 'low' && (item.availableQuantity > 3 || item.availableQuantity === 0)) return false;
    if (filterType === 'out' && item.availableQuantity > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.productName.toLowerCase().includes(q) ||
        item.variantName.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.locationName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Gestion des Stocks &amp; Multi-Emplacements"
        subtitle="Suivi temps réel des stocks physiques et disponibles dérivés (Showroom Maârif &amp; Dépôt Central Aïn Sebaâ)."
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
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {feedback.message}
          </div>
        )}

        {/* Calculation Invariant Banner */}
        <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Invariant d&apos;Inventaire Dérivé
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed">
              Le stock disponible pour la commande en ligne est calculé strictement selon la formule :{' '}
              <code className="font-mono text-amber-400 bg-black/40 px-1.5 py-0.5 rounded">
                MAX(Physique - Réservé, 0)
              </code>.
              Aucune saisie manuelle directe du stock disponible n&apos;est possible.
            </p>
          </div>
        </div>

        {/* Search & Location Filters */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par article, SKU ou emplacement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md pl-9 pr-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tous les Emplacements ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType('low')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'low' ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Stock Faible (≤3)
              </button>
              <button
                onClick={() => setFilterType('out')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === 'out' ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Rupture
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <div>
              <span className="text-white font-semibold">{filteredItems.length}</span> lignes d&apos;inventaire affichées
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Produit &amp; Variante</th>
                  <th className="py-3 px-4">Référence SKU</th>
                  <th className="py-3 px-4">Emplacement Dépositaire</th>
                  <th className="py-3 px-4 text-right">Physique</th>
                  <th className="py-3 px-4 text-right">Réservé</th>
                  <th className="py-3 px-4 text-right">Disponible Dérivé</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      Chargement des stocks...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      Aucune ligne d&apos;inventaire ne correspond aux critères.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="font-medium text-white hover:text-amber-400 transition-colors"
                        >
                          {item.productName}
                        </Link>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Variante : {item.variantName}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-neutral-300">
                        {item.sku || <span className="text-neutral-600 italic">Sans SKU</span>}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-200">{item.locationName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">{item.locationCode}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-white">
                        {item.physicalQuantity}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-neutral-400">
                        {item.reservedQuantity}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            item.availableQuantity > 3
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : item.availableQuantity > 0
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {item.availableQuantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-medium transition-colors"
                        >
                          Ajuster stock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Ajustement */}
        {showModal && selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#12151B] border border-neutral-800 rounded-lg max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-semibold text-white">
                  Ajustement Physique Audité
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded bg-neutral-900/60 border border-neutral-800 text-xs space-y-1">
                <div>Article : <strong className="text-white">{selectedItem.productName}</strong></div>
                <div className="text-neutral-400">Variante : {selectedItem.variantName}</div>
                <div className="text-neutral-400">Lieu : {selectedItem.locationName}</div>
                <div className="text-amber-400 font-mono pt-1">
                  Stock physique actuel : {selectedItem.physicalQuantity} (Réservé : {selectedItem.reservedQuantity})
                </div>
              </div>

              <form onSubmit={handleAdjust} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Mode d&apos;opération</label>
                  <select
                    value={adjustMode}
                    onChange={(e) => setAdjustMode(e.target.value as any)}
                    className="w-full bg-[#181B22] border border-neutral-700 rounded px-2.5 py-2 text-white"
                  >
                    <option value="delta">Variation relative (Delta +/-)</option>
                    <option value="absolute">Régularisation absolue (Inventaire physique total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">
                    {adjustMode === 'delta' ? 'Quantité à ajouter/retirer (+ ou -)' : 'Nouveau total physique exact'} *
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="Ex: 5 ou -2"
                    className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">
                    Motif obligatoire pour l&apos;audit *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Ex: Réception arrivage express showroom Maârif..."
                    className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enregistrement...' : 'Valider &amp; Tracer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
