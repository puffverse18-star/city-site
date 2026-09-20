'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Shield,
  RotateCcw,
  Boxes,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  RefreshCw,
  FileText,
  Clock,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import { appConfig } from '@/lib/config/store';

export default function AdminProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAdminSession();

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'variants' | 'inventory' | 'images' | 'sources'>('general');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // General tab editable fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Override modal/inputs
  const [newOverridePrice, setNewOverridePrice] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Inventory adjustment modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [adjustLocId, setAdjustLocId] = useState('');
  const [adjustVarId, setAdjustVarId] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMode, setAdjustMode] = useState<'delta' | 'absolute'>('delta');
  const [adjustReason, setAdjustReason] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) {
            setProduct(data);
            setName(data.name || '');
            setSlug(data.slug || '');
            setDescription(data.description || '');
            setSeoTitle(data.seoTitle || '');
            setSeoDescription(data.seoDescription || '');
            setIsPublished(data.isPublished);
            setBrandId(data.brandId || '');
            setCategoryId(data.categoryId || '');
          } else {
            setErrorMessage('Produit introuvable');
          }
          setIsLoading(false);
        }
      })
      .catch((e: any) => {
        if (active) {
          setErrorMessage(e.message);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [productId, reloadKey]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          seoTitle,
          seoDescription,
          isPublished,
          brandId: brandId || undefined,
          categoryId: categoryId || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de l\'enregistrement');
      }

      setSaveMessage('Modifications enregistrées avec succès');
      setTimeout(() => setSaveMessage(null), 3000);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleSetPriceOverride = async () => {
    if (!newOverridePrice || Number(newOverridePrice) <= 0) return;
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({
          type: 'price',
          overrideValue: Number(newOverridePrice),
          variantId: selectedVariantId || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la surcharge');
      }

      setNewOverridePrice('');
      setSaveMessage('Surcharge de prix appliquée avec succès');
      setTimeout(() => setSaveMessage(null), 3000);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleRemovePriceOverride = async (variantId?: string | null) => {
    if (!confirm('Supprimer la surcharge manuelle et rétablir le prix source du flux ?')) return;
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set('type', 'price');
      if (variantId) params.set('variantId', variantId);

      const res = await fetch(`/api/admin/products/${productId}/override?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la suppression de surcharge');
      }

      setSaveMessage('Surcharge supprimée : prix source rétabli');
      setTimeout(() => setSaveMessage(null), 3000);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason || adjustReason.trim().length < 3) {
      setErrorMessage('Un motif de plus de 3 caractères est requis');
      return;
    }

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
          variantId: adjustVarId,
          locationId: adjustLocId,
          quantityChange: Number(adjustQty),
          mode: adjustMode,
          reason: adjustReason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de l\'ajustement de stock');
      }

      setShowStockModal(false);
      setAdjustQty('');
      setAdjustReason('');
      setSaveMessage('Stock ajusté et tracé dans le journal d\'audit');
      setTimeout(() => setSaveMessage(null), 3000);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleVerifyImage = async (imageId: string, status: 'verified' | 'broken') => {
    try {
      const res = await fetch('/api/admin/images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': user.role,
          'x-admin-id': user.id,
          'x-admin-name': user.name,
        },
        body: JSON.stringify({ imageId, status }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error);
      }

      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 text-neutral-400 text-xs">
        Chargement des détails du produit...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 p-8 space-y-4">
        <Link href="/admin/products" className="text-xs text-amber-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour au catalogue
        </Link>
        <div className="text-rose-400 text-sm">Produit non trouvé.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title={product.name}
        subtitle={`Réf : ${product.id} • Slug : ${product.slug}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </Link>
          </div>
        }
      />

      <main className="p-8 space-y-6 max-w-6xl w-full">
        {/* Status Alerts */}
        {saveMessage && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {saveMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {errorMessage}
          </div>
        )}

        {/* Ownership Summary Header Card */}
        <div className="p-5 rounded-lg bg-[#0F1115] border border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{product.name}</span>
              {product.isPriceOverridden && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  <Shield className="w-3 h-3" /> Prix Protégé (Surchargé)
                </span>
              )}
              {product.needsReview && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" /> À Réviser
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-400 flex items-center gap-3">
              <span>Marque : <strong className="text-neutral-200">{product.brandName || 'Aucune'}</strong></span>
              <span>•</span>
              <span>Catégorie : <strong className="text-neutral-200">{product.categoryName || 'Aucune'}</strong></span>
              <span>•</span>
              <span>Variantes : <strong className="text-neutral-200">{product.variants.length}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-mono text-neutral-500 uppercase">Prix Public Actuel</div>
              <div className="text-xl font-mono font-semibold text-amber-400">
                {product.price.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
              </div>
            </div>
            <div className="text-right pl-4 border-l border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-500 uppercase">Stock Dérivé Dispo</div>
              <div className="text-xl font-mono font-semibold text-white">
                {product.totalAvailableStock}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-neutral-800 flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Informations &amp; SEO
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'variants'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <span>Variantes &amp; Prix (Ownership)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
              {product.variants.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <span>Stocks par Emplacement</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
              {product.inventoryByLocation.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <span>Photos &amp; Vérification</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
              {product.images.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'sources'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Traçabilité &amp; Flux Source
          </button>
        </div>

        {/* TAB 1: INFORMATIONS & SEO */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">Nom du Produit (Libellé)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Slug URL unique</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Description Fiche Produit</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-4 border-t border-neutral-800/80 space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Optimisation Référencement (SEO) Maroc
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 mb-1">Titre SEO (Meta Title)</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Ex: Apple iPhone 15 Pro au Maroc | CITY Électronique Casablanca"
                    className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Description SEO (Meta Description)</label>
                  <input
                    type="text"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Ex: Commandez votre iPhone 15 Pro avec garantie officielle et livraison express."
                    className="w-full bg-[#14171D] border border-neutral-700/80 rounded-md px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0"
                />
                <span className="text-neutral-200">Publié et visible sur la vitrine client</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold transition-colors"
              >
                <Save className="w-4 h-4" /> Enregistrer les modifications
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: VARIANTES & PRICING (OWNERSHIP MODEL) */}
        {activeTab === 'variants' && (
          <div className="space-y-6 text-xs">
            {/* Ownership Price Override Panel */}
            <div className="p-5 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-white">
                  Contrôle d&apos;Appartenance Tarifaire (Catalog Ownership Model)
                </h3>
              </div>
              <p className="text-neutral-400 leading-relaxed text-xs">
                Une surcharge manuelle magasin fige le prix public et protège la valeur de vente contre toute modification par un futur flux d&apos;importation fournisseur. 
                Si vous supprimez la surcharge, le produit réadopte immédiatement le prix issu du flux source.
              </p>

              <div className="p-4 rounded-md bg-[#14171D] border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-neutral-400">Statut du Prix Principal :</div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-white font-semibold">
                      Prix Actuel : {product.price.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span className="text-neutral-400 font-mono">
                      Prix Source Fournisseur : {product.derivedPrice.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {product.isPriceOverridden ? (
                    <button
                      onClick={() => handleRemovePriceOverride(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Rétablir Prix Source ({product.derivedPrice} {appConfig.store.currencySymbol})
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Nouveau prix en DH"
                        value={newOverridePrice}
                        onChange={(e) => setNewOverridePrice(e.target.value)}
                        className="w-36 bg-[#181B22] border border-neutral-700 rounded px-2.5 py-1.5 text-white font-mono"
                      />
                      <button
                        onClick={handleSetPriceOverride}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" /> Appliquer Surcharge
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Variants Table */}
            <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
                <h4 className="font-semibold text-white">Déclinaisons Physiques (Variantes)</h4>
                <div className="text-neutral-400 font-mono text-[11px]">
                  Unité vendable et identifiable
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                      <th className="py-2.5 px-4">Variante</th>
                      <th className="py-2.5 px-4">SKU / Réf</th>
                      <th className="py-2.5 px-4">Code-barres EAN</th>
                      <th className="py-2.5 px-4 text-right">Prix Effectif</th>
                      <th className="py-2.5 px-4 text-center">Stock Dérivé</th>
                      <th className="py-2.5 px-4 text-right">Gestion Tarif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {product.variants.map((v: any) => (
                      <tr key={v.id} className="hover:bg-neutral-900/40">
                        <td className="py-3 px-4 font-medium text-white">
                          <div>{v.name}</div>
                          {v.isDefaultVariant && (
                            <span className="text-[10px] font-mono text-amber-500">
                              (Variante Principale)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-300">
                          {v.sku || <span className="text-neutral-600 italic">Non assigné</span>}
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-300">
                          {v.barcode || <span className="text-neutral-600 italic">Non assigné</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white font-semibold">
                          {v.effectivePrice.toLocaleString('fr-FR')} {appConfig.store.currencySymbol}
                          {v.isPriceOverridden && (
                            <span className="block text-[10px] text-sky-400 font-sans">
                              Surcharge active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-emerald-400">
                            {v.availableStock} dispo
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {v.isPriceOverridden ? (
                            <button
                              onClick={() => handleRemovePriceOverride(v.id)}
                              className="text-[11px] text-rose-400 hover:text-rose-300"
                            >
                              Restaurer source
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedVariantId(v.id);
                                const p = prompt(`Définir une surcharge tarifaire pour la variante "${v.name}" (en DH) :`, String(v.effectivePrice));
                                if (p && Number(p) > 0) {
                                  setNewOverridePrice(p);
                                  handleSetPriceOverride();
                                }
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300"
                            >
                              Surcharger prix
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVENTAIRE MULTI-EMPLACEMENTS */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-500" />
                  Répartition des Stocks Physiques vs Disponibles
                </h4>
                <p className="text-neutral-400 text-xs">
                  La disponibilité en ligne est strictement dérivée :{' '}
                  <code className="font-mono text-amber-400">MAX(Physique - Réservé, 0)</code>.
                  Le stock disponible n&apos;est jamais directement modifiable.
                </p>
              </div>
            </div>

            <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                    <th className="py-3 px-4">Emplacement / Entrepôt</th>
                    <th className="py-3 px-4">Variante</th>
                    <th className="py-3 px-4 text-right">Physique</th>
                    <th className="py-3 px-4 text-right">Réservé</th>
                    <th className="py-3 px-4 text-right">Disponible Dérivé</th>
                    <th className="py-3 px-4 text-right">Ajustement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {product.inventoryByLocation.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{item.locationName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">{item.locationCode}</div>
                      </td>
                      <td className="py-3 px-4 text-neutral-200">{item.variantName}</td>
                      <td className="py-3 px-4 text-right font-mono text-white">
                        {item.physicalQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-400">
                        {item.reservedQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        {item.availableQuantity}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setAdjustLocId(item.locationId);
                            setAdjustVarId(item.variantId);
                            setShowStockModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-medium transition-colors"
                        >
                          Ajuster stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal d'ajustement de stock */}
            {showStockModal && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-[#12151B] border border-neutral-800 rounded-lg max-w-md w-full p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white">
                    Ajustement Manuel de Stock (Avec Audit Obligatoire)
                  </h3>

                  <form onSubmit={handleAdjustInventory} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-neutral-400 mb-1">Mode d&apos;ajustement</label>
                      <select
                        value={adjustMode}
                        onChange={(e) => setAdjustMode(e.target.value as any)}
                        className="w-full bg-[#181B22] border border-neutral-700 rounded px-2.5 py-2 text-white"
                      >
                        <option value="delta">Delta relatif (Ex: +5 ou -2)</option>
                        <option value="absolute">Valeur absolue exacte (Ex: 10)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">
                        {adjustMode === 'delta' ? 'Quantité à ajouter/retirer (+ ou -)' : 'Nouvelle quantité physique totale'}
                      </label>
                      <input
                        type="number"
                        required
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 mb-1">
                        Motif de l&apos;ajustement (Obligatoire pour l&apos;audit) *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Ex: Arrivage livraison express showroom Maârif..."
                        className="w-full bg-[#181B22] border border-neutral-700 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowStockModal(false)}
                        className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold"
                      >
                        Enregistrer l&apos;ajustement
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PHOTOS & VÉRIFICATION */}
        {activeTab === 'images' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Galerie Médias &amp; Contrôle Visuel</h4>
                <p className="text-neutral-400 text-xs">
                  Validation des photos avant publication officielle.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {product.images.map((img: any) => (
                <div
                  key={img.id}
                  className="rounded-lg bg-[#0F1115] border border-neutral-800/80 p-3 space-y-3"
                >
                  <div className="relative aspect-video rounded bg-neutral-900 overflow-hidden border border-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.sourceUrl}
                      alt={img.altText}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-white border border-white/10">
                        {img.imageSourceType}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-neutral-200 truncate">{img.altText}</div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Statut :</span>
                      {img.verificationStatus === 'verified' && (
                        <span className="text-emerald-400 font-medium">✓ Vérifié</span>
                      )}
                      {img.verificationStatus === 'pending' && (
                        <span className="text-amber-400 font-medium">● En attente</span>
                      )}
                      {img.verificationStatus === 'broken' && (
                        <span className="text-rose-400 font-medium">✗ Défectueux</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2">
                    {img.verificationStatus !== 'verified' && (
                      <button
                        onClick={() => handleVerifyImage(img.id, 'verified')}
                        className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      >
                        Valider photo
                      </button>
                    )}
                    {img.verificationStatus !== 'broken' && (
                      <button
                        onClick={() => handleVerifyImage(img.id, 'broken')}
                        className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      >
                        Signaler cassée
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TRAÇABILITÉ & SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-lg bg-[#0F1115] border border-neutral-800/80 space-y-2">
              <h4 className="text-sm font-semibold text-white">Traçabilité du Flux Source</h4>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Ce produit est relié aux identifiants des flux fournisseurs suivants. La réconciliation d&apos;identité est strictement conservatrice pour éviter toute collision d&apos;articles.
              </p>
            </div>

            <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800 bg-[#12151B] text-neutral-400 font-mono text-[11px]">
                    <th className="py-3 px-4">Fournisseur / Source</th>
                    <th className="py-3 px-4">ID Enregistrement Source</th>
                    <th className="py-3 px-4 text-center">Score de Confiance</th>
                    <th className="py-3 px-4 text-center">Révision Requise</th>
                    <th className="py-3 px-4 text-right">Date d&apos;Association</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {product.sources.map((src: any) => (
                    <tr key={src.id} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{src.sourceName}</div>
                        <div className="text-[10px] font-mono text-neutral-500">{src.sourceCode}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-200">
                        {src.sourceRecordId}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white">
                          {(src.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {src.needsManualReview ? (
                          <span className="text-amber-400 font-medium">Oui ({src.reviewNotes})</span>
                        ) : (
                          <span className="text-emerald-400">Non (Validé)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-500">
                        {new Date(src.mappedAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
