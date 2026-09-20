'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Layers,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { appConfig } from '@/lib/config/store';

export default function AdminProductsPage() {
  const { user } = useAdminSession();

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [needsReview, setNeedsReview] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [missingSku, setMissingSku] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState(false);
  const [lowStock, setLowStock] = useState(false);

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (category !== 'all') params.set('category', category);
    if (brand !== 'all') params.set('brand', brand);
    if (needsReview) params.set('needsReview', 'true');
    if (hasOverride) params.set('hasOverride', 'true');
    if (missingSku) params.set('missingSku', 'true');
    if (missingBarcode) params.set('missingBarcode', 'true');
    if (lowStock) params.set('lowStock', 'true');
    params.set('page', String(page));
    params.set('limit', '50');

    fetch(`/api/admin/products?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setProducts(data.items || []);
          setTotal(data.total || 0);
          setBrands(data.brands || []);
          setCategories(data.categories || []);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement catalogue:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, status, category, brand, needsReview, hasOverride, missingSku, missingBarcode, lowStock, page, reloadKey]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({
          name: newProdName,
          slug: newProdSlug || newProdName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          price: Number(newProdPrice),
          description: newProdDesc,
          sku: newProdSku || undefined,
          barcode: newProdBarcode || undefined,
          categoryId: newProdCat || undefined,
          brandId: newProdBrand || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la création');
      }

      setShowCreateModal(false);
      setNewProdName('');
      setNewProdSlug('');
      setNewProdPrice('');
      setNewProdSku('');
      setNewProdBarcode('');
      setNewProdDesc('');
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Gestion du Catalogue Produits"
        subtitle="Consultation, surcharges de prix, attributs, variantes et statut de publication."
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau Produit
          </button>
        }
      />

      <main className="p-8 space-y-6 max-w-7xl w-full">
        {/* Search and Filters Bar */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, référence SKU, code-barres ou variante..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-[#14171D] border border-neutral-700/80 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">Toutes Catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setPage(1);
                }}
                className="bg-[#14171D] border border-neutral-700/80 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">Toutes Marques</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-[#14171D] border border-neutral-700/80 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">Tous Statuts</option>
                <option value="published">En Ligne</option>
                <option value="draft">Brouillon</option>
                <option value="in_stock">En Stock</option>
                <option value="low_stock">Stock Faible</option>
                <option value="out_of_stock">Rupture</option>
              </select>
            </div>
          </div>

          {/* Special Condition Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/80 text-xs">
            <span className="text-[11px] font-mono text-neutral-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtres Rapides :
            </span>

            <button
              onClick={() => {
                setHasOverride(!hasOverride);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                hasOverride
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Surcharges Actives
            </button>

            <button
              onClick={() => {
                setNeedsReview(!needsReview);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                needsReview
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              À Réviser
            </button>

            <button
              onClick={() => {
                setLowStock(!lowStock);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                lowStock
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Stock Faible (≤3)
            </button>

            <button
              onClick={() => {
                setMissingSku(!missingSku);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                missingSku
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              SKU Manquant
            </button>

            <button
              onClick={() => {
                setMissingBarcode(!missingBarcode);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                missingBarcode
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Code-barres Manquant
            </button>

            {(hasOverride || needsReview || lowStock || missingSku || missingBarcode || search || status !== 'all' || category !== 'all' || brand !== 'all') && (
              <button
                onClick={() => {
                  setHasOverride(false);
                  setNeedsReview(false);
                  setLowStock(false);
                  setMissingSku(false);
                  setMissingBarcode(false);
                  setSearch('');
                  setStatus('all');
                  setCategory('all');
                  setBrand('all');
                  setPage(1);
                }}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 underline ml-2"
              >
                Réinitialiser filtres
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <div>
              Affichage de <span className="text-white font-semibold">{products.length}</span> sur{' '}
              <span className="text-white font-semibold">{total}</span> articles
            </div>
            <div className="text-[11px] font-mono">
              Prix en Dirhams Marocains ({appConfig.store.currencySymbol})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Produit &amp; Marque</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4 text-center">Variantes</th>
                  <th className="py-3 px-4 text-right">Prix Effectif</th>
                  <th className="py-3 px-4 text-center">Disponibilité</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      Chargement des fiches produits...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      Aucun produit ne correspond aux filtres actuels.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2">
                          <div>
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-medium text-white hover:text-amber-400 transition-colors"
                            >
                              {p.name}
                            </Link>
                            <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                              <span>{p.brandName || 'Sans marque'}</span>
                              <span className="text-neutral-600">•</span>
                              <span className="font-mono text-neutral-500">{p.slug}</span>
                            </div>

                            {/* Badges indicators */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {p.isPriceOverridden && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                  <Shield className="w-2.5 h-2.5" /> Prix Surchargé
                                </span>
                              )}
                              {p.isNameOverridden && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  Titre Surchargé
                                </span>
                              )}
                              {p.needsReview && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <AlertTriangle className="w-2.5 h-2.5" /> À Réviser
                                </span>
                              )}
                              {p.missingBarcode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                                  Sans code-barres
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-neutral-300">
                        {p.categoryName || 'Non catégorisé'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                          {p.variantsCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-semibold font-mono text-white">
                          {p.price.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
                        </div>
                        {p.isPriceOverridden ? (
                          <div className="text-[10px] font-mono text-neutral-500 line-through">
                            Source: {p.derivedPrice.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-neutral-500">
                            Issu du flux source
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="font-mono text-xs text-neutral-200">
                          {p.totalAvailableStock} dispo
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          ({p.totalPhysicalStock} physique / {p.totalReservedStock} rés.)
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {p.isPublished ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> En Ligne
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                            <XCircle className="w-3 h-3" /> Brouillon
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="text-xs px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-medium transition-colors"
                          >
                            Éditer →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Création Produit */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#12151B] border border-neutral-800 rounded-lg max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-white">Nouveau Produit Store-Managed</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {createError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Nom du Produit *</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => {
                      setNewProdName(e.target.value);
                      if (!newProdSlug) {
                        setNewProdSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    placeholder="Ex: Apple iPad Air M2 11 pouces"
                    className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Slug URL *</label>
                    <input
                      type="text"
                      required
                      value={newProdSlug}
                      onChange={(e) => setNewProdSlug(e.target.value)}
                      placeholder="ipad-air-m2-11"
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Prix de base (MAD / DH) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      placeholder="8990"
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Catégorie</label>
                    <select
                      value={newProdCat}
                      onChange={(e) => setNewProdCat(e.target.value)}
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Sélectionner...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Marque</label>
                    <select
                      value={newProdBrand}
                      onChange={(e) => setNewProdBrand(e.target.value)}
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Sélectionner...</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">SKU (Optionnel / Nullable)</label>
                    <input
                      type="text"
                      value={newProdSku}
                      onChange={(e) => setNewProdSku(e.target.value)}
                      placeholder="IPAD-AIR-M2"
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Code-barres EAN (Nullable)</label>
                    <input
                      type="text"
                      value={newProdBarcode}
                      onChange={(e) => setNewProdBarcode(e.target.value)}
                      placeholder="0195949123456"
                      className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="Description technique et caractéristiques..."
                    className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer le Produit'}
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
