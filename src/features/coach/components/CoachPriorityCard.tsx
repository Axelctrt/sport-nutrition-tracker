import { AlertCircle, Compass } from 'lucide-react';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import { Card } from '@/shared/ui/Card';

export function CoachPriorityCard({ snapshot }: { snapshot: CoachHubSnapshot }) {
  return (
    <Card padding="md" aria-labelledby="coach-hub-priority-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
          <Compass aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
            Priorité Coach
          </p>
          <h2 id="coach-hub-priority-title" className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
            {snapshot.priority?.label ?? 'Priorité indisponible'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
            {snapshot.priority?.explanation
              ?? 'Les données disponibles ne permettent pas encore d’expliquer une priorité.'}
          </p>
          {snapshot.monitoredPoints.length > 0 ? (
            <div className="mt-3">
              <p className="text-sm font-bold text-[var(--sp-text-primary)]">Points surveillés</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--sp-text-secondary)]">
                {snapshot.monitoredPoints.map((point) => <li key={point}>• {point}</li>)}
              </ul>
            </div>
          ) : null}
          {snapshot.priority?.blockingFactors.length ? (
            <div className="mt-3 rounded-xl bg-[var(--sp-surface-muted)] p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--sp-text-primary)]">
                <AlertCircle aria-hidden="true" className="size-4" />
                Points bloquants
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--sp-text-secondary)]">
                {snapshot.priority.blockingFactors.map((factor) => <li key={factor}>• {factor}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
