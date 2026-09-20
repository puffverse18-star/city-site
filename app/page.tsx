import { ShieldCheck, Cpu, Layers, HardDrive, ShoppingBag } from 'lucide-react';
import { appConfig } from '@/lib/config/store';

export default function HomePage() {
  return (
    <main id="phase1-foundation-root" className="min-h-screen bg-[#0C0D0F] text-[#F3F4F6] font-sans antialiased flex flex-col justify-between p-6 sm:p-12 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Shell */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-neutral-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-neutral-100 flex items-center justify-center text-[#0C0D0F] font-bold text-xs tracking-tighter">
            CE
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wide text-white uppercase">
              {appConfig.store.name}
            </span>
            <span className="block text-[10px] font-mono text-neutral-500 tracking-wider">
              MAROC • {appConfig.store.currency} ({appConfig.store.currencySymbol})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[11px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          PHASE 1 FONDATION ACTIVE
        </div>
      </header>

      {/* Hero Studio Content */}
      <section className="max-w-4xl w-full mx-auto py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-neutral-800 bg-neutral-900/60 text-xs font-mono tracking-widest text-neutral-400 uppercase">
          <Cpu className="w-3.5 h-3.5 text-amber-500" />
          Système Technique &amp; Socle de Données
        </div>

        <h1 className="text-3xl sm:text-5xl font-light tracking-tight text-white leading-tight">
          L&apos;essentiel de l&apos;électronique premium,{' '}
          <span className="font-normal text-neutral-400 italic">bâti sur une architecture rigoureuse.</span>
        </h1>

        <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-normal">
          Le socle de données relationnel PostgreSQL / Drizzle, le modèle d&apos;appartenance des données sources vs magasin, 
          le calcul d&apos;inventaire multi-emplacements et le pipeline d&apos;import étagé sont désormais opérationnels.
        </p>

        {/* Technical Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-6">
          <div className="p-4 rounded-md border border-neutral-800/80 bg-neutral-900/30 space-y-2">
            <div className="flex items-center gap-2 text-white text-xs font-medium font-mono">
              <Layers className="w-4 h-4 text-amber-500" />
              Produits &amp; Variantes
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Modèle Produit générique → Déclinaisons physiques (SKU/Barcode nullables, prix et stocks par variante).
            </p>
          </div>

          <div className="p-4 rounded-md border border-neutral-800/80 bg-neutral-900/30 space-y-2">
            <div className="flex items-center gap-2 text-white text-xs font-medium font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Ownership Model
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Isolation stricte : les surcharges manuelles de la boutique sont protégées contre les synchronisations futures.
            </p>
          </div>

          <div className="p-4 rounded-md border border-neutral-800/80 bg-neutral-900/30 space-y-2">
            <div className="flex items-center gap-2 text-white text-xs font-medium font-mono">
              <HardDrive className="w-4 h-4 text-sky-500" />
              Snapshot Safety Guard
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Blocage automatique de désactivation si un flux snapshot complet chute de plus de {appConfig.safety.maxDropPercentage}%.
            </p>
          </div>

          <div className="p-4 rounded-md border border-neutral-800/80 bg-neutral-900/30 space-y-2">
            <div className="flex items-center gap-2 text-white text-xs font-medium font-mono">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              Orders Immutables
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Snapshot immuable des articles (prix capturé en DH, libellé et variante figés au moment de l&apos;achat).
            </p>
          </div>
        </div>
      </section>

      {/* Footer System Status */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
        <div>
          PostgreSQL 17 Schema Compiled • Drizzle ORM • Zod Validation • Bcrypt 12 Rounds
        </div>
        <div>
          Prêt pour la Phase 2 : Design System &amp; Storefront Shell
        </div>
      </footer>
    </main>
  );
}
