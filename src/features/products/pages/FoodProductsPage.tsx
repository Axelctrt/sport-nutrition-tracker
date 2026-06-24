import { Archive, DatabaseZap, LoaderCircle, Pencil, Plus, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { editFoodProductPath, routePaths } from '@/app/routePaths';
import { useFoodProducts } from '@/features/products/hooks/useFoodProducts';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function FoodProductsPage() {
  const [query, setQuery] = useState('');
  const { products, status, errorMessage, archivingId, refresh, archive } = useFoodProducts(query);

  const confirmArchive = async (id: string, name: string) => {
    if (window.confirm(`Archiver « ${name} » ? Il restera visible dans les anciennes entrées.`)) {
      await archive(id);
    }
  };

  return (
    <section aria-labelledby="food-products-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Catalogue alimentaire</p>
          <h1 id="food-products-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Aliments enregistrés</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Catalogue local disponible hors connexion. Les produits archivés restent dans l’historique mais ne peuvent plus être ajoutés.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={routePaths.foodSearch} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <DatabaseZap aria-hidden="true" className="size-5" />
            Open Food Facts
          </Link>
          <Link to={routePaths.newFoodProduct} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
            <Plus aria-hidden="true" className="size-5" />
            Créer un aliment
          </Link>
        </div>
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <label htmlFor="food-product-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rechercher dans les aliments locaux</label>
        <div className="relative mt-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input id="food-product-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClassName} pl-10`} placeholder="Nom ou marque" />
        </div>
      </Card>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Catalogue indisponible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-6 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des aliments…</p></Card> : null}
      {status === 'ready' && products.length === 0 ? <Card className="mt-6 p-8 text-center"><h2 className="text-xl font-semibold text-slate-950 dark:text-white">Aucun aliment trouvé</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Crée ton premier aliment manuel pour commencer le journal.</p></Card> : null}

      {status === 'ready' && products.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-950 dark:text-white">{product.name}</h2>
                    {product.isFavorite ? <Star aria-label="Favori" className="size-4 fill-amber-400 text-amber-500" /> : null}
                  </div>
                  {product.brand ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{product.brand}</p> : null}
                </div>
                <p className="shrink-0 font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(product.nutritionPer100.caloriesKcal)} kcal</p>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Pour 100 {product.basisUnit} · P {product.nutritionPer100.proteinGrams} g · G {product.nutritionPer100.carbohydratesGrams} g · L {product.nutritionPer100.fatGrams} g</p>
              {product.servingSize ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Portion : {product.servingSize} {product.basisUnit}</p> : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Source : {product.source.type === 'openFoodFacts' ? 'Open Food Facts' : 'saisie manuelle'}
                {!product.isNutritionComplete ? ' · valeurs à vérifier' : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={editFoodProductPath(product.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Pencil aria-hidden="true" className="size-4" />Modifier</Link>
                <Button variant="ghost" size="sm" disabled={archivingId === product.id} onClick={() => void confirmArchive(product.id, product.name)}><Archive aria-hidden="true" className="size-4" />{archivingId === product.id ? 'Archivage…' : 'Archiver'}</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
