import { CalendarPlus, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { FavoriteMealSummary } from '@/application/food/favoriteMealService';
import type { MealSlot } from '@/domain/models/food';
import { mealSlotLabels } from '@/features/food-journal/utils/foodLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface FavoriteMealApplyDialogProps {
  favorite: FavoriteMealSummary | undefined;
  initialDate: string;
  busy: boolean;
  errorMessage?: string;
  onClose: () => void;
  onApply: (date: string, slot: MealSlot) => Promise<void>;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function FavoriteMealApplyDialog({
  favorite,
  initialDate,
  busy,
  errorMessage,
  onClose,
  onApply,
}: FavoriteMealApplyDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(initialDate);
  const [slot, setSlot] = useState<MealSlot>('lunch');

  useEffect(() => {
    if (!favorite) return;
    setDate(initialDate);
    setSlot(favorite.favoriteMeal.defaultSlot ?? 'lunch');
  }, [favorite, initialDate]);

  useEffect(() => {
    if (!favorite) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
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
  }, [busy, favorite, onClose]);

  if (!favorite) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/55 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-apply-title"
        aria-describedby="favorite-apply-description"
        className="safe-area-bottom max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="favorite-apply-title" className="text-xl font-semibold text-slate-950 dark:text-white">Ajouter « {favorite.favoriteMeal.name} »</h2>
            <p id="favorite-apply-description" className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Choisis la journée et le repas de destination.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="-mr-2 -mt-2 shrink-0 px-2" aria-label="Fermer" disabled={busy} onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        {errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Ajout impossible" role="alert">{errorMessage}</InlineNotice>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="favorite-apply-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Date</label>
            <input id="favorite-apply-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClassName} mt-2`} />
          </div>
          <div>
            <label htmlFor="favorite-apply-slot" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Repas</label>
            <select id="favorite-apply-slot" value={slot} onChange={(event) => setSlot(event.target.value as MealSlot)} className={`${inputClassName} mt-2`}>
              {Object.entries(mealSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950/70 dark:text-slate-300">
          {favorite.favoriteMeal.items.length} élément{favorite.favoriteMeal.items.length > 1 ? 's' : ''} · {Math.round(favorite.totals.caloriesKcal)} kcal
        </div>

        <Button className="mt-5 w-full" disabled={busy || !date} onClick={() => void onApply(date, slot)}>
          <CalendarPlus aria-hidden="true" className="size-4" />
          {busy ? 'Ajout en cours…' : 'Ajouter au journal'}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
