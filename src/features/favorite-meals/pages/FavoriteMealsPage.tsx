import { Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FavoriteMealSummary } from '@/application/food/favoriteMealService';
import { foodJournalPath, routePaths } from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import { FavoriteMealApplyDialog } from '@/features/favorite-meals/components/FavoriteMealApplyDialog';
import { FavoriteMealCard } from '@/features/favorite-meals/components/FavoriteMealCard';
import { FavoriteMealsSummary } from '@/features/favorite-meals/components/FavoriteMealsSummary';
import { useFavoriteMeals } from '@/features/favorite-meals/hooks/useFavoriteMeals';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { toLocalDate } from '@/shared/utils/dates';

interface SuccessFeedback {
  title: string;
  message: string;
  date: string;
}

export function FavoriteMealsPage() {
  const {
    favorites,
    status,
    errorMessage,
    busyId,
    refresh,
    apply,
    remove,
  } = useFavoriteMeals();
  const [query, setQuery] = useState('');
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteMealSummary>();
  const [success, setSuccess] = useState<SuccessFeedback>();
  const today = toLocalDate();

  const visibleFavorites = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    if (!normalizedQuery) return favorites;
    return favorites.filter((summary) => summary.favoriteMeal.name.toLocaleLowerCase('fr').includes(normalizedQuery));
  }, [favorites, query]);

  const handleApply = async (date: string, slot: MealSlot) => {
    if (!selectedFavorite) return;
    const count = await apply(selectedFavorite.favoriteMeal.id, date, slot);
    if (count === undefined) return;
    setSuccess({
      title: 'Repas ajouté au journal',
      message: `${count} entrée${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''}.`,
      date,
    });
    setSelectedFavorite(undefined);
  };

  const handleDelete = async (favoriteId: string) => {
    const removed = await remove(favoriteId);
    if (removed) {
      setSuccess(undefined);
      if (selectedFavorite?.favoriteMeal.id === favoriteId) setSelectedFavorite(undefined);
    }
    return removed;
  };

  const totalItems = favorites.reduce((sum, summary) => sum + summary.favoriteMeal.items.length, 0);
  const averageCalories = favorites.length > 0
    ? favorites.reduce((sum, summary) => sum + summary.totals.caloriesKcal, 0) / favorites.length
    : 0;

  return (
    <section className="min-w-0" aria-labelledby="favorite-meals-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Bibliothèque alimentaire</p>
          <h1 id="favorite-meals-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Repas favoris</h1>
          <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">
            Réutilise en une seule opération les aliments et recettes d’un repas déjà enregistré.
          </p>
        </div>
        <Link to={routePaths.food} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto">
          Ouvrir le journal
        </Link>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Opération impossible" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button> : null}
        </InlineNotice>
      ) : null}

      {success ? (
        <InlineNotice className="mt-5" tone="success" title={success.title} role="status">
          {success.message}{' '}
          <Link className="font-semibold underline" to={foodJournalPath(success.date)}>Voir la journée</Link>
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <FavoriteMealsSummary
            favoriteCount={favorites.length}
            itemCount={totalItems}
            averageCalories={averageCalories}
          />

          {favorites.length > 0 ? (
            <Card className="mt-4 p-4 sm:p-5">
              <label htmlFor="favorite-meal-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rechercher un repas favori</label>
              <div className="relative mt-2">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="favorite-meal-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${inputClassName} pl-10`}
                  placeholder="Nom du favori"
                />
              </div>
            </Card>
          ) : null}

          {favorites.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Star}
              title="Aucun repas favori"
              description="Depuis le journal alimentaire, ouvre les options d’un repas puis enregistre-le comme favori."
              primaryAction={(
                <Link to={routePaths.food} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
                  Ouvrir le journal
                </Link>
              )}
            />
          ) : visibleFavorites.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Search}
              title="Aucun favori trouvé"
              description="Modifie la recherche pour retrouver un autre repas."
              primaryAction={<Button variant="secondary" onClick={() => setQuery('')}>Effacer la recherche</Button>}
            />
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {visibleFavorites.map((summary) => (
                <FavoriteMealCard
                  key={summary.favoriteMeal.id}
                  summary={summary}
                  deleting={busyId === `delete-${summary.favoriteMeal.id}`}
                  onApply={setSelectedFavorite}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      <FavoriteMealApplyDialog
        favorite={selectedFavorite}
        initialDate={today}
        busy={Boolean(selectedFavorite && busyId === `apply-${selectedFavorite.favoriteMeal.id}`)}
        {...(selectedFavorite && errorMessage ? { errorMessage } : {})}
        onClose={() => setSelectedFavorite(undefined)}
        onApply={handleApply}
      />
    </section>
  );
}
