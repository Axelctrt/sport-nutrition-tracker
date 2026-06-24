import { CalendarPlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyFavoriteMeal,
  deleteFavoriteMeal,
  listFavoriteMealSummaries,
  type FavoriteMealSummary,
} from '@/application/food/favoriteMealService';
import { foodJournalPath, routePaths } from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';

export function FavoriteMealsPage() {
  const [favorites, setFavorites] = useState<FavoriteMealSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState(toLocalDate());
  const [slot, setSlot] = useState<MealSlot>('lunch');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(undefined);
    try {
      const next = await listFavoriteMealSummaries();
      setFavorites(next);
      setSelectedId((current) => current || next[0]?.favoriteMeal.id || '');
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger les repas favoris.');
      setStatus('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const apply = async () => {
    if (!selectedId) return;
    setBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    try {
      const count = await applyFavoriteMeal(selectedId, date, slot);
      setSuccessMessage(`${count} entrée${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} au journal.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’ajouter ce favori.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (summary: FavoriteMealSummary) => {
    if (!window.confirm(`Supprimer le favori « ${summary.favoriteMeal.name} » ?`)) return;
    setBusy(true);
    try {
      await deleteFavoriteMeal(summary.favoriteMeal.id);
      setSelectedId('');
      await refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de supprimer ce favori.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="favorite-meals-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Organisation des repas</p>
          <h1 id="favorite-meals-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Repas favoris</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Réutilise en une seule opération les aliments et recettes d’un repas déjà enregistré.</p>
        </div>
        <Link to={routePaths.food} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 font-semibold dark:border-slate-700">Ouvrir le journal</Link>
      </div>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Opération impossible">{errorMessage}</InlineNotice> : null}
      {successMessage ? <InlineNotice className="mt-6" title="Favori ajouté">{successMessage} <Link className="font-semibold underline" to={foodJournalPath(date)}>Voir la journée</Link></InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-8 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des favoris…</p></Card> : null}
      {status === 'ready' && favorites.length === 0 ? <Card className="mt-8 p-8 text-center"><h2 className="text-xl font-semibold text-slate-950 dark:text-white">Aucun repas favori</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Depuis le journal alimentaire, enregistre un repas existant comme favori.</p></Card> : null}

      {status === 'ready' && favorites.length > 0 ? (
        <>
          <Card className="mt-8 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Ajouter un favori au journal</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px_220px_auto] lg:items-end">
              <div><label htmlFor="favorite-select" className="text-sm font-semibold">Repas favori</label><select id="favorite-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={`${inputClassName} mt-2`}>{favorites.map(({ favoriteMeal }) => <option key={favoriteMeal.id} value={favoriteMeal.id}>{favoriteMeal.name}</option>)}</select></div>
              <div><label htmlFor="favorite-date" className="text-sm font-semibold">Date</label><input id="favorite-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClassName} mt-2`} /></div>
              <div><label htmlFor="favorite-slot" className="text-sm font-semibold">Repas</label><select id="favorite-slot" value={slot} onChange={(event) => setSlot(event.target.value as MealSlot)} className={`${inputClassName} mt-2`}>{Object.entries(mealSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <Button disabled={busy || !selectedId} onClick={() => void apply()}><CalendarPlus aria-hidden="true" className="size-4" />Ajouter</Button>
            </div>
          </Card>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {favorites.map((summary) => (
              <Card key={summary.favoriteMeal.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><h2 className="text-lg font-semibold text-slate-950 dark:text-white">{summary.favoriteMeal.name}</h2><p className="mt-1 text-sm text-slate-500">{summary.favoriteMeal.items.length} élément{summary.favoriteMeal.items.length > 1 ? 's' : ''}{summary.favoriteMeal.defaultSlot ? ` · ${mealSlotLabels[summary.favoriteMeal.defaultSlot]}` : ''}</p></div>
                  <p className="font-bold tabular-nums">{Math.round(summary.totals.caloriesKcal)} kcal</p>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">P {summary.totals.proteinGrams.toFixed(1)} g · G {summary.totals.carbohydratesGrams.toFixed(1)} g · L {summary.totals.fatGrams.toFixed(1)} g</p>
                <Button className="mt-4" size="sm" variant="danger" disabled={busy} onClick={() => void remove(summary)}><Trash2 aria-hidden="true" className="size-4" />Supprimer</Button>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
