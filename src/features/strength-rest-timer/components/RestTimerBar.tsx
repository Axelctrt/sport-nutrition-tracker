import { BellRing, Minus, Pause, Play, Plus, Square } from 'lucide-react';
import type { RestTimerState } from '@/domain/strength/restTimer';
import { formatRestTimer } from '@/domain/strength/restTimer';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';

interface RestTimerBarProps {
  state: Exclude<RestTimerState, { status: 'idle' }>;
  remainingSeconds: number;
  announcement: string;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (seconds: number) => void;
  onStop: () => void;
}

const statusLabels = {
  running: 'Repos en cours',
  paused: 'Repos en pause',
  expired: 'Repos terminé',
} as const;

export function RestTimerBar({
  state,
  remainingSeconds,
  announcement,
  onPause,
  onResume,
  onAdjust,
  onStop,
}: RestTimerBarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-x-3 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl rounded-2xl border p-3 shadow-xl backdrop-blur',
        'lg:static lg:mt-5 lg:max-w-none lg:shadow-sm',
        state.status === 'expired'
          ? 'border-emerald-300 bg-emerald-50/95 dark:border-emerald-900 dark:bg-emerald-950/95'
          : 'border-brand-200 bg-white/95 dark:border-brand-900 dark:bg-slate-950/95',
      )}
      role="region"
      aria-label="Minuteur de repos"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
          <BellRing aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {statusLabels[state.status]}
          </p>
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
            {state.exerciseName}
          </p>
        </div>
        <p
          className="shrink-0 text-3xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-white"
          role="timer"
          aria-label={`${statusLabels[state.status]} : ${formatRestTimer(remainingSeconds)}`}
        >
          {formatRestTimer(remainingSeconds)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {state.status === 'running' ? (
          <Button size="sm" variant="secondary" className="min-w-0 px-2" onClick={onPause}>
            <Pause aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Pause</span>
          </Button>
        ) : state.status === 'paused' ? (
          <Button size="sm" variant="secondary" className="min-w-0 px-2" onClick={onResume}>
            <Play aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Reprendre</span>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="min-w-0 px-2" aria-label="Relancer 15 secondes" onClick={() => onAdjust(15)}>
            <Play aria-hidden="true" className="size-4" />
            <span className="sr-only">Relancer 15 secondes</span>
          </Button>
        )}
        <Button size="sm" variant="secondary" className="min-w-0 px-2" aria-label="Retirer 15 secondes" onClick={() => onAdjust(-15)} disabled={remainingSeconds === 0}>
          <Minus aria-hidden="true" className="size-4" />15
        </Button>
        <Button size="sm" variant="secondary" className="min-w-0 px-2" aria-label="Ajouter 15 secondes" onClick={() => onAdjust(15)}>
          <Plus aria-hidden="true" className="size-4" />15
        </Button>
        <Button size="sm" variant="secondary" className="min-w-0 px-2" aria-label="Ajouter 30 secondes" onClick={() => onAdjust(30)}>
          <Plus aria-hidden="true" className="size-4" />30
        </Button>
        <Button size="sm" variant="dangerGhost" className="min-w-0 px-2" onClick={onStop}>
          <Square aria-hidden="true" className="size-4" />
          <span className="sr-only">Arrêter le minuteur</span>
        </Button>
      </div>
      <p className="sr-only" aria-live="assertive">{announcement}</p>
    </aside>
  );
}
