'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Filter,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminSession } from '@/components/admin/AdminSessionContext';

export default function AdminImagesPage() {
  const { user } = useAdminSession();

  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'broken'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const url = filter === 'all' ? '/api/admin/images' : `/api/admin/images?status=${filter}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data) setImages(data.images || []);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement images:', e);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  const handleUpdateStatus = async (imageId: string, status: 'verified' | 'broken') => {
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
        const err = await res.json();
        throw new Error(err.error);
      }

      setFeedback(`Image ${status === 'verified' ? 'validée' : 'marquée défectueuse'}`);
      setTimeout(() => setFeedback(null), 3000);
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Gestion &amp; Contrôle des Médias (Photos Studio)"
        subtitle="Vérification manuelle des visuels produits pour garantir une expérience d'achat haut de gamme."
      />

      <main className="p-8 space-y-6 max-w-7xl w-full">
        {feedback && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {feedback}
          </div>
        )}

        <div className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-white">Filtrer par statut de vérification :</span>
          </div>

          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-400 hover:text-white'
              }`}
            >
              En attente (Pending)
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Vérifiées (Verified)
            </button>
            <button
              onClick={() => setFilter('broken')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === 'broken' ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Défectueuses (Broken)
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
              Chargement de la médiathèque...
            </div>
          ) : images.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
              Aucune image dans cette catégorie.
            </div>
          ) : (
            images.map((img) => (
              <div
                key={img.id}
                className="bg-[#0F1115] border border-neutral-800/80 rounded-lg p-3 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative aspect-square rounded bg-neutral-900 overflow-hidden border border-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.sourceUrl}
                      alt={img.altText}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/80 text-neutral-200 border border-white/10">
                        {img.imageSourceType}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/admin/products/${img.productId}`}
                      className="text-xs font-medium text-white hover:text-amber-400 line-clamp-1"
                    >
                      {img.productName}
                    </Link>
                    <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                      {img.altText}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-neutral-500">Statut :</span>
                    {img.verificationStatus === 'verified' && (
                      <span className="text-emerald-400 font-medium">✓ Validée</span>
                    )}
                    {img.verificationStatus === 'pending' && (
                      <span className="text-amber-400 font-medium">● À vérifier</span>
                    )}
                    {img.verificationStatus === 'broken' && (
                      <span className="text-rose-400 font-medium">✗ Défectueuse</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-1.5 text-xs">
                  {img.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => handleUpdateStatus(img.id, 'verified')}
                      className="flex-1 py-1.5 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-center font-medium"
                    >
                      Valider
                    </button>
                  )}
                  {img.verificationStatus !== 'broken' && (
                    <button
                      onClick={() => handleUpdateStatus(img.id, 'broken')}
                      className="flex-1 py-1.5 px-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-center font-medium"
                    >
                      Signaler cassée
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
