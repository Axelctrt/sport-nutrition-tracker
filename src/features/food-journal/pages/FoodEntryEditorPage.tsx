import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { foodJournalPath, routePaths } from '@/app/routePaths';
import { saveProductEntry } from '@/application/food/foodJournalService';
import type { FoodEntry, FoodProduct, MealSlot } from '@/domain/models/food';
import { FoodEntryForm } from '@/features/food-journal/components/FoodEntryForm';
import type { FoodEntryFormValues } from '@/features/food-journal/schemas/foodEntrySchema';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';

const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function FoodEntryEditorPage() {
  const { entryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [entry, setEntry] = useState<FoodEntry>();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const requestedDate = searchParams.get('date') ?? '';
  const requestedSlot = searchParams.get('slot') as MealSlot | null;
  const defaultDate = isValidLocalDate(requestedDate) ? requestedDate : toLocalDate();
  const defaultSlot = requestedSlot && slots.includes(requestedSlot) ? requestedSlot : 'snacks';

  useEffect(() => {
    let active = true;
    void Promise.all([
      repositories.food.listProducts(),
      entryId ? repositories.food.getEntryById(entryId) : Promise.resolve(undefined),
    ]).then(([nextProducts, foundEntry]) => {
      if (!active) return;
      setProducts(nextProducts);
      if (entryId && !foundEntry) setErrorMessage('Entrée alimentaire introuvable.');
      setEntry(foundEntry);
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de préparer le formulaire.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [entryId]);

  const initialValues: FoodEntryFormValues = entry?.reference.sourceType === 'product'
    ? {
        date: entry.date,
        mealSlot: entry.mealSlot,
        productId: entry.reference.productId,
        inputMode: entry.reference.inputMode,
        inputQuantity: entry.reference.inputQuantity,
      }
    : {
        date: defaultDate,
        mealSlot: defaultSlot,
        productId: searchParams.get('productId') ?? '',
        inputMode: 'amount',
        inputQuantity: 100,
      };

  const handleSubmit = async (values: FoodEntryFormValues) => {
    await saveProductEntry({ ...(entryId ? { entryId } : {}), ...values });
    await navigate(foodJournalPath(values.date));
  };

  return (
    <section aria-labelledby="food-entry-editor-title">
      <Link to={foodJournalPath(entry?.date ?? defaultDate)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour au journal</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Journal alimentaire</p>
        <h1 id="food-entry-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{entryId ? 'Modifier un aliment consommé' : 'Ajouter un aliment'}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Les valeurs consommées sont calculées à partir de la quantité et d’un snapshot des données nutritionnelles.</p>
      </div>
      {loading ? <Card className="mt-8 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement…</p></Card> : null}
      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Formulaire indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage ? <Card className="mt-8 p-5 sm:p-7"><FoodEntryForm initialValues={initialValues} products={products} submitLabel={entryId ? 'Enregistrer les modifications' : 'Ajouter au journal'} onSubmit={handleSubmit} /></Card> : null}
      {!loading && products.length === 0 ? <p className="mt-4 text-sm"><Link to={routePaths.newFoodProduct} className="font-semibold text-brand-700 hover:underline">Créer un aliment manuel</Link></p> : null}
    </section>
  );
}
