import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type { FoodProduct, MealSlot } from '@/domain/models/food';
import { MealFoodSelectionForm } from '@/features/food-journal/components/MealFoodSelectionForm';
import type { FoodEntryFormValues } from '@/features/food-journal/schemas/foodEntrySchema';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface FoodEntryQuickDialogProps {
  product: FoodProduct | undefined;
  date: string;
  mealSlot: MealSlot;
  errorMessage?: string | undefined;
  onClose: () => void;
  onSubmit: (values: FoodEntryFormValues) => Promise<void>;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function FoodEntryQuickDialog({
  product,
  date,
  mealSlot,
  errorMessage,
  onClose,
  onSubmit,
}: FoodEntryQuickDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>('#meal-selector-quantity')?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, product]);

  if (!product) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/55 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-entry-quick-title"
        aria-describedby="food-entry-quick-description"
        className="safe-area-bottom max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Ajout au {mealSlotLabels[mealSlot].toLocaleLowerCase('fr')}
            </p>
            <h2 id="food-entry-quick-title" className="mt-1 break-words text-xl font-semibold text-slate-950 dark:text-white">
              {product.name}
            </h2>
            <p id="food-entry-quick-description" className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Règle la quantité puis confirme l’ajout sans quitter la sélection.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-2 shrink-0 px-2"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        {errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Ajout impossible" role="alert">
            {errorMessage}
          </InlineNotice>
        ) : null}

        {!product.isNutritionComplete ? (
          <InlineNotice className="mt-4" tone="info" title="Valeurs nutritionnelles à vérifier">
            Certaines valeurs sont absentes de la source et ont été enregistrées à zéro. Tu peux ajouter le produit, puis corriger sa fiche locale si nécessaire.
          </InlineNotice>
        ) : null}

        <div className="mt-5">
          <MealFoodSelectionForm
            product={product}
            date={date}
            mealSlot={mealSlot}
            onSubmit={onSubmit}
            showProductHeader={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
