import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { WeightEntry } from '@/domain/models/weight';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate } from '@/shared/utils/dates';

interface WeightHistoryEntryCardProps {
  entry: WeightEntry;
  previousWeightKg: number | undefined;
  selected?: boolean;
  highlighted?: boolean;
  deleting?: boolean;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}

function formatDelta(current: number, previous: number | undefined): string | undefined {
  if (previous === undefined) return undefined;
  const delta = current - previous;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
}

export function WeightHistoryEntryCard({
  entry,
  previousWeightKg,
  selected = false,
  highlighted = false,
  deleting = false,
  onEdit,
  onDelete,
}: WeightHistoryEntryCardProps) {
  const delta = formatDelta(entry.weightKg, previousWeightKg);
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <Card
      id={`weight-entry-${entry.id}`}
      className={cn(
        'relative scroll-mt-28 p-4 transition-colors motion-reduce:transition-none',
        actionsOpen && 'z-30',
        selected && 'border-blue-300 dark:border-blue-800',
        highlighted && 'bg-blue-50/80 dark:bg-blue-950/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
          onClick={() => onEdit(entry)}
        >
          <span className="block text-sm font-semibold capitalize text-slate-950 dark:text-white">
            {formatLocalDate(entry.date, 'EEEE d MMMM yyyy')}
          </span>
          <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
              {entry.weightKg.toLocaleString('fr-FR')} kg
            </span>
            {delta ? (
              <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                {delta} depuis la précédente
              </span>
            ) : null}
          </span>
        </button>

        <details
          className="relative shrink-0"
          onToggle={(event) => setActionsOpen(event.currentTarget.open)}
        >
          <summary
            role="button"
            aria-label={`Actions pour la pesée du ${formatLocalDate(entry.date)}`}
            className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <Button
              className="w-full justify-start"
              size="sm"
              variant="ghost"
              disabled={deleting}
              onClick={(event) => {
                setActionsOpen(false);
                event.currentTarget.closest('details')?.removeAttribute('open');
                onEdit(entry);
              }}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Modifier
            </Button>
            <Button
              className="w-full justify-start"
              size="sm"
              variant="dangerGhost"
              disabled={deleting}
              onClick={(event) => {
                setActionsOpen(false);
                event.currentTarget.closest('details')?.removeAttribute('open');
                onDelete(entry);
              }}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </div>
        </details>
      </div>

      {entry.note ? (
        <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
            Note de pesée
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
            {entry.note}
          </p>
        </details>
      ) : null}
    </Card>
  );
}
